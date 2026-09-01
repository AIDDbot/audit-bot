---
spec-kind: functional
container: e2e
---
# F001-ingest-hook-events - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with one JSON object on stdin; the CLI appends that object as one Event log line and updates that day’s Session index when the payload introduces a new session identifier. Both artifacts live in a date-named folder under the project. Cursor is registered to invoke ingest on `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` only. Failures never block or mutate the agent.

This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (first e2e plan after clean restart):

- No `e2e/` folder yet; no `docs/arch/e2e.arch.md`. [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is a stub
- AGENTS.md verification for this suite, from repo root: `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test`
- Spawn ingest: `node cli/src/index.ts ingest` with stdin JSON. Argv is `ingest` only — no harness, no event hint. Always `exitCode` 0 on ingest. Do not spawn `{repo}/.agents/hooks/index.mjs`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- No runtime deps; Node builtins (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:os`, `node:assert`). Fixture project roots under `{repo}/temp/e2e/` (root `.gitignore` already has `temp`) so tests never write the real `{repo}/temp/audit/`
- Each `node:test` title must carry the AC id (e.g. `AC-F001.1 — …`)
- Do not import `cli/src/**` as SUT

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

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop` only. Each `command` is `.cursor/hooks/ingest.cmd` (polyglot wrapper that runs `node .agents/hooks/index.mjs ingest`). Do not set `failClosed`. Do not register prompt, stop, tool-use, Tab, `workspaceOpen`, or other Cursor events.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F001.1** — WHEN ingest receives a JSON object, THE SYSTEM SHALL append exactly that object as one new line in a `.jsonl` file inside the folder named for the current date.
- [x] **AC-F001.2** — THE SYSTEM SHALL write each Event log line as the event exactly as received and SHALL NOT parse, filter, or trim its fields.
- [x] **AC-F001.3** — WHEN the received event belongs to a session identifier that is not already in that day’s Session index, THE SYSTEM SHALL append that identifier to the `.json` array. WHEN the identifier is already present, THE SYSTEM SHALL NOT add a duplicate.
- [x] **AC-F001.4** — THE SYSTEM SHALL place both the Event log and the Session index in a folder named `YYYY-MM-DD` for the current date, and SHALL create that folder when it does not exist.
- [x] **AC-F001.5** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete JSONL lines and a valid JSON array of unique session identifiers (no torn, concatenated, or duplicated records).
- [x] **AC-F001.6** — THE SYSTEM SHALL provide a Node.js ≥ 24 ESM ingest script with no external dependencies that Cursor can invoke on `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`.
- [x] **AC-F001.7** — WHEN the payload has no session identifier, THE SYSTEM SHALL still append the Event log line and SHALL NOT change the Session index.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| first | | First plan; no prior scenarios to classify |

## Implementation Steps

### Step 1: AC-F001.1 — Append one JSONL line in the dated folder
Spawn ingest with one JSON object on stdin → exactly one new JSON object line in `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl`. Verifies AC-F001.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.1-append-one-line.test.ts`
- [x] Arrange: isolated fixture project under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it; no day folder yet; stdin one JSON object (e.g. Cursor `sessionStart` with `session_id`). Helper `e2e/spawn.ts`: `repoRoot`; `dayFolderName` local `YYYY-MM-DD`; `eventsPath` / `sessionsPath`; `makeFixture`; `readLines` / `parseObject` / `readSessions`; `spawnIngest({ stdin, env })` runs `node cli/src/index.ts ingest` (`process.execPath`, no harness argv, no event hint). Do not import `cli/src/**`
- [x] Act: spawn ingest with that stdin (title includes `AC-F001.1`)
- [x] Assert: `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl` exists (date = host local calendar of the run); exactly one line; that line parses as one JSON object field-identical to the stdin object (`JSON.stringify` of the parsed object, not byte-identical stdin) (AC-F001.1)

---

### Step 2: AC-F001.2 — Event log line is the event exactly as received
Spawn ingest with extra, empty, and unknown-event fields → stored line keeps every key and value; no overlay, no omit, no hook-type filter. Verifies AC-F001.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.2-verbatim-event-fields.test.ts`
- [x] Arrange: fixture + `CURSOR_PROJECT_DIR`; stdin JSON object with extra keys, empty `""` / `[]` / `{}`, nested fields, and an unknown `hook_event_name` (not one of the four Cursor events)
- [x] Act: spawn `node cli/src/index.ts ingest` with that stdin
- [x] Assert: parsed JSONL line deep-equals the stdin object (same keys and values); empty strings/arrays/objects kept; keys `receivedAt`, `harness`, `hookEvent` absent unless they were on stdin; unknown event name still persisted (AC-F001.2)

---

### Step 3: AC-F001.3 — Session index appends new ids and skips duplicates
Spawn ingest for a new session identifier, the same identifier again, then a second identifier → `sessions.json` is a unique first-seen array. Verifies AC-F001.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.3-session-index-unique.test.ts`
- [x] Arrange: fixture + `CURSOR_PROJECT_DIR`; three payloads — (1) `session_id` `"a"`; (2) `session_id` `"a"` again; (3) a different identifier (`conversation_id` `"b"` with no `session_id`, or a new `session_id`)
- [x] Act: spawn ingest three times in order
- [x] Assert: `{dayFolder}/sessions.json` is a JSON array of unique strings in first-seen order (`["a"]` after the first two, then `["a","b"]`); no duplicate of `"a"`; Event log has three complete lines (AC-F001.3)

---

### Step 4: AC-F001.4 — Dated folder holds both artifacts and is created when missing
Spawn ingest against a fixture with no `temp/audit` yet → folder `YYYY-MM-DD` is created and both files live inside it. Verifies AC-F001.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.4-dated-folder.test.ts`
- [x] Arrange: fixture with no `temp/` tree; capture host local `YYYY-MM-DD` immediately before spawn; stdin one JSON object
- [x] Act: spawn ingest
- [x] Assert: `{projectRoot}/temp/audit/{YYYY-MM-DD}/` exists (folder name matches local date, not UTC if they differ); `events.jsonl` and `sessions.json` both inside that folder (`sessions.json` may be `[]` on first use); no undated `{projectRoot}/temp/audit/events.jsonl`; not `os.tmpdir()` / `%TEMP%` / `/tmp` / `cli/temp` as the audit root (AC-F001.4)

---

### Step 5: AC-F001.5 — Repeated and concurrent ingest leave complete unique records
Two overlapping ingest processes (and a sequential repeat) persist complete JSONL lines and a valid unique session-id array. Verifies AC-F001.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.5-concurrent-persist.test.ts`
- [x] Arrange: one fixture; two distinct JSON objects (different `session_id`); helper can start a second child before the first exits
- [x] Act: spawn two `node cli/src/index.ts ingest` children so their writes overlap; also spawn a sequential third with one of the same `session_id` values (repeat)
- [x] Assert: `events.jsonl` has exactly three complete parseable object lines (no torn, concatenated, or interleaved fragments); `sessions.json` parses as a JSON array of unique identifiers (two ids, no duplicate); both concurrent children `exitCode === 0` (AC-F001.5)

---

### Step 6: AC-F001.6 — Node ≥ 24 ESM ingest script Cursor can invoke
Read project hook config and the CLI package: ESM, no runtime deps, engines Node ≥ 24, Cursor subscribed to the four events. Verifies AC-F001.6. Do not spawn ingest unless useful as a smoke; do not import `cli/src/**`.
- Paths:
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
- [x] Arrange: repo root as the project; load `.cursor/hooks.json` and `cli/package.json`
- [x] Act: parse those files (title includes `AC-F001.6`)
- [x] Assert: `cli/package.json` has `"type": "module"`, `"dependencies": {}`, `engines.node` `>=24`; `.cursor/hooks.json` has `"version": 1` and only `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`; each `command` is `.cursor/hooks/ingest.cmd`; `failClosed` unset; no `.claude/settings.json` or `.github/hooks/` ingest config required (AC-F001.6)

---

### Step 7: AC-F001.7 — No session identifier still logs the event and leaves the index
Spawn ingest with a payload that has no session identifier → Event log gains a line; Session index array is unchanged. Verifies AC-F001.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.7-no-session-id.test.ts`
- [x] Arrange: fixture + `CURSOR_PROJECT_DIR`; stdin JSON object with no `session_id`, no `conversation_id`, no `parent_conversation_id` (omit them; do not send Copilot `sessionId` as a stand-in). Two cases: (a) first use of the day folder; (b) day folder pre-seeded with `sessions.json` `["keep-me"]`
- [x] Act: spawn ingest for each case
- [x] Assert: `events.jsonl` has the new parseable object line in both cases; (a) `sessions.json` is `[]`; (b) `sessions.json` remains `["keep-me"]` — no invented identifier, no Copilot `sessionId` appended (AC-F001.7)

## Deviations

- Did not run `node --test e2e/*.test.ts` (codify e2e container: compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint were skipped.
- `e2e/spawn.ts` reuses the `5a4bb49` process-spawn/env/collect pattern. Argv is `ingest` only (no harness/hint). Artifact paths are `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl` and `sessions.json`.
- AC-F001.6 asserts the implemented `.cursor/hooks.json` shape: events nested under `"hooks"`, `version === 1`, exactly the four Cursor keys, command `.cursor/hooks/ingest.cmd`, `failClosed` unset.

---

> last updated: 2026-09-01T07:55:00Z
