---
id: F001
slug: ingest-hook-events
title: Ingest hook events
kind: functional
category: ingest
tags: [hooks, ingest, cursor, codex]
status: released
created: 2026-09-01
released-version: 0.5.0
---
# F001 — Ingest hook events

## Problem definition

AI-agent hosts emit hook events as JSON, one object per invocation. Those payloads are not kept as a durable, per-session record. Developers need an ingest that receives each payload and persists it for later per-session reporting, without transforming or filtering the event content.

Event names follow Cursor; Copilot uses similar camelCase, while Claude Code and Codex use PascalCase for the same lifecycle points (see [`docs/harness-hooks.md`](../../harness-hooks.md) and [`docs/events-args.md`](../../events-args.md)):

| Kind | Cursor | GitHub Copilot | Claude Code | Codex |
| --- | --- | --- | --- | --- |
| Session start | `sessionStart` | `sessionStart` | `SessionStart` | `SessionStart` |
| Session end | `sessionEnd` | `sessionEnd` | `SessionEnd` | `SessionEnd` |
| Subagent start | `subagentStart` | `subagentStart` | `SubagentStart` | `SubagentStart` |
| Subagent stop | `subagentStop` | `subagentStop` | `SubagentStop` | `SubagentStop` |
| User prompt | `beforeSubmitPrompt` | `userPromptSubmitted` | `UserPromptSubmit` | `UserPromptSubmit` |
| Agent stop | `stop` | `agentStop` | `Stop` | `Stop` |

This spec requires Cursor to invoke ingest on its four lifecycle events and Codex to invoke ingest on all six Codex events above. Cursor `sessionStart` / `sessionEnd` are IDE-local (they do not fire for cloud agents). Codex has no native timestamp; the raw Event log keeps that absence unchanged.

### User Stories

- As a developer, I want to **persist each hook event exactly as received** so that later reporting can read the original payload.
- As a developer, I want a **session index of distinct session identifiers** so that later reporting can find every session without scanning the full event log.
- As a developer, I want **today’s log and index in a date-named folder** so that files do not grow unbounded over time.
- As a developer, I want **ingest to survive repeated and concurrent hook invocations** so that neither file is corrupted when hooks fire together.

### Business Rules

- An ingest must **receive one JSON object per invocation**.
- An Event log is always **a `.jsonl` file**: one incoming event per line, appended as-is (verbatim JSON).
- An ingest must **not parse, filter, or trim fields** of event content when writing the Event log — the stored line is the event exactly as received.
- A Session index is always **a `.json` file** containing an array of the distinct session identifiers seen so far in that day’s folder.
- A Session identifier is always **the session identity already present on the payload** (Cursor `session_id` / `conversation_id`; for subagent events, `parent_conversation_id` when those are absent; Codex `session_id` on every registered event). An ingest must **not invent** a session identifier.
- When an event belongs to a session **not yet in the array**, the Session index must **append that identifier**.
- A Session index must **not contain duplicate** session identifiers.
- When an event has **no session identifier**, the Event log must **still receive the line** and the Session index must **stay unchanged**.
- An Event log and a Session index must **both live inside a folder named for the current date** (`YYYY-MM-DD`).
- An ingest must **create the daily folder** when it does not exist yet.
- An ingest must **be safe to invoke repeatedly and concurrently**: neither file may be torn, concatenated, or left as invalid JSON; the Session index must remain a JSON array of unique identifiers.
- A project must **register ingest so Cursor can invoke it** on `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`.
- A project must **register ingest in `.codex/hooks.json` so Codex can invoke it** on `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, and `Stop`.
- A Codex registration must **invoke the bundled Node ESM ingest entry with `ingest codex {EventName}` as a shell command** and must **not configure an output that blocks, denies, rewrites, or continues Codex**.
- An ingest must **persist every received JSON event** regardless of event name (no filtering by hook type). Content is never transformed.
- An ingest must **run as Node.js ≥ 24 ESM (`.mjs`) with no external dependencies**.

### Out of scope

- Per-session reports, dashboards, or query commands (later).
- Transforming, filtering, redacting, or overlaying fields on the stored event.
- Blocking, denying, or rewriting the agent (including `subagentStart` permission and `subagentStop` follow-up).
- Registering GitHub Copilot or Claude Code hooks (names in the table are reference only).
- Cursor events other than the four required registrations (tool-use, prompt, stop, Tab, `workspaceOpen`, and the rest of [`docs/harness-hooks.md`](../../harness-hooks.md)).
- Codex events other than the six required registrations, including tool-use events.
- Deleting or rotating older daily folders.

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This feature persists two artifacts per day:

- **Event log** — JSONL; each line is one Event, verbatim.
- **Session index** — JSON array of distinct session identifiers for that day, so a later reporting step can list sessions without scanning the Event log.

Both artifacts live in one folder named for the current date.

### CLI

- Deliver a single ingest script (plus any small helper it needs) that Cursor hook configuration can invoke on `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`, and that Codex hook configuration can invoke on `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, and `Stop`.
- On each invocation, append the received JSON object as one new JSONL line and update the Session index when the payload introduces a new session identifier.
- Keep the Event log and Session index in a date-named folder; create that folder when missing.
- Run on Node.js ≥ 24 as ESM (`.mjs`) with no external dependencies.
- Remain correct under repeated and concurrent hook invocations.

## Verification Criteria

- [x] **AC-F001.1** — WHEN ingest receives a JSON object, THE SYSTEM SHALL append exactly that object as one new line in a `.jsonl` file inside the folder named for the current date.
- [x] **AC-F001.2** — THE SYSTEM SHALL write each Event log line as the event exactly as received and SHALL NOT parse, filter, or trim its fields.
- [x] **AC-F001.3** — WHEN the received event belongs to a session identifier that is not already in that day’s Session index, THE SYSTEM SHALL append that identifier to the `.json` array. WHEN the identifier is already present, THE SYSTEM SHALL NOT add a duplicate.
- [x] **AC-F001.4** — THE SYSTEM SHALL place both the Event log and the Session index in a folder named `YYYY-MM-DD` for the current date, and SHALL create that folder when it does not exist.
- [x] **AC-F001.5** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete JSONL lines and a valid JSON array of unique session identifiers (no torn, concatenated, or duplicated records).
- [ ] **AC-F001.6** — THE SYSTEM SHALL provide a Node.js ≥ 24 ESM ingest script with no external dependencies that Cursor can invoke on `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`, and that Codex can invoke from `.codex/hooks.json` on `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, and `Stop`.
- [x] **AC-F001.7** — WHEN the payload has no session identifier, THE SYSTEM SHALL still append the Event log line and SHALL NOT change the Session index.
- [ ] **AC-F001.8** — WHEN Codex invokes any registered hook with a JSON object containing its native fields, THE SYSTEM SHALL append exactly that object to the Event log and SHALL NOT add, remove, transform, or derive event fields, including `session_id`, `turn_id`, `agent_id`, `model`, `permission_mode`, `source`, `cwd`, transcript paths, assistant messages, or reasons.
- [ ] **AC-F001.9** — WHEN any registered Codex hook completes, THE SYSTEM SHALL exit successfully without stdout output or a Codex decision, continuation, block, denial, rewrite, or follow-up response.

---

> last updated: 2026-09-04T00:00:00Z
