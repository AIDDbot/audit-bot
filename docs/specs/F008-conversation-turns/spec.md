---
id: F008
slug: conversation-turns
title: Conversation turn tracking
kind: functional
category: ingest
tags: [hooks, ingest, cursor, codex]
status: pending
created: 2026-09-01
released-version:
---
# F008 — Conversation turn tracking

## Problem definition

F001–F007 and F010 persist hook events as a verbatim daily JSONL Event log, a Session index, a per-session Session JSONL log (F010), and a Session report. Each JSON object in that session log is an independent sequential event. F003 owns the compact header on that object (including that `turn` is present and ordered after `timestamp`). The Session report is F004’s consumer.

That layout treats every event as an equal row until `turn` tags it. It does not mark which events belong to the same user prompt. Agent-stop and subagent-stop events are not one-per-turn: they can fire many times in a row for a single ongoing prompt (internal loop iterations), sometimes ten or more times with no new prompt in between. Pairing a prompt with “the next stop” therefore undercounts how long that prompt’s turn actually lasted.

Developers need each JSON object tagged with a conversation-turn **number**, incremented only when a user-prompt event is written for that session. How that number is computed may use **only** that session’s Session JSONL log (`{session_id}.jsonl`, F010) — not a YAML-specific scan, not F001 `events.jsonl`, and not `sessions.json`. This spec owns that number. F003 still owns header field `turn` presence and order. F010 owns format, filename, and serialization. F004 still groups the Session report by `turn` (per-turn subsections, turn duration, prompt in the subsection). This spec does not duplicate those F003 / F004 / F010 acceptance criteria.

This spec does not replace F001–F007 or F010. Event log verbatim rules, Session index rules, observe-only exit/stdout, and Cursor hook registrations stay with those specs. Session JSONL log append-only rules stay (F010); this spec sets `turn` on each new JSON object and must **not** rewrite `turn` on objects already in the file. Normalized body fields stay those in [`docs/normalized-fields.md`](../../normalized-fields.md) (`turn` is a header field, not a body field).

Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md). Prompt-kind events are only the three user-prompt aliases already listed there: Cursor `beforeSubmitPrompt`, Copilot `userPromptSubmitted`, and Claude Code / Codex `UserPromptSubmit`.

This amend (C002) adds Codex-native turn correlation. Codex `turn_id` is an opaque string, not the numeric report heading, and appears on its turn events (`UserPromptSubmit`, `SubagentStart`, `SubagentStop`, and `Stop`). For Codex, the native identifier is the source of truth: every record with the same `turn_id` receives the same JSON-number `turn`; the first distinct native identifier in a session is turn 1 and each later distinct identifier is the next number in file order. The normalized Session JSONL record retains a present Codex `turn_id` after its compact header so a later invocation can resolve that identity from **that session file only**. It is correlation metadata, not a Details field or a replacement for the numeric `turn` consumed by F004. Codex events that do not provide `turn_id` (such as session lifecycle events) use the latest native turn already represented in that session, or turn 0 when none exists. Cursor, Copilot, and Claude Code retain the existing prompt-count behavior unchanged.

### User Stories

- As a developer, I want **each JSON object tagged with a conversation turn** so that I can see which events belong to the same user prompt.
- As a developer, I want **the turn to increment only on a user-prompt event** so that repeated agent-stop or subagent-stop events in a loop are not treated as new turns.
- As a developer, I want **events before the first prompt to be turn 0** so that session-start and other preamble events still belong to a turn.
- As a developer, I want **the Event log unchanged** so that the raw archive is not affected.
- As a developer, I want **Codex events with the same native turn identity grouped together** so that subagent and stop activity stays correlated to its originating Codex turn.

### Business Rules

- `turn` is always **a JSON number** (never a string, never a zero-padded string, never a body field). F003 owns the header field’s presence and order after `timestamp`; this spec owns the number.
- For Cursor, Copilot, and Claude Code, prompt-kind is always **only** `event` `beforeSubmitPrompt`, `userPromptSubmitted`, or `UserPromptSubmit`. An ingest must **not** treat any other event kind as a turn boundary, including `stop` / `agentStop` / `Stop` and `subagentStop` / `SubagentStop`.
- For Cursor, Copilot, and Claude Code, when an ingest appends a JSON object, `turn` is always **the number of prompt-kind objects already present** in that session’s Session JSONL log, plus one if **this** object is itself prompt-kind; otherwise that same already-present count. When none are already present and this object is not prompt-kind, `turn` is always **0**.
- For Cursor, Copilot, and Claude Code, the first prompt-kind object in a Session JSONL log is always **turn 1**. Each later prompt-kind object is **one greater** than the previous prompt-kind object’s `turn` (`2`, `3`, …). Objects written before that first prompt-kind object are always **turn 0**.
- For Codex, a present native `turn_id` is always **the turn identity**. A JSON object with a `turn_id` already present in that session’s Session JSONL log must **use the same JSON-number `turn`** as the earlier matching identifier. A first-seen `turn_id` must use one greater than the greatest native-turn number already assigned in that file, starting at **1**. A Codex lifecycle object without `turn_id` must use the most recent native-turn number already assigned in that session, or **0** when none exists.
- A Codex JSON object with a present native `turn_id` must **retain that exact string as `turn_id`** after the compact header. It must not appear on an object whose payload lacks the field. The identifier is correlation metadata only: F004 groups and labels by numeric `turn` and must not render `turn_id` as a Details field.
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
- The generated numeric turn ordinal for Cursor, Copilot, or Claude Code; their existing prompt-count behavior remains in force.
- Rendering a native Codex `turn_id` in report Details (F004 uses numeric `turn` only).
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

- On each Session JSONL log append, tag the new JSON object with `turn` as specified above: the existing prompt-count rule for Cursor, Copilot, and Claude Code; native-`turn_id` correlation for Codex. Retain a present Codex `turn_id` after the compact header, then resolve later Codex records from that session log only. Do not read `events.jsonl` or `sessions.json` to compute `turn`.
- Keep Event log lines verbatim (no `turn` overlay). Do not add a sidecar file. Do not rewrite prior JSONL records.
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, observe-only. Do not add hook registrations.

## Verification Criteria

- [ ] **AC-F008.7** — WHEN ingest appends a Cursor, Copilot, or Claude Code JSON object to a Session JSONL log, THE SYSTEM SHALL set `turn` to the number of prompt-kind objects (`beforeSubmitPrompt`, `userPromptSubmitted`, or `UserPromptSubmit`) already present in that file, plus one if the JSON object being appended is itself prompt-kind, otherwise that same number; WHEN no prompt-kind object is already present and the JSON object being appended is not prompt-kind, THE SYSTEM SHALL set `turn` to 0; THE SYSTEM SHALL NOT increment `turn` for another event kind.
- [ ] **AC-F008.8** — WHEN ingest appends a Codex JSON object with a present native `turn_id`, THE SYSTEM SHALL retain that exact identifier on the Session JSONL object after its compact header and SHALL set its JSON-number `turn` to the number already assigned to that same identifier in that session’s Session JSONL log; WHEN the identifier is first seen in that file, THE SYSTEM SHALL assign the next numeric turn in file order, starting at 1; WHEN a Codex lifecycle object has no `turn_id`, THE SYSTEM SHALL use the latest native-turn number in that session or 0 when none exists; THE SYSTEM SHALL use no file other than that session’s Session JSONL log to resolve the native identifier and SHALL NOT render `turn_id` in the Session report Details.
- [x] **AC-F008.4** — THE SYSTEM SHALL NOT rewrite `turn` on previously written objects in that Session JSONL log.
- [x] **AC-F008.5** — THE SYSTEM SHALL NOT persist `turn` on the Event log line and SHALL NOT require any file other than that session’s Session JSONL log to determine `turn`.
- [x] **AC-F008.6** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) and SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

### Deprecated criteria

- **AC-F008.1** — ~~WHEN ingest appends a JSON object to a Session JSONL log, THE SYSTEM SHALL set `turn` to the number of prompt-kind objects already present in that file, plus one if the JSON object being appended is itself prompt-kind, otherwise that same number; WHEN no prompt-kind object is already present and the JSON object being appended is not prompt-kind, THE SYSTEM SHALL set `turn` to 0.~~ · retired 2026-09-04: Codex native `turn_id` is authoritative (AC-F008.8); all other harnesses retain the prompt-count rule (AC-F008.7).
- **AC-F008.2** — ~~THE SYSTEM SHALL treat as prompt-kind only `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit`; THE SYSTEM SHALL NOT increment `turn` for any other `event`, including `stop`, `agentStop`, `Stop`, `subagentStop`, and `SubagentStop`.~~ · retired 2026-09-04: this rule remains for Cursor, Copilot, and Claude Code (AC-F008.7); Codex uses native `turn_id` (AC-F008.8).
- **AC-F008.3** — ~~THE SYSTEM SHALL write `turn` `1` on the first prompt-kind object in that Session JSONL log and SHALL write `turn` `2`, `3`, … on each later prompt-kind object in file order; THE SYSTEM SHALL write `turn` `0` on every object that precedes the first prompt-kind object.~~ · retired 2026-09-04: this rule remains for Cursor, Copilot, and Claude Code (AC-F008.7); Codex native turn ordinals are assigned from first-seen `turn_id` (AC-F008.8).

---

> last updated: 2026-09-04T16:00:00Z
