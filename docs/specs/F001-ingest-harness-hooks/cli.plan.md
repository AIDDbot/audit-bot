---
spec-kind: functional
container: cli
---
# F001-ingest-harness-hooks - cli

## Specification

This container must keep the health tracer working and add observe-only hook ingest: read one stdin JSON object, append one Event JSONL line under the resolved project's `temp/audit/`, and register project-level hooks so Cursor, Claude Code, and GitHub Copilot invoke that ingest on the MVP events. Failures never block or mutate the agent.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md)

Grounding (current tree is still the health tracer):

- `cli/src/index.ts` — argv dispatch: omitted/`health` prints health to stdout; anything else usage on stderr + `exitCode` 1
- `cli/src/lib.ts` — `getHealthMessage()`
- `cli/test/lib.test.ts` — `node:test` for health
- `package.json` `name`/`bin` stay `cli-node` (out of spec)
- No runtime deps; Node builtins only; Oxlint complexity 8
- Entry: argv/stdout/stderr/`exitCode`; no business logic strings beyond the existing usage line
- Lib: exported functions; camelCase; no barrel files; no DI
- Tests: `cli/test/*.test.ts` via Node's test runner

### Data model

From [`model.schema.md`](../../model/model.schema.md): **AgentHost** (Cursor, Claude Code, Copilot) hosts **Session**; Session emits **Event**. This feature persists Event only. **Report** is unused. Do not invent a Session entity file.

**Shared store wording (copy verbatim into the e2e plan):**

An **Event** is one JSON object on its own line (JSONL) under `{projectRoot}/temp/audit/`:

- `harness` — `"cursor"` | `"claude"` | `"copilot"` (AgentHost identity)
- `receivedAt` — ISO 8601 timestamp when ingest received the event
- `hookEvent` — the hook event name from the harness (e.g. `sessionStart`, `SessionStart`, `beforeSubmitPrompt`, `UserPromptSubmit`, `userPromptSubmitted`, `stop`, `Stop`, `agentStop`, `sessionEnd`, `SessionEnd`)
- remaining keys — stdin payload fields that still have a value after omit of null/empty (`""`, `[]`, `{}`), including nested keys; empty parents omitted after nested omit; `0` and `false` stay

Session identity is whatever the payload already carries (`conversation_id` / `session_id` / `sessionId`). Do not invent a Session entity file. Report is unused.

Store file: `{projectRoot}/temp/audit/events.jsonl` (not OS temp, not `cli/temp`). Root `.gitignore` already has `temp`.

Project root resolution order (from spec): Cursor `CURSOR_PROJECT_DIR`, Claude `CLAUDE_PROJECT_DIR`, Copilot/Claude `cwd` field, Cursor `workspace_roots`. Write under **that** project's `temp/audit`.

`harness`, `receivedAt`, and `hookEvent` are written last so they are not overwritten by payload keys of the same name.

`hookEvent` value: non-empty string `hook_event_name` from the payload if present; else the optional argv hint from the hook command; else ingest failure (no line). Copilot CLI camelCase payloads may omit `hook_event_name`.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | first | First plan for this container |

## Implementation Steps

### Step 1: Event omit-empty and Event record
Pure lib: omit null/empty keys (nested) and build the Event object. No I/O.
- Paths:
    - `cli/src/event.ts`
    - `cli/test/event.test.ts`
- [ ] Export `omitEmpty(value)` that recursively omits keys whose values are `null`, `""`, `[]`, or `{}`; recurse into objects and into object elements of arrays; after nested omit, omit a parent key that is then `{}`; keep `0` and `false` (AC-F001.10)
- [ ] Export `buildEvent({ harness, receivedAt, hookEvent, payload })` that returns `{ ...omitEmpty(payload), harness, receivedAt, hookEvent }` with `harness` one of `"cursor"` | `"claude"` | `"copilot"` and `receivedAt` an ISO 8601 string (AC-F001.6)
- [ ] Unit-test omit: nested empty objects/arrays/strings dropped; empty parent omitted; `0` and `false` kept; non-empty strings kept
- [ ] Unit-test Event shape: overlay wins over payload keys named `harness` / `receivedAt` / `hookEvent`; remaining payload keys present after omit

---

### Step 2: Project-root resolution and locked JSONL append
Resolve the project workspace and append one complete JSONL line under `{projectRoot}/temp/audit/events.jsonl`. Node builtins only.
- Paths:
    - `cli/src/project.ts`
    - `cli/src/store.ts`
    - `cli/test/project.test.ts`
    - `cli/test/store.test.ts`
- [ ] Export `resolveProjectRoot({ env, payload })`: first non-empty among `env.CURSOR_PROJECT_DIR`, `env.CLAUDE_PROJECT_DIR`, payload `cwd` (string), first string in payload `workspace_roots`; use `path` so Windows and Linux native separators work; return `undefined` when none (AC-F001.3, AC-F001.7)
- [ ] Export `appendEvent(projectRoot, event)`: `mkdir` `{projectRoot}/temp/audit` recursive; lock `{projectRoot}/temp/audit/events.jsonl.lock` via `fs.open(..., "wx")`; on `EEXIST` retry with a short delay; total wait well under 500ms (Claude `SessionEnd` budget is ~1.5s); if lock not acquired, throw; under lock, one `write` of `JSON.stringify(event) + "\n"` with append; close and `unlink` the lock in `finally`; if the lock file is stale (mtime older than 2s), unlink and retry (AC-F001.1, AC-F001.9)
- [ ] Do not write under `os.tmpdir()`, `%TEMP%`, `/tmp`, or `cli/temp` as the audit root
- [ ] Unit-test resolution order and “none found”
- [ ] Unit-test append: creates `temp/audit/events.jsonl` under a fixture project root; file contains exactly one parseable JSON object line
- [ ] Unit-test concurrent append: two overlapping `appendEvent` calls to the same file yield two complete JSONL lines and no torn/concatenated line (AC-F001.9)

---

### Step 3: Ingest command (keep health unchanged)
Read stdin JSON, build Event, append; always exit 0 on ingest; no blocking/mutating stdout. Health argv stays as today.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/src/index.ts`
    - `cli/src/lib.ts` (unchanged)
    - `cli/test/ingest.test.ts`
- [ ] Export `ingestHook({ harness, hookEventHint, stdinText, env })` that never throws to the caller: parse stdin as one JSON object; resolve `hookEvent` then `harness` (`cursor`|`claude`|`copilot`); `resolveProjectRoot`; `buildEvent`; `appendEvent`; any failure (invalid JSON, non-object, missing harness, missing hookEvent, missing project root, disk/lock error) swallows and writes no line (AC-F001.4, AC-F001.5)
- [ ] `index.ts` dispatch: omitted or `health` → `console.log(getHealthMessage())` unchanged; `ingest` → read stdin to string, call `ingestHook` with `argv[3]` harness and `argv[4]` hint, set `process.exitCode = 0`, write nothing to stdout (wrap in try/finally so ingest always ends 0); any other argv → existing usage on stderr + `exitCode` 1
- [ ] Ingest writes no stdout (Cursor/Claude treat some JSON as extra context; Copilot may parse stdout as a decision). Do not exit 2 or any non-zero on ingest
- [ ] Unit-test success: object stdin + env project dir → one Event line with `harness`, ISO 8601 `receivedAt`, `hookEvent`, omitted payload (AC-F001.1, AC-F001.6)
- [ ] Unit-test failures: non-JSON stdin, JSON array/primitive, missing project root, append throw → no file or file still valid JSONL (no partial line) (AC-F001.5)

---

### Step 4: Project-level hook registration
Repo-root configs (harness discovery paths), not files under `cli/`. Command is `node` plus script args — not a Unix-only script as the only entry. Do not rename `cli-node`. Do not replace existing `.cursor/`, `.claude/`, or `.github/` AIDD overlay files.
- Paths:
    - `.cursor/hooks.json`
    - `.claude/settings.json`
    - `.github/hooks/audit-ingest.json`
- [ ] Cursor `.cursor/hooks.json`: `"version": 1`; subscribe `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `stop`; each `command` is `node cli/src/index.ts ingest cursor {event}` (project hooks run from repo root); do not set `failClosed` (AC-F001.2, AC-F001.8)
- [ ] Claude `.claude/settings.json`: `hooks` for `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop`; each handler `type: "command"`, exec form `"command": "node"`, `"args": ["${CLAUDE_PROJECT_DIR}/cli/src/index.ts", "ingest", "claude"]` so Windows gets `node.exe` not a `.sh` (AC-F001.7)
- [ ] Copilot `.github/hooks/audit-ingest.json`: `"version": 1`; subscribe `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `agentStop`; each entry `type: "command"` with cross-platform `"command": "node cli/src/index.ts ingest copilot {event}"` (no bash-only or powershell-only as the only path) (AC-F001.2, AC-F001.8)
- [ ] Same observe-only command on Windows and Linux; native path separators only in filesystem paths, not in the JSONL shape (AC-F001.7)

Hook events (MVP; tool-use is out of scope):

| Kind | Cursor | Claude Code | Copilot CLI |
| --- | --- | --- | --- |
| Session start | `sessionStart` | `SessionStart` | `sessionStart` |
| Session end | `sessionEnd` (`duration_ms`) | `SessionEnd` | `sessionEnd` |
| Prompt | `beforeSubmitPrompt` | `UserPromptSubmit` | `userPromptSubmitted` |
| Turn stop | `stop` | `Stop` | `agentStop` |

---

### Step 5: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
- [ ] Change `cli/package.json` `test` script from `node --test test/lib.test.ts` to `node --test test` so every `test/*.test.ts` runs (do not rename `name`/`bin`)
- [ ] Health test still passes; ingest tests cover omit, resolve, append, ingest failure paths, concurrent append
- [ ] `cd cli && bun run test` green; lint complexity stays ≤ 8

---

> last updated: 2026-08-31T18:22:00Z
