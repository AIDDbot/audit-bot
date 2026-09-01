---
id: F004
slug: session-end-report
title: Session-end Markdown report
kind: functional
category: report
tags: [hooks, ingest, cursor]
status: qualified
created: 2026-09-01
released-version: 0.8.0
---
# F004 — Session-end Markdown report

## Problem definition

F003 persists a per-session normalized YAML log so later reporting can read one sequential file without scanning JSONL. That YAML is complete for a machine, but it is not a session summary a developer can skim: there is no duration, no count by event kind, and no readable table of what happened.

Developers need ingest, on the same invocation that appends a Session YAML log document, to also write a single Markdown report for that session in the same daily folder. The report is derived only from that session’s YAML. This spec does not replace F001–F003 or F005–F006. Event log verbatim rules, Session index rules, YAML append-only rules, observe-only exit/stdout, and Cursor hook registrations stay with those specs.

This amend drops the session-end gate. A Session report must still be produced when `sessionEnd` never arrives (the session ended abruptly). Duration stays elapsed clock time from the first YAML document’s `timestamp` to the last, whatever those events are — not Cursor `duration_ms` and not a session-end-only field. Overview `source_harness` comes from the last document (the ingest that just ran). Subagent-start Details include `task` after `agent_type` (F006 mapping; F003 omits the field when absent).

Normalized body fields per event kind are those in [`docs/normalized-fields.md`](../../normalized-fields.md). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md).

### User Stories

- As a developer, I want **a Markdown report after each ingested session event** so that I can read what happened even when the session ends abruptly and `sessionEnd` never fires.
- As a developer, I want **overview, counts, and a chronological table** so that I can see duration, mix of event kinds, and a short line per event.
- As a developer, I want **duration from the first event’s time to the last** so that the overview stays valid regardless of which event kinds are in the file.
- As a developer, I want **the report built only from that session’s YAML** so that the normalized log remains the single source and JSONL stays the verbatim archive.
- As a developer, I want **long prompts, responses, and tasks trimmed in the table** so that the report stays scannable; full text remains in the Event log.
- As a developer, I want **the report from the same observe-only ingest invocation** so that I do not run a second command.

### Business Rules

- An ingest must **still persist as F001 and F003** (verbatim Event log, Session index, Session YAML log append, daily folder, observe-only exit 0 and no blocking stdout) on every invocation, including those that also write a Session report.
- A Session report is always **a `.md` file** named `{session_id}.md` inside that day’s folder, where `{session_id}` is the F001 session identifier already used for the Session YAML log.
- An ingest must **write a Session report whenever** it appends a Session YAML log document (the payload has a session identifier), after that document is in that session’s Session YAML log — no second process, and no new user-facing report command. An ingest must **not require** F002 `source_event` to be session-end (`sessionEnd` / `SessionEnd`). An ingest must **not infer** the report trigger from the JSONL payload.
- A Session report must **still be produced** when no session-end document is in that file.
- A Session report must **be produced only from** that session’s Session YAML log (every document, in file order). An ingest must **not read** the Event log or the Session index to produce it.
- When an event has **no session identifier**, F003 writes no YAML, and an ingest must **not create** a Session report.
- When a later ingest appends another YAML document for the **same session the same day**, an ingest must **overwrite** `{session_id}.md` from the YAML as it then stands. An ingest must **not append** a second report in that file.
- A Session report is always **Markdown with tables, never HTML**.
- A Session report must **include a session overview** with: `session_id` (the F001 identifier / first document); `source_harness` from the last document (the ingest that just ran); start time (first document’s `timestamp`); end time (last document’s `timestamp`); and total duration. `source_harness` must **not** be taken only from a session-end document.
- Start time, end time, and duration are always **from the documents in that day’s Session YAML log** (the folder’s calendar day). They must **not** be reconstructed across days.
- Duration is always **elapsed clock time** from the first YAML document’s `timestamp` to the last YAML document’s `timestamp` in that file, regardless of those documents’ `source_event`, displayed as zero-padded `HH:MM:SS`. An ingest must **not** use Cursor `duration_ms` or any session-end-only field for duration. When the last timestamp is **before** the first, duration must **be `00:00:00`**. When they are equal, duration must **be `00:00:00`**.
- A Session report must **include an event-count summary**: the number of YAML documents, and a breakdown of how many documents have each distinct `source_event` value.
- A Session report must **include a chronological event list** as a Markdown table with one row per YAML document, in file order (no re-sorting), with columns Time (`timestamp`), Event (`source_event`), and Details (relevant normalized body fields).
- Details may **include only** the normalized common body fields for that event kind in [`docs/normalized-fields.md`](../../normalized-fields.md), excluding `session_id` (already in the overview and YAML header), using those snake_case names, in table order, omitting fields absent from the document. Present values including YAML `null` appear. Multiple present fields in one cell are `{name}: {value}` pairs in table order, separated by `; `.
- Event kinds for that mapping are: session start (`sessionStart` / `SessionStart`) — Details empty; session end (`sessionEnd` / `SessionEnd`) — `reason`; subagent start (`subagentStart` / `SubagentStart`) — `agent_type`, `task`; subagent stop (`subagentStop` / `SubagentStop`) — `agent_type`, `response_text`; user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`) — `prompt`; agent stop (`stop` / `agentStop` / `Stop`) — Details empty. When the document is header-only (F003 unmapped harness or event), Details must **be empty**. Copilot and Claude Code subagent-start documents have no `task` (F006); that field is omitted when absent.
- A Details value longer than **80 characters** must **appear as the first 80 characters followed by an ellipsis** (`...`). A value of 80 characters or fewer must **not** receive an ellipsis. A preview is always **a single line** (newlines in the source value are spaces before the limit is applied).
- A Session report must **list subagent start and stop as ordinary chronological rows**. It must **not nest** a subagent under a parent.
- A table cell must **remain one cell** even when a field value contains `|`, newlines, or other Markdown-significant characters.
- An ingest must **not register** new Cursor, Copilot, or Claude hooks (registrations are F001 / F005 / F006).
- An ingest must **not change** F001 Event log or Session index rules, or F003 YAML append-only rules, except that this invocation may **read** the Session YAML log after the document just appended is present in order to write the report.
- When Session report generation **fails**, an ingest must **still persist as F001 and F003**, must **still exit 0**, and must **not write blocking stdout**.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, including no YAML parsing library. The report must **accept** the Session YAML log as F003 writes it (fixed-structure multi-document key-value YAML).

### Out of scope

- Reconstructing parent→subagent hierarchy or nesting subagents under a parent (`agent_id` is not in the YAML).
- Reports built from the Event log (JSONL) or the Session index.
- Dashboards, query commands, or any user-facing CLI command other than the existing ingest invocation.
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Changing F003 YAML append-only rules or header shape (body fields remain those in the mapping table, including `task` on subagent start per F006).
- Registering GitHub Copilot or Claude Code hooks, or any Cursor hook (F006 registers `stop`; F005 already registered `beforeSubmitPrompt`).
- HTML reports, PII redaction, or transforming stored Event log / YAML content.
- Multi-day session reconstruction (overview times are this file / this calendar day only).
- Deleting or rotating older daily folders.
- Blocking, denying, or rewriting the agent.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003).

This feature adds a fourth daily artifact:

- **Event log** — JSONL; each line is one Event, verbatim (F001).
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier (F003).
- **Session report** — one `{session_id}.md` per session that received a YAML document that day; Markdown; overwritten on every later YAML append for that session the same day.

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md) and [`cli.arch.md`](../../arch/cli.arch.md):

- On an ingest invocation that appends a Session YAML log document (payload has a session identifier), after that document is in the file, write `{session_id}.md` in the same daily folder from that YAML file alone — including when no session-end document is present.
- Include overview (`session_id` from the F001 identifier / first document, `source_harness` from the last document, start, end, duration `HH:MM:SS` from first→last timestamps regardless of `source_event`), counts by `source_event`, and a chronological Markdown table of every document (flat; previews truncated at 80 characters with `...`).
- Overwrite the Markdown file when another YAML document for that session arrives the same day; skip the report when there is no session identifier.
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, observe-only (exit 0, no blocking stdout), including when report generation fails. Do not add a report command or new hook registrations.

## Verification Criteria

- [x] **AC-F004.2** — THE SYSTEM SHALL produce the Session report by reading that session’s Session YAML log (all documents, in file order) and SHALL NOT re-sort those documents.
- [x] **AC-F004.4** — THE SYSTEM SHALL include the total number of YAML documents and a count for each distinct `source_event` value present in that file.
- [x] **AC-F004.5** — THE SYSTEM SHALL list every YAML document in file order as a Markdown table with Time, Event, and Details, where Details are the normalized body fields for that `source_event` in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), omitted when absent, and empty when the document has no body fields.
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

### Deprecated criteria

- **AC-F004.1** — ~~WHEN ingest is invoked with F002 source-event positional `sessionEnd` or `SessionEnd` and the payload has a session identifier, THE SYSTEM SHALL, in that same invocation after the corresponding Session YAML log document is in the file, write a Session report for that session.~~ · retired 2026-09-01 (v0.8.0): a Session report must be written after every YAML-appending ingest, not only session-end (AC-F004.14).
- **AC-F004.3** — ~~THE SYSTEM SHALL include in the report `session_id`, `source_harness` from the triggering session-end document, start time from the first document’s `timestamp`, end time from the last document’s `timestamp`, and duration as zero-padded `HH:MM:SS` elapsed on that calendar day; WHEN the last timestamp is before the first, THE SYSTEM SHALL write duration `00:00:00`.~~ · retired 2026-09-01 (v0.8.0): `source_harness` comes from the last document, not from a session-end document; duration is first→last timestamps regardless of `source_event` (AC-F004.15).
- **AC-F004.12** — ~~WHEN a later session-end kind is ingested for the same session the same day, THE SYSTEM SHALL overwrite `{session_id}.md` from the current Session YAML log and SHALL NOT append a second report.~~ · retired 2026-09-01 (v0.8.0): overwrite after every later YAML-appending ingest for that session the same day, not only a later session-end (AC-F004.16).

---

> last updated: 2026-09-01T12:30:00Z
