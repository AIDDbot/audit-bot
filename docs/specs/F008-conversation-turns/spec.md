---
id: F008
slug: conversation-turns
title: Conversation turn tracking
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: in-progress
created: 2026-09-01
released-version:
---
# F008 — Conversation turn tracking

## Problem definition

F001–F007 persist hook events as a verbatim daily JSONL Event log, a Session index, a per-session normalized YAML log, and a Session report. Each YAML document is an independent sequential event with a four-field header. The Session report lists every document in one flat chronological table.

That layout treats every event as an equal row. It does not mark which events belong to the same user prompt. Agent-stop and subagent-stop events are not one-per-turn: they can fire many times in a row for a single ongoing prompt (internal loop iterations), sometimes ten or more times with no new prompt in between. Pairing a prompt with “the next stop” therefore undercounts how long that prompt’s turn actually lasted.

Developers need each YAML document tagged with a conversation-turn number, incremented only when a user-prompt event is written for that session, and a Session report that groups events by that turn and shows each turn’s duration from the prompt (or from the first pre-prompt event) to the last event of that turn — not to an intermediate stop.

This spec does not replace F001–F007. Event log verbatim rules, Session index rules, observe-only exit/stdout, and Cursor hook registrations stay with those specs. YAML append-only rules stay; this spec adds `turn` on each new document and must **not** rewrite `turn` on documents already in the file. Normalized body fields stay those in [`docs/normalized-fields.md`](../../normalized-fields.md) (`turn` is a header field, not a body field). F003 is amended for the five-field header. F004 is amended as the report consumer (per-turn subsections, turn duration, prompt in the subsection). This spec does not duplicate those F003/F004 acceptance criteria.

Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md). Prompt-kind events are only the three user-prompt aliases already listed there: Cursor `beforeSubmitPrompt`, Copilot `userPromptSubmitted`, Claude Code `UserPromptSubmit`.

### User Stories

- As a developer, I want **each YAML event tagged with a conversation turn** so that I can see which events belong to the same user prompt.
- As a developer, I want **the turn to increment only on a user-prompt event** so that repeated agent-stop or subagent-stop events in a loop are not treated as new turns.
- As a developer, I want **events before the first prompt to be turn 0** so that session-start and other preamble events still belong to a turn.
- As a developer, I want **JSONL unchanged** so that the raw archive is not affected.

### Business Rules

- A YAML document always **includes `turn`** as the fifth F003 header field (after `timestamp`). `turn` is always **a YAML integer**, never a zero-padded string, and never a body field.
- Prompt-kind is always **only** `source_event` `beforeSubmitPrompt`, `userPromptSubmitted`, or `UserPromptSubmit`. An ingest must **not** treat any other event kind as a turn boundary, including `stop` / `agentStop` / `Stop` and `subagentStop` / `SubagentStop`.
- When an ingest appends a YAML document, `turn` is always **the number of prompt-kind documents already present** in that session’s Session YAML log, plus one if **this** document is itself prompt-kind; otherwise that same already-present count. When none are already present and this document is not prompt-kind, `turn` is always **0**.
- The first prompt-kind document in a Session YAML log is always **turn 1**. Each later prompt-kind document is **one greater** than the previous prompt-kind document’s `turn` (`2`, `3`, …). Documents written before that first prompt-kind document are always **turn 0**.
- An ingest must **not rewrite** `turn` (or any other field) on documents already in that Session YAML log (F003 append-only).
- An ingest must **not persist** `turn` on the Event log line. An ingest must **not require** any file other than that session’s Session YAML log to determine `turn`.
- `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` documents must **belong to whichever turn is current**. Their multiplicity must **not** start or end a turn.
- An ingest must **still persist as F001 and F003** (verbatim Event log, Session index, Session YAML log append when a session identifier exists, daily folder, observe-only exit 0 and no blocking stdout).
- An ingest must **not register** new Cursor, Copilot, or Claude hooks (registrations stay F001 / F005 / F006).
- An ingest must **not change** F001 Event log or Session index rules, F002 positionals, or F003 body mapping.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes.

### Out of scope

- Changing the Event log (JSONL), Session index, daily-folder naming, or observe-only exit/stdout.
- Overlaying `turn` onto the stored Event log line.
- Changing F003 body fields or [`docs/normalized-fields.md`](../../normalized-fields.md) (turn is header, not a mapped body field).
- Closing a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`.
- Pairing a prompt with a specific stop event to compute duration.
- Session report grouping, per-turn duration display, and prompt-in-subsection (F004 amend).
- Session-overview duration (stays first→last document, F004).
- Registering GitHub Copilot or Claude Code hooks, or any new Cursor hook.
- Reconstructing parent→subagent hierarchy or nesting events under a turn beyond a flat list.
- A separate persisted Turn file or entity.
- Blocking, denying, or rewriting the agent.
- Deleting or rotating older daily folders.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add a persisted Turn file. `turn` is a property of each Session YAML log document (which conversation turn that Event belongs to):

- **Event log** — JSONL; each line is one Event, verbatim (F001); no `turn`.
- **Session index** — JSON array of distinct session identifiers for that day (F001); unchanged.
- **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier (F003); each document includes integer `turn` in the header; prior documents are not rewritten.
- **Session report** — F004 downstream consumer; reads `turn` to group events (F004 amend).

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- On each YAML-appending ingest, tag the new document with `turn` as specified above (count of prompt-kind documents already in that session’s YAML, plus one when this event is prompt-kind).
- Keep Event log lines verbatim (no `turn` overlay). Do not add a sidecar file. Do not rewrite prior YAML documents.
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, observe-only. Do not add hook registrations.

## Verification Criteria

- [ ] **AC-F008.1** — WHEN ingest appends a Session YAML log document, THE SYSTEM SHALL set `turn` to the number of prompt-kind documents already present in that file, plus one if the document being appended is itself prompt-kind, otherwise that same number; WHEN no prompt-kind document is already present and the document being appended is not prompt-kind, THE SYSTEM SHALL set `turn` to 0.
- [ ] **AC-F008.2** — THE SYSTEM SHALL treat as prompt-kind only `source_event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit`; THE SYSTEM SHALL NOT increment `turn` for any other `source_event`, including `stop`, `agentStop`, `Stop`, `subagentStop`, and `SubagentStop`.
- [ ] **AC-F008.3** — THE SYSTEM SHALL write `turn` `1` on the first prompt-kind document in that Session YAML log and SHALL write `turn` `2`, `3`, … on each later prompt-kind document in file order; THE SYSTEM SHALL write `turn` `0` on every document that precedes the first prompt-kind document.
- [ ] **AC-F008.4** — THE SYSTEM SHALL NOT rewrite `turn` on previously written documents in that Session YAML log.
- [ ] **AC-F008.5** — THE SYSTEM SHALL NOT persist `turn` on the Event log line and SHALL NOT require any file other than that session’s Session YAML log to determine `turn`.
- [ ] **AC-F008.6** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) and SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

---

> last updated: 2026-09-02T06:50:59Z
