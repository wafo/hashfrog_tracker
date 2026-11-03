import { fetchDecodedSettings } from "./useLogicInitialization";

const SETTINGS_STRING = "BSAWDNCAX2TB2XCHGABSL62ANAEACAAAJAAAG";
const DECODED = { world_count: 1, bridge: "medallions", starting_songs: [] };
const CHECK_STRING_HINT = /Check the settings string and generator version/;

const respondWith = response => {
  global.fetch = jest.fn(async () => response);
};

const decode = () => fetchDecodedSettings("9.1.0", SETTINGS_STRING, new AbortController().signal);

afterEach(() => {
  delete global.fetch;
});

describe("fetchDecodedSettings", () => {
  it("asks the tracker's own settings endpoint for the generator version and settings string", async () => {
    respondWith(new Response(JSON.stringify({ settings: DECODED }), { status: 200 }));

    await expect(decode()).resolves.toEqual(DECODED);

    const [url] = global.fetch.mock.calls[0];
    const requested = new URL(url, "https://hashfrog-tracker.com");
    expect(url.startsWith("/api/settings/string?")).toBe(true);
    expect(requested.searchParams.get("version")).toBe("9.1.0");
    expect(requested.searchParams.get("settingsString")).toBe(SETTINGS_STRING);
  });

  it("blames the settings string when the generator rejects it", async () => {
    respondWith(new Response(JSON.stringify({ error: "invalid_settings_string" }), { status: 400 }));

    const error = await decode().catch(err => err);
    expect(error.message).toMatch(/settings string for this generator version/);
    expect(error.message).toMatch(CHECK_STRING_HINT);
  });

  it("asks the player to wait when they hit the rate limit", async () => {
    respondWith(new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 }));

    const error = await decode().catch(err => err);
    expect(error.message).toMatch(/wait/i);
    expect(error.message).not.toMatch(CHECK_STRING_HINT);
  });

  it("blames the generator, not the settings string, when the generator is down", async () => {
    respondWith(new Response(JSON.stringify({ error: "upstream_error" }), { status: 502 }));

    const error = await decode().catch(err => err);
    expect(error.message).toMatch(/generator is having trouble/);
    expect(error.message).not.toMatch(CHECK_STRING_HINT);
  });

  it("reports a timeout when the generator does not answer in time", async () => {
    respondWith(new Response(JSON.stringify({ error: "upstream_timeout" }), { status: 504 }));

    const error = await decode().catch(err => err);
    expect(error.message).toMatch(/generator did not respond in time/);
    expect(error.message).not.toMatch(CHECK_STRING_HINT);
  });

  it("reports an unreachable service", async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError("Failed to fetch");
    });

    await expect(decode()).rejects.toThrow(/Could not reach the settings service/);
  });

  it("reports an unreadable response", async () => {
    respondWith(new Response("<!doctype html>", { status: 200 }));

    await expect(decode()).rejects.toThrow(/unreadable response/);
  });

  it("rejects a response that does not hold settings", async () => {
    respondWith(new Response(JSON.stringify({ settings: ["not", "settings"] }), { status: 200 }));

    await expect(decode()).rejects.toThrow(/unexpected response/);
  });
});
