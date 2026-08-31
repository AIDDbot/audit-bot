---
description: Code rules for the cli container of audit-bot
paths: "cli/**"
glob: "cli/**"
applyTo: "cli/**"
---
# CLI code rules — audit-bot

## Summary

Thin ESM TypeScript: `src/index.ts` reads `process.argv` and prints; `src/lib.ts` exports functions. Keep that split. Toolchain-enforced rules stay in `tsconfig*.json` and `.oxlint.json`.

## Naming

| Element | Convention | Example |
|---------|------------|---------|
| Folders / Files | lowercase, short names; tests `*.test.ts` under `test/` | `src/lib.ts`, `test/lib.test.ts` |
| Types / Classes | none in tree; PascalCase if added | — |
| Functions / Variables | camelCase | `getHealthMessage`, `currentDateTime` |
| Constants | none in tree; camelCase locals | `command` |

## Artifact roles

| Role | Structural rule (one line) |
|------|----------------------------|
| entry | `src/index.ts` — argv, stdout/stderr, `exitCode`; no business strings |
| lib | `src/*.ts` except index — exported functions; Node builtins only |
| test | `test/*.test.ts` — `node:test` + `node:assert`; import from `../src/…ts` |

## Canonical example

> The cleanest representative unit for this container — copy its shape.

```ts
function currentDateTime(): Date {
  return new Date();
}

export function getHealthMessage(): string {
  return `the app is up and running (${currentDateTime().toISOString()})`;
}
```

## Conventions

- **Wiring**: static ESM imports; no DI, no barrel files.
- **Errors**: unknown command → `console.error` usage + `process.exitCode = 1`; do not throw for user argv.
- **Testing**: `cli/test/*.test.ts`; cover exported lib functions. Entry argv is untested today.
- **Avoid**: runtime npm dependencies; HTTP servers/ports; hook ingest without a spec; renaming `bin`/`name` without a spec (still `cli-node`).

---

> last updated: 2026-08-31T18:05:15Z
