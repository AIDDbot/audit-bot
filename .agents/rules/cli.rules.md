---
description: Code rules for the cli container of audit-bot
paths: "cli/**"
glob: "cli/**"
applyTo: "cli/**"
---
# CLI code rules — audit-bot

## Summary

Thin ESM TypeScript: `src/index.ts` reads `process.argv` and prints; other `src/*.ts` export functions (ingest, event, project, store) and `usageMessage`. Keep that split. Toolchain-enforced rules stay in `tsconfig*.json` and `.oxlint.json`.

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Folders / Files | lowercase, short names; tests `*.test.ts` under `test/` | `src/event.ts`, `test/event.test.ts` |
| Types / Classes | none in tree; PascalCase if added | — |
| Functions / Variables | camelCase | `ingestHook`, `omitEmpty`, `appendEvent` |
| Constants | camelCase | `usageMessage`, `lockWaitMs`, `command` |

## Artifact roles

| Role | Structural rule (one line) |
|------|----------------------------|
| entry | `src/index.ts` — argv, stdout/stderr, `exitCode`; no business strings |
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

- **Wiring**: static ESM imports; no DI, no barrel files.
- **Errors**: unknown command (including omitted argv) → `console.error` usage + `process.exitCode = 1`; do not throw for user argv. Ingest failures stay exit 0.
- **Testing**: `cli/test/*.test.ts`; cover exported lib functions. Entry argv is untested today.
- **Avoid**: runtime npm dependencies; HTTP servers/ports; report/query commands without a spec; renaming `bin`/`name` without a spec (still `cli-node`); a health / “up and running” command.

---

> last updated: 2026-08-31T19:19:40Z
