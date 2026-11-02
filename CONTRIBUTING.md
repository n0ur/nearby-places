# Contributing

## Branch naming

Use `<type>/<short-description>`. Use lowercase and hyphens.

```
feature/task-creation
fix/duplicate-locations
chore/update-deps
refactor/search-service
test/geometry-service
docs/readme-setup
```

Branch from `main`. Keep branches short-lived — merge within a few days.

## Commit messages

Use `<type>: <description>`.

```
feat: add email validation to join flow
fix: deduplicate concurrent nearby searches
refactor: extract geometry calculation to its own service
test: cover SearchService cancellation
docs: document SSE reconnect behavior
chore: bump fastify to v5.8.4
```

Allowed types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.

A commit-msg hook rejects messages that don't match this format.

## Workflow

1. Branch from `main`.
2. Commit in small, logical steps. Each commit does one thing.
3. Push the branch and open a pull request into `main`.
4. CI must pass (lint + tests) before merge.
5. Squash-merge the pull request. Delete the branch after merge.

## Main is protected

Never push directly to `main`. All changes land through a pull request.

A pre-push hook blocks direct pushes to `main` from your machine. GitHub
branch protection enforces the same rule on the server, and requires the
CI check to pass before merge.

## Hooks

Husky runs on:

- `pre-commit` — lint-staged (eslint + prettier on staged files), then
  the full test suite.
- `commit-msg` — validates the commit message format.
- `pre-push` — blocks pushes to `main`, warns if the branch name doesn't
  match `<type>/<short-description>`.
