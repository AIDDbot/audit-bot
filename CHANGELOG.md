# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.3.0] - 2026-08-31

### Added

- Observe-only ingest for Cursor, Claude Code, and GitHub Copilot hook events: `node cli/src/index.ts ingest {harness} {hint}` reads one stdin JSON object and appends one Event line to `{project}/temp/audit/events.jsonl`.
- Project-level hook registration at `.cursor/hooks.json`, `.claude/settings.json`, and `.github/hooks/audit-ingest.json` for session start/end, prompt submit, and stop.
- Ingest always exits 0 with no stdout so enabled hooks never block or mutate the agent loop. Empty payload keys are omitted from stored events.

### Changed

### Fixed

### Removed
