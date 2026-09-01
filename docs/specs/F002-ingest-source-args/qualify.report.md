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

Checked `cli/src/argv.ts`, `cli/src/index.ts`, `cli/src/ingest.ts`, `cli/src/usage.ts`, `cli/test/argv.test.ts`, `cli/test/hooks.test.ts`, `cli/test/ingest.test.ts`, `cli/test/usage.test.ts`, `cli/test/event.test.ts`, `e2e/ac-f002.*.test.ts`, `e2e/ac-f001.6-hook-esm-script.test.ts`, `e2e/spawn.ts`, and `.cursor/hooks.json` on `feat/F003-ingest-normalized-yaml` (F002 replan after Cursor-registration learning scar). No `.cursor/hooks/*.cmd` wrappers exist. `bun run typecheck` and `bun lint` clean. UI catalog not applicable (no frontend). Functional spec — Criteria table omitted.

## Gates

| Gate | Verdict | Checked against |
|------|---------|-----------------|
| Accessibility | pass | No HTML/UI in scope; ingest is a Node CLI invoked by Cursor hook shell strings (WCAG AA surfaces absent) |
| Security | pass | Positionals parsed then discarded (`index.ts` does not pass them into `ingestHook`); stdin JSON object guard unchanged; no SQL; no auth paths; no hardcoded secrets; ingest swallows errors (no stack/stdout leak); paths stay under `{projectRoot}/temp/audit/` |
| Performance | pass | `parseArgv` is a two-index read; persist/lock path unchanged from F001; no lists/N+1; no `.cmd` wrapper launches |
| Clean-code | pass | Clarity catalog on `argv.ts`, `index.ts`, `hooks.test.ts`, and F002 e2e tests; sequential command guard; named `parseArgv`; `IngestInput` has no harness/event; one minor registration-assert duplication (does not fail the gate) |
| Ui | n/a | No frontend / design-system surface |
| Project-rules | pass | `.agents/rules/cli.rules.md` (entry/lib split, camelCase, Node builtins, sequential guards, `ingestHook` never throws, ingest always `exitCode` 0, `cli-node` name/bin, no runtime deps, `index.ts` does not pass positionals into ingest). `.agents/rules/e2e.rules.md` (stub — nothing to violate). e2e spawn `cli/src/index.ts`, not the `.mjs` artifact |

## Findings

### F1: hooks.json command assertions duplicated across three suites

- Gate: clean-code
- Where: e2e · `e2e/ac-f001.6-hook-esm-script.test.ts:54` and `e2e/ac-f002.4-register-wrapper-commands.test.ts:36`; also `cli/test/hooks.test.ts:40`
- Problem: the same four-event shell-string `command` check (`node .agents/hooks/index.mjs ingest cursor {event}`) is copied. F002.4 is the new AC; F001.6 was updated so the suite stays green; the unit test covers the same files per the cli plan. Extracting a shared helper would mix containers (cli unit vs e2e spawn).
- Fix: optional — leave as spec-isolated copies; a later e2e helper extract is polish
- Severity: minor
- Kind: mechanical
- Handoff: none (gate still passes)

## Accumulated decay

- `requiredEvents` (`sessionStart` / `sessionEnd` / `subagentStart` / `subagentStop`) is copied in three e2e files and `cli/test/hooks.test.ts`. Fine per spec isolation.
- Spec AC-F002.3/4 text still says “wrapper” / “path-only command”; plans and architecture already reinterpret the means as `node .agents/hooks/index.mjs ingest cursor {event}`. Later specify amend — not an implementation fail.
- e2e filenames still say wrappers (`ac-f002.3-distinct-cursor-wrappers.test.ts`, `ac-f002.4-register-wrapper-commands.test.ts`); test titles and assertions match the shell-string means.

---

> last updated: 2026-09-01T09:25:12Z
