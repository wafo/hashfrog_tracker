import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import worker from "./index.js";

const SETTINGS_STRING = "BSAWDNCAX2TB2XCHGABSL62ANAEACAAAJAAAG";
const DECODED = { world_count: 1, bridge: "medallions", starting_songs: [] };

// An in-memory stand-in for the Workers Cache API.
const memoryCache = () => {
  const entries = new Map();
  return {
    entries,
    match: async key => entries.get(new Request(key).url)?.clone(),
    put: async (key, response) => {
      entries.set(new Request(key).url, response.clone());
    },
  };
};

// A stand-in for the generator that records every call and answers with `reply`.
const fakeGenerator = (reply = () => Response.json(DECODED)) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push(new URL(url));
    return reply(url, init);
  };
  return { calls, fetchImpl };
};

// A fake rate-limiting binding that allows `allowed` calls, then refuses.
const fakeLimiter = (allowed = Infinity) => {
  const keys = [];
  return {
    keys,
    limit: async ({ key }) => {
      keys.push(key);
      return { success: keys.length <= allowed };
    },
  };
};

const settingsRequest = (params = {}, init = {}) => {
  const query = new URLSearchParams({ version: "9.1.0", settingsString: SETTINGS_STRING, ...params });
  return new Request(`https://hashfrog-tracker.com/api/settings/string?${query}`, {
    headers: { "CF-Connecting-IP": "203.0.113.7" },
    ...init,
  });
};

let generator;
let cache;
let env;
let pending;
let ctx;
let logs;
const originalLog = console.log;

const call = async request => {
  const response = await worker.fetch(request, env, ctx);
  await Promise.all(pending);
  return response;
};

beforeEach(() => {
  generator = fakeGenerator();
  globalThis.fetch = generator.fetchImpl;
  cache = memoryCache();
  globalThis.caches = { default: cache };
  env = { SETTINGS_RATE_LIMITER: fakeLimiter() };
  pending = [];
  ctx = { waitUntil: promise => pending.push(promise) };
  logs = [];
  console.log = line => logs.push(JSON.parse(line));
});

afterEach(() => {
  delete globalThis.caches;
  console.log = originalLog;
});

describe("GET /api/settings/string", () => {
  it("decodes a settings string through the generator on a cache miss", async () => {
    const response = await call(settingsRequest());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Cache"), "MISS");
    assert.deepEqual(await response.json(), { settings: DECODED });

    assert.equal(generator.calls.length, 1);
    const [upstream] = generator.calls;
    assert.equal(upstream.origin + upstream.pathname, "https://ootrandomizer.com/settings/get");
    assert.equal(upstream.searchParams.get("version"), "9.1.0");
    assert.equal(upstream.searchParams.get("settingsString"), SETTINGS_STRING);
  });

  it("serves a repeat request from the cache without asking the generator again", async () => {
    await call(settingsRequest());
    const response = await call(settingsRequest());

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Cache"), "HIT");
    assert.deepEqual(await response.json(), { settings: DECODED });
    assert.equal(generator.calls.length, 1);
  });

  it("keeps each deployment's cache entries apart", async () => {
    await call(settingsRequest());
    env.CACHE_NAMESPACE = "staging-v1";

    const response = await call(settingsRequest());

    assert.equal(response.headers.get("X-Cache"), "MISS");
    assert.equal(generator.calls.length, 2);
  });

  it("caches each generator version separately", async () => {
    await call(settingsRequest({ version: "9.1.0" }));
    const response = await call(settingsRequest({ version: "8.3.0" }));

    assert.equal(response.headers.get("X-Cache"), "MISS");
    assert.equal(generator.calls.length, 2);
  });

  describe("rejects malformed requests without asking the generator", () => {
    const cases = [
      ["a missing settings string", { settingsString: "" }],
      ["a lowercase settings string", { settingsString: SETTINGS_STRING.toLowerCase() }],
      ["a settings string with symbols", { settingsString: "BSAW-DNCA" }],
      ["an overlong settings string", { settingsString: "A".repeat(1025) }],
      ["a missing version", { version: "" }],
      ["an unknown dev branch", { version: "devNobody_9.1.0" }],
      ["a version that is not a version", { version: "latest" }],
      ["a fork reference", { version: "OoTRandomizer/Dev" }],
    ];

    for (const [name, params] of cases) {
      it(`rejects ${name}`, async () => {
        const response = await call(settingsRequest(params));

        assert.equal(response.status, 400);
        assert.equal((await response.json()).error, "invalid_request");
        assert.equal(generator.calls.length, 0);
      });
    }
  });

  describe("accepts every kind of generator version", () => {
    const versions = ["9.1.0", "8.3.0", "dev_9.1.28", "devrreal_9.0.2-17", "devFenhl_9.1.10-6", "devR_8.2.10", "dev_"];

    for (const version of versions) {
      it(`accepts ${version}`, async () => {
        const response = await call(settingsRequest({ version }));

        assert.equal(response.status, 200);
        assert.equal(generator.calls[0].searchParams.get("version"), version);
      });
    }
  });

  it("trims surrounding whitespace before decoding", async () => {
    const response = await call(settingsRequest({ version: " 9.1.0 ", settingsString: ` ${SETTINGS_STRING}\n` }));

    assert.equal(response.status, 200);
    assert.equal(generator.calls[0].searchParams.get("version"), "9.1.0");
    assert.equal(generator.calls[0].searchParams.get("settingsString"), SETTINGS_STRING);
  });

  describe("when the generator fails", () => {
    const TRACEBACK = 'Traceback (most recent call last):\n  File "/var/source/OoTRandomizer.py", line 64';

    const failWith = reply => {
      generator = fakeGenerator(reply);
      globalThis.fetch = generator.fetchImpl;
    };

    it("reports a rejected settings string as such, without the generator's traceback", async () => {
      failWith(() => new Response(TRACEBACK, { status: 400 }));

      const response = await call(settingsRequest());
      const text = await response.text();

      assert.equal(response.status, 400);
      assert.equal(JSON.parse(text).error, "invalid_settings_string");
      assert.match(JSON.parse(text).message, /generator version/);
      assert.doesNotMatch(text, /Traceback|OoTRandomizer\.py/);
    });

    it("reports a generator outage as an upstream error", async () => {
      failWith(() => new Response(TRACEBACK, { status: 500 }));

      const response = await call(settingsRequest());
      const text = await response.text();

      assert.equal(response.status, 502);
      assert.equal(JSON.parse(text).error, "upstream_error");
      assert.doesNotMatch(text, /Traceback/);
    });

    it("reports an unreadable generator answer as an upstream error", async () => {
      failWith(() => new Response("<html>maintenance</html>", { status: 200 }));

      const response = await call(settingsRequest());

      assert.equal(response.status, 502);
      assert.equal((await response.json()).error, "upstream_error");
    });

    it("reports an unreachable generator as an upstream error", async () => {
      failWith(() => {
        throw new TypeError("fetch failed");
      });

      const response = await call(settingsRequest());

      assert.equal(response.status, 502);
      assert.equal((await response.json()).error, "upstream_error");
    });

    it("gives up on a generator that does not answer in time", async () => {
      env.UPSTREAM_TIMEOUT_MS = "20";
      failWith(
        (_url, { signal }) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(signal.reason));
          }),
      );

      const response = await call(settingsRequest());

      assert.equal(response.status, 504);
      assert.equal((await response.json()).error, "upstream_timeout");
    });

    it("does not cache a failure", async () => {
      failWith(() => new Response(TRACEBACK, { status: 500 }));
      await call(settingsRequest());

      failWith(() => Response.json(DECODED));
      const response = await call(settingsRequest());

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("X-Cache"), "MISS");
      assert.equal(cache.entries.size, 1);
    });
  });

  describe("rate limiting", () => {
    it("refuses a cache miss once the client's limit is spent, without asking the generator", async () => {
      env.SETTINGS_RATE_LIMITER = fakeLimiter(0);

      const response = await call(settingsRequest());

      assert.equal(response.status, 429);
      assert.equal((await response.json()).error, "rate_limited");
      assert.equal(generator.calls.length, 0);
    });

    it("limits each client by its IP address", async () => {
      await call(settingsRequest());

      assert.deepEqual(env.SETTINGS_RATE_LIMITER.keys, ["203.0.113.7"]);
    });

    it("keeps serving cache hits to a client whose limit is spent", async () => {
      await call(settingsRequest());
      env.SETTINGS_RATE_LIMITER = fakeLimiter(0);

      const response = await call(settingsRequest());

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("X-Cache"), "HIT");
    });
  });
});

describe("routing", () => {
  it("hands anything outside /api to the static assets", async () => {
    const seen = [];
    env.ASSETS = {
      fetch: async request => {
        seen.push(new URL(request.url).pathname);
        return new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } });
      },
    };

    const response = await call(new Request("https://hashfrog-tracker.com/tracker"));

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "<!doctype html>");
    assert.deepEqual(seen, ["/tracker"]);
    assert.equal(generator.calls.length, 0);
  });

  it("answers an unknown /api path with a JSON 404", async () => {
    const response = await call(new Request("https://hashfrog-tracker.com/api/nope"));

    assert.equal(response.status, 404);
    assert.equal((await response.json()).error, "not_found");
  });

  it("answers other methods on the settings endpoint with a 405", async () => {
    const response = await call(settingsRequest({}, { method: "POST" }));

    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "GET");
    assert.equal((await response.json()).error, "method_not_allowed");
    assert.equal(generator.calls.length, 0);
  });
});

describe("logging", () => {
  it("logs a cache miss with its status and the generator version, but not the full settings string", async () => {
    await call(settingsRequest());

    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, "cache_miss");
    assert.equal(logs[0].status, 200);
    assert.equal(logs[0].version, "9.1.0");
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(SETTINGS_STRING));
  });

  it("logs a failed cache miss once, with its status and the generator's own explanation", async () => {
    globalThis.fetch = fakeGenerator(() => new Response("Traceback: bad string", { status: 400 })).fetchImpl;

    await call(settingsRequest());

    assert.equal(logs.length, 1);
    assert.equal(logs[0].event, "cache_miss");
    assert.equal(logs[0].status, 400);
    assert.equal(logs[0].error, "invalid_settings_string");
    assert.equal(logs[0].upstreamStatus, 400);
    assert.match(logs[0].detail, /Traceback/);
    assert.doesNotMatch(JSON.stringify(logs), new RegExp(SETTINGS_STRING));
  });

  it("logs nothing for a cache hit", async () => {
    await call(settingsRequest());
    logs.length = 0;

    await call(settingsRequest());

    assert.deepEqual(logs, []);
  });
});
