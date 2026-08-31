# System architecture — audit-bot

## Overview

audit-bot is a CLI that ingests agent-hook events (session start/end, prompts, duration) from Cursor, Claude, and Copilot into a project-local JSONL log. The repository holds one product container: a Node.js CLI scaffolded from [AIDDbot/cli-node](https://github.com/AIDDbot/cli-node), shipped as `cli-node` 0.4.0 (F001 released). There is no health tracer. Ingest is observe-only: exit 0, no blocking/mutating stdout. Reports are not implemented. There is no back, front, or db container. A thin `e2e/` folder of spawn tests lives at the repo root (not a product container). Package `name` and `bin` remain `cli-node` (pending rename). Intended compile output is ESM `.js` for Node ≥ 24 or Bun (`cli/tsconfig.build.json` emits `dist/`; `"type": "module"`). Project-level hook configs live at the repo root and invoke `node cli/src/index.ts`, not `dist/`. A root `package.json` (oxlint-tsgolint only) is not a container.

---

## Containers diagram

```mermaid
C4Container
  title audit-bot Containers

  Person(dev, "Developer")
  System_Ext(hosts, "Agent hosts")

  Container_Boundary(system_id, "audit-bot") {
    Container(cli, "CLI")
  }

  Rel(dev, cli, "Runs")
  Rel(hosts, cli, "Hooks")
```

## cli

- **Folder**: `cli/`
- **Tier**: `cli`
- **Archetype**: TypeScript — Node CLI (Bun 1.4+, Oxlint, Node ≥ 24)
- **Detail**: [`cli.arch.md`](./cli.arch.md)

### Scripts
```bash
cd cli
bun start              # bun src/index.ts — omitted argv → usage, exit 1
bun dev                # watch mode
bun run typecheck      # tsc -p tsconfig.json --noEmit
bun run build          # tsc -p tsconfig.build.json → dist/
bun run test           # node --test test/*.test.ts
bun lint               # oxlint --fix --format=agent --quiet
```

From repo root: `node --test e2e/*.test.ts` (Node 26 on Windows does not treat a directory name as a test glob).

---

> last updated: 2026-08-31T19:59:36Z
