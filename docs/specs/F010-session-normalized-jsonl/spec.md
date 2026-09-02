---
id: F010
slug: session-normalized-jsonl
title: Session normalized JSONL
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: in-progress
created: 2026-09-02
---
# F010 — Session normalized JSONL

## Problem definition

Ingest already writes a per-session normalized log so F004/F008 can read one session without scanning F001 `events.jsonl` or re-deriving harness keys. That log is `{session_id}.yaml` because a human was expected to open it. F004’s Markdown report is now that human view. The YAML path is a hand-rolled emit/parse subset (no YAML library). JSONL uses `JSON.stringify` / `JSON.parse` already used by F001. This is a **maintainability** change, not a performance change.

This spec owns **format, filename, and serialization** of the session log. Normalized field names, compact-header mapping, omit-absent / present-null, and per-event body tables stay F003 / F009 / F007 / F006 — this spec does not restate those ACs. F001 Event log stays the verbatim, day-wide archive. F002 positionals stay. How `turn` is numbered stays F008. How the Markdown report is built stays F004, except that its source file is this JSONL.

### User Stories

- As a developer, I want **a per-session JSONL log of each ingested event** so that later reporting can read one file per session without scanning `events.jsonl`.
- As a developer, I want **each line to be `JSON.stringify` / `JSON.parse`** so that ingest does not maintain a YAML subset.
- As a developer, I want **new ingests to stop writing `{session_id}.yaml`** so that a session is not split across two formats.
- As a developer, I want **existing `.yaml` session logs left untouched** so that historical files are not migrated or rewritten.
- As a developer, I want **F001 `events.jsonl` unchanged** so that the verbatim Event log stays day-wide with no session overlay.

### Business Rules

- A Session JSONL log is always **a `.jsonl` file** named `{session_id}.jsonl` inside the F001 daily folder, where `{session_id}` is the F001 session identifier (same stem as today’s `{session_id}.yaml`).
- When an event belongs to a session identifier, an ingest must **append exactly one JSON object** as one new line to that session’s Session JSONL log.
- Each line is always **one JSON object** produced with `JSON.stringify` and read with `JSON.parse`.
- An ingest must **not write `{session_id}.yaml`** for new ingests.
- An ingest must **not migrate, read, or rewrite** existing `{session_id}.yaml` session logs.
- An ingest must **not mix** YAML and JSONL in one session: new ingests write JSONL only.
- An ingest must **not merge** the Session JSONL log into F001 `events.jsonl`. The Event log is always **the verbatim, day-wide Event log** (no overlay of harness, event, turn, or generated timestamp).
- The Session JSONL log is always **a third artifact** (with the Event log and Session index) so F004/F008 still read one session without scanning `events.jsonl` or re-deriving harness keys.
- When an event has **no session identifier**, the Event log must **still receive the line**, the Session index must **stay unchanged**, and an ingest must **not create or append** a Session JSONL log.
- Field names are always **snake_case**. Compact header fields always **exist** (`harness`, `event`, `timestamp`, `turn`). `session_id` may **appear only on** the initial session-start object. `subagent` may **appear when** a matching payload attribute is present. Other body fields are always **table-driven** as F003 / F009 / F007 / F006.
- Present-null is always **JSON `null`**. Omit-absent / present-null ownership stays F009 / F003; this spec only serializes that rule as JSON.
- An ingest must **still persist as F001** (verbatim Event log, Session index, daily folder, observe-only exit 0 and no blocking stdout) and must **keep F002 positionals**.
- An ingest must **use the same lock/concurrency as F001/F003**. An ingest must **not add** a new CLI command. An ingest must **run as Node.js ≥ 24 ESM with no YAML library and no JSON library** (platform `JSON.stringify` / `JSON.parse` only).

### Out of scope

- Mixing YAML and JSONL in one session.
- Deleting old `{session_id}.yaml` files.
- Reporting from `events.jsonl`.
- Changing mapped field names.
- HTML reports.
- Reconstructing parent→subagent hierarchy.
- How `turn` is numbered (F008).
- How the Markdown report is built (F004), except that its source file is this JSONL.
- Duplicating F003 header/body mapping ACs, or F005–F009 field ACs.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This feature keeps F001’s two daily artifacts and replaces the per-session YAML log with:

- **Event log** — JSONL; each line is one Event, verbatim (F001).
- **Session index** — JSON array of distinct session identifiers for that day (F001).
- **Session JSONL log** — one `{session_id}.jsonl` per distinct F001 session identifier; append-only; one JSON object per line / per Event. Compact header; `session_id` only on the initial session-start object; `subagent` when a matching payload attribute is present; `turn` on each object (F008).

All three artifacts live in the same folder named for the current date. The Session report (`{session_id}.md`) is overwritten after every Session JSONL log append (F004).

### CLI

- On each ingest invocation that receives a JSON object, append the Event log line and update the Session index as F001; when the payload has a session identifier, also append one normalized JSON object to `{session_id}.jsonl` in that same daily folder.
- Build that object from the in-memory event plus the F002 harness and event positionals; do not re-read the Event log or Session index to produce it. Do not write `{session_id}.yaml`. Do not read or rewrite existing `.yaml` session logs.
- Keep Event log lines verbatim (no harness, event, turn, or generated-timestamp overlay).
- Remain a single Node.js ≥ 24 ESM ingest with platform `JSON.stringify` / `JSON.parse`, no YAML or JSON library, same lock as today, observe-only, no new command.

## Verification Criteria

- [ ] **AC-F010.1** — WHEN ingest receives a JSON object that has a session identifier, THE SYSTEM SHALL, in that same invocation, persist as F001 and SHALL append exactly one JSON object as one new line to `{session_id}.jsonl` inside the folder named for the current date, using the in-memory event (no second process; no re-read of files just written). `{session_id}` SHALL be the F001 session identifier (same stem as today’s `{session_id}.yaml`).
- [ ] **AC-F010.2** — THE SYSTEM SHALL write each Session JSONL line as one JSON object via `JSON.stringify` and SHALL read lines with `JSON.parse`; THE SYSTEM SHALL append only and SHALL NOT rewrite previously written lines; THE SYSTEM SHALL NOT use a YAML library or a JSON library.
- [ ] **AC-F010.3** — THE SYSTEM SHALL NOT write `{session_id}.yaml` for new ingests; THE SYSTEM SHALL NOT migrate, read, or rewrite existing `{session_id}.yaml` files; THE SYSTEM SHALL NOT mix YAML and JSONL in one session (new ingests write JSONL only).
- [ ] **AC-F010.4** — THE SYSTEM SHALL NOT merge the Session JSONL log into F001 `events.jsonl`; THE SYSTEM SHALL keep `events.jsonl` the verbatim, day-wide Event log with no overlay of harness, event, turn, or generated timestamp; THE SYSTEM SHALL keep the Session JSONL log as a third artifact so F004/F008 can read one session without scanning `events.jsonl` or re-deriving harness keys.
- [ ] **AC-F010.5** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create or append a Session JSONL log.
- [ ] **AC-F010.6** — THE SYSTEM SHALL keep field names snake_case; SHALL include compact header fields `harness`, `event`, `timestamp`, and `turn`; SHALL write `session_id` only on the initial session-start object; SHALL include `subagent` when a matching payload attribute is present; SHALL keep other body fields table-driven as F003 / F009 / F007 / F006; THE SYSTEM SHALL serialize present-null as JSON `null`. Mapping, omit-absent, and present-null rules remain those specs.
- [ ] **AC-F010.7** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete JSONL lines under the same lock/concurrency as F001/F003 (no torn, concatenated, or duplicated records).
- [ ] **AC-F010.8** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest with no external dependencies, no new CLI command, F002 positionals unchanged, observe-only exit 0, and no blocking stdout.

---

> last updated: 2026-09-02T15:04:02Z
