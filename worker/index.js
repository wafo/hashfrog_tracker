import { DEV_FORK_BRANCHES } from "../src/versions/dev-branches.js";

const GENERATOR_URL = "https://ootrandomizer.com/settings/get";

// Bump the namespace to throw away every cached decode at once (see ADR 0001).
const CACHE_NAMESPACE = "v1";
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

// Shorter than the client's own 10-second limit, so the client sees our timeout rather than its generic one.
const DEFAULT_UPSTREAM_TIMEOUT_MS = 8000;

const SETTINGS_STRING = /^[A-Z0-9]{1,1024}$/;

// A release ("9.1.0"), or a known dev branch prefix with the build it reports, if any ("dev_9.1.28", "devrreal_9.0.2-17").
const escapeRegExp = text => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const DEV_PREFIXES = Object.keys(DEV_FORK_BRANCHES).map(escapeRegExp).join("|");
const BUILD_PATTERN = String.raw`\d+(?:\.\d+)*(?:-[A-Za-z0-9.]+)?`;
const GENERATOR_VERSION = new RegExp(`^(?:${BUILD_PATTERN}|(?:${DEV_PREFIXES})(?:${BUILD_PATTERN})?)$`);

/**
 * Builds a JSON error response.
 * @param {number} status - The HTTP status.
 * @param {string} error - A stable, machine-readable error code.
 * @param {string} message - A human-readable explanation.
 * @returns {Response} The response.
 */
const errorResponse = (status, error, message) =>
  Response.json({ error, message }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Builds the cache key for a decode. The Cache API keys on URLs, so the key is a synthetic one.
 * @param {string} version - The generator version.
 * @param {string} settingsString - The settings string.
 * @returns {string} The cache key URL.
 */
const cacheKey = (version, settingsString) =>
  `https://settings-cache.hashfrog.internal/${CACHE_NAMESPACE}?` + new URLSearchParams({ version, settingsString });

/**
 * Builds the response the client sees for a set of decoded settings.
 * @param {object} settings - The decoded settings.
 * @param {"HIT"|"MISS"} cacheStatus - Whether the decode came from the cache.
 * @returns {Response} The response.
 */
const settingsResponse = (settings, cacheStatus) =>
  Response.json({ settings }, { headers: { "X-Cache": cacheStatus, "Cache-Control": "no-store" } });

/**
 * Reads the generator timeout, which tests shorten through the environment.
 * @param {object} env - The Worker bindings.
 * @returns {number} The timeout in milliseconds.
 */
const upstreamTimeout = env => Number(env?.UPSTREAM_TIMEOUT_MS) || DEFAULT_UPSTREAM_TIMEOUT_MS;

/**
 * Identifies a settings string in logs without writing it out in full.
 * @param {string} settingsString - The settings string.
 * @returns {Promise<string>} A short prefix and a hash of the settings string.
 */
const fingerprint = async settingsString => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(settingsString));
  const hash = [...new Uint8Array(digest)]
    .slice(0, 6)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
  return `${settingsString.slice(0, 8)}…#${hash}`;
};

/**
 * Writes a structured log line for Workers Logs.
 * @param {string} event - What happened.
 * @param {object} fields - Details of the event.
 */
const log = (event, fields) => {
  console.log(JSON.stringify({ event, ...fields }));
};

/**
 * Reads the tail of a failed generator response, where a Python traceback names the actual error.
 * @param {Response} response - The generator's response.
 * @returns {Promise<string>} Up to the last 500 characters of the body.
 */
const failureDetail = async response => (await response.text().catch(() => "")).slice(-500);

/**
 * Asks the generator to decode a settings string, and logs the outcome as one cache-miss line.
 * Failures become error responses that never carry the generator's own text; that text goes to the log instead.
 * @param {string} version - The generator version.
 * @param {string} settingsString - The settings string.
 * @param {number} timeoutMs - How long to wait for the generator.
 * @returns {Promise<{settings: object}|{error: Response}>} The decoded settings, or the error response to send.
 */
const askGenerator = async (version, settingsString, timeoutMs) => {
  const upstream = new URL(GENERATOR_URL);
  upstream.searchParams.set("version", version);
  upstream.searchParams.set("settingsString", settingsString);

  const logMiss = async fields =>
    log("cache_miss", { version, settingsString: await fingerprint(settingsString), ...fields });
  const fail = async (status, error, message, detail) => {
    await logMiss({ status, error, ...detail });
    return { error: errorResponse(status, error, message) };
  };
  const timedOut = () => fail(504, "upstream_timeout", "The generator did not respond in time.", { timeoutMs });
  const unreadable = cause => fail(502, "upstream_error", "The generator returned an unreadable answer.", { cause });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response;
    try {
      response = await fetch(upstream, { signal: controller.signal });
    } catch (err) {
      if (controller.signal.aborted) {
        return timedOut();
      }
      return fail(502, "upstream_error", "Could not reach the generator.", { cause: String(err) });
    }

    if (response.status >= 400 && response.status < 500) {
      return fail(
        400,
        "invalid_settings_string",
        "The generator could not decode this settings string for this generator version.",
        { upstreamStatus: response.status, detail: await failureDetail(response) },
      );
    }
    if (!response.ok) {
      return fail(502, "upstream_error", "The generator is having trouble.", {
        upstreamStatus: response.status,
        detail: await failureDetail(response),
      });
    }

    let settings;
    try {
      settings = await response.json();
    } catch (err) {
      return controller.signal.aborted ? timedOut() : unreadable(String(err));
    }
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return unreadable("not an object");
    }

    await logMiss({ status: 200 });
    return { settings };
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Checks the client's rate limit. Only cache misses spend it, since only they reach the generator.
 * @param {Request} request - The incoming request.
 * @param {object} env - The Worker bindings.
 * @returns {Promise<boolean>} Whether the client may ask the generator.
 */
const withinRateLimit = async (request, env) => {
  if (!env?.SETTINGS_RATE_LIMITER) {
    return true;
  }
  const key = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const { success } = await env.SETTINGS_RATE_LIMITER.limit({ key });
  return success;
};

/**
 * Decodes a settings string, from the cache when possible, otherwise through the generator.
 * @param {Request} request - The incoming request.
 * @param {object} env - The Worker bindings.
 * @param {{waitUntil: (promise: Promise<unknown>) => void}} ctx - The Worker execution context.
 * @returns {Promise<Response>} The decoded settings.
 */
const decodeSettings = async (request, env, ctx) => {
  const url = new URL(request.url);
  const version = (url.searchParams.get("version") ?? "").trim();
  const settingsString = (url.searchParams.get("settingsString") ?? "").trim();
  if (!GENERATOR_VERSION.test(version) || !SETTINGS_STRING.test(settingsString)) {
    return errorResponse(400, "invalid_request", "Expected a generator version and an uppercase settings string.");
  }
  const key = cacheKey(version, settingsString);

  const cached = await caches.default.match(key);
  if (cached) {
    return settingsResponse(await cached.json(), "HIT");
  }

  if (!(await withinRateLimit(request, env))) {
    return errorResponse(429, "rate_limited", "Too many new settings strings at once. Wait a moment and try again.");
  }

  const outcome = await askGenerator(version, settingsString, upstreamTimeout(env));
  if (outcome.error) {
    return outcome.error;
  }
  const { settings } = outcome;

  const entry = Response.json(settings, { headers: { "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}` } });
  ctx.waitUntil(caches.default.put(key, entry));

  return settingsResponse(settings, "MISS");
};

export default {
  /**
   * Worker entry point.
   * @param {Request} request - The incoming request.
   * @param {object} env - The Worker bindings.
   * @param {{waitUntil: (promise: Promise<unknown>) => void}} ctx - The Worker execution context.
   * @returns {Promise<Response>} The response.
   */
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/settings/string") {
      if (request.method !== "GET") {
        const response = errorResponse(405, "method_not_allowed", "Use GET.");
        response.headers.set("Allow", "GET");
        return response;
      }
      return decodeSettings(request, env, ctx);
    }

    if (pathname === "/api" || pathname.startsWith("/api/")) {
      return errorResponse(404, "not_found", "No such API endpoint.");
    }

    return env.ASSETS.fetch(request);
  },
};
