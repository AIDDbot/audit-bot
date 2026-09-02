---
source: qualify
target: /shipify
scope: F007-agent-display-name
run: 2026-09-02
status: green
---
# qualify report — F007-agent-display-name

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Gates: 6/6 pass.

Checked this F009-amend (AC-F007.2 / .3 / .6 `agent_display_name` after `subagent`) on `feat/F007-agent-display-name` vs `master`: title/plan/spec plus `cli/test/yaml.test.ts`, `cli/test/ingest.test.ts`, `e2e/ac-f007.1`–`.4`, renamed `e2e/ac-f007.6-subagent-not-from-display-name.test.ts` (from `.6-agent-type-…`), plus `cli.plan.md` / `e2e.plan.md` / `spec.md` / `e2e.report.md`. No `cli/src/**` change; no `.cursor/hooks.json` change; no rebuild. Product already emits compact header then `subagentLines` then `bodyLines`; `subagentStartFields` / `subagentStopFields` start with Copilot-only `agent_display_name` then `task` / `response_text`; `detailsByEvent` does not list `subagent` or `agent_display_name`; `formatSubagent` is the bare `subagent` cell; `eventLogLine` remains `JSON.stringify(payload)`; `cli/package.json` `dependencies` remain `{}`. Also re-checked `cli/src/yaml.ts`, `cli/src/report.ts`, `cli/src/event.ts`, `cli/src/ingest.ts`, remaining `e2e/ac-f007.*`, and `docs/normalized-fields.md`. `bun run typecheck` and `bun lint` (oxlint complexity ≤ 8) clean. UI catalog not applicable (no frontend). Functional spec — Criteria table omitted.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No HTML/UI in scope; YAML/Markdown files are a local Node CLI ingest (WCAG AA surfaces absent) |
| Security | pass | `agent_display_name` uses the existing ingest path (stdin JSON object; F002 positionals for YAML header only). This amend changes no persist or omit behavior. `eventLogLine` still `JSON.stringify(payload)` with no overlay or strip of `agentDisplayName` / identity keys. YAML `emitPair` quotes/block-scales `agent_display_name`; report `escapeCell` escapes `\|`. Empty `sourceKey` is skipped before `in payload`, so Cursor/Claude never map `agentDisplayName` and Copilot never maps it from `agentName` / `agentType` / `agentDescription` / `task`. Identity is F009 `subagentSourceKeys` (`subagent_type` > `agent_type` > `agentType` > `agentName`); `agentDisplayName` is not in that list. Copilot start trap `agentType: "wrong"` was dropped from AC-F007.4 so F009 preference cannot steal Copilot-column identity. Copilot `sessionId` still ignored. No SQL; no auth paths; no hardcoded secrets; `ingestHook` swallow plus `maybeWriteReport` catch leave no stack/stdout leak. `.cursor/hooks.json` unchanged (no new registrations, no `failClosed`) |
| Performance | pass | Same lock + jsonl append + index + YAML append; no extra process or YAML library. `agent_display_name` is one extra YAML pair when present. `bodyByEvent` / `detailsByEvent` are Map lookups. Empty-`sourceKey` skip is O(1). This amend adds no product work |
| Clean-code | pass | Clarity catalog on `yaml.ts` (`headerLines` then `subagentLines` then `bodyLines`; Copilot-only `MappedField` `{ name: "agent_display_name", cursor: "", copilot: "agentDisplayName", "claude-code": "" }` first on start and stop), `report.ts` `detailsByEvent` remaining-body only, retitled F007 yaml/ingest tests, and `e2e/ac-f007.*`. Titles cite AC-F007.2 / .3 / .6 and `after subagent` / `subagent is from`; no leftover `after agent_type` in F007 tests. Sequential `sourceKey.length === 0` guard before `in payload`. Functions under 50 lines and complexity ≤ 8 |
| Ui | n/a | No frontend / design-system surface |
| Project-rules | pass | `.agents/rules/cli.rules.md` (entry/lib split: `index.ts` unchanged argv/stdin/`exitCode`; YAML mapping stays in `src/yaml.ts`; Details names and Subagent cell in `src/report.ts`; camelCase; Node builtins; sequential guards; `ingestHook` never throws; ingest always `exitCode` 0; `cli-node` name/bin; no runtime deps; no `.cmd` wrappers; unit tests import `../src/…ts`; this amend did not edit `cli/src/`, so no rebuild). `.agents/rules/e2e.rules.md` (stub — nothing to violate). e2e spawn `cli/src/index.ts`, not the `.mjs` artifact |

## Findings

None.

## Accumulated decay

- `e2e/ac-f007.4`, `e2e/ac-f007.5`, and `e2e/ac-f007.6` each copy a local `spawnCase` helper; `e2e/ac-f007.1` duplicates the F006 table-parse helpers. e2e.rules.md is still a stub. Candidate for a later e2e helper — not a F007 fail.
- `detailsByEvent` in `report.ts` still restates F003 event-kind aliases (field *names* only). `yaml.ts` `bodyByEvent` still owns payload-key mapping for remaining body. Identity is F009 `subagentLines`. This spec added the same Copilot-only `MappedField` on start and stop independently; drift would be a later extract.
- `{sessionId}.yaml` / `{sessionId}.md` still interpolate the raw F001 identifier. Together with a payload-chosen project root, an identifier with path separators could leave the day folder. Candidate for a later hardening spec.
- Session report write is after `ingest.lock` is released. By prior F004 plan; a concurrent append could theoretically be visible in the read.
- `.agents/rules/cli.rules.md` summary still names ingest/event/project/store and does not list `yaml.ts` or `report.ts`.

---

> last updated: 2026-09-02T11:28:00Z
