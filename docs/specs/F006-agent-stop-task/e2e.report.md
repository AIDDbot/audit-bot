---
source: verify
target: /qualify
scope: F006-agent-stop-task
run: 2026-09-01
status: green
---
# e2e report — F006-agent-stop-task

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 11/11 · Criteria: 7/7 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (96 pass, 0 fail — 11 F006 + 13 F007 + 7 F005 + 30 F004 + 21 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (146 pass, 0 fail). Deprecated AC-F006.3 ignored (file `e2e/ac-f006.3-stop-yaml-header-only.test.ts` gone; replacement is `e2e/ac-f006.8-stop-yaml-header-only.test.ts` with five-field header including unquoted integer `turn`).

## Criteria

- [x] **AC-F006.1** — pass — `e2e/ac-f006.1-register-stop.test.ts` — `AC-F006.1 — Cursor hooks.json registers stop with the same node ingest shell command`
- [x] **AC-F006.2** — pass — `e2e/ac-f006.2-stop-ingest-persists.test.ts` — `AC-F006.2 — ingest cursor stop persists Event log, Session index, and YAML`
- [x] **AC-F006.8** — pass — `e2e/ac-f006.8-stop-yaml-header-only.test.ts` — `AC-F006.8 — stop YAML starts with five-field F003 header then empty body; transcript_path omitted`
- [x] **AC-F006.4** — pass — `e2e/ac-f006.4-normalized-fields-task.test.ts` — `AC-F006.4 — normalized-fields.md includes task for subagent start (Cursor only)`
- [x] **AC-F006.5** — pass — `e2e/ac-f006.5-cursor-subagent-start-task.test.ts` — `AC-F006.5 — Cursor subagentStart YAML includes task after agent_type when present`; `AC-F006.5 — Cursor subagentStart YAML omits task when absent`
- [x] **AC-F006.6** — pass — `e2e/ac-f006.6-copilot-claude-omit-task.test.ts` — `AC-F006.6 — Copilot subagentStart YAML omits task and does not map decoys`; `AC-F006.6 — Claude Code SubagentStart YAML omits task and does not map decoys`
- [x] **AC-F006.7** — pass — `e2e/ac-f006.7-observe-only-stop-and-task.test.ts` — `AC-F006.7 — stop ingest stays observe-only`; `AC-F006.7 — Cursor subagentStart with task stays observe-only`; `AC-F006.7 — Cursor subagentStart without task stays observe-only`

## Findings

None.

---

> last updated: 2026-09-01T21:47:30Z
