# CLI architecture — audit-bot

> Container `cli` from [`system.arch.md`](./system.arch.md).
> Tier: `cli`.


## Overview

Node.js TypeScript CLI (ESM, Bun as package manager and runner). 

- **Folder**: `cli/`
- **Archetype**: TypeScript — Node CLI (Bun, Oxlint)

### Dependencies

- **Depends on**: Node ≥ 24 or Bun ≥ 1.4 (no sibling containers)
- **Used by**: Developer (local run/tests). Cursor invokes ingest via project-level `.cursor/hooks.json` at repo root (`node .agents/hooks/index.mjs ingest`)
- **Libraries**: none (`dependencies`: `{}`). Dev: `@types/node`, `oxlint`, `oxlint-tsgolint`, `typescript`. Tests use `node:test` and `node:assert`

### CLI surface (not HTTP)

No HTTP API; no [`api.schema.md`](../model/api.schema.md). Commands:

| Command | Behavior |
| --- | --- |
| `ingest` | Read one JSON object from stdin. Append it as one line to `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl`. Update `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json` when the payload introduces a new session identifier. Write no stdout. Always `exitCode` 0. |
| *(omitted or other)* | `usage: cli-node ingest` on stderr, `exitCode` 1. |

**Project root** — first non-empty among `CURSOR_PROJECT_DIR`, payload `workspace_roots[0]`, payload `cwd`, process cwd. **Session identifier** — first non-empty among `session_id`, `conversation_id`, `parent_conversation_id`. Both writes run under `ingest.lock`.

Harness artifact: `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`).

---

## Code organization

**Pattern**: Layer-based (entry → ingest → event / project / store). Tests live under `cli/test/`, not colocated. Functional spawn tests live under repo-root `e2e/` and spawn `cli/src/index.ts`, not the `.mjs` artifact.

| File | Role |
| --- | --- |
| `src/index.ts` | argv, stdin, `exitCode` |
| `src/ingest.ts` | parse stdin object, swallow errors |
| `src/event.ts` | session identifier, verbatim JSONL line |
| `src/project.ts` | project root, local `YYYY-MM-DD` |
| `src/store.ts` | dated folder, lock, append, session index |
| `src/usage.ts` | `usageMessage` |

---

> last updated: 2026-09-01T07:40:21Z
