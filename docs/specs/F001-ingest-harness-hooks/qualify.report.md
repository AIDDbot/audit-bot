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

Checked `cli/src/{index,event,project,store,ingest,lib}.ts`, `cli/test/*.test.ts`, hook registration, and `cli.rules.md`. `cd cli && bun run test` 18/18; `bun run typecheck` and `bun run lint` (Oxlint complexity 8) clean.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No UI. WCAG AA color, alt, keyboard, labels, and landmarks do not apply to this CLI ingest path. |
| Security | pass | Stdin parsed as one JSON object; invalid input swallowed. Store writes `JSON.stringify(event)` plus newline (no string-built queries). No secrets. Ingest failures do not leak on stdout. Project root comes from harness env/payload as the spec requires. |
| Performance | pass | One-shot CLI: one stdin read, one JSONL append. Lock wait 400ms (under the 500ms plan budget). No lists, N+1, or server hot path. |
| Clean-code | pass | Clarity catalog: small single-purpose functions, guard clauses, no 3+ nesting, no nested ternary, no 50+ line functions, names match behavior. Oxlint complexity ≤ 8. |
| Ui | n/a | No frontend. |
| Project-rules | pass | [`cli.rules.md`](../../../.agents/rules/cli.rules.md): camelCase; entry argv/stdout/`exitCode` only; lib exported functions, Node builtins, no barrels, no DI; tests `cli/test/*.test.ts` importing `../src/…ts`; no runtime deps; `cli-node` name/bin unchanged. [`e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub. |

## Findings

None.

## Accumulated decay

- [`cli.arch.md`](../../arch/cli.arch.md) and [`model.schema.md`](../../model/model.schema.md) still describe the health tracer only (no Event persist). Shipify reconciles.
- `isRecord` is copied in `cli/src/event.ts` and `cli/src/ingest.ts` (under the 5-line extract threshold).
- Fixture helpers `makeRoot` / `eventsPath` are copied in `cli/test/ingest.test.ts` and `cli/test/store.test.ts`.
- Plan runner `node --test e2e` does not collect tests on Node 26 Windows; the glob `e2e/*.test.ts` does (same as `cli` `test/*.test.ts`).

---

> last updated: 2026-08-31T18:49:07Z
