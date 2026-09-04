---
id: F006
slug: agent-stop-task
title: Agent-stop ingest and subagent task
kind: functional
category: ingest
tags: [hooks, ingest, cursor, codex]
status: qualified
created: 2026-09-01
released-version:
---
# F006 — Agent-stop ingest and subagent task

## Problem definition

F001–F005 and F010 persist hook events as a verbatim daily JSONL Event log, a Session index, a per-session Session JSONL log, and a Session report. Cursor `stop` is registered and creates a chronological agent-turn-end marker, but the equivalent Codex `Stop` hook is not yet specified as a supported stop invocation. Codex supplies native `session_id`, `turn_id`, and nullable `last_assistant_message`; losing those values would make the final assistant result available only by recovering its raw payload.

Cursor subagent-start payloads also send `task`, the instruction given to the subagent. That field must remain useful in the normalized log and report without inventing an equivalent for other harnesses.

This amendment to C002 keeps F001’s verbatim Event log and all existing Cursor stop and `task` behavior. F003 owns compact headers and table-driven mapping, F008 owns `turn`, F009 owns subagent identity/correlation, F010 owns JSONL format, and F004 owns report rendering. Codex has no native timestamp, so its existing generated receive-time header rule applies. The updated [`docs/events-args.md`](../../events-args.md) is the source schema: Codex `Stop` may force a continuation if a hook returns a block decision and reason, so audit-bot must return neither.

### User Stories

- As a developer, I want **Codex `Stop` to enter the observe-only ingest pipeline** so that each completed Codex agent turn is present in the session timeline.
- As a developer, I want **the native final assistant message retained as normalized `response_text` when available** so that I can read the outcome in the report without scanning raw JSON.
- As a developer, I want **Codex native session and turn identifiers preserved** so that stop data joins its actual session and turn without inference.
- As a developer, I want **Cursor subagent `task` retained only where Cursor supplies it** so that subagent instructions remain readable without false cross-harness data.

### Business Rules

- A project must **register ingest in `.codex/hooks.json`** so Codex invokes `Stop` with command `node .agents/hooks/index.mjs ingest codex Stop`; it must not configure an output decision, `reason`, continuation, block, denial, rewrite, or added context.
- An ingest invoked as `ingest codex Stop` must **persist the received object as F001** and, when its native `session_id` is present, append its F003/F010 Session JSONL object and refresh its F004 report.
- A Codex `Stop` must **use the received `session_id` as its session identity and received `turn_id` as its F008 turn identity**; it must not derive either value. Codex `turn_id` is not a normalized body field or report Detail because F008 represents it as `turn`.
- The normalized mapping in [`docs/normalized-fields.md`](../../normalized-fields.md) must **include agent-stop `response_text` as an explicit Codex-only exception**, sourced from `last_assistant_message`. A Codex `Stop` JSONL object may include `response_text` after its compact header when that source key is present; it must be JSON `null` when the source value is null and omitted when the source key is absent.
- Codex `last_assistant_message`, `session_id`, `turn_id`, `transcript_path`, `stop_hook_active`, and every other received field must **remain verbatim in the F001 Event log**. Only fields represented by the normalized contract may appear in the Session JSONL object; `transcript_path` remains excluded by F005.
- F004 Details for Codex `Stop` must **render `response_text` when present**, including JSON null, and omit it when absent. The report must not render raw `last_assistant_message`, `turn_id`, or `transcript_path` as separate Details.
- A project must **keep registering Cursor** `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` in the existing `node .agents/hooks/index.mjs ingest cursor {event}` command shape. Cursor `stop` behavior and its header-only body remain unchanged.
- The normalized mapping must **keep `task` on Cursor subagent start only**, sourced from Cursor `task`; Codex, Copilot, and Claude Code subagent-start records must not synthesize `task` from any other payload field.
- An ingest must **not block, deny, continue, rewrite, or otherwise direct Codex**. It must exit 0 and write no blocking stdout even when `last_assistant_message` is null or absent.

### Out of scope

- Codex events other than `Stop` (F001 and F005 own their registration and raw ingest).
- Changing F001 Event log or Session index rules, F003 header rules, F008 turn representation, F009 subagent correlation, F010 JSONL format, or F004 report structure.
- Persisting raw transcript paths in the Session JSONL log or report.
- Reconstructing parent/subagent hierarchy, new report sections, PII redaction, or deleting daily folders.
- Any Codex response that blocks, continues, denies, rewrites, or injects context.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): an **Event** is one verbatim hook payload, a **Session** groups related Events, a **Session JSONL log** is its append-only normalized sequence, and a **Session report** is derived from that sequence.

- **Event log** — retains the entire Codex `Stop` payload unchanged, including nullable `last_assistant_message`.
- **Session JSONL log** — appends a Codex `Stop` object under the native session; F003 provides the compact header and mapped `response_text`, while F008 uses native `turn_id`.
- **Session report** — presents `response_text` as the Codex `Stop` Detail through F004.

### CLI

- Configure Codex `Stop` as the existing bundled Node ESM command with `ingest codex Stop`, without any output behavior.
- On invocation, keep F001 raw persistence and, for a native session identifier, append the mapped JSONL object and regenerate the report through existing F003/F004/F008/F010 paths.
- Map only present Codex `last_assistant_message` to `response_text`; preserve null, omit absence, and leave all other native fields raw unless another normalized contract owns them.
- Preserve Cursor stop and subagent `task` support. Remain observe-only.

## Verification Criteria

- [x] **AC-F006.1** — THE SYSTEM SHALL register Cursor `stop` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor stop`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt`, and SHALL keep those five registrations.
- [x] **AC-F006.2** — WHEN ingest is invoked as `ingest cursor stop` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 and SHALL append a Session JSONL log object as F003/F010 when the payload has a session identifier.
- [x] **AC-F006.8** — WHEN a Cursor stop payload has a session identifier, THE SYSTEM SHALL write a JSON object that starts with `harness`, `event`, `timestamp`, and `turn`, then only the mapped agent-stop body fields (none for Cursor today); THE SYSTEM SHALL NOT include `session_id` in the body or `transcript_path`.
- [x] **AC-F006.4** — THE SYSTEM SHALL include Cursor subagent-start `task` in [`docs/normalized-fields.md`](../../normalized-fields.md), sourced only from Cursor `task`, as an explicit exception to the common-field rule.
- [x] **AC-F006.5** — WHEN ingest writes a JSON object for Cursor subagent start and the payload has `task`, THE SYSTEM SHALL include `task` after `subagent`; WHEN `task` is absent, THE SYSTEM SHALL omit it.
- [x] **AC-F006.6** — WHEN ingest writes a JSON object for Copilot or Claude Code subagent start, THE SYSTEM SHALL NOT include `task` and SHALL NOT map `task` from any other payload field.
- [x] **AC-F006.7** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for Cursor `stop` ingest and when the JSON object includes or omits `task`.
- [ ] **AC-F006.9** — THE SYSTEM SHALL register Codex `Stop` in `.codex/hooks.json` with command `node .agents/hooks/index.mjs ingest codex Stop` and SHALL configure no output decision, `reason`, continuation, block, denial, rewrite, or additional context.
- [ ] **AC-F006.10** — WHEN ingest is invoked as `ingest codex Stop` with a JSON object, THE SYSTEM SHALL persist that object verbatim as F001; WHEN the native `session_id` is present, it SHALL append the F003/F010 Session JSONL object and regenerate the F004 report; it SHALL use native `session_id` and `turn_id` without deriving either and SHALL use generated receive time because Codex provides no native timestamp.
- [ ] **AC-F006.11** — WHEN a Codex `Stop` payload has `last_assistant_message`, THE SYSTEM SHALL map it to `response_text` in the agent-stop row of [`docs/normalized-fields.md`](../../normalized-fields.md) and write it after the compact header; WHEN its value is null, the record SHALL contain `response_text: null`; WHEN the key is absent, the record SHALL omit `response_text`; the Event log SHALL retain the original `last_assistant_message` field verbatim.
- [ ] **AC-F006.12** — WHEN the F004 report renders a Codex `Stop` record with `response_text`, THE SYSTEM SHALL render it as Details and SHALL NOT separately render `last_assistant_message`, `turn_id`, or `transcript_path`; WHEN `response_text` is absent, Details SHALL omit it.
- [ ] **AC-F006.13** — THE SYSTEM SHALL exit successfully without stdout output or a Codex decision, continuation, block, denial, rewrite, follow-up, or added context for every Codex `Stop` ingest, including when `last_assistant_message` is null or absent.

### Deprecated criteria

- **AC-F006.3** — ~~WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a YAML document that starts with `session_id`, `source_harness`, `source_event`, and `timestamp` and then only the agent-stop body fields.~~ · retired 2026-09-01 (v0.10.0): F010 uses compact Session JSONL objects (AC-F006.8).

---

> last updated: 2026-09-04T15:45:21Z
