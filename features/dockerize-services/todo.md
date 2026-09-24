# Dockerize whisper.cpp + llama.cpp — Task List

Full detail, rationale, and verification steps: `plan.md`.

- [x] 0. Confirm `data/models/ggml-tiny.en-q8_0.bin` is in place
     (user-supplied — moved from Downloads, not fetched by this plan)
- [x] 1. Write `docker-compose.yml` (repo root) — `whispercpp` +
     `llamacpp` services, official images, `data/models:/models` mount,
     ports 8080/8090, commands per plan.md's table,
     `restart: unless-stopped`
- [x] 2. Add `LLM_API_ENDPOINT=http://127.0.0.1:8090/v1/chat/completions`
     to local `.env` (leave `WHISPERCPP_API_ENDPOINT` unchanged)
- [x] 3. Add "Local inference services" section to `README.md`
     (`docker compose up -d` as a setup step)
- [x] 4. Add `docker compose up -d` to `CLAUDE.md`'s Commands section
- [x] 5. Verify: `docker compose up -d`, both containers running
     (`docker compose ps`)
- [x] 6. Verify: whisper.cpp responds on 8080; re-run
     `test/services/whisper.test.js` against the project-local container
     — passing (renamed from `whisper.js` for naming-convention consistency)
- [x] 7. Verify: automated in place of a manual curl checkpoint —
     `test/services/llamacpp.test.js` hits `http://127.0.0.1:8090/v1/chat/completions`
     with the grammar attached and asserts valid `{place_type, locations}`
     JSON for 2- and 3-location prompts. Passing.
- [x] 8. Verify: `npm test` green (17/17, includes tasks 6+7's tests)
- [x] 9. Verify: `docker compose down` — both service tests fail with a
     clean `ECONNREFUSED`, not a hang or unclear error. Containers brought
     back up afterward (`docker compose up -d`), all tests green again.
- [x] 10. **[user, outside this repo]** Remove/stop the NixOS-level
      `whispercpp-server` oci-container to avoid a port-8080 conflict
