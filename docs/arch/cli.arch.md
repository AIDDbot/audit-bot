# CLI architecture — audit-bot

> Container `cli` from [`system.arch.md`](./system.arch.md).
> Tier: `cli`.


## Overview

Node.js TypeScript CLI (ESM, Bun as package manager and runner). Observe-only hook ingest: `ingest` reads one stdin JSON object (`readFileSync(0)`), appends one Event JSONL line under the resolved project's `temp/audit/`, and always exits 0 with no stdout (`runIngest` `finally`). There is no health tracer. Reports and query commands are not implemented. Runtime `dependencies` are empty. Package `name` and `bin` remain `cli-node` (`bin` points at `src/index.ts`, not `.agents/hooks/`). Official compile is `bun run build` → ESM `.agents/hooks/index.mjs`. `tsconfig.build.json` still names an `outDir` of `../.agents/hooks` for tsc (would emit `.js`); it is not the harness entry.

- **Folder**: `cli/`
- **Archetype**: TypeScript — Node CLI (Bun, Oxlint)

### Dependencies

- **Depends on**: Node ≥ 24 or Bun ≥ 1.4 (no sibling containers)
- **Used by**: Developer (local run/tests). Agent hosts (Cursor, Claude, Copilot) invoke ingest via project-level hook config at repo root
- **Libraries**: none (`dependencies`: `{}`). Dev: `@types/node`, `oxlint`, `oxlint-tsgolint`, `typescript`. Tests use `node:test` and `node:assert`

### CLI surface (not HTTP)

No HTTP API; no [`api.schema.md`](../model/api.schema.md). Commands:

| argv | Behavior |
|------|----------|
| `ingest {harness} {optionalHookEventHint}` | stdin: one JSON object; append one Event under `{projectRoot}/temp/audit/events.jsonl`; `exitCode` 0; no stdout. Failures are swallowed (still 0, no blocking/mutating stdout). `{harness}` is `cursor` \| `claude` \| `copilot`. `hookEvent`: non-empty payload `hook_event_name`, else argv hint, else no line |
| omitted, `health`, or anything else | stderr: `usage: cli-node ingest {harness} [hookEventHint]`; `process.exitCode` 1. No “up and running” line |

Silent no-ops (still exit 0, no file): non-JSON stdin, JSON array/primitive, missing/invalid harness, missing hookEvent, missing project root, lock/disk throw.

Project-level hook registration (repo root, not under `cli/`):

| Harness | Config | Command |
|---------|--------|---------|
| Cursor | `.cursor/hooks.json` | `node .agents/hooks/index.mjs ingest cursor {event}` for `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `stop` |
| Claude | `.claude/settings.json` | exec form `node` + `${CLAUDE_PROJECT_DIR}/.agents/hooks/index.mjs ingest claude` (no argv hint; payload `hook_event_name`) for `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop` |
| Copilot | `.github/hooks/audit-ingest.json` | `node .agents/hooks/index.mjs ingest copilot {event}` for `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `agentStop` |

Repo-root `e2e/` spawn tests invoke `cli/src/index.ts` (not the compiled `.mjs`).

---

## Components diagram (C4 L3)

```mermaid
C4Component
  title CLI Components

  Container_Boundary(boundary, "CLI") {
    Component(entry, "index.ts", "Entry")
    Component(usage, "usage.ts", "Usage")
    Component(ingest, "ingest.ts", "Ingest")
    Component(event, "event.ts", "Event")
    Component(project, "project.ts", "Project")
    Component(store, "store.ts", "Store")
  }

  Rel(entry, ingest, "ingest")
  Rel(entry, usage, "usage")
  Rel(ingest, event, "buildEvent")
  Rel(ingest, project, "resolveProjectRoot")
  Rel(ingest, store, "appendEvent")
```

---

## Code organization

**Pattern**: Layer-based (entry → ingest). Tests live beside source under `test/`, not colocated.

```text
cli/
├── src/index.ts           # shebang entry; argv dispatch; stdin; exitCode
├── src/usage.ts           # usageMessage (non-ingest argv)
├── src/ingest.ts          # ingestHook (observe-only; never throws); IngestInput
├── src/event.ts           # omitEmpty, buildEvent
├── src/project.ts         # resolveProjectRoot
├── src/store.ts           # appendEvent (locked JSONL)
├── test/*.test.ts         # node:test for exported lib functions + usageMessage
├── package.json           # scripts, engines, bin cli-node
├── tsconfig.json          # noEmit typecheck; excludes ../.agents/hooks
├── tsconfig.build.json    # tsc emit dest `.agents/hooks/` (official build is bun → `.mjs`)
└── .oxlint.json           # lint (complexity 8 in config)
```

Compiled artifact (repo root, not under `cli/`): `.agents/hooks/index.mjs` (bun bundle; `.gitignore` there is `*.js` / `*.map`).

Store file: `{projectRoot}/temp/audit/events.jsonl`. Sidecar lock: `{projectRoot}/temp/audit/events.jsonl.lock` (`open(..., "wx")`; wait 400ms, retry 10ms; stale mtime > 2000ms unlinked). Project root: `CURSOR_PROJECT_DIR`, then `CLAUDE_PROJECT_DIR`, then payload `cwd`, then first `workspace_roots` string (`path.normalize`).

`ingest.ts` takes `IngestInput` (`harness`, `hookEventHint`, `stdinText`, `env`). Helpers `parsePayload`, `resolveHookEvent`, and `resolveHarness` are sequential guards; `ingestOrThrow` returns early on missing payload/hookEvent/harness/projectRoot; `ingestHook` catches all throws.

---

> last updated: 2026-08-31T20:15:12Z
