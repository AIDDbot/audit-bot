---
spec-kind: functional
container: e2e
---
# F010-session-normalized-jsonl - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional harness and event positionals. Persistence stays F001: verbatim Event log, Session index rules, exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation also appends one normalized JSON object as one new line to `{session_id}.jsonl` in that day’s folder. Positionals feed the compact JSONL header only; they are not written onto the Event log line. Compact header keys stay `harness` / `event`; `session_id` only on the initial session-start object; `subagent` when a matching payload attribute is present. New ingests must not write `{session_id}.yaml`. Existing `{session_id}.yaml` files stay unread and unrewritten. The Session JSONL log is a third artifact — not merged into `events.jsonl`.

This spec owns **format, filename, and serialization** of the session log. Normalized field names, compact-header mapping, omit-absent / present-null, and per-event body tables stay F003 / F009 / F007 / F006 — this e2e plan does not restate those mapping-table ACs. How `turn` is numbered stays F008 (assert `turn` is a JSON number only). How the Markdown report is built stays F004 (ingest may still write `{session_id}.md`; do **not** assert its content). F001 Event log stays the verbatim, day-wide archive. F002 positionals stay.

This spec does not replace F001 or F002. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling `cli.plan.md` is not written this run.

Grounding (first e2e plan for F010):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`) via existing `spawnIngest`. Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. **Do not break F001 or F002 spawn tests.** **Do not change the default `extraArgv` behavior.** Keep existing YAML helpers (`sessionYamlPath`, `readSessionYaml`, `listYamlFiles`, `yamlDocuments`, `yamlMapping`, `yamlRawScalar`, `assertYamlIntegerTurn`) until later specs drop them. Add parallel JSONL helpers: `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords` (split lines + `JSON.parse`), `listJsonlSessionFiles` (day-folder `*.jsonl` excluding `events.jsonl`)
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F010.1 — …`). New files `e2e/ac-f010.*.test.ts`. Do **not** retitle or delete F003–F009 e2e files in this plan (later specs)
- Mapping stays [`docs/normalized-fields.md`](../../normalized-fields.md); do **not** re-test full F003 mapping tables here
- Do not spawn Copilot or Claude processes. Copilot `sessionId` alone is not a F001 session identifier (AC-F010.5)
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers. F010 does **not** change `.cursor/hooks.json`
- Do **not** assert F008 turn numbering (incrementing, prompt-kind counting, or exact `0`). `turn` is a JSON number: `typeof` number after parse, or the serialized token matches `/^-?\d+$/`
- Do **not** assert F004 Markdown content (except that ingest may still write `.md` — optional, unasserted)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). There is no e2e tsconfig/oxlint — typecheck and lint are typically skipped (same as F001–F009)

### Shared store wording

> Sibling `cli.plan.md` is not written yet. Event log, Session index, project root, and day folder stay as F001. Compact-header keys stay `harness` / `event`; `session_id` only on the initial session-start object. The per-session log is JSONL (`{session_id}.jsonl`), not YAML. Concurrency covers the Session JSONL append. Argv still passes harness/event into ingest for the compact header only.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated session-log timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- Do **not** merge the Session JSONL log into this file.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session JSONL log.

**Session JSONL log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`

- Always a `.jsonl` file named for the F001 session identifier (same stem as today’s `{session_id}.yaml`). One file per distinct identifier for that day.
- Each line is one JSON object produced with `JSON.stringify` and read with `JSON.parse`. One new line per Event / per successful ingest that has a session identifier.
- Append-only: do not rewrite, reorder, or restructure previously written lines (first-line bytes stay unchanged after a later append).
- When the payload has a session identifier: append exactly one JSON object in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the object). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing JSONL.
- When the payload has no session identifier: do not create or append a Session JSONL log. Do not create a file named for Copilot `sessionId`.
- Do **not** write `{session_id}.yaml` for new ingests. Do **not** migrate, read, or rewrite existing `{session_id}.yaml` files. Do **not** mix YAML and JSONL in one session: new ingests write JSONL only.
- The Session JSONL log is always a **third artifact** (with the Event log and Session index). Its path is never `events.jsonl`.
- Field names are always snake_case. Compact header fields always exist: `harness`, `event`, `timestamp`, `turn`. Values of `harness` and `event` are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log does not already contain a session-start object. Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object key order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object key order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp`, format that instant. When it does not, generate the clock time at receive. Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008; not a body field). Numbering is F008 — do not assert incrementing here. Do not persist `turn` on the Event log line. Do not rewrite prior lines' `turn`.
- `subagent` after the header when a matching payload attribute is present (F009). Other body fields stay table-driven as F003 / F009 / F007 / F006 — this spec does not restate those mapping ACs.
- Present-null is always JSON `null`. Omit-absent / present-null ownership stays F009 / F003; this spec only serializes that rule as JSON.
- Node builtins only: no YAML library and no JSON library (`JSON.stringify` / `JSON.parse`).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger stays F004 (write/overwrite after every Session JSONL log append). Do **not** assert Markdown content in this plan. Ingest may still write `.md` — optional, unasserted.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) append one complete Session JSONL object line. No torn, concatenated, or invalid JSON; unique identifiers in the index. Same overlap pattern as F001/F003 concurrent tests.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the Session JSONL header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite). Ingest always `exitCode` 0.
- Do **not** add a new CLI command.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Product already registers six events. This F010 plan does **not** change `.cursor/hooks.json`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}`. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn `cli/src/index.ts`, not that artifact.

### Acceptance criteria under test

- [ ] **AC-F010.1** — WHEN ingest receives a JSON object that has a session identifier, THE SYSTEM SHALL, in that same invocation, persist as F001 and SHALL append exactly one JSON object as one new line to `{session_id}.jsonl` inside the folder named for the current date, using the in-memory event (no second process; no re-read of files just written). `{session_id}` SHALL be the F001 session identifier (same stem as today’s `{session_id}.yaml`).
- [ ] **AC-F010.2** — THE SYSTEM SHALL write each Session JSONL line as one JSON object via `JSON.stringify` and SHALL read lines with `JSON.parse`; THE SYSTEM SHALL append only and SHALL NOT rewrite previously written lines; THE SYSTEM SHALL NOT use a YAML library or a JSON library.
- [ ] **AC-F010.3** — THE SYSTEM SHALL NOT write `{session_id}.yaml` for new ingests; THE SYSTEM SHALL NOT migrate, read, or rewrite existing `{session_id}.yaml` files; THE SYSTEM SHALL NOT mix YAML and JSONL in one session (new ingests write JSONL only).
- [ ] **AC-F010.4** — THE SYSTEM SHALL NOT merge the Session JSONL log into F001 `events.jsonl`; THE SYSTEM SHALL keep `events.jsonl` the verbatim, day-wide Event log with no overlay of harness, event, turn, or generated timestamp; THE SYSTEM SHALL keep the Session JSONL log as a third artifact so F004/F008 can read one session without scanning `events.jsonl` or re-deriving harness keys.
- [ ] **AC-F010.5** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create or append a Session JSONL log.
- [ ] **AC-F010.6** — THE SYSTEM SHALL keep field names snake_case; SHALL include compact header fields `harness`, `event`, `timestamp`, and `turn`; SHALL write `session_id` only on the initial session-start object; SHALL include `subagent` when a matching payload attribute is present; SHALL keep other body fields table-driven as F003 / F009 / F007 / F006; THE SYSTEM SHALL serialize present-null as JSON `null`. Mapping, omit-absent, and present-null rules remain those specs.
- [ ] **AC-F010.7** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete JSONL lines under the same lock/concurrency as F001/F003 (no torn, concatenated, or duplicated records).
- [ ] **AC-F010.8** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest with no external dependencies, no new CLI command, F002 positionals unchanged, observe-only exit 0, and no blocking stdout.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| first | | First plan; no prior scenarios to classify |

## Implementation Steps

### Step 0: JSONL helpers on `e2e/spawn.ts`
Add parallel JSONL helpers next to the existing YAML helpers. Keep YAML helpers. Do **not** change `spawnIngest` default `extraArgv` (F001 relies on none). Node builtins only.
- Paths:
    - `e2e/spawn.ts`
- [x] `sessionJsonlPath(projectRoot, sessionId, day?)` → `{dayFolder}/{sessionId}.jsonl`
- [x] `readSessionJsonl(...)` → utf8 file text
- [x] `jsonlRecords(text)` → split non-empty lines + `JSON.parse` each (no JSON library)
- [x] `listJsonlSessionFiles(...)` → day-folder names ending `.jsonl` excluding `events.jsonl`; `ENOENT` → `[]`
- [x] Leave `sessionYamlPath` / `readSessionYaml` / `listYamlFiles` / `yamlDocuments` / `yamlMapping` / `yamlRawScalar` / `assertYamlIntegerTurn` in place
- [x] Do not change `spawnIngest` default extraArgv

---

### Step 1: AC-F010.1 — Same invocation writes Event log, Session index, and one JSONL object line
Spawn ingest once as `ingest cursor sessionStart` with a JSON object that has a session identifier → F001 persist plus exactly one JSON object line in `{session_id}.jsonl` in the dated folder. One process, one invocation. Does not assert header key names or `session_id` on the object (AC-F010.6). Verifies AC-F010.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.1-same-invocation-three-artifacts.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`; stdin one JSON object with `session_id` `"sess-ac-f010-1"`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not change `spawnIngest` default extraArgv
- [x] Act: spawn `node cli/src/index.ts ingest cursor sessionStart` once (title includes `AC-F010.1`)
- [x] Assert: `exitCode === 0`; stdout empty; Event log + Session index + `{session_id}.jsonl` exist; `jsonlRecords` length 1; that record is one JSON object; filename stem is the F001 `session_id` (AC-F010.1). Do not assert `.md` content

---

### Step 2: AC-F010.2 — Each line is one JSON.parse object; append-only (first line bytes unchanged)
Two sequential ingests for the same session identifier → each line `JSON.parse`s to one object; the second append adds a line; the first line’s bytes are unchanged. No YAML/JSON library in e2e (Node `JSON.parse` / `JSON.stringify`). `cli/package.json` `dependencies: {}` lives in AC-F010.8 (do not duplicate). Verifies AC-F010.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.2-append-only-jsonl.test.ts`
- [x] Arrange: isolated fixture; same `session_id` `"sess-ac-f010-2"`; extra argv `["cursor", "sessionStart"]` then `["cursor", "sessionEnd"]`. After the first spawn, snapshot the Session JSONL file bytes (utf8). Reuse `readSessionJsonl` / `jsonlRecords`
- [x] Act: spawn ingest twice in order (each title includes `AC-F010.2`)
- [x] Assert: after first spawn, `jsonlRecords` length 1 and `JSON.parse` of that line is one object; after second, length 2; each line `JSON.parse`s to one object (`typeof` object, not array, not null); file text starts with the first-spawn snapshot (first line bytes unchanged) (AC-F010.2)

---

### Step 3: AC-F010.3 — New ingests write JSONL only; planted YAML is unread and unrewritten
After ingest with a session identifier: `{session_id}.jsonl` exists; `{session_id}.yaml` does **not**. A pre-existing `.yaml` planted in the day folder must remain unread/unrewritten (bytes and mtime unchanged). Verifies AC-F010.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.3-no-yaml-leave-existing.test.ts`
- [x] Arrange: two isolated fixtures; extra argv `["cursor", "sessionStart"]`. Case A — no prior yaml; payload `session_id` `"sess-ac-f010-3-fresh"`. Case B — mkdir the day folder; plant `{session_id}.yaml` with distinctive bytes (e.g. `source_harness: planted`); `utimes` to a past mtime so a rewrite would bump it; snapshot bytes + `mtimeMs`; payload `session_id` `"sess-ac-f010-3-planted"`. Reuse `sessionYamlPath` / `sessionJsonlPath` / `listYamlFiles`. Do not import `cli/src/**`
- [x] Act: spawn ingest for each case (each title includes `AC-F010.3`)
- [x] Assert: both `exitCode === 0`; stdout empty; `{session_id}.jsonl` exists with `jsonlRecords` length 1. Case A: `{session_id}.yaml` does not exist; `listYamlFiles` is `[]`. Case B: planted yaml bytes and `mtimeMs` unchanged; ingest did not rewrite or migrate it; session log is JSONL only (not mixed into the yaml) (AC-F010.3)

---

### Step 4: AC-F010.4 — Event log line deep-equals stdin; Session JSONL is a third artifact
`events.jsonl` line deep-equals stdin (no harness / event / turn / generated timestamp overlay). Session file is a third artifact (not the same path as `events.jsonl`). Verifies AC-F010.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.4-events-verbatim-third-artifact.test.ts`
- [x] Arrange: isolated fixture; extra argv `["cursor", "sessionStart"]`; payload with `session_id` `"sess-ac-f010-4"` and extras (`hook_event_name`, nested fields) so an overlay would be visible. Reuse `eventsPath` / `sessionJsonlPath` / `readLines` / `parseObject`
- [x] Act: spawn ingest once (title includes `AC-F010.4`)
- [x] Assert: `exitCode === 0`; stdout empty; Event log has exactly one line that `deepEqual`s the stdin object; keys `harness`, `event`, `turn`, `timestamp` absent unless they were on stdin; `sessionJsonlPath` exists and `path.resolve` differs from `eventsPath`; Session index includes the identifier (AC-F010.4). Do not assert `.md` content

---

### Step 5: AC-F010.5 — Copilot sessionId only: Event log written; no Session JSONL
Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) → Event log line exists; Session index unchanged; no `{session_id}.jsonl`; no file named for `sessionId`. Verifies AC-F010.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.5-no-session-id-no-jsonl.test.ts`
- [x] Arrange: extra argv `["copilot", "sessionStart"]`; payload has `sessionId` `"copilot-sess-not-f001"` only (no `session_id` / `conversation_id` / `parent_conversation_id`). First-use and pre-seeded index cases (mirror `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`). Reuse `listJsonlSessionFiles` / `sessionJsonlPath`
- [x] Act: spawn ingest for each case (each title includes `AC-F010.5`)
- [x] Assert: Event log persisted (`deepEqual` stdin); Session index unchanged (`[]` or `["keep-me"]`); `listJsonlSessionFiles` is `[]`; `access` of `sessionJsonlPath(..., payload.sessionId)` rejects; no file named for `sessionId` (AC-F010.5)

---

### Step 6: AC-F010.6 — Compact snake_case header; session_id only on initial sessionStart; subagent; JSON null
Compact header keys snake_case. Initial sessionStart has `session_id` then `harness`, `event`, `timestamp`, `turn` (JSON number). Later/other omits `session_id`. `subagent` when payload has `subagent_type`. Present null → JSON `null`. Do **not** re-test full F003 mapping tables. Do **not** assert F008 numbering. Verifies AC-F010.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.6-compact-header-jsonl.test.ts`
- [x] Arrange: isolated fixtures. Parse with `jsonlRecords` then `Object.keys` (insertion order). `turn`: `typeof === "number"` after parse (or serialized token `/^-?\d+$/`). Cases (each title includes `AC-F010.6`):
    1. Initial Cursor `sessionStart` — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f010-6-start"`
    2. Later event omits — after case 1’s file exists, spawn `["cursor", "sessionEnd"]` for the same identifier (snapshot first-line bytes before the append)
    3. Other (first event is not session-start) — extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f010-6-other"` (no prior JSONL)
    4. `subagent` when `subagent_type` present — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f010-6-sub"`, `subagent_type` `"explore"`
    5. Present null — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f010-6-null"`, `subagent_type` `null`
    Do not import `cli/src/**`. Do not change `spawnIngest` default extraArgv. Do not add mapping-table cases (`reason` / `prompt` / `task` table order)
- [x] Act: spawn each case (each title includes `AC-F010.6`)
- [x] Assert: all `exitCode === 0`; stdout empty; keys snake_case (no `source_harness` / `source_event` / `hookEvent`). Case 1: first five keys `session_id`, `harness`, `event`, `timestamp`, `turn`; `session_id` equals the filename stem; `turn` is a JSON number. Case 2: first line bytes unchanged; second object omits `session_id`; first four keys `harness`, `event`, `timestamp`, `turn`; `turn` is a JSON number. Case 3: one object; no `session_id` key; first four keys `harness`, `event`, `timestamp`, `turn`. Case 4: `subagent` is `"explore"` after the compact header. Case 5: key `subagent` is present and the value is JSON `null` (`=== null`, not the string `"null"`, not omitted) (AC-F010.6)

---

### Step 7: AC-F010.7 — Overlapping concurrent ingests: complete JSONL lines; Event log and index stay valid
Two overlapping ingest processes plus a sequential repeat → complete Session JSONL lines (each `JSON.parse`s); Event log and Session index stay valid as F001. Same overlap pattern as `e2e/ac-f001.5-concurrent-persist.test.ts` / `e2e/ac-f003.9-concurrent-yaml-complete.test.ts`. Verifies AC-F010.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.7-concurrent-jsonl-complete.test.ts`
- [x] Arrange: one fixture; payloads `concurrent-a` (`sessionStart`) / `concurrent-b` (`sessionEnd`); `Promise.all` overlap then sequential repeat of A. Extra argv matching each event. Reuse `jsonlRecords` / `readLines` / `readSessions`. Do not import `cli/src/**`
- [x] Act: spawn two children so their writes overlap (`Promise.all`); then spawn a sequential third with payload A (title includes `AC-F010.7`)
- [x] Assert: all three `exitCode === 0` and stdout empty; `events.jsonl` has exactly three complete parseable object lines (no torn, concatenated, or interleaved fragments); `sessions.json` is a JSON array of unique identifiers (two ids, no duplicate of `"concurrent-a"`); `concurrent-a.jsonl` has exactly two complete `JSON.parse`able object lines and `concurrent-b.jsonl` has exactly one; every session-log line `JSON.parse`s to one object (AC-F010.7)

---

### Step 8: AC-F010.8 — Existing Node ESM ingest, no extra runtime dependencies, no new command
Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty (no YAML/JSON library), no new command, observe-only exit 0 empty stdout. Verifies AC-F010.8.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f010.8-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [x] Arrange: load `cli/package.json`; isolated fixture for the spawn smoke. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML or JSON library. Do not add a new CLI command. Do not change `spawnIngest` default extraArgv
- [x] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionStart` (title includes `AC-F010.8`)
- [x] Assert: `"type": "module"`; `"dependencies": {}`; `engines.node` starts with `>=24`; spawn `exitCode === 0`; stdout empty; Event log + Session index + `{session_id}.jsonl` present (existing `ingest` command; no new binary) (AC-F010.8)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md). Sibling `cli.plan.md` is not written this run.
- Did not run `node --test e2e/*.test.ts` (planify must not; e2e codify: compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F009).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. YAML helpers stay; JSONL helpers are added in parallel.
- JSONL in tests is observed with Node `JSON.parse` / `JSON.stringify` (split lines). No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot `sessionId` is not a F001 session identifier.
- Do not change `.cursor/hooks.json`. Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- How `turn` is numbered is F008. Assert JSON number only (`typeof` number after parse, or `/^-?\d+$/` on the serialized token). Do not assert exact `0`, incrementing, or prompt-kind counting.
- Do not assert F004 Markdown content. Ingest may still write `{session_id}.md` — optional, unasserted.
- Do not re-test full F003 mapping tables (header/body field catalogs stay F003 / F009 / F007 / F006).
- Do not retitle or delete F003–F009 e2e files in this plan (later specs).
- Left spec status `pending` (`cli.plan.md` does not exist; do not change `spec.md`).
- Did not write `cli.plan.md`. Did not edit `spec.md`.
- Codify: did not run `node --test e2e/*.test.ts`; no e2e tsconfig/oxlint so typecheck and lint were skipped. Spec status was already `in-progress` (sibling cli). Did not change `spawnIngest` default extraArgv. Did not retitle or delete F003–F009 e2e files.

---

> last updated: 2026-09-02T15:04:02Z
