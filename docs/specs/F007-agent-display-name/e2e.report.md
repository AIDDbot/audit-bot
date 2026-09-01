---
source: verify
target: /qualify
scope: F007-agent-display-name
run: 2026-09-01
status: green
---
# e2e report — F007-agent-display-name

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 13/13 · Criteria: 7/7 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (91 pass, 0 fail — 13 F007 + 11 F006 + 25 F004 + 7 F005 + 21 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (141 pass, 0 fail).

## Criteria

- [x] **AC-F007.1** — pass — `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts` — `AC-F007.1 — normalized-fields.md includes agent_display_name for subagent start and stop (Copilot only)`
- [x] **AC-F007.2** — pass — `e2e/ac-f007.2-copilot-subagent-start-display-name.test.ts` — `AC-F007.2 — Copilot subagentStart YAML includes agent_display_name after agent_type`
- [x] **AC-F007.3** — pass — `e2e/ac-f007.3-copilot-subagent-stop-display-name.test.ts` — `AC-F007.3 — Copilot subagentStop YAML includes agent_display_name after agent_type and before response_text`
- [x] **AC-F007.4** — pass — `e2e/ac-f007.4-omit-absent-agent-display-name.test.ts` — `AC-F007.4 — Copilot subagentStart YAML omits agent_display_name when agentDisplayName is absent`; `AC-F007.4 — Copilot subagentStop YAML omits agent_display_name when agentDisplayName is absent`
- [x] **AC-F007.5** — pass — `e2e/ac-f007.5-cursor-claude-omit-agent-display-name.test.ts` — `AC-F007.5 — Cursor subagentStart YAML omits planted agentDisplayName`; `AC-F007.5 — Cursor subagentStop YAML omits planted agentDisplayName`; `AC-F007.5 — Claude Code SubagentStart YAML omits planted agentDisplayName`; `AC-F007.5 — Claude Code SubagentStop YAML omits planted agentDisplayName`
- [x] **AC-F007.6** — pass — `e2e/ac-f007.6-agent-type-not-from-display-name.test.ts` — `AC-F007.6 — Copilot subagentStart agent_type is from agentName not agentDisplayName`; `AC-F007.6 — Copilot subagentStop agent_type is from agentType not agentDisplayName`
- [x] **AC-F007.7** — pass — `e2e/ac-f007.7-observe-only-and-verbatim.test.ts` — `AC-F007.7 — Copilot subagentStart with agentDisplayName stays observe-only and JSONL verbatim`; `AC-F007.7 — Copilot subagentStop with agentDisplayName stays observe-only and JSONL verbatim`

## Findings

None.

---

> last updated: 2026-09-01T18:58:00Z
