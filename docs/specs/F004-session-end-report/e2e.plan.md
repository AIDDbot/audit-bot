---
spec-kind: functional
container: e2e
---
# F004-session-end-report - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals. Persistence stays F001 and F003: verbatim Event log, Session index rules, append-only Session YAML log, exit 0, no blocking stdout. When the F002 `source_event` positional is the session-end kind (`sessionEnd` or `SessionEnd`) and the payload has a F001 session identifier, the same invocation also writes `{session_id}.md` in that day’s folder, produced only from that session’s Session YAML log after the session-end YAML document is in the file. Source arguments are used for the YAML header and for the Session report gate; they are not written onto the Event log line. Cursor registration stays the four F003 shell commands. Do not add a report hook. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, or F003. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (first e2e plan for F004):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. F002 and F003 spawn tests also remain valid. **Do not break F001, F002, or F003 spawn tests.** Extend with Markdown report path helpers if needed (`sessionReportPath`, `readSessionReport`, `listMdFiles`); do not change the default `extraArgv` behavior. Existing YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`, `listYamlFiles`) stay as they are
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F004.1 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not register extra Cursor events. Do not spawn Copilot or Claude processes. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names so YAML (and thus the report table) contains those kinds
- When a YAML file (and thus a report) is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F004.13)
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify

### Shared store wording

> Copied verbatim for the cli sibling. Event log, Session index, project root, and day folder stay as F001. Session YAML log stays as F003. Concurrency now covers reading that YAML to write the Session report. Argv now passes harness/event into ingest for YAML **and** the Session report gate.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the four header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Always a `.md` file named for the F001 session identifier. Markdown with tables, never HTML. One file per session for which a session-end kind was ingested that day.
- An ingest may write a Session report **only if** the F002 `source_event` positional is the session-end kind (`sessionEnd` or `SessionEnd`) **and** the event has a session identifier. Do **not** infer session-end from the JSONL payload (not from `hook_event_name` or any other payload key).
- When those conditions hold, write the Session report in the **same invocation**, **after** the session-end YAML document is in that session’s Session YAML log — no second process, no new user-facing report command.
- Produce the report **only from** that session’s Session YAML log (every document, in file order). Do **not** read the Event log or the Session index to produce it. Do **not** re-sort documents.
- When the payload has no session identifier: do not create a Session report (and F003 writes no YAML).
- When a later session-end kind arrives for the same session the same day: **overwrite** `{session_id}.md` from the YAML as it then stands. Do **not** append a second report in that file.
- Overview: `session_id` (the F001 identifier); `source_harness` from the **triggering session-end document**; start time (first document’s `timestamp`); end time (last document’s `timestamp`); total duration.
- Start time, end time, and duration are always from the documents in that day’s Session YAML log (the folder’s calendar day). Do **not** reconstruct across days.
- Duration is elapsed clock time on that calendar day, displayed as zero-padded `HH:MM:SS`, computed from the first and last `HH:MM:SS` timestamps. When the last timestamp is **before** the first, duration is `00:00:00`. When they are equal, duration is `00:00:00`.
- Event-count summary: the number of YAML documents, and a breakdown of how many documents have each distinct `source_event` value.
- Chronological event list: a Markdown table with one row per YAML document, in file order, columns Time (`timestamp`), Event (`source_event`), and Details (relevant normalized body fields).
- Details may include **only** the normalized common body fields for that event kind in `docs/normalized-fields.md`, excluding `session_id` (already in the overview and YAML header), using those snake_case names, in table order, omitting fields absent from the document. Present values including YAML `null` appear. Multiple present fields in one cell are `{name}: {value}` pairs in table order, separated by `; `.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`) — Details empty; session end (`sessionEnd` / `SessionEnd`) — `reason`; subagent start (`subagentStart` / `SubagentStart`) — `agent_type`, `transcript_path`; subagent stop (`subagentStop` / `SubagentStop`) — `agent_type`, `transcript_path`, `response_text`; user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`) — `prompt`; agent stop (`stop` / `agentStop` / `Stop`) — `transcript_path`. When the document is header-only (F003 unmapped harness or event), Details is empty.
- A Details value longer than 80 characters appears as the first 80 characters followed by an ellipsis (`...`). A value of 80 characters or fewer must **not** receive an ellipsis. A preview is always a single line (newlines in the source value are spaces **before** the limit is applied).
- List subagent start and stop as ordinary chronological rows. Do **not** nest a subagent under a parent.
- A table cell must remain one cell even when a field value contains `|`, newlines, or other Markdown-significant characters.
- When Session report generation **fails**, still persist as F001 and F003, still exit 0, and do not write blocking stdout.
- Node builtins only: no YAML parsing library. The report must accept the Session YAML log as F003 writes it (fixed-structure multi-document key-value YAML).

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them **and** so the Session report gate can use `source_event` (`sessionEnd` or `SessionEnd`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — unchanged from F003. Project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` only. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register prompt, stop, tool-use, Tab, `workspaceOpen`, or other Cursor events. YAML mapping for prompt and agent-stop still applies if those events are received via ingest. F001’s four Cursor registrations already include `sessionEnd`; do not add a report hook.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [ ] **AC-F004.1** — WHEN ingest is invoked with F002 source-event positional `sessionEnd` or `SessionEnd` and the payload has a session identifier, THE SYSTEM SHALL, in that same invocation after the corresponding Session YAML log document is in the file, write a Session report for that session.
- [ ] **AC-F004.2** — THE SYSTEM SHALL produce the Session report by reading that session’s Session YAML log (all documents, in file order) and SHALL NOT re-sort those documents.
- [ ] **AC-F004.3** — THE SYSTEM SHALL include in the report `session_id`, `source_harness` from the triggering session-end document, start time from the first document’s `timestamp`, end time from the last document’s `timestamp`, and duration as zero-padded `HH:MM:SS` elapsed on that calendar day; WHEN the last timestamp is before the first, THE SYSTEM SHALL write duration `00:00:00`.
- [ ] **AC-F004.4** — THE SYSTEM SHALL include the total number of YAML documents and a count for each distinct `source_event` value present in that file.
- [ ] **AC-F004.5** — THE SYSTEM SHALL list every YAML document in file order as a Markdown table with Time, Event, and Details, where Details are the normalized body fields for that `source_event` in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), omitted when absent, and empty when the document has no body fields.
- [ ] **AC-F004.6** — WHEN a Details field value has more than 80 characters, THE SYSTEM SHALL show the first 80 characters followed by `...`; WHEN it has 80 or fewer, THE SYSTEM SHALL NOT append an ellipsis; THE SYSTEM SHALL render each preview as a single line.
- [ ] **AC-F004.7** — THE SYSTEM SHALL list subagent start and stop documents as ordinary rows in that chronological table and SHALL NOT nest them under a parent event.
- [ ] **AC-F004.8** — THE SYSTEM SHALL write the Session report as Markdown with tables (not HTML) at `{session_id}.md` in the same daily folder as that session’s YAML and JSONL.
- [ ] **AC-F004.9** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) when writing a Session report; WHEN report generation fails, THE SYSTEM SHALL still persist as F001 and F003 and SHALL NOT change that exit or stdout behavior.
- [ ] **AC-F004.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies, including no YAML parsing library.
- [ ] **AC-F004.11** — THE SYSTEM SHALL NOT read the Event log (JSONL) or the Session index in order to produce the Session report.
- [ ] **AC-F004.12** — WHEN a later session-end kind is ingested for the same session the same day, THE SYSTEM SHALL overwrite `{session_id}.md` from the current Session YAML log and SHALL NOT append a second report.
- [ ] **AC-F004.13** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create a Session report.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| first | keep | First e2e plan for F004; no prior scenarios to classify |

## Implementation Steps

### Step 1: AC-F004.1 — Same invocation writes YAML and Session report on session-end positional
Spawn ingest as `ingest cursor sessionEnd` with a JSON object that has a session identifier → F001 persist plus one YAML document and `{session_id}.md` in the dated folder, same process, same invocation. Also cover `SessionEnd`. Do not infer session-end from the payload. Verifies AC-F004.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.1-same-invocation-yaml-and-report.test.ts`
- [ ] Arrange: extend `e2e/spawn.ts` with additive Markdown helpers (`sessionReportPath`, `readSessionReport`, `listMdFiles`). Do not change `spawnIngest` default (no extra argv) so F001 callers stay `["ingest"]` only. Isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at each. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Cases (each title includes `AC-F004.1`):
    1. Extra argv `["cursor", "sessionEnd"]`; payload has `session_id` e.g. `"sess-ac-f004-1"` and `reason`
    2. Extra argv `["claude-code", "SessionEnd"]`; payload has `session_id` e.g. `"sess-ac-f004-1-claude"` and `reason` (cheap cover of the other session-end positional)
    3. Negative — extra argv `["cursor", "sessionStart"]`; payload has `session_id` e.g. `"sess-ac-f004-1-no-infer"`, `hook_event_name: "sessionEnd"`, and `reason`. A writer that inferred session-end from the payload would write `.md`
- [ ] Act: spawn each case (do not import `cli/src/**`)
- [ ] Assert: cases 1 and 2: `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` overlay); `{dayFolder}/sessions.json` includes that `session_id`; `{dayFolder}/{session_id}.yaml` exists with exactly one document beginning with `---`; `{dayFolder}/{session_id}.md` exists. Case 3: `exitCode === 0`; stdout empty; Event log + Session index + YAML as F001/F003; `{session_id}.md` is **absent** (AC-F004.1)

---

### Step 2: AC-F004.2 — Report table order matches YAML file order, not timestamp sort
Several events then sessionEnd; chronological table rows follow YAML document file order even when payload timestamps would sort differently. Verifies AC-F004.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.2-report-table-file-order.test.ts`
- [ ] Arrange: one fixture; same `session_id` `"sess-ac-f004-2"` for every payload. Choose Unix-ms `timestamp` values whose host-local `HH:MM:SS` would sort in a **different** order than ingest order (same pattern as `e2e/ac-f003.4-timestamp-hhmmss.test.ts`: format with local `getHours` / `getMinutes` / `getSeconds`, zero-padded). Example order: (1) extra argv `["cursor", "sessionStart"]` with a **later** clock time (e.g. 12:00:00); (2) extra argv `["cursor", "beforeSubmitPrompt"]` with an **earlier** clock time (e.g. 10:00:00) and a `prompt` so the row is identifiable; (3) extra argv `["cursor", "sessionEnd"]` with a middle or later clock time (e.g. 11:00:00) and `reason`. Do not register `beforeSubmitPrompt`. Snapshot YAML document count and each document’s `timestamp` / `source_event` (via `yamlDocuments` + `yamlMapping`) after the last spawn
- [ ] Act: spawn the three ingests in that file order; the last spawn is `sessionEnd` (title includes `AC-F004.2`)
- [ ] Assert: YAML has exactly three documents in ingest order (`sessionStart`, `beforeSubmitPrompt`, `sessionEnd`) with the arranged timestamps; `{session_id}.md` exists; the Markdown event table has exactly three data rows in that **same** order (Time/Event match YAML file order: 12:00:00 `sessionStart`, then 10:00:00 `beforeSubmitPrompt`, then 11:00:00 `sessionEnd`) — not sorted by Time (AC-F004.2)

---

### Step 3: AC-F004.3 — Overview session_id, source_harness from triggering end, start/end/duration
Report overview uses `session_id`; `source_harness` from the triggering session-end document (not the first document); start = first YAML `timestamp`; end = last YAML `timestamp`; duration zero-padded `HH:MM:SS`. Last-before-first and equal timestamps both yield `00:00:00`. Verifies AC-F004.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.3-overview-times-and-duration.test.ts`
- [ ] Arrange: three isolated fixtures. Payload `timestamp` is Unix-ms so YAML `HH:MM:SS` is deterministic (do not rely on generate-on-receive). Cases (each title includes `AC-F004.3`):
    1. Normal elapsed — first extra argv `["cursor", "sessionStart"]` with earlier `timestamp` (e.g. 10:00:00); then extra argv `["copilot", "sessionEnd"]` (do not spawn Copilot) with later `timestamp` (e.g. 11:01:02), same F001 `session_id`, plus Copilot `reason`. Overview `source_harness` must be `copilot` from the triggering end document, not `cursor` from the first. Expected duration `01:01:02`
    2. Last before first — first extra argv `["cursor", "sessionStart"]` with a **later** `timestamp` (e.g. 14:00:00); then extra argv `["cursor", "sessionEnd"]` with an **earlier** `timestamp` (e.g. 10:00:00). File order keeps the later time first. Expected duration `00:00:00`
    3. Equal timestamps — two documents (sessionStart then sessionEnd) with the **same** `HH:MM:SS`. Expected duration `00:00:00`
- [ ] Act: spawn each fixture’s ingests in order; last spawn is session-end
- [ ] Assert: each `exitCode === 0`; stdout empty. Overview contains that `session_id`; start time equals the first YAML document’s `timestamp`; end time equals the last YAML document’s `timestamp`; duration is zero-padded `HH:MM:SS`. Case 1: `source_harness` is `copilot`; duration `01:01:02`. Cases 2 and 3: duration `00:00:00`. Do not reconstruct across days (all documents are this fixture’s calendar day) (AC-F004.3)

---

### Step 4: AC-F004.4 — Event-count summary: total documents and per-source_event counts
Report includes the number of YAML documents and a breakdown of how many documents have each distinct `source_event`. Verifies AC-F004.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.4-event-count-summary.test.ts`
- [ ] Arrange: one fixture; `session_id` `"sess-ac-f004-4"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "beforeSubmitPrompt"]` (with `prompt`); `["cursor", "beforeSubmitPrompt"]` again (repeat kind); `["cursor", "sessionEnd"]` (with `reason`). Four documents; `beforeSubmitPrompt` appears twice. Do not register `beforeSubmitPrompt`
- [ ] Act: spawn the four ingests in order (title includes `AC-F004.4`)
- [ ] Assert: YAML has four documents; the report states total document count **4** and a per-`source_event` breakdown that includes `sessionStart` 1, `beforeSubmitPrompt` 2, `sessionEnd` 1 (and no extra kinds) (AC-F004.4)

---

### Step 5: AC-F004.5 — Details are mapped normalized body fields only
Chronological Markdown table: Time, Event, Details. Details are the normalized body fields for that `source_event` in [`docs/normalized-fields.md`](../../normalized-fields.md), excluding `session_id`, omitted when absent, empty when the document has no body, YAML `null` present. Verifies AC-F004.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.5-details-normalized-fields.test.ts`
- [ ] Arrange: isolated fixtures + `CURSOR_PROJECT_DIR`. Do not spawn Copilot or Claude processes; pass mapping names on argv. Each payload that must produce YAML includes a F001 session identifier. End each fixture that needs a report with extra argv `["cursor", "sessionEnd"]` (or include sessionEnd as the case under test). Keep Details values ≤80 characters so truncation is out of this AC (that is AC-F004.6). Cases (each title includes `AC-F004.5`):
    1. Mapped kinds in one session — sequential: `sessionStart` (no body); `subagentStart` with `subagent_type` and `transcript_path`; `subagentStop` with `subagent_type`, `transcript_path`, `summary` (Cursor `response_text` source); `beforeSubmitPrompt` with `prompt`; `stop` with `transcript_path`; `sessionEnd` with `reason`. Table has six data rows. Details: sessionStart empty; subagentStart `agent_type: …; transcript_path: …`; subagentStop `agent_type: …; transcript_path: …; response_text: …`; prompt `prompt: …`; stop `transcript_path: …`; sessionEnd `reason: …`. `session_id` never appears in any Details cell
    2. Absent key omitted — `sessionEnd` payload has no `reason` key. Session-end row Details empty (no `reason:`)
    3. Present null — `subagentStart` with `transcript_path: null` and `subagent_type` set, then `sessionEnd`. Details include `transcript_path: null` (YAML `null` appears) and `agent_type`
    4. Header-only unrecognized — extra argv `["unknown-harness", "notAnEvent"]` with body-like extras (`reason`, `prompt`), then `["cursor", "sessionEnd"]`. Unrecognized row Details empty; extras do not leak into Details
    5. Pipe in a cell — `sessionEnd` `reason` contains `|` (e.g. `"completed|aborted"`). That table row still has exactly three cells (Time, Event, Details); the pipe does not split the row
- [ ] Act: spawn each case (do not import `cli/src/**`; do not change `.cursor/hooks.json`)
- [ ] Assert: table columns are Time, Event, Details; Details use snake_case names in table order, `{name}: {value}` pairs separated by `; ` when multiple; omitted when absent; empty for sessionStart and header-only; YAML `null` appears; `session_id` not in Details; `|` stays inside one cell (AC-F004.5)

---

### Step 6: AC-F004.6 — Details preview: 80-character limit, ellipsis, single line
A Details value longer than 80 characters is the first 80 characters plus `...`; 80 or fewer gets no ellipsis; newlines become spaces **before** the limit. Verifies AC-F004.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.6-details-preview-80-chars.test.ts`
- [ ] Arrange: isolated fixtures; extra argv for a user-prompt ingest then `["cursor", "sessionEnd"]` so the report exists. Cases (each title includes `AC-F004.6`):
    1. Over 80 — `prompt` is 81 `a` characters. Details must show 80 `a` then `...` (not 81 `a`, not `....`)
    2. Exactly 80 — `prompt` is 80 `a` characters. Details must show those 80 characters and **must not** contain `...`
    3. Newlines before the limit — `prompt` contains a newline such that the collapsed single line is longer than 80 (replace `\n` / `\r` with a space first, then apply the 80-character cut). Details must be a single line (no raw newline in the cell) and must use the collapsed prefix plus `...` when the collapsed length exceeds 80
- [ ] Act: spawn each case
- [ ] Assert: case 1 truncated at 80 + `...`; case 2 no ellipsis; case 3 single-line preview, spaces applied before the limit (AC-F004.6)

---

### Step 7: AC-F004.7 — Subagent start and stop are ordinary chronological rows
sessionStart + subagentStart + subagentStop + sessionEnd → four table rows; no nesting or indentation as children. Verifies AC-F004.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.7-subagent-ordinary-rows.test.ts`
- [ ] Arrange: one fixture. First: extra argv `["cursor", "sessionStart"]`, `session_id` `"sess-ac-f004-7"`. Second: extra argv `["cursor", "subagentStart"]`, no `session_id` / no `conversation_id`, `parent_conversation_id` `"sess-ac-f004-7"`, plus `subagent_type` (and optional `transcript_path`). Third: extra argv `["cursor", "subagentStop"]`, same F001 identifier (`session_id` or `parent_conversation_id` `"sess-ac-f004-7"`), plus stop body fields. Fourth: extra argv `["cursor", "sessionEnd"]`, `session_id` `"sess-ac-f004-7"`. Same sibling-identifier pattern as `e2e/ac-f003.6-subagent-sibling-document.test.ts`
- [ ] Act: spawn ingest four times in order (title includes `AC-F004.7`)
- [ ] Assert: YAML has four independent documents; `{session_id}.md` event table has exactly four data rows in file order (`sessionStart`, `subagentStart`, `subagentStop`, `sessionEnd`); subagent rows are not nested, indented as children, or wrapped under a parent (`subagent` / `children` / `events` / leading spaces that mark a child row) (AC-F004.7)

---

### Step 8: AC-F004.8 — Session report is `{session_id}.md` Markdown tables, not HTML
File lives in the daily folder next to that session’s YAML and JSONL; content is Markdown tables; `<table>` is absent. Verifies AC-F004.8.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.8-markdown-file-not-html.test.ts`
- [ ] Arrange: isolated fixture; extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f004-8"` and `reason`. Use `sessionReportPath` so the expected path is `{dayFolder}/{session_id}.md`
- [ ] Act: spawn ingest (title includes `AC-F004.8`)
- [ ] Assert: `{dayFolder}/sess-ac-f004-8.md` exists at that path (same folder as `events.jsonl` and `sess-ac-f004-8.yaml`); file content includes Markdown table markup (`|`); content does **not** include `<table` or `</table>` (case-insensitive); not HTML (AC-F004.8)

---

### Step 9: AC-F004.9 — Observe-only: exit 0 and empty stdout, including report failure
Normal sessionEnd: exit 0, stdout empty. Report-failure: pre-create `{session_id}.md` as a **directory** so overwrite fails; still persist jsonl+yaml, exit 0, stdout empty. Verifies AC-F004.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.9-observe-only-report-failure.test.ts`
- [ ] Arrange: two isolated fixtures; extra argv `["cursor", "sessionEnd"]`; payload has `session_id` and `reason`. Case A — normal write. Case B — `mkdir` `{dayFolder}/{session_id}.md` (a directory) before spawn so creating/overwriting the report file fails. Pre-create the day folder in case B so the directory can exist at the report path
- [ ] Act: spawn ingest for each case (each title includes `AC-F004.9`)
- [ ] Assert: both `exitCode === 0` and stdout empty (no blocking stdout). Case A: `{session_id}.md` is a file. Case B: Event log has exactly one parseable object line deep-equal to stdin; Session index includes that `session_id`; `{session_id}.yaml` exists with exactly one document beginning with `---`; the path `{session_id}.md` remains a directory (report write failed); F001/F003 writes were not undone (AC-F004.9)

---

### Step 10: AC-F004.10 — Existing Node ESM ingest, no extra runtime dependencies
Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty, no YAML library, no new binary. Verifies AC-F004.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.10-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [ ] Arrange: repo root; load `cli/package.json`. Isolated fixture for the spawn smoke. Do not require `dist/audit-bot.exe` or a new `bin` name. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML library. Do not register extra Cursor events
- [ ] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionEnd` with a JSON object that has `session_id` (title includes `AC-F004.10`)
- [ ] Assert: `"type": "module"`; `"dependencies": {}` (so no `yaml` / `js-yaml` / other YAML parsing library); `engines.node` is a string that starts with `>=24`; spawn `exitCode === 0`, stdout empty, Event log + Session index + `{session_id}.yaml` + `{session_id}.md` all present from that existing entry (AC-F004.10)

---

### Step 11: AC-F004.11 — Report is produced from YAML only, not Event log or Session index
After writing YAML via ingest, tamper `events.jsonl` and/or `sessions.json` so they disagree with YAML; then sessionEnd; the report must match YAML documents, not the tampered jsonl/index. Verifies AC-F004.11.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts`
- [ ] Arrange: one fixture; `session_id` `"sess-ac-f004-11"`. First spawn extra argv `["cursor", "sessionStart"]` with a distinctive `timestamp`. Then **tamper** on disk (do not go through ingest): append an extra JSONL line to `events.jsonl` whose payload would look like another event (e.g. a `beforeSubmitPrompt` with a unique `prompt` `"tampered-from-jsonl"`) and rewrite `sessions.json` to include an extra identifier (e.g. `"tampered-session"`) and/or omit the real id. Then spawn extra argv `["cursor", "sessionEnd"]` with `reason` and a second distinctive `timestamp`. YAML after that has exactly two documents (`sessionStart`, `sessionEnd`) — the tampered JSONL line was never appended as YAML
- [ ] Act: spawn sessionStart; tamper jsonl and index; spawn sessionEnd (title includes `AC-F004.11`)
- [ ] Assert: YAML still has exactly two documents in file order; `{session_id}.md` event table has exactly two data rows (`sessionStart`, `sessionEnd`) and does **not** contain `tampered-from-jsonl` or `tampered-session`; total document count in the report is 2, not 3; overview `session_id` is `"sess-ac-f004-11"` (AC-F004.11)

---

### Step 12: AC-F004.12 — Later same-day sessionEnd overwrites `{session_id}.md`
Two sequential sessionEnd for the same session the same day: `.md` is overwritten (not two reports concatenated); the second report reflects YAML as it then stands (more documents). Verifies AC-F004.12.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.12-overwrite-same-day-report.test.ts`
- [ ] Arrange: one fixture; `session_id` `"sess-ac-f004-12"`. Sequence: extra argv `["cursor", "sessionStart"]`; extra argv `["cursor", "sessionEnd"]` with `reason` `"first-end"`; extra argv `["cursor", "beforeSubmitPrompt"]` with `prompt` `"after-first-end"`; extra argv `["cursor", "sessionEnd"]` with `reason` `"second-end"`. Snapshot the `.md` bytes (or text) after the first sessionEnd
- [ ] Act: spawn in that order (title includes `AC-F004.12`)
- [ ] Assert: after the first sessionEnd the report exists and its table has two data rows; after the second sessionEnd `{session_id}.md` still exists as a single file; content is **not** the first report concatenated with a second (the first snapshot is not a prefix of two concatenated reports; no duplicated overview blocks); the overwritten report’s table has **four** data rows matching YAML as it then stands (`sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `sessionEnd`) including `after-first-end` and `second-end` (AC-F004.12)

---

### Step 13: AC-F004.13 — No session identifier: F001 persist, no YAML, no Session report
Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) and extra argv `["cursor", "sessionEnd"]` (or copilot) → Event log line exists; Session index unchanged; no `{dayFolder}/*.yaml`; no `{dayFolder}/*.md`. Verifies AC-F004.13.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f004.13-no-session-id-no-report.test.ts`
- [ ] Arrange: extend `listMdFiles` if needed. Two isolated fixtures; extra argv `["cursor", "sessionEnd"]` so a writer that treated `sessionId` as an identifier **and** saw a session-end positional would create both YAML and `.md`. Payload has `sessionId` and no `session_id` / `conversation_id` / `parent_conversation_id` (optional `reason` / `hook_event_name`). Case A — first use of the day folder. Case B — day folder pre-seeded with `sessions.json` `["keep-me"]`. Same identifier pattern as `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`
- [ ] Act: spawn ingest for each case (each title includes `AC-F004.13`)
- [ ] Assert: both `exitCode === 0`; stdout empty; Event log has exactly one parseable object line deep-equal to that case’s stdin; (A) `sessions.json` is `[]`; (B) `sessions.json` remains `["keep-me"]`; `{dayFolder}/*.yaml` is absent; `{dayFolder}/*.md` is absent — no invented identifier, no file named for `sessionId` (AC-F004.13)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F003.
- Did not run `node --test e2e/*.test.ts` (planify only; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001/F002/F003).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan only adds Markdown report path helpers; it does not change the helper’s default. Do not break F001, F002, or F003 spawn tests.
- YAML and Markdown in tests are observed as text (split YAML on `---`, read keys in order; assert Markdown tables as strings). No YAML library in e2e either.
- Current [`cli.arch.md`](../../arch/cli.arch.md) still describes ingest as Event log + Session index + Session YAML log and does not name the Session report. Architecture stale is the cli sibling’s `/codify` concern. Do not invent an e2e architecture file to paper over that.
- Do not spawn Copilot or Claude processes. Copilot/Claude mapping and `SessionEnd` are exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier; cases that need YAML/report still include `session_id` (or `conversation_id` / `parent_conversation_id`).
- Do not register `beforeSubmitPrompt` / `stop` (or any extra Cursor event). Prompt and agent-stop mapping are spawned as ingest extra argv only so the YAML (and thus the report table) can contain those kinds. F001’s four Cursor registrations already include `sessionEnd`; do not add a report hook.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar). Cursor registration is unchanged from F003.
- This container does not set spec status to `planned` (sibling cli planify runs in parallel). Spec status stays `pending`.

---

> last updated: 2026-09-01T10:22:36Z
