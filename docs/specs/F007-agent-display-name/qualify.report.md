---
source: qualify
target: /shipify
scope: F007-agent-display-name
run: 2026-09-01
status: green
---
# qualify report — F007-agent-display-name

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Gates: 6/6 pass.

Checked `cli/src/yaml.ts`, `cli/src/report.ts`, `cli/test/yaml.test.ts`, `cli/test/report.test.ts`, `cli/test/ingest.test.ts`, `e2e/ac-f007.*.test.ts`, `docs/normalized-fields.md`, and `.agents/hooks/index.mjs` on `feat/F007-agent-display-name`. `cli/src/index.ts`, `cli/src/ingest.ts`, `cli/src/event.ts`, and `.cursor/hooks.json` are unchanged. `cli/src` maps Copilot `agentDisplayName` → `agent_display_name` after `agent_type` on subagent start (before `task`) and subagent stop (before `response_text`); Cursor and Claude Code source keys stay empty so planted `agentDisplayName` is skipped. `eventLogLine` remains `JSON.stringify(payload)`. `cli/package.json` `dependencies` remain `{}`. `bun run typecheck` and `oxlint` (complexity ≤ 8) clean. UI catalog not applicable (no frontend). Functional spec — Criteria table omitted.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No HTML/UI in scope; YAML/Markdown files are a local Node CLI ingest (WCAG AA surfaces absent) |
| Security | pass | `agent_display_name` uses the existing ingest path (stdin JSON object; F002 positionals for YAML header only). `eventLogLine` still `JSON.stringify(payload)` with no overlay or strip of `agentDisplayName` / `agentName` / `agentType`. YAML `emitPair` quotes/block-scales `agent_display_name`; report `escapeCell` escapes `\|`. Empty `sourceKey` is skipped before `in payload`, so Cursor/Claude never map `agentDisplayName` and Copilot never maps it from `agentName` / `agentType` / `agentDescription` / `task`. Copilot `sessionId` still ignored. No SQL; no auth paths; no hardcoded secrets; `ingestHook` swallow plus `maybeWriteReport` catch leave no stack/stdout leak. `.cursor/hooks.json` unchanged (no new registrations, no `failClosed`) |
| Performance | pass | Same lock + jsonl append + index + YAML append; no extra process or YAML library. `agent_display_name` is one extra YAML pair when present. `bodyByEvent` / `detailsByEvent` are Map lookups. Empty-`sourceKey` skip is O(1) |
| Clean-code | pass | Clarity catalog on `yaml.ts`, `report.ts` `detailsByEvent`, F007 yaml/report/ingest tests, and `e2e/ac-f007.*`. Named `MappedField` `{ name: "agent_display_name", cursor: "", copilot: "agentDisplayName", "claude-code": "" }` after `agent_type` on both start and stop; sequential `sourceKey.length === 0` guard before `in payload`. `agent_type` source keys stay F003 (`agentName` / `agentType`). Functions under 50 lines and complexity ≤ 8 |
| Ui | n/a | No frontend / design-system surface |
| Project-rules | pass | `.agents/rules/cli.rules.md` (entry/lib split: `index.ts` unchanged argv/stdin/`exitCode`; YAML mapping stays in `src/yaml.ts`; Details names in `src/report.ts`; camelCase; Node builtins; sequential guards; `ingestHook` never throws; ingest always `exitCode` 0; `cli-node` name/bin; no runtime deps; no `.cmd` wrappers). `.agents/rules/e2e.rules.md` (stub — nothing to violate). e2e spawn `cli/src/index.ts`, not the `.mjs` artifact |

## Findings

None.

## Accumulated decay

- `e2e/ac-f007.4`, `e2e/ac-f007.5`, and `e2e/ac-f007.6` each copy a local `spawnCase` helper; `e2e/ac-f007.1` duplicates the F006 table-parse helpers. e2e.rules.md is still a stub. Candidate for a later e2e helper — not a F007 fail.
- `detailsByEvent` in `report.ts` still restates F003 event-kind aliases (field *names* only). `yaml.ts` `bodyByEvent` still owns payload-key mapping. This spec added `agent_display_name` to both tables independently; the same Copilot-only `MappedField` is inlined on start and stop. Drift would be a later extract.
- `{sessionId}.yaml` / `{sessionId}.md` still interpolate the raw F001 identifier. Together with a payload-chosen project root, an identifier with path separators could leave the day folder. Candidate for a later hardening spec.
- Session report write is after `ingest.lock` is released. By prior F004 plan; a concurrent append could theoretically be visible in the read.
- `.agents/rules/cli.rules.md` summary still names ingest/event/project/store and does not list `yaml.ts` or `report.ts`.

---

> last updated: 2026-09-01T19:00:45Z
