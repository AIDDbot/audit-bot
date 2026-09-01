---
source: verify
target: /codify
scope: F003-ingest-normalized-yaml
run: 2026-09-01
status: red
---
# e2e report — F003-ingest-normalized-yaml

## Summary

- Findings: 1 · 1 blocker · 0 major · 0 minor.
- Scenarios: 10/10 · Criteria: 10/10 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (73 pass, 18 fail, 91 total — 21 F003 pass; 9 F001 + 5 F002 + 25 F004 pass; 4/7 F005 + 4/11 F006 + 5/13 F007 pass). CLI units (extra signal): `cd cli && bun run test` (142 pass, 0 fail). Active F003 criteria all passed; the suite is red because sibling F005/F006/F007 tests still slice a four-field YAML header.

## Criteria

- [x] **AC-F003.1** — pass — `e2e/ac-f003.1-same-invocation-three-artifacts.test.ts` — `AC-F003.1 — same invocation writes Event log, Session index, and one YAML document`
- [x] **AC-F003.2** — pass — `e2e/ac-f003.2-append-only-multidoc-yaml.test.ts` — `AC-F003.2 — YAML file is append-only multi-document with --- per document`
- [x] **AC-F003.11** — pass — `e2e/ac-f003.11-yaml-document-header.test.ts` — `AC-F003.11 — header keys from both positionals match argv`; `AC-F003.11 — omitted positionals are empty strings and are not inferred`
- [x] **AC-F003.4** — pass — `e2e/ac-f003.4-timestamp-hhmmss.test.ts` — `AC-F003.4 — payload Unix-ms timestamp formats as local HH:MM:SS`; `AC-F003.4 — payload ISO date-time string formats as local HH:MM:SS`; `AC-F003.4 — generated timestamp is local HH:MM:SS and is not on the Event log`
- [x] **AC-F003.5** — pass — `e2e/ac-f003.5-normalized-body-fields.test.ts` — `AC-F003.5 — Cursor sessionEnd body is reason only`; `AC-F003.5 — Cursor subagentStart body keys are agent_type then task`; `AC-F003.5 — absent sessionEnd reason is omitted from the body`; `AC-F003.5 — present null transcript_path is omitted from YAML`; `AC-F003.5 — Cursor beforeSubmitPrompt body is prompt only`; `AC-F003.5 — Copilot subagentStop maps argv fields and ignores sessionId`; `AC-F003.5 — Cursor sessionStart is header-only with extras omitted`
- [x] **AC-F003.6** — pass — `e2e/ac-f003.6-subagent-sibling-document.test.ts` — `AC-F003.6 — subagent event is a sibling document, not nested`
- [x] **AC-F003.7** — pass — `e2e/ac-f003.7-no-session-id-no-yaml.test.ts` — `AC-F003.7 — Copilot sessionId alone writes no YAML on first use`; `AC-F003.7 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no YAML`
- [x] **AC-F003.12** — pass — `e2e/ac-f003.12-unrecognized-header-only.test.ts` — `AC-F003.12 — unrecognized harness and event yield a header-only YAML document`; `AC-F003.12 — known harness with unrecognized event is still header-only`
- [x] **AC-F003.9** — pass — `e2e/ac-f003.9-concurrent-yaml-complete.test.ts` — `AC-F003.9 — concurrent and repeated ingest persist complete YAML documents`
- [x] **AC-F003.10** — pass — `e2e/ac-f003.10-existing-esm-ingest.test.ts` — `AC-F003.10 — existing Node ESM ingest has no extra runtime dependencies`

Deprecated (not under test): **AC-F003.3**, **AC-F003.8**.

## Findings

### F1: Sibling e2e still slices a four-field YAML header

- Source: **AC-F003.11** — every YAML document starts with `session_id`, `source_harness`, `source_event`, `timestamp`, and `turn` in that order (`turn` is a YAML integer). Product matches; F003 e2e already slices five keys. F005/F006/F007 e2e still treat the fifth key as body.
- Where: `e2e`
- Problem: expected body keys after a five-field header (`keys.slice(5)`, fifth key `turn`) · actual 18 tests fail because they still use `keys.slice(0, 4)` / `keys.slice(4)` and assert `turn` is `prompt` or appears in the body. Failures: `AC-F005.3` (2), `AC-F005.4` (1), `AC-F006.3` (1), `AC-F006.5` (2), `AC-F006.6` (2), `AC-F006.7` (2 of 3), `AC-F007.2` (1), `AC-F007.3` (1), `AC-F007.4` (2), `AC-F007.5` (4). Files: `e2e/ac-f005.3-prompt-yaml-header-and-body.test.ts`, `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts`, `e2e/ac-f006.3-stop-yaml-header-only.test.ts`, `e2e/ac-f006.5-cursor-subagent-start-task.test.ts`, `e2e/ac-f006.6-copilot-claude-omit-task.test.ts`, `e2e/ac-f006.7-observe-only-stop-and-task.test.ts`, `e2e/ac-f007.2-copilot-subagent-start-display-name.test.ts`, `e2e/ac-f007.3-copilot-subagent-stop-display-name.test.ts`, `e2e/ac-f007.4-omit-absent-agent-display-name.test.ts`, `e2e/ac-f007.5-cursor-claude-omit-agent-display-name.test.ts`.
- Fix: In those files, add `turn` to the header key list; change header slice to `keys.slice(0, 5)` and body slice to `keys.slice(5)`. Do not change F003 product code. Do not assert F008 numbering.
- Severity: blocker
- Kind: test
- Handoff: `/codify` e2e

---

> last updated: 2026-09-01T20:19:52Z
