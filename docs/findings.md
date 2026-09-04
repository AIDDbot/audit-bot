# Solution findings

## FND-001 — Native Codex turn calculation exceeds the complexity gate

- Status: accepted
- Source: current `clean-solution` report (2026-09-04)
- Scope: `cli/src/yaml.ts:156-175` (`nativeCodexTurn`) and its tests
- Rule: Configured lint complexity must not exceed 8, and the implementation should remain behavior-preserving.
- Evidence: `nativeCodexTurn` has measured complexity 16; the strict lint run reports this as its only error. Typecheck, 214 unit tests, and 170 E2E tests pass. The fallback at `cli/src/yaml.ts:175` is not covered.
- Fix: simplify-ingest

## FND-002 — Session history is repeatedly parsed and reread per ingest

- Status: accepted
- Source: current `clean-solution` report (2026-09-04); [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md)
- Scope: `cli/src/store.ts:130-162`, `cli/src/yaml.ts:119-188`, `cli/src/ingest.ts:143-179`, and `cli/src/report.ts:292-301`
- Rule: Reuse one parsed session-history snapshot per ingest where possible while preserving the existing lock and report concurrency semantics.
- Evidence: `appendSessionJsonl` reads the existing JSONL once, but `nextConversationTurn` and `isInitialSessionStart` each parse the full text independently. Reporting then rereads and reparses the session file after persistence. Repeating this whole-history work for every appended event produces cumulative O(n²) processing.
- Fix: simplify-ingest

## FND-003 — Subagent source-key selection traverses the same keys twice

- Status: accepted
- Source: current `clean-solution` report (2026-09-04)
- Scope: `cli/src/yaml.ts:219-245`
- Rule: A value-selection operation should perform one traversal and preserve key precedence and present-versus-absent semantics.
- Evidence: `assignSubagent` iterates `subagentSourceKeys`, then calls `subagentValue`, which starts a second iteration over the same keys. The first present key must continue to win, including present `null`, while `undefined` remains omitted.
- Fix: simplify-ingest

## FND-004 — Event schemas and prompt aliases are duplicated across emit and report modules

- Status: pending
- Source: current `clean-solution` report (2026-09-04); [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md); [F004 qualify report](specs/F004-session-end-report/qualify.report.md); [F005 qualify report](specs/F005-prompt-omit-transcript/qualify.report.md); [F006 qualify report](specs/F006-agent-stop-task/qualify.report.md); [F007 qualify report](specs/F007-agent-display-name/qualify.report.md); [F008 qualify report](specs/F008-conversation-turns/qualify.report.md); [F009 qualify report](specs/F009-subagent-name/qualify.report.md)
- Scope: `cli/src/yaml.ts:11-100` and `cli/src/report.ts:23-44`
- Rule: Shared event aliases and normalized field definitions should have one authoritative representation when extraction does not violate module boundaries.
- Evidence: `promptKindEvents` and `promptKinds` repeat the same three aliases. `bodyByEvent` and `detailsByEvent` independently restate event kinds and normalized field names; several reports record drift risk when fields are added or removed.

## FND-005 — Retired YAML document parsing helpers remain in the E2E support module

- Status: pending
- Source: [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md)
- Scope: `e2e/spawn.ts:73-79` and `e2e/spawn.ts:184-260`
- Rule: Test support modules should not retain helpers with no callers after a format migration.
- Evidence: No test imports `readSessionYaml`, `yamlDocuments`, `yamlRawScalar`, `assertYamlIntegerTurn`, `yamlMapping`, or `stripYamlQuotes` after F003-F009 moved to JSONL. `sessionYamlPath` and `listYamlFiles` remain in use for planted/no-YAML assertions.
- Severity: minor

## FND-006 — Small value guards are duplicated across CLI modules

- Status: pending
- Source: [F001 qualify report](specs/F001-ingest-hook-events/qualify.report.md); [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md)
- Scope: `cli/src/event.ts`, `cli/src/project.ts`, `cli/src/ingest.ts`, `cli/src/yaml.ts`, and `cli/src/report.ts`
- Rule: Identical low-level value guards should share an implementation when doing so respects the CLI module split.
- Evidence: `nonEmptyString` is duplicated in `event.ts` and `project.ts`; the five-line object guard is separately implemented as `isRecord` in `ingest.ts` and `isPlainObject` in both `yaml.ts` and `report.ts`.
- Severity: minor

## FND-007 — Report implementation retains YAML-era `docs` terminology

- Status: pending
- Source: [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md)
- Scope: `cli/src/report.ts`
- Rule: Names should describe the current JSONL session-record model.
- Evidence: `SessionRecord[]` parameters and `TurnGroup` members are still named `docs`, although the report input migrated from YAML documents to JSONL records.

## FND-008 — CLI rules summary omits two production modules

- Status: pending
- Source: [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md); [F003 qualify report](specs/F003-ingest-normalized-yaml/qualify.report.md); [F004 qualify report](specs/F004-session-end-report/qualify.report.md); [F005 qualify report](specs/F005-prompt-omit-transcript/qualify.report.md); [F006 qualify report](specs/F006-agent-stop-task/qualify.report.md); [F007 qualify report](specs/F007-agent-display-name/qualify.report.md); [F008 qualify report](specs/F008-conversation-turns/qualify.report.md); [F009 qualify report](specs/F009-subagent-name/qualify.report.md)
- Scope: `.agents/rules/cli.rules.md`
- Rule: Container rules should identify all current production modules they govern.
- Evidence: The summary names ingest, event, project, and store but does not list `cli/src/yaml.ts` or `cli/src/report.ts`.

## FND-009 — E2E infrastructure lacks shared conventions and repeats local helpers

- Status: pending
- Source: [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md); [F001 qualify report](specs/F001-ingest-hook-events/qualify.report.md); [F003 qualify report](specs/F003-ingest-normalized-yaml/qualify.report.md); [F004 qualify report](specs/F004-session-end-report/qualify.report.md); [F005 qualify report](specs/F005-prompt-omit-transcript/qualify.report.md); [F006 qualify report](specs/F006-agent-stop-task/qualify.report.md); [F007 qualify report](specs/F007-agent-display-name/qualify.report.md); [F008 qualify report](specs/F008-conversation-turns/qualify.report.md); [F009 qualify report](specs/F009-subagent-name/qualify.report.md)
- Scope: `.agents/rules/e2e.rules.md`, `e2e/`, and duplicated CLI-test fixtures
- Rule: Repeated E2E setup and parsing conventions should be captured once when a shared helper does not erase spec-level intent.
- Evidence: Reports repeatedly identify copied `spawnCase`/`spawnStep`, table parsing, header slices, dated paths, and JSON assertion helpers. `.agents/rules/e2e.rules.md` remains a stub, so no shared extraction boundary is documented.

## FND-010 — Cursor hook registration assertions repeat the same event-command table

- Status: pending
- Source: [F002 qualify report](specs/F002-ingest-source-args/qualify.report.md); [F005 qualify report](specs/F005-prompt-omit-transcript/qualify.report.md); [F006 qualify report](specs/F006-agent-stop-task/qualify.report.md)
- Scope: `cli/test/hooks.test.ts`, `e2e/ac-f001.6-hook-esm-script.test.ts`, `e2e/ac-f002.4-register-wrapper-commands.test.ts`, `e2e/ac-f005.1-register-before-submit-prompt.test.ts`, and `e2e/ac-f006.1-register-stop.test.ts`
- Rule: Identical hook registration tables and command assertions should avoid copy drift while preserving unit/E2E container boundaries.
- Evidence: The same required-event lists and `node .agents/hooks/index.mjs ingest cursor {event}` command checks are copied across the listed suites.
- Severity: minor

## FND-011 — Raw session identifiers can escape the audit day folder

- Status: pending
- Source: [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md); [F004 qualify report](specs/F004-session-end-report/qualify.report.md); [F005 qualify report](specs/F005-prompt-omit-transcript/qualify.report.md); [F006 qualify report](specs/F006-agent-stop-task/qualify.report.md); [F007 qualify report](specs/F007-agent-display-name/qualify.report.md); [F008 qualify report](specs/F008-conversation-turns/qualify.report.md); [F009 qualify report](specs/F009-subagent-name/qualify.report.md)
- Scope: session JSONL and Markdown path construction in `cli/src/store.ts` and `cli/src/ingest.ts`
- Rule: Payload-derived identifiers used as filenames should not be able to resolve outside the intended audit day folder.
- Evidence: `{sessionId}.jsonl` and `{sessionId}.md` interpolate the raw F001 identifier. A session identifier containing path separators, combined with the payload-chosen project root, can address a path outside the day folder. Remediation would define new observable handling for such identifiers.

## FND-012 — Report generation can observe a concurrent append

- Status: pending
- Source: [C001 qualify report](changes/C001-session-normalized-jsonl/qualify.report.md); [F003 qualify report](specs/F003-ingest-normalized-yaml/qualify.report.md); [F004 qualify report](specs/F004-session-end-report/qualify.report.md); [F005 qualify report](specs/F005-prompt-omit-transcript/qualify.report.md); [F006 qualify report](specs/F006-agent-stop-task/qualify.report.md); [F007 qualify report](specs/F007-agent-display-name/qualify.report.md); [F008 qualify report](specs/F008-conversation-turns/qualify.report.md); [F009 qualify report](specs/F009-subagent-name/qualify.report.md)
- Scope: `cli/src/ingest.ts:143-179` and the ingest/report lock boundary
- Rule: The concurrency semantics of a session report should be explicit and deterministic.
- Evidence: Persistence releases `ingest.lock` before `maybeWriteReport` reads the session JSONL, so another ingest may append before the report snapshot is read. Existing reports record this as intentional by the F004 plan; changing it would change observable concurrency behavior.

## FND-013 — F002 specification contradicts the implemented Cursor command form

- Status: pending
- Source: [F002 qualify report](specs/F002-ingest-source-args/qualify.report.md)
- Scope: `docs/specs/F002-ingest-source-args/spec.md`
- Rule: Released acceptance criteria should describe the implemented and documented hook invocation contract.
- Evidence: AC-F002.3/4 and surrounding text still require distinct wrapper files and path-only commands, while the architecture, tests, learning scar, and product use shell strings of the form `node .agents/hooks/index.mjs ingest cursor {event}` with no `.cmd` wrappers.

## FND-014 — F002 E2E filenames retain retired wrapper terminology

- Status: pending
- Source: [F002 qualify report](specs/F002-ingest-source-args/qualify.report.md)
- Scope: `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` and `e2e/ac-f002.4-register-wrapper-commands.test.ts`
- Rule: Test filenames should reflect the active behavior they verify.
- Evidence: The filenames still say `wrapper` although the tests assert direct shell-string commands and no wrapper files exist.
