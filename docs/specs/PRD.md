# PRD — audit-bot

Ingest agent-hook events (session start/end, prompts, duration) from Cursor, Claude, and Copilot, and report them.

## ingest
Persist hook events as a raw daily JSONL log, a session index, and a per-session normalized YAML log.
### [F001 Ingest hook events](./F001-ingest-hook-events/spec.md)
  - **Tags**: `hooks, ingest, cursor`
### [F002 Ingest source args](./F002-ingest-source-args/spec.md)
  - **Tags**: `hooks, ingest, cursor`
### [F003 Ingest normalized YAML](./F003-ingest-normalized-yaml/spec.md)
  - **Tags**: `hooks, ingest, cursor`
### [F005 Prompt ingest and omit transcript path](./F005-prompt-omit-transcript/spec.md)
  - **Tags**: `hooks, ingest, cursor`
### [F006 Agent-stop ingest and subagent task](./F006-agent-stop-task/spec.md)
  - **Tags**: `hooks, ingest, cursor`

## report
Generate a human-readable Markdown session report when session-end is ingested.
### [F004 Session-end Markdown report](./F004-session-end-report/spec.md)
  - **Tags**: `hooks, ingest, cursor`

---

> last updated: 2026-09-01T11:55:00Z
