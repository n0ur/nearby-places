# Telegram Bot — Task List

Full detail, acceptance criteria, and verification steps: `plan.md`.

- [x] 1. Stand up local LLM server (llama.cpp + Qwen2.5-1.5B-Instruct) —
     `LLM_API_ENDPOINT` + `data/grammars/search-command.gbnf`
     **[checkpoint: manual curl test before task 3]** — passed, see below.
- [ ] 2. Add `zod` dependency
- [ ] 3. `src/services/intentExtraction.js` + tests
     **[checkpoint: tests green before task 4]**
- [ ] 4. Location resolution (geocode + partial-failure aggregation) + tests
- [ ] 5. Search orchestration (circle + legacy params + placesNearby)
- [ ] 6. Reply formatting (top-5, km distance, Maps links) + tests
- [ ] 7. Bot handler rewrite (`src/services/telegramBot.js`) — voice + text
     entrypoints, status-message editing, per-stage errors, file cleanup,
     rate limiter wiring
- [ ] 8. Per-chat rate limiter (`src/services/telegramRateLimiter.js`) + tests
- [ ] 9. End-to-end manual verification (real Telegram chat, all golden +
     failure paths, `npm test` / `npm run lint` clean)
     **[checkpoint: full manual pass before calling feature done]**
