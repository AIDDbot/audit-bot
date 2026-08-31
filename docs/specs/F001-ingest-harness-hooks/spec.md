---
id: F001
slug: ingest-harness-hooks
title: Ingest harness hook events
kind: functional
category: ingest
tags: [hooks, ingest, cursor, claude, copilot]
status: released
created: 2026-08-31
released-version: 0.4.0
---
# F001 — Ingest harness hook events

## Problem definition

Cursor, Claude Code, and GitHub Copilot each emit hook events (session start/end, prompts, durations) over stdin JSON. Developers need one local audit log. The CLI still exposes a scaffold health tracer (`health` / omitted argv → “the app is up and running”) that is not the product — it was only a tracer bullet for the cli-node archetype.

### User Stories

- As a developer, I want to **record hook events from Cursor, Claude Code, and GitHub Copilot into one local log** so that I can audit agent sessions without switching tools.
- As a developer on Windows or Linux, I want **the same ingest to work on my OS** so that path and shell differences do not drop events.
- As a developer, I want **ingest to observe only** so that leaving hooks enabled never blocks, mutates, or fails the agent loop.
- As a developer, I want **the CLI surface to be ingest, not a health tracer** so that omitted argv and leftover `health` are not treated as a product command.

### Business Rules

- An ingest must **accept command-hook events from Cursor, Claude Code, and GitHub Copilot**.
- An ingest must **read one JSON object from stdin** (the harness hook protocol).
- An Event is always **one JSON object on its own line** in a JSONL file under the project's `temp/audit` folder (not the OS global temp directory).
- An Event must **identify the harness**, record **when it was received** (ISO 8601), record the **hook event name**, and **keep the stdin payload fields that still have a value**.
- An Event must **omit keys whose values are null or empty** (`""`, `[]`, `{}`), including nested keys. After nested omit, a parent that is then empty is omitted too. `0`, `false`, and non-empty strings stay.
- An Event must **not be a torn or concatenated line** when hooks run concurrently.
- A hook invocation must **exit 0**, finish quickly, and **not write stdout that the harness would treat as a decision, mutation, or extra context**.
- A hook invocation must **not exit 2** (Cursor and Claude treat 2 as block; Copilot treats 2 as deny on `preToolUse` / `permissionRequest`).
- A hook invocation must **not exit non-zero** (Copilot `preToolUse` command hooks are fail-closed: any non-timeout error denies the tool).
- An ingest failure (invalid stdin, missing project root, disk error) must **still leave the agent loop unblocked** (exit 0, no blocking/mutating stdout).
- An ingest must **resolve the project workspace** (Cursor `CURSOR_PROJECT_DIR`, Claude `CLAUDE_PROJECT_DIR`, Copilot/Claude `cwd`, Cursor `workspace_roots`) and write under **that** project's `temp/audit`.
- An ingest must **work on Windows and Linux** (native path separators; hook command is a real executable such as `node`, not a Unix-only script as the only entry; Copilot honors `bash` on Unix, `powershell` on Windows, and `command` as cross-platform fallback).
- A project must **register ingest at project-level hook config** so the harness invokes it:

  | Harness | Project config | Notes |
  | --- | --- | --- |
  | Cursor | `.cursor/hooks.json` | Project hooks run from the **repo root**. User `~/.cursor/hooks.json` is out of this spec. Cloud agents load project hooks only; they do **not** load user hooks; `sessionStart` / `sessionEnd` do **not** fire in cloud. |
  | Claude Code | `.claude/settings.json` | User `~/.claude/settings.json` is out of this spec. Cloud sessions do **not** read local user settings. Windows: Git Bash or PowerShell; exec form needs a real `.exe` (e.g. `node` + script args). |
  | GitHub Copilot | `.github/hooks/*.json` | Loaded by Copilot CLI **and** cloud agent. User `%USERPROFILE%\.copilot\hooks\` / `~/.copilot/hooks/` is out of this spec. Cloud agent is ephemeral Linux: files under `/workspace` are discarded when the job ends. |

- A project registration must **subscribe at least** to session start/end, prompt submit, and stop (duration-bearing where the harness provides it):

  | Kind | Cursor | Claude Code | Copilot CLI |
  | --- | --- | --- | --- |
  | Session start | `sessionStart` | `SessionStart` | `sessionStart` |
  | Session end | `sessionEnd` (`duration_ms`) | `SessionEnd` | `sessionEnd` |
  | Prompt | `beforeSubmitPrompt` | `UserPromptSubmit` | `userPromptSubmitted` |
  | Turn stop | `stop` | `Stop` | `agentStop` |

  Copilot PascalCase names (`SessionStart`, `UserPromptSubmit`, …) are the VS Code-compatible alias; this spec uses the CLI camelCase names. Extra harness events may be subscribed later; if they are, the same observe-only, omit-empty, and JSONL rules apply.

- The CLI must **not** offer a health or “up and running” invocation.
- A CLI invocation with omitted arguments must **write usage to stderr and exit 1** (it is not ingest; ingest requires a harness).
- A CLI invocation of `health`, or any argv that is not ingest, must **write usage to stderr and exit 1**.
- Usage must **name ingest** and must **not name health**.

### Out of scope

- Tool-use hooks (`preToolUse`, `postToolUse`, `postToolUseFailure`, Copilot `permissionRequest`, and harness equivalents).
- Reports, aggregation, dashboards, or query commands.
- Blocking, denying, asking, injecting context, rewriting prompts/tool input, or `followup_message` loops.
- PII/secret redaction (payloads may include prompts, paths, emails).
- Durable storage for Copilot cloud agent (sandbox filesystem is discarded).
- User-global, Enterprise/MDM/policy, plugin, and prompt/HTTP/MCP hook handlers.
- Cursor Tab hooks (`beforeTabFileRead`, `afterTabFileEdit`) and `workspaceOpen`.
- Renaming package/`bin` `cli-node`.
- Making ingest the default command when argv is omitted (ingest still requires a harness).

## Solution overview

### Data Model

From [`model.schema.md`](../../model/model.schema.md): **AgentHost** (Cursor, Claude Code, Copilot) hosts **Session**; Session emits **Event**. This feature persists Event only. **Report** is unused. There is no Health entity.

An Event is one JSONL record: harness identity, received-at timestamp, hook event name, stdin payload after omit of null/empty keys. Session identity is whatever the payload already carries (`conversation_id` / `session_id` / `sessionId`).

### CLI

- Accept a hook-ingest invocation that reads stdin JSON from a harness and appends one Event under `{project}/temp/audit/`.
- Do not offer a health invocation. Omitted argv, `health`, and any argv that is not ingest write usage to stderr and exit 1. Usage names ingest and does not name health.
- Supply project-level hook registration for the three harnesses so they call ingest on the required events.
- On Windows and Linux, the harness can invoke ingest without a Unix-only wrapper as the only path.
- Ingest never blocks or mutates the agent; failures are swallowed from the harness's point of view.

## Verification Criteria

- [x] **AC-F001.1** — WHEN a supported harness invokes ingest with a JSON object on stdin, THE SYSTEM SHALL append exactly one JSON object as a new line under the project's `temp/audit` folder.
- [x] **AC-F001.2** — THE SYSTEM SHALL ingest required events from Cursor, Claude Code, and GitHub Copilot (session start/end, prompt submit, stop).
- [x] **AC-F001.3** — THE SYSTEM SHALL write audit files only under the project-local `temp/audit` path and SHALL NOT use the OS global temp directory (`/tmp`, `%TEMP%` as the audit root).
- [x] **AC-F001.4** — WHEN ingest completes — success or failure — THE SYSTEM SHALL exit with code 0 and SHALL NOT emit stdout that Cursor, Claude Code, or Copilot would interpret as deny, block, ask, continue-false, prompt rewrite, extra context, or follow-up.
- [x] **AC-F001.5** — WHEN stdin is not a JSON object, or the audit file cannot be written, THE SYSTEM SHALL leave the JSONL file free of partial/invalid lines and SHALL still satisfy AC-F001.4.
- [x] **AC-F001.6** — THE SYSTEM SHALL include in each stored Event the harness identity, an ISO 8601 received-at timestamp, the hook event name, and the stdin payload after omit of null/empty keys.
- [x] **AC-F001.7** — WHEN ingest runs on Windows and when it runs on Linux, THE SYSTEM SHALL resolve project paths and append the same JSONL shape (native separators in filesystem paths are allowed).
- [x] **AC-F001.8** — THE SYSTEM SHALL provide project-level hook configuration at `.cursor/hooks.json`, `.claude/settings.json`, and `.github/hooks/` so each harness invokes ingest for the required events.
- [x] **AC-F001.9** — WHEN two ingest invocations append at the same time, THE SYSTEM SHALL persist two complete JSONL lines (no interleaved fragments).
- [x] **AC-F001.10** — WHEN a stored Event or nested payload object has a key whose value is null, `""`, `[]`, or `{}`, THE SYSTEM SHALL omit that key. `0` and `false` SHALL remain.
- [x] **AC-F001.11** — WHEN the CLI is invoked with omitted argv, with `health`, or with any argv that is not ingest, THE SYSTEM SHALL write usage to stderr, SHALL exit with code 1, and SHALL NOT print an “up and running” or other health message.
- [x] **AC-F001.12** — THE SYSTEM SHALL name ingest in usage and SHALL NOT name health as a supported command.

---

> last updated: 2026-08-31T19:19:40Z
