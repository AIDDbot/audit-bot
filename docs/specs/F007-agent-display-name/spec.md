---
id: F007
slug: agent-display-name
title: Copilot subagent display name
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: released
created: 2026-09-01
released-version: 0.11.0
---
# F007 — Copilot subagent display name

## Problem definition

F001–F006 persist hook events as a verbatim daily JSONL Event log, a Session index, a per-session normalized YAML log, and a Session report. Normalized YAML body fields and report Details follow [`docs/normalized-fields.md`](../../normalized-fields.md). That table maps Copilot subagent start `agentName` → `agent_type` and Copilot subagent stop `agentType` → `agent_type`. Copilot also sends optional `agentDisplayName` on both `subagentStart` and `subagentStop` (a friendly label, e.g. "Explore" vs slug "explore"). Cursor and Claude Code have no equivalent. Today `agentDisplayName` is kept only on the verbatim Event log and is omitted from YAML and report Details.

Developers reading the session YAML or the report chronological table see Copilot’s agent slug in `agent_type` but not the human-readable label Copilot actually shows. They need `agentDisplayName` next to `agent_type` without inventing a mapping for Cursor or Claude Code, and without using the display name as a fallback for `agent_type`.

This spec does not replace F001–F006. Event log verbatim rules, Session index rules, YAML append-only and header rules, observe-only exit/stdout, Cursor hook registrations, and F004 report-trigger / duration / `source_harness` stay in force. This spec does not duplicate F003, F004, or F006 acceptance criteria. F003 YAML body and F004 Details follow [`docs/normalized-fields.md`](../../normalized-fields.md); that table gains `agent_display_name` on subagent start and subagent stop so those criteria stay true without reopening F003. F004’s explicit Details list is amended in F004 (not here) so subagent start is `agent_type`, then `agent_display_name`, then `task`, and subagent stop is `agent_type`, then `agent_display_name`, then `response_text`. This field is an explicit exception to that document’s intro that only fields present in all three harnesses appear — the same style as F006 `task` (keep the `task` exception).

Normalized body fields per event kind are those in [`docs/normalized-fields.md`](../../normalized-fields.md). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md). [`docs/events-args.md`](../../events-args.md) already documents Copilot `agentDisplayName?: string` on subagent start and stop. Cursor and Claude Code have no equivalent (`—`).

### User Stories

- As a developer, I want **Copilot subagent-start and subagent-stop YAML (and report Details) to include `agentDisplayName` when present** so that I can read the visible agent label next to `agent_type`.
- As a developer, I want **Cursor and Claude Code documents to omit that field** so that ingest does not invent a field those harnesses do not send.
- As a developer, I want **JSONL to stay verbatim** so that the raw payload still has `agentDisplayName`, `agentName`, `agentDescription`, and every other key.

### Business Rules

- The normalized mapping in [`docs/normalized-fields.md`](../../normalized-fields.md) must **include** `agent_display_name` for subagent start (`subagentStart` / `SubagentStart`) and for subagent stop (`subagentStop` / `SubagentStop`), with Copilot source key `agentDisplayName` and no Cursor or Claude Code source key. This field is always **an explicit exception** to that document’s intro that only fields present in all three harnesses appear, alongside the existing `task` exception (F006). An ingest must **not** remove the `task` exception.
- An ingest must **not map** `agent_display_name` from any other payload field (`agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key).
- An ingest must **not use** `agentDisplayName` or `agent_display_name` as a fallback or overlay for `agent_type`. Copilot `agent_type` mapping stays: subagent start `agentName`, subagent stop `agentType`.
- A YAML document for Copilot subagent start may **include `agent_display_name` after `agent_type` and before `task`** (table order) when the Copilot source key is present. When that key is absent, the body field must **be omitted** (F003 omit-absent / present-null rules stay).
- A YAML document for Copilot subagent stop may **include `agent_display_name` after `agent_type` and before `response_text`** (table order) when the Copilot source key is present. When that key is absent, the body field must **be omitted**.
- A YAML document for Cursor or Claude Code subagent start or subagent stop must **not include** `agent_display_name` (no source key; F003 omits absent keys).
- F003 YAML body fields and F004 report Details follow that table. Subagent-start Details on F004 become `agent_type`, then `agent_display_name`, then `task` when present. Subagent-stop Details become `agent_type`, then `agent_display_name`, then `response_text` when present.
- Header, append-only YAML, and session identifier rules stay as they are: `{session_id}` is the F001 identifier (`session_id` / `conversation_id` / `parent_conversation_id`; never Copilot `sessionId` alone). Observe-only exit 0 and no blocking stdout stay as they are.
- An ingest must **not use** `agent_display_name` to skip, filter, or transform the Event log line.
- An ingest must **not block**, deny, or rewrite the agent.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes. After `cli/src` changes, rebuild via `bun run build`. Copilot and Claude Code cases are extra argv only (`copilot` / `claude-code` + `subagentStart` / `subagentStop`); e2e must **not spawn** those processes. Payloads that need YAML must **still include** a F001 session identifier, not Copilot `sessionId` alone.

### Out of scope

- Registering GitHub Copilot or Claude Code hooks.
- New Cursor registrations or other Cursor events.
- Changing `agent_type` source keys.
- Mapping `agentDescription`, `agentId`, or Copilot `sessionId`.
- Changing F001 Event log verbatim rules, Session index, daily-folder naming, or observe-only behavior.
- When a Session report is written, overview `source_harness`, or duration (F004 report-trigger rules).
- Reconstructing parent→subagent hierarchy.
- Blocking, denying, or rewriting the agent.
- PII redaction.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add persisted entities. Event log stays verbatim. YAML and report gain `agent_display_name` for Copilot when present; Cursor and Claude Code omit it:

- **Event log** — JSONL; each line is one Event, verbatim (F001), including `agentDisplayName`, `agentName`, `agentDescription`, and any other payload fields when present.
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier (F003); Copilot subagent-start documents include `agent_display_name` after `agent_type` and before `task` when present; Copilot subagent-stop documents include `agent_display_name` after `agent_type` and before `response_text` when present; Cursor and Claude Code subagent documents omit `agent_display_name`.
- **Session report** — F004 downstream consumer of YAML; chronological Details follow that same table order.

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- On Copilot subagent start/stop ingest (via extra argv; no Copilot registration), include `agent_display_name` after `agent_type` when Copilot sends `agentDisplayName`; omit for Cursor and Claude Code and when the Copilot key is absent.
- Do not change `agent_type` mapping (Copilot start `agentName`, Copilot stop `agentType`).
- YAML documents and Session report Details already follow the mapping table: `agent_display_name` appears without a new header shape or a new report structure.
- Remain observe-only (exit 0, no blocking stdout). Do not add Copilot/Claude registrations or other Cursor events.

## Verification Criteria

- [x] **AC-F007.1** — THE SYSTEM SHALL include `agent_display_name` in [`docs/normalized-fields.md`](../../normalized-fields.md) for subagent start and for subagent stop, with Copilot source key `agentDisplayName` and no Cursor or Claude Code source key, as an explicit exception to that document’s rule that only fields present in all three harnesses appear, alongside the existing `task` exception.
- [x] **AC-F007.2** — WHEN ingest writes a YAML document for Copilot subagent start and the payload has `agentDisplayName`, THE SYSTEM SHALL include `agent_display_name` after `agent_type` and before `task`.
- [x] **AC-F007.3** — WHEN ingest writes a YAML document for Copilot subagent stop and the payload has `agentDisplayName`, THE SYSTEM SHALL include `agent_display_name` after `agent_type` and before `response_text`.
- [x] **AC-F007.4** — WHEN the Copilot source key `agentDisplayName` is absent, THE SYSTEM SHALL omit `agent_display_name` and SHALL NOT invent it from any other payload field.
- [x] **AC-F007.5** — WHEN ingest writes a YAML document for Cursor or Claude Code subagent start or subagent stop, THE SYSTEM SHALL NOT include `agent_display_name` and SHALL NOT map it from any other payload field.
- [x] **AC-F007.6** — THE SYSTEM SHALL NOT use `agentDisplayName` or `agent_display_name` as a fallback or overlay for `agent_type`; Copilot subagent-start `agent_type` SHALL remain from `agentName`; Copilot subagent-stop `agent_type` SHALL remain from `agentType`.
- [x] **AC-F007.7** — THE SYSTEM SHALL remain F001 verbatim for the Event log (JSONL still has `agentDisplayName` when the payload has it) and SHALL remain observe-only (exit 0, no blocking stdout).

---

> last updated: 2026-09-01T19:04:00Z
