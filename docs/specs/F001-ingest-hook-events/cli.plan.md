---
spec-kind: functional
container: cli
---
# F001-ingest-hook-events - cli

## Specification

Deliver observe-only Cursor hook ingest: one stdin JSON object per invocation, append that payload as one Event log line, and update that day’s Session index when the payload introduces a new session identifier. Artifacts live in a date-named folder under the project. Cursor invokes ingest on `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` only. Failures never block or mutate the agent. Package `name`/`bin` stay `cli-node`. There is no health tracer, no Copilot/Claude registration, no field overlay (`receivedAt`, `harness`, `hookEvent`, omit-empty).

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md)

Grounding (first plan after clean restart):

- `cli/src/index.ts` is hello-world; `cli/test/` is empty; no `.cursor/hooks.json`; no `.agents/hooks/index.mjs`
- Replace the hello-world entry with argv/stdin/`exitCode` dispatch. Other `src/*.ts` export functions (ingest, event, project, store) plus `usageMessage`
- `cli/package.json` already: `name`/`bin` `cli-node`, `type: module`, `dependencies: {}`, `engines.node` `>=24`, `build` → `{repo}/.agents/hooks/index.mjs`, `test` `node --test test/*.test.ts`. Keep those
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact
- Node builtins only; Oxlint complexity ≤ 8; ingest path always `exitCode` 0; `ingestHook` never throws
- Do not restore `F001-ingest-harness-hooks` (omit-empty, receivedAt overlay, three harnesses, prompt/stop, single dated-less `events.jsonl`)

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This feature persists two artifacts per day: the Event log (JSONL, verbatim payload per line) and the Session index (JSON array of distinct session identifiers). Both live in one folder named for the current date.

### Shared store wording

> Copy this block verbatim into the e2e plan.

**Project root** — first non-empty among:

1. `env.CURSOR_PROJECT_DIR`
2. first string in payload `workspace_roots`
3. payload `cwd` (string)
4. process `cwd` passed from the entry

Normalize with `path` so Windows and Linux separators work. Do not read `CLAUDE_PROJECT_DIR`.

**Day folder** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/` where `{YYYY-MM-DD}` is the host **local** calendar date of the invocation. Create `temp/audit/{YYYY-MM-DD}` (and parents) when missing. Root `.gitignore` already has `temp`; do not commit logs.

**Event log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl`

- Always a `.jsonl` file: one incoming event per line.
- Each line is the received JSON object with the **same keys and values** (no added keys, no omitted keys).
- Do not add `receivedAt`, `harness`, `hookEvent`, or any overlay. Do not omit empty fields.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so both artifacts exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers both writes (JSONL append and index read-modify-write). Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, then update the index. No torn, concatenated, or invalid JSON; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` only (`process.argv[2]`). No harness argv. No hook-event hint argv.
- Usage (stderr, `exitCode` 1) when argv is omitted or is not `ingest`: `usage: cli-node ingest`
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` only. Each `command` is `node .agents/hooks/index.mjs ingest`. Do not set `failClosed`. Do not register prompt, stop, tool-use, Tab, `workspaceOpen`, or other Cursor events.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | | First plan; no prior steps to classify |

## Implementation Steps

### Step 1: Session identifier and verbatim event line
Pure lib: extract the session identifier and serialize the payload as one JSONL line. No I/O. No omit-empty. No overlay fields.
- Paths:
    - `cli/src/event.ts`
    - `cli/test/event.test.ts`
- [x] Export `sessionIdentifier(payload)` that returns the first non-empty string among `session_id`, `conversation_id`, `parent_conversation_id`; otherwise `undefined` (AC-F001.3, AC-F001.7)
- [x] Export `eventLogLine(payload)` that returns `JSON.stringify(payload)` with every own JSON field preserved; no `receivedAt` / `harness` / `hookEvent`; no omit of empty values (AC-F001.2)
- [x] Unit-test identifier: `session_id` wins over `conversation_id`; `conversation_id` used when `session_id` absent; `parent_conversation_id` used only when both absent; empty string / missing / non-string → `undefined`
- [x] Unit-test line: parsed line deep-equals the payload; empty strings/arrays/objects kept; overlay keys absent

---

### Step 2: Project root and locked dated-folder store
Resolve the workspace. Create `{projectRoot}/temp/audit/{YYYY-MM-DD}/` when missing. Append one Event log line and update the Session index under one lock. Node builtins only.
- Paths:
    - `cli/src/project.ts`
    - `cli/src/store.ts`
    - `cli/test/project.test.ts`
    - `cli/test/store.test.ts`
- [x] Export `resolveProjectRoot({ env, payload, cwd })`: `CURSOR_PROJECT_DIR`, then first `workspace_roots` string, then payload `cwd`, then `cwd`; `path.normalize`; no `CLAUDE_PROJECT_DIR`
- [x] Export `dayFolderName(now)` as local `YYYY-MM-DD` (not UTC)
- [x] Export `persistIngest({ projectRoot, eventLine, sessionId, now })`: `mkdir` the day folder recursive; lock `ingest.lock` via `fs.open(..., "wx")`; on `EEXIST` retry ~10ms; wait ≤ 400ms; stale lock mtime > 2s unlink and retry; under lock append `eventLine + "\n"` to `events.jsonl`; ensure `sessions.json` is a JSON array (`[]` if missing); if `sessionId` is a string not already in the array, append it and write the file; if `sessionId` is `undefined`, do not change the array; close and `unlink` the lock in `finally`; if lock not acquired, throw (ingest catch swallows) (AC-F001.1, AC-F001.3, AC-F001.4, AC-F001.5, AC-F001.7)
- [x] Do not write under `os.tmpdir()`, `%TEMP%`, `/tmp`, or `cli/temp` as the audit root; do not write a single undated `temp/audit/events.jsonl`
- [x] Unit-test resolution order and Windows/POSIX normalize
- [x] Unit-test persist: creates `temp/audit/{YYYY-MM-DD}/events.jsonl` and `sessions.json` under a fixture root; jsonl has exactly one parseable object line equal to the payload; new id appended; duplicate id not appended; missing id leaves `[]` unchanged
- [x] Unit-test concurrent persist: two overlapping calls yield two complete JSONL lines and a valid unique-id array (AC-F001.5)

---

### Step 3: Ingest command (observe-only)
Read stdin JSON, persist, always exit 0. Never throw. No blocking stdout.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/test/ingest.test.ts`
- [x] Export `IngestInput`: `{ stdinText, env, cwd, now? }` — no `harness`, no `hookEventHint`
- [x] Export `ingestHook(input)` that never throws: parse stdin as one JSON object; `resolveProjectRoot`; `eventLogLine` + `sessionIdentifier`; `persistIngest` with `now ?? new Date()`; any failure (invalid JSON, array/primitive, missing root, disk/lock) swallows and writes no partial line (AC-F001.1, AC-F001.2, AC-F001.7)
- [x] Do not filter by event name; do not require `hook_event_name`
- [x] Unit-test success: object stdin + `CURSOR_PROJECT_DIR` → one verbatim jsonl line and index updated when `session_id` is new (AC-F001.1, AC-F001.3)
- [x] Unit-test no session id: jsonl line written; `sessions.json` stays `[]` (AC-F001.7)
- [x] Unit-test failures: non-JSON, JSON array, persist throw → no file or file still valid JSONL
- [x] Unit-test unknown event name still persisted (no hook-type filter)

---

### Step 4: Entry, usage, and harness artifact
`index.ts` is entry only (argv, stdin, `exitCode`). Unknown/omitted argv → usage on stderr, exit 1. Rebuild the hook artifact.
- Paths:
    - `cli/src/index.ts`
    - `cli/src/usage.ts`
    - `cli/test/usage.test.ts`
    - `.agents/hooks/index.mjs`
- [x] Export `usageMessage` = `usage: cli-node ingest` (names ingest; does not name health or harness)
- [x] `index.ts`: shebang; `readFileSync(0)` only on ingest; `command = process.argv[2]`; `ingest` → `ingestHook({ stdinText, env: process.env, cwd: process.cwd() })` in try/finally with `process.exitCode = 0`; else `console.error(usageMessage)` and `exitCode` 1; write nothing to stdout on ingest (AC-F001.6)
- [x] Do not print hello-world; do not default ingest when argv is omitted
- [x] Unit-test `usageMessage` includes `ingest` and does not include `health`
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 5: Cursor hook registration
Repo-root Cursor config only. Command uses the bundled harness entry. Do not add Claude or Copilot hook files. Do not replace existing `.cursor/` AIDD overlay files (agents/commands/rules).
- Paths:
    - `.cursor/hooks.json`
- [x] `.cursor/hooks.json`: `"version": 1`; keys `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` only; each entry `command` is `node .agents/hooks/index.mjs ingest`; do not set `failClosed` (AC-F001.6)
- [x] Do not subscribe `beforeSubmitPrompt`, `stop`, tool-use, Tab, `workspaceOpen`, or any other Cursor event
- [x] Do not add `.claude/settings.json` or `.github/hooks/` ingest config
- [x] Same observe-only command on Windows and Linux (`node` + `.mjs`); no Unix-only script as the only entry

---

### Step 6: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; keep `test` as `node --test test/*.test.ts`; do not change `start`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [x] Unit tests cover AC-F001.1–5 and AC-F001.7 at lib level; AC-F001.6 is hooks.json + engines + ESM build (e2e will spawn `cli/src/index.ts`, not the artifact)

---

### Deviations

- `.cursor/hooks.json` nests the four event keys under Cursor’s required `"hooks"` object (`"version": 1` at top level). Event keys are not top-level. e2e should assert `config.hooks` and `config.version`.
- `resolveProjectRoot` still maps a leading-slash Windows drive (`/C:/...`) from `workspace_roots` via `path.win32.normalize`, in addition to `path.normalize`.
- Created `.agents/hooks/` so `bun run build` can emit `index.mjs` (directory was missing after clean restart).
- Stdin is UTF-8 `readFileSync(0, "utf8")` then `JSON.parse`. No UTF-16/BOM/double-encoded decode from the old harness-hooks ingest.

> last updated: 2026-09-01T07:24:00Z
