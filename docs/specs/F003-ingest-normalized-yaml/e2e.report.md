---
source: verify
target: /qualify
scope: F003-ingest-normalized-yaml
run: 2026-09-01
status: green
---
# e2e report — F003-ingest-normalized-yaml

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 10/10 · Criteria: 10/10 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (35 pass, 0 fail — 21 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (75 pass, 0 fail).

## Criteria

- [x] **AC-F003.1** — pass — `e2e/ac-f003.1-same-invocation-three-artifacts.test.ts` — `AC-F003.1 — same invocation writes Event log, Session index, and one YAML document`
- [x] **AC-F003.2** — pass — `e2e/ac-f003.2-append-only-multidoc-yaml.test.ts` — `AC-F003.2 — YAML file is append-only multi-document with --- per document`
- [x] **AC-F003.3** — pass — `e2e/ac-f003.3-yaml-document-header.test.ts` — `AC-F003.3 — header keys from both positionals match argv`; `AC-F003.3 — omitted positionals are empty strings and are not inferred`
- [x] **AC-F003.4** — pass — `e2e/ac-f003.4-timestamp-hhmmss.test.ts` — `AC-F003.4 — payload Unix-ms timestamp formats as local HH:MM:SS`; `AC-F003.4 — payload ISO date-time string formats as local HH:MM:SS`; `AC-F003.4 — generated timestamp is local HH:MM:SS and is not on the Event log`
- [x] **AC-F003.5** — pass — `e2e/ac-f003.5-normalized-body-fields.test.ts` — `AC-F003.5 — Cursor sessionEnd body is reason only`; `AC-F003.5 — Cursor subagentStart body keys are agent_type then transcript_path`; `AC-F003.5 — absent sessionEnd reason is omitted from the body`; `AC-F003.5 — present null transcript_path is YAML null`; `AC-F003.5 — Cursor beforeSubmitPrompt body is prompt only`; `AC-F003.5 — Copilot subagentStop maps argv fields and ignores sessionId`; `AC-F003.5 — Cursor sessionStart is header-only with extras omitted`
- [x] **AC-F003.6** — pass — `e2e/ac-f003.6-subagent-sibling-document.test.ts` — `AC-F003.6 — subagent event is a sibling document, not nested`
- [x] **AC-F003.7** — pass — `e2e/ac-f003.7-no-session-id-no-yaml.test.ts` — `AC-F003.7 — Copilot sessionId alone writes no YAML on first use`; `AC-F003.7 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no YAML`
- [x] **AC-F003.8** — pass — `e2e/ac-f003.8-unrecognized-header-only.test.ts` — `AC-F003.8 — unrecognized harness and event yield a header-only YAML document`; `AC-F003.8 — known harness with unrecognized event is still header-only`
- [x] **AC-F003.9** — pass — `e2e/ac-f003.9-concurrent-yaml-complete.test.ts` — `AC-F003.9 — concurrent and repeated ingest persist complete YAML documents`
- [x] **AC-F003.10** — pass — `e2e/ac-f003.10-existing-esm-ingest.test.ts` — `AC-F003.10 — existing Node ESM ingest has no extra runtime dependencies`

## Findings

None.

---

> last updated: 2026-09-01T09:54:31Z
