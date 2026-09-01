---
spec-kind: functional
container: cli
---
# F002-ingest-source-args - cli

## Specification

Accept two optional ingest positionals (source harness, then source event). Cursor registration already fills those values in on each event’s `command` shell string. Persistence stays F001: verbatim Event log, Session index rules, exit 0, no blocking stdout. Do not overlay harness or event on the stored line. Do not use the positionals to skip, filter, or transform. This spec does not replace F001.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md)

Grounding (F002 shipped 0.6.0; this is a replan after the Cursor-registration learning scar — do not redo persist; do not revive wrappers):

- `cli/src/argv.ts`: `parseArgv` already returns ingest plus optional `harness`/`event` from argv[3]/argv[4]. Keep it
- `cli/src/index.ts`: already uses `parseArgv`; does **not** pass harness/event into `ingestHook` (correct for this spec)
- `cli/src/ingest.ts`: `IngestInput` is `{ stdinText, env, cwd, now? }` — keep it that way: positionals are invocation inputs at argv parse, not persist inputs
- `cli/src/usage.ts`: `usage: cli-node ingest`. Keep naming ingest; do not require the positionals
- `.cursor/hooks.json`: each of `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` already has `command`: `node .agents/hooks/index.mjs ingest cursor {event}`. Leave it. Cursor `command` is a shell string; extra argv tokens are passed on Windows
- `.cursor/hooks/*.cmd`: **absent** (wrappers removed). Do not add them back
- `cli/test/hooks.test.ts`: **stale** — still asserts `.cursor/hooks/{event}.cmd` path-only wrappers. Rewrite those assertions to the current `hooks.json` command strings
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. This replan’s remaining work is tests/docs, not `cli/src/`
- Node builtins only; Oxlint complexity ≤ 8; ingest path always `exitCode` 0; `ingestHook` never throws
- Package `name`/`bin` stay `cli-node`
- Do not change Event log / Session index paths, decode/lock/root rules, Copilot/Claude registration, or extra Cursor events

**Architecture is current.** [`cli.arch.md`](../../arch/cli.arch.md) already documents optional ingest positionals and `node .agents/hooks/index.mjs ingest cursor {event}` with no `.cmd` wrappers. Spec AC-F002.3/4 text still says “wrapper” / “path-only command”; this plan keeps those criteria and reinterprets the **means** (see Deviations). Do not amend architecture here.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This spec does not add persisted entities. Source harness and source event are invocation inputs only. Daily Event log and Session index remain F001 artifacts.

### Shared store wording

> Copy this block verbatim into the F002 e2e plan. Event log, Session index, project root, day folder, and concurrency are unchanged from F001. Only **Argv / stdin / stdout** and **Cursor registration** differ.

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

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are invocation inputs only. Do not persist them. Do not pass them into `ingestHook`. Do not use them to skip, filter, or transform the event. Do not write them onto the Event log line.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` only. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name (source harness `cursor` and that event name already filled in). Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers to pass harness/event. Do not set `failClosed`. Do not register prompt, stop, tool-use, Tab, `workspaceOpen`, or other Cursor events.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Step 1: Parse optional ingest positionals (lib) | keep | `parseArgv` and argv/usage unit tests already match AC-F002.1/2 |
| Step 2: Entry accepts positionals; persist stays F001 | keep | `index.ts` already discards harness/event; `IngestInput` unchanged; persist tests already assert no overlay |
| Step 3: Distinct Cursor hook wrapper per registered event | drop | Do not create `.cmd` wrappers. Learning scar: `node … ingest cursor {event}` keeps extra tokens. Wrapper files already absent |
| Step 4: Register the four wrappers (path-only commands) | drop | Do not register path-only wrapper commands. Current `hooks.json` already uses the node shell string per event |
| Step 5: Test runner and AC sweep | redo | `hooks.test.ts` still asserts `{event}.cmd` path-only wrappers; rewrite those tests then re-run |

## Implementation Steps

### Step 1: Parse optional ingest positionals (lib)
Extract argv classification so unit tests cover both/one/none positionals without spawning the entry. `index.ts` stays entry-only (argv, stdin, `exitCode`).
- Paths:
    - `cli/src/argv.ts`
    - `cli/test/argv.test.ts`
    - `cli/src/usage.ts`
    - `cli/test/usage.test.ts`
- [x] Export `parseArgv(argv)` that reads `argv[2]` as the command; when it is `ingest`, return that command plus optional `argv[3]` (source harness) and `argv[4]` (source event); when `argv[2]` is omitted or is not `ingest`, return unknown — extra tokens after `ingest` are still ingest (AC-F002.1, AC-F002.2)
- [x] Do not treat a missing `argv[3]` or missing `argv[4]` as unknown. Do not require recognized harness/event values. Do not fail when they are unrecognized
- [x] Keep `usageMessage` = `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health)
- [x] Unit-test parse: `ingest cursor sessionStart` → ingest with both positionals; `ingest cursor` → ingest with harness only; `ingest` with no further argv → ingest with neither; extra tokens after both positionals → still ingest (AC-F002.1, AC-F002.2)
- [x] Unit-test parse: omitted command and `argv[2]` other than `ingest` → unknown (not ingest)
- [x] Unit-test `usageMessage` still equals `usage: cli-node ingest` and does not list harness/event as required

---

### Step 2: Entry accepts positionals; persist stays F001
Wire the entry to the parser. Call `ingestHook` exactly as F001 — do not thread source harness or source event into `IngestInput` or the store.
- Paths:
    - `cli/src/index.ts`
    - `cli/src/ingest.ts`
    - `cli/test/ingest.test.ts`
    - `cli/test/event.test.ts`
    - `.agents/hooks/index.mjs`
- [x] `index.ts`: shebang; `parseArgv(process.argv)`; on ingest, `readFileSync(0)` then `ingestHook({ stdinText, env: process.env, cwd: process.cwd() })` in try/finally with `process.exitCode = 0`; on unknown, `console.error(usageMessage)` and `exitCode` 1 (AC-F002.1, AC-F002.2)
- [x] Do not pass `argv[3]` / `argv[4]` into `ingestHook`. Keep `IngestInput` as `{ stdinText, env, cwd, now? }` — no `harness`, no `hookEvent`
- [x] Do not change `eventLogLine`, `persistIngest`, project root, day folder, lock, or Session index rules
- [x] Unit-test ingestHook: object stdin still writes one verbatim jsonl line whose parsed object deep-equals the payload and has no added `harness` / `hookEvent` keys (AC-F002.1)
- [x] Unit-test `eventLogLine` still omits overlay keys (existing F001 coverage; keep it)
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 3: Unit-test Cursor registration as shell commands (not wrappers)
Registration already matches current architecture. Rewrite the stale unit tests so AC-F002.3/4 assert the `hooks.json` command string, not `.cmd` wrappers.
- Paths:
    - `.cursor/hooks.json`
    - `cli/test/hooks.test.ts`
- [ ] Do not add `.cursor/hooks/{event}.cmd` (or any `.cmd` wrappers). Do not revive path-only `command` strings. Learning scar: extra tokens after `node … index.mjs` are kept
- [ ] Leave `.cursor/hooks.json` as: `"version": 1`; keys `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` only; each `command` is `node .agents/hooks/index.mjs ingest cursor {event}`; `failClosed` unset (AC-F002.3, AC-F002.4)
- [ ] Rewrite `hooks.test.ts`: drop reads of `.cursor/hooks/{event}.cmd` and path-only `command` assertions (no `assert.equal(command, \`.cursor/hooks/${event}.cmd\`)`, no “command includes no space / no `ingest`”)
- [ ] Unit-test AC-F002.3: each of the four events’ `command` identifies itself at invocation — the string includes `ingest cursor {event}` with that event’s name
- [ ] Unit-test AC-F002.4: each `command` equals `node .agents/hooks/index.mjs ingest cursor {event}` (both positionals already filled; extra tokens on the shell string). Assert `.cursor/hooks/{event}.cmd` and `.cursor/hooks/ingest.cmd` are absent
- [ ] Do not subscribe `beforeSubmitPrompt`, `stop`, tool-use, Tab, `workspaceOpen`, or any other Cursor event
- [ ] Do not add `.claude/settings.json` or `.github/hooks/` ingest config

---

### Step 4: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; keep `test` as `node --test test/*.test.ts`; do not change `start`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [ ] Unit tests cover AC-F002.1–2 at lib (parse + persist verbatim, no overlay) and AC-F002.3–4 at `.cursor/hooks.json` command strings; entry argv/`exitCode` spawn is e2e (later plan), not this container’s unit suite

---

### Deviations

- Spec AC-F002.3 still says “distinct Cursor hook wrapper” and AC-F002.4 still says each `command` is “the corresponding wrapper path only (no extra tokens)”. This plan keeps those criteria and reinterprets the **means**: each registered event identifies itself because its `hooks.json` `command` is already `node .agents/hooks/index.mjs ingest cursor {event}` (a shell string; extra tokens kept). Do not plan distinct `.cmd` wrapper files. Do not plan path-only `.cmd` commands. Matches [`cli.arch.md`](../../arch/cli.arch.md) and the AGENTS.md learning scar.
- Spec status stays `released` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- `.cursor/hooks.json` nests the four event keys under Cursor’s required `"hooks"` object (`"version": 1` at top level), same as F001. e2e should assert `config.hooks` and `config.version`.
- Source harness/event are parsed at argv and then discarded for this spec (not passed into `ingestHook`). Routing that keys off them is out of scope.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.

> last updated: 2026-09-01T09:00:35Z
