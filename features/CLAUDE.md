# CLAUDE.md — features/

This directory holds specs and task tracking for features under active
design or development, one subdirectory per feature.

Each feature subdirectory can contain:

- `spec.md` — what to build: scope, pipeline/architecture, schemas, error
  handling, edge cases, explicit out-of-scope items. Read this before
  implementing or modifying the feature.
- `plan.md` — implementation plan derived from the spec: dependency graph
  between components, vertical task slices, acceptance criteria,
  verification steps, checkpoints.
- `todo.md` — the checkbox-level task list mirroring `plan.md`, for
  tracking progress during implementation.

Not every feature needs all three files — `spec.md` alone is fine before
implementation planning starts. Keep plan/todo scoped to their own feature
folder rather than a shared top-level `tasks/` directory, so each
feature's spec, plan, and progress stay together and can be archived or
removed as a unit once the feature ships.

## Features

- `telegram-bot/` — Telegram bot for voice/text place search
  (transcription, intent extraction, geocoding, Places search).
  `spec.md`, `plan.md`, `todo.md`.
- `dockerize-services/` — project-local Docker Compose setup for
  whisper.cpp and llama.cpp, replacing the current NixOS-level whisper.cpp
  container and ad hoc native llama.cpp invocation. `plan.md`.
