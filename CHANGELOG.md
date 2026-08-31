# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.4.1] - 2026-08-31

### Added

- Harness entry `.agents/hooks/index.mjs` (bun ESM bundle from `cd cli && bun run build`).
- Standalone binaries via `bun run compile` (this OS) and `bun run compile:all` (Windows/Linux/macOS x64+arm64) under `{repo}/dist/` (gitignored; no Node/Bun on the target).

### Changed

- Project hooks invoke `node .agents/hooks/index.mjs ingest …` instead of `cli/src/index.ts`. Cursor uses `.cursor/hooks/ingest.cmd` so Windows does not take only the first token of the command.

### Fixed

- Ingest decodes UTF-16 and double-encoded JSON stdin so Windows PowerShell hook pipes still record events.
- Project root resolves Git-Bash-style `/C:/…` paths on Windows.
- Claude project hooks are at `.claude/settings.json` (Claude Code does not load `_settings.json`).

### Removed

## [0.4.0] - 2026-08-31

### Added

### Changed

- Omitted argv and any command that is not ingest write usage to stderr and exit 1. Usage names ingest (`usage: cli-node ingest {harness} [hookEventHint]`).

### Fixed

### Removed

- Health tracer: `health` and omitted argv no longer print “the app is up and running”. Invoking `health` is treated as unknown argv.

## [0.3.0] - 2026-08-31

### Added

- Observe-only ingest for Cursor, Claude Code, and GitHub Copilot hook events: `node cli/src/index.ts ingest {harness} {hint}` reads one stdin JSON object and appends one Event line to `{project}/temp/audit/events.jsonl`.
- Project-level hook registration at `.cursor/hooks.json`, `.claude/settings.json`, and `.github/hooks/audit-ingest.json` for session start/end, prompt submit, and stop.
- Ingest always exits 0 with no stdout so enabled hooks never block or mutate the agent loop. Empty payload keys are omitted from stored events.

### Changed

### Fixed

### Removed
