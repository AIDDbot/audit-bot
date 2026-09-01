---
source: verify
target: /qualify
scope: F004-session-end-report
run: 2026-09-01
status: green
---
# e2e report — F004-session-end-report

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 25/25 · Criteria: 13/13 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (78 pass, 0 fail — 25 F004 + 11 F006 + 7 F005 + 21 F003 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (126 pass, 0 fail). Deprecated AC-F004.1, AC-F004.3, and AC-F004.12 were ignored (tests deleted).

## Criteria

- [x] **AC-F004.2** — pass — `e2e/ac-f004.2-report-table-file-order.test.ts` — `AC-F004.2 — report table rows follow YAML file order, not timestamp sort`
- [x] **AC-F004.4** — pass — `e2e/ac-f004.4-event-count-summary.test.ts` — `AC-F004.4 — event-count summary totals documents and counts each source_event`
- [x] **AC-F004.5** — pass — `e2e/ac-f004.5-details-normalized-fields.test.ts` — `AC-F004.5 — Details are mapped normalized body fields in table order`; `AC-F004.5 — absent subagentStart task and sessionEnd reason are omitted`; `AC-F004.5 — present YAML null appears in Details`; `AC-F004.5 — unrecognized header-only document has empty Details`; `AC-F004.5 — pipe in a Details value stays one table cell`
- [x] **AC-F004.6** — pass — `e2e/ac-f004.6-details-preview-80-chars.test.ts` — `AC-F004.6 — Details value longer than 80 characters is truncated with ellipsis`; `AC-F004.6 — Details value of 80 characters does not get an ellipsis`; `AC-F004.6 — newlines become spaces before the 80-character limit`
- [x] **AC-F004.7** — pass — `e2e/ac-f004.7-subagent-ordinary-rows.test.ts` — `AC-F004.7 — subagent start and stop are ordinary chronological table rows`
- [x] **AC-F004.8** — pass — `e2e/ac-f004.8-markdown-file-not-html.test.ts` — `AC-F004.8 — Session report is Markdown tables at {session_id}.md, not HTML`
- [x] **AC-F004.9** — pass — `e2e/ac-f004.9-observe-only-report-failure.test.ts` — `AC-F004.9 — sessionEnd is observe-only: exit 0 and empty stdout`; `AC-F004.9 — report write failure still persists F001 and F003 and stays observe-only`
- [x] **AC-F004.10** — pass — `e2e/ac-f004.10-existing-esm-ingest.test.ts` — `AC-F004.10 — existing Node ESM ingest writes the Session report with no extra runtime dependencies`
- [x] **AC-F004.11** — pass — `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts` — `AC-F004.11 — Session report is produced from YAML, not Event log or Session index`
- [x] **AC-F004.13** — pass — `e2e/ac-f004.13-no-session-id-no-report.test.ts` — `AC-F004.13 — Copilot sessionId alone writes no Session report on first use`; `AC-F004.13 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no report`
- [x] **AC-F004.14** — pass — `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts` — `AC-F004.14 — ingest cursor sessionStart writes YAML and Session report without sessionEnd`; `AC-F004.14 — ingest cursor stop writes YAML and Session report without sessionEnd`; `AC-F004.14 — ingest cursor sessionEnd still writes YAML and Session report`
- [x] **AC-F004.15** — pass — `e2e/ac-f004.15-overview-times-and-duration.test.ts` — `AC-F004.15 — overview uses last-document source_harness and elapsed duration without sessionEnd`; `AC-F004.15 — last timestamp before first yields duration 00:00:00 without sessionEnd`; `AC-F004.15 — equal timestamps yield duration 00:00:00 without sessionEnd`
- [x] **AC-F004.16** — pass — `e2e/ac-f004.16-overwrite-same-day-report.test.ts` — `AC-F004.16 — later same-day YAML append overwrites {session_id}.md`

## Findings

None.

---

> last updated: 2026-09-01T12:24:09Z
