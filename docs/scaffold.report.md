# Scaffold report

**Status:** green  
**When:** 2026-08-31T17:59:43Z

## Profile

`cli` — Node CLI from [AIDDbot/cli-node](https://github.com/AIDDbot/cli-node). No back, front, or e2e.

## Domain

Custom **audit-bot**. Not in the sample catalog (`astro-bookings`, `acorn-bank`, `adventure-bazaar`, `alpine-basecamp`); no fetch to `docs/domain/`.

## Pieces and paths

| Piece | Source | Path | Notes |
| --- | --- | --- | --- |
| CLI (node) | `AIDDbot/cli-node` | `cli/` | tiged by `aiddbot-scaffold` |
| AIDD overlay | already present | `.agents/`, `.cursor/`, `.claude/`, `.github/` | 93 skip-same, 0 create, 0 conflict |
| Domain sample | — | — | skipped (custom slug) |

Fetch command:

```bash
npx --allow-git=all -p github:AIDDbot/AIDDbot aiddbot-scaffold --domain audit-bot --cli node
```

No `--dry-run`: dest had no existing containers.

## Reconciliation

### Root files

Wrote `README.md`, `LICENSE` (MIT, same text as `cli/LICENSE`), and `.gitignore` (`node_modules`, `dist`, `temp` — same as `cli/.gitignore`).

### Ports and URLs

None. The CLI prints a health line to stdout; it does not bind a port or call an HTTP URL.

### Toolchain

Inferred from `cli/package.json` and `cli/bun.lock`:

- Package manager / runner: Bun 1.4.0 (`packageManager: bun@1.4.0`)
- Runtime: Node ≥ 24 (verified Node v26.4.0)
- Language: TypeScript 7
- Lint: Oxlint
- Tests: Node test runner (`node --test`)

No root toolchain file. Only one container, so shared-toolchain promotion does not apply; the lockfile and scripts stay in `cli/`.

No unambiguous code fixes. Package and bin remain `cli-node` as landed.

## Tracer

Install in the fetched folder and run its unit tests.

| Step | Command | Result |
| --- | --- | --- |
| Install | `cd cli && bun install` | 8 packages, ~902 ms |
| Smoke | `bun start` | `the app is up and running (2026-08-31T17:59:43.218Z)` |
| Unit tests | `bun run test` | 1 suite, 1 pass, 0 fail |

## Pending decisions

- Rename `cli-node` (package `name` and `bin`) to `audit-bot`, or keep the archetype identity.
- Add Stryker and a CRAP analysis tool (listed as pending in `cli/README.md`).
- `{Product_Folder}` for later architecture (`docs/` vs `.product/`) — for `/architect-map`.

## Status

**green** — fetch, root files, install, health, and unit tests all succeeded.
