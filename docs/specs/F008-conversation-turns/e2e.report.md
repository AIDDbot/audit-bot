---
source: verify
target: /qualify
scope: F008-conversation-turns
run: 2026-09-02
status: green
---
# e2e report — F008-conversation-turns

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 19/19 · Criteria: 6/6 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (132 pass, 0 fail — 19 F008 + 29 F003 + 39 F004 + 13 F007 + 11 F006 + 7 F005 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (177 pass, 0 fail). Compact-header flip of prompt-kind (`event:` not `source_event:`) passed, including AC-F008.2 previously unchecked in spec.md. Remaining active ACs passed as regression.

## Criteria

- [x] **AC-F008.1** — pass — `e2e/ac-f008.1-turn-formula-session-prompt-stop.test.ts` — `AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1`
- [x] **AC-F008.2** — pass — `e2e/ac-f008.2-prompt-kind-aliases-only.test.ts` — `AC-F008.2 — only three prompt-kind aliases increment turn`; `AC-F008.2 — cursor beforeSubmitPrompt is unquoted turn 1`; `AC-F008.2 — positional stop with payload hook_event_name beforeSubmitPrompt stays turn 1`; `AC-F008.2 — cursor stop stays unquoted turn 1`; `AC-F008.2 — cursor subagentStop stays unquoted turn 1`; `AC-F008.2 — copilot agentStop stays unquoted turn 1`; `AC-F008.2 — claude-code Stop stays unquoted turn 1`; `AC-F008.2 — claude-code SubagentStop stays unquoted turn 1`; `AC-F008.2 — copilot userPromptSubmitted is unquoted turn 2`; `AC-F008.2 — claude-code UserPromptSubmit is unquoted turn 3`
- [x] **AC-F008.3** — pass — `e2e/ac-f008.3-first-prompt-one-preamble-zero.test.ts` — `AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0`
- [x] **AC-F008.4** — pass — `e2e/ac-f008.4-append-only-prior-turn-unchanged.test.ts` — `AC-F008.4 — append-only: prior documents' turn is not rewritten`
- [x] **AC-F008.5** — pass — `e2e/ac-f008.5-no-event-log-turn-no-sidecar.test.ts` — `AC-F008.5 — Event log has no turn overlay and no sidecar Turn file`
- [x] **AC-F008.6** — pass — `e2e/ac-f008.6-observe-only-existing-esm.test.ts` — `AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration`; `AC-F008.6 — cli/package.json is Node ≥ 24 ESM with empty dependencies`; `AC-F008.6 — sessionStart is observe-only`; `AC-F008.6 — beforeSubmitPrompt is observe-only`; `AC-F008.6 — stop is observe-only`

## Findings

None.

---

> last updated: 2026-09-02T08:45:37Z
