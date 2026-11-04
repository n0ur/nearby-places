# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A collaborative map app for finding a central meeting place between multiple people in the same room/session. Backend is Fastify (Node.js, ESM), frontend is vanilla JS using the Google Maps JavaScript API. State is entirely in-memory (no database) — rooms, locations, and search results are lost on server restart or when all users disconnect.

See `README.md` for usage/setup and `DESIGN.md` for the full architecture rationale (why SSE over WebSockets, why in-memory storage, how the center point is calculated, connection lifecycle, etc.) — read `DESIGN.md` before making architectural changes.

## Commands

```bash
node --env-file .env src/index.js   # run the server (requires .env, see env.template)
npm test                             # run all tests (node --test)
node --test test/services/gmaps.test.js   # run a single test file
npm run lint                         # eslint src/ test/ static/
npm run lint:fix
npm run format                       # prettier --write
```

There is no build step; `dist/` and `static/assets/` are served directly. Node >= 24.1 is required (uses `node --test`, native `--env-file`).

Husky's pre-commit hook runs `lint-staged` (eslint + prettier on staged files) then the full test suite — expect commits to be blocked if either fails. GitHub Actions runs lint and tests on every pull request to `main` (`pr.yml`). On merge to `main`, it builds the Docker image and pushes it to GHCR (`main.yml`).

## Architecture

### Request flow

Everything is scoped to a **room**. `roomDatastore` (`src/models/roomDatastore.js`) is a singleton in-memory `Map<roomId, Room>`. A `Room` (`src/models/room.js`) owns:

- `users`: `Map<userId, Location[]>` — all locations for all users in that room
- a `NotificationService` instance — SSE listener registry + broadcast
- a `SearchService` instance — dedupes/batches/cancels nearby-search requests

Joining `/room/:id` creates the room if it doesn't exist and sets a signed `userId` cookie. All subsequent writes (`POST /room/:id/location`, `POST /room/:id/current_position`, `DELETE /room/:id/location/:locId`, `GET /room/:id/places`) are validated via `src/routes/hooks.js`: the signed cookie is checked (`validateSession`) and the user must already be a member of the room (`validateUserInRoom`) — this is the entire auth model, there is no login.

### Real-time updates (SSE)

`GET /room/:id/events` is a long-lived SSE connection (`@fastify/sse`) registered as a listener on the room's `NotificationService`. Any mutation on a `Room` (create/delete location, search results) calls `notificationService.notify(event, data, ...)`, which fans the event out to every connected listener in that room. The client (`static/assets/app.js`) reconnects up to 5 times on failure before giving up and asking the user to refresh.

When an SSE connection closes, the user isn't removed immediately — `cleanupQueue.enqueue(room, userId)` (`src/cleanupQueue.js`) schedules `room.leaveRoom()` / `deregisterUser()` after `CLEANUP_DELAY_MS` (30s, see `src/constants.js`), so a page refresh or brief network blip doesn't wipe the user's locations. Reconnecting within that window dequeues the pending cleanup.

### Search

`SearchService` (`src/services/searchService.js`) enforces "one in-flight search per room": it hashes the constructed search params, returns the in-flight promise if an identical search is already running, and aborts any other in-flight search for that room before starting a new one. It's constructed per-room with injected `constructParamsFn`/`searchFn` (currently `constructLegacySearchParams`/`placesNearby` from `src/services/gmaps.js`), which is also what makes it unit-testable without hitting Google's API.

### Geometry

`geometryService` (`src/services/geometry.js`, uses `@turf/turf`) computes the search circle from all locations in a room: single location → itself; two → midpoint; three+ → centroid of a concave hull polygon. This recalculates on every location add/delete and is pushed to clients via `location_created`/`location_deleted`/`user_joined`/`user_left` SSE events.

### Google Maps integration

`src/services/gmaps.js` wraps `@googlemaps/google-maps-services-js` (legacy Places API, currently used) and `@googlemaps/places` (new Places API client, present but only `searchNearby` uses it — not yet wired into the main flow, see README's "Future Improvements"). Two separate API keys are used: `GOOGLE_MAPS_API_KEY` for the frontend (injected into `room.html` at request time) and `GOOGLE_MAPS_BACKEND_API_KEY` for server-side geocoding/places calls.

### Errors

All custom errors extend `AppError` (`src/models/errors.js`) and carry a `statusCode`. A single Fastify `setErrorHandler` in `src/app.js` serializes any thrown error to `{ error, message, statusCode }`.

### Frontend

`static/assets/app.js` is a single vanilla-JS file (no framework/bundler) driving the Google Map, markers, and the two-tab sidebar (locations / places search). It talks to the backend via the REST endpoints above plus the SSE stream for live updates from other users in the room.

## New features

For any new feature, work in two steps before writing code:

1. `/agent-skills:spec` — interview-driven spec, saved as
   `features/<feature-name>/spec.md`.
2. `/agent-skills:plan` — reads that spec, produces a dependency graph and
   vertically-sliced task breakdown, saved as
   `features/<feature-name>/plan.md` and `features/<feature-name>/todo.md`.

Keep each feature's spec, plan, and task list together under
`features/<feature-name>/` rather than a shared top-level directory — see
`features/CLAUDE.md` for the convention. Don't overwrite an existing
`plan.md`/`todo.md` with unchecked tasks; ask first.

Before committing work for a task, re-read that task's `todo.md`/`plan.md`
entry, verify it against actual state (don't assume), and update its
checkbox in the same commit — not as a separate follow-up commit after
the fact.

## Git workflow

See `CONTRIBUTING.md` for branch naming, commit message format, and the
PR/merge process. Never push directly to `main` — all changes land through
a pull request, squash-merged after CI passes.
