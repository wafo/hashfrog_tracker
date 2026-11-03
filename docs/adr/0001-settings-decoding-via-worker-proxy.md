# Settings decoding goes through our Worker, cached per data center

Check tracking needs the decoded settings for a settings string, and only the generator (ootrandomizer.com) can decode one. The generator sends no CORS headers and spawns a process per decode (~0.7s), so we proxy the call through the same Cloudflare Worker that serves the SPA, at `/api/settings/string`, and cache successful decodes in the Cloudflare cache for a week. This replaces the old Koa + Redis backend at `api.hashfrog-tracker.com`, which did the same job on a server we had to run.

The cache is a cache, not an archive: entries may expire, and once the generator stops supporting a generator version, its settings strings stop decoding for us too.

## Considered Options

- **Call the generator from the browser**: impossible, no CORS headers.
- **Proxy without a cache**: every tracker load costs the generator a process, and racers starting the same race all decode the same string at once.
- **Workers KV**: a global cache, but the free tier's 1k writes/day and the extra moving part buy little, since racers in one region share a data center.
- **Keep decoded settings permanently**: would keep retired generator versions working, but turns a cache into data we own and must maintain.
