# DOC-007: KV cache strategy

**Status:** draft · **Milestone:** M2 · **Decisions:** D-003

## Role

KV (`CACHE` namespace) is a **read-through cache** — never the source of truth.
Neon (DOC-006) is authoritative; any KV entry can be dropped without data loss.

## Key scheme

```
gh:repos:<owner>/<repo>          repo metadata        TTL 1h
gh:content:<owner>/<repo>@<ref>  README/AGENTS/etc    TTL 24h
reg:<registry>:<package>         version manifests    TTL 6h
webhook:<delivery-id>            idempotency marker   TTL 24h
ratelimit:<route>:<ip>           counter windows      TTL 60s
token:<installation-id>          installation token   TTL ≤1h (token lifetime)
```

## Rules

- Every route declares its cache policy next to its Zod schema.
- Invalidation: webhook events bust the matching `gh:` keys; `tools registries`
  runs bust `reg:` keys after writing snapshots.
- KV is eventually consistent — responses that must be fresh read Neon first.
