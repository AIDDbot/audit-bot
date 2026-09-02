---
source: qualify
target: /shipify
scope: F008-conversation-turns
run: 2026-09-02
status: green
---
# qualify report — F008-conversation-turns

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Gates: 6/6 pass.

Checked this `source_event` → `event` numbering-scan amend on `feat/F003-ingest-normalized-yaml` vs `master`: `cli/src/yaml.ts` (`headerEventValue` scans `^event:` only; `countPromptKindEvents`; `nextConversationTurn(existingYaml, event)`), `cli/test/yaml.test.ts` (`headerDoc` emits `event:`; trap that `source_event:` and `hook_event_name:` do not count), `cli/test/ingest.test.ts`, `e2e/ac-f008.1`–`.4`, and `.agents/hooks/index.mjs`. Compact emit keys and `includeSessionId` are sibling F003; report labels are sibling F004. `cli/src/index.ts`, `.cursor/hooks.json`, `docs/normalized-fields.md`, and `docs/arch/*.md` are unchanged. Numbering still runs under `ingest.lock` (`readExistingYaml` → `nextConversationTurn` → `emitYamlDocument` → append). Prebuilt `yamlDocument` still skips counting. `cli/package.json` `dependencies` remain `{}`. `bun run typecheck` and `oxlint` (complexity ≤ 8) clean. UI catalog not applicable (no frontend). Functional spec — Criteria table omitted.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No HTML/UI in scope; YAML/Markdown files are a local Node CLI ingest (WCAG AA surfaces absent) |
| Security | pass | Turn is counted from existing session YAML `^event:` lines plus F002 positional `event`, not payload `hook_event_name` and not a leftover `source_event:` line (unit trap). `eventLogLine` still `JSON.stringify(payload)` with no `turn` overlay. `readExistingYaml` is utf8 text + line regex (no YAML eval, no extra file). `yamlDocument` override skips counting and is unused by product ingest (`yamlEmit` only). `emitPair` keeps `turn` an unquoted integer. No SQL; no auth paths; no hardcoded secrets; `ingestHook` swallow plus `maybeWriteReport` catch leave no stack/stdout leak. `.cursor/hooks.json` unchanged (no new registrations, no `failClosed`) |
| Performance | pass | One `readFile` of that session YAML under the existing `ingest.lock`; line scan is O(n) with no YAML library and no extra process. JSONL append + session index unchanged. `yamlDocument` override skips the read. Report write still after lock (F004) |
| Clean-code | pass | Clarity catalog on `yaml.ts` (`nextConversationTurn`, `promptKindEvents`, `countPromptKindEvents`, `headerEventValue` renamed from `sourceEventValue`), yaml/ingest tests, and `e2e/ac-f008.*`. Dual `yamlDocument` / `yamlEmit` is the planned test seam, not a flag param. Functions under 50 lines and complexity ≤ 8. `promptKinds` in `report.ts` is grouping, not a reimplementation of numbering (see Accumulated decay) |
| Ui | n/a | No frontend / design-system surface |
| Project-rules | pass | `.agents/rules/cli.rules.md` (entry/lib split: `index.ts` unchanged argv/stdin/`exitCode`; numbering formula in `src/yaml.ts`; lock+read+append in `src/store.ts`; emit-inputs from `src/ingest.ts`; camelCase; Node builtins; sequential guards; `ingestHook` never throws; ingest always `exitCode` 0; `cli-node` name/bin; no runtime deps; no `.cmd` wrappers; `cd cli && bun run build` rebuilt `.agents/hooks/index.mjs`). `.agents/rules/e2e.rules.md` (stub — nothing to violate). e2e spawn `cli/src/index.ts`, not the `.mjs` artifact |

## Findings

None.

## Accumulated decay

- `yaml.ts` `promptKindEvents` and `report.ts` `promptKinds` are the same three aliases. Numbering scans YAML `event:`; the report picks the prompt row inside a turn group. Plan forbids importing `report.ts` from ingest/store. Extract would be a later shared-kind helper — not an F008 fail.
- `e2e/ac-f008.2` copies a local `spawnStep` helper. F004 e2e files still carry local table-parse helpers. e2e.rules.md is still a stub. Candidate for a later e2e helper — not an F008 fail.
- `{sessionId}.yaml` / `{sessionId}.md` still interpolate the raw F001 identifier. Together with a payload-chosen project root, an identifier with path separators could leave the day folder. Candidate for a later hardening spec.
- Session report write is after `ingest.lock` is released. By prior F004 plan; a concurrent append could theoretically be visible in the read.
- Each YAML-appending ingest reads the whole session YAML into memory to count. Required by AC-F008.1; streaming would be a later technical spec if sessions grow large.
- `.agents/rules/cli.rules.md` summary still names ingest/event/project/store and does not list `yaml.ts` or `report.ts`.
- Mixed historical YAML that still has `source_event:` is out of scope (explicit trap: those lines do not count). A later reader for unmigrated files would be its own spec.

---

> last updated: 2026-09-02T08:50:59Z
