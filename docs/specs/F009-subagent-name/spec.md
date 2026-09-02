---
id: F009
slug: subagent-name
title: Subagent name on every event
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: verified
created: 2026-09-02
released-version: 0.17.0
---
# F009 — Subagent name on every event

## Problem definition

F003 persists subagent identity only from the subagent-start and subagent-stop rows of [`docs/normalized-fields.md`](../../normalized-fields.md), under the name `agent_type`, and only when `harness` and `event` match that table. Unmapped or header-only objects get no body fields. Prompt, agent-stop, and session-start objects therefore never persist the name even when the payload carries it. F004 then shows that identity only on start/stop rows, as `{name}: {value}` pairs (`agent_type: builder`). Developers scanning the report cannot tell which subagent ran on other rows, and the prefix is noise — they need the name only.

Each harness names the same concept differently (`subagent_type`, `agent_type`, `agentType`, `agentName`). Relying on the F002 `harness` positional to pick the source key fails when that positional is empty or unrecognized; the name is still in the JSON.

This spec does not replace F001–F008 or F010. Event log verbatim rules, Session index, observe-only exit/stdout, F002 positionals, F003 compact JSONL header / omit-absent / table-driven body / turn, F008 turn numbering, F010 format/filename/serialization, hook registrations, and F007 `agent_display_name` stay in force. This spec does not duplicate F003, F004, F007, or F010 acceptance criteria. F003 is amended so `subagent` may appear after the header on any JSON object, including header-only/unmapped, without opening other extra body fields. F004 is amended so the Subagent cell is the bare `subagent` value when that field is present on the JSON object. F007 is amended so identity is `subagent`, not `agent_type`; `agent_display_name` remains Copilot-only and is not a fallback for identity.

This amend (C001 / F010) writes `subagent` onto Session JSONL log records (JSON objects), not Session YAML log documents. Present-null is JSON `null`. Format, filename, and serialization stay F010. Compact JSONL header and table-driven body stay F003. Extraction, source-key preference, and emit-on-every-event stay this spec.

Normalized body fields per event kind remain those in [`docs/normalized-fields.md`](../../normalized-fields.md). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md). That mapping table currently lists identity only on subagent start/stop; this spec requires renaming that row to `subagent` and persisting the field on every JSON object when a matching payload attribute is present.

### User Stories

- As a developer, I want **`subagent` persisted on every Session JSONL log record when the payload names a subagent** so that identity is not limited to start/stop rows.
- As a developer, I want **that name extracted from the incoming JSON regardless of harness, including when the F002 harness positional is empty** so that Cursor, Copilot, and Claude Code payloads still yield a name.
- As a developer, I want **the report Subagent column to show only that name** so that I can scan who ran without a field-name prefix.

### Business Rules

- The normalized mapping in [`docs/normalized-fields.md`](../../normalized-fields.md) must **rename** `agent_type` to `subagent`. Source keys for the subagent-start and subagent-stop rows stay: Cursor `subagent_type`; Copilot start `agentName`, Copilot stop `agentType`; Claude Code `agent_type`. An ingest must **not** keep writing `agent_type` on new JSON objects.
- A JSON object may **include `subagent` after the header and before other body fields** when a matching payload attribute is present, for every event kind (session start, session end, user prompt, agent stop, subagent start, subagent stop) and for header-only unmapped objects (`harness` or `event` empty or unmatched). Other body fields must **still follow** F003 table-driven mapping for the event kind.
- When no matching source attribute is present, `subagent` must **be omitted** (F003 omit-absent). When the matching source key is present and the value is `null`, `subagent` must **be JSON `null`**.
- Extracting `subagent` must **not** use the F002 `harness` positional to choose the source key. The first present payload attribute in this preference is always **the source**: `subagent_type`, then `agent_type`, then `agentType`, then `agentName` (so Copilot stop prefers `agentType` over `agentName` when both are present).
- An ingest must **not map** `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`.
- An ingest must **not use** `agentDisplayName` or `agent_display_name` as a fallback or overlay for `subagent` (F007). Copilot start identity source stays `agentName`; Copilot stop identity source stays `agentType`.
- `agent_display_name` must **still be persisted** on Copilot subagent start/stop JSON objects when Copilot sends `agentDisplayName` (F007). It must **not** appear in the report Subagent cell (F004).
- A Session report Subagent cell may **include only** the `subagent` value (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar). When `subagent` is absent from that JSON object, the cell must **be empty**. The cell must **be filled whenever** that JSON object has `subagent`, not only for start/stop. An ingest must **not** copy `subagent` onto later objects that omit it. An ingest must **not** reconstruct parent→subagent hierarchy. AC-F004.6 100-character single-line preview still applies to that cell. Details must **not** repeat `subagent` or the retired name `agent_type`, and must **not** include `agent_display_name`.
- An ingest must **not rewrite** previously written JSON objects (F010 append-only). Prior Session YAML log documents that still have `agent_type` are not migrated.
- Event log JSONL must **stay verbatim** (F001). Session index, F002 positionals, compact JSONL header (`harness`, `event`, `session_id` only on the initial session-start, `turn`), F008 turn numbering, F010 format/filename/serialization, hook registrations, and observe-only exit 0 / no blocking stdout must **not** change.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes.

### Out of scope

- Changing F001 Event log verbatim rules, Session index, daily-folder naming, or observe-only exit/stdout.
- Overlaying `subagent` onto the stored Event log line.
- Changing F002 command positionals, or inferring harness or event from the payload (scanning payload attributes for `subagent` as specified is in scope).
- Rewriting existing JSON objects or migrating old `agent_type` keys.
- Session JSONL log format, filename `{session_id}.jsonl`, or serialization (F010).
- Duplicating F010 format ACs, F003 mapping ACs, or F004 Subagent-cell ACs.
- Migrating old `{session_id}.yaml` session logs.
- Opening F003 body mapping to arbitrary extra fields (only `subagent` is the exception).
- Reconstructing parent→subagent hierarchy or copying identity onto later rows that omit it.
- Showing `agent_display_name` in the Subagent cell or using it as an identity fallback.
- Mapping `agentDescription`, `agentId`, `subagent_id`, or `task` into `subagent`.
- Changing F008 turn numbering.
- Registering GitHub Copilot or Claude Code hooks, or any new Cursor hook.
- Adding a new user-facing command.
- PII redaction.
- Blocking, denying, or rewriting the agent.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010); a **Session report** is the Markdown file derived from that JSONL (F004).

This spec does not add a persisted entity. It renames the identity field `agent_type` → `subagent`, persists that field on every JSON object when a matching payload attribute is present, and changes the report Subagent cell to that value only:

- **Event log** — JSONL; each line is one Event, verbatim (F001); no overlay of `subagent`.
- **Session index** — JSON array of distinct session identifiers for that day (F001); unchanged.
- **Session JSONL log** — one `{session_id}.jsonl` per distinct F001 session identifier (F010); new JSON objects persist `subagent` after the compact JSONL header when a matching payload attribute is present, including header-only/unmapped; other body fields stay table-driven; prior objects are not rewritten.
- **Session report** — F004 downstream consumer; Subagent cell is the bare `subagent` value when that JSON object has the field (F004 amend).

All four artifacts live in the same folder named for the current date.

### CLI

Per [`system.arch.md`](../../arch/system.arch.md):

- On each Session JSONL log append, persist `subagent` after the compact JSONL header when a preferred payload attribute is present, on every event kind including header-only/unmapped; omit when none of those attributes is present; write JSON `null` when the chosen key is present and null.
- Take the first present payload attribute in preference order `subagent_type`, `agent_type`, `agentType`, `agentName`. Do not select the source key from the F002 `harness` positional. Do not map from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`.
- Keep `agent_display_name` on Copilot subagent start/stop JSON objects when present (F007). Do not show it in the Subagent cell.
- Session report Subagent cell is the name only (F004). Details do not repeat `subagent`.
- Rename the identity row in [`docs/normalized-fields.md`](../../normalized-fields.md) from `agent_type` to `subagent` (same start/stop source-key columns).
- Keep Event log lines verbatim. Remain observe-only (exit 0, no blocking stdout). Do not add hook registrations or a new command.

## Verification Criteria

- [x] **AC-F009.1** — THE SYSTEM SHALL rename the normalized field `agent_type` to `subagent` in [`docs/normalized-fields.md`](../../normalized-fields.md) (Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`) and SHALL persist that field as `subagent` on new Session JSONL log records (JSON objects) (not `agent_type`).
- [x] **AC-F009.2** — WHEN ingest appends a JSON object to a Session JSONL log and the payload has a matching subagent source attribute, THE SYSTEM SHALL include `subagent` on that JSON object after the header and before other body fields, for every event kind including session start, session end, user prompt, agent stop, subagent start, subagent stop, and header-only unmapped objects; WHEN no matching source attribute is present, THE SYSTEM SHALL omit `subagent`; WHEN the matching source key is present and the value is `null`, THE SYSTEM SHALL write JSON `null`.
- [x] **AC-F009.3** — WHEN extracting `subagent`, THE SYSTEM SHALL use the first present payload attribute in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; THE SYSTEM SHALL NOT select the source key from the F002 `harness` positional.
- [x] **AC-F009.4** — THE SYSTEM SHALL NOT map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`.
- [x] **AC-F009.5** — THE SYSTEM SHALL remain F001 verbatim for the Event log and SHALL remain observe-only (exit 0, no blocking stdout).

---

> last updated: 2026-09-02T16:36:12Z
