---
source: qualify
target: /shipify
scope: F001-ingest-harness-hooks
run: 2026-08-31
status: green
---
# qualify report — F001-ingest-harness-hooks

## Summary

- Findings: 0 · 0 blocker · 0 major · 0 minor.
- Gates: 6/6 pass.

Amend scope vs `master`: drop health tracer; omitted/`health`/non-ingest argv → usage on stderr, exit 1. Checked `cli/src/{index,usage,ingest,event,project,store}.ts`, `cli/test/*.test.ts`, `e2e/spawn.ts`, `e2e/ac-f001.11-*.test.ts`, `e2e/ac-f001.12-*.test.ts`, and `cli.rules.md`. `cd cli && bun run test` 18/18; `bun run typecheck` and `bun run lint` (Oxlint complexity 8) clean.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No UI. WCAG AA color, alt, keyboard, labels, and landmarks do not apply to this CLI ingest/usage path. |
| Security | pass | Usage path prints a static string and exits 1; no stdin parse. Ingest still parses one JSON object and swallows invalid input. Store writes `JSON.stringify(event)` plus newline. No secrets. Failures do not leak on stdout. |
| Performance | pass | Usage path is one stderr write. Ingest remains one-shot: one stdin read, one JSONL append. Lock wait 400ms (under the 500ms plan budget). No lists, N+1, or server hot path. |
| Clean-code | pass | Clarity catalog: small single-purpose functions, guard clauses, no 3+ nesting, no nested ternary, no 50+ line functions, names match behavior. `usageMessage` is a planned constant (not a needless wrapper). `spawn.ts` `runIndex` is shared by ingest and non-ingest spawns. Oxlint complexity ≤ 8. |
| Ui | n/a | No frontend. |
| Project-rules | pass | [`cli.rules.md`](../../../.agents/rules/cli.rules.md): camelCase; entry argv/stderr/`exitCode` only (usage string lives in `usage.ts`); lib Node builtins, no barrels, no DI; tests `cli/test/*.test.ts` importing `../src/…ts`; no runtime deps; `cli-node` name/bin unchanged; no health command. [`e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub. |

## Findings

None.

## Accumulated decay

- [`cli.arch.md`](../../arch/cli.arch.md) C4 and code-organization list omit `usage.ts` (cli plan: do not add a C4 component). Shipify may list the file without inventing a component.
- `isRecord` is copied in `cli/src/event.ts` and `cli/src/ingest.ts` (under the 5-line extract threshold).
- Fixture helpers `makeRoot` / `eventsPath` are copied in `cli/test/ingest.test.ts` and `cli/test/store.test.ts`.
- Plan runner `node --test e2e` does not collect tests on Node 26 Windows; the glob `e2e/*.test.ts` does (same as `cli` `test/*.test.ts`).

---

> last updated: 2026-08-31T19:17:47Z
