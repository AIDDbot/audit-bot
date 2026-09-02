---
id: F003
slug: ingest-normalized-yaml
title: Ingest normalized session log
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: pending
created: 2026-09-01
released-version: 0.17.1
---
# F003 — Ingest normalized session log

## Problem definition

F001 persists each hook payload as a verbatim daily JSONL Event log and a Session index of distinct session identifiers. F002 supplies harness and event on the ingest command so later logic can key off them without parsing the payload. Those two artifacts remain raw: they do not present a per-session, harness-neutral view of the fields that the three agent hosts share.

Developers need ingest, on the same invocation that writes the Event log and Session index, to also append a normalized JSON object for that event to the Session JSONL log. F010 owns that artifact’s format, filename `{session_id}.jsonl`, and serialization; this spec owns the compact header, mapping, and omit-absent / present-null rules applied to each JSON object. The log lives in the same date-named folder, one file per session, so a later reporting step can read a sequential log without scanning the Event log or reconstructing harness-specific keys. The filename `{session_id}.jsonl` already encodes the F001 session identifier; repeating `session_id` on every object wastes characters. Compact header keys (`harness`, `event`) and writing `session_id` only on the initial session-start object keep the log short while the filename and that first session-start object still carry the identifier. This spec does not replace F001, F002, or F010. Event log verbatim rules, Session index rules, observe-only exit/stdout, and the four Cursor registrations stay as they are.

This amend (F009) persists identity as `subagent` (rename of `agent_type`) after the header on **every** JSON object when a matching payload attribute is present — including prompt, agent-stop, session start/end, and header-only unmapped objects (`harness` / `event` empty or unmatched). Other body fields stay table-driven for the event kind. Extraction, source-key preference, and the mapping-table rename are F009; this spec does not duplicate those ACs. Omit-absent / present-null stay.

This amend shortens new headers: `source_harness` / `source_event` become `harness` / `event`, and `session_id` is written only on the initial session-start object (`event` `sessionStart` / `SessionStart` when that session’s Session JSONL log does not already contain a session-start object). Objects are no longer fully self-contained for `session_id`; the filename and the initial session-start object carry it. When the first event for a session is not session-start, no object gets `session_id`. Prior objects are not rewritten. Header-only unmapped objects follow the same compact header (five fields when that object is the initial session-start; four otherwise). How `turn` is numbered is F008; this spec requires the field, its order after `timestamp`, and that it is a JSON number.

This amend (C001 / F010) replaces the Session YAML log with the Session JSONL log. F003 remains owner of compact header, `session_id` only on the initial session-start, omit-absent / present-null, table-driven body, unmapped header-only, and the subagent-after-header exception (F009). F010 owns format, filename, and serialization.

Normalized field names and per-event, per-harness source keys are those already defined in [`docs/normalized-fields.md`](../../normalized-fields.md) (titled *Campos de entrada normalizados por evento*). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md).

### User Stories

- As a developer, I want **a per-session JSONL log of each ingested event** so that later reporting can read one file per session without scanning the raw Event log.
- As a developer, I want **compact headers (`harness`, `event`, local time, and conversation turn)** so that each JSON object stays short and does not repeat `session_id` already encoded in the filename.
- As a developer, I want **`session_id` written only on the initial session-start object** so that later events in the same file do not repeat the identifier.
- As a developer, I want **only the shared normalized fields in the JSON object body** so that harness-specific extras stay in the Event log and do not leak into the session file.
- As a developer, I want **Event log and Session index behavior unchanged** so that existing consumers of those artifacts are not broken.
- As a developer, I want **all three writes from the same in-memory event** so that ingest stays a single observe-only invocation.

### Business Rules

- An ingest must **still persist as F001** (verbatim Event log, Session index rules, create the daily folder when missing, observe-only exit 0 and no blocking stdout) on every invocation, including those that also write a Session JSONL log (F010).
- Session-log records this spec maps are always **F010 Session JSONL log objects** (one JSON object per Event in `{session_id}.jsonl`). F010 owns format, filename, and serialization; this spec owns compact header, `session_id` only on the initial session-start, omit-absent / present-null, table-driven body, unmapped header-only, and the subagent-after-header exception (F009).
- When an event belongs to a session identifier, mapping must **produce exactly one JSON object** that F010 appends to that session’s Session JSONL log.
- When an event has **no session identifier**, F001 persist still applies and F010 does **not** create or append a Session JSONL log (AC-F010.5). Mapping in this spec applies only when F010 writes that log.
- An ingest must **not rewrite, reorder, or restructure** previously written objects in a Session JSONL log (append-only), including their `turn` values and whether they contain `session_id`.
- A JSON object must **not nest** a subagent event under a parent event. Every event is an independent sequential object. Reconstructing parent→subagent hierarchy is out of scope.
- On a **new** JSON object, header keys must **be** `harness` and `event` (not `source_harness` or `source_event`).
- `harness` and `event` are always **the F002 ingest positionals as supplied** (`ingest {harness} {event}`). When a positional is omitted, that header field is the empty string. An ingest must **not infer** harness or event from the payload. F002 command positionals must **not** change. The Event log must **stay verbatim** (no overlay).
- A JSON object may **include `session_id` only if** it is the **initial session-start** object: `event` is `sessionStart` or `SessionStart`, **and** that session’s Session JSONL log does **not** already contain a session-start object. `session_id` when present is always **the same F001 session identifier** used as the filename stem.
- On every other object (prompt, stop, subagent, sessionEnd, a later or duplicate sessionStart, header-only unmapped, and any object when the first event for the session is not session-start), an ingest must **omit** `session_id`. When the first event for a session is **not** session-start (abrupt / missing `sessionStart`), **no** object gets `session_id`. The filename `{session_id}.jsonl` still uses the F001 identifier.
- An ingest must **not rewrite** prior objects to strip or add `session_id`.
- The **initial session-start** object (has `session_id`) must **start with these five fields, in this order**: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every **other** object (no `session_id`) must **start with these four fields, in this order**: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` is always **host-local 24-hour `HH:MM:SS`** (zero-padded; date is the enclosing folder, so it is not repeated). When the payload has its own `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), an ingest must **format that instant**. When it does not, an ingest must **generate** the clock time at the moment it receives the event (the same receive instant used for the daily folder date). A generated timestamp must **not** be written onto the Event log line.
- `turn` is always **a JSON number** (conversation turn as F008; not a body field). Determining `turn` may **use** prompt-kind objects already in that Session JSONL log (F008) and must **not rewrite** them.
- After the header, a JSON object body may **include only** the normalized common fields that apply to this event type in [`docs/normalized-fields.md`](../../normalized-fields.md), excluding `session_id` (already in the filename, and on the initial session-start header when present), using those snake_case names, in table order — except `subagent`, which F009 may **include after the header and before other body fields** on any object when a matching payload attribute is present. Source keys for every other body field are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). `subagent` source attributes are F009 (not the F002 `harness` positional).
- Event kinds for that mapping are: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- An ingest must **not include** any harness-specific or event-specific field that is not in that normalized set — those remain available only in the Event log.
- When a mapped source key is **absent** from the payload, the body field must **be omitted**. When the source key is present and the value is `null`, the body field must **be JSON `null`**. Present non-null values are stored as JSON values so the object remains valid JSON and the value is preserved.
- When `harness` or `event` does **not match** a mapping row and column, the object must **contain the header fields only**, except `subagent` when a matching payload attribute is present (F009): five header fields (`session_id`, `harness`, `event`, `timestamp`, `turn`) when it is the initial session-start object; four header fields (`harness`, `event`, `timestamp`, `turn`) when it is any other object. An ingest must **not** include any other extra body field on an unmapped object.
- An ingest must **map the header and body** in the same invocation as the F001 persist and the F010 Session JSONL log append, from the same in-memory event — no second process, and no re-reading of files that were just written.
- An ingest must **be safe to invoke repeatedly and concurrently** as F001: neither the Event log, the Session index, nor a Session JSONL log may be torn, concatenated, or left as invalid JSON; the Session index must remain a JSON array of unique identifiers. Complete session-log records and F001 validity stay this spec; lock and serialization stay F010.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes (plus any small helper that script needs).

### Out of scope

- Reconstructing parent→subagent hierarchy or any nested JSON structure (later reporting).
- Per-session reports, dashboards, or query commands (later).
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Overlaying harness, event name, or timestamp onto the stored Event log line.
- Making the F002 positionals required, or failing ingest when they are missing or unrecognized. F002 command positionals stay `ingest {harness} {event}`.
- Inferring harness or event from the payload.
- Rewriting existing Session JSONL log objects, or migrating old `source_harness` / `source_event` / per-document `session_id` keys.
- Changing body field names in [`docs/normalized-fields.md`](../../normalized-fields.md), except the F009 rename of `agent_type` to `subagent`.
- Adding a new user-facing command.
- How `turn` is numbered beyond requiring the header field (F008).
- Registering GitHub Copilot or Claude Code hooks.
- Registering Cursor events other than the four F001 registrations (ingest still persists whatever JSON object arrives; mapping for prompt and agent-stop applies if those events are received).
- Deleting or rotating older daily folders.
- Blocking, denying, or rewriting the agent.
- Duplicating F010 format ACs (filename `.jsonl`, `JSON.stringify` / `JSON.parse`, stop writing yaml, lock).
- Migrating old `{session_id}.yaml` session logs.
- Mixing YAML and JSONL in one session.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This feature keeps F001’s two daily artifacts and maps each Event onto F010’s third:

- **Event log** — JSONL; each line is one Event, verbatim (F001).
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session JSONL log** — one `{session_id}.jsonl` per distinct F001 session identifier (F010); append-only; each JSON object is one Event, normalized by this spec, with JSON-number `turn` on the header (F008). `session_id` appears on the object only for the initial session-start; the filename stem is always the F001 identifier.

All three artifacts live in the same folder named for the current date.

### CLI

- On each ingest invocation that receives a JSON object, append the Event log line and update the Session index as F001; when the payload has a session identifier, also append one mapped JSON object to `{session_id}.jsonl` in that same daily folder (F010).
- Build that JSON object from the in-memory event plus the F002 harness and event positionals; do not re-read the Event log or Session index to produce it. Write compact header keys `harness` and `event`. Write `session_id` only on the initial session-start object. Include `turn` after `timestamp` (F008). Include `subagent` after the header when a matching payload attribute is present, including on header-only/unmapped objects (F009); other body fields stay table-driven. Present-null is JSON `null`.
- Keep Event log lines verbatim (no timestamp, harness, or event overlay).
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, correct under repeated and concurrent hook invocations, observe-only.

## Verification Criteria

- [ ] **AC-F003.13** — THE SYSTEM SHALL write header fields `harness` and `event` (not `source_harness` or `source_event`) on every new JSON object in the Session JSONL log, equal to the F002 ingest positionals as supplied (`ingest {harness} {event}`); WHEN a positional is omitted, that header field SHALL be the empty string; THE SYSTEM SHALL NOT infer harness or event from the payload.
- [ ] **AC-F003.14** — WHEN the JSON object is the initial session-start for that session (`event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log does not already contain a session-start object), THE SYSTEM SHALL write `session_id` equal to the F001 session identifier used as the filename stem; WHEN the object is any other event (including prompt, stop, subagent, sessionEnd, a later or duplicate sessionStart, header-only unmapped, or when the first event for the session is not session-start), THE SYSTEM SHALL omit `session_id`; WHEN the first event for a session is not session-start, THE SYSTEM SHALL write `session_id` on no object; THE SYSTEM SHALL NOT rewrite previously written objects to strip or add `session_id`.
- [ ] **AC-F003.15** — WHEN the JSON object is the initial session-start (has `session_id`), THE SYSTEM SHALL start the object with `session_id`, `harness`, `event`, `timestamp`, and `turn` in that order; WHEN the object is any other object (no `session_id`), THE SYSTEM SHALL start the object with `harness`, `event`, `timestamp`, and `turn` in that order.
- [x] **AC-F003.4** — WHEN the payload includes its own `timestamp`, THE SYSTEM SHALL write `timestamp` as that instant in host-local `HH:MM:SS`. WHEN it does not, THE SYSTEM SHALL write a generated host-local `HH:MM:SS` from receive time and SHALL NOT add that value to the Event log line.
- [ ] **AC-F003.5** — THE SYSTEM SHALL include in the body of the JSON object only the normalized common fields for the event kind in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), mapped from the harness-specific source keys for `harness` and `event`, in table order, omitting absent keys and emitting JSON `null` for present nulls; THE SYSTEM SHALL NOT include fields outside that set, except `subagent` when a matching payload attribute is present (F009; AC-F003.17).
- [ ] **AC-F003.6** — THE SYSTEM SHALL write every JSON object as an independent sequential event (no nesting of subagent events under a parent).
- [ ] **AC-F003.16** — WHEN `harness` or `event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a JSON object that contains the header fields only, except `subagent` when a matching payload attribute is present (F009; AC-F003.17): five fields (`session_id`, `harness`, `event`, `timestamp`, `turn`) WHEN the object is the initial session-start; four fields (`harness`, `event`, `timestamp`, `turn`) WHEN it is any other object; THE SYSTEM SHALL NOT include any other extra body field on that object.
- [ ] **AC-F003.17** — WHEN the payload has a matching `subagent` source attribute (F009), THE SYSTEM SHALL include `subagent` after the header of that JSON object, including WHEN `harness` or `event` is empty or does not match a mapping row and column, and including WHEN the event-kind mapping row does not list `subagent`; THE SYSTEM SHALL NOT include any other body field that the event-kind mapping does not list on that basis; WHEN no matching `subagent` source attribute is present, THE SYSTEM SHALL omit `subagent`.
- [ ] **AC-F003.9** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete JSONL records and SHALL keep the Event log and Session index valid as F001 (no torn, concatenated, or duplicated records).
- [x] **AC-F003.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.
- [ ] **AC-F003.18** — THE SYSTEM SHALL map each ingested event that belongs to a session identifier to one F010 Session JSONL log object (not a YAML document); header and body mapping in this spec apply to that JSON object. Format, filename, and serialization remain F010.

### Deprecated criteria

- **AC-F003.3** — ~~THE SYSTEM SHALL start every YAML document with `session_id`, `source_harness`, `source_event`, and `timestamp` in that order, where `session_id` equals the F001 session identifier (and the filename stem), and `source_harness` / `source_event` equal the F002 positionals (empty string when omitted).~~ · retired 2026-09-01: header is five fields including `turn` (F008; AC-F003.11).
- **AC-F003.8** — ~~WHEN `source_harness` or `source_event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a YAML document that contains the four header fields only.~~ · retired 2026-09-01: unmapped documents are five header fields only (AC-F003.12).
- **AC-F003.11** — ~~THE SYSTEM SHALL start every YAML document with `session_id`, `source_harness`, `source_event`, `timestamp`, and `turn` in that order, where `session_id` equals the F001 session identifier (and the filename stem), `source_harness` / `source_event` equal the F002 positionals (empty string when omitted), and `turn` is a YAML integer (F008).~~ · retired 2026-09-02 (v0.12.0): compact keys `harness` / `event`; `session_id` only on the initial session-start document (AC-F003.13, AC-F003.14, AC-F003.15).
- **AC-F003.12** — ~~WHEN `source_harness` or `source_event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a YAML document that contains the five header fields only.~~ · retired 2026-09-02 (v0.12.0): unmapped documents are five header fields only on the initial session-start, four on every other document (AC-F003.16).
- **AC-F003.1** — ~~WHEN ingest receives a JSON object that has a session identifier, THE SYSTEM SHALL, in that same invocation, append the Event log line and update the Session index as F001, and SHALL append exactly one YAML document to `{session_id}.yaml` inside the folder named for the current date, using the in-memory event (no second process; no re-read of files just written).~~ · retired 2026-09-02: F010 writes `{session_id}.jsonl` (AC-F010.1).
- **AC-F003.2** — ~~THE SYSTEM SHALL write each Session YAML log as multi-document YAML with documents separated by `---`, SHALL begin each appended document with `---`, and SHALL NOT rewrite or restructure previously written documents in that file.~~ · retired 2026-09-02: F010 JSONL lines (AC-F010.2).
- **AC-F003.7** — ~~WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create or append a Session YAML log.~~ · retired 2026-09-02: F010 owns Session JSONL log creation when no session id (AC-F010.5).

---

> last updated: 2026-09-02T14:41:36Z
