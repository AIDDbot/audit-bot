# audit-bot

Teachable CLI workshop for the **audit-bot** domain. One container: a Node.js CLI from [AIDDbot/cli-node](https://github.com/AIDDbot/cli-node). Observe-only ingest of Cursor, Claude, and Copilot hook events into `{project}/temp/audit/`.

## Layout

| Path | Role |
| --- | --- |
| `cli/` | Node CLI (Bun + TypeScript). Command: `ingest` |
| `.agents/` | AIDD skills and commands |
| `docs/` | Architecture and specs |
| `e2e/` | Spawn tests (not a product container) |

No back, front, or db containers. Package `name`/`bin` remain `cli-node`.

## Quick start

Install [Bun](https://bun.com/docs/installation) 1.4+, then:

```bash
cd cli
bun install
bun run build    # → ../.agents/hooks/index.mjs (harness entry)
bun run test
bun lint
```

Omitted argv (including `bun start`) writes usage to stderr and exits 1. Harnesses invoke `node .agents/hooks/index.mjs ingest …`. Rebuild after `cli/src` changes. There is no HTTP port.

## Tool stack

Inferred from `cli/package.json` (not invented):

- TypeScript 7, Node ≥ 24, Bun ≥ 1.4.0, Oxlint

## License

MIT. See [LICENSE](./LICENSE).
