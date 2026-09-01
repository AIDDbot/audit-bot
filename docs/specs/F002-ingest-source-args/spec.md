---
id: F002
slug: ingest-source-args
title: Ingest source args
kind: functional
category: ingest
tags: [hooks, ingest, cursor]
status: in-progress
created: 2026-09-01
released-version: 0.6.0
---
# F002 — Ingest source args

## Problem definition

F001 persists each hook payload verbatim, but the ingest invocation does not identify which harness fired or which hook event it is. Every Cursor registration currently calls the same command with no source arguments, so later logic cannot route on harness and/or event without inferring from the payload. Developers need those two values supplied on the ingest command, already filled in by hook configuration, without changing how events are stored.

This spec does not replace F001. Persistence, observe-only behavior, and the four Cursor registrations stay as F001.

### User Stories

- As a developer, I want **source harness and source event on the ingest command** so that later routing can key off harness and/or event without parsing the payload.
- As a developer, I want **Cursor hook configuration to send those values already filled in** so that each registered event identifies itself at invocation time.
- As a developer, I want **ingest without those arguments to keep persisting as F001** so that existing invocations are not broken.
- As a developer, I want **the Event log to stay verbatim** so that source arguments never overlay, filter, or rewrite stored payloads.

### Business Rules

- An ingest command may **receive two optional positionals** after `ingest`: source harness then source event (`ingest {harness} {event}`).
- A source harness positional supplied by a registered Cursor hook is always **`cursor`**.
- A source event positional supplied by a registered Cursor hook is always **that hook’s Cursor event name** (`sessionStart`, `sessionEnd`, `subagentStart`, or `subagentStop`).
- An ingest must **still persist as F001** (verbatim Event log, Session index rules, exit 0, no blocking stdout) when both positionals are present, when only one is present, and when both are omitted.
- An ingest must **not write source harness or source event onto the Event log line** — the stored line remains the event exactly as received (F001).
- An ingest must **not use the positionals to skip, filter, or transform** the event.
- A project must **provide a distinct Cursor hook wrapper per F001-registered event**. Each wrapper’s invocation of ingest already includes both positionals for that event.
- A Cursor hook `command` is always **that wrapper’s path only** (no extra tokens on the `command` string).
- A project must **keep registering** `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` in `.cursor/hooks.json`.

### Out of scope

- Routing, branching, or other behavior that depends on source harness or source event (later).
- Overlaying harness, event name, or `receivedAt` onto the stored Event (F001 verbatim stands).
- Making the two positionals required, or failing ingest when they are missing or unrecognized.
- Registering GitHub Copilot or Claude Code hooks.
- Cursor events other than the four F001 registrations.
- Changing Event log path, Session index, or observe-only exit/stdout rules.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This spec does not add persisted entities. Source harness and source event are invocation inputs only. Daily Event log and Session index remain F001 artifacts.

### CLI

- Accept `ingest` with two optional positionals: source harness then source event.
- Persist each stdin JSON object as F001 whether those positionals are present or omitted; do not overlay them on the Event log line.
- Provide one Cursor hook wrapper per registered event that invokes ingest with `cursor` and that event name already filled in.
- Point each `.cursor/hooks.json` entry’s `command` at the matching wrapper path only (no extra tokens).

## Verification Criteria

- [x] **AC-F002.1** — WHEN the CLI is invoked as `ingest` with source harness and source event positionals and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules, exit 0) and SHALL NOT add harness or event fields to the stored line.
- [x] **AC-F002.2** — WHEN the CLI is invoked as `ingest` with neither positional, or with only one of the two, THE SYSTEM SHALL persist as F001 (verbatim Event log, exit 0) and SHALL NOT treat the invocation as an unknown command.
- [x] **AC-F002.3** — THE SYSTEM SHALL provide a distinct Cursor hook wrapper for each of `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` that invokes ingest with source harness `cursor` and source event equal to that hook’s event name.
- [x] **AC-F002.4** — THE SYSTEM SHALL register those wrappers in `.cursor/hooks.json` so each of the four events has its own `command` that is the corresponding wrapper path only (no extra tokens).

---

> last updated: 2026-09-01T09:08:04Z
