---
source: verify
target: /codify
scope: F008-conversation-turns
run: 2026-09-02
status: red
---
# e2e report — F008-conversation-turns

## Summary

- Findings: 4 · 0 blocker · 4 major · 0 minor.
- Scenarios: 19/19 F008 · Criteria: 6/6 marked `[x]`.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run. Suite: `node --test e2e/*.test.ts` (110 pass, 5 fail — 19 F008 pass + 13 F007 + 11 F006 + 7 F005 + 25/30 F004 + 21 F003 + 5 F002 + 9 F001 regression). Isolated re-run of the five failing files reproduced all five failures (not flaky). CLI units (extra signal): `cd cli && bun run test` (164 pass, 0 fail). Spec status stays `in-progress` because the suite is red.

## Criteria

- [x] **AC-F008.1** — pass — `e2e/ac-f008.1-turn-formula-session-prompt-stop.test.ts` — `AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1`
- [x] **AC-F008.2** — pass — `e2e/ac-f008.2-prompt-kind-aliases-only.test.ts` — `AC-F008.2 — only three prompt-kind aliases increment turn`; `AC-F008.2 — cursor beforeSubmitPrompt is unquoted turn 1`; `AC-F008.2 — positional stop with payload hook_event_name beforeSubmitPrompt stays turn 1`; `AC-F008.2 — cursor stop stays unquoted turn 1`; `AC-F008.2 — cursor subagentStop stays unquoted turn 1`; `AC-F008.2 — copilot agentStop stays unquoted turn 1`; `AC-F008.2 — claude-code Stop stays unquoted turn 1`; `AC-F008.2 — claude-code SubagentStop stays unquoted turn 1`; `AC-F008.2 — copilot userPromptSubmitted is unquoted turn 2`; `AC-F008.2 — claude-code UserPromptSubmit is unquoted turn 3`
- [x] **AC-F008.3** — pass — `e2e/ac-f008.3-first-prompt-one-preamble-zero.test.ts` — `AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0`
- [x] **AC-F008.4** — pass — `e2e/ac-f008.4-append-only-prior-turn-unchanged.test.ts` — `AC-F008.4 — append-only: prior documents' turn is not rewritten`
- [x] **AC-F008.5** — pass — `e2e/ac-f008.5-no-event-log-turn-no-sidecar.test.ts` — `AC-F008.5 — Event log has no turn overlay and no sidecar Turn file`
- [x] **AC-F008.6** — pass — `e2e/ac-f008.6-observe-only-existing-esm.test.ts` — `AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration`; `AC-F008.6 — cli/package.json is Node ≥ 24 ESM with empty dependencies`; `AC-F008.6 — sessionStart is observe-only`; `AC-F008.6 — beforeSubmitPrompt is observe-only`; `AC-F008.6 — stop is observe-only`

## Findings

### F1: later same-day overwrite still counted as one flat Events table

- Source: **AC-F004.16** — WHEN a later ingest appends another Session YAML log document for the same session the same day, THE SYSTEM SHALL overwrite `{session_id}.md` from the current Session YAML log and SHALL NOT append a second report.
- Where: e2e
- Problem: expected `eventRows(secondReport).length === 2` after `sessionStart` then `beforeSubmitPrompt` (first `| Time | Event | Details |` table grows by one row) · actual first table is Turn 0 (`sessionStart` only), so the count stays 1; F008 numbers the prompt as turn 1 and F004.17 puts it in a later subsection. Overwrite-not-append (`listMdFiles` one `{session_id}.md`) was not reached as the failing assertion.
- Fix: Assert overwrite via a single `{session_id}.md` and report text change; count rows per turn subsection (Turn 0 preamble, Turn 1 first prompt), not across the first table in the whole file.
- Severity: major
- Kind: test
- Handoff: `/codify` e2e

### F2: grouping tests still require every document in Turn 0

- Source: **AC-F004.17** — THE SYSTEM SHALL include one Markdown subsection per distinct `turn` value present in that Session YAML log, in ascending turn-number order, and SHALL NOT list every document in a single session-wide Events table.
- Where: e2e
- Problem: expected `assertTurn0Table` (`## Turn 1` absent, all documents in Turn 0) for sequences that include `beforeSubmitPrompt` (`AC-F004.17 — several events group into Turn 0 with no session-wide Events table`; `AC-F004.17 — Details are mapped normalized body fields in the turn table`) · actual F008 writes `turn: 1` on the first prompt, so the report correctly includes `## Turn 1` (`true == false` at `assert.equal(markdown.includes("## Turn 1"), false)`). Isolated re-run reproduced both failures. The five other AC-F004.17 tests (no prompt-kind ingest, or Copilot/Claude Details-only) passed.
- Fix: Split expected rows by turn: preamble documents in Turn 0; first prompt-kind and later non-prompt documents in Turn 1; keep Details mapping assertions on the matching subsection. Drop the “no Turn 1” check when the fixture includes a prompt-kind event.
- Severity: major
- Kind: test
- Handoff: `/codify` e2e

### F3: Turn 0 prompt-line test looks up the prompt row in Turn 0

- Source: **AC-F004.19** — WHEN the subsection is for turn **0**, THE SYSTEM SHALL NOT include a prompt line.
- Where: e2e
- Problem: expected Turn 0 to contain a `beforeSubmitPrompt` row (`assert.ok(promptRow)`) after `sessionStart` then prompt then `stop` · actual that prompt is turn 1, so Turn 0 has no such row. The AC’s “Turn 0 has no `Prompt:` line” check passed; the extra “prompt lives in Turn 0” assertion is wrong relative to F008.
- Fix: Keep the no-`Prompt:` assertion on Turn 0; look up the prompt row (and `Prompt:` line per AC-F004.19 for n ≥ 1) under Turn 1.
- Severity: major
- Kind: test
- Handoff: `/codify` e2e

### F4: file-order test expects start, prompt, and end all in Turn 0

- Source: **AC-F004.2** — THE SYSTEM SHALL produce the Session report by reading that session’s Session YAML log (all documents, in file order) and SHALL NOT re-sort those documents.
- Where: e2e
- Problem: expected Turn 0 table `rows.length === 3` (`sessionStart` at 12:00, `beforeSubmitPrompt` at 10:00, `sessionEnd` at 11:00, file order not timestamp order) · actual Turn 0 has 1 row (`sessionStart`); the prompt and `sessionEnd` are turn 1 (`1 == 3`). Isolated re-run reproduced the failure.
- Fix: Assert file order (not timestamp sort) inside each turn: Turn 0 is `sessionStart` only; Turn 1 is `beforeSubmitPrompt` then `sessionEnd` in YAML file order.
- Severity: major
- Kind: test
- Handoff: `/codify` e2e

---

> last updated: 2026-09-02T06:58:00Z
