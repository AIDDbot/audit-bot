---
description: Code rules for the cli container of audit-bot
paths: "cli/**"
glob: "cli/**"
applyTo: "cli/**"
---
# CLI code rules — audit-bot

## Summary

Thin ESM TypeScript: `src/index.ts` reads `process.argv` and stdin (`readFileSync(0)`), sets `exitCode`, and writes stderr for non-ingest. Other `src/*.ts` export functions (ingest, event, project, store) and `usageMessage`. Keep that split. Toolchain-enforced rules stay in `tsconfig*.json` and `.oxlint.json`.

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Folders / Files | lowercase, short names; tests `*.test.ts` under `test/` | `src/event.ts`, `test/event.test.ts` |
| Types / Classes | exported aliases when a helper's input is shared; PascalCase | `IngestInput`, `Harness` |
| Functions / Variables | camelCase | `ingestHook`, `omitEmpty`, `appendEvent` |
| Constants | camelCase | `usageMessage`, `lockWaitMs`, `command` |

## Artifact roles

| Role | Structural rule (one line) |
|------|----------------------------|
| entry | `src/index.ts` — argv, stdin, stdout/stderr, `exitCode`; no business strings |
| lib | `src/*.ts` except index — exported functions; Node builtins only |
| test | `test/*.test.ts` — `node:test` + `node:assert`; import from `../src/…ts` |

## Canonical example

> The cleanest representative unit for this container — copy its shape.

```ts
export function omitEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return omitArray(value);
  if (isRecord(value)) return omitRecord(value);
  return value;
}
```

## Conventions

- **Wiring**: static ESM imports; no DI, no barrel files. `ingestHook` accepts `IngestInput`; parse/resolve helpers use sequential guards, not compound AND/OR/ternary.
- **Errors**: unknown command (including omitted argv) → `console.error` usage + `process.exitCode = 1`; do not throw for user argv. Ingest path always `exitCode` 0; `ingestHook` never throws (`ingestOrThrow` may throw; the catch swallows it).
- **Testing**: `cli/test/*.test.ts` cover exported lib functions and `usageMessage`. Entry argv/stdin/`exitCode` is covered by repo-root `e2e/*.test.ts` spawn of `cli/src/index.ts` (not `.agents/hooks/index.mjs`).
- **Build**: after changing `cli/src/`, run `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source. That file is the harness entry. Do not emit to `cli/dist/`. Do not use `tsc` as the product build. Standalone binaries: `bun run compile` (this OS) or `bun run compile:all` (cross-compile) → `{repo}/dist/` (gitignored).
- **Avoid**: runtime npm dependencies; HTTP servers/ports; report/query commands without a spec; renaming `bin`/`name` without a spec (still `cli-node`); a health / “up and running” command.

---

> last updated: 2026-08-31T20:56:34Z
