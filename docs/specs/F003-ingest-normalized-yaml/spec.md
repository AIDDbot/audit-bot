---
id: F003
slug: ingest-normalized-yaml
title: Ingest normalized YAML
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: in-progress
created: 2026-09-01
released-version: 0.7.0
---
# F003 — Ingest normalized YAML

## Problem definition

F001 persists each hook payload as a verbatim daily JSONL Event log and a Session index of distinct session identifiers. F002 supplies source harness and source event on the ingest command so later logic can key off them without parsing the payload. Those two artifacts remain raw: they do not present a per-session, harness-neutral view of the fields that the three agent hosts share.

Developers need ingest, on the same invocation that writes the Event log and Session index, to also append a normalized YAML document for that event. The YAML lives in the same date-named folder, one file per session, so a later reporting step can read a self-contained sequential log without scanning JSONL or reconstructing harness-specific keys. This spec does not replace F001 or F002. Event log verbatim rules, Session index rules, observe-only exit/stdout, and the four Cursor registrations stay as they are.

This amend adds `turn` as a fifth YAML header field so each document is tagged with the conversation turn it belongs to (F008). Header-only unmapped documents include `turn` as well. How `turn` is numbered is F008; this spec requires the field, its order, and that it is a YAML integer.

Normalized field names and per-event, per-harness source keys are those already defined in [`docs/normalized-fields.md`](../../normalized-fields.md) (titled *Campos de entrada normalizados por evento*). Event-kind names across harnesses are those in [`docs/events-args.md`](../../events-args.md).

### User Stories

- As a developer, I want **a per-session YAML log of each ingested event** so that later reporting can read one file per session without scanning the raw JSONL.
- As a developer, I want **each YAML document to carry harness, source event, a local time, and a conversation turn** so that the document is self-contained even though the filename and the daily folder already encode session and date.
- As a developer, I want **only the shared normalized fields in the YAML body** so that harness-specific extras stay in the Event log and do not leak into the session file.
- As a developer, I want **JSONL and Session index behavior unchanged** so that existing consumers of those artifacts are not broken.
- As a developer, I want **all three writes from the same in-memory event** so that ingest stays a single observe-only invocation.

### Business Rules

- An ingest must **still persist as F001** (verbatim Event log, Session index rules, create the daily folder when missing, observe-only exit 0 and no blocking stdout) on every invocation, including those that also write YAML.
- A Session YAML log is always **a `.yaml` file** named `{session_id}.yaml` inside that day’s folder, where `{session_id}` is the F001 session identifier already used for the Session index (`session_id`, else `conversation_id`, else `parent_conversation_id`; never invented; never Copilot `sessionId`).
- When an event belongs to a session identifier, an ingest must **append exactly one YAML document** to that session’s YAML log.
- When an event has **no session identifier**, the Event log must **still receive the line**, the Session index must **stay unchanged**, and an ingest must **not create or append** a Session YAML log.
- A Session YAML log is always **multi-document YAML**: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- An ingest must **not rewrite, reorder, or restructure** previously written documents in a Session YAML log (append-only), including their `turn` values.
- A YAML document must **not nest** a subagent event under a parent event. Every event is an independent sequential document. Reconstructing parent→subagent hierarchy is out of scope.
- A YAML document always **starts with these five fields, in this order**: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`.
- `session_id` on the document is always **the same F001 session identifier** used as the filename (the document is self-contained).
- `source_harness` and `source_event` are always **the F002 ingest positionals as supplied** (`ingest {harness} {event}`). When a positional is omitted, that header field is the empty string. An ingest must **not infer** harness or event from the payload.
- `timestamp` is always **host-local 24-hour `HH:MM:SS`** (zero-padded; date is the enclosing folder, so it is not repeated). When the payload has its own `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), an ingest must **format that instant**. When it does not, an ingest must **generate** the clock time at the moment it receives the event (the same receive instant used for the daily folder date). A generated timestamp must **not** be written onto the Event log line.
- `turn` is always **a YAML integer** (conversation turn as F008; not a body field). Determining `turn` may **use** prompt-kind documents already in that Session YAML log (F008) and must **not rewrite** them.
- After the header, a YAML document body may **include only** the normalized common fields that apply to this event type in [`docs/normalized-fields.md`](../../normalized-fields.md), excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping are: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- An ingest must **not include** any harness-specific or event-specific field that is not in that normalized set — those remain available only in the Event log.
- When a mapped source key is **absent** from the payload, the body field must **be omitted**. When the source key is present and the value is `null`, the body field must **be YAML `null`**. Present non-null values are stored as YAML scalars (or block scalars when needed) so the document remains valid YAML and the value is preserved.
- When `source_harness` or `source_event` does **not match** a mapping row and column, the document must **contain the five header fields only**.
- An ingest must **perform the Event log append, the Session index update, and the YAML append** in the same invocation, from the same in-memory event — no second process, and no re-reading of files that were just written.
- An ingest must **be safe to invoke repeatedly and concurrently** as F001: neither the Event log, the Session index, nor a Session YAML log may be torn, concatenated, or left as invalid JSON/YAML; the Session index must remain a JSON array of unique identifiers.
- An ingest must **run as Node.js ≥ 24 ESM with no external dependencies**, as the same script Cursor already invokes (plus any small helper that script needs).

### Out of scope

- Reconstructing parent→subagent hierarchy or any nested YAML structure (later reporting).
- Per-session reports, dashboards, or query commands (later).
- Changing F001 Event log verbatim rules, Session index rules, daily-folder naming, or observe-only exit/stdout.
- Overlaying harness, event name, or timestamp onto the stored Event log line.
- Making the F002 positionals required, or failing ingest when they are missing or unrecognized.
- Inferring source harness or source event from the payload.
- How `turn` is numbered beyond requiring the header field (F008).
- Registering GitHub Copilot or Claude Code hooks.
- Registering Cursor events other than the four F001 registrations (ingest still persists whatever JSON object arrives; YAML mapping for prompt and agent-stop applies if those events are received).
- Deleting or rotating older daily folders.
- Blocking, denying, or rewriting the agent.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This feature keeps F001’s two daily artifacts and adds a third:

- **Event log** — JSONL; each line is one Event, verbatim (F001).
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier; append-only multi-document YAML; each document is one Event, normalized, with integer `turn` on the header (F008).

All three artifacts live in the same folder named for the current date.

### CLI

- On each ingest invocation that receives a JSON object, append the Event log line and update the Session index as F001; when the payload has a session identifier, also append one normalized YAML document to `{session_id}.yaml` in that same daily folder.
- Build that YAML document from the in-memory event plus the F002 source harness and source event positionals; do not re-read the Event log or Session index to produce it. Include `turn` as the fifth header field (F008).
- Keep Event log lines verbatim (no timestamp, harness, or event overlay).
- Remain a single Node.js ≥ 24 ESM ingest with no external dependencies, correct under repeated and concurrent hook invocations, observe-only.

## Verification Criteria

- [x] **AC-F003.1** — WHEN ingest receives a JSON object that has a session identifier, THE SYSTEM SHALL, in that same invocation, append the Event log line and update the Session index as F001, and SHALL append exactly one YAML document to `{session_id}.yaml` inside the folder named for the current date, using the in-memory event (no second process; no re-read of files just written).
- [x] **AC-F003.2** — THE SYSTEM SHALL write each Session YAML log as multi-document YAML with documents separated by `---`, SHALL begin each appended document with `---`, and SHALL NOT rewrite or restructure previously written documents in that file.
- [x] **AC-F003.11** — THE SYSTEM SHALL start every YAML document with `session_id`, `source_harness`, `source_event`, `timestamp`, and `turn` in that order, where `session_id` equals the F001 session identifier (and the filename stem), `source_harness` / `source_event` equal the F002 positionals (empty string when omitted), and `turn` is a YAML integer (F008).
- [x] **AC-F003.4** — WHEN the payload includes its own `timestamp`, THE SYSTEM SHALL write `timestamp` as that instant in host-local `HH:MM:SS`. WHEN it does not, THE SYSTEM SHALL write a generated host-local `HH:MM:SS` from receive time and SHALL NOT add that value to the Event log line.
- [x] **AC-F003.5** — THE SYSTEM SHALL include in the YAML body only the normalized common fields for the event kind in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), mapped from the harness-specific source keys for `source_harness` and `source_event`, in table order, omitting absent keys and emitting YAML `null` for present nulls; THE SYSTEM SHALL NOT include fields outside that set.
- [x] **AC-F003.6** — THE SYSTEM SHALL write every YAML document as an independent sequential event (no nesting of subagent events under a parent).
- [x] **AC-F003.7** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create or append a Session YAML log.
- [x] **AC-F003.12** — WHEN `source_harness` or `source_event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a YAML document that contains the five header fields only.
- [x] **AC-F003.9** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete YAML documents and SHALL keep the Event log and Session index valid as F001 (no torn, concatenated, or duplicated records).
- [x] **AC-F003.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

### Deprecated criteria

- **AC-F003.3** — ~~THE SYSTEM SHALL start every YAML document with `session_id`, `source_harness`, `source_event`, and `timestamp` in that order, where `session_id` equals the F001 session identifier (and the filename stem), and `source_harness` / `source_event` equal the F002 positionals (empty string when omitted).~~ · retired 2026-09-01: header is five fields including `turn` (F008; AC-F003.11).
- **AC-F003.8** — ~~WHEN `source_harness` or `source_event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a YAML document that contains the four header fields only.~~ · retired 2026-09-01: unmapped documents are five header fields only (AC-F003.12).

---

> last updated: 2026-09-01T20:19:52Z
