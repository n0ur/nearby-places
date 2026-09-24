# Dockerize whisper.cpp + llama.cpp (project-local) — Plan

## Context

Two inference services back the telegram-bot feature: whisper.cpp (voice
transcription) and llama.cpp (intent extraction, added in
`features/telegram-bot` task 1). Today they run inconsistently:

- **whisper.cpp** already runs in Docker, but via this machine's **NixOS
  system configuration** (`virtualisation.oci-containers.containers`,
  image `ghcr.io/ggml-org/whisper.cpp:main`, host port 8080, model volume
  at `/home/nour/projects/whisper/models`) — entirely outside this repo,
  invisible to anyone who clones it.
- **llama.cpp** runs natively via the `pkgs.llama-cpp` Nix package added to
  `shell.nix`, started manually with an uncommitted `llama-server`
  invocation (verified once in task 1's checkpoint, never persisted).

Neither is reproducible from the repo alone. The goal: make both project
concerns, defined in this repo via `docker-compose.yml`, startable with
one command, independent of this machine's NixOS config. The existing
NixOS-level whisper.cpp container needs to be retired by the user (outside
this repo) once the project-local one is in place, to avoid a port-8080
conflict.

## Approach

Both services already have official multi-arch Docker images from the
same upstream project (`ggml-org`), so no custom Dockerfiles are needed —
mirror the existing NixOS pattern (official image + mounted model volume +
server flags) as a `docker-compose.yml`, sized for CPU-only inference
(confirmed: 8 cores / 15GB RAM available, no GPU requirement per earlier
decision).

|             | Image                               | Host port                                   | Model source                                                                  | Command                                                                                |
| ----------- | ----------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| whisper.cpp | `ghcr.io/ggml-org/whisper.cpp:main` | 8080 (matches current `.env`)               | `data/models/ggml-tiny.en-q8_0.bin` (user-supplied, not fetched by this plan) | `whisper-server --host 0.0.0.0 -m /models/ggml-tiny.en-q8_0.bin -t 4`                  |
| llama.cpp   | `ghcr.io/ggml-org/llama.cpp:server` | 8090 (matches task 1's verified checkpoint) | `data/models/qwen2.5-1.5b-instruct-q4_k_m.gguf` (already present)             | `-m /models/qwen2.5-1.5b-instruct-q4_k_m.gguf --host 0.0.0.0 --port 8090 -c 2048 -t 4` |

`-t 4` on both mirrors the existing NixOS whisper.cpp container's thread
count — half the machine's 8 cores, leaving headroom for the Node app and
both containers running concurrently. `-c 2048` matches task 1's verified
context size (ample for the short few-shot prompt + transcript this
feature sends).

Both `data/models/*` entries are already gitignored (`data/.gitignore`);
mounting `data/models` as the models volume for both containers keeps
model files out of git while making `docker-compose up` fully
reproducible once model files are in place.

## Files

- **`docker-compose.yml`** (repo root) — two services, `whispercpp` and
  `llamacpp`, each: official image, `data/models:/models` volume mount,
  port mapping, command per table above, `restart: unless-stopped`.
- **`data/models/ggml-tiny.en-q8_0.bin`** — user will place this file
  themselves (moving it from their Downloads folder); not fetched as part
  of this plan. Same model the existing NixOS container uses, so
  transcription behavior doesn't change.
- **`README.md`** — add a short "Local inference services" section:
  `docker compose up -d` before `node --env-file .env src/index.js`,
  alongside the existing setup steps.
- **`CLAUDE.md`** — add `docker compose up -d` to the Commands section as
  a prerequisite for running the server locally (whisper.cpp/llama.cpp
  must be up before voice/text bot commands work).
- **No changes to `shell.nix`** — `pkgs.llama-cpp` can stay (useful for
  ad hoc `llama-cli` debugging) or be removed; leaving it is harmless and
  out of scope here since removing it isn't necessary for this task.
- **`.env`**: `WHISPERCPP_API_ENDPOINT` unchanged (already
  `http://127.0.0.1:8080/inference`, still correct once the project-local
  container replaces the NixOS one on the same port). Add
  `LLM_API_ENDPOINT=http://127.0.0.1:8090/v1/chat/completions` (matches
  what was actually verified working in telegram-bot task 1's checkpoint).

## Out of scope (per earlier decisions)

- Containerizing the Node app itself — stays native
  (`node --env-file .env src/index.js`).
- GPU acceleration — CPU-only, matches the verified native setup.
- Removing the NixOS-level `whispercpp-server` oci-container — that's
  system config outside this repo; flagged for the user to do themselves
  once the project-local version is confirmed working, to avoid a
  port-8080 conflict between the two.

## Verification

0. Confirm `data/models/ggml-tiny.en-q8_0.bin` is in place (user-supplied)
   before starting the whisper.cpp container — it will fail to find the
   model otherwise.
1. `docker compose up -d` — both containers start, `docker compose ps`
   shows both healthy/running.
2. `curl http://127.0.0.1:8080/inference` (or equivalent health check) —
   whisper.cpp responds; re-run `test/services/whisper.js` (currently
   passing against the NixOS container) against the new project-local one
   to confirm identical behavior.
3. Re-run task 1's exact grammar-constrained curl checkpoint against
   `http://127.0.0.1:8090/v1/chat/completions` — confirm the same
   `{"place_type": "bar", "locations": [...]}` shape comes back for the
   spec's example prompts.
4. `npm test` still green (no test changes expected, but confirms nothing
   broke).
5. Manually stop the containers (`docker compose down`) and confirm the
   Node app's existing error handling for `WHISPERCPP_API_ENDPOINT`/
   `LLM_API_ENDPOINT` being unreachable behaves sanely (not a new
   requirement, just confirms the services are actually being used over
   HTTP as expected, not some other transport).
