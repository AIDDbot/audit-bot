---
source: qualify
target: /shipify
scope: F009-subagent-name
run: 2026-09-02
status: green
---
# qualify report — F009-subagent-name

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Gates: 6/6 pass.

Checked `cli/src/yaml.ts`, `cli/src/report.ts`, `cli/test/yaml.test.ts`, `cli/test/report.test.ts`, `cli/test/ingest.test.ts`, `e2e/ac-f009.*.test.ts`, Step-7 identity-key e2e updates, `docs/normalized-fields.md`, and `.agents/hooks/index.mjs` on `feat/F009-subagent-name`. `cli/src/index.ts`, `cli/src/ingest.ts`, `cli/src/event.ts`, and `.cursor/hooks.json` are unchanged. Identity is `subagentSourceKeys` preference (`subagent_type`, `agent_type`, `agentType`, `agentName`) via `subagentValue` / `subagentLines` after the compact header, not a harness-column `MappedField`. `subagentStartFields` / `subagentStopFields` keep F007 `agent_display_name` then `task` / `response_text`. `formatSubagent` reads body `subagent` only (bare `scalarText`; no `subagentByEvent`; no `agent_display_name`). `eventLogLine` remains `JSON.stringify(payload)`. `cli/package.json` `dependencies` remain `{}`. `bun run typecheck` and `oxlint` (complexity ≤ 8) clean. UI catalog not applicable (no frontend). Functional spec — Criteria table omitted.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No HTML/UI in scope; YAML/Markdown files are a local Node CLI ingest (WCAG AA surfaces absent) |
| Security | pass | `subagent` uses the existing ingest path (stdin JSON object; F002 positionals for YAML header only). Source keys are a closed four-name list with `key in payload`; traps `agentDisplayName` / `agent_display_name` / `agentDescription` / `agentId` / `subagent_id` / `task` are not in that list. `eventLogLine` still `JSON.stringify(payload)` with no overlay or strip of identity source keys. YAML `emitPair` quotes/block-scales `subagent`; report `escapeCell` escapes `\|` on the bare cell. Copilot `sessionId` still ignored. No SQL; no auth paths; no hardcoded secrets; `ingestHook` swallow plus `maybeWriteReport` catch leave no stack/stdout leak. `.cursor/hooks.json` unchanged (no new registrations, no `failClosed`) |
| Performance | pass | Same lock + jsonl append + index + YAML append; no extra process or YAML library. `subagent` is one extra YAML pair when a preferred key is present. Four-key walk is O(1). `bodyByEvent` / `detailsByEvent` stay Map lookups. Report cell is one `in` check plus `scalarText` |
| Clean-code | pass | Clarity catalog on `yaml.ts` (`subagentSourceKeys`, `subagentValue`, `subagentLines` spliced after `headerLines`), `report.ts` `formatSubagent`, F009 yaml/report/ingest tests, and `e2e/ac-f009.*`. Identity removed from harness-column tables (plan conflict). Sequential `key in payload` guards, not harness and not truthiness. `subagentByEvent` dropped. Functions under 50 lines and complexity ≤ 8 |
| Ui | n/a | No frontend / design-system surface |
| Project-rules | pass | `.agents/rules/cli.rules.md` (entry/lib split: `index.ts` unchanged argv/stdin/`exitCode`; YAML mapping stays in `src/yaml.ts`; Subagent cell in `src/report.ts`; camelCase; Node builtins; sequential guards; `ingestHook` never throws; ingest always `exitCode` 0; `cli-node` name/bin; no runtime deps; no `.cmd` wrappers; `cd cli && bun run build` rebuilt `.agents/hooks/index.mjs`). `.agents/rules/e2e.rules.md` (stub — nothing to violate). e2e spawn `cli/src/index.ts`, not the `.mjs` artifact |

## Findings

None.

## Accumulated decay

- `e2e/ac-f009.2`, `e2e/ac-f009.3`, and `e2e/ac-f009.4` each copy a local `spawnCase` helper; `e2e/ac-f009.1` duplicates the F007 table-parse helpers. e2e.rules.md is still a stub. Candidate for a later e2e helper — not a F009 fail.
- `detailsByEvent` in `report.ts` still restates F003 event-kind aliases (field *names* only). `yaml.ts` `bodyByEvent` still owns payload-key mapping for remaining body fields. Identity is now a separate preference walk; display name stays a Copilot-only `MappedField` inlined on start and stop. Drift would be a later extract.
- `{sessionId}.yaml` / `{sessionId}.md` still interpolate the raw F001 identifier. Together with a payload-chosen project root, an identifier with path separators could leave the day folder. Candidate for a later hardening spec.
- Session report write is after `ingest.lock` is released. By prior F004 plan; a concurrent append could theoretically be visible in the read.
- `.agents/rules/cli.rules.md` summary still names ingest/event/project/store and does not list `yaml.ts` or `report.ts`.
- `e2e/ac-f007.6-agent-type-not-from-display-name.test.ts` still names the retired field in the filename (AC title kept). Rename would be a later hygiene pass.

---

> last updated: 2026-09-02T10:06:00Z
