---
id: F008
slug: conversation-turns
title: Conversation turn tracking
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: planned
created: 2026-09-01
released-version: 0.16.0
---
# F008 — Conversation turn tracking

## Problem definition

F001–F007 and F010 persist hook events as a verbatim daily JSONL Event log, a Session index, a per-session Session JSONL log (F010), and a Session report. Each JSON object in that session log is an independent sequential event. F003 owns the compact header on that object (including that `turn` is present and ordered after `timestamp`). The Session report is F004’s consumer.

That layout treats every event as an equal row until `turn` tags it. It does not mark which events belong to the same user prompt. Agent-stop and subagent-stop events are not one-per-turn: they can fire many times in a row for a single ongoing prompt (internal loop iterations), sometimes ten or more times with no new prompt in between. Pairing a prompt with “the next stop” therefore undercounts how long that prompt’s turn actually lasted.

Developers need each JSON object tagged with a conversation-turn **number**, incremented only when a user-prompt event is written for that session. How that number is computed may use **only** that session’s Session JSONL log (`{session_id}.jsonl`, F010) — not a YAML-specific scan, not F001 `events.jsonl`, and not `sessions.json`. This spec owns that number. F003 still owns header field `turn` presence and order. F010 owns format, filename, and serialization. F004 still groups the Session report by `turn` (per-turn subsections, turn duration, prompt in the subsection). This spec does not duplicate those F003 / F004 / F010 acceptance criteria.

This spec does not replace F001–F007 or F010. Event log verbatim rules, Session index rules, observe-only exit/stdout, and Cursor hook registrations stay with those specs. Session JSONL log append-only rules stay (F010); this spec sets `turn` on each new JSON object and must **not** rewrite `turn` on objects already in the file. Normalized body fields stay those in [`docs/normalized-fields.md`](../../normalized-fields.md) (`turn` is a header field, not a body field).

Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md). Prompt-kind events are only the three user-prompt aliases already listed there: Cursor `beforeSubmitPrompt`, Copilot `userPromptSubmitted`, Claude Code `UserPromptSubmit`.

### User Stories

- As a developer, I want **each JSON object tagged with a conversation turn** so that I can see which events belong to the same user prompt.
- As a developer, I want **the turn to increment only on a user-prompt event** so that repeated agent-stop or subagent-stop events in a loop are not treated as new turns.
- As a developer, I want **events before the first prompt to be turn 0** so that session-start and other preamble events still belong to a turn.
- As a developer, I want **the Event log unchanged** so that the raw archive is not affected.

### Business Rules

- `turn` is always **a JSON number** (never a string, never a zero-padded string, never a body field). F003 owns the header field’s presence and order after `timestamp`; this spec owns the number.
- Prompt-kind is always **only** `event` `beforeSubmitPrompt`, `userPromptSubmitted`, or `UserPromptSubmit`. An ingest must **not** treat any other event kind as a turn boundary, including `stop` / `agentStop` / `Stop` and `subagentStop` / `SubagentStop`.
- When an ingest appends a JSON object, `turn` is always **the number of prompt-kind objects already present** in that session’s Session JSONL log, plus one if **this** object is itself prompt-kind; otherwise that same already-present count. When none are already present and this object is not prompt-kind, `turn` is always **0**.
- The first prompt-kind object in a Session JSONL log is always **turn 1**. Each later prompt-kind object is **one greater** than the previous prompt-kind object’s `turn` (`2`, `3`, …). Objects written before that first prompt-kind object are always **turn 0**.
- An ingest must **not rewrite** `turn` (or any other field) on objects already in that Session JSONL log (F010 append-only).
- An ingest must **not persist** `turn` on the Event log line. An ingest must **not require** any file other than that session’s Session JSONL log to determine `turn`. An ingest must **not read** `events.jsonl` or `sessions.json` to compute `turn`.
- `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` objects must **belong to whichever turn is current**. Their multiplicity must **not** start or end a turn.
- An ingest must **still persist as F001 and F010** (verbatim Event log, Session index, Session JSONL log append when a session identifier exists, daily folder, observe-only exit 0 and no blocking stdout).
- An ingest must **not register** new Cursor, Copilot, or Claude hooks (registrations stay F001 / F005 / F006).
- An ingest must **not change** F001 Event log or Session index rules, F002 positionals, F003 body mapping, or F010 format/filename/serialization.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes.

### Out of scope

- Changing the Event log (JSONL), Session index, daily-folder naming, or observe-only exit/stdout.
- Overlaying `turn` onto the stored Event log line.
- Changing F003 body fields or [`docs/normalized-fields.md`](../../normalized-fields.md) (turn is header, not a mapped body field).
- Header field `turn` presence and order (F003).
- Session JSONL log format, filename `{session_id}.jsonl`, or serialization (F010).
- Closing a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`.
- Pairing a prompt with a specific stop event to compute duration.
- Session report grouping, per-turn duration display, and prompt-in-subsection (F004).
- Session-overview duration (stays first→last JSON object, F004).
- Registering GitHub Copilot or Claude Code hooks, or any new Cursor hook.
- Reconstructing parent→subagent hierarchy or nesting events under a turn beyond a flat list.
- A separate persisted Turn file or entity.
- Blocking, denying, or rewriting the agent.
- Deleting or rotating older daily folders.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010); a **Session report** is the Markdown file derived from that JSONL (F004).

This spec does not add a persisted Turn file. `turn` is a property of each Session JSONL log object (which conversation turn that Event belongs to):

- **Event log** — JSONL; each line is one Event, verbatim (F001); no `turn`.
- **Session index** — JSON array of distinct session identifiers for that day (F001); unchanged.
- **Session JSONL log** — one `{session_id}.jsonl` per distinct F001 session identifier (F010); each JSON object includes JSON-number `turn` (this spec); F003 owns header field presence and order; prior objects are not rewritten.
- **Session report** — F004 downstream consumer; reads `turn` to group events (F004).

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- On each Session JSONL log append, tag the new JSON object with `turn` as specified above (count of prompt-kind objects already in that session’s Session JSONL log, plus one when this event is prompt-kind). Do not read `events.jsonl` or `sessions.json` to compute `turn`.
- Keep Event log lines verbatim (no `turn` overlay). Do not add a sidecar file. Do not rewrite prior JSONL records.
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, observe-only. Do not add hook registrations.

## Verification Criteria

- [ ] **AC-F008.1** — WHEN ingest appends a JSON object to a Session JSONL log, THE SYSTEM SHALL set `turn` to the number of prompt-kind objects already present in that file, plus one if the JSON object being appended is itself prompt-kind, otherwise that same number; WHEN no prompt-kind object is already present and the JSON object being appended is not prompt-kind, THE SYSTEM SHALL set `turn` to 0.
- [x] **AC-F008.2** — THE SYSTEM SHALL treat as prompt-kind only `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit`; THE SYSTEM SHALL NOT increment `turn` for any other `event`, including `stop`, `agentStop`, `Stop`, `subagentStop`, and `SubagentStop`.
- [ ] **AC-F008.3** — THE SYSTEM SHALL write `turn` `1` on the first prompt-kind object in that Session JSONL log and SHALL write `turn` `2`, `3`, … on each later prompt-kind object in file order; THE SYSTEM SHALL write `turn` `0` on every object that precedes the first prompt-kind object.
- [ ] **AC-F008.4** — THE SYSTEM SHALL NOT rewrite `turn` on previously written objects in that Session JSONL log.
- [ ] **AC-F008.5** — THE SYSTEM SHALL NOT persist `turn` on the Event log line and SHALL NOT require any file other than that session’s Session JSONL log to determine `turn`.
- [x] **AC-F008.6** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) and SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

---

> last updated: 2026-09-02T15:32:41Z
