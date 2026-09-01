---
source: verify
target: /qualify
scope: F005-prompt-omit-transcript
run: 2026-09-01
status: green
---
# e2e report — F005-prompt-omit-transcript

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 7/7 · Criteria: 5/5 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (96 pass, 0 fail — 7 F005 + 13 F007 + 11 F006 + 30 F004 + 21 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (146 pass, 0 fail). Deprecated AC-F005.3 ignored (file `e2e/ac-f005.3-prompt-yaml-header-and-body.test.ts` gone; replacement is `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts` with five-field header including unquoted integer `turn`).

## Criteria

- [x] **AC-F005.1** — pass — `e2e/ac-f005.1-register-before-submit-prompt.test.ts` — `AC-F005.1 — Cursor hooks.json registers beforeSubmitPrompt with the same node ingest shell command`
- [x] **AC-F005.2** — pass — `e2e/ac-f005.2-prompt-ingest-persists.test.ts` — `AC-F005.2 — ingest cursor beforeSubmitPrompt persists Event log, Session index, and YAML`
- [x] **AC-F005.6** — pass — `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts` — `AC-F005.6 — present prompt YAML is F003 header then prompt`; `AC-F005.6 — absent prompt YAML is header-only after the five fields`
- [x] **AC-F005.4** — pass — `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts` — `AC-F005.4 — YAML omits transcript_path for subagent start, stop, and agent stop; JSONL keeps it`
- [x] **AC-F005.5** — pass — `e2e/ac-f005.5-observe-only-prompt-and-omit.test.ts` — `AC-F005.5 — beforeSubmitPrompt ingest stays observe-only`; `AC-F005.5 — transcript-omit YAML stays observe-only`

## Findings

None.

---

> last updated: 2026-09-01T21:29:23Z
