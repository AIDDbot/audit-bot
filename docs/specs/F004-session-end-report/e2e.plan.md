---
spec-kind: functional
container: e2e
---
# F004-session-end-report - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional harness and event positionals. Persistence stays F001 and F010/F003: verbatim Event log, Session index rules, append-only Session JSONL log (compact header: `harness` / `event`; `session_id` only on the initial session-start; integer `turn`; numbering is F008; identity key `subagent` per F009), exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation that appends a Session JSONL log record also writes `{session_id}.md` in that day’s folder, produced only from that session’s Session JSONL log after that record is in the file — including when no session-end record is present. Overview `session_id` is always the F001 identifier (filename stem), even when later or non-start JSONL records omit `session_id`. Report labels use JSONL `harness` and `event`. The report groups events into one Markdown subsection per distinct `turn` (no session-wide `## Events` table). Each per-turn table has four columns, in this order: Time, Event, Subagent, Details. Event is JSONL `event`. Subagent is optional: filled whenever that JSONL record has `subagent`, as the **bare name only**. `agent_display_name` stays in the Session JSONL log per F007 when Copilot sends it and stays out of Details and out of the Subagent cell. Details does not repeat `subagent` / `agent_display_name`. Preview is 100 characters. Markdown `{session_id}.md` is unchanged this amend — only the source file is Session JSONL (not `{session_id}.yaml`). An ingest must not read `events.jsonl` or `sessions.json` to build the report. Source arguments are used for the JSONL header only; they do not gate the Session report and are not written onto the Event log line. Cursor registration is unchanged by this F004 amend (six events; F001 / F005 / F006). Do not add a report hook. Do not change `.cursor/hooks.json`. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, F003, F005, F006, F007, F008, F009, or F010. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. Do **not** plan F006 scenarios (stop registration, jsonl `task` mapping table exception); F004.14 / F004.22 / F004.24 may *use* `stop` or `task` as fixtures. F008 is released: ingest numbers turns (prompt-kind → turn 1+). E2e spawn **can** produce `## Turn 1`. Use that where an AC needs a prompt line (AC-F004.19) or a 100-character prompt preview. Do **not** re-test F008 numbering rules as F008 ACs. JSONL persistence of `subagent` on every event is F003 / F009; do **not** re-test F009 mapping preference as F009 ACs. F010 owns format/filename/serialization; do **not** re-test F010 ACs. Production already writes `{session_id}.jsonl` and the report already parses it.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (C001 / F010 amend of F004 e2e; prior plan last updated 2026-09-02T10:40:00Z). Production already writes Session JSONL and the report already reads `{session_id}.jsonl` (F010). This amend retargets leftover YAML-as-source observation. Markdown duration / counts / turns / Subagent / 100-char stay.

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. **Do not break F001–F003 or F005–F010 spawn tests.** Markdown helpers (`sessionReportPath`, `readSessionReport`, `listMdFiles`) already exist. JSONL helpers already exist (F010): `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords`, `listJsonlSessionFiles`. YAML helpers stay on `spawn.ts` until later specs drop them. **F004 redo scenarios must not read yaml** (`readSessionYaml` / `yamlDocuments` / `yamlMapping` / `sessionYamlPath` / `listYamlFiles`). Parse with `jsonlRecords`. Report labels stay `| harness |` and `| event | count |`. Four-column table lookups stay `| Time | Event | Subagent | Details |`. Do **not** add a helpers step. Do **not** change the default `extraArgv` behavior
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F004.11 — …`). **No** title may carry `AC-F004.20`. **No** title may say the report is produced from YAML
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not add or remove Cursor hooks in this plan. Do not spawn Copilot or Claude processes. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names so JSONL (and thus the per-turn table) contains those kinds. F004.14 / F004.22 / F004.24 may spawn `stop` or include Cursor `task` as fixtures; F006 owns stop registration and the `task` mapping-table exception
- When a Session JSONL log (and thus a report) is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F004.13). Payload `session_id` is the F001 identifier; it is **not** present on every JSONL record after F003
- JSONL after F003: the first `sessionStart` / `SessionStart` object for that session has `session_id`; later objects do not. When the first ingest is not session-start (e.g. prompt-only), **no** JSONL object has a `session_id` field. The report overview still shows `session_id` equal to the F001 identifier / filename stem (AC-F004.23). Arrange must match that: do **not** assert `session_id` on every JSONL object
- JSONL after F009: identity on new objects is `subagent` (not `agent_type`), on every event kind when a preferred payload key is present. Copilot `agentDisplayName` maps to `agent_display_name` (F007), **not** to `subagent`. Do **not** re-test F009 preference order. E2e Arrange plants `subagent_type` (Cursor) or `agentName` (Copilot) when a case needs a Subagent cell
- Ingest numbers turns (F008). `sessionStart` (and other non-prompt kinds before the first prompt) land in `## Turn 0`; a `beforeSubmitPrompt` (and later records until the next prompt) land in `## Turn 1`. Use that split as a fixture. Do **not** assert F008’s counting formula. When a case needs a prompt line or a 100-character prompt preview, spawn `sessionStart` then `beforeSubmitPrompt` and read the Turn 1 subsection
- When a case needs “no turn-0 subsection”, spawn a prompt-kind ingest with a session identifier and **no** preceding non-prompt record so the JSONL has no `turn` 0. Assert the report omits `## Turn 0`. That is AC-F004.22, not F008 numbering. That same prompt-only spawn is also the AC-F004.23 case that JSONL omits `session_id`
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify. Planify must not run e2e either. Drop authorizes deleting the matching test file

### Shared store wording

> Copied from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped; this amend reads `turn`. Session report is written after every Session JSONL append. Argv does not gate the report. Subagent cell is the bare `subagent` value (AC-F004.24). Details exclude `subagent` and `agent_display_name` (AC-F004.22).

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated session-record timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- Do **not** merge the Session JSONL log into this file. Do **not** read this file to produce the Session report.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session JSONL log; do not create a Session report.
- Do **not** read this file to produce the Session report.

**Session JSONL log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`

- Always a `.jsonl` file named for the F001 session identifier (F010). One file per distinct identifier for that day.
- One JSON object per line. Append-only. Format, filename, and serialization stay F010.
- Do not write `{session_id}.yaml`. Do not read/migrate/rewrite existing `.yaml`. Do not mix YAML and JSONL in one session.
- Do not merge into `events.jsonl`.
- When the payload has a session identifier: append exactly one JSON object as one new line in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; do not re-read the line just appended to *produce* it). Under `ingest.lock`, read that session’s **existing** Session JSONL log (missing file → empty) to compute `turn` and initial session-start. Do not read the Event log or Session index to determine those values. Do not read `.yaml`.
- When the payload has no session identifier: do not create or append a Session JSONL log.
- Every object is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008 shipped; not a body field). This F004 amend **reads** `turn`. Do not change numbering. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- Body after the header stays F003 / F009 / F007 / F006. After the compact header, `subagent` may appear when a matching payload attribute is present (F009). This report **reads** `subagent` when present.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (payload has a session identifier), after that record is in the file. Do **not** require `event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the Event log payload. Still produce a report when no session-end record is in the file. Argv does not gate the report.
- Produce only from that session’s Session JSONL log (every record, file order, no re-sort). Read `turn` from each JSONL record. Do not read the Event log (`events.jsonl`) or the Session index (`sessions.json`).
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later Session JSONL log append for the same session the same day; do not append a second report.
- Overview: `session_id` = the F001 identifier (filename stem already used for that session); `harness` from the **last** record (the ingest that just ran), not from a session-end record; start = first record `timestamp`; end = last record `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those records’ `event`. Do **not** require `session_id` on every JSONL record. When the first record has `session_id`, it matches; when omitted, still show the F001 identifier. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`. Session overview stays session-level.
- Event-count summary: total JSONL records; count per distinct `event` (first-seen order); table header `event`. Counts stay session-level, not per-turn.
- One Markdown subsection per distinct `turn` that appears, in ascending turn-number order. No session-wide Events table. When no record has `turn` 0, omit a turn-0 subsection; do not invent an empty turn 0. Do not invent missing intermediate turns.
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind record (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s records in file order with four columns in this order: Time, Event, Subagent, Details. Event column is JSONL `event`. Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present). Do not nest subagents.
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind record.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind record `timestamp` (first prompt-kind in that turn’s file-order records if more than one); end = the last record in the file that has `turn: n`. For turn **0**, start = the first record with `turn: 0`; end = the last record with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind record, start = the first record of that turn so Duration still emits.
- Subagent cell: when the record has `subagent`, the cell is **only that field’s value** (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar). Fill the cell for **any** event kind when `subagent` is present. When `subagent` is absent, Subagent is empty. Present values including JSON `null` appear as that value (`null`). `agent_display_name` must **not** appear in the Subagent cell. Do **not** fall back to `agent_type`. Do **not** reconstruct parent→subagent hierarchy. Do **not** copy `subagent` onto later records that omit it.
- Details: remaining normalized body fields from `docs/normalized-fields.md` excluding `session_id` and excluding `subagent` / `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty (`subagent` when present is the Subagent cell, not Details). Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; Copilot persists it in the Session JSONL log when present and it stays out of Details and out of the Subagent cell; `task` still Copilot/Claude-absent (F006); omit absent fields.
- Preview: value longer than **100** characters → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same preview for Details cells, Subagent cells, and the per-turn prompt line. Subagent preview applies to the **bare** name (no `subagent:` prefix budget).
- List subagent start and stop as ordinary chronological rows inside that turn’s table. Do not nest a subagent under a parent, and do not nest further inside a turn.
- When report generation fails: still persist F001/F010/F003, exit 0, no blocking stdout.
- No YAML parsing library. No JSON library (platform `JSON.parse` is allowed). The report must **accept** the Session JSONL log as F010 writes it (one JSON object per line). An ingest must **not** migrate or rewrite old `{session_id}.yaml`. No new CLI command. No new hook registrations. This F004 amend does not change hooks.json. Mixed historical YAML is out of scope.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report. Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). They do **not** gate the Session report (any Session-JSONL-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged by this F004 amend. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [ ] **AC-F004.2** — THE SYSTEM SHALL produce the Session report by reading that session’s Session JSONL log (all records, in file order) and SHALL NOT re-sort those records.
- [ ] **AC-F004.21** — THE SYSTEM SHALL include the total number of JSONL records and a count for each distinct `event` value present in that file, with table header `event`.
- [ ] **AC-F004.22** — THE SYSTEM SHALL include one Markdown subsection per distinct `turn` value present in that Session JSONL log, in ascending turn-number order, and SHALL NOT list every record in a single session-wide Events table; each subsection SHALL include that turn number and a Markdown table of that turn’s records in file order with columns Time, Event, Subagent, and Details in that order, where Time is `timestamp` and Event is `event`; Details SHALL be the remaining normalized body fields for that `event` in [`docs/normalized-fields.md`](../../normalized-fields.md) excluding `session_id` and excluding `subagent` and `agent_display_name`, omitted when absent, and empty when the record has no remaining body fields: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only empty; WHEN no record has `turn` 0, THE SYSTEM SHALL omit a turn-0 subsection.
- [x] **AC-F004.24** — WHEN the document has `subagent`, THE SYSTEM SHALL fill the Subagent cell with only that field’s value (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar); WHEN `subagent` is absent, THE SYSTEM SHALL leave Subagent empty; THE SYSTEM SHALL fill the cell for any event kind when `subagent` is present on that document; THE SYSTEM SHALL NOT show `agent_display_name` in the Subagent cell; THE SYSTEM SHALL NOT reconstruct parent→subagent hierarchy and SHALL NOT copy `subagent` onto later documents that omit it.
- [x] **AC-F004.18** — THE SYSTEM SHALL include in each turn subsection that turn’s duration as zero-padded `HH:MM:SS` elapsed clock time; WHEN turn is **n ≥ 1**, start SHALL be that turn’s prompt-kind document `timestamp` and end SHALL be the last document in the file that has `turn: n`; WHEN turn is **0**, start SHALL be the first document with `turn: 0` and end SHALL be the last document with `turn: 0`; THE SYSTEM SHALL NOT close a turn on `stop`, `agentStop`, `Stop`, `subagentStop`, or `SubagentStop`; WHEN the end timestamp is before the start or they are equal, THE SYSTEM SHALL write duration `00:00:00`.
- [x] **AC-F004.19** — WHEN a turn subsection is for turn **n ≥ 1**, THE SYSTEM SHALL include that turn’s prompt text from the prompt-kind document with that `turn`, using the same 100-character single-line preview rules as Details and Subagent (AC-F004.6); WHEN `prompt` is absent from that document, THE SYSTEM SHALL omit the prompt line; WHEN the subsection is for turn **0**, THE SYSTEM SHALL NOT include a prompt line.
- [x] **AC-F004.6** — WHEN a Details cell, Subagent cell, or per-turn prompt line value has more than 100 characters, THE SYSTEM SHALL show the first 100 characters followed by `...`; WHEN it has 100 or fewer, THE SYSTEM SHALL NOT append an ellipsis; THE SYSTEM SHALL render each preview as a single line (newlines in the source value SHALL become spaces before the limit is applied).
- [x] **AC-F004.7** — THE SYSTEM SHALL list subagent start and stop documents as ordinary rows in that chronological table and SHALL NOT nest them under a parent event.
- [ ] **AC-F004.8** — THE SYSTEM SHALL write the Session report as Markdown with tables (not HTML) at `{session_id}.md` in the same daily folder as that session’s Session JSONL log and Event log.
- [ ] **AC-F004.9** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) when writing a Session report; WHEN report generation fails, THE SYSTEM SHALL still persist as F001 and F010/F003 and SHALL NOT change that exit or stdout behavior.
- [ ] **AC-F004.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies, including no YAML library and no JSON library (platform `JSON.parse` is allowed).
- [x] **AC-F004.11** — THE SYSTEM SHALL NOT read the Event log (JSONL) or the Session index in order to produce the Session report.
- [x] **AC-F004.13** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create a Session report.
- [ ] **AC-F004.14** — WHEN ingest appends a Session JSONL log record (the payload has a session identifier), THE SYSTEM SHALL, in that same invocation after that record is in the file, write a Session report for that session, including WHEN no session-end record (`sessionEnd` / `SessionEnd`) is present in that file.
- [ ] **AC-F004.23** — THE SYSTEM SHALL include in the report `session_id` equal to the F001 identifier (the filename stem / the identifier already used for that session), `harness` from the last record, start time from the first record’s `timestamp`, end time from the last record’s `timestamp`, and duration as zero-padded `HH:MM:SS` elapsed clock time from that first timestamp to that last timestamp regardless of those records’ `event`; THE SYSTEM SHALL NOT require `session_id` on every JSONL record (WHEN the first record has `session_id`, it matches; WHEN omitted, THE SYSTEM SHALL still show the F001 identifier); THE SYSTEM SHALL NOT use Cursor `duration_ms` or any session-end-only field for duration; WHEN the last timestamp is before the first or they are equal, THE SYSTEM SHALL write duration `00:00:00`.
- [ ] **AC-F004.16** — WHEN a later ingest appends another Session JSONL log record for the same session the same day, THE SYSTEM SHALL overwrite `{session_id}.md` from the current Session JSONL log and SHALL NOT append a second report.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F004.1 — Same invocation writes YAML and Session report on session-end positional | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.2 — Report table order matches YAML file order, not timestamp sort | redo | File order stays; source is Session JSONL records via `jsonlRecords`, not YAML documents. Keep four-column header |
| AC-F004.3 — Overview session_id, source_harness from triggering end, start/end/duration | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.4 — Event-count summary: total documents and per-source_event counts | drop | Already deprecated (v0.15.0). Stay drop. Delete `e2e/ac-f004.4-event-count-summary.test.ts` if still present |
| AC-F004.5 — Details are mapped normalized body fields only | drop | Already deprecated (v0.11.0). Stay drop. Matching test already gone |
| AC-F004.17 — One subsection per distinct turn; Details in each turn table | drop | Already deprecated (v0.15.0). Stay drop. Delete `e2e/ac-f004.17-turn-subsections.test.ts` if still present |
| AC-F004.20 — Subagent filled only on subagent start/stop rows | drop | Already deprecated. Stay drop. `e2e/ac-f004.20-subagent-column.test.ts` already gone. No `AC-F004.20` titles |
| AC-F004.21 — Event-count summary: total documents and per-event counts | redo | Counts + `| event | count |` stay. Total is JSONL records, not YAML documents. Drop `yamlDocuments` |
| AC-F004.22 — One subsection per distinct turn; four-column turn tables; Event is YAML `event` | redo | Grouping / Details exclude `subagent` stay. Event column is JSONL `event`. Drop `readSessionYaml`. Do not assert Subagent fill (AC-F004.24) |
| AC-F004.24 — Subagent cell is the bare `subagent` value | keep | Spec AC has no YAML. Test already reads Markdown only. Leave as-is |
| AC-F004.18 — Turn-0 duration is first turn-0 timestamp → last turn-0 timestamp | redo | Duration formula stays. Observation still snapshots YAML timestamps — retarget to `jsonlRecords`. Do not change `Duration: HH:MM:SS` asserts |
| AC-F004.19 — Turn 0 has no Prompt line; turn ≥ 1 Prompt uses 100-character preview | keep | Spec AC has no YAML. Test already reads Markdown only. Leave as-is |
| AC-F004.6 — Preview: 100-character limit, ellipsis, single line | keep | Spec AC has no YAML. Test already reads Markdown only. Leave as-is. Leftover `e2e/ac-f004.6-details-preview-80-chars.test.ts` if present: still drop |
| AC-F004.7 — Subagent start and stop are ordinary chronological rows | redo | Ordinary-row / no-nest Markdown stays. Test still reads `yamlDocuments` / `---`. Retarget to `jsonlRecords`. Do not assert Subagent fill (AC-F004.24) |
| AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML | redo | Folder is session jsonl + `events.jsonl` + md (not `{session_id}.yaml`). Four-column header and no `<table>` stay |
| AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure | redo | Failure fixture (`.md` as directory) stays. Persist assert is Session JSONL (F001/F010), not `{session_id}.yaml` |
| AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies | redo | Smoke spawn stays. Assert no YAML library **and** no JSON library. Session file is `{session_id}.jsonl` |
| AC-F004.11 — Report is produced from YAML only, not Event log or Session index | redo | Spec AC has no YAML (checked). Test file still named yaml-not-jsonl. Keep “do not read `events.jsonl`”. Repath/retitle Session JSONL vs Event log JSONL. Delete the old yaml-not-jsonl path |
| AC-F004.12 — Later same-day sessionEnd overwrites `{session_id}.md` | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.13 — No session identifier: F001 persist, no YAML, no Session report | keep | Spec AC has no YAML. Still: F001 persist, no md; Copilot `sessionId` is not an identifier. `listYamlFiles` empty remains true — do not start reading yaml as the session log |
| AC-F004.14 — Same invocation writes YAML and Session report after any YAML-appending ingest | redo | Report-after-every-session-log-append stays. Source is Session JSONL. Repath `…yaml-and-report…` → `…jsonl-and-report…`. JSONL `event` already. Do not assert `session_id` on the stop-only object |
| AC-F004.15 — Overview session_id, source_harness from last document, start/end/duration | drop | Already deprecated (v0.15.0). Stay drop. Delete `e2e/ac-f004.15-overview-times-and-duration.test.ts` if still present |
| AC-F004.23 — Overview session_id from F001 filename, harness from last document, start/end/duration | redo | Overview `session_id` / `harness` / duration stay. Timestamps from JSONL records, not YAML documents. JSONL may omit `session_id` |
| AC-F004.16 — Later YAML append same session same day overwrites `{session_id}.md` | redo | Overwrite / Turn 0 / Turn 1 row counts still track the session log. Snapshot JSONL record count, not YAML document count |

## Implementation Steps

### Step 1: AC-F004.2 — Report table order matches Session JSONL file order, not timestamp sort
Redo. Several events for one session; each **turn** table’s rows follow JSONL record file order even when payload timestamps would sort differently. Verifies AC-F004.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.2-report-table-file-order.test.ts`
- [ ] Arrange: one fixture; same payload `session_id` `"sess-ac-f004-2"` for every spawn (F001 identifier). Choose Unix-ms `timestamp` values whose host-local `HH:MM:SS` would sort in a **different** order than ingest order (same pattern as `e2e/ac-f003.4-timestamp-hhmmss.test.ts`). Example order: (1) extra argv `["cursor", "sessionStart"]` with a **later** clock time (e.g. 12:00:00); (2) extra argv `["cursor", "beforeSubmitPrompt"]` with an **earlier** clock time (e.g. 10:00:00) and a `prompt`; (3) extra argv `["cursor", "sessionEnd"]` with a middle or later clock time (e.g. 11:00:00) and `reason`. Snapshot JSONL record count and each record’s `timestamp` / `event` via `jsonlRecords` after the last spawn. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`. First JSONL object (sessionStart) has `session_id`; later objects omit it — do **not** assert `session_id` on every object. F008 will put sessionStart in Turn 0 and prompt + sessionEnd in Turn 1 — use that as a fixture; do not assert JSONL `turn` integers as F008 ACs
- [ ] Act: spawn the three ingests in that file order via `spawnIngest` (title includes `AC-F004.2`)
- [ ] Assert: Session JSONL has exactly three records in ingest order (`event` `sessionStart`, `beforeSubmitPrompt`, `sessionEnd`) with the arranged timestamps; `{session_id}.md` exists; the report has `## Turn 0` then `## Turn 1` and does **not** contain `## Events`; the Turn 0 table has one data row (`12:00:00` `sessionStart`); the Turn 1 table has two data rows in **file** order (`10:00:00` `beforeSubmitPrompt`, then `11:00:00` `sessionEnd`) — not sorted by Time; each turn table header is exactly `| Time | Event | Subagent | Details |`; each data row has four cells; Subagent is empty on these rows (no identity key planted) (AC-F004.2)

---

### Step 2: AC-F004.21 — Event-count summary: total JSONL records and per-event counts
Redo. Report includes the number of JSONL records and a breakdown of how many records have each distinct `event` (session-level, not per-turn). Table header is `event`. Verifies AC-F004.21.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.21-event-count-summary.test.ts`
- [ ] Arrange: one fixture; payload `session_id` `"sess-ac-f004-21"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` (with `prompt`); `["cursor", "beforeSubmitPrompt"]` again (repeat kind); `["cursor", "sessionEnd"]` (with `reason`). Four JSONL records; `beforeSubmitPrompt` appears twice. Count-table lookup is `| event | count |`. Drop `yamlDocuments`. Title `AC-F004.21`
- [ ] Act: spawn the four ingests in order via `spawnIngest` (title includes `AC-F004.21`)
- [ ] Assert: Session JSONL has four records (`jsonlRecords`); the report states total record count **4**; the counts table header is exactly `| event | count |` and is **not** `| source_event | count |`; per-`event` breakdown includes `sessionStart` 1, `beforeSubmitPrompt` 2, `sessionEnd` 1 (and no extra kinds) (AC-F004.21)

---

### Step 3: AC-F004.22 — One subsection per distinct turn; four-column turn tables; Details exclude `subagent`
Redo. Spawn several events for one session → report has one `## Turn {n}` per distinct turn that appears, does **not** contain a session-wide `## Events` heading, each subsection table has exactly columns Time, Event, Subagent, Details. Event is JSONL `event`. Details stay as shipped (exclude `subagent` / `agent_display_name`). Same turn-grouping / omit-turn-0 cases. Drop YAML helpers. Keep Details / Subagent values ≤100 characters so truncation is out of this AC (that is AC-F004.6). Subagent **fill rules** are AC-F004.24. Do not assert F008 numbering. Verifies AC-F004.22.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.22-turn-subsections.test.ts`
- [ ] Arrange: isolated fixtures + `CURSOR_PROJECT_DIR`. Keep file `e2e/ac-f004.22-turn-subsections.test.ts` (do **not** delete). Every title stays `AC-F004.22`. Event column values stay the event-name strings; they come from JSONL `event` (`jsonlRecords`). Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping` / helper `yamlEvent`. Do not spawn Copilot or Claude processes. Each payload that must produce JSONL includes a F001 session identifier. Keep values ≤100 characters. Local `eventRows` already looks up `| Time | Event | Subagent | Details |` — keep that. Cases stay the eight shipped cases (several events; Details mapped kinds; Copilot display name not in Details; absent key omitted; present null; header-only; pipe in a cell; omit empty turn 0). Prompt-only spawn: JSONL has no `session_id` field (F003); do **not** fold overview `session_id` here (that is AC-F004.23)
- [ ] Act: spawn each case via `spawnIngest` (do not import `cli/src/**`; do not change `.cursor/hooks.json`)
- [ ] Assert: no `## Events`; each turn table header is exactly `| Time | Event | Subagent | Details |`; Event cells equal JSONL `event`; each data row has four cells; Details use snake_case names in table order; `subagent` / `agent_display_name` do not appear in Details; omitted when absent; empty for sessionStart, agent stop, and header-only; JSON `null` appears; `session_id` not in Details; `|` stays inside one cell; prompt-only spawn omits `## Turn 0` (AC-F004.22)

---

### Step 4: AC-F004.24 — Subagent cell is the bare `subagent` value
Keep. Spec AC has no YAML. Existing `e2e/ac-f004.24-subagent-bare-name.test.ts` already reads Markdown only. Leave as-is. Verifies AC-F004.24.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.24-subagent-bare-name.test.ts`
- [x] Arrange: leave the five shipped cases (start/stop bare name; sessionStart/stop/prompt WITH identity; later row without identity; Copilot slug only; absent identity). Do not start reading yaml
- [x] Act: leave `spawnIngest` as shipped (titles include `AC-F004.24`)
- [x] Assert: leave Subagent cell asserts as shipped (bare name, no prefix, no display name, no inheritance) (AC-F004.24)

---

### Step 5: AC-F004.18 — Turn-0 duration is first turn-0 timestamp → last turn-0 timestamp
Redo observation only. Duration formula stays. With no prompt-kind record, both records stay `turn` 0; turn duration is first turn-0 timestamp → last turn-0 timestamp. Snapshot timestamps from `jsonlRecords`, not YAML. Verifies AC-F004.18.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.18-turn-duration.test.ts`
- [ ] Arrange: isolated fixtures. Payload `timestamp` is Unix-ms so JSONL `HH:MM:SS` is deterministic. Spawn `sessionStart` then `stop` (no prompt) so both records stay turn 0. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`. Cases stay: (1) elapsed all turn 0 → `Duration: 01:01:02`; (2) equal timestamps → `Duration: 00:00:00`. Each title includes `AC-F004.18`
- [ ] Act: spawn each fixture’s ingests in order via `spawnIngest`
- [ ] Assert: each `exitCode === 0`; stdout empty. The Turn 0 subsection contains `Duration: 01:01:02` (case 1) or `Duration: 00:00:00` (case 2). Case 1: that value matches session overview duration (every record is turn 0). Turn table header is `| Time | Event | Subagent | Details |`. Report has `## Turn 0` and no `## Events`. Do not assert F008 numbering (AC-F004.18)

---

### Step 6: AC-F004.19 — Turn 0 has no Prompt line; turn ≥ 1 Prompt uses 100-character preview
Keep. Spec AC has no YAML. Existing file already reads Markdown only. Leave as-is. Verifies AC-F004.19.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.19-turn-prompt.test.ts`
- [x] Arrange: leave the three shipped cases. Do not start reading yaml
- [x] Act: leave `spawnIngest` as shipped
- [x] Assert: leave Prompt-line / 100-char asserts as shipped (AC-F004.19)

---

### Step 7: AC-F004.6 — Preview: 100-character limit, ellipsis, single line
Keep. Spec AC has no YAML. Existing `e2e/ac-f004.6-details-preview-100-chars.test.ts` already reads Markdown only. Leave as-is. Verifies AC-F004.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.6-details-preview-100-chars.test.ts`
    - delete `e2e/ac-f004.6-details-preview-80-chars.test.ts` if still present
- [x] Arrange: leave the four shipped cases. Do not start reading yaml
- [x] Act: leave `spawnIngest` as shipped
- [x] Assert: leave 100-char / ellipsis / single-line asserts as shipped (AC-F004.6)

---

### Step 8: AC-F004.7 — Subagent start and stop are ordinary chronological rows inside the turn table
Redo observation only. sessionStart + subagentStart + subagentStop + sessionEnd → four ordinary rows **inside that turn’s table**; no nesting. Spec AC has no YAML; the test still reads `yamlDocuments` / `---`. Retarget to `jsonlRecords`. Do not assert Subagent fill (AC-F004.24). Verifies AC-F004.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.7-subagent-ordinary-rows.test.ts`
- [ ] Arrange: keep the four-spawn sibling-identifier fixture (`session_id` / `parent_conversation_id` `"sess-ac-f004-7"`). No prompt, so all four records stay in Turn 0. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping` / `startsWith("---")` / leading-space YAML line checks. Snapshot four `jsonlRecords` instead
- [ ] Act: spawn ingest four times in order via `spawnIngest` (title includes `AC-F004.7`)
- [ ] Assert: Session JSONL has four independent objects (no `children` / `events` keys); report has `## Turn 0` and does **not** contain `## Events`; the Turn 0 table has exactly four data rows in file order (`sessionStart`, `subagentStart`, `subagentStop`, `sessionEnd`); each row has four cells; subagent rows are ordinary chronological rows in that turn table, not nested, indented as children, or wrapped under a parent (`subagent` / `children` / `events` / leading spaces that mark a child row) (AC-F004.7)

---

### Step 9: AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML
Redo. File lives in the daily folder next to that session’s Session JSONL log and Event log; content is Markdown tables; `<table>` is absent. Verifies AC-F004.8.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.8-markdown-file-not-html.test.ts`
- [ ] Arrange: isolated fixture; extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f004-8"` and `reason`. Use `sessionReportPath` so the expected path is `{dayFolder}/{session_id}.md`. Drop `sessionYamlPath`. Access `sessionJsonlPath` and `eventsPath` instead. This spawn is not session-start, so JSONL omits `session_id` (F003); do not assert it on the JSONL object. Overview `session_id` is AC-F004.23
- [ ] Act: spawn ingest via `spawnIngest` (title includes `AC-F004.8`)
- [ ] Assert: `{dayFolder}/sess-ac-f004-8.md` exists at that path (same folder as `events.jsonl` and `sess-ac-f004-8.jsonl`); file content includes Markdown table markup (`|`); content includes `| Time | Event | Subagent | Details |` and does **not** include `| Time | Event | Details |`; content does **not** include `<table` or `</table>` (case-insensitive); not HTML (AC-F004.8)

---

### Step 10: AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure
Redo. Normal Session-JSONL-appending ingest: exit 0, stdout empty. Report-failure: pre-create `{session_id}.md` as a **directory** so overwrite fails; still persist Event log + Session JSONL, exit 0, stdout empty. Verifies AC-F004.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.9-observe-only-report-failure.test.ts`
- [ ] Arrange: two isolated fixtures; extra argv `["cursor", "sessionEnd"]`; payload has `session_id` and `reason`. Case A — normal write. Case B — `mkdir` `{dayFolder}/{session_id}.md` (a directory) before spawn so creating/overwriting the report file fails. Pre-create the day folder in case B. Drop `readSessionYaml` / `sessionYamlPath` / `yamlDocuments` / `startsWith("---")`
- [ ] Act: spawn ingest via `spawnIngest` for each case (each title includes `AC-F004.9`)
- [ ] Assert: both `exitCode === 0` and stdout empty. Case A: `{session_id}.md` is a file. Case B: Event log has exactly one parseable object line deep-equal to stdin; Session index includes that `session_id`; `{session_id}.jsonl` exists with exactly one `jsonlRecords` object; the path `{session_id}.md` remains a directory (report write failed); F001/F010 writes were not undone (AC-F004.9)

---

### Step 11: AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies
Redo. Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty, no YAML library, no JSON library, no new binary. Session file is `{session_id}.jsonl`. Verifies AC-F004.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.10-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [ ] Arrange: repo root; load `cli/package.json`. Isolated fixture for the spawn smoke. Drop `readSessionYaml` / `yamlDocuments`. Use `sessionJsonlPath` / `jsonlRecords`. Do not require `dist/audit-bot.exe`. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML or JSON library. Do not register extra Cursor events
- [ ] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionEnd` via `spawnIngest` with a JSON object that has `session_id` (title includes `AC-F004.10`)
- [ ] Assert: `"type": "module"`; `"dependencies": {}` (so no `yaml` / `js-yaml` / other YAML parsing library and no JSON library); `engines.node` is a string that starts with `>=24`; spawn `exitCode === 0`, stdout empty, Event log + Session index + `{session_id}.jsonl` + `{session_id}.md` all present from that existing entry (AC-F004.10)

---

### Step 12: AC-F004.11 — Report is produced from Session JSONL, not Event log or Session index
Redo. Spec AC is checked and names Event log JSONL (no YAML). Existing file is still `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts` and titles “from YAML”. Keep “do not read `events.jsonl`”. Repath and retitle so the contrast is Session JSONL vs Event log JSONL. After writing Session JSONL via ingest, tamper `events.jsonl` and/or `sessions.json` so they disagree with the Session JSONL log; then a later Session-JSONL-appending ingest; the report must match Session JSONL records, not the tampered Event log/index. Verifies AC-F004.11.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.11-report-from-session-jsonl-not-event-log.test.ts`
    - delete `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts`
- [ ] Arrange: one fixture; payload `session_id` `"sess-ac-f004-11"`. New file `e2e/ac-f004.11-report-from-session-jsonl-not-event-log.test.ts`. Delete `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts` (redo authorizes delete of the old path; do **not** keep a title that says YAML). First spawn extra argv `["cursor", "sessionStart"]` with a distinctive `timestamp`. Then **tamper** on disk (do not go through ingest): append an extra JSONL line to `events.jsonl` whose payload would look like another event (e.g. a `beforeSubmitPrompt` with a unique `prompt` `"tampered-from-jsonl"`) and rewrite `sessions.json` to include an extra identifier (e.g. `"tampered-session"`) and/or omit the real id. Then spawn extra argv `["cursor", "sessionEnd"]` with `reason` and a second distinctive `timestamp`. Session JSONL after that has exactly two records (`sessionStart`, `sessionEnd`) — the tampered Event log line was never appended as a Session JSONL record. Snapshot JSONL `event` via `jsonlRecords`. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`. First JSONL object has `session_id`; the sessionEnd object omits it — do **not** require `session_id` on both. Title includes `AC-F004.11` and says Session JSONL, not YAML
- [ ] Act: spawn sessionStart via `spawnIngest`; tamper Event log and index; spawn sessionEnd
- [ ] Assert: Session JSONL still has exactly two records in file order (`event` `sessionStart`, `sessionEnd`); `{session_id}.md` turn table has exactly two data rows (`sessionStart`, `sessionEnd`) and does **not** contain `tampered-from-jsonl` or `tampered-session`; total record count in the report is 2, not 3; overview `session_id` is `"sess-ac-f004-11"` (F001 identifier / filename stem); table header is `| Time | Event | Subagent | Details |` (AC-F004.11)

---

### Step 13: AC-F004.13 — No session identifier: F001 persist, no Session report
Keep. Spec AC has no YAML. Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) → Event log line exists; Session index unchanged; no `{dayFolder}/*.md`. Existing `listYamlFiles` empty / no file named for `sessionId` remains true. Do not start treating yaml as the session log. Verifies AC-F004.13.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.13-no-session-id-no-report.test.ts`
- [x] Arrange: leave the two shipped cases (first use; pre-seeded index). Do not start reading yaml as the report source
- [x] Act: leave `spawnIngest` as shipped
- [x] Assert: leave F001 persist + no md asserts as shipped. `listYamlFiles` empty may stay (new ingests write no yaml). Optional extra: `listJsonlSessionFiles` empty — do not require it if leaving as-is (AC-F004.13)

---

### Step 14: AC-F004.14 — Same invocation writes Session JSONL and Session report after any session-JSONL-appending ingest
Redo. Spawn ingest with a session identifier → F001 persist plus one Session JSONL record and `{session_id}.md` in the dated folder, same process, same invocation, including when no session-end record is in the file. Also still true for `sessionEnd`. Repath the test file. Verifies AC-F004.14.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.14-same-invocation-jsonl-and-report.test.ts`
    - delete `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts`
- [ ] Arrange: isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at each. New file `e2e/ac-f004.14-same-invocation-jsonl-and-report.test.ts`. Delete `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts`. Helper `assertPersistYamlAndReport` → persist JSONL + report: `access(sessionJsonlPath)`, `jsonlRecords` length 1, `access(sessionReportPath)`. Drop `sessionYamlPath` / `readSessionYaml` / `yamlDocuments` / `startsWith("---")`. Read JSONL `event` from the parsed object. Cases stay: (1) `sessionStart` — JSONL object **has** `session_id`; (2) `stop` — JSONL object **omits** `session_id`; (3) `sessionEnd` — still true; JSONL omits `session_id`. Each title includes `AC-F004.14` (no “YAML”)
- [ ] Act: spawn each case via `spawnIngest` (do not import `cli/src/**`)
- [ ] Assert: each case `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` overlay); `{dayFolder}/sessions.json` includes that `session_id`; `{dayFolder}/{session_id}.jsonl` exists with exactly one JSON object; `{dayFolder}/{session_id}.md` exists. Cases 1 and 2: JSONL `event` is not `sessionEnd` / `SessionEnd` (AC-F004.14)

---

### Step 15: AC-F004.23 — Overview session_id from F001 filename, harness from last record, start/end/duration
Redo. Report overview uses `session_id` equal to the F001 identifier / filename stem even when JSONL omits `session_id` on later or non-start records; `harness` from the **last** record (not `source_harness`); start = first JSONL `timestamp`; end = last JSONL `timestamp`; duration zero-padded `HH:MM:SS` first→last regardless of `event`. Must not require sessionEnd. Must not use `duration_ms`. Last-before-first and equal timestamps both yield `00:00:00`. Verifies AC-F004.23.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.23-overview-times-and-duration.test.ts`
- [ ] Arrange: four isolated fixtures. Payload `timestamp` is Unix-ms so JSONL `HH:MM:SS` is deterministic. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`. Parse with `jsonlRecords`. Titles `AC-F004.23` (no `AC-F004.15` title). Cases stay: (1) two harnesses, no sessionEnd, misleading `duration_ms` → overview `harness` `copilot`, duration `01:01:02`; (2) last before first → `00:00:00`; (3) equal timestamps → `00:00:00`; (4) prompt-only, no sessionStart — JSONL has exactly one object; keys do **not** include `session_id`; overview `session_id` equals filename stem `"sess-ac-f004-23-prompt"`
- [ ] Act: spawn each fixture’s ingests in order via `spawnIngest`; last spawn is not session-end
- [ ] Assert: each `exitCode === 0`; stdout empty. Overview contains that `session_id` (F001 identifier / filename stem) even when JSONL omits `session_id` on later or non-start records. Overview has `| harness |` and does **not** have `| source_harness |`. `harness` equals the last JSONL record’s `harness` (case 1: `copilot`; case 4: `cursor`). Start time equals the first JSONL record’s `timestamp`; end time equals the last JSONL record’s `timestamp`; duration is zero-padded `HH:MM:SS`. Case 1: duration `01:01:02` (not a value derived from `duration_ms`); first JSONL object has `session_id`; last object omits it. Cases 2 and 3: duration `00:00:00`. Case 4: JSONL has no `session_id` field; overview `session_id` still equals `"sess-ac-f004-23-prompt"`; duration `00:00:00`. JSONL has no session-end record. Do not reconstruct across days (AC-F004.23)

---

### Step 16: AC-F004.16 — Later Session JSONL append same session same day overwrites `{session_id}.md`
Redo. Two sequential Session-JSONL-appending ingests for the same session the same day (not only a later sessionEnd): `.md` is overwritten (not two reports concatenated); the later report’s table row counts match JSONL record counts per turn. Verifies AC-F004.16.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.16-overwrite-same-day-report.test.ts`
- [ ] Arrange: one fixture; payload `session_id` `"sess-ac-f004-16"`. Sequence stays: `sessionStart`; `beforeSubmitPrompt` with `prompt` `"second-event"`; `stop`. Do **not** use a later `sessionEnd` as the overwrite trigger. Snapshot the `.md` bytes after the first ingest. Snapshot JSONL record count via `jsonlRecords` after each spawn (not `yamlDocuments`). Drop `readSessionYaml`
- [ ] Act: spawn in that order via `spawnIngest` (title includes `AC-F004.16`)
- [ ] Assert: after the first ingest the report exists and Turn 0 has **one** data row matching JSONL record count 1; after the second ingest `{session_id}.md` still exists as a single file; content is **not** the first report concatenated with a second; Turn 0 still has one `sessionStart` row and Turn 1 has one `beforeSubmitPrompt` row including `second-event`; after the third ingest Turn 0 still has one row, Turn 1 has two (`beforeSubmitPrompt`, `stop`), JSONL record count is **3**, and the file is still one report; table header is `| Time | Event | Subagent | Details |` (AC-F004.16)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F003/F008/F010.
- Did not run `node --test e2e/*.test.ts` (planify must not; e2e codify is compile/lint only; `/verify` runs the suite). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F010).
- Copied shared store wording from the sibling [cli.plan.md](./cli.plan.md).
- F008 is released. E2e spawn can produce `## Turn 1`. This plan uses that as a fixture. It does **not** re-test F008 numbering ACs. Do not break F001–F003 or F005–F010 spawn tests.
- F010 owns Session JSONL format/filename/serialization. F009 owns `subagent` persistence. This plan does **not** re-test those ACs. Production already writes JSONL and the report already parses it.
- Markdown duration / counts / turns / Subagent / 100-char stay. Redo is observation: Session JSONL vs Event log, not YAML documents / `{session_id}.yaml`.
- AC-F004.6 / .19 / .24 / .13 are keep (spec AC has no YAML; those tests do not treat yaml as the report source). AC-F004.11 is checked in the spec but the test file still says yaml-not-jsonl — redo repath/retitle; keep “do not read `events.jsonl`”.
- This plan carries **no unit tests** and plans no `cli/test/` work.
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. JSONL helpers already exist (F010). Do not change default `extraArgv`. YAML helpers stay on `e2e/spawn.ts` until all specs drop them. F004 redo tests must not call them.
- JSONL in tests is observed with Node `JSON.parse` via `jsonlRecords`. No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude mapping and `stop` are exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier.
- Do not add or remove Cursor hooks in this plan. This amend does not change `.cursor/hooks.json`.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`. Drop of AC-F004.1 / .3 / .5 / .12 / .4 / .15 / .17 / .20 already authorized deletion of those files (already gone except leftover 80-char preview if present). Redo of AC-F004.11 authorizes deleting `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts` after the new session-jsonl-not-event-log file exists. Redo of AC-F004.14 authorizes deleting `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts` after the jsonl-and-report file exists.

---

> last updated: 2026-09-02T15:55:00Z
