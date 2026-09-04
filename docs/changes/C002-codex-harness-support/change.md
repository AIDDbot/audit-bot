---
id: C002
slug: codex-harness-support
title: Codex harness support
branch: change/C002-codex-harness-support
specs:
  - key: F001-ingest-hook-events
    action: amend
  - key: F003-ingest-normalized-yaml
    action: amend
  - key: F004-session-end-report
    action: amend
  - key: F005-prompt-omit-transcript
    action: amend
  - key: F006-agent-stop-task
    action: amend
  - key: F008-conversation-turns
    action: amend
  - key: F009-subagent-name
    action: amend
  - key: F010-session-normalized-jsonl
    action: amend
created: 2026-09-04
released-version:
---
# C002 — Codex harness support

## Requirement

Add Codex as a supported audit-bot hook harness. Use the native Codex hook data whenever it preserves session, turn, subagent, or event information.

## Impact map

| Spec | Action | Rationale |
|------|--------|-----------|
| F001-ingest-hook-events | amend | Register and document Codex lifecycle hook ingestion. |
| F003-ingest-normalized-yaml | amend | Map Codex-native fields into normalized session records. |
| F004-session-end-report | amend | Render newly normalized Codex event details. |
| F005-prompt-omit-transcript | amend | Ingest Codex user-prompt hooks. |
| F006-agent-stop-task | amend | Ingest Codex stop hooks and final-message data. |
| F008-conversation-turns | amend | Prefer Codex-native turn identifiers. |
| F009-subagent-name | amend | Preserve native subagent correlation identifiers. |
| F010-session-normalized-jsonl | amend | Extend the normalized record contract compatibly. |

## Notes

- Codex events are `SessionStart`, `SessionEnd`, `SubagentStart`, `SubagentStop`, `UserPromptSubmit`, and `Stop`.
- Keep `events.jsonl` verbatim and all hooks observe-only.
- Codex has no native timestamp; retain the generated ingest timestamp.
- Preserve Codex `turn_id`, `agent_id`, `model`, `permission_mode`, `source`, `cwd`, transcript path, and available assistant-message/reason fields where the normalized contract can express them.

---

> last updated: 2026-09-04T00:00:00Z
