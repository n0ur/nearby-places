# Dockerize whisper.cpp + llama.cpp — Task List

Full detail, rationale, and verification steps: `plan.md`.

- [x] 0. Confirm `data/models/ggml-tiny.en-q8_0.bin` is in place
     (user-supplied — moved from Downloads, not fetched by this plan)
- [x] 1. Write `docker-compose.yml` (repo root) — `whispercpp` +
     `llamacpp` services, official images, `data/models:/models` mount,
     ports 8080/8090, commands per plan.md's table,
     `restart: unless-stopped`
- [ ] 2. Add `LLM_API_ENDPOINT=http://127.0.0.1:8090/v1/chat/completions`
     to local `.env` (leave `WHISPERCPP_API_ENDPOINT` unchanged)
- [ ] 3. Add "Local inference services" section to `README.md`
     (`docker compose up -d` as a setup step)
- [ ] 4. Add `docker compose up -d` to `CLAUDE.md`'s Commands section
- [ ] 5. Verify: `docker compose up -d`, both containers running
     (`docker compose ps`)
- [ ] 6. Verify: whisper.cpp responds on 8080; re-run
     `test/services/whisper.js` against the project-local container
- [ ] 7. Verify: re-run task 1's grammar-constrained curl checkpoint
     against `http://127.0.0.1:8090/v1/chat/completions`, confirm same
     JSON shape as before
- [ ] 8. Verify: `npm test` green
- [ ] 9. Verify: `docker compose down`, confirm app's unreachable-endpoint
     error handling behaves sanely
- [ ] 10. **[user, outside this repo]** Remove/stop the NixOS-level
      `whispercpp-server` oci-container to avoid a port-8080 conflict
