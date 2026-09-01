---
spec-kind: functional
container: e2e
---
# F002-ingest-source-args - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals after `ingest`. Persistence stays F001: verbatim Event log, Session index rules, exit 0, no blocking stdout. Source arguments are not written onto the stored line. Each of the four Cursor events’ `hooks.json` `command` is already `node .agents/hooks/index.mjs ingest cursor {event}` (shell string; extra tokens kept). Do not add `.cmd` wrappers.

This spec does not replace F001. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (F002 e2e shipped 0.6.0 with `.cmd` wrappers; this is a replan after the Cursor-registration learning scar — do not redo persist; do not revive wrappers):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid because AC-F002.2 says ingest without positionals still persists as F001. **Do not break F001 spawn tests.** Do not change the helper in this replan
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F002.1 — …`)
- `e2e/ac-f002.1-source-positionals-persist.test.ts` and `e2e/ac-f002.2-optional-positionals-not-unknown.test.ts` already spawn with extra argv and match current architecture — keep
- `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` still reads `{event}.cmd` — stale; redo against `hooks.json` command strings
- `e2e/ac-f002.4-register-wrapper-commands.test.ts` still asserts path-only `.cursor/hooks/{event}.cmd` — stale; redo
- `e2e/ac-f001.6-hook-esm-script.test.ts` still asserts `{event}.cmd` commands — redo so F001.6 stays green after F002 registration. Keep the file and AC-F001.6 titles
- `.cursor/hooks.json` already has `command`: `node .agents/hooks/index.mjs ingest cursor {event}`. `.cursor/hooks/*.cmd` are **absent**. Do not add them back
- Architecture is current. [`system.arch.md`](../../arch/system.arch.md) and [`cli.arch.md`](../../arch/cli.arch.md) already document the node shell string with no `.cmd` wrappers. Spec AC-F002.3/4 text still says “wrapper” / “path-only command”; this plan keeps those criteria and reinterprets the **means** (see Deviations). Do not amend architecture here
- Codify of e2e: compile/lint only; do not run `node --test e2e/*.test.ts` in this container’s codify

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, day folder, and concurrency are unchanged from F001. Only **Argv / stdin / stdout** and **Cursor registration** differ.

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

### Acceptance criteria under test

- [x] **AC-F002.1** — WHEN the CLI is invoked as `ingest` with source harness and source event positionals and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules, exit 0) and SHALL NOT add harness or event fields to the stored line.
- [x] **AC-F002.2** — WHEN the CLI is invoked as `ingest` with neither positional, or with only one of the two, THE SYSTEM SHALL persist as F001 (verbatim Event log, exit 0) and SHALL NOT treat the invocation as an unknown command.
- [ ] **AC-F002.3** — THE SYSTEM SHALL provide a distinct Cursor hook wrapper for each of `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` that invokes ingest with source harness `cursor` and source event equal to that hook’s event name.
- [ ] **AC-F002.4** — THE SYSTEM SHALL register those wrappers in `.cursor/hooks.json` so each of the four events has its own `command` that is the corresponding wrapper path only (no extra tokens).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| Step 1: AC-F002.1 — Persist with both source positionals, no overlay | keep | Spawn `ingest cursor sessionStart` already persists verbatim with no overlay |
| Step 2: AC-F002.2 — Neither or only-one positional still persists; not unknown | keep | Neither / harness-only already persist and are not unknown |
| Step 3: AC-F002.3 — Distinct wrapper per Cursor event | redo | Stop reading `{event}.cmd`. Assert each `hooks.json` `command` includes `ingest cursor {event}` |
| Step 4: AC-F002.4 — Register wrappers as path-only commands | redo | Stop asserting path-only `.cmd`. Assert each `command` equals `node .agents/hooks/index.mjs ingest cursor {event}` |
| Step 5: Update AC-F001.6 command assertion for per-event wrappers | redo | Still asserts `{event}.cmd`. Rewrite to the node shell string; keep AC-F001.6 titles; do not drop the file |

## Implementation Steps

### Step 1: AC-F002.1 — Persist with both source positionals, no overlay
Spawn ingest as `ingest cursor sessionStart` with one JSON object on stdin → F001 persist (verbatim Event log line, Session index rules, exit 0). Stored line does not gain harness or event fields from argv. Verifies AC-F002.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f002.1-source-positionals-persist.test.ts`
- [x] Arrange: extend `spawnIngest` with optional extra argv after `"ingest"` (e.g. `extraArgv?: string[]`); default none so existing F001 calls stay `["ingest"]` only. Isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it; stdin one JSON object (Cursor `sessionStart` with `session_id`). Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`
- [x] Act: spawn `node cli/src/index.ts ingest cursor sessionStart` with that stdin (title includes `AC-F002.1`)
- [x] Assert: `exitCode === 0`; stdout empty; `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (`JSON.stringify` of the parsed object); keys `harness` and `hookEvent` absent unless they were on stdin; `{dayFolder}/sessions.json` is a JSON array that includes the payload’s session identifier (AC-F002.1)

---

### Step 2: AC-F002.2 — Neither or only-one positional still persists; not unknown
Spawn ingest with neither source positional, and again with only one of the two → F001 persist (verbatim Event log, exit 0). Neither invocation is an unknown command. Verifies AC-F002.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f002.2-optional-positionals-not-unknown.test.ts`
- [x] Arrange: two isolated fixtures + `CURSOR_PROJECT_DIR`; stdin one JSON object per case. Case A — neither positional: `spawnIngest({ stdin, env })` with no extra argv (same as F001). Case B — only-one positional: extra argv `["cursor"]` (harness only; no source event). Positionals are ordered, so “event without harness” is not a distinct argv shape
- [x] Act: spawn both cases (each title includes `AC-F002.2`)
- [x] Assert: both `exitCode === 0`; both stdout empty; neither stderr is the usage message `usage: cli-node ingest` (not unknown command); each Event log has exactly one line whose parsed object deep-equals that case’s stdin payload; no added `harness` / `hookEvent` keys (AC-F002.2)

---

### Step 3: AC-F002.3 — Each registered event identifies itself on the command string
Parse `.cursor/hooks.json` (do not execute wrappers; do not spawn ingest). Each of the four events’ `command` includes `ingest cursor {event}` with that event’s name. Not a `.cmd` wrapper file. Verifies AC-F002.3.
- Paths:
    - `.cursor/hooks.json`
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts`
- [ ] Arrange: repo root as the project; load `.cursor/hooks.json`. Do not spawn ingest. Do not import `cli/src/**`. Do not read or require `.cursor/hooks/{event}.cmd`
- [ ] Act: parse the file (title includes `AC-F002.3`)
- [ ] Assert: each of `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` has a `command` that includes `ingest cursor {event}` with that event’s name (AC-F002.3)

---

### Step 4: AC-F002.4 — Register shell commands with extra tokens kept
Parse `.cursor/hooks.json`: each of the four events has its own `command` equal to `node .agents/hooks/index.mjs ingest cursor {event}` (shell string; extra tokens kept). Not a path-only `.cmd`. Verifies AC-F002.4.
- Paths:
    - `.cursor/hooks.json`
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts`
- [ ] Arrange: repo root as the project; load `.cursor/hooks.json`. Do not spawn ingest. Do not import `cli/src/**`. Do not add `.cmd` wrappers. Learning scar: extra tokens after `node … index.mjs` are kept
- [ ] Act: parse the file (title includes `AC-F002.4`)
- [ ] Assert: `"version": 1`; events nested under `config.hooks`; keys `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` only; each entry `command` equals `node .agents/hooks/index.mjs ingest cursor {event}` (both positionals already filled; extra tokens on the shell string); `.cursor/hooks/{event}.cmd` and `.cursor/hooks/ingest.cmd` are absent; `failClosed` unset (AC-F002.4)

---

### Step 5: Update AC-F001.6 command assertion for shell commands
F001.6 will go red after F002 registration unless its `command` assertion matches the node shell string. Keep the test file and its other assertions. Does not add a new F002 AC.
- Paths:
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
- [ ] Arrange: keep `e2e/ac-f001.6-hook-esm-script.test.ts`; do not drop it; do not rename its AC-F001.6 titles
- [ ] Act: change only the `command` assertion (still parse `.cursor/hooks.json` and `cli/package.json`)
- [ ] Assert: each of the four events’ `command` equals `node .agents/hooks/index.mjs ingest cursor {event}`; keep package ESM (`"type": "module"`), `"dependencies": {}`, `engines.node` `>=24`, exactly the four events, `version === 1`, `failClosed` unset (AC-F001.6)

## Deviations

- Spec AC-F002.3 still says “distinct Cursor hook wrapper” and AC-F002.4 still says each `command` is “the corresponding wrapper path only (no extra tokens)”. This plan keeps those criteria and reinterprets the **means**: each registered event identifies itself because its `hooks.json` `command` is already `node .agents/hooks/index.mjs ingest cursor {event}` (a shell string; extra tokens kept). Do not plan distinct `.cmd` wrapper files. Do not plan path-only `.cmd` commands. Matches [`cli.arch.md`](../../arch/cli.arch.md), [`system.arch.md`](../../arch/system.arch.md), and the AGENTS.md learning scar.
- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md.
- `.cursor/hooks.json` nests the four event keys under Cursor’s required `"hooks"` object (`"version": 1` at top level), same as F001. Assert `config.hooks` and `config.version`.
- Did not run `node --test e2e/*.test.ts` (codify e2e container: compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint were skipped (same as F001).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This replan does not change the helper.
- Source harness/event are invocation inputs only (not on the Event log line). Routing that keys off them is out of scope.

---

> last updated: 2026-09-01T09:04:34Z
