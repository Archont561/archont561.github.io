# DOC-006: Neon schema & migrations

**Status:** draft · **Milestone:** M2 · **Decisions:** D-003

## Tables (initial)

| Table | Purpose |
| --- | --- |
| `installations` | GitHub App installation ids, account, repos, scopes |
| `repos` | tracked repositories, last-audit result, health JSON |
| `sync_state` | per-source cursor (registries, watches), last run, status |
| `audit_log` | webhook/API events worth keeping (idempotency keys, outcomes) |
| `registry_snapshots` | versioned snapshots behind `data/packages.json` |

## Rules

- Access via `drizzle-orm` + `drizzle-kit` (`@neondatabase/serverless` HTTP
  driver — no TCP on Workers). Pooled connection string in `DATABASE_URL`.
- **Migrations run from CI/Node** (`drizzle-kit migrate`), never inside the
  Worker. Worker code only reads/writes through the schema.
- Schema changes: Backlog task + PR review required (AGENTS.md boundary).
