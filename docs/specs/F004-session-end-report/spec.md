---
id: F004
slug: session-end-report
title: Session-end Markdown report
kind: functional
category: report
tags: [hooks, ingest, cursor]
status: pending
created: 2026-09-01
released-version:
---
# F004 — Session-end Markdown report

## Problem definition

F003 persists a per-session normalized YAML log so later reporting can read one sequential file without scanning JSONL. That YAML is complete for a machine, but it is not a session summary a developer can skim: there is no duration, no count by event kind, and no readable table of what happened.

Developers need ingest, on the same invocation that appends the session-end YAML document, to also write a single Markdown report for that session in the same daily folder. The report is derived only from that session’s YAML. This spec does not replace F001–F003. Event log verbatim rules, Session index rules, YAML append-only rules, observe-only exit/stdout, and the four Cursor registrations stay as they are.

Normalized body fields per event kind are those in [`docs/normalized-fields.md`](../../normalized-fields.md). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md).

### User Stories

- As a developer, I want **a Markdown report when a session ends** so that I can read what happened without opening YAML or JSONL.
- As a developer, I want **overview, counts, and a chronological table** so that I can see duration, mix of event kinds, and a short line per event.
- As a developer, I want **the report built only from that session’s YAML** so that the normalized log remains the single source and JSONL stays the verbatim archive.
- As a developer, I want **long prompts and responses trimmed in the table** so that the report stays scannable; full text remains in the Event log.
- As a developer, I want **the report from the same observe-only ingest invocation** so that I do not run a second command at session end.

### Business Rules

- An ingest must **still persist as F001 and F003** (verbatim Event log, Session index, Session YAML log append, daily folder, observe-only exit 0 and no blocking stdout) on every invocation, including those that also write a Session report.
- A Session report is always **a `.md` file** named `{session_id}.md` inside that day’s folder, where `{session_id}` is the F001 session identifier already used for the Session YAML log.
- An ingest may **write a Session report only if** the F002 `source_event` positional is the session-end kind (`sessionEnd` or `SessionEnd`) and the event has a session identifier. An ingest must **not infer** session-end from the JSONL payload.
- When those conditions hold, an ingest must **write the Session report in the same invocation**, after the session-end YAML document is in that session’s Session YAML log — no second process, and no new user-facing report command.
- A Session report must **be produced only from** that session’s Session YAML log (every document, in file order). An ingest must **not read** the Event log or the Session index to produce it.
- When an event has **no session identifier**, F003 writes no YAML, and an ingest must **not create** a Session report.
- When a later session-end kind arrives for the **same session the same day**, an ingest must **overwrite** `{session_id}.md` from the YAML as it then stands. An ingest must **not append** a second report in that file.
- A Session report is always **Markdown with tables, never HTML**.
- A Session report must **include a session overview** with: `session_id` (the F001 identifier); `source_harness` from the triggering session-end document; start time (first document’s `timestamp`); end time (last document’s `timestamp`); and total duration.
- Start time, end time, and duration are always **from the documents in that day’s Session YAML log** (the folder’s calendar day). They must **not** be reconstructed across days.
- Duration is always **elapsed clock time** on that calendar day, displayed as zero-padded `HH:MM:SS`, computed from the first and last `HH:MM:SS` timestamps. When the last timestamp is **before** the first, duration must **be `00:00:00`**. When they are equal, duration must **be `00:00:00`**.
- A Session report must **include an event-count summary**: the number of YAML documents, and a breakdown of how many documents have each distinct `source_event` value.
- A Session report must **include a chronological event list** as a Markdown table with one row per YAML document, in file order (no re-sorting), with columns Time (`timestamp`), Event (`source_event`), and Details (relevant normalized body fields).
- Details may **include only** the normalized common body fields for that event kind in [`docs/normalized-fields.md`](../../normalized-fields.md), excluding `session_id` (already in the overview and YAML header), using those snake_case names, in table order, omitting fields absent from the document. Present values including YAML `null` appear. Multiple present fields in one cell are `{name}: {value}` pairs in table order, separated by `; `.
- Event kinds for that mapping are: session start (`sessionStart` / `SessionStart`) — Details empty; session end (`sessionEnd` / `SessionEnd`) — `reason`; subagent start (`subagentStart` / `SubagentStart`) — `agent_type`, `transcript_path`; subagent stop (`subagentStop` / `SubagentStop`) — `agent_type`, `transcript_path`, `response_text`; user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`) — `prompt`; agent stop (`stop` / `agentStop` / `Stop`) — `transcript_path`. When the document is header-only (F003 unmapped harness or event), Details must **be empty**.
- A Details value longer than **80 characters** must **appear as the first 80 characters followed by an ellipsis** (`...`). A value of 80 characters or fewer must **not** receive an ellipsis. A preview is always **a single line** (newlines in the source value are spaces before the limit is applied).
- A Session report must **list subagent start and stop as ordinary chronological rows**. It must **not nest** a subagent under a parent.
- A table cell must **remain one cell** even when a field value contains `|`, newlines, or other Markdown-significant characters.
- An ingest must **not register** new Cursor, Copilot, or Claude hooks. F001’s four Cursor registrations already include `sessionEnd`.
- An ingest must **not change** F001 Event log or Session index rules, or F003 YAML append-only rules, except that this invocation may **read** the Session YAML log after the session-end document is present in order to write the report.
- When Session report generation **fails**, an ingest must **still persist as F001 and F003**, must **still exit 0**, and must **not write blocking stdout**.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, including no YAML parsing library. The report must **accept** the Session YAML log as F003 writes it (fixed-structure multi-document key-value YAML).

### Out of scope

- Reconstructing parent→subagent hierarchy or nesting subagents under a parent (`agent_id` is not in the YAML).
- Reports built from the Event log (JSONL) or the Session index.
- Dashboards, query commands, or any user-facing CLI command other than the existing ingest invocation.
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Changing F003 YAML append-only rules, document shape, or field mapping.
- Registering GitHub Copilot or Claude Code hooks, or Cursor events other than the four F001 registrations.
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
- **Session report** — one `{session_id}.md` per session for which a session-end kind was ingested that day; Markdown; overwritten on a later session-end the same day.

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md) and [`cli.arch.md`](../../arch/cli.arch.md):

- On an ingest invocation whose F002 source-event positional is `sessionEnd` or `SessionEnd` and whose payload has a session identifier, after the Session YAML log has that event’s document, write `{session_id}.md` in the same daily folder from that YAML file alone.
- Include overview (`session_id`, `source_harness`, start, end, duration `HH:MM:SS`), counts by `source_event`, and a chronological Markdown table of every document (flat; previews truncated at 80 characters with `...`).
- Overwrite the Markdown file when another session-end for that session arrives the same day; skip the report when there is no session identifier.
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, observe-only (exit 0, no blocking stdout), including when report generation fails. Do not add a report command or new hook registrations.

## Verification Criteria

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

---

> last updated: 2026-09-01T10:09:59Z
