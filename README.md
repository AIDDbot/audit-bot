# audit-bot

Teachable CLI workshop for the **audit-bot** domain. One container: a Node.js CLI from [AIDDbot/cli-node](https://github.com/AIDDbot/cli-node).

## Layout

| Path | Role |
| --- | --- |
| `cli/` | Node CLI (Bun + TypeScript). Tracer: `health` |
| `.agents/` | AIDD skills and commands |
| `docs/` | Scaffold report and later architecture |

No back, front, or e2e containers.

## Quick start

Install [Bun](https://bun.com/docs/installation) 1.4+, then:

```bash
cd cli
bun install
bun start       # prints the health message
bun run test    # unit tests (the tracer)
bun lint
```

## Tracer

`bun start` (or `bun src/index.ts health`) prints:

```text
the app is up and running (<ISO-8601 datetime>)
```

Unit tests in `cli/test/lib.test.ts` assert that line. There is no HTTP port.

## Tool stack

Inferred from `cli/package.json` (not invented):

- TypeScript 7, Node ≥ 24, Bun ≥ 1.4.0, Oxlint

## License

MIT. See [LICENSE](./LICENSE).
