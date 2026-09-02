---
source: verify
target: /qualify
scope: F003-ingest-normalized-yaml
run: 2026-09-02
status: green
---
# e2e report — F003-ingest-normalized-yaml

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 29/29 · Criteria: 12/12 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (132 pass, 0 fail — 29 F003 + 39 F004 + 19 F008 + 13 F007 + 11 F006 + 7 F005 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (177 pass, 0 fail). Compact-header amend ACs (AC-F003.13, AC-F003.14, AC-F003.15, AC-F003.16) and redone body/sibling/concurrent slices passed. Deprecated AC-F003.3, AC-F003.8, AC-F003.11, and AC-F003.12 ignored (matching files gone; replacements are AC-F003.13 / .14 / .15 / .16).

## Criteria

- [x] **AC-F003.1** — pass — `e2e/ac-f003.1-same-invocation-three-artifacts.test.ts` — `AC-F003.1 — same invocation writes Event log, Session index, and one YAML document`
- [x] **AC-F003.2** — pass — `e2e/ac-f003.2-append-only-multidoc-yaml.test.ts` — `AC-F003.2 — YAML file is append-only multi-document with --- per document`
- [x] **AC-F003.13** — pass — `e2e/ac-f003.13-yaml-header-harness-event.test.ts` — `AC-F003.13 — header keys from both positionals match argv`; `AC-F003.13 — omitted positionals are empty strings and are not inferred`
- [x] **AC-F003.14** — pass — `e2e/ac-f003.14-session-id-initial-session-start.test.ts` — `AC-F003.14 — initial Cursor sessionStart writes session_id equal to the filename stem`; `AC-F003.14 — initial Claude SessionStart alias writes session_id equal to the filename stem`; `AC-F003.14 — later events omit session_id and do not rewrite the first document`; `AC-F003.14 — second sessionStart omits session_id and leaves the first document unchanged`; `AC-F003.14 — first event that is not session-start writes session_id on no document`
- [x] **AC-F003.15** — pass — `e2e/ac-f003.15-header-field-order.test.ts` — `AC-F003.15 — initial session-start header order is session_id, harness, event, timestamp, turn`; `AC-F003.15 — non-session-start header order is harness, event, timestamp, turn`
- [x] **AC-F003.4** — pass — `e2e/ac-f003.4-timestamp-hhmmss.test.ts` — `AC-F003.4 — payload Unix-ms timestamp formats as local HH:MM:SS`; `AC-F003.4 — payload ISO date-time string formats as local HH:MM:SS`; `AC-F003.4 — generated timestamp is local HH:MM:SS and is not on the Event log`
- [x] **AC-F003.5** — pass — `e2e/ac-f003.5-normalized-body-fields.test.ts` — `AC-F003.5 — Cursor sessionEnd body is reason only`; `AC-F003.5 — Cursor subagentStart body keys are agent_type then task`; `AC-F003.5 — absent sessionEnd reason is omitted from the body`; `AC-F003.5 — present null transcript_path is omitted from YAML`; `AC-F003.5 — Cursor beforeSubmitPrompt body is prompt only`; `AC-F003.5 — Copilot subagentStop maps argv fields and ignores sessionId`; `AC-F003.5 — Cursor sessionStart is header-only with extras omitted`
- [x] **AC-F003.6** — pass — `e2e/ac-f003.6-subagent-sibling-document.test.ts` — `AC-F003.6 — subagent event is a sibling document, not nested`
- [x] **AC-F003.7** — pass — `e2e/ac-f003.7-no-session-id-no-yaml.test.ts` — `AC-F003.7 — Copilot sessionId alone writes no YAML on first use`; `AC-F003.7 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no YAML`
- [x] **AC-F003.16** — pass — `e2e/ac-f003.16-unrecognized-header-only.test.ts` — `AC-F003.16 — unrecognized harness on initial sessionStart is five-field header-only`; `AC-F003.16 — unrecognized harness and event is four-field header-only`; `AC-F003.16 — known harness with unrecognized event is four-field header-only`
- [x] **AC-F003.9** — pass — `e2e/ac-f003.9-concurrent-yaml-complete.test.ts` — `AC-F003.9 — concurrent and repeated ingest persist complete YAML documents`
- [x] **AC-F003.10** — pass — `e2e/ac-f003.10-existing-esm-ingest.test.ts` — `AC-F003.10 — existing Node ESM ingest has no extra runtime dependencies`

Deprecated (not under test): **AC-F003.3**, **AC-F003.8**, **AC-F003.11**, **AC-F003.12**.

## Findings

None.

---

> last updated: 2026-09-02T08:45:37Z
