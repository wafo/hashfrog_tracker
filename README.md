# HashFrog Tracker

This is a tracker for the [Ocarina of Time Randomizer](https://ootrandomizer.com/). It's available at [https://hashfrog-tracker.com](https://hashfrog-tracker.com).

## About
The motivation behind this project is to have a simple customizable tracker that will help keep track of all the checks in the game.

## Local development

The app is a Create React App frontend served by a Cloudflare Worker. The Worker also
answers `/api/settings/string`, which decodes settings strings through ootrandomizer.com
(see `docs/adr/0001-settings-decoding-via-worker-proxy.md`).

- `npm run dev` Starts the dev server on http://localhost:3000 and the Worker on port 8787.
  The dev server proxies `/api` requests to the Worker, so check tracking works locally
  with no extra configuration.
- `npm run preview` Builds the app and serves it through the Worker on http://localhost:8787,
  the same way production does.
- `npm start` Starts only the dev server. Check tracking needs the Worker, so prefer `npm run dev`.

## Build and test

- `npm test` Launches the frontend test runner in the interactive watch mode.
- `npm run test:worker` Runs the Worker tests.
- `npm run lint` Lints the frontend and the Worker.
- `npm run build` Builds the app for production to the `build` folder.

## Deployment

Production deployments use Cloudflare Workers static assets. Cloudflare Workers
Builds runs on pushes to `master` and deploys the static `build` directory.

The Worker is configured in `wrangler.jsonc`. Requests to `/api/*` run the Worker
script in `worker/`; everything else is served from the static assets, and the SPA
fallback returns `index.html` for client-side routes such as `/tracker` and `/editor`.

Configure the Cloudflare Workers Build with:

- Production branch: `master`
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

The Worker name in `wrangler.jsonc` must match the Worker created in Cloudflare.

### Staging

Staging is a separate Worker, `hashfrog-tracker-staging`, served at
[https://staging.hashfrog-tracker.com](https://staging.hashfrog-tracker.com). Use it to
test a branch on real Cloudflare infrastructure (including the settings cache) before it
reaches production. Deploys are manual; whatever you deploy replaces what is there.

1. Check out the branch you want to test.
2. Run `npx wrangler login` once, with an account that has access to the project's
   Cloudflare account (ask the maintainer to invite you under Manage Account → Members
   with a Workers role).
3. Run `npm run deploy:staging`. It builds the app and deploys it to staging.
4. Mention in the pull request that staging runs your branch.

Follow staging's logs with `npx wrangler tail --env staging`. Staging keeps its own
settings cache and rate limit, so testing there never affects production.

