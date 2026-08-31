---
spec-kind: functional
container: e2e
---
# F001-ingest-harness-hooks - e2e

## Specification

User-facing flow under test: a harness hook invokes the CLI ingest command with one JSON object on stdin; the CLI appends one Event JSONL line under the resolved project's `temp/audit/` and exits observe-only (code 0, no blocking/mutating stdout). Registration files at the repo root tell Cursor, Claude Code, and GitHub Copilot which events to fire. A non-ingest CLI invocation (omitted argv, leftover `health`, or any argv that is not ingest) writes usage to stderr, exits 1, and does not print a health line. Usage names ingest and does not name health.

This is a functional-spec extra run. Architecture currently has **no e2e product container** — do not invent a new service and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** the CLI. They must not import `cli/src/**` as the system under test.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; [`cli.arch.md`](../../arch/cli.arch.md) is the only product container. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding:

- AGENTS.md verification stays `cd cli && bun run test` for CLI units; these scenarios are a separate runner from the **repo root**: `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob)
- Spawn ingest: `node cli/src/index.ts ingest {harness} {optionalHookEventHint}` with stdin JSON (same argv as the cli plan). Always exit 0 on ingest
- Spawn non-ingest: `node cli/src/index.ts` with omitted argv, with `health`, or with any other non-ingest argv. Expect usage on stderr, `exitCode` 1, no “up and running” stdout
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- No runtime deps; Node builtins (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:os`, `node:assert`). Fixture project roots under `{repo}/temp/e2e/` (root `.gitignore` already has `temp`) so tests never write the real `{repo}/temp/audit/events.jsonl`
- Do not import `cli/src/**` as SUT

### Data model

From [`model.schema.md`](../../model/model.schema.md): **AgentHost** (Cursor, Claude Code, Copilot) hosts **Session**; Session emits **Event**. This feature persists Event only. **Report** is unused. Do not invent a Session entity file.

An **Event** is one JSON object on its own line (JSONL) under `{projectRoot}/temp/audit/`:

- `harness` — `"cursor"` | `"claude"` | `"copilot"` (AgentHost identity)
- `receivedAt` — ISO 8601 timestamp when ingest received the event
- `hookEvent` — the hook event name from the harness (e.g. `sessionStart`, `SessionStart`, `beforeSubmitPrompt`, `UserPromptSubmit`, `userPromptSubmitted`, `stop`, `Stop`, `agentStop`, `sessionEnd`, `SessionEnd`)
- remaining keys — stdin payload fields that still have a value after omit of null/empty (`""`, `[]`, `{}`), including nested keys; empty parents omitted after nested omit; `0` and `false` stay

Session identity is whatever the payload already carries (`conversation_id` / `session_id` / `sessionId`). Do not invent a Session entity file. Report is unused.

Store file: `{projectRoot}/temp/audit/events.jsonl` (not OS temp, not `cli/temp`). Root `.gitignore` already has `temp`.

Project root resolution order (from spec): Cursor `CURSOR_PROJECT_DIR`, Claude `CLAUDE_PROJECT_DIR`, Copilot/Claude `cwd` field, Cursor `workspace_roots`. Write under **that** project's `temp/audit`.

`harness`, `receivedAt`, and `hookEvent` are written last so they are not overwritten by payload keys of the same name.

`hookEvent` value: non-empty string `hook_event_name` from the payload if present; else the optional argv hint from the hook command; else ingest failure (no line). Copilot CLI camelCase payloads may omit `hook_event_name`.

Hook events (MVP; tool-use is out of scope):

| Kind | Cursor | Claude Code | Copilot CLI |
| --- | --- | --- | --- |
| Session start | `sessionStart` | `SessionStart` | `sessionStart` |
| Session end | `sessionEnd` (`duration_ms`) | `SessionEnd` | `sessionEnd` |
| Prompt | `beforeSubmitPrompt` | `UserPromptSubmit` | `userPromptSubmitted` |
| Turn stop | `stop` | `Stop` | `agentStop` |

### Acceptance criteria under test

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
- [ ] **AC-F001.11** — WHEN the CLI is invoked with omitted argv, with `health`, or with any argv that is not ingest, THE SYSTEM SHALL write usage to stderr, SHALL exit with code 1, and SHALL NOT print an “up and running” or other health message.
- [ ] **AC-F001.12** — THE SYSTEM SHALL name ingest in usage and SHALL NOT name health as a supported command.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F001.1 — Append one JSONL line on ingest | keep | Already implemented |
| AC-F001.2 — Required events from Cursor, Claude, Copilot | keep | Already implemented |
| AC-F001.3 — Audit root is project-local temp/audit | keep | Already implemented |
| AC-F001.4 — Observe-only exit and stdout | keep | Already implemented |
| AC-F001.5 — Invalid stdin or write failure leaves JSONL intact | keep | Already implemented |
| AC-F001.6 — Stored Event fields | keep | Already implemented |
| AC-F001.7 — Same JSONL shape on Windows and Linux | keep | Already implemented |
| AC-F001.8 — Project-level hook registration | keep | Already implemented |
| AC-F001.9 — Concurrent appends persist two complete lines | keep | Already implemented |
| AC-F001.10 — Omit null/empty keys; keep 0 and false | keep | Already implemented |
| Note: Health argv must remain unchanged; this plan does not re-test health | drop | Health is not a product command; this amend tests usage instead |
| AC-F001.11 — Non-ingest argv writes usage, exits 1, no health stdout | — | New |
| AC-F001.12 — Usage names ingest, not health | — | New |

## Implementation Steps

### Step 1: AC-F001.1 — Append one JSONL line on ingest
Harness → spawn CLI ingest with a JSON object on stdin → exactly one new JSON object line under the fixture project's `temp/audit`. Verifies AC-F001.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.1-append-one-line.test.ts`
- [x] Arrange: isolated fixture project root under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` (or `CLAUDE_PROJECT_DIR`) pointing at it; no `events.jsonl` yet; stdin one JSON object (e.g. Cursor `sessionStart` with `hook_event_name`)
- [x] Act: spawn `node cli/src/index.ts ingest cursor sessionStart` with that stdin (helper in `e2e/spawn.ts`; do not import `cli/src/**`)
- [x] Assert: `{projectRoot}/temp/audit/events.jsonl` exists; exactly one line; that line parses as one JSON object (AC-F001.1)

---

### Step 2: AC-F001.2 — Required events from Cursor, Claude, Copilot
One scenario covering the MVP table (three harnesses × session start/end, prompt submit, stop). Verifies AC-F001.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.2-required-harness-events.test.ts`
- [x] Arrange: isolated fixture project; twelve cases — Cursor `sessionStart` / `sessionEnd` / `beforeSubmitPrompt` / `stop`; Claude `SessionStart` / `SessionEnd` / `UserPromptSubmit` / `Stop`; Copilot `sessionStart` / `sessionEnd` / `userPromptSubmitted` / `agentStop`; Copilot stdin may omit `hook_event_name` (argv hint supplies it); session end Cursor payload may include `duration_ms`
- [x] Act: spawn `node cli/src/index.ts ingest {harness} {event}` once per case with a JSON object on stdin
- [x] Assert: each invocation appends one parseable JSONL line whose `harness` is `"cursor"` | `"claude"` | `"copilot"` and `hookEvent` equals that case's event name (AC-F001.2)

---

### Step 3: AC-F001.3 — Audit root is project-local temp/audit
Successful ingest writes only under `{projectRoot}/temp/audit`, never using OS global temp as the audit root. Verifies AC-F001.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.3-project-local-audit.test.ts`
- [x] Arrange: fixture project **not** equal to `os.tmpdir()`; capture `os.tmpdir()` and env `TEMP` / `TMP` / `TMPDIR` (Windows `%TEMP%`, Linux `/tmp`)
- [x] Act: spawn a successful ingest with project root set via env (and a second spawn using payload `cwd` / `workspace_roots` with no Cursor/Claude project env, if useful)
- [x] Assert: store file is `{projectRoot}/temp/audit/events.jsonl`; no `events.jsonl` (and no `audit/` folder used as audit root) directly under `os.tmpdir()`, `%TEMP%`, or `/tmp`; not `cli/temp` (AC-F001.3)

---

### Step 4: AC-F001.4 — Observe-only exit and stdout
Success and failure both finish exit 0 with no harness-protocol stdout. Verifies AC-F001.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.4-observe-only-exit.test.ts`
- [x] Arrange: one fixture where ingest can succeed; one where it fails (non-JSON stdin and/or missing project root)
- [x] Act: spawn ingest for both outcomes
- [x] Assert: `exitCode === 0` (never 2, never non-zero); stdout is empty — no JSON/text a harness would treat as deny, block, ask, `continue: false`, prompt rewrite, extra context, or follow-up (AC-F001.4)

---

### Step 5: AC-F001.5 — Invalid stdin or write failure leaves JSONL intact
Bad input or unwritable audit path must not tear the file, and must still satisfy AC-F001.4. Verifies AC-F001.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.5-no-partial-lines.test.ts`
- [x] Arrange: (a) stdin not a JSON object (`""`, `"not-json"`, `"[]"`, `"42"`, `"null"`, `"\"x\""`); (b) write failure — e.g. `{projectRoot}/temp` is a file so `temp/audit` cannot be created; optional seed file of one valid JSONL line to prove it is left unchanged
- [x] Act: spawn ingest for each case
- [x] Assert: no new partial/invalid JSONL line (file absent, or still only complete parseable lines); `exitCode === 0` and stdout empty as in AC-F001.4 (AC-F001.5)

---

### Step 6: AC-F001.6 — Stored Event fields
Each stored line has harness identity, ISO 8601 received-at, hook event name, and omitted payload. Verifies AC-F001.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.6-event-fields.test.ts`
- [x] Arrange: stdin JSON object with a session id field (`conversation_id` / `session_id` / `sessionId`) and at least one empty key plus one kept value; argv/payload supply `hookEvent`
- [x] Act: spawn a successful ingest
- [x] Assert: the line has `harness` one of `"cursor"` | `"claude"` | `"copilot"`; `receivedAt` matches ISO 8601; `hookEvent` is the hook event name; remaining keys are the stdin payload after omit of null/empty; overlay keys win if the payload reused those names (AC-F001.6)

---

### Step 7: AC-F001.7 — Same JSONL shape on Windows and Linux
The same test file must pass on Windows and on Linux: field shape is OS-independent; native separators only in filesystem paths. Verifies AC-F001.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.7-os-jsonl-shape.test.ts`
- [x] Arrange: fixture project; env/payload paths using this OS's native separators; spawn command is `node` plus script args (not a Unix-only wrapper as the only entry)
- [x] Act: spawn ingest on the current OS (the file is the Linux run when executed on Linux)
- [x] Assert: JSONL keys are `harness`, `receivedAt`, `hookEvent` plus payload keys — same names/types on both OS; `receivedAt` ISO 8601; no OS-specific wrapper keys; native separators allowed only in filesystem path strings (e.g. payload `cwd`), not in the Event field set (AC-F001.7)

---

### Step 8: AC-F001.8 — Project-level hook registration
E2E of registration: config files exist at harness discovery paths and subscribe to the MVP events with a `node` + script command. Verifies AC-F001.8.
- Paths:
    - `e2e/ac-f001.8-hook-config.test.ts`
- [x] Arrange: repo root as the project (read files; do not spawn ingest unless useful as a smoke)
- [x] Act: load `.cursor/hooks.json`, `.claude/settings.json`, and `.github/hooks/` (cli plan file: `.github/hooks/audit-ingest.json`)
- [x] Assert: each file exists; Cursor subscribes `sessionStart`, `sessionEnd`, `beforeSubmitPrompt`, `stop` with `node cli/src/index.ts ingest cursor {event}`; Claude hooks `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `Stop` use exec form `command: "node"` plus script args (not a `.sh` as the only entry); Copilot subscribes `sessionStart`, `sessionEnd`, `userPromptSubmitted`, `agentStop` with `node cli/src/index.ts ingest copilot {event}`; no bash-only or powershell-only as the only path (AC-F001.8)

---

### Step 9: AC-F001.9 — Concurrent appends persist two complete lines
Two overlapping ingest processes, one store file, no torn JSONL. Verifies AC-F001.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.9-concurrent-append.test.ts`
- [x] Arrange: one fixture project; two distinct JSON objects (e.g. different `session_id` / `hookEvent`)
- [x] Act: spawn two `node cli/src/index.ts ingest …` children so their writes overlap (do not wait for the first to exit before starting the second)
- [x] Assert: `events.jsonl` has exactly two lines; each line is a complete parseable JSON object; no interleaved fragments or concatenated objects on one line; both children `exitCode === 0` (AC-F001.9)

---

### Step 10: AC-F001.10 — Omit null/empty keys; keep 0 and false
Payload omit is visible on the stored JSONL line (process boundary, not a unit import). Verifies AC-F001.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.10-omit-empty.test.ts`
- [x] Arrange: stdin JSON object with `null`, `""`, `[]`, `{}`, nested empty object/array, nested parent that becomes `{}` after omit, and keys whose values are `0` and `false`
- [x] Act: spawn a successful ingest
- [x] Assert: stored Event (and nested payload objects) omit keys whose values were null, `""`, `[]`, or `{}` (empty parent omitted too); `0` and `false` remain (AC-F001.10)

---

### Step 11: AC-F001.11 — Non-ingest argv writes usage, exits 1, no health stdout
Spawn CLI with omitted argv, with `health`, and with some other non-ingest argv. Do not import `cli/src/**` as SUT. Verifies AC-F001.11.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.11-non-ingest-usage.test.ts`
- [ ] Arrange: extend `e2e/spawn.ts` with a helper that spawns `node cli/src/index.ts` plus raw extra argv (not ingest-only); no fixture audit write required
- [ ] Act: spawn with omitted argv; spawn with `health`; spawn with some other non-ingest argv (e.g. `report`)
- [ ] Assert: each case stderr contains usage; `exitCode === 1`; stdout is not an “up and running” health line (AC-F001.11)

---

### Step 12: AC-F001.12 — Usage names ingest, not health
Usage text from a non-ingest spawn names ingest and does not name health as a supported command. Do not import `cli/src/**` as SUT. Verifies AC-F001.12.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f001.12-usage-names-ingest.test.ts`
- [ ] Arrange: spawn helper from Step 11
- [ ] Act: spawn CLI with omitted argv (or `health`) so usage is printed
- [ ] Assert: stderr names ingest; stderr does not name health as a supported command (AC-F001.12)

---

> last updated: 2026-08-31T19:13:00Z
