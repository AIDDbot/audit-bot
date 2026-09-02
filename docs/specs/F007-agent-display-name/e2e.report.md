---
source: verify
target: /qualify
scope: F007-agent-display-name
run: 2026-09-02
status: green
---
# e2e report — F007-agent-display-name

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 13/13 · Criteria: 7/7 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (158 pass, 0 fail — 13 F007 + 20 F009 + 19 F008 + 11 F006 + 7 F005 + 40 F004 + 34 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (189 pass, 0 fail). AC-F007.2, AC-F007.3, and AC-F007.6 passed from this run (`agent_display_name` after `subagent`, not `agent_type`; Copilot start identity from `agentName`; Copilot stop identity from `agentType`). Remaining active ACs passed as regression.

## Criteria

- [x] **AC-F007.1** — pass — `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts` — `AC-F007.1 — normalized-fields.md includes agent_display_name for subagent start and stop (Copilot only)`
- [x] **AC-F007.2** — pass — `e2e/ac-f007.2-copilot-subagent-start-display-name.test.ts` — `AC-F007.2 — Copilot subagentStart YAML includes agent_display_name after subagent`
- [x] **AC-F007.3** — pass — `e2e/ac-f007.3-copilot-subagent-stop-display-name.test.ts` — `AC-F007.3 — Copilot subagentStop YAML includes agent_display_name after subagent and before response_text`
- [x] **AC-F007.4** — pass — `e2e/ac-f007.4-omit-absent-agent-display-name.test.ts` — `AC-F007.4 — Copilot subagentStart YAML omits agent_display_name when agentDisplayName is absent`; `AC-F007.4 — Copilot subagentStop YAML omits agent_display_name when agentDisplayName is absent`
- [x] **AC-F007.5** — pass — `e2e/ac-f007.5-cursor-claude-omit-agent-display-name.test.ts` — `AC-F007.5 — Cursor subagentStart YAML omits planted agentDisplayName`; `AC-F007.5 — Cursor subagentStop YAML omits planted agentDisplayName`; `AC-F007.5 — Claude Code SubagentStart YAML omits planted agentDisplayName`; `AC-F007.5 — Claude Code SubagentStop YAML omits planted agentDisplayName`
- [x] **AC-F007.6** — pass — `e2e/ac-f007.6-subagent-not-from-display-name.test.ts` — `AC-F007.6 — Copilot subagentStart subagent is from agentName not agentDisplayName`; `AC-F007.6 — Copilot subagentStop subagent is from agentType not agentDisplayName`
- [x] **AC-F007.7** — pass — `e2e/ac-f007.7-observe-only-and-verbatim.test.ts` — `AC-F007.7 — Copilot subagentStart with agentDisplayName stays observe-only and JSONL verbatim`; `AC-F007.7 — Copilot subagentStop with agentDisplayName stays observe-only and JSONL verbatim`

## Findings

None.

---

> last updated: 2026-09-02T11:26:00Z
