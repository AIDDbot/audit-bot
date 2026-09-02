---
source: verify
target: /qualify
scope: C001-session-normalized-jsonl
run: 2026-09-02
status: green
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

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Scenarios: 155/155 · Criteria: 65/65 marked `[x]` across 8 specs.

Ports: not applicable (no HTTP). Data cleaned under `temp/e2e/` before the run (`temp/audit/` left untouched). Suite: `node --test e2e/*.test.ts` (169 pass, 0 fail, 169 tests including F001/F002 regression 14/14). Listed-spec spawn tests: 155 pass, 0 fail. Prior F1 (AC-F010.3 planted YAML substring vs session-id stem) is closed by the planted-YAML assertions (bytes/mtime unchanged; JSONL records have no `source_harness`; `source_harness: planted` absent from JSONL text). Deprecated criteria ignored.

## Criteria

### F010-session-normalized-jsonl

- [x] **AC-F010.1** — pass
- [x] **AC-F010.2** — pass
- [x] **AC-F010.3** — pass
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

None.

---

> last updated: 2026-09-02T16:36:12Z
