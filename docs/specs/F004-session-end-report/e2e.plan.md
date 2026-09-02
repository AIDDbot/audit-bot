---
spec-kind: functional
container: e2e
---
# F004-session-end-report - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional harness and event positionals. Persistence stays F001 and F003: verbatim Event log, Session index rules, append-only Session YAML log (compact header: `harness` / `event`; `session_id` only on the initial session-start; integer `turn`; numbering is F008, released 0.14.0; identity key `subagent` per F009, not `agent_type`), exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation that appends a Session YAML log document also writes `{session_id}.md` in that day’s folder, produced only from that session’s Session YAML log after that document is in the file — including when no session-end document is present. Overview `session_id` is always the F001 identifier (filename stem), even when later or non-start YAML documents omit `session_id`. Report labels use YAML `harness` and `event` (not `source_harness` / `source_event`). The report groups events into one Markdown subsection per distinct `turn` (no session-wide `## Events` table). Each per-turn table has four columns, in this order: Time, Event, Subagent, Details. Event is YAML `event`. Subagent is optional: filled whenever that YAML document has `subagent`, as the **bare name only** (no `agent_type:`, `subagent:`, `agent_display_name:` prefix) — any event kind, not only start/stop (F009; AC-F004.24). `agent_display_name` stays in YAML per F007 when Copilot sends it and stays out of Details and out of the Subagent cell. Details does not repeat `subagent` / `agent_display_name`. Preview is 100 characters. Source arguments are used for the YAML header only; they do not gate the Session report and are not written onto the Event log line. Cursor registration is unchanged by this F004 amend (six events; F001 / F005 / F006). Do not add a report hook. Do not change `.cursor/hooks.json`. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, F003, F005, F006, F007, F008, or F009. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. Do **not** plan F006 scenarios (stop registration, yaml `task` mapping table exception); F004.14 / F004.22 / F004.24 may *use* `stop` or `task` as fixtures. F008 is released (0.14.0): ingest numbers turns (prompt-kind → turn 1+). E2e spawn **can** produce `## Turn 1`. Use that where an AC needs a prompt line (AC-F004.19) or a 100-character prompt preview. Do **not** re-test F008 numbering rules as F008 ACs. YAML persistence of `subagent` on every event is F003 / F009; do **not** re-test F009 mapping preference as F009 ACs.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (amend/replan of the F004 e2e plan after F009 — Subagent cell is the bare `subagent` value; drop AC-F004.20; redo AC-F004.22 Details exclusion; add AC-F004.24):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. F002, F003, F005, F006, F007, F008, and F009 spawn tests also remain valid. **Do not break F001–F003 or F005–F009 spawn tests.** Markdown helpers (`sessionReportPath`, `readSessionReport`, `listMdFiles`) and YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`, `listYamlFiles`) already exist; `turnSubsection` already locates a `## Turn {n}` subsection. Extend only if needed; do not change the default `extraArgv` behavior. YAML lookups stay `values.event` / `values.harness`. Report labels stay `| harness |` and `| event | count |`. Four-column table lookups stay `| Time | Event | Subagent | Details |`
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F004.24 — …`). **No** title may carry `AC-F004.20`
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not add or remove Cursor hooks in this plan. Do not spawn Copilot or Claude processes. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names so YAML (and thus the per-turn table) contains those kinds. F004.14 / F004.22 / F004.24 may spawn `stop` or include Cursor `task` as fixtures; F006 owns stop registration and the `task` mapping-table exception
- When a YAML file (and thus a report) is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F004.13). Payload `session_id` is the F001 identifier; it is **not** present on every YAML document after F003
- YAML after F003: the first `sessionStart` / `SessionStart` document for that session has `session_id`; later documents do not. When the first ingest is not session-start (e.g. prompt-only), **no** YAML document has a `session_id` field. The report overview still shows `session_id` equal to the F001 identifier / filename stem (AC-F004.23). Arrange must match that: do **not** assert `session_id` on every YAML document
- YAML after F009: identity on new documents is `subagent` (not `agent_type`), on every event kind when a preferred payload key is present (`subagent_type` > `agent_type` > `agentType` > `agentName`). Copilot `agentDisplayName` maps to `agent_display_name` (F007), **not** to `subagent`. Do **not** re-test F009 preference order. E2e Arrange plants `subagent_type` (Cursor) or `agentName` (Copilot) when a case needs a Subagent cell
- Ingest numbers turns (F008). `sessionStart` (and other non-prompt kinds before the first prompt) land in `## Turn 0`; a `beforeSubmitPrompt` (and later docs until the next prompt) land in `## Turn 1`. Use that split as a fixture. Do **not** assert F008’s counting formula, unquoted YAML integer `turn`, or prompt-kind aliases as F008 ACs. When a case needs a prompt line or a 100-character prompt preview, spawn `sessionStart` then `beforeSubmitPrompt` and read the Turn 1 subsection
- When a case needs “no turn-0 subsection”, spawn a prompt-kind ingest with a session identifier and **no** preceding non-prompt document so the YAML has no `turn` 0. Assert the report omits `## Turn 0`. That is AC-F004.22, not F008 numbering. That same prompt-only spawn is also the AC-F004.23 case that YAML omits `session_id`
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify. Drop authorizes deleting the matching test file

### Shared store wording

> Session YAML log compact header copied from F003 (spec F003: `harness` / `event`; `session_id` only on the initial session-start) so e2e Arrange matches what ingest writes. Identity key is F009 `subagent` (not `agent_type`). Event log, Session index, project root, and day folder stay as F001/F003. F008 numbering is already shipped (0.14.0); this amend reads `turn`. Session report is written after every YAML append. Argv does not gate the report. Report labels follow YAML `harness` and `event`. Subagent cell is the bare `subagent` value (AC-F004.24).

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session YAML log; do not create a Session report.

**Session YAML log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml`

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day. The filename stem is always the F001 identifier.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values and whether they contain `session_id`.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent. Do not copy `subagent` onto later documents that omit it.
- Compact header keys on every new document: `harness` and `event` (not `source_harness` or `source_event`). Equal to the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. Do not write them onto the Event log line.
- `session_id` on the YAML document **only** for the **initial session-start**: `event` is `sessionStart` or `SessionStart` **and** that session’s Session YAML log does not already contain a session-start document. When present, `session_id` is the F001 identifier (same as the filename stem).
- On every other document (prompt, stop, subagent, sessionEnd, a later or duplicate sessionStart, header-only unmapped, and any document when the first event for the session is not session-start), omit `session_id`. When the first event for a session is not session-start, **no** document gets `session_id`. Do not rewrite prior documents to strip or add `session_id`.
- Initial session-start (has `session_id`) starts with these five fields, in this order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document (no `session_id`) starts with these four fields, in this order: `harness`, `event`, `timestamp`, `turn`.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008 shipped 0.14.0; not a body field). This F004 amend **reads** `turn`. Do not change numbering. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: F009 `subagent` immediately after the compact header when a preferred payload key is present (any event kind, including header-only); then only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the filename, and on the initial session-start header when present), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity YAML key is `subagent`, not `agent_type`.
- Event kinds: session start; session end; subagent start; subagent stop; user prompt; agent stop (names in `docs/events-args.md`).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields only — plus `subagent` when a preferred identity key is present (F009). Five header fields (`session_id`, `harness`, `event`, `timestamp`, `turn`) when it is the initial session-start; four fields (`harness`, `event`, `timestamp`, `turn`) otherwise.
- Node builtins only: no YAML library. Do not migrate or rewrite old YAML that still has `source_harness` / `source_event` / per-document `session_id` / `agent_type`. Reading mixed historical files is out of scope.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (payload has a session identifier), after that document is in the file. Do **not** require `event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the JSONL payload. Still produce a report when no session-end document is in the file. Argv does not gate the report.
- Produce only from that session’s Session YAML log (every document, file order, no re-sort). Read `turn` from each YAML document. Do not read the Event log or Session index.
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later YAML append for the same session the same day; do not append a second report.
- Overview: `session_id` always the F001 identifier / filename stem already used for that session. Do **not** require `session_id` on every YAML document. When the first document has `session_id`, it matches; when omitted, still show the F001 identifier. `harness` from the **last** document (the ingest that just ran), not `source_harness`, not from a session-end document. Start = first document `timestamp`; end = last document `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those documents’ `event`. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`. Session overview stays session-level.
- Event-count summary: total YAML documents; count per distinct `event` (first-seen order). Table header `| event | count |` (not `| source_event | count |`). Counts stay session-level, not per-turn.
- One Markdown subsection per distinct `turn` that appears, in ascending turn-number order. No session-wide Events table. When no document has `turn` 0, omit a turn-0 subsection; do not invent an empty turn 0. Do not invent missing intermediate turns.
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind document (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s documents in file order with four columns in this order: Time, Event, Subagent, Details. Time is `timestamp`. Event is YAML `event` (not `source_event`). Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present). Do not nest subagents.
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind document.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind document `timestamp` (first prompt-kind in that turn’s file-order docs if more than one); end = the last document in the file that has `turn: n`. For turn **0**, start = the first document with `turn: 0`; end = the last document with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind document, start = the first document of that turn so Duration still emits.
- Subagent cell: filled **whenever** that YAML document has `subagent`, for **any** event kind (session start, session end, subagent start/stop, user prompt, agent stop, header-only). The cell is **only** that field’s value (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar). Present values including YAML `null` appear as that value. When `subagent` is absent, Subagent is empty. `agent_display_name` must **not** appear in the Subagent cell (it stays in YAML per F007 when Copilot sends it). Do **not** reconstruct parent→subagent hierarchy. Do **not** copy `subagent` onto later rows whose document omits it.
- Details: remaining normalized body fields from `docs/normalized-fields.md` excluding `session_id` and excluding `subagent` / `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty (`subagent` when present is the Subagent cell, not Details). Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; Copilot persists it in YAML when present and it stays out of Details and out of the Subagent cell; `task` still Copilot/Claude-absent (F006); omit absent fields.
- Preview: value longer than **100** characters → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same preview for Details cells, Subagent cells, and the per-turn prompt line.
- List subagent start and stop as ordinary chronological rows inside that turn’s table. Do not nest a subagent under a parent, and do not nest further inside a turn.
- When report generation fails: still persist F001/F003, exit 0, no blocking stdout.
- No YAML parsing library. No new CLI command. No new hook registrations. This F004 amend does not change hooks.json. Do not migrate mixed historical YAML.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After persist returns, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = harness. Optional `process.argv[4]` = event.
- Harness and event are F002 invocation inputs for the YAML header (`harness` / `event`). They do **not** gate the Session report (any YAML-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged by this F004 amend. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F004.2** — THE SYSTEM SHALL produce the Session report by reading that session’s Session YAML log (all documents, in file order) and SHALL NOT re-sort those documents.
- [x] **AC-F004.21** — THE SYSTEM SHALL include the total number of YAML documents and a count for each distinct `event` value present in that file, with table header `event`.
- [ ] **AC-F004.22** — THE SYSTEM SHALL include one Markdown subsection per distinct `turn` value present in that Session YAML log, in ascending turn-number order, and SHALL NOT list every document in a single session-wide Events table; each subsection SHALL include that turn number and a Markdown table of that turn’s documents in file order with columns Time, Event, Subagent, and Details in that order, where Time is `timestamp` and Event is `event`; Details SHALL be the remaining normalized body fields for that `event` in [`docs/normalized-fields.md`](../../normalized-fields.md) excluding `session_id` and excluding `subagent` and `agent_display_name`, omitted when absent, and empty when the document has no remaining body fields: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only empty; WHEN no document has `turn` 0, THE SYSTEM SHALL omit a turn-0 subsection.
- [ ] **AC-F004.24** — WHEN the document has `subagent`, THE SYSTEM SHALL fill the Subagent cell with only that field’s value (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar); WHEN `subagent` is absent, THE SYSTEM SHALL leave Subagent empty; THE SYSTEM SHALL fill the cell for any event kind when `subagent` is present on that document; THE SYSTEM SHALL NOT show `agent_display_name` in the Subagent cell; THE SYSTEM SHALL NOT reconstruct parent→subagent hierarchy and SHALL NOT copy `subagent` onto later documents that omit it.
- [x] **AC-F004.18** — THE SYSTEM SHALL include in each turn subsection that turn’s duration as zero-padded `HH:MM:SS` elapsed clock time; WHEN turn is **n ≥ 1**, start SHALL be that turn’s prompt-kind document `timestamp` and end SHALL be the last document in the file that has `turn: n`; WHEN turn is **0**, start SHALL be the first document with `turn: 0` and end SHALL be the last document with `turn: 0`; THE SYSTEM SHALL NOT close a turn on `stop`, `agentStop`, `Stop`, `subagentStop`, or `SubagentStop`; WHEN the end timestamp is before the start or they are equal, THE SYSTEM SHALL write duration `00:00:00`.
- [x] **AC-F004.19** — WHEN a turn subsection is for turn **n ≥ 1**, THE SYSTEM SHALL include that turn’s prompt text from the prompt-kind document with that `turn`, using the same 100-character single-line preview rules as Details and Subagent (AC-F004.6); WHEN `prompt` is absent from that document, THE SYSTEM SHALL omit the prompt line; WHEN the subsection is for turn **0**, THE SYSTEM SHALL NOT include a prompt line.
- [x] **AC-F004.6** — WHEN a Details cell, Subagent cell, or per-turn prompt line value has more than 100 characters, THE SYSTEM SHALL show the first 100 characters followed by `...`; WHEN it has 100 or fewer, THE SYSTEM SHALL NOT append an ellipsis; THE SYSTEM SHALL render each preview as a single line (newlines in the source value SHALL become spaces before the limit is applied).
- [x] **AC-F004.7** — THE SYSTEM SHALL list subagent start and stop documents as ordinary rows in that chronological table and SHALL NOT nest them under a parent event.
- [x] **AC-F004.8** — THE SYSTEM SHALL write the Session report as Markdown with tables (not HTML) at `{session_id}.md` in the same daily folder as that session’s YAML and JSONL.
- [x] **AC-F004.9** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) when writing a Session report; WHEN report generation fails, THE SYSTEM SHALL still persist as F001 and F003 and SHALL NOT change that exit or stdout behavior.
- [x] **AC-F004.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies, including no YAML parsing library.
- [x] **AC-F004.11** — THE SYSTEM SHALL NOT read the Event log (JSONL) or the Session index in order to produce the Session report.
- [x] **AC-F004.13** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create a Session report.
- [x] **AC-F004.14** — WHEN ingest appends a Session YAML log document (the payload has a session identifier), THE SYSTEM SHALL, in that same invocation after that document is in the file, write a Session report for that session, including WHEN no session-end document (`sessionEnd` / `SessionEnd`) is present in that file.
- [x] **AC-F004.23** — THE SYSTEM SHALL include in the report `session_id` equal to the F001 identifier (the filename stem / the identifier already used for that session), `harness` from the last document, start time from the first document’s `timestamp`, end time from the last document’s `timestamp`, and duration as zero-padded `HH:MM:SS` elapsed clock time from that first timestamp to that last timestamp regardless of those documents’ `event`; THE SYSTEM SHALL NOT require `session_id` on every YAML document (WHEN the first document has `session_id`, it matches; WHEN omitted, THE SYSTEM SHALL still show the F001 identifier); THE SYSTEM SHALL NOT use Cursor `duration_ms` or any session-end-only field for duration; WHEN the last timestamp is before the first or they are equal, THE SYSTEM SHALL write duration `00:00:00`.
- [x] **AC-F004.16** — WHEN a later ingest appends another Session YAML log document for the same session the same day, THE SYSTEM SHALL overwrite `{session_id}.md` from the current Session YAML log and SHALL NOT append a second report.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F004.1 — Same invocation writes YAML and Session report on session-end positional | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.2 — Report table order matches YAML file order, not timestamp sort | keep | File order within each turn table already asserts YAML `event`. Four-column header already. No `agent_type` in Details |
| AC-F004.3 — Overview session_id, source_harness from triggering end, start/end/duration | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.4 — Event-count summary: total documents and per-source_event counts | drop | Already deprecated (v0.15.0). Stay drop. Delete `e2e/ac-f004.4-event-count-summary.test.ts` if still present |
| AC-F004.5 — Details are mapped normalized body fields only | drop | Already deprecated (v0.11.0). Stay drop. Matching test already gone |
| AC-F004.17 — One subsection per distinct turn; Details in each turn table | drop | Already deprecated (v0.15.0). Stay drop. Delete `e2e/ac-f004.17-turn-subsections.test.ts` if still present |
| AC-F004.20 — Subagent filled only on subagent start/stop rows | drop | Deprecated (F009): Subagent is the bare `subagent` value on any event kind (AC-F004.24), not `{name}: {value}` pairs on start/stop only. Delete `e2e/ac-f004.20-subagent-column.test.ts`. No `AC-F004.20` titles |
| AC-F004.21 — Event-count summary: total documents and per-event counts | keep | Counts + `| event | count |` unchanged by F009 |
| AC-F004.22 — One subsection per distinct turn; four-column turn tables; Event is YAML `event` | redo | Existing `e2e/ac-f004.22-turn-subsections.test.ts` still asserts Details omit `agent_type`. Spec now excludes `subagent` / `agent_display_name`. Flip Details asserts. Do not assert Subagent fill (AC-F004.24). Keep turn grouping / Event column / omit-turn-0 |
| AC-F004.18 — Turn-0 duration is first turn-0 timestamp → last turn-0 timestamp | keep | Turn-duration intent unchanged. No identity/Details asserts |
| AC-F004.19 — Turn 0 has no Prompt line; turn ≥ 1 Prompt uses 100-character preview | keep | Prompt-line / 100-char intent unchanged |
| AC-F004.6 — Preview: 100-character limit, ellipsis, single line | keep | 100-char Details/prompt intent unchanged. F009 already flipped Subagent expected string to bare slug. Leftover `e2e/ac-f004.6-details-preview-80-chars.test.ts` if present: still drop |
| AC-F004.7 — Subagent start and stop are ordinary chronological rows | keep | Ordinary-row / no-nest intent unchanged. Do not assert Subagent fill (AC-F004.24) |
| AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML | keep | Four-column header and no `<table>` already |
| AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure | keep | Failure fixture (`.md` as directory) still valid |
| AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies | keep | Smoke spawn still valid |
| AC-F004.11 — Report is produced from YAML only, not Event log or Session index | keep | Tamper jsonl/index then later ingest; report still matches YAML `event`. No `agent_type` in Details |
| AC-F004.12 — Later same-day sessionEnd overwrites `{session_id}.md` | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.13 — No session identifier: F001 persist, no YAML, no Session report | keep | Still: no yaml, no md; Copilot `sessionId` is not an identifier |
| AC-F004.14 — Same invocation writes YAML and Session report after any YAML-appending ingest | keep | Report-after-every-YAML-append still holds. YAML `event` already. Do not assert `session_id` on the stop-only YAML doc |
| AC-F004.15 — Overview session_id, source_harness from last document, start/end/duration | drop | Already deprecated (v0.15.0). Stay drop. Delete `e2e/ac-f004.15-overview-times-and-duration.test.ts` if still present |
| AC-F004.23 — Overview session_id from F001 filename, harness from last document, start/end/duration | keep | Overview `session_id` / `harness` / duration unchanged by F009 |
| AC-F004.16 — Later YAML append same session same day overwrites `{session_id}.md` | keep | Overwrite / Turn 0 / Turn 1 row counts still track YAML |

New scenario (not in the prior plan as this AC id): **AC-F004.24** (Subagent cell is the bare `subagent` value when present on any event kind; no field-name prefix; no `agent_display_name` in the cell; no inheritance). File: `e2e/ac-f004.24-subagent-bare-name.test.ts`.

## Implementation Steps

### Step 1: AC-F004.2 — Report table order matches YAML file order, not timestamp sort
Keep. Several events for one session; each **turn** table’s rows follow YAML document file order even when payload timestamps would sort differently. Verifies AC-F004.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.2-report-table-file-order.test.ts`
- [x] Arrange: one fixture; same payload `session_id` `"sess-ac-f004-2"` for every spawn (F001 identifier). Choose Unix-ms `timestamp` values whose host-local `HH:MM:SS` would sort in a **different** order than ingest order (same pattern as `e2e/ac-f003.4-timestamp-hhmmss.test.ts`: format with local `getHours` / `getMinutes` / `getSeconds`, zero-padded). Example order: (1) extra argv `["cursor", "sessionStart"]` with a **later** clock time (e.g. 12:00:00); (2) extra argv `["cursor", "beforeSubmitPrompt"]` with an **earlier** clock time (e.g. 10:00:00) and a `prompt` so the row is identifiable; (3) extra argv `["cursor", "sessionEnd"]` with a middle or later clock time (e.g. 11:00:00) and `reason`. Do not register `beforeSubmitPrompt`. Snapshot YAML document count and each document’s `timestamp` / `event` (via `yamlDocuments` + `yamlMapping.values.event`) after the last spawn. First YAML document (sessionStart) has `session_id`; later documents omit it — do **not** assert `session_id` on every mapping. F008 will put sessionStart in Turn 0 and prompt + sessionEnd in Turn 1 — use that as a fixture; do not assert YAML `turn` integers
- [x] Act: spawn the three ingests in that file order via `spawnIngest` (title includes `AC-F004.2`)
- [x] Assert: YAML has exactly three documents in ingest order (`event` `sessionStart`, `beforeSubmitPrompt`, `sessionEnd`) with the arranged timestamps; `{session_id}.md` exists; the report has `## Turn 0` then `## Turn 1` and does **not** contain `## Events`; the Turn 0 table has one data row (`12:00:00` `sessionStart`); the Turn 1 table has two data rows in **file** order (`10:00:00` `beforeSubmitPrompt`, then `11:00:00` `sessionEnd`) — not sorted by Time; each turn table header is exactly `| Time | Event | Subagent | Details |`; each data row has four cells; Subagent is empty on these rows (no identity key planted) (AC-F004.2)

---

### Step 2: AC-F004.21 — Event-count summary: total documents and per-event counts
Keep. Report includes the number of YAML documents and a breakdown of how many documents have each distinct `event` (session-level, not per-turn). Table header is `event`. Verifies AC-F004.21.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.21-event-count-summary.test.ts`
- [x] Arrange: one fixture; payload `session_id` `"sess-ac-f004-21"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` (with `prompt`); `["cursor", "beforeSubmitPrompt"]` again (repeat kind); `["cursor", "sessionEnd"]` (with `reason`). Four documents; `beforeSubmitPrompt` appears twice. Do not register `beforeSubmitPrompt`. Count-table lookup is `| event | count |`. Title `AC-F004.21`
- [x] Act: spawn the four ingests in order via `spawnIngest` (title includes `AC-F004.21`)
- [x] Assert: YAML has four documents; the report states total document count **4**; the counts table header is exactly `| event | count |` and is **not** `| source_event | count |`; per-`event` breakdown includes `sessionStart` 1, `beforeSubmitPrompt` 2, `sessionEnd` 1 (and no extra kinds) (AC-F004.21)

---

### Step 3: AC-F004.22 — One subsection per distinct turn; four-column turn tables; Details exclude `subagent`
Redo. Spawn several events for one session → report has one `## Turn {n}` per distinct turn that appears, does **not** contain a session-wide `## Events` heading, each subsection table has exactly columns Time, Event, Subagent, Details. Event is YAML `event`. Details are the remaining `docs/normalized-fields.md` body fields excluding `session_id` and excluding `subagent` / `agent_display_name` (not `agent_type`). Same turn-grouping / omit-turn-0 cases. Keep Details / Subagent values ≤100 characters so truncation is out of this AC (that is AC-F004.6). Subagent **fill rules** are AC-F004.24 — this step only needs identity **not** in Details, and Details for subagent start = `task` only. Existing file still asserts `details.includes("agent_type") === false`; flip those asserts to `subagent` / `agent_display_name`. Do not assert F008 numbering. Verifies AC-F004.22.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.22-turn-subsections.test.ts`
- [ ] Arrange: isolated fixtures + `CURSOR_PROJECT_DIR`. Keep file `e2e/ac-f004.22-turn-subsections.test.ts` (do **not** delete). Every title stays `AC-F004.22` (no `AC-F004.17` / `AC-F004.20` title). Event column values stay the event-name strings; they come from YAML `event`. Do not spawn Copilot or Claude processes; pass mapping names on argv. Each payload that must produce YAML includes a F001 session identifier. Keep values ≤100 characters. Do **not** plan F006 mapping-table exception cases as a separate AC. Local `eventRows` already looks up `| Time | Event | Subagent | Details |` and four cells — keep that. Helper `assertMappedRows` (and Copilot / absent / null cases): stop asserting Details omit `agent_type`; assert Details omit `subagent` and `agent_display_name` instead (exact Details strings already exclude them). Cases (each title includes `AC-F004.22`):
    1. Several events, one session — sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` (with `prompt`); `["cursor", "stop"]`. Report has `## Turn 0` then `## Turn 1` (F008 fixture). Does **not** contain `## Events`. Turn 0 table has the `sessionStart` row; Turn 1 table has `beforeSubmitPrompt` then `stop`. Each table header is exactly `| Time | Event | Subagent | Details |` — four columns, no Turn column. Event cells equal YAML `event`
    2. Details mapped kinds inside the turn tables — sequential: `sessionStart` (no body); `subagentStart` with `subagent_type` and Cursor `task`; `subagentStop` with `subagent_type` and `summary` (Cursor `response_text` source); `beforeSubmitPrompt` with `prompt`; `stop` (no body); `sessionEnd` with `reason`. Details: sessionStart empty; subagentStart `task: …` only (no `subagent`, no `agent_display_name`); subagentStop `response_text: …` only; prompt `prompt: …`; stop empty; sessionEnd `reason: …`. Do **not** assert Subagent cell contents (AC-F004.24). `session_id` never appears in any Details cell. Do not assert `transcript_path`
    3. Copilot `agent_display_name` present — extra argv `["copilot", "subagentStart"]` with `agentName` and `agentDisplayName` (do not spawn Copilot). Details empty (omit `task` — Copilot has no `task` source key). Identity is **not** in Details (`subagent` belongs in Subagent as the bare name; `agent_display_name` is shown in neither column)
    4. Absent key omitted — `subagentStart` payload has `subagent_type` and **no** `task` key (Details empty, no `task:`); `sessionEnd` payload has no `reason` key (Details empty, no `reason:`). Details must not contain `subagent`
    5. Present null — `subagentStart` with `task: null` and `subagent_type` set. Details include `task: null` (YAML `null` appears) and do **not** include `subagent`. Do not use `transcript_path`
    6. Header-only unrecognized — extra argv `["unknown-harness", "notAnEvent"]` with body-like extras (`reason`, `prompt`, `task`). Unrecognized row Details empty; extras do not leak into Details
    7. Pipe in a cell — `sessionEnd` `reason` contains `|` (e.g. `"completed|aborted"`). That table row still has exactly four cells (Time, Event, Subagent, Details); the pipe does not split the row
    8. Omit empty turn 0 — extra argv `["cursor", "beforeSubmitPrompt"]` only (with payload `session_id` and `prompt`); no preceding non-prompt document. Report has `## Turn 1` and does **not** contain `## Turn 0`. Do not invent an empty turn 0. Do not assert YAML `turn` integers (F008). YAML for this case has no `session_id` field (F003); do **not** fold overview `session_id` here (that is AC-F004.23)
- [ ] Act: spawn each case via `spawnIngest` (do not import `cli/src/**`; do not change `.cursor/hooks.json`)
- [ ] Assert: no `## Events`; each turn table header is exactly `| Time | Event | Subagent | Details |`; Event cells equal YAML `event`; each data row has four cells; Details use snake_case names in table order, `{name}: {value}` pairs separated by `; ` when multiple; subagent start Details are `task` only; subagent stop Details are `response_text` only; `subagent` / `agent_display_name` do not appear in Details (do **not** assert `agent_type` omission); omitted when absent; empty for sessionStart, agent stop, and header-only; YAML `null` appears; `session_id` not in Details; `|` stays inside one cell; prompt-only spawn omits `## Turn 0` (AC-F004.22)

---

### Step 4: AC-F004.24 — Subagent cell is the bare `subagent` value
New. Subagent cell is only the `subagent` value (the name) whenever that YAML document has the field — any event kind, not only start/stop — with no field-name prefix. Absent → empty. Later row without the identity key does not inherit. Copilot display name is not shown in the cell. Replaces dropped AC-F004.20. Verifies AC-F004.24.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.24-subagent-bare-name.test.ts`
    - delete `e2e/ac-f004.20-subagent-column.test.ts`
- [ ] Arrange: isolated fixtures + `CURSOR_PROJECT_DIR`. New file `e2e/ac-f004.24-subagent-bare-name.test.ts`. Delete `e2e/ac-f004.20-subagent-column.test.ts` (drop authorizes delete; do **not** retitle that file). Do not spawn Copilot or Claude processes. Do not reconstruct hierarchy. Keep identity values ≤100 characters (truncation is AC-F004.6). Each title includes `AC-F004.24` (**no** `AC-F004.20` title). Spawn via `spawnIngest` with extra argv. Cases:
    1. subagentStart / subagentStop bare name — sequential extra argv: `["cursor", "sessionStart"]` (no identity key); `["cursor", "subagentStart"]` with `subagent_type` `"explore"`; `["cursor", "subagentStop"]` with `subagent_type` `"explore"`. Same payload `session_id` throughout (subagent start may use `parent_conversation_id` as in AC-F004.7). F008 will put all three in Turn 0 — use that as a fixture
    2. sessionStart / stop / prompt WITH identity — sequential extra argv: `["cursor", "sessionStart"]` with `subagent_type` `"explore"`; `["cursor", "beforeSubmitPrompt"]` with `prompt` and `subagent_type` `"explore"`; `["cursor", "stop"]` with `subagent_type` `"explore"`. Same `session_id`. F008: Turn 0 = sessionStart; Turn 1 = prompt then stop
    3. later row without identity key — sequential extra argv: `["cursor", "sessionStart"]` with `subagent_type` `"explore"`; `["cursor", "stop"]` with a session identifier and **no** `subagent_type` / `agentName` / `agentType` / `agent_type`. Same `session_id`. Both stay Turn 0 (no prompt)
    4. Copilot slug only — extra argv `["copilot", "subagentStart"]` with `agentName` `"explore"` and `agentDisplayName` `"Explore"` (do not spawn Copilot). Distinct slug vs label is required
    5. absent identity — extra argv `["cursor", "subagentStart"]` with a session identifier and **no** preferred identity key (`subagent_type` / `agentName` / `agentType` / `agent_type`)
- [ ] Act: spawn each case via `spawnIngest` (do not import `cli/src/**`; do not change `.cursor/hooks.json`)
- [ ] Assert: case 1 — Subagent on `subagentStart` and `subagentStop` is exactly `explore`; it is **not** `agent_type: explore` and **not** `subagent: explore`; sessionStart (no identity) is empty. Case 2 — Subagent is `explore` on `sessionStart`, `beforeSubmitPrompt`, and `stop` (cell filled for those kinds when the document has `subagent`). Case 3 — sessionStart Subagent is `explore`; the later `stop` row Subagent is empty (no inheritance). Case 4 — Subagent is exactly `explore` (slug); it is **not** `Explore`, **not** `agent_display_name: Explore`, **not** `agent_type: explore; agent_display_name: Explore`. Case 5 — Subagent empty. Table header is `| Time | Event | Subagent | Details |`. Do not nest rows. Do not assert F008 numbering. Do not re-test F009 key preference (AC-F004.24)

---

### Step 5: AC-F004.18 — Turn-0 duration is first turn-0 timestamp → last turn-0 timestamp
Keep. With no prompt-kind document, both documents stay `turn` 0; turn duration is first turn-0 timestamp → last turn-0 timestamp (same as session duration when every doc is turn 0). Assert `Duration: HH:MM:SS` in the turn subsection. Do not add n≥1 prompt-kind duration cases here (cli units cover that). Do not change turn-duration intent. Verifies AC-F004.18.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.18-turn-duration.test.ts`
- [x] Arrange: isolated fixtures. Payload `timestamp` is Unix-ms so YAML `HH:MM:SS` is deterministic. Spawn `sessionStart` then `stop` (no prompt) so both documents stay turn 0. Four-column `eventRows` lookup already. Cases (each title includes `AC-F004.18`):
    1. Elapsed, all turn 0 — first extra argv `["cursor", "sessionStart"]` with earlier `timestamp` (e.g. 10:00:00); then extra argv `["cursor", "stop"]` with later `timestamp` (e.g. 11:01:02), same F001 `session_id`. Turn 0 duration equals session duration `01:01:02`. Do not close a turn on `stop` (both docs stay in Turn 0; no `## Turn 1`)
    2. Equal timestamps — two documents (`sessionStart` then `stop`) with the **same** `HH:MM:SS`. Turn 0 `Duration: 00:00:00`
- [x] Act: spawn each fixture’s ingests in order via `spawnIngest`
- [x] Assert: each `exitCode === 0`; stdout empty. The Turn 0 subsection contains `Duration: 01:01:02` (case 1) or `Duration: 00:00:00` (case 2) as zero-padded `HH:MM:SS`. Case 1: that value matches session overview duration (every doc is turn 0). Turn table header is `| Time | Event | Subagent | Details |`. Do not assert a prompt-kind start for turn duration. Do not assert F008 numbering. Report has `## Turn 0` and no `## Events` (AC-F004.18)

---

### Step 6: AC-F004.19 — Turn 0 has no Prompt line; turn ≥ 1 Prompt uses 100-character preview
Keep. Turn-0 subsection has **no** `Prompt:` line. Turn **n ≥ 1** includes `Prompt:` from that turn’s prompt-kind document, using the same 100-character single-line preview as Details / Subagent (AC-F004.6). When `prompt` is absent, omit the prompt line. Do not change prompt-line intent. Verifies AC-F004.19.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.19-turn-prompt.test.ts`
- [x] Arrange: isolated fixtures. Four-column table-header lookup already. Cases (each title includes `AC-F004.19`):
    1. Turn 0 has no `Prompt:` — extra argv `["cursor", "sessionStart"]` only, payload `session_id` `"sess-ac-f004-19-t0"`. The Turn 0 subsection has **no** line starting `Prompt:`
    2. Turn ≥ 1 Prompt line, 100-character preview — extra argv `["cursor", "sessionStart"]` then `["cursor", "beforeSubmitPrompt"]` with a `prompt` of 101 `a` characters, same `session_id` `"sess-ac-f004-19"`. Turn 0 has no `Prompt:` line. Turn 1 has `Prompt: ` + first 100 `a` + `...` (not 101 `a`, not `....`). Details may still show `prompt: …` on the `beforeSubmitPrompt` row
    3. Turn ≥ 1 Prompt omitted when `prompt` is absent — extra argv `["cursor", "sessionStart"]` then `["cursor", "beforeSubmitPrompt"]` with **no** `prompt` key. Turn 1 has **no** `Prompt:` line
- [x] Act: spawn each case via `spawnIngest` (titles include `AC-F004.19`)
- [x] Assert: case 1 — `## Turn 0`, no `Prompt:` in that subsection, no `## Events`. Case 2 — `## Turn 0` has no `Prompt:`; `## Turn 1` has the 100-character preview line. Case 3 — Turn 1 has no `Prompt:` line. Do not re-test F008 numbering (AC-F004.19)

---

### Step 7: AC-F004.6 — Preview: 100-character limit, ellipsis, single line
Keep. A Details / Subagent / per-turn prompt value longer than 100 characters is the first 100 characters plus `...`; 100 or fewer gets no ellipsis; newlines become spaces **before** the limit. Do not change 100-char intent. Verifies AC-F004.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.6-details-preview-100-chars.test.ts`
    - delete `e2e/ac-f004.6-details-preview-80-chars.test.ts` if still present (prior amend leftover)
- [x] Arrange: isolated fixtures; extra argv for a user-prompt ingest. Four-column table-header lookup already. Cases (each title includes `AC-F004.6`):
    1. Over 100 — `prompt` is 101 `a` characters. Details must show `prompt: ` then 100 `a` then `...` (not 101 `a`, not `....`)
    2. Exactly 100 — `prompt` is 100 `a` characters. Details must show those 100 characters and **must not** contain `...`
    3. Newlines before the limit — `prompt` contains a newline such that the collapsed single line is longer than 100 (replace `\n` / `\r` with a space first, then apply the 100-character cut). Details must be a single line (no raw newline in the cell) and must use the collapsed prefix plus `...` when the collapsed length exceeds 100
    4. Subagent cell truncation — extra argv `["copilot", "subagentStart"]` with `agentName` and an `agentDisplayName` of 101 `b` characters (do not spawn Copilot). F009 already flipped the expected Subagent string to the bare slug; display name is not the truncated value (slug-vs-label is AC-F004.24). Leave this case as shipped
- [x] Act: spawn each case via `spawnIngest`
- [x] Assert: case 1 truncated at 100 + `...`; case 2 no ellipsis; case 3 single-line preview, spaces applied before the limit; case 4 Subagent cell is the slug, not the 101-character display name (AC-F004.6)

---

### Step 8: AC-F004.7 — Subagent start and stop are ordinary chronological rows inside the turn table
Keep. sessionStart + subagentStart + subagentStop + sessionEnd → four ordinary rows **inside that turn’s table**; no nesting or indentation as children. Do not assert Subagent fill (AC-F004.24). Verifies AC-F004.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.7-subagent-ordinary-rows.test.ts`
- [x] Arrange: one fixture. First: extra argv `["cursor", "sessionStart"]`, payload `session_id` `"sess-ac-f004-7"`. Second: extra argv `["cursor", "subagentStart"]`, no `session_id` / no `conversation_id`, `parent_conversation_id` `"sess-ac-f004-7"`, plus `subagent_type` (and optional `transcript_path`). Third: extra argv `["cursor", "subagentStop"]`, same F001 identifier (`session_id` or `parent_conversation_id` `"sess-ac-f004-7"`), plus stop body fields. Fourth: extra argv `["cursor", "sessionEnd"]`, payload `session_id` `"sess-ac-f004-7"`. Same sibling-identifier pattern as `e2e/ac-f003.6-subagent-sibling-document.test.ts`. No prompt, so all four documents stay in Turn 0. Four-column helper already
- [x] Act: spawn ingest four times in order via `spawnIngest` (title includes `AC-F004.7`)
- [x] Assert: YAML has four independent documents; report has `## Turn 0` (or equivalent) and does **not** contain `## Events`; the Turn 0 table has exactly four data rows in file order (`sessionStart`, `subagentStart`, `subagentStop`, `sessionEnd`); each row has four cells; subagent rows are ordinary chronological rows in that turn table, not nested, indented as children, or wrapped under a parent (`subagent` / `children` / `events` / leading spaces that mark a child row) (AC-F004.7)

---

### Step 9: AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML
Keep. File lives in the daily folder next to that session’s YAML and JSONL; content is Markdown tables; `<table>` is absent. Verifies AC-F004.8.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.8-markdown-file-not-html.test.ts`
- [x] Arrange: isolated fixture; extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f004-8"` and `reason`. Use `sessionReportPath` so the expected path is `{dayFolder}/{session_id}.md`. This spawn is not session-start, so YAML omits `session_id` (F003); do not assert it on the YAML document. Overview `session_id` is AC-F004.23
- [x] Act: spawn ingest via `spawnIngest` (title includes `AC-F004.8`)
- [x] Assert: `{dayFolder}/sess-ac-f004-8.md` exists at that path (same folder as `events.jsonl` and `sess-ac-f004-8.yaml`); file content includes Markdown table markup (`|`); content includes `| Time | Event | Subagent | Details |` and does **not** include `| Time | Event | Details |`; content does **not** include `<table` or `</table>` (case-insensitive); not HTML (AC-F004.8)

---

### Step 10: AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure
Keep. Normal YAML-appending ingest: exit 0, stdout empty. Report-failure: pre-create `{session_id}.md` as a **directory** so overwrite fails; still persist jsonl+yaml, exit 0, stdout empty. Verifies AC-F004.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.9-observe-only-report-failure.test.ts`
- [x] Arrange: two isolated fixtures; extra argv `["cursor", "sessionEnd"]`; payload has `session_id` and `reason`. Case A — normal write. Case B — `mkdir` `{dayFolder}/{session_id}.md` (a directory) before spawn so creating/overwriting the report file fails. Pre-create the day folder in case B so the directory can exist at the report path
- [x] Act: spawn ingest via `spawnIngest` for each case (each title includes `AC-F004.9`)
- [x] Assert: both `exitCode === 0` and stdout empty (no blocking stdout). Case A: `{session_id}.md` is a file. Case B: Event log has exactly one parseable object line deep-equal to stdin; Session index includes that `session_id`; `{session_id}.yaml` exists with exactly one document beginning with `---`; the path `{session_id}.md` remains a directory (report write failed); F001/F003 writes were not undone (AC-F004.9)

---

### Step 11: AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies
Keep. Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty, no YAML library, no new binary. Verifies AC-F004.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.10-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [x] Arrange: repo root; load `cli/package.json`. Isolated fixture for the spawn smoke. Do not require `dist/audit-bot.exe` or a new `bin` name. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML library. Do not register extra Cursor events
- [x] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionEnd` via `spawnIngest` with a JSON object that has `session_id` (title includes `AC-F004.10`)
- [x] Assert: `"type": "module"`; `"dependencies": {}` (so no `yaml` / `js-yaml` / other YAML parsing library); `engines.node` is a string that starts with `>=24`; spawn `exitCode === 0`, stdout empty, Event log + Session index + `{session_id}.yaml` + `{session_id}.md` all present from that existing entry (AC-F004.10)

---

### Step 12: AC-F004.11 — Report is produced from YAML only, not Event log or Session index
Keep. After writing YAML via ingest, tamper `events.jsonl` and/or `sessions.json` so they disagree with YAML; then a later YAML-appending ingest; the report must match YAML documents, not the tampered jsonl/index. Verifies AC-F004.11.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts`
- [x] Arrange: one fixture; payload `session_id` `"sess-ac-f004-11"`. First spawn extra argv `["cursor", "sessionStart"]` with a distinctive `timestamp`. Then **tamper** on disk (do not go through ingest): append an extra JSONL line to `events.jsonl` whose payload would look like another event (e.g. a `beforeSubmitPrompt` with a unique `prompt` `"tampered-from-jsonl"`) and rewrite `sessions.json` to include an extra identifier (e.g. `"tampered-session"`) and/or omit the real id. Then spawn extra argv `["cursor", "sessionEnd"]` with `reason` and a second distinctive `timestamp`. YAML after that has exactly two documents (`sessionStart`, `sessionEnd`) — the tampered JSONL line was never appended as YAML. Snapshot YAML `event` via `yamlMapping.values.event`. First YAML doc has `session_id`; the sessionEnd doc omits it — do **not** require `session_id` on both mappings. Four-column `eventRows` lookup already
- [x] Act: spawn sessionStart via `spawnIngest`; tamper jsonl and index; spawn sessionEnd (title includes `AC-F004.11`)
- [x] Assert: YAML still has exactly two documents in file order (`event` `sessionStart`, `sessionEnd`); `{session_id}.md` turn table has exactly two data rows (`sessionStart`, `sessionEnd`) and does **not** contain `tampered-from-jsonl` or `tampered-session`; total document count in the report is 2, not 3; overview `session_id` is `"sess-ac-f004-11"` (F001 identifier / filename stem); table header is `| Time | Event | Subagent | Details |` (AC-F004.11)

---

### Step 13: AC-F004.13 — No session identifier: F001 persist, no YAML, no Session report
Keep. Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) → Event log line exists; Session index unchanged; no `{dayFolder}/*.yaml`; no `{dayFolder}/*.md`. Verifies AC-F004.13.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.13-no-session-id-no-report.test.ts`
- [x] Arrange: two isolated fixtures; extra argv `["cursor", "sessionEnd"]` so a writer that treated `sessionId` as an identifier would create both YAML and `.md`. Payload has `sessionId` and no `session_id` / `conversation_id` / `parent_conversation_id` (optional `reason` / `hook_event_name`). Case A — first use of the day folder. Case B — day folder pre-seeded with `sessions.json` `["keep-me"]`. Same identifier pattern as `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`
- [x] Act: spawn ingest via `spawnIngest` for each case (each title includes `AC-F004.13`)
- [x] Assert: both `exitCode === 0`; stdout empty; Event log has exactly one parseable object line deep-equal to that case’s stdin; (A) `sessions.json` is `[]`; (B) `sessions.json` remains `["keep-me"]`; `{dayFolder}/*.yaml` is absent; `{dayFolder}/*.md` is absent — no invented identifier, no file named for `sessionId` (AC-F004.13)

---

### Step 14: AC-F004.14 — Same invocation writes YAML and Session report after any YAML-appending ingest
Keep. Spawn ingest with a session identifier → F001 persist plus one YAML document and `{session_id}.md` in the dated folder, same process, same invocation, including when no session-end document is in the file. Also still true for `sessionEnd`. Verifies AC-F004.14.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at each. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not register `stop`. Do not infer the report trigger from the payload. Read YAML `event` via `yamlMapping.values.event`. Cases (each title includes `AC-F004.14`):
    1. Extra argv `["cursor", "sessionStart"]`; payload has `session_id` e.g. `"sess-ac-f004-14-start"`. No session-end document in the file. This YAML document **has** `session_id` (initial session-start)
    2. Extra argv `["cursor", "stop"]`; payload has `session_id` e.g. `"sess-ac-f004-14-stop"`. No session-end document in the file (`stop` is a fixture only; F006 owns registration). This YAML document **omits** `session_id` (not session-start) — do **not** assert a `session_id` field on it
    3. Extra argv `["cursor", "sessionEnd"]`; payload has `session_id` e.g. `"sess-ac-f004-14-end"` and `reason` — still true for session-end. YAML omits `session_id`
- [x] Act: spawn each case via `spawnIngest` (do not import `cli/src/**`)
- [x] Assert: each case `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` overlay); `{dayFolder}/sessions.json` includes that `session_id`; `{dayFolder}/{session_id}.yaml` exists with exactly one document beginning with `---`; `{dayFolder}/{session_id}.md` exists. Cases 1 and 2: YAML `event` is not `sessionEnd` / `SessionEnd` (AC-F004.14)

---

### Step 15: AC-F004.23 — Overview session_id from F001 filename, harness from last document, start/end/duration
Keep. Report overview uses `session_id` equal to the F001 identifier / filename stem even when YAML omits `session_id` on later or non-start documents; `harness` from the **last** document (not `source_harness`); start = first YAML `timestamp`; end = last YAML `timestamp`; duration zero-padded `HH:MM:SS` first→last regardless of `event`. Must not require sessionEnd. Must not use `duration_ms`. Last-before-first and equal timestamps both yield `00:00:00`. Verifies AC-F004.23.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.23-overview-times-and-duration.test.ts`
- [x] Arrange: four isolated fixtures. Payload `timestamp` is Unix-ms so YAML `HH:MM:SS` is deterministic (do not rely on generate-on-receive). Do **not** use `sessionEnd` / `SessionEnd` as the last (or only) event except where a case is prompt-only. Titles `AC-F004.23` (no `AC-F004.15` title). Cases (each title includes `AC-F004.23`):
    1. Normal elapsed, two harnesses, no sessionEnd — first extra argv `["cursor", "sessionStart"]` with earlier `timestamp` (e.g. 10:00:00); then extra argv `["copilot", "stop"]` (do not spawn Copilot; do not register `stop`) with later `timestamp` (e.g. 11:01:02), same F001 `session_id`, plus a misleading Cursor `duration_ms` (e.g. `9999999`) that would disagree if used. First YAML document has `session_id`; last document omits it. Overview `harness` must be `copilot` from the last document, not `cursor` from the first. Overview field is `| harness |`, **not** `| source_harness |`. Expected duration `01:01:02`
    2. Last before first — first extra argv `["cursor", "sessionStart"]` with a **later** `timestamp` (e.g. 14:00:00); then extra argv `["cursor", "beforeSubmitPrompt"]` with an **earlier** `timestamp` (e.g. 10:00:00) and a `prompt`. File order keeps the later time first. Expected duration `00:00:00`
    3. Equal timestamps — two documents (`sessionStart` then `stop`) with the **same** `HH:MM:SS`. Expected duration `00:00:00`
    4. Prompt-only, no sessionStart — extra argv `["cursor", "beforeSubmitPrompt"]` only, payload `session_id` e.g. `"sess-ac-f004-23-prompt"` and a `prompt`. No preceding session-start. YAML has exactly one document; `yamlMapping` keys do **not** include `session_id`. Report file is still `{session_id}.md` named for the F001 identifier. Overview `session_id` equals that filename stem. Overview `harness` is `cursor`. Duration `00:00:00` (first timestamp equals last)
- [x] Act: spawn each fixture’s ingests in order via `spawnIngest`; last spawn is not session-end
- [x] Assert: each `exitCode === 0`; stdout empty. Overview contains that `session_id` (F001 identifier / filename stem) even when YAML omits `session_id` on later or non-start docs. Overview has `| harness |` and does **not** have `| source_harness |`. `harness` equals the last YAML document’s `harness` (case 1: `copilot`; case 4: `cursor`). Start time equals the first YAML document’s `timestamp`; end time equals the last YAML document’s `timestamp`; duration is zero-padded `HH:MM:SS`. Case 1: duration `01:01:02` (not a value derived from `duration_ms`); first YAML doc has `session_id`; last YAML doc omits it. Cases 2 and 3: duration `00:00:00`. Case 4: YAML has no `session_id` field; overview `session_id` still equals `"sess-ac-f004-23-prompt"`; duration `00:00:00`. YAML has no session-end document. Do not reconstruct across days (all documents are this fixture’s calendar day) (AC-F004.23)

---

### Step 16: AC-F004.16 — Later YAML append same session same day overwrites `{session_id}.md`
Keep. Two sequential YAML-appending ingests for the same session the same day (not only a later sessionEnd): `.md` is overwritten (not two reports concatenated); the later report’s table row counts match YAML document counts per turn. Verifies AC-F004.16.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.16-overwrite-same-day-report.test.ts`
- [x] Arrange: one fixture; payload `session_id` `"sess-ac-f004-16"`. Sequence: extra argv `["cursor", "sessionStart"]`; extra argv `["cursor", "beforeSubmitPrompt"]` with `prompt` `"second-event"`; extra argv `["cursor", "stop"]` with a distinctive field that stays on JSONL only (optional). Do **not** use a later `sessionEnd` as the overwrite trigger. Snapshot the `.md` bytes (or text) after the first ingest. Snapshot YAML document count after each spawn. Four-column `eventRows` lookup already
- [x] Act: spawn in that order via `spawnIngest` (title includes `AC-F004.16`)
- [x] Assert: after the first ingest the report exists and Turn 0 has **one** data row matching YAML document count 1; after the second ingest `{session_id}.md` still exists as a single file; content is **not** the first report concatenated with a second (the first snapshot is not a prefix of two concatenated reports; no duplicated overview blocks); Turn 0 still has one `sessionStart` row and Turn 1 has one `beforeSubmitPrompt` row including `second-event`; after the third ingest Turn 0 still has one row, Turn 1 has two (`beforeSubmitPrompt`, `stop`), YAML document count is **3**, and the file is still one report; table header is `| Time | Event | Subagent | Details |` (AC-F004.16)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F003.
- Did not run `node --test e2e/*.test.ts` (plan only; e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001/F002/F003).
- Session YAML log compact-header wording is taken from F003 spec (`harness` / `event`; `session_id` only on the initial session-start) plus F009 `subagent`, not copied verbatim from the sibling [cli.plan.md](./cli.plan.md) (that sibling still describes pre-F009 Subagent fill: `{name}: {value}` on start/stop only). E2e Arrange must match what ingest writes after F003 / F009. This container does not edit `cli.plan.md`.
- F008 is released (0.14.0). E2e spawn can produce `## Turn 1`. This plan uses that as a fixture for AC-F004.22 / .19 / .24 / .2 / .16. It does **not** re-test F008 numbering ACs. Do not break F001–F003 or F005–F009 spawn tests.
- F009 owns YAML `subagent` persistence and key preference. This plan does **not** re-test F009 ACs. It only asserts how the report displays `subagent` (AC-F004.24) and that Details exclude it (AC-F004.22).
- This plan carries **no unit tests** and plans no `cli/test/` work.
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. Markdown report path helpers and `turnSubsection` already exist. Do not change default `extraArgv`.
- YAML and Markdown in tests are observed as text (split YAML on `---`, read keys in order; assert Markdown tables as strings). No YAML library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude mapping and `stop` are exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier; cases that need YAML/report still include payload `session_id` (or `conversation_id` / `parent_conversation_id`).
- Do not add or remove Cursor hooks in this plan. This amend does not change `.cursor/hooks.json`. Prompt and agent-stop mapping are spawned as ingest extra argv only. F006 owns `stop` registration and the `task` mapping-table exception; this plan only uses `stop` / `task` as fixtures.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- This container does not set spec status to `planned` (parent coordinates). Spec status stays `pending`. Do not edit `spec.md` or `cli.plan.md`. Do not commit.
- Drop of AC-F004.1 / AC-F004.3 / AC-F004.5 / AC-F004.12 already authorized deletion of those files (already gone). Drop of AC-F004.4 / AC-F004.15 / AC-F004.17 still authorizes deleting `e2e/ac-f004.4-event-count-summary.test.ts`, `e2e/ac-f004.15-overview-times-and-duration.test.ts`, and `e2e/ac-f004.17-turn-subsections.test.ts` if still present. Leftover `e2e/ac-f004.6-details-preview-80-chars.test.ts` if present is still drop (prior amend). Drop of AC-F004.20 authorizes deleting `e2e/ac-f004.20-subagent-column.test.ts` (replace with `e2e/ac-f004.24-subagent-bare-name.test.ts`; do not keep `AC-F004.20` titles).

---

> last updated: 2026-09-02T10:28:00Z
