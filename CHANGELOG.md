# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.13.2] - 2026-09-01

### Added

### Changed

- Agent-stop YAML header tests/criteria now five fields including integer `turn`; product already emitted this since 0.12.0.

### Fixed

### Removed

## [0.13.1] - 2026-09-01

### Added

### Changed

- Prompt YAML header tests/criteria now five fields including integer `turn`; product already emitted this since 0.12.0.

### Fixed

### Removed

## [0.13.0] - 2026-09-01

### Added

### Changed

- Session Markdown report groups events into per-turn subsections (`## Turn {n}`, duration, optional Prompt line, then Time/Event/Details). Overview and counts stay session-level. YAML ingest still writes `turn: 0`.

### Fixed

### Removed

## [0.12.0] - 2026-09-01

### Added

### Changed

- Session YAML documents now include integer `turn` as the fifth header field (`session_id`, `source_harness`, `source_event`, `timestamp`, `turn`). Event log stays verbatim. Numbering is F008.

### Fixed

### Removed

## [0.11.0] - 2026-09-01

### Added

- Copilot subagent-start and subagent-stop YAML (and report Details) include `agent_display_name` when `agentDisplayName` is present; Cursor and Claude Code omit it; `agent_type` mapping unchanged.

### Changed

### Fixed

### Removed

## [0.10.0] - 2026-09-01

### Added

- Cursor registers `stop` (`node .agents/hooks/index.mjs ingest cursor stop`); subagent-start YAML/report Details include `task` (Cursor only; Copilot and Claude omit).

### Changed

- Session Markdown report is written after every YAML-appending ingest (not only `sessionEnd`); duration is first→last YAML timestamps regardless of event type; overview `source_harness` is the last document. Six Cursor events in `.cursor/hooks.json`.

### Fixed

### Removed

## [0.9.0] - 2026-09-01

### Added

- Cursor registers `beforeSubmitPrompt` (`node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`); prompt YAML is the F003 header plus `prompt` when present.

### Changed

- Session YAML (and thus F004 Details) omit `transcript_path` for subagent start, subagent stop, and agent stop; JSONL stays verbatim. Agent-stop YAML is header-only. Five Cursor events in `.cursor/hooks.json`.

### Fixed

### Removed

## [0.8.1] - 2026-09-01

### Added

- `/clean-implementation` command: whole-codebase CRAP, coverage, and lint scan.

### Changed

- CLI `bun lint` loads `cli/.oxlint.json` and checks `src` and `scripts` (no `--fix`).
- Ingest stdin decode splits BOM/endian detection from decode so each helper stays within complexity 8 (UTF-16 LE/BE, UTF-8 BOM, plain UTF-8).

### Fixed

### Removed

- `/craftsman-clean` command (replaced by `/clean-implementation`).

## [0.8.0] - 2026-09-01

### Added

- Per-session Markdown report on session-end ingest: `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md` — overview (`session_id`, `source_harness`, start, end, duration `HH:MM:SS`), event-count summary, and a chronological table derived only from that session’s YAML. Written in the same observe-only ingest invocation; overwritten on a later session-end the same day.

### Changed

### Fixed

### Removed

## [0.7.0] - 2026-09-01

### Added

- Per-session normalized YAML log on ingest: `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml` — append-only multi-document YAML with header `session_id`, `source_harness`, `source_event`, and `timestamp`, then mapped common fields. Source positionals feed the YAML header only; the Event log stays verbatim.

### Changed

### Fixed

### Removed

## [0.6.1] - 2026-09-01

### Added

### Changed

- Cursor `.cursor/hooks.json` invokes the ingest artifact directly: `node .agents/hooks/index.mjs ingest cursor {event}` for each of `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows.

### Fixed

### Removed

- Per-event `.cursor/hooks/{event}.cmd` wrappers. Source harness and event stay on the `command` string; no path-only `.cmd` indirection.

## [0.6.0] - 2026-09-01

### Added

- Optional ingest source positionals: `ingest {harness} {event}` (Cursor wrappers pass `cursor` and that hook’s event name). Persistence stays F001: verbatim Event log, Session index, exit 0. Positionals are not written onto the stored line. Omitted or only-one positional still persists; extra tokens after `ingest` are not an unknown command.

### Changed

- Each Cursor event (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`) has a distinct polyglot wrapper `.cursor/hooks/{event}.cmd` that runs `node .agents/hooks/index.mjs ingest cursor {event}`. `.cursor/hooks.json` `command` is that wrapper path only (no extra tokens).

### Fixed

- Cursor Windows ingest: stdin decode accepts UTF-16 / UTF-8 BOM / double-encoded JSON from PowerShell pipes.

### Removed

- Shared `.cursor/hooks/ingest.cmd` (replaced by the four per-event wrappers).

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

> last updated: 2026-09-01T21:52:01Z
