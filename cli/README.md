# [cli-node](https://github.com/AIDDbot/cli-node)

Archetype with boilerplate code for a CLI with node

## Quick start

> [!IMPORTANT]
> this projects uses `bun` as a package manager and runner.

1. Install bun: the fastest tooling manager for Node.js projects.
```bash
# Install Bun 
# (Windows PowerShell)
powershell -c "irm bun.com/install.ps1 | iex"
# (macOS/Linux)
curl -fsSL https://bun.com/install | bash -s
# Verify installation
bun --version
# Upgrade Bun to the latest stable version
bun upgrade --stable
```

2. Install dependencies and run the tests
```bash
bun install
bun start       # runs the CLI (omitted argv → usage, exit 1)
bun run build   # writes ../.agents/hooks/index.mjs (harness entry; rebuild after src changes)
bun run test    # runs the unit tests
bun dev         # runs in watch mode for development
bun lint        # runs the linter
```

## Tool stack

- [TypeScript7](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) : typed superset of JavaScript that compiles to plain JavaScript.
- [Node26](https://nodejs.org/es/blog/release/v26.0.0/) : JavaScript runtime built on Chrome's V8 JavaScript engine.
- [Bun 1.4.0](https://bun.com/docs/installation) : JavaScript runtime and package manager used by this project.
- [Oxlint](https://oxc.rs/docs/guide/usage/linter) : high-performance linter for  TypeScript 

### Pending: 
- [Stryker](https://stryker-mutator.io/docs/stryker-js/introduction/) : mutation testing framework for JavaScript and TypeScript.
- Some CRAP analysis tool for TypeScript.
---

-**Author**

- [Alberto Basalo](https://albertobasalo.dev)
- [GitHub](https://github.com/AIDDbot/AIDDbot)
- [A.I. Code Academy](https://aicode.academy) (ES)
