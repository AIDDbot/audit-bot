---
source: qualify
target: /shipify
scope: F002-ingest-source-args
run: 2026-09-01
status: green
---
# qualify report — F002-ingest-source-args

## Summary

- Findings: 1 · 0 blocker · 0 major · 1 minor.
- Gates: 6/6 pass.

Checked `cli/src/argv.ts`, `cli/src/index.ts`, `cli/test/argv.test.ts`, `cli/test/hooks.test.ts`, `cli/test/ingest.test.ts`, `cli/test/usage.test.ts`, `e2e/ac-f002.*.test.ts`, `e2e/spawn.ts`, `.cursor/hooks.json`, and the four `.cursor/hooks/{event}.cmd` wrappers on `feat/F002-ingest-source-args`. `bun run typecheck` and `bun lint` clean. `cd cli && bun run test` 47/47. UI catalog not applicable (no frontend).

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No HTML/UI in scope; ingest is a Node CLI + hook wrappers (WCAG AA surfaces absent) |
| Security | pass | Positionals parsed then discarded (not passed into `ingestHook`); stdin JSON parse unchanged; no SQL; no auth paths; no hardcoded secrets; paths stay under `{projectRoot}/temp/audit/` |
| Performance | pass | `parseArgv` is a two-index read; persist/lock path unchanged from F001; no lists/N+1; wrappers are thin `node` launches |
| Clean-code | pass | Clarity catalog on `argv.ts`, `index.ts`, wrappers, and F002 tests; sequential command guard; named `parseArgv`; one minor registration-assert duplication (does not fail the gate) |
| Ui | n/a | No frontend / design-system surface |
| Project-rules | pass | `.agents/rules/cli.rules.md` (entry/lib split, camelCase, Node builtins, `ingestHook` never throws, `cli-node` name/bin, no runtime deps, `index.ts` does not pass positionals into ingest). `.agents/rules/e2e.rules.md` (stub — nothing to violate). e2e spawn `cli/src/index.ts`, not the `.mjs` artifact |

## Findings

### F1: hooks.json command assertions duplicated across three suites

- Gate: clean-code
- Where: e2e · `e2e/ac-f001.6-hook-esm-script.test.ts:37` and `e2e/ac-f002.4-register-wrapper-commands.test.ts:16`; also `cli/test/hooks.test.ts:44`
- Problem: the same four-event, path-only `command` check is copied. F002.4 is the new AC; F001.6 was updated so the suite stays green; the unit test covers the same files per the cli plan. Extracting a shared helper would mix containers (cli unit vs e2e spawn).
- Fix: optional — leave as spec-isolated copies; a later e2e helper extract is polish
- Severity: minor
- Kind: mechanical
- Handoff: none (gate still passes)

## Accumulated decay

- `requiredEvents` (`sessionStart` / `sessionEnd` / `subagentStart` / `subagentStop`) is copied in three e2e files and `cli/test/hooks.test.ts`. Fine per spec isolation.
- `cli.arch.md` still documents ingest with no positionals and a single `.cursor/hooks/ingest.cmd`. Shipify must reconcile — not an implementation fail.

---

> last updated: 2026-09-01T08:23:43Z
