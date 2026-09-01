---
spec-kind: functional
container: e2e
---
# F004-session-end-report - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals. Persistence stays F001 and F003: verbatim Event log, Session index rules, append-only Session YAML log (five-field header including integer `turn`; numbering is F008), exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation that appends a Session YAML log document also writes `{session_id}.md` in that day’s folder, produced only from that session’s Session YAML log after that document is in the file — including when no session-end document is present. The report groups events into one Markdown subsection per distinct `turn` (no session-wide `## Events` table). Source arguments are used for the YAML header only; they do not gate the Session report and are not written onto the Event log line. Cursor registration is unchanged by this F004 amend (six events; F001 / F005 / F006). Do not add a report hook. Do not change `.cursor/hooks.json`. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, F003, F005, F006, F007, or F008. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. Do **not** plan F006 scenarios (stop registration, yaml `task` mapping table exception); F004.14 / F004.17 may *use* `stop` or `task` as fixtures. Ingest currently writes `turn: 0` on every YAML document (F008 later); e2e spawn cannot produce `turn` ≥ 1 until F008.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (amend/replan of the F004 e2e plan — per-turn subsections; drop AC-F004.5):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. F002, F003, F005, F006, and F007 spawn tests also remain valid. **Do not break F001–F003 or F005–F007 spawn tests.** Markdown helpers (`sessionReportPath`, `readSessionReport`, `listMdFiles`) and YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`, `listYamlFiles`) already exist; extend only if needed (e.g. locate a `## Turn 0` subsection); do not change the default `extraArgv` behavior
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F004.17 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not add or remove Cursor hooks in this plan. Do not spawn Copilot or Claude processes. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names so YAML (and thus the per-turn table) contains those kinds. F004.14 / F004.17 may spawn `stop` or include Cursor `task` as fixtures; F006 owns stop registration and the `task` mapping-table exception
- When a YAML file (and thus a report) is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F004.13)
- Ingest currently writes `turn: 0` on every document. E2e must **not** assert F008 numbering (prompt → turn 1). Assert `## Turn 0` (or equivalent) when spawn wrote documents; assert the report does **not** contain `## Turn 1` when ingest only wrote turn 0. “Omit a turn-0 subsection when no document has `turn` 0” is **cli unit-tested** — do not require that via ingest
- Prompt-in-turn-1 and turn **n ≥ 1** duration starting at the prompt-kind timestamp are **cli unit-tested** until F008
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify. Drop authorizes deleting the matching test file

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, YAML, project root, and day folder stay as F003. Session YAML header is five fields including integer `turn` (F003 0.12.0). Numbering is F008; ingest may write `0`. Session report is written after every YAML append. Argv does not gate the report.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
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

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008; not a body field). Numbering is F008. This F004 amend **reads** `turn`; ingest may write `0` until F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order.
- Event kinds: session start; session end; subagent start; subagent stop; user prompt; agent stop (names in `docs/events-args.md`).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (payload has a session identifier), after that document is in the file. Do **not** require `source_event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the JSONL payload. Still produce a report when no session-end document is in the file. Argv does not gate the report.
- Produce only from that session’s Session YAML log (every document, file order, no re-sort). Read `turn` from each YAML document. Do not read the Event log or Session index.
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later YAML append for the same session the same day; do not append a second report.
- Overview: `session_id` (F001 identifier / first document); `source_harness` from the **last** document (the ingest that just ran), not from a session-end document; start = first document `timestamp`; end = last document `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those documents’ `source_event`. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`. Session overview stays session-level.
- Event-count summary: total YAML documents; count per distinct `source_event` (first-seen order). Counts stay session-level, not per-turn.
- One Markdown subsection per distinct `turn` that appears, in ascending turn-number order. No session-wide Events table. When no document has `turn` 0, omit a turn-0 subsection; do not invent an empty turn 0. Do not invent missing intermediate turns.
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind document (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s documents in file order with columns Time, Event, and Details only. Do not add a fourth column. Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present).
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind document.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind document `timestamp` (first prompt-kind in that turn’s file-order docs if more than one); end = the last document in the file that has `turn: n`. For turn **0**, start = the first document with `turn: 0`; end = the last document with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind document, start = the first document of that turn so Duration still emits.
- Details follow current `docs/normalized-fields.md` excluding `session_id`: session start empty; session end `reason`; subagent start `agent_type`, then `agent_display_name`, then `task`; subagent stop `agent_type`, then `agent_display_name`, then `response_text`; user prompt `prompt`; agent stop empty. Header-only / unmapped empty. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; `task` still Copilot/Claude-absent (F006); omit absent fields. Preview >80 chars → first 80 + `...`; ≤80 no ellipsis; newlines become spaces before the limit. The same preview rules apply to the per-turn prompt line.
- List subagent start and stop as ordinary chronological rows inside that turn’s table. Do not nest a subagent under a parent, and do not nest further inside a turn.
- When report generation fails: still persist F001/F003, exit 0, no blocking stdout.
- No YAML parsing library. No new CLI command. No new hook registrations. This F004 amend does not change hooks.json.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After persist returns, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the YAML header. They do **not** gate the Session report (any YAML-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged by this F004 amend. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F004.2** — THE SYSTEM SHALL produce the Session report by reading that session’s Session YAML log (all documents, in file order) and SHALL NOT re-sort those documents.
- [x] **AC-F004.4** — THE SYSTEM SHALL include the total number of YAML documents and a count for each distinct `source_event` value present in that file.
- [x] **AC-F004.17** — THE SYSTEM SHALL include one Markdown subsection per distinct `turn` value present in that Session YAML log, in ascending turn-number order, and SHALL NOT list every document in a single session-wide Events table; each subsection SHALL include that turn number and a Markdown table of that turn’s documents in file order with columns Time, Event, and Details, where Details are the normalized body fields for that `source_event` in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), omitted when absent, and empty when the document has no body fields; THE SYSTEM SHALL NOT add a fourth table column; WHEN no document has `turn` 0, THE SYSTEM SHALL omit a turn-0 subsection.
- [x] **AC-F004.18** — THE SYSTEM SHALL include in each turn subsection that turn’s duration as zero-padded `HH:MM:SS` elapsed clock time; WHEN turn is **n ≥ 1**, start SHALL be that turn’s prompt-kind document `timestamp` and end SHALL be the last document in the file that has `turn: n`; WHEN turn is **0**, start SHALL be the first document with `turn: 0` and end SHALL be the last document with `turn: 0`; THE SYSTEM SHALL NOT close a turn on `stop`, `agentStop`, `Stop`, `subagentStop`, or `SubagentStop`; WHEN the end timestamp is before the start or they are equal, THE SYSTEM SHALL write duration `00:00:00`.
- [x] **AC-F004.19** — WHEN a turn subsection is for turn **n ≥ 1**, THE SYSTEM SHALL include that turn’s prompt text from the prompt-kind document with that `turn`, using the same 80-character single-line preview rules as Details (AC-F004.6); WHEN `prompt` is absent from that document, THE SYSTEM SHALL omit the prompt line; WHEN the subsection is for turn **0**, THE SYSTEM SHALL NOT include a prompt line.
- [x] **AC-F004.6** — WHEN a Details field value has more than 80 characters, THE SYSTEM SHALL show the first 80 characters followed by `...`; WHEN it has 80 or fewer, THE SYSTEM SHALL NOT append an ellipsis; THE SYSTEM SHALL render each preview as a single line.
- [x] **AC-F004.7** — THE SYSTEM SHALL list subagent start and stop documents as ordinary rows in that chronological table and SHALL NOT nest them under a parent event.
- [x] **AC-F004.8** — THE SYSTEM SHALL write the Session report as Markdown with tables (not HTML) at `{session_id}.md` in the same daily folder as that session’s YAML and JSONL.
- [x] **AC-F004.9** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) when writing a Session report; WHEN report generation fails, THE SYSTEM SHALL still persist as F001 and F003 and SHALL NOT change that exit or stdout behavior.
- [x] **AC-F004.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies, including no YAML parsing library.
- [x] **AC-F004.11** — THE SYSTEM SHALL NOT read the Event log (JSONL) or the Session index in order to produce the Session report.
- [x] **AC-F004.13** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create a Session report.
- [x] **AC-F004.14** — WHEN ingest appends a Session YAML log document (the payload has a session identifier), THE SYSTEM SHALL, in that same invocation after that document is in the file, write a Session report for that session, including WHEN no session-end document (`sessionEnd` / `SessionEnd`) is present in that file.
- [x] **AC-F004.15** — THE SYSTEM SHALL include in the report `session_id` equal to the F001 identifier (the first document), `source_harness` from the last document, start time from the first document’s `timestamp`, end time from the last document’s `timestamp`, and duration as zero-padded `HH:MM:SS` elapsed clock time from that first timestamp to that last timestamp regardless of those documents’ `source_event`; THE SYSTEM SHALL NOT use Cursor `duration_ms` or any session-end-only field for duration; WHEN the last timestamp is before the first or they are equal, THE SYSTEM SHALL write duration `00:00:00`.
- [x] **AC-F004.16** — WHEN a later ingest appends another Session YAML log document for the same session the same day, THE SYSTEM SHALL overwrite `{session_id}.md` from the current Session YAML log and SHALL NOT append a second report.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F004.1 — Same invocation writes YAML and Session report on session-end positional | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.2 — Report table order matches YAML file order, not timestamp sort | redo | File order is now **within a turn table**. Existing file does not mention `## Events` but asserts one all-docs Time/Event/Details table. Assert order inside `## Turn 0`; no session-wide `## Events` |
| AC-F004.3 — Overview session_id, source_harness from triggering end, start/end/duration | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.4 — Event-count summary: total documents and per-source_event counts | keep | Counts stay session-level. Existing file asserts `Total:` and `\| source_event \| count \|` only — not `## Events` |
| AC-F004.5 — Details are mapped normalized body fields only | drop | Deprecated (v0.11.0): events grouped by turn (AC-F004.17). Delete `e2e/ac-f004.5-details-normalized-fields.test.ts`. Fold Details-field checks into AC-F004.17 Arrange. Do not leave an AC-F004.5 title |
| AC-F004.6 — Details preview: 80-character limit, ellipsis, single line | keep | Existing file does not mention `## Events`; finds the prompt Details cell in the first Time/Event/Details table (turn-0 table after this amend) |
| AC-F004.7 — Subagent start and stop are ordinary chronological rows | redo | Rows belong **inside the turn table**. Existing file asserts one 4-row all-docs table. Assert four ordinary rows in the Turn 0 table; no nesting; no `## Events` |
| AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML | keep | Existing file does not mention `## Events`; path and Markdown-tables (`\| Time \| Event \| Details \|`) still valid |
| AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure | keep | Existing file does not mention `## Events`. Failure fixture (`.md` as directory) still valid |
| AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies | keep | Existing file does not mention `## Events`. Smoke spawn still valid |
| AC-F004.11 — Report is produced from YAML only, not Event log or Session index | keep | Existing file does not mention `## Events`. Tamper jsonl/index then later ingest; report still matches YAML. With all docs `turn: 0`, the turn-0 table still has those two rows |
| AC-F004.12 — Later same-day sessionEnd overwrites `{session_id}.md` | drop | Already deprecated (v0.8.0). Stay drop. Matching test already gone |
| AC-F004.13 — No session identifier: F001 persist, no YAML, no Session report | keep | Existing file does not mention `## Events`. Still: no yaml, no md; Copilot `sessionId` is not an identifier |
| AC-F004.14 — Same invocation writes YAML and Session report after any YAML-appending ingest | keep | Existing file does not mention `## Events`. Report-after-every-YAML-append still holds |
| AC-F004.15 — Overview session_id, source_harness from last document, start/end/duration | keep | Existing file does not mention `## Events`. Session-level overview duration unchanged |
| AC-F004.16 — Later YAML append same session same day overwrites `{session_id}.md` | keep | Existing file does not mention `## Events`. Overwrite still holds; with all docs `turn: 0`, the turn-0 table row count still tracks YAML document count |

New scenarios (not in the prior plan): **AC-F004.17** (per-turn subsections; no `## Events`; Details mapping inside each turn table); **AC-F004.18** (turn-0 duration first→last turn-0 timestamp); **AC-F004.19** (no `Prompt:` line in the turn-0 subsection).

## Implementation Steps

### Step 1: AC-F004.2 — Report table order matches YAML file order, not timestamp sort
Several events for one session; the **turn** table rows follow YAML document file order even when payload timestamps would sort differently. Verifies AC-F004.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.2-report-table-file-order.test.ts`
- [x] Arrange: one fixture; same `session_id` `"sess-ac-f004-2"` for every payload. Choose Unix-ms `timestamp` values whose host-local `HH:MM:SS` would sort in a **different** order than ingest order (same pattern as `e2e/ac-f003.4-timestamp-hhmmss.test.ts`: format with local `getHours` / `getMinutes` / `getSeconds`, zero-padded). Example order: (1) extra argv `["cursor", "sessionStart"]` with a **later** clock time (e.g. 12:00:00); (2) extra argv `["cursor", "beforeSubmitPrompt"]` with an **earlier** clock time (e.g. 10:00:00) and a `prompt` so the row is identifiable; (3) extra argv `["cursor", "sessionEnd"]` with a middle or later clock time (e.g. 11:00:00) and `reason`. Do not register `beforeSubmitPrompt`. Snapshot YAML document count and each document’s `timestamp` / `source_event` (via `yamlDocuments` + `yamlMapping`) after the last spawn. Ingest writes `turn: 0` on every document — do not assert F008 numbering
- [x] Act: spawn the three ingests in that file order (title includes `AC-F004.2`)
- [x] Assert: YAML has exactly three documents in ingest order (`sessionStart`, `beforeSubmitPrompt`, `sessionEnd`) with the arranged timestamps; `{session_id}.md` exists; the report has `## Turn 0` (or equivalent) and does **not** contain `## Events`; the Turn 0 table has exactly three data rows in that **same** file order (Time/Event match YAML file order: 12:00:00 `sessionStart`, then 10:00:00 `beforeSubmitPrompt`, then 11:00:00 `sessionEnd`) — not sorted by Time; table columns are Time, Event, Details only (AC-F004.2)

---

### Step 2: AC-F004.4 — Event-count summary: total documents and per-source_event counts
Report includes the number of YAML documents and a breakdown of how many documents have each distinct `source_event` (session-level, not per-turn). Verifies AC-F004.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.4-event-count-summary.test.ts`
- [x] Arrange: one fixture; `session_id` `"sess-ac-f004-4"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` (with `prompt`); `["cursor", "beforeSubmitPrompt"]` again (repeat kind); `["cursor", "sessionEnd"]` (with `reason`). Four documents; `beforeSubmitPrompt` appears twice. Do not register `beforeSubmitPrompt`
- [x] Act: spawn the four ingests in order (title includes `AC-F004.4`)
- [x] Assert: YAML has four documents; the report states total document count **4** and a per-`source_event` breakdown that includes `sessionStart` 1, `beforeSubmitPrompt` 2, `sessionEnd` 1 (and no extra kinds) (AC-F004.4)

---

### Step 3: AC-F004.17 — One subsection per distinct turn; no session-wide Events table; Details in each turn table
Spawn several events for one session → report has `## Turn 0` (or equivalent), does **not** contain a session-wide `## Events` heading, each subsection table has exactly columns Time, Event, Details. Details are the current `docs/normalized-fields.md` body fields (fold former AC-F004.5 mapping checks here). Do not assert F008 numbering. Verifies AC-F004.17.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.17-turn-subsections.test.ts`
    - delete `e2e/ac-f004.5-details-normalized-fields.test.ts`
- [x] Arrange: isolated fixtures + `CURSOR_PROJECT_DIR`. Do not spawn Copilot or Claude processes; pass mapping names on argv. Each payload that must produce YAML includes a F001 session identifier. Keep Details values ≤80 characters so truncation is out of this AC (that is AC-F004.6). Do **not** plan F006 mapping-table exception cases as a separate AC (Copilot/Claude omit `task` is current mapping). Do **not** require ingest to omit turn 0 (cannot produce a file with no turn-0 docs until F008); that omit-empty-turn-0 rule is **cli unit-tested**. Cases (each title includes `AC-F004.17`; **no AC-F004.5 title**):
    1. Several events, one session — sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` (with `prompt`); `["cursor", "stop"]`. Three documents, all `turn: 0`. Report has `## Turn 0` (or equivalent). Does **not** contain `## Events`. Does **not** contain `## Turn 1`. The Turn 0 table has exactly three data rows in file order and exactly three columns (Time, Event, Details) — no fourth column, no Turn column
    2. Details mapped kinds inside the turn table — sequential: `sessionStart` (no body); `subagentStart` with `subagent_type` and Cursor `task`; `subagentStop` with `subagent_type` and `summary` (Cursor `response_text` source); `beforeSubmitPrompt` with `prompt`; `stop` (no body); `sessionEnd` with `reason`. Turn 0 table has six data rows. Details: sessionStart empty; subagentStart `agent_type: …; task: …` (no `agent_display_name` — Cursor has no source key); subagentStop `agent_type: …; response_text: …`; prompt `prompt: …`; stop empty; sessionEnd `reason: …`. `session_id` never appears in any Details cell. Do not assert `transcript_path`
    3. Copilot `agent_display_name` present — extra argv `["copilot", "subagentStart"]` with `agentName` and `agentDisplayName` (do not spawn Copilot). Details include `agent_type` then `agent_display_name`; omit `task` (Copilot has no `task` source key)
    4. Absent key omitted — `subagentStart` payload has `subagent_type` and **no** `task` key (Details `agent_type` only, no `task:`); `sessionEnd` payload has no `reason` key (Details empty, no `reason:`)
    5. Present null — `subagentStart` with `task: null` and `subagent_type` set. Details include `agent_type` and `task: null` (YAML `null` appears). Do not use `transcript_path`
    6. Header-only unrecognized — extra argv `["unknown-harness", "notAnEvent"]` with body-like extras (`reason`, `prompt`, `task`). Unrecognized row Details empty; extras do not leak into Details
    7. Pipe in a cell — `sessionEnd` `reason` contains `|` (e.g. `"completed|aborted"`). That table row still has exactly three cells (Time, Event, Details); the pipe does not split the row
- [x] Act: spawn each case (do not import `cli/src/**`; do not change `.cursor/hooks.json`)
- [x] Assert: no `## Events`; `## Turn 0` present when ingest wrote documents; no `## Turn 1` when ingest only wrote turn 0; each turn table header is exactly `| Time | Event | Details |`; Details use snake_case names in table order, `{name}: {value}` pairs separated by `; ` when multiple; subagent start lists `agent_type`, then `agent_display_name` when present, then `task` when present; omitted when absent; empty for sessionStart, agent stop, and header-only; YAML `null` appears; `session_id` not in Details; `|` stays inside one cell (AC-F004.17)

---

### Step 4: AC-F004.18 — Turn-0 duration is first turn-0 timestamp → last turn-0 timestamp
With all documents `turn: 0`, turn duration is first turn-0 timestamp → last turn-0 timestamp (same as session duration when every doc is turn 0). Assert `Duration: HH:MM:SS` in the turn subsection. Do not assert prompt-kind start (that is n ≥ 1, cli unit-tested until F008). Verifies AC-F004.18.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.18-turn-duration.test.ts`
- [x] Arrange: isolated fixtures. Payload `timestamp` is Unix-ms so YAML `HH:MM:SS` is deterministic. All documents will be `turn: 0`. Cases (each title includes `AC-F004.18`):
    1. Elapsed, all turn 0 — first extra argv `["cursor", "sessionStart"]` with earlier `timestamp` (e.g. 10:00:00); then extra argv `["cursor", "stop"]` with later `timestamp` (e.g. 11:01:02), same F001 `session_id`. Turn 0 duration equals session duration `01:01:02`. Do not close a turn on `stop` (both docs stay in Turn 0)
    2. Equal timestamps — two documents (`sessionStart` then `stop`) with the **same** `HH:MM:SS`. Turn 0 `Duration: 00:00:00`
- [x] Act: spawn each fixture’s ingests in order
- [x] Assert: each `exitCode === 0`; stdout empty. The Turn 0 subsection contains `Duration: 01:01:02` (case 1) or `Duration: 00:00:00` (case 2) as zero-padded `HH:MM:SS`. Case 1: that value matches session overview duration (every doc is turn 0). Do not assert a prompt-kind start for turn duration. Do not assert F008 numbering. Report has `## Turn 0` and no `## Events` (AC-F004.18)

---

### Step 5: AC-F004.19 — Turn-0 subsection has no Prompt: line
Ingest of turn 0 only → **no** `Prompt:` line in the turn-0 subsection. Prompt-in-turn-1 is cli unit-tested until F008. Verifies AC-F004.19.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.19-turn-prompt.test.ts`
- [x] Arrange: one fixture; `session_id` `"sess-ac-f004-19"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` with a distinctive `prompt` (e.g. `"turn-zero-prompt"`); `["cursor", "stop"]`. Ingest writes `turn: 0` even on the prompt document — do not assert F008 numbering. The Details cell may still contain `prompt: turn-zero-prompt`
- [x] Act: spawn the three ingests in order (title includes `AC-F004.19`)
- [x] Assert: report has `## Turn 0` (or equivalent) and does **not** contain `## Events`; the Turn 0 subsection has **no** `Prompt:` line (do not match a subsection heading/line `Prompt:`); Details may still show `prompt: …` on the `beforeSubmitPrompt` row. Do not spawn a turn ≥ 1. Prompt-in-turn-1 coverage is cli unit-tested until F008 (AC-F004.19)

---

### Step 6: AC-F004.6 — Details preview: 80-character limit, ellipsis, single line
A Details value longer than 80 characters is the first 80 characters plus `...`; 80 or fewer gets no ellipsis; newlines become spaces **before** the limit. Verifies AC-F004.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.6-details-preview-80-chars.test.ts`
- [x] Arrange: isolated fixtures; extra argv for a user-prompt ingest then `["cursor", "sessionEnd"]`. Cases (each title includes `AC-F004.6`):
    1. Over 80 — `prompt` is 81 `a` characters. Details must show 80 `a` then `...` (not 81 `a`, not `....`)
    2. Exactly 80 — `prompt` is 80 `a` characters. Details must show those 80 characters and **must not** contain `...`
    3. Newlines before the limit — `prompt` contains a newline such that the collapsed single line is longer than 80 (replace `\n` / `\r` with a space first, then apply the 80-character cut). Details must be a single line (no raw newline in the cell) and must use the collapsed prefix plus `...` when the collapsed length exceeds 80
- [x] Act: spawn each case
- [x] Assert: case 1 truncated at 80 + `...`; case 2 no ellipsis; case 3 single-line preview, spaces applied before the limit (AC-F004.6)

---

### Step 7: AC-F004.7 — Subagent start and stop are ordinary chronological rows inside the turn table
sessionStart + subagentStart + subagentStop + sessionEnd → four ordinary rows **inside that turn’s table**; no nesting or indentation as children. Verifies AC-F004.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.7-subagent-ordinary-rows.test.ts`
- [x] Arrange: one fixture. First: extra argv `["cursor", "sessionStart"]`, `session_id` `"sess-ac-f004-7"`. Second: extra argv `["cursor", "subagentStart"]`, no `session_id` / no `conversation_id`, `parent_conversation_id` `"sess-ac-f004-7"`, plus `subagent_type` (and optional `transcript_path`). Third: extra argv `["cursor", "subagentStop"]`, same F001 identifier (`session_id` or `parent_conversation_id` `"sess-ac-f004-7"`), plus stop body fields. Fourth: extra argv `["cursor", "sessionEnd"]`, `session_id` `"sess-ac-f004-7"`. Same sibling-identifier pattern as `e2e/ac-f003.6-subagent-sibling-document.test.ts`. Ingest writes `turn: 0` on every document
- [x] Act: spawn ingest four times in order (title includes `AC-F004.7`)
- [x] Assert: YAML has four independent documents; report has `## Turn 0` (or equivalent) and does **not** contain `## Events`; the Turn 0 table has exactly four data rows in file order (`sessionStart`, `subagentStart`, `subagentStop`, `sessionEnd`); subagent rows are ordinary chronological rows in that turn table, not nested, indented as children, or wrapped under a parent (`subagent` / `children` / `events` / leading spaces that mark a child row) (AC-F004.7)

---

### Step 8: AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML
File lives in the daily folder next to that session’s YAML and JSONL; content is Markdown tables; `<table>` is absent. Verifies AC-F004.8.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.8-markdown-file-not-html.test.ts`
- [x] Arrange: isolated fixture; extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f004-8"` and `reason`. Use `sessionReportPath` so the expected path is `{dayFolder}/{session_id}.md`
- [x] Act: spawn ingest (title includes `AC-F004.8`)
- [x] Assert: `{dayFolder}/sess-ac-f004-8.md` exists at that path (same folder as `events.jsonl` and `sess-ac-f004-8.yaml`); file content includes Markdown table markup (`|`); content does **not** include `<table` or `</table>` (case-insensitive); not HTML (AC-F004.8)

---

### Step 9: AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure
Normal YAML-appending ingest: exit 0, stdout empty. Report-failure: pre-create `{session_id}.md` as a **directory** so overwrite fails; still persist jsonl+yaml, exit 0, stdout empty. Verifies AC-F004.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.9-observe-only-report-failure.test.ts`
- [x] Arrange: two isolated fixtures; extra argv `["cursor", "sessionEnd"]`; payload has `session_id` and `reason`. Case A — normal write. Case B — `mkdir` `{dayFolder}/{session_id}.md` (a directory) before spawn so creating/overwriting the report file fails. Pre-create the day folder in case B so the directory can exist at the report path
- [x] Act: spawn ingest for each case (each title includes `AC-F004.9`)
- [x] Assert: both `exitCode === 0` and stdout empty (no blocking stdout). Case A: `{session_id}.md` is a file. Case B: Event log has exactly one parseable object line deep-equal to stdin; Session index includes that `session_id`; `{session_id}.yaml` exists with exactly one document beginning with `---`; the path `{session_id}.md` remains a directory (report write failed); F001/F003 writes were not undone (AC-F004.9)

---

### Step 10: AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies
Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty, no YAML library, no new binary. Verifies AC-F004.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.10-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [x] Arrange: repo root; load `cli/package.json`. Isolated fixture for the spawn smoke. Do not require `dist/audit-bot.exe` or a new `bin` name. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML library. Do not register extra Cursor events
- [x] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionEnd` with a JSON object that has `session_id` (title includes `AC-F004.10`)
- [x] Assert: `"type": "module"`; `"dependencies": {}` (so no `yaml` / `js-yaml` / other YAML parsing library); `engines.node` is a string that starts with `>=24`; spawn `exitCode === 0`, stdout empty, Event log + Session index + `{session_id}.yaml` + `{session_id}.md` all present from that existing entry (AC-F004.10)

---

### Step 11: AC-F004.11 — Report is produced from YAML only, not Event log or Session index
After writing YAML via ingest, tamper `events.jsonl` and/or `sessions.json` so they disagree with YAML; then a later YAML-appending ingest; the report must match YAML documents, not the tampered jsonl/index. Verifies AC-F004.11.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts`
- [x] Arrange: one fixture; `session_id` `"sess-ac-f004-11"`. First spawn extra argv `["cursor", "sessionStart"]` with a distinctive `timestamp`. Then **tamper** on disk (do not go through ingest): append an extra JSONL line to `events.jsonl` whose payload would look like another event (e.g. a `beforeSubmitPrompt` with a unique `prompt` `"tampered-from-jsonl"`) and rewrite `sessions.json` to include an extra identifier (e.g. `"tampered-session"`) and/or omit the real id. Then spawn extra argv `["cursor", "sessionEnd"]` with `reason` and a second distinctive `timestamp`. YAML after that has exactly two documents (`sessionStart`, `sessionEnd`) — the tampered JSONL line was never appended as YAML
- [x] Act: spawn sessionStart; tamper jsonl and index; spawn sessionEnd (title includes `AC-F004.11`)
- [x] Assert: YAML still has exactly two documents in file order; `{session_id}.md` turn table has exactly two data rows (`sessionStart`, `sessionEnd`) and does **not** contain `tampered-from-jsonl` or `tampered-session`; total document count in the report is 2, not 3; overview `session_id` is `"sess-ac-f004-11"` (AC-F004.11)

---

### Step 12: AC-F004.13 — No session identifier: F001 persist, no YAML, no Session report
Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) → Event log line exists; Session index unchanged; no `{dayFolder}/*.yaml`; no `{dayFolder}/*.md`. Verifies AC-F004.13.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.13-no-session-id-no-report.test.ts`
- [x] Arrange: two isolated fixtures; extra argv `["cursor", "sessionEnd"]` so a writer that treated `sessionId` as an identifier would create both YAML and `.md`. Payload has `sessionId` and no `session_id` / `conversation_id` / `parent_conversation_id` (optional `reason` / `hook_event_name`). Case A — first use of the day folder. Case B — day folder pre-seeded with `sessions.json` `["keep-me"]`. Same identifier pattern as `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`
- [x] Act: spawn ingest for each case (each title includes `AC-F004.13`)
- [x] Assert: both `exitCode === 0`; stdout empty; Event log has exactly one parseable object line deep-equal to that case’s stdin; (A) `sessions.json` is `[]`; (B) `sessions.json` remains `["keep-me"]`; `{dayFolder}/*.yaml` is absent; `{dayFolder}/*.md` is absent — no invented identifier, no file named for `sessionId` (AC-F004.13)

---

### Step 13: AC-F004.14 — Same invocation writes YAML and Session report after any YAML-appending ingest
Spawn ingest with a session identifier → F001 persist plus one YAML document and `{session_id}.md` in the dated folder, same process, same invocation, including when no session-end document is in the file. Also still true for `sessionEnd`. Verifies AC-F004.14.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at each. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not register `stop`. Do not infer the report trigger from the payload. Cases (each title includes `AC-F004.14`):
    1. Extra argv `["cursor", "sessionStart"]`; payload has `session_id` e.g. `"sess-ac-f004-14-start"`. No session-end document in the file
    2. Extra argv `["cursor", "stop"]`; payload has `session_id` e.g. `"sess-ac-f004-14-stop"`. No session-end document in the file (`stop` is a fixture only; F006 owns registration)
    3. Extra argv `["cursor", "sessionEnd"]`; payload has `session_id` e.g. `"sess-ac-f004-14-end"` and `reason` — still true for session-end
- [x] Act: spawn each case (do not import `cli/src/**`)
- [x] Assert: each case `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` overlay); `{dayFolder}/sessions.json` includes that `session_id`; `{dayFolder}/{session_id}.yaml` exists with exactly one document beginning with `---`; `{dayFolder}/{session_id}.md` exists. Cases 1 and 2: YAML `source_event` is not `sessionEnd` / `SessionEnd` (AC-F004.14)

---

### Step 14: AC-F004.15 — Overview session_id, source_harness from last document, start/end/duration
Report overview uses `session_id` from the first document; `source_harness` from the **last** document (the ingest that just ran); start = first YAML `timestamp`; end = last YAML `timestamp`; duration zero-padded `HH:MM:SS` first→last regardless of `source_event`. Must not require sessionEnd. Must not use `duration_ms`. Last-before-first and equal timestamps both yield `00:00:00`. Verifies AC-F004.15.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.15-overview-times-and-duration.test.ts`
- [x] Arrange: three isolated fixtures. Payload `timestamp` is Unix-ms so YAML `HH:MM:SS` is deterministic (do not rely on generate-on-receive). Do **not** use `sessionEnd` / `SessionEnd` as the last (or only) event. Cases (each title includes `AC-F004.15`):
    1. Normal elapsed, two harnesses, no sessionEnd — first extra argv `["cursor", "sessionStart"]` with earlier `timestamp` (e.g. 10:00:00); then extra argv `["copilot", "stop"]` (do not spawn Copilot; do not register `stop`) with later `timestamp` (e.g. 11:01:02), same F001 `session_id`, plus a misleading Cursor `duration_ms` (e.g. `9999999`) that would disagree if used. Overview `source_harness` must be `copilot` from the last document, not `cursor` from the first. Expected duration `01:01:02`
    2. Last before first — first extra argv `["cursor", "sessionStart"]` with a **later** `timestamp` (e.g. 14:00:00); then extra argv `["cursor", "beforeSubmitPrompt"]` with an **earlier** `timestamp` (e.g. 10:00:00) and a `prompt`. File order keeps the later time first. Expected duration `00:00:00`
    3. Equal timestamps — two documents (`sessionStart` then `stop`) with the **same** `HH:MM:SS`. Expected duration `00:00:00`
- [x] Act: spawn each fixture’s ingests in order; last spawn is not session-end
- [x] Assert: each `exitCode === 0`; stdout empty. Overview contains that `session_id`; `source_harness` equals the last YAML document’s header (case 1: `copilot`); start time equals the first YAML document’s `timestamp`; end time equals the last YAML document’s `timestamp`; duration is zero-padded `HH:MM:SS`. Case 1: duration `01:01:02` (not a value derived from `duration_ms`). Cases 2 and 3: duration `00:00:00`. YAML has no session-end document. Do not reconstruct across days (all documents are this fixture’s calendar day) (AC-F004.15)

---

### Step 15: AC-F004.16 — Later YAML append same session same day overwrites `{session_id}.md`
Two sequential YAML-appending ingests for the same session the same day (not only a later sessionEnd): `.md` is overwritten (not two reports concatenated); the later report’s table row count matches YAML document count. Verifies AC-F004.16.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.16-overwrite-same-day-report.test.ts`
- [x] Arrange: one fixture; `session_id` `"sess-ac-f004-16"`. Sequence: extra argv `["cursor", "sessionStart"]`; extra argv `["cursor", "beforeSubmitPrompt"]` with `prompt` `"second-event"`; extra argv `["cursor", "stop"]` with a distinctive field that stays on JSONL only (optional). Do **not** use a later `sessionEnd` as the overwrite trigger. Snapshot the `.md` bytes (or text) after the first ingest. Snapshot YAML document count after each spawn
- [x] Act: spawn in that order (title includes `AC-F004.16`)
- [x] Assert: after the first ingest the report exists and its table has **one** data row matching YAML document count 1; after the second ingest `{session_id}.md` still exists as a single file; content is **not** the first report concatenated with a second (the first snapshot is not a prefix of two concatenated reports; no duplicated overview blocks); the overwritten report’s table has **two** data rows matching YAML document count 2 (`sessionStart`, `beforeSubmitPrompt`) including `second-event`; after the third ingest table row count equals YAML document count **3** and the file is still one report (AC-F004.16)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F003.
- Did not run `node --test e2e/*.test.ts` (e2e codify is compile/lint only; caller forbade the suite). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001/F002/F003).
- AC-F004.19 file is `e2e/ac-f004.19-turn-prompt.test.ts` (caller), not `ac-f004.19-turn-0-no-prompt-line.test.ts`. Extended `e2e/spawn.ts` with `turnSubsection` (default `extraArgv` unchanged).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. Markdown report path helpers already exist. Do not break F001, F002, F003, F005, F006, or F007 spawn tests.
- YAML and Markdown in tests are observed as text (split YAML on `---`, read keys in order; assert Markdown tables as strings). No YAML library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude mapping and `stop` are exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier; cases that need YAML/report still include `session_id` (or `conversation_id` / `parent_conversation_id`).
- Do not add or remove Cursor hooks in this plan. This amend does not change `.cursor/hooks.json`. Prompt and agent-stop mapping are spawned as ingest extra argv only. F006 owns `stop` registration and the `task` mapping-table exception; this plan only uses `stop` / `task` as fixtures.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- Ingest currently writes `turn: 0` (F008 later). E2e does not assert F008 numbering, prompt-kind start for turn duration (n ≥ 1), or prompt-in-turn-1. Omit-empty-turn-0 is cli unit-tested.
- This container does not set spec status to `planned` (parent coordinates). Spec status stays `pending`.
- Did not git commit (caller instruction).
- Drop of AC-F004.5 authorizes `/codify` to delete `e2e/ac-f004.5-details-normalized-fields.test.ts` and replace coverage in `e2e/ac-f004.17-turn-subsections.test.ts`. Drop of AC-F004.1 / AC-F004.3 / AC-F004.12 already authorized deletion of those files (already gone).

---

> last updated: 2026-09-01T20:46:53Z
