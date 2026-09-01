# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.5.0] - 2026-09-01

### Added

- Observe-only Cursor hook ingest: `node cli/src/index.ts ingest` (harness entry `node .agents/hooks/index.mjs ingest`) reads one JSON object from stdin and always exits 0 with no stdout.
- Daily Event log `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl` — one verbatim JSON object per line (no field overlay, omit-empty, or hook-type filter).
- Daily Session index `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json` — JSON array of distinct session identifiers (`session_id`, then `conversation_id`, then `parent_conversation_id`); payloads with no identifier still log the event and leave the index unchanged.
- Concurrent-safe persist via `ingest.lock` (exclusive create, retry, stale unlock).
- Project Cursor hooks (`.cursor/hooks.json`) for `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` only.

### Changed

- CLI command surface is `ingest` only. Omitted or unknown argv writes `usage: cli-node ingest` to stderr and exits 1.

### Fixed

### Removed

---

> last updated: 2026-09-01T07:40:21Z
