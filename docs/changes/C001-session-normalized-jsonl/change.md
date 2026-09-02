---
id: C001
slug: session-normalized-jsonl
title: Session normalized JSONL
branch: change/C001-session-normalized-jsonl
specs:
  - key: F010-session-normalized-jsonl
    action: create
  - key: F003-ingest-normalized-yaml
    action: amend
  - key: F008-conversation-turns
    action: amend
  - key: F004-session-end-report
    action: amend
  - key: F005-prompt-omit-transcript
    action: amend
  - key: F006-agent-stop-task
    action: amend
  - key: F007-agent-display-name
    action: amend
  - key: F009-subagent-name
    action: amend
created: 2026-09-02
released-version:
---
# C001 — Session normalized JSONL

## Requirement

Replace the per-session normalized log `{session_id}.yaml` with `{session_id}.jsonl`: one JSON object per line via `JSON.stringify` / `JSON.parse`. Stop writing `{session_id}.yaml`. Do not migrate, read, or rewrite existing `.yaml`. Do not merge the session log into F001 `events.jsonl`. Normalized fields and omit-absent / present-null stay as F003 / F009 / F007 / F006 (compact header; `session_id` only on the initial session-start; `subagent` when a matching payload attribute is present; other body fields table-driven; snake_case). Markdown `{session_id}.md` stays. F001 Event log and F002 positionals stay unchanged.

## Impact map

| Spec | Action | Rationale |
|------|--------|-----------|
| F010-session-normalized-jsonl | create | New format owner: filename `{session_id}.jsonl`, one JSON object per line, serialization, stop writing `.yaml`, no migration. Category `ingest`, tags `hooks, ingest, cursor`. Same normalized fields as F003/F009/F007/F006; do not duplicate those ACs. |
| F003-ingest-normalized-yaml | amend | Current session-log format owner. Deprecate YAML-specific ACs (keep ids, strikethrough). Add/update ACs for JSONL. Uncheck only ACs whose text changes. Do not duplicate F010’s new format ACs. |
| F008-conversation-turns | amend | Turn numbering stays F008 and may only use that session’s session log (now JSONL, not a yaml-specific scan). `turn` is a JSON number. Uncheck only ACs whose text changes. |
| F004-session-end-report | amend | Report source = that session’s JSONL (file order, no re-sort). Markdown `{session_id}.md` unchanged. Do not read `events.jsonl` or `sessions.json`. Duration, counts, turn grouping, Subagent cell, 100-char previews unchanged. Uncheck only ACs whose text changes. |
| F005-prompt-omit-transcript | amend | YAML wording in prompt / omit-transcript ACs → Session JSONL log / JSONL record. Do not re-specify F003/F010 format. |
| F006-agent-stop-task | amend | YAML wording in stop / `task` ACs. Mapping stays. |
| F007-agent-display-name | amend | YAML wording in display-name ACs. Mapping stays. |
| F009-subagent-name | amend | YAML wording / YAML `null` → JSON `null`. Present-null stays. Mapping stays. |

## Notes

- Specify only (docs). Do not edit `cli/`, `e2e/`, or `.agents/hooks`.
- PRD: append a line under ingest for F010; update the F003/F004 one-liners that say YAML.
- Model schema and architecture prose that say Session YAML log / `{session_id}.yaml` must be updated when those specs are specified.
- F001 and F002: no change (not in `specs:`).
- Out of scope: mixing YAML+JSONL in one session; deleting old yaml files; reporting from `events.jsonl`; changing mapped field names; HTML reports; hierarchy; new CLI command; YAML/JSON library; Node ESM ingest and lock/concurrency stay as today.
- Triage: “amend never fork” would have put the format change on F003 only. The requirement explicitly creates F010 as format owner and amends F003’s YAML ACs (deprecate, do not duplicate).

---

> last updated: 2026-09-02T14:35:00Z
