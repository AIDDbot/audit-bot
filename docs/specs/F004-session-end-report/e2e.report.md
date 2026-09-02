---
source: verify
target: /qualify
scope: F004-session-end-report
run: 2026-09-02
status: green
---
# e2e report — F004-session-end-report

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 40/40 · Criteria: 16/16 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (158 pass, 0 fail — 40 F004 + 34 F003 + 20 F009 + 19 F008 + 13 F007 + 11 F006 + 7 F005 + 5 F002 + 9 F001 regression). CLI units (extra signal): `cd cli && bun run test` (189 pass, 0 fail). AC-F004.22 and AC-F004.24 passed from this run (turn subsections with Event/`event`; Details exclude `subagent` / `agent_display_name`; Subagent cell is the bare `subagent` name on any kind). Remaining active ACs passed as regression. Deprecated AC-F004.1, AC-F004.3, AC-F004.4, AC-F004.5, AC-F004.12, AC-F004.15, AC-F004.17, and AC-F004.20 were ignored (matching files gone; replacements are AC-F004.21 / .22 / .23 / .24).

## Criteria

- [x] **AC-F004.2** — pass — `e2e/ac-f004.2-report-table-file-order.test.ts` — `AC-F004.2 — report table rows follow YAML file order, not timestamp sort`
- [x] **AC-F004.21** — pass — `e2e/ac-f004.21-event-count-summary.test.ts` — `AC-F004.21 — event-count summary totals documents and counts each event`
- [x] **AC-F004.22** — pass — `e2e/ac-f004.22-turn-subsections.test.ts` — `AC-F004.22 — several events group into Turn 0 then Turn 1 with four-column tables and no Events heading`; `AC-F004.22 — Details are mapped normalized body fields in the turn table`; `AC-F004.22 — Copilot subagentStart Details omit identity and task`; `AC-F004.22 — absent keys are omitted from Details`; `AC-F004.22 — present YAML null appears in Details`; `AC-F004.22 — unrecognized header-only document has empty Details`; `AC-F004.22 — pipe in a Details value stays one table cell`; `AC-F004.22 — prompt-only session omits empty Turn 0`
- [x] **AC-F004.24** — pass — `e2e/ac-f004.24-subagent-bare-name.test.ts` — `AC-F004.24 — subagentStart and subagentStop Subagent is the bare name`; `AC-F004.24 — sessionStart, prompt, and stop fill Subagent when identity is present`; `AC-F004.24 — later row without identity does not inherit Subagent`; `AC-F004.24 — Copilot Subagent is the slug not the display name`; `AC-F004.24 — Subagent is empty when identity is absent`
- [x] **AC-F004.18** — pass — `e2e/ac-f004.18-turn-duration.test.ts` — `AC-F004.18 — Turn 0 duration is first turn-0 timestamp to last, including stop`; `AC-F004.18 — equal turn-0 timestamps yield Duration 00:00:00`
- [x] **AC-F004.19** — pass — `e2e/ac-f004.19-turn-prompt.test.ts` — `AC-F004.19 — Turn 0 subsection has no Prompt: line`; `AC-F004.19 — Turn ≥ 1 Prompt line uses the 100-character preview`; `AC-F004.19 — Turn ≥ 1 omits Prompt: when prompt is absent`
- [x] **AC-F004.6** — pass — `e2e/ac-f004.6-details-preview-100-chars.test.ts` — `AC-F004.6 — Details value longer than 100 characters is truncated with ellipsis`; `AC-F004.6 — Details value of 100 characters does not get an ellipsis`; `AC-F004.6 — newlines become spaces before the 100-character limit`; `AC-F004.6 — Subagent identity longer than 100 characters is truncated with ellipsis`
- [x] **AC-F004.7** — pass — `e2e/ac-f004.7-subagent-ordinary-rows.test.ts` — `AC-F004.7 — subagent start and stop are ordinary chronological table rows`
- [x] **AC-F004.8** — pass — `e2e/ac-f004.8-markdown-file-not-html.test.ts` — `AC-F004.8 — Session report is Markdown tables at {session_id}.md, not HTML`
- [x] **AC-F004.9** — pass — `e2e/ac-f004.9-observe-only-report-failure.test.ts` — `AC-F004.9 — sessionEnd is observe-only: exit 0 and empty stdout`; `AC-F004.9 — report write failure still persists F001 and F003 and stays observe-only`
- [x] **AC-F004.10** — pass — `e2e/ac-f004.10-existing-esm-ingest.test.ts` — `AC-F004.10 — existing Node ESM ingest writes the Session report with no extra runtime dependencies`
- [x] **AC-F004.11** — pass — `e2e/ac-f004.11-report-from-yaml-not-jsonl.test.ts` — `AC-F004.11 — Session report is produced from YAML, not Event log or Session index`
- [x] **AC-F004.13** — pass — `e2e/ac-f004.13-no-session-id-no-report.test.ts` — `AC-F004.13 — Copilot sessionId alone writes no Session report on first use`; `AC-F004.13 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no report`
- [x] **AC-F004.14** — pass — `e2e/ac-f004.14-same-invocation-yaml-and-report.test.ts` — `AC-F004.14 — ingest cursor sessionStart writes YAML and Session report without sessionEnd`; `AC-F004.14 — ingest cursor stop writes YAML and Session report without sessionEnd`; `AC-F004.14 — ingest cursor sessionEnd still writes YAML and Session report`
- [x] **AC-F004.23** — pass — `e2e/ac-f004.23-overview-times-and-duration.test.ts` — `AC-F004.23 — overview uses last-document harness and elapsed duration without sessionEnd`; `AC-F004.23 — last timestamp before first yields duration 00:00:00 without sessionEnd`; `AC-F004.23 — equal timestamps yield duration 00:00:00 without sessionEnd`; `AC-F004.23 — prompt-only YAML omits session_id; overview session_id is F001 filename stem`
- [x] **AC-F004.16** — pass — `e2e/ac-f004.16-overwrite-same-day-report.test.ts` — `AC-F004.16 — later same-day YAML append overwrites {session_id}.md`

Deprecated (not under test): **AC-F004.1**, **AC-F004.3**, **AC-F004.4**, **AC-F004.5**, **AC-F004.12**, **AC-F004.15**, **AC-F004.17**, **AC-F004.20**.

## Findings

None.

---

> last updated: 2026-09-02T10:42:31Z
