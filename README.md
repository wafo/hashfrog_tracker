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
