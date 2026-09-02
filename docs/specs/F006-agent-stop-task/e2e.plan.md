---
spec-kind: functional
container: e2e
---
# F006-agent-stop-task - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals. Persistence stays F001 and F010/F003: verbatim Event log, Session index rules, append-only Session JSONL log, exit 0, no blocking stdout. Cursor registration includes `stop` with the same shell-command shape as `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt`. Keep those five registrations. That `stop` invocation still persists as F001 and appends a Session JSONL record when a session identifier exists. Agent-stop JSON objects start with the F003 compact header (`harness`, `event`, `timestamp`, `turn`; `session_id` only on the initial session-start) and then only the agent-stop body fields in [`docs/normalized-fields.md`](../../normalized-fields.md) (none today; F009 may still emit `subagent` when a matching payload attribute is present; do not duplicate `session_id` in the body; do not include `transcript_path`). `turn` is a JSON number; numbering is F008 (do not assert it here). Subagent-start JSON objects include `task` after `subagent` when Cursor sends it; Copilot and Claude Code omit `task` and do not map it from any other payload field. Session report Details stay `task` only (identity is the Subagent cell, F009). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, F003, F004, F005, F007, F008, F009, or F010. This amend (C001 / F010) is wording: Session YAML log → Session JSONL log / JSON object. Production already writes `{session_id}.jsonl`, registers `stop`, and emits `subagent` then `task`. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. Do not change mapping or `.cursor/hooks.json` unless a test proves a bug. This plan does **not** cover F004 report-trigger (sessionEnd gate, duration, overwrite).

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (C001 / F010 amend/replan of F006 e2e; prior plan last updated 2026-09-02T10:56:00Z). Production already writes Session JSONL (F010), registers `stop`, and emits `task` after `subagent`.

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). JSONL helpers already exist (F010): `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords`, `listJsonlSessionFiles`. YAML helpers stay on `spawn.ts` until later specs drop them. **F006 redo scenarios must not read yaml** (`readSessionYaml` / `yamlDocuments` / `yamlMapping` / `sessionYamlPath` / `assertYamlIntegerTurn`). Parse with `jsonlRecords`. Key order via `Object.keys` on parsed objects. `turn` is a JSON number (`typeof === "number"`). No `---` documents. Do **not** change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F006.5 — …`). Do **not** leave an AC-F006.3 title. Do **not** leave a title that says YAML document / `{session_id}.yaml`
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Copilot/Claude `task`-omit is spawned as ingest extra argv only (`copilot` / `claude-code` + `subagentStart` / `SubagentStart`)
- When a Session JSONL log is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Do **not** remove Cursor hooks. Product registration is six events including `stop`. Keep the original five. Do not register tool-use, Tab, `workspaceOpen`, or any Cursor event beyond the six
- AC-F006.8 must assert: compact header keys `harness`, `event`, `timestamp`, `turn` then empty body; stop is not initial session-start so the object **omits** `session_id`; `turn` is a JSON number (`typeof === "number"`). Do **not** use `assertYamlIntegerTurn`. Do **not** assert incrementing or turn 1 on stop (F008)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). Planify must not run e2e either

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped. Agent-stop body is empty. `task` is Cursor-only on subagent start, after `subagent`. Cursor registration is six events including `stop`. F004 Details for subagent start are `task` only (identity is the Subagent cell). Session JSONL / Details omit `transcript_path`.

**Project root** — first non-empty among:

1. `env.CURSOR_PROJECT_DIR`
2. first string in payload `workspace_roots`
3. payload `cwd` (string)
4. process `cwd` passed from the entry

Normalize with `path` so Windows and Linux separators work. Do not read `CLAUDE_PROJECT_DIR`.

**Day folder** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/` where `{YYYY-MM-DD}` is the host **local** calendar date of the invocation. Create `temp/audit/{YYYY-MM-DD}` (and parents) when missing. Root `.gitignore` already has `temp`; do not commit logs.

**Event log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl`

- Always a `.jsonl` file: one incoming event per line.
- Each line is the received JSON object with the **same keys and values** (no added keys, no omitted keys).
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated session-record timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event kind (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.
- Do **not** merge the Session JSONL log into this file.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session JSONL log; do not create a Session report.

**Session JSONL log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`

- Always a `.jsonl` file named for the F001 session identifier (F010). One file per distinct identifier for that day.
- One JSON object per line. Append-only. Format, filename, and serialization stay F010.
- Do not write `{session_id}.yaml`. Do not read/migrate/rewrite existing `.yaml`. Do not mix YAML and JSONL in one session.
- Do not merge into `events.jsonl`.
- When the payload has a session identifier: append exactly one JSON object as one new line in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; do not re-read the line just appended to *produce* it). Under `ingest.lock`, read that session’s **existing** Session JSONL log (missing file → empty) to compute `turn` and initial session-start. Do not read the Event log or Session index to determine those values. Do not read `.yaml`.
- When the payload has no session identifier: do not create or append a Session JSONL log.
- Every object is an independent sequential event. Do not nest a subagent event under a parent. Do not copy `subagent` onto later objects that omit a matching source attribute.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008 shipped; not a body field). This spec requires the field and that it is a JSON number. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extraction is F009: first present of `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; do **not** select the source key from the F002 `harness` positional. This spec does not duplicate those ACs. Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit JSON `null`. New objects write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `task` from any other payload field on those harnesses. Omit `task` when the source key is absent. When Cursor sends `task`, it appears **after `subagent`** (and after `agent_display_name` when that field is also present). When the source key is present and the value is `null`, emit JSON `null`.
- Subagent stop remaining body is `agent_display_name`, then `response_text`.
- Do **not** include `transcript_path` in any Session JSONL record (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear). Do not duplicate `session_id` in the body.
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (F004 as shipped). Overwrite on a later Session JSONL append for the same session the same day. JSONL-only source. Trigger, per-turn subsections, and duration stay F004; F006 does **not** change report structure. Do not re-specify grouping here.
- Subagent cell is the bare `subagent` value when that field is present (F009 / F004). Details follow `docs/normalized-fields.md` excluding identity: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. This F006 amend does **not** change `.cursor/hooks.json` unless a test proves a bug.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F006.1** — THE SYSTEM SHALL register Cursor `stop` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor stop`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt`, and SHALL keep those five registrations.
- [ ] **AC-F006.2** — WHEN ingest is invoked as `ingest cursor stop` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules) and SHALL append a Session JSONL log object as F003/F010 when the payload has a session identifier.
- [ ] **AC-F006.8** — WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a JSON object that starts with `harness`, `event`, `timestamp`, and `turn` and then only the agent-stop body fields in [`docs/normalized-fields.md`](../../normalized-fields.md) (none today); THE SYSTEM SHALL NOT include `session_id` in the body; THE SYSTEM SHALL NOT include `transcript_path` (F005 remains in force).
- [x] **AC-F006.4** — THE SYSTEM SHALL include `task` in [`docs/normalized-fields.md`](../../normalized-fields.md) for subagent start, with Cursor source key `task` and no Copilot or Claude Code source key, as an explicit exception to that document’s rule that only fields present in all three harnesses appear.
- [ ] **AC-F006.5** — WHEN ingest writes a JSON object for Cursor subagent start and the payload has `task`, THE SYSTEM SHALL include `task` after `subagent`; WHEN `task` is absent, THE SYSTEM SHALL omit it.
- [ ] **AC-F006.6** — WHEN ingest writes a JSON object for Copilot or Claude Code subagent start, THE SYSTEM SHALL NOT include `task` and SHALL NOT map `task` from any other payload field.
- [ ] **AC-F006.7** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for `stop` ingest and when the JSON object includes or omits `task`.

Deprecated (not under test): **AC-F006.3** (four-field YAML header then empty agent-stop body; replaced by AC-F006.8).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F006.1 — Cursor hooks.json registers stop with the same node ingest shell command | keep | still registers `stop` in that command shape; keep the original five; six events; do **not** remove hooks; do not change hooks.json |
| AC-F006.2 — ingest cursor stop persists Event log, Session index, and YAML | redo | still F001 persist + one Session JSONL record when a session identifier exists; drop `sessionYamlPath` / `yamlDocuments` / `---`; assert `{session_id}.jsonl` via `jsonlRecords` |
| AC-F006.3 — stop YAML starts with F003 header then empty body; transcript_path omitted | drop | retired; stay drop. No AC-F006.3 file |
| AC-F006.8 — stop YAML starts with compact F003 header then empty body; transcript_path omitted | redo | compact header unchanged. Repath `ac-f006.8-stop-yaml-header-only` → `…stop-jsonl-header-only`. Parse with `jsonlRecords`. Drop `assertYamlIntegerTurn`; `turn` is a JSON number. Stop omits `session_id` |
| AC-F006.4 — normalized-fields.md includes task for subagent start (Cursor only) | keep | mapping-table `task` exception unchanged; identity row is already `subagent` (F009) |
| AC-F006.5 — Cursor subagentStart YAML includes task after subagent when present, omitted when absent | redo | asserts already `subagent` then `task`; compact `keys.slice(0, 4)` already. Retarget off yaml helpers. Titles “YAML” → JSON object. Keep `AC-F006.5` |
| AC-F006.6 — Copilot and Claude Code subagentStart YAML omit task | redo | omit `task` unchanged. Retarget off yaml helpers. Titles “YAML” → JSON object |
| AC-F006.7 — stop ingest and task include/omit stay observe-only | redo | observe-only unchanged; retarget Case A/B/C off yaml helpers |
| Step 8: Update existing e2e files so the suite stays green | drop | stay drop. F001–F005 / F007–F010 own those files. Do not reopen |

## Implementation Steps

### Step 1: AC-F006.1 — Cursor hooks.json registers stop with the same node ingest shell command
Keep. Parse `.cursor/hooks.json` (do not spawn ingest). Six events: keep the original five and `stop`. Each `command` is the exact shell string `node .agents/hooks/index.mjs ingest cursor {event}`. Do not remove hooks. No `.cmd` files. Verifies AC-F006.1.
- Paths:
    - `.cursor/hooks.json`
    - `e2e/ac-f006.1-register-stop.test.ts`
- [x] Arrange: repo root as the project; load `.cursor/hooks.json`. Do not spawn ingest. Do not import `cli/src/**`. Do not add `.cmd` wrappers. Learning scar: extra tokens after `node … index.mjs` are kept. Do **not** remove `stop` or the original five. Do not register tool-use, Tab, `workspaceOpen`, or any Cursor event beyond the six. Do not edit the file
- [x] Act: parse the file (title includes `AC-F006.1`)
- [x] Assert: `"version": 1`; `failClosed` unset on the file and on each entry; events nested under `config.hooks`; keys are exactly `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` (six keys; original five still present); each entry `command` equals `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that key, including `node .agents/hooks/index.mjs ingest cursor stop`; `.cursor/hooks/{event}.cmd` for each of the six and `.cursor/hooks/ingest.cmd` are absent (AC-F006.1)

---

### Step 2: AC-F006.2 — ingest cursor stop persists Event log, Session index, and Session JSONL
Redo. Spawn ingest as `ingest cursor stop` with a JSON object that has a session identifier → F001 persist plus one Session JSONL record in `{session_id}.jsonl` in the dated folder. One process, one invocation. Does not assert header key count. Verifies AC-F006.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f006.2-stop-ingest-persists.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Extra argv `["cursor", "stop"]`. Stdin one JSON object with `session_id` e.g. `"sess-ac-f006-2"`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Drop `readSessionYaml` / `sessionYamlPath` / `yamlDocuments`. Use `readLines`, `parseObject`, `readSessions`, `readSessionJsonl`, `sessionJsonlPath`, `jsonlRecords`
- [x] Act: spawn `node cli/src/index.ts ingest cursor stop` with that stdin (title includes `AC-F006.2`; no “YAML”)
- [x] Assert: `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` / `turn` overlay); `{dayFolder}/sessions.json` is a JSON array that includes that `session_id`; `{dayFolder}/{session_id}.jsonl` exists with exactly one JSON object (`jsonlRecords` length 1). Do not assert `---` or `{session_id}.yaml` (AC-F006.2)

---

### Step 3: AC-F006.8 — stop JSON object starts with compact F003 header then empty body; transcript_path omitted
Redo. Header is `harness`, `event`, `timestamp`, `turn` in that order (`session_id` omitted because `stop` is not the initial session-start); `turn` is a JSON number (`typeof === "number"`); agent-stop table-driven body fields in [`docs/normalized-fields.md`](../../normalized-fields.md) are none today so the object is header-only after those four when no F009 identity key is on the payload; `session_id` is not in the body; `transcript_path` is omitted even when the payload has a transcript path (F005); Event log has no `turn`. Do not restore `source_harness` / `source_event`. Do not assert F008 numbering. One Cursor case is enough (Copilot `agentStop` / Claude `Stop` aliases stay in cli unit tests). Verifies AC-F006.8.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f006.8-stop-jsonl-header-only.test.ts`
    - delete `e2e/ac-f006.8-stop-yaml-header-only.test.ts`
- [x] Arrange: isolated fixture; extra argv `["cursor", "stop"]`. Parse with `jsonlRecords` then `Object.keys` (Node builtins only). Drop `yamlDocuments` / `yamlMapping` / `assertYamlIntegerTurn` / `sessionYamlPath`. Do **not** change `spawnIngest` default extraArgv. Do not add a YAML or JSON library. New file `e2e/ac-f006.8-stop-jsonl-header-only.test.ts`. Delete `e2e/ac-f006.8-stop-yaml-header-only.test.ts`. Payload `session_id` `"sess-ac-f006-8"`, `transcript_path` e.g. `"/tmp/agent-stop.jsonl"`, plus extras that must not leak (`status`, `loop_count`, `hook_event_name`). No F009 identity key on this payload so the body stays empty
- [x] Act: spawn `node cli/src/index.ts ingest cursor stop` (title includes `AC-F006.8`; **no AC-F006.3 title**; no “YAML”). Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not change `.cursor/hooks.json`
- [x] Assert: `exitCode === 0`; stdout empty. Filename stem is the payload `session_id` (`path.basename(..., ".jsonl")`). Object starts with keys `harness`, `event`, `timestamp`, `turn` in that order (`keys.slice(0, 4)`); `harness` is `cursor`; `event` is `stop`; `"session_id" in record` is false (not initial session-start; not repeated in the body); `typeof record.turn === "number"` (do **not** require exact `0`, incrementing, or turn 1). Body after the four fields is empty (`keys.slice(4)` is `[]`; no `transcript_path`, no extras). Event log line remains verbatim including `transcript_path` and extras and has no `turn` key; the Session JSONL file does not contain the substring `transcript_path` (AC-F006.8)

---

### Step 4: AC-F006.4 — normalized-fields.md includes task for subagent start (Cursor only)
Keep. Parse [`docs/normalized-fields.md`](../../normalized-fields.md) (do not spawn ingest). Subagent-start table includes `task` with Cursor source key `task` and no Copilot or Claude Code source key, as an explicit exception to the three-harness intro. Identity row is already `subagent` (F009). Verifies AC-F006.4.
- Paths:
    - `docs/normalized-fields.md`
    - `e2e/ac-f006.4-normalized-fields-task.test.ts`
- [x] Arrange: repo root as the project; load `docs/normalized-fields.md` as text. Do not spawn ingest. Do not import `cli/src/**`. Node builtins only (no YAML library; this is Markdown)
- [x] Act: parse the file (title includes `AC-F006.4`)
- [x] Assert: the subagent-start section (Inicio de subagente) has a table row whose normalized field is `task`; that row’s Cursor cell is `task`; Copilot and Claude Code cells have no source key (empty, `—`, or equivalent absence — not a field name). The document states that `task` is an explicit exception to the intro rule that only fields present in all three harnesses appear (AC-F006.4)

---

### Step 5: AC-F006.5 — Cursor subagentStart JSON object includes task after subagent when present, omitted when absent
Redo. Two cases in one AC file: present `task` and absent `task`. File already slices four compact header keys and already expects body `["subagent", "task"]` / `["subagent"]`. F009 already emits `subagent` then `task`. Retarget off yaml helpers. Titles “YAML” → JSON object. Keep `AC-F006.5` in both titles. Do not assert F008 numbering. One Cursor case is enough. Verifies AC-F006.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f006.5-cursor-subagent-start-task.test.ts`
- [x] Arrange: keep the two isolated fixtures; extra argv `["cursor", "subagentStart"]` each. Parse with `jsonlRecords` then `Object.keys`. Drop `yamlDocuments` / `yamlMapping` / `sessionYamlPath` / `readSessionYaml`. Cases (each title includes `AC-F006.5`; no “YAML”):
    1. Present task — payload `session_id` `"sess-ac-f006-5-present"`, `subagent_type` `"explore"`, and `task` `"review the diff"`, plus extras that must not leak (`subagent_id`, `hook_event_name`, `transcript_path`)
    2. Absent task — payload `session_id` `"sess-ac-f006-5-absent"`, `subagent_type` `"explore"`, and extras (`subagent_id`, `hook_event_name`) but **no** `task` key
- [x] Act: spawn both cases via `node cli/src/index.ts ingest cursor subagentStart` (do not import `cli/src/**`). Retitle present-task to `AC-F006.5 — Cursor subagentStart JSON object includes task after subagent when present`. Retitle omit to `AC-F006.5 — Cursor subagentStart JSON object omits task when absent`
- [x] Assert: both `exitCode === 0`; stdout empty. Filename stem is the payload `session_id` (`path.basename(..., ".jsonl")`). Both objects start with keys `harness`, `event`, `timestamp`, `turn` in that order (`keys.slice(0, 4)`); `harness` is `cursor`; `event` is `subagentStart`; `"session_id" in record` is false. Case 1: body keys are `subagent` then `task` (`keys.slice(4)`); `subagent` is `"explore"`; `task` is `"review the diff"`; extras absent from the Session JSONL object (`transcript_path` substring absent). Case 2: body keys are `subagent` only (no `task`). Event log line remains verbatim including extras and, in case 1, `task` (AC-F006.5). Do not assert F008 numbering. Do not restore `agent_type` as a JSON key. Do not edit `cli/src/**`

---

### Step 6: AC-F006.6 — Copilot and Claude Code subagentStart JSON objects omit task
Redo. Spawn ingest as extra argv only (do not spawn Copilot or Claude processes). File already slices four compact header keys and already expects body `["subagent"]` with no `task`. Neither harness maps `task`; a payload key `task` or any other decoy field must not become JSON `task`. Retarget off yaml helpers. Do not assert F008 numbering. Verifies AC-F006.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f006.6-copilot-claude-omit-task.test.ts`
- [x] Arrange: two isolated fixtures. Parse with `jsonlRecords` then `Object.keys`. Drop `yamlDocuments` / `yamlMapping` / `sessionYamlPath` / `readSessionYaml`. Each payload includes a F001 `session_id` (not Copilot `sessionId` alone). Cases (each title includes `AC-F006.6`; no “YAML”):
    1. Copilot — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f006-6-copilot"`, Copilot `agentName` `"explore"`, trap `task` `"should not map"`, and a decoy `agentDescription` `"do not map this either"`
    2. Claude Code — extra argv `["claude-code", "SubagentStart"]`; payload `session_id` `"sess-ac-f006-6-claude"`, Claude `agent_type` `"explore"`, trap `task` `"should not map"`, and a decoy `agent_id` `"sa-1"`
- [x] Act: spawn both cases via `node cli/src/index.ts ingest` (do not import `cli/src/**`; do not spawn Copilot or Claude processes). Retitle Copilot to `AC-F006.6 — Copilot subagentStart JSON object omits task and does not map decoys`. Retitle Claude to `AC-F006.6 — Claude Code SubagentStart JSON object omits task and does not map decoys`
- [x] Assert: both `exitCode === 0`; stdout empty. Filename stem is the payload `session_id`. Both objects start with the four compact header keys (`keys.slice(0, 4)`); `harness` / `event` match the extra argv (`copilot` / `subagentStart`, `claude-code` / `SubagentStart`). Body has `subagent` and **no** `task` (not from the trap `task` key, not from `agentDescription` / `agent_id` or any other field). Event log line remains verbatim including the trap `task` key (AC-F006.6). Do not assert F008 numbering

---

### Step 7: AC-F006.7 — stop ingest and task include/omit stay observe-only
Redo. Those spawns (a `stop` ingest, a Cursor subagentStart with `task`, and a Cursor subagentStart without `task`) exit 0 with empty stdout. No continue/block/permission/followup rewrite on stdout. Body already `keys.slice(4)` (`subagent` then `task` when present). Retarget Case A/B/C off yaml helpers. Do not assert F008 numbering. Verifies AC-F006.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f006.7-observe-only-stop-and-task.test.ts`
- [x] Arrange: three isolated fixtures. Drop `readSessionYaml` / `sessionYamlPath` / `yamlDocuments` / `yamlMapping`. Use `sessionJsonlPath` / `readSessionJsonl` / `jsonlRecords`. Case A — extra argv `["cursor", "stop"]`; payload has `session_id` (same shape as AC-F006.2). Case B — extra argv `["cursor", "subagentStart"]`; payload has `session_id`, `subagent_type`, and `task` (JSON object includes `task` after `subagent`). Case C — extra argv `["cursor", "subagentStart"]`; payload has `session_id` and `subagent_type` but no `task` (JSON object omits `task`). Do not import `cli/src/**`
- [x] Act: spawn ingest for each case via `node cli/src/index.ts ingest` (each title includes `AC-F006.7`; no “YAML”)
- [x] Assert: all three `exitCode === 0` and stdout `""` (no blocking stdout: no `continue`, `permission`, `followup_message`, or other rewrite JSON). Case A: Event log + Session index + Session JSONL as F001/F010 (`jsonlRecords` length 1). Case B: Session JSONL body includes `task` after `subagent`; still exit 0 and empty stdout. Case C: Session JSONL body has no `task`; still exit 0 and empty stdout (AC-F006.7)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md).
- Did not run `node --test e2e/*.test.ts` (planify must not; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F010).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- Copied shared store wording from the sibling [cli.plan.md](./cli.plan.md).
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. JSONL helpers already exist (F010). YAML helpers stay on `e2e/spawn.ts` until later specs drop them. F006 redo tests must not call them.
- JSONL in tests is observed with Node `JSON.parse` via `jsonlRecords`. No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude `task`-omit is extra argv only (`copilot` / `claude-code` + `subagentStart` / `SubagentStart`). Copilot `sessionId` is not a F001 session identifier; cases that need Session JSONL still include `session_id`.
- Do not register extra Cursor events. Do not remove `stop` from `.cursor/hooks.json`. Do not change hooks.json unless a test proves a bug.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- How `turn` is numbered is F008. AC-F006.8 asserts field order and JSON-number type (`typeof === "number"`), not exact `0`, incrementing, or prompt-kind counting.
- Do not plan F004 report-trigger e2e (sessionEnd gate, duration, overwrite).
- Product code is **not** needed. Production already writes Session JSONL, registers `stop`, and emits `subagent` then `task`. Remaining work is F006 e2e titles/helpers off YAML document / `{session_id}.yaml`. Redo of AC-F006.8 authorizes deleting `e2e/ac-f006.8-stop-yaml-header-only.test.ts` after the jsonl-header file exists.
- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`.
- This plan carries **no unit tests** and plans no `cli/test/` work.
- Do not change mapping. Production already writes Session JSONL.

---

> last updated: 2026-09-02T16:30:00Z
