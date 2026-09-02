---
source: verify
target: /codify
scope: C001-session-normalized-jsonl
run: 2026-09-02
status: red
specs:
  - F010-session-normalized-jsonl
  - F003-ingest-normalized-yaml
  - F008-conversation-turns
  - F004-session-end-report
  - F005-prompt-omit-transcript
  - F006-agent-stop-task
  - F007-agent-display-name
  - F009-subagent-name
---
# e2e report — C001-session-normalized-jsonl

## Summary

- Findings: 1 · 1 blocker · 0 major · 0 minor.
- Scenarios: 154/155 · Criteria: 64/65 marked `[x]` across 8 specs.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run (`temp/audit/` left untouched). Suite: `node --test e2e/*.test.ts` (168 pass, 1 fail, 169 tests including F001/F002 regression 14/14). CLI units (extra signal, not the verdict): `cd cli && bun run test` (204 pass, 0 fail). Listed-spec spawn tests: 154 pass, 1 fail (`AC-F010.3` planted-YAML case). Deprecated criteria ignored.

## Criteria

### F010-session-normalized-jsonl

- [x] **AC-F010.1** — pass
- [x] **AC-F010.2** — pass
- [ ] **AC-F010.3** — fail → F1
- [x] **AC-F010.4** — pass
- [x] **AC-F010.5** — pass
- [x] **AC-F010.6** — pass
- [x] **AC-F010.7** — pass
- [x] **AC-F010.8** — pass

### F003-ingest-normalized-yaml

- [x] **AC-F003.13** — pass
- [x] **AC-F003.14** — pass
- [x] **AC-F003.15** — pass
- [x] **AC-F003.4** — pass
- [x] **AC-F003.5** — pass
- [x] **AC-F003.6** — pass
- [x] **AC-F003.16** — pass
- [x] **AC-F003.17** — pass
- [x] **AC-F003.9** — pass
- [x] **AC-F003.10** — pass
- [x] **AC-F003.18** — pass

### F008-conversation-turns

- [x] **AC-F008.1** — pass
- [x] **AC-F008.2** — pass
- [x] **AC-F008.3** — pass
- [x] **AC-F008.4** — pass
- [x] **AC-F008.5** — pass
- [x] **AC-F008.6** — pass

### F004-session-end-report

- [x] **AC-F004.2** — pass
- [x] **AC-F004.21** — pass
- [x] **AC-F004.22** — pass
- [x] **AC-F004.24** — pass
- [x] **AC-F004.18** — pass
- [x] **AC-F004.19** — pass
- [x] **AC-F004.6** — pass
- [x] **AC-F004.7** — pass
- [x] **AC-F004.8** — pass
- [x] **AC-F004.9** — pass
- [x] **AC-F004.10** — pass
- [x] **AC-F004.11** — pass
- [x] **AC-F004.13** — pass
- [x] **AC-F004.14** — pass
- [x] **AC-F004.23** — pass
- [x] **AC-F004.16** — pass

### F005-prompt-omit-transcript

- [x] **AC-F005.1** — pass
- [x] **AC-F005.2** — pass
- [x] **AC-F005.6** — pass
- [x] **AC-F005.4** — pass
- [x] **AC-F005.5** — pass

### F006-agent-stop-task

- [x] **AC-F006.1** — pass
- [x] **AC-F006.2** — pass
- [x] **AC-F006.8** — pass
- [x] **AC-F006.4** — pass
- [x] **AC-F006.5** — pass
- [x] **AC-F006.6** — pass
- [x] **AC-F006.7** — pass

### F007-agent-display-name

- [x] **AC-F007.1** — pass
- [x] **AC-F007.2** — pass
- [x] **AC-F007.3** — pass
- [x] **AC-F007.4** — pass
- [x] **AC-F007.5** — pass
- [x] **AC-F007.6** — pass
- [x] **AC-F007.7** — pass

### F009-subagent-name

- [x] **AC-F009.1** — pass
- [x] **AC-F009.2** — pass
- [x] **AC-F009.3** — pass
- [x] **AC-F009.4** — pass
- [x] **AC-F009.5** — pass

## Findings

### F1: AC-F010.3 — planted YAML is unread and unrewritten; new ingest writes JSONL only

- Source: **AC-F010.3** (F010-session-normalized-jsonl) — THE SYSTEM SHALL NOT write `{session_id}.yaml` for new ingests; THE SYSTEM SHALL NOT migrate, read, or rewrite existing `{session_id}.yaml` files; THE SYSTEM SHALL NOT mix YAML and JSONL in one session (new ingests write JSONL only).
- Where: e2e
- Problem: expected JSONL not to contain the planted YAML marker `planted` · actual `assert.equal(jsonlText.includes("planted"), false)` failed because the fixture session id is `sess-ac-f010-3-planted`, which appears on the initial session-start object. Sibling `AC-F010.3 — new ingest writes JSONL only and does not create YAML` passed. CLI units covering planted YAML (`AC-F010.3 planted yaml is unread`) passed. Ingest does not read or write `.yaml` files.
- Fix: stop asserting a substring that matches the session-id stem; assert the planted YAML bytes/mtime stay unchanged and that JSONL records do not contain `source_harness: planted`.
- Severity: blocker
- Kind: test
- Handoff: `/codify` e2e

---

> last updated: 2026-09-02T16:35:00Z
