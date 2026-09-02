---
source: verify
target: /qualify
scope: F006-agent-stop-task
run: 2026-09-02
status: green
---
# e2e report — F006-agent-stop-task

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 11/11 · Criteria: 7/7 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (158 pass, 0 fail — 11 F006 + 40 F004 + 34 F003 + 20 F009 + 19 F008 + 13 F007 + 7 F005 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (189 pass, 0 fail). AC-F006.5 passed from this run (Cursor subagent-start YAML includes `task` after `subagent` when present, omits it when absent). Remaining active ACs passed as regression. Deprecated AC-F006.3 ignored (file `e2e/ac-f006.3-stop-yaml-header-only.test.ts` gone; replacement is `e2e/ac-f006.8-stop-yaml-header-only.test.ts` with compact four-field header including unquoted integer `turn`).

## Criteria

- [x] **AC-F006.1** — pass — `e2e/ac-f006.1-register-stop.test.ts` — `AC-F006.1 — Cursor hooks.json registers stop with the same node ingest shell command`
- [x] **AC-F006.2** — pass — `e2e/ac-f006.2-stop-ingest-persists.test.ts` — `AC-F006.2 — ingest cursor stop persists Event log, Session index, and YAML`
- [x] **AC-F006.8** — pass — `e2e/ac-f006.8-stop-yaml-header-only.test.ts` — `AC-F006.8 — stop YAML starts with four-field F003 header then empty body; transcript_path omitted`
- [x] **AC-F006.4** — pass — `e2e/ac-f006.4-normalized-fields-task.test.ts` — `AC-F006.4 — normalized-fields.md includes task for subagent start (Cursor only)`
- [x] **AC-F006.5** — pass — `e2e/ac-f006.5-cursor-subagent-start-task.test.ts` — `AC-F006.5 — Cursor subagentStart YAML includes task after subagent when present`; `AC-F006.5 — Cursor subagentStart YAML omits task when absent`
- [x] **AC-F006.6** — pass — `e2e/ac-f006.6-copilot-claude-omit-task.test.ts` — `AC-F006.6 — Copilot subagentStart YAML omits task and does not map decoys`; `AC-F006.6 — Claude Code SubagentStart YAML omits task and does not map decoys`
- [x] **AC-F006.7** — pass — `e2e/ac-f006.7-observe-only-stop-and-task.test.ts` — `AC-F006.7 — stop ingest stays observe-only`; `AC-F006.7 — Cursor subagentStart with task stays observe-only`; `AC-F006.7 — Cursor subagentStart without task stays observe-only`

## Findings

None.

---

> last updated: 2026-09-02T11:00:59Z
