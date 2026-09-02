---
source: verify
target: /qualify
scope: F009-subagent-name
run: 2026-09-02
status: green
---
# e2e report — F009-subagent-name

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 20/20 · Criteria: 5/5 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (152 pass, 0 fail — 20 F009 + 19 F008 + 13 F007 + 11 F006 + 7 F005 + 39 F004 + 29 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (187 pass, 0 fail).

## Criteria

- [x] **AC-F009.1** — pass — `e2e/ac-f009.1-normalized-fields-subagent.test.ts` — `AC-F009.1 — normalized-fields.md identity row is subagent not agent_type`; `AC-F009.1 — Cursor subagentStart YAML writes subagent not agent_type`
- [x] **AC-F009.2** — pass — `e2e/ac-f009.2-subagent-on-every-event.test.ts` — `AC-F009.2 — sessionStart YAML includes subagent after the five-field header`; `AC-F009.2 — sessionEnd YAML includes subagent then reason`; `AC-F009.2 — beforeSubmitPrompt YAML includes subagent then prompt`; `AC-F009.2 — stop YAML body is subagent only`; `AC-F009.2 — subagentStart YAML includes subagent then task`; `AC-F009.2 — subagentStop YAML includes subagent then response_text`; `AC-F009.2 — unmapped empty extraArgv still includes subagent and omits traps`; `AC-F009.2 — unmapped unknown event still includes subagent and omits traps`; `AC-F009.2 — sessionStart omits subagent when no preferred key is present`; `AC-F009.2 — present null subagent_type is YAML null`
- [x] **AC-F009.3** — pass — `e2e/ac-f009.3-preference-order-not-harness.test.ts` — `AC-F009.3 — agentType wins over agentName when both are present`; `AC-F009.3 — subagent_type wins over agent_type when both are present`; `AC-F009.3 — copilot positional still persists subagent from Cursor subagent_type`; `AC-F009.3 — empty harness still persists subagent from agentName`
- [x] **AC-F009.4** — pass — `e2e/ac-f009.4-not-from-display-name-or-traps.test.ts` — `AC-F009.4 — display name and traps do not map to subagent`; `AC-F009.4 — Copilot subagentStart subagent is from agentName not agentDisplayName`
- [x] **AC-F009.5** — pass — `e2e/ac-f009.5-observe-only-and-verbatim.test.ts` — `AC-F009.5 — Cursor subagentStart stays observe-only and JSONL verbatim`; `AC-F009.5 — Copilot subagentStart stays observe-only and JSONL verbatim`

## Findings

None.

---

> last updated: 2026-09-02T10:02:00Z
