---
spec-kind: functional
container: e2e
---
# F005-prompt-omit-transcript - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals. Persistence stays F001 and F010/F003: verbatim Event log, Session index rules, append-only Session JSONL log, exit 0, no blocking stdout. Cursor registration includes `beforeSubmitPrompt` with the same shell-command shape as `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`. Product already also registers `stop` (F006). This F005 amend does **not** add extra events and does **not** remove F006 `stop`. That `beforeSubmitPrompt` invocation still persists as F001 and appends a Session JSONL record when a session identifier exists. User-prompt JSON objects start with the F003 compact header (`harness`, `event`, `timestamp`, `turn`; `session_id` only on the initial session-start) and then `prompt` when the mapped source key is present (omit when absent; do not duplicate `session_id` in the body). `turn` is a JSON number; numbering is F008 (do not assert it here). Session JSONL records for subagent start, subagent stop, and agent stop omit `transcript_path` even when the payload has a transcript path; the Event log line stays F001 verbatim (the Event log JSONL line may still contain `transcript_path`). Session report Details follow the same mapping (no `transcript_path`). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, F003, F004, or F010. This amend (C001 / F010) is wording: Session YAML log → Session JSONL log / JSON object. Production already writes `{session_id}.jsonl` and omits `transcript_path`. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. Do not change mapping or `.cursor/hooks.json` unless a test proves a bug.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (C001 / F010 amend/replan of F005 e2e; prior plan last updated 2026-09-01T21:18:00Z). Production already writes Session JSONL (F010) and omits `transcript_path`.

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). JSONL helpers already exist (F010): `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords`, `listJsonlSessionFiles`. YAML helpers stay on `spawn.ts` until later specs drop them. **F005 redo scenarios must not read yaml** (`readSessionYaml` / `yamlDocuments` / `yamlMapping` / `sessionYamlPath` / `assertYamlIntegerTurn`). Parse with `jsonlRecords`. Key order via `Object.keys` on parsed objects. `turn` is a JSON number (`typeof === "number"`). No `---` documents. Do **not** change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F005.6 — …`). Do **not** leave an AC-F005.3 title. Do **not** leave a title that says YAML document / `{session_id}.yaml`
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not register extra Cursor events. Do not remove F006 `stop` from `.cursor/hooks.json`. Do not spawn Copilot or Claude. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names
- When a Session JSONL log is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- AC-F005.6 must assert: compact header keys `harness`, `event`, `timestamp`, `turn` then `prompt` when present; prompt is not initial session-start so the object **omits** `session_id`; `turn` is a JSON number (`typeof === "number"`). Do **not** use `assertYamlIntegerTurn`. Do **not** assert incrementing, prompt-kind counting, or turn 1 on prompts (F008)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). Planify must not run e2e either

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped. Session JSONL / Details omit `transcript_path`. Cursor registration is six events including F006 `stop`. Prompt body follows the compact header.

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
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path` on the payload stays on the Event log line (F001 verbatim). Do not strip it.
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
- Every object is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008 shipped; not a body field). This spec requires the field and that it is a JSON number. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- Body after the compact header stays F003 / F009 / F007 / F006. User-prompt body after the header is `prompt` when the mapped source key is present. When that key is absent, omit `prompt`. Do not duplicate `session_id` in the body.
- Do **not** include `transcript_path` in any Session JSONL record (including subagent start, subagent stop, and agent stop). Agent stop body is empty (compact header only, plus `subagent` when F009 applies).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as F009.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (F004 as shipped). Overwrite on a later Session JSONL append for the same session the same day. JSONL-only source. Trigger, per-turn subsections, and duration stay F004; do not re-specify them here.
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty. `subagent` / `agent_display_name` stay out of Details (F004 / F009). Omit absent fields. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `beforeSubmitPrompt` continue/block, `stop` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F005 registered five events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`). The product now also registers `stop` (F006) — six events. This F005 amend does **not** add extra events and does **not** remove F006 `stop`. Do **not** change `.cursor/hooks.json` unless a test proves a bug. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. JSONL mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F005.1** — THE SYSTEM SHALL register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`.
- [ ] **AC-F005.2** — WHEN ingest is invoked as `ingest cursor beforeSubmitPrompt` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules) and SHALL append a Session JSONL log record as F003/F010 when the payload has a session identifier.
- [ ] **AC-F005.6** — WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a JSON object that starts with the F003 compact header (`harness`, `event`, `timestamp`, `turn`; `session_id` only on the initial session-start) and then `prompt` when the mapped source key is present; WHEN `prompt` is absent, THE SYSTEM SHALL omit it; THE SYSTEM SHALL NOT duplicate `session_id` in the body.
- [ ] **AC-F005.4** — WHEN ingest writes a JSON object / Session JSONL record for subagent start, subagent stop, or agent stop, THE SYSTEM SHALL NOT include `transcript_path` in that object, even when the payload contains a transcript path; THE SYSTEM SHALL still write the Event log line as F001 (the Event log JSONL line may still contain `transcript_path`).
- [ ] **AC-F005.5** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for `beforeSubmitPrompt` ingest and when the session log omits `transcript_path`.

Deprecated (not under test): **AC-F005.3** (four-field YAML header then `prompt`; replaced by AC-F005.6).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F005.1 — Cursor hooks.json registers beforeSubmitPrompt with the same node ingest shell command | keep | still registers `beforeSubmitPrompt` in that command shape; product already has six events including F006 `stop` — do not remove `stop`; do not register extra events; do not change hooks.json; do not assert “exactly five” or “`stop` is absent” |
| AC-F005.2 — ingest cursor beforeSubmitPrompt persists Event log, Session index, and YAML | redo | still F001 persist + one Session JSONL record when a session identifier exists; drop `sessionYamlPath` / `yamlDocuments` / `---`; assert `{session_id}.jsonl` via `jsonlRecords` |
| AC-F005.3 — prompt YAML starts with F003 header then prompt when present, omitted when absent | drop | retired; stay drop. No AC-F005.3 file |
| AC-F005.4 — YAML omits transcript_path for subagent start, stop, and agent stop; JSONL keeps it | redo | omit `transcript_path` unchanged. Repath `ac-f005.4-omit-transcript-path-from-yaml` → `…from-session-jsonl`. Parse with `jsonlRecords`. Event log JSONL still has `transcript_path`. Compact header is four keys (prompt/subagent/stop are not initial session-start) |
| AC-F005.5 — beforeSubmitPrompt ingest and transcript-omit YAML stay observe-only | redo | observe-only unchanged; retarget Case A/B off yaml helpers. Title “transcript-omit YAML” → session log |
| AC-F005.6 — prompt YAML starts with five-field F003 header then prompt when present, omitted when absent | redo | repath `ac-f005.6-prompt-yaml-header-and-body` → `…prompt-jsonl-header-and-body`. Compact header on JSON objects via `jsonlRecords`. Drop `assertYamlIntegerTurn`; `turn` is a JSON number. Prompt omits `session_id` |
| Step 6: Update existing e2e files so the suite stays green | drop | stay drop. F001–F004 / F006 / F010 own those files. Do not reopen |

## Implementation Steps

### Step 1: AC-F005.1 — Cursor hooks.json registers beforeSubmitPrompt with the same node ingest shell command
Keep. Parse `.cursor/hooks.json` (do not spawn ingest). `beforeSubmitPrompt` is present with the same `command` shape as the original four. Product already has six events including F006 `stop`. Do not remove `stop`. Do not register extra events. Do not change hooks.json. No `.cmd` files. Verifies AC-F005.1.
- Paths:
    - `.cursor/hooks.json`
    - `e2e/ac-f005.1-register-before-submit-prompt.test.ts`
- [ ] Arrange: repo root as the project; load `.cursor/hooks.json`. Do not spawn ingest. Do not import `cli/src/**`. Do not add `.cmd` wrappers. Learning scar: extra tokens after `node … index.mjs` are kept. Do not remove `stop`. Do not register tool-use, Tab, `workspaceOpen`, or any Cursor event beyond the six. Do not edit the file
- [ ] Act: parse the file (title includes `AC-F005.1`)
- [ ] Assert: `"version": 1`; `failClosed` unset on the file and on each entry; events nested under `config.hooks`; `beforeSubmitPrompt` is a hook key; the original four (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`) are still present; `stop` remains a hook key (six keys; do **not** assert exactly five or that `stop` is absent); each of those six entries’ `command` equals `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that key, including `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`; `.cursor/hooks/{event}.cmd` for each of the six and `.cursor/hooks/ingest.cmd` are absent (AC-F005.1)

---

### Step 2: AC-F005.2 — ingest cursor beforeSubmitPrompt persists Event log, Session index, and Session JSONL
Redo. Spawn ingest as `ingest cursor beforeSubmitPrompt` with a JSON object that has a session identifier and `prompt` → F001 persist plus one Session JSONL record in `{session_id}.jsonl` in the dated folder. One process, one invocation. Does not assert header key count. Verifies AC-F005.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.2-prompt-ingest-persists.test.ts`
- [ ] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Extra argv `["cursor", "beforeSubmitPrompt"]`. Stdin one JSON object with `session_id` e.g. `"sess-ac-f005-2"` and `prompt` e.g. `"hello from f005"`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Drop `readSessionYaml` / `sessionYamlPath` / `yamlDocuments`. Use `readLines`, `parseObject`, `readSessions`, `readSessionJsonl`, `sessionJsonlPath`, `jsonlRecords`
- [ ] Act: spawn `node cli/src/index.ts ingest cursor beforeSubmitPrompt` with that stdin (title includes `AC-F005.2`; no “YAML”)
- [ ] Assert: `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` / `turn` overlay; `prompt` kept); `{dayFolder}/sessions.json` is a JSON array that includes that `session_id`; `{dayFolder}/{session_id}.jsonl` exists with exactly one JSON object (`jsonlRecords` length 1). Do not assert `---` or `{session_id}.yaml` (AC-F005.2)

---

### Step 3: AC-F005.6 — prompt JSON object starts with compact F003 header then prompt when present, omitted when absent
Redo. Two cases in one AC file: present `prompt` and absent `prompt`. Compact header is `harness`, `event`, `timestamp`, `turn` in that order (prompt is not initial session-start, so omit `session_id`); `turn` is a JSON number (`typeof === "number"`); `prompt` follows when the mapped Cursor source key is present; omit when absent; `session_id` is not duplicated in the body. Do not assert F008 numbering. One Cursor case is enough (Copilot `userPromptSubmitted` / Claude `UserPromptSubmit` aliases stay in cli unit tests). Verifies AC-F005.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.6-prompt-jsonl-header-and-body.test.ts`
    - delete `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts`
- [ ] Arrange: two isolated fixtures; extra argv `["cursor", "beforeSubmitPrompt"]` each. Parse with `jsonlRecords` then `Object.keys` (Node builtins only). Drop `yamlDocuments` / `yamlMapping` / `assertYamlIntegerTurn` / `sessionYamlPath`. Do **not** change `spawnIngest` default extraArgv. Do not add a YAML or JSON library. New file `e2e/ac-f005.6-prompt-jsonl-header-and-body.test.ts`. Delete `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts`. Cases (each title includes `AC-F005.6`; **no AC-F005.3 title**; no “YAML”):
    1. Present prompt — payload `session_id` `"sess-ac-f005-6-present"` and `prompt` `"hello world"`, plus extras that must not leak (`attachments`, `hook_event_name`)
    2. Absent prompt — payload `session_id` `"sess-ac-f005-6-absent"` and extras (`attachments`, `hook_event_name`) but **no** `prompt` key
- [ ] Act: spawn both cases via `node cli/src/index.ts ingest cursor beforeSubmitPrompt` (do not import `cli/src/**`; do not spawn `.agents/hooks/index.mjs`; do not change `.cursor/hooks.json`)
- [ ] Assert: both `exitCode === 0`; stdout empty. Filename stem is the payload `session_id` (`path.basename(..., ".jsonl")`). Both objects start with keys `harness`, `event`, `timestamp`, `turn` in that order (`keys.slice(0, 4)`); `harness` is `cursor`; `event` is `beforeSubmitPrompt`; `"session_id" in record` is false (not initial session-start; not repeated in the body); `typeof record.turn === "number"` (do **not** require exact `0`, incrementing, or turn 1). Case 1: fifth key is `prompt` with value `"hello world"` (`keys[4]`); extras absent from the Session JSONL object. Case 2: body has no `prompt` (header-only after the four fields; `keys.slice(4)` is `[]`); extras absent. Event log line remains verbatim including extras and has no `turn` key (AC-F005.6)

---

### Step 4: AC-F005.4 — Session JSONL omits transcript_path for subagent start, stop, and agent stop; Event log keeps it
Redo. One fixture, three sequential spawns: `subagentStart`, `subagentStop`, and `stop`, each with a transcript path on the payload (Cursor source keys). Session JSONL records must not contain the substring `transcript_path`; Event log JSONL lines must still contain it. Compact header is four keys (these events are not initial session-start). Do not assert F008 numbering. Do not remove F006 `stop` from `hooks.json`. Verifies AC-F005.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.4-omit-transcript-path-from-session-jsonl.test.ts`
    - delete `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts`
- [ ] Arrange: one isolated fixture; env `CURSOR_PROJECT_DIR`; same `session_id` `"sess-ac-f005-4"` for every payload. Cursor keys on each payload. Payloads have no `task` / `agentDisplayName` (those body fields stay omitted). Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`. Parse with `jsonlRecords`. New file `e2e/ac-f005.4-omit-transcript-path-from-session-jsonl.test.ts`. Delete `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts`. Sequence:
    1. Extra argv `["cursor", "subagentStart"]`; payload has `session_id`, `subagent_type`, and `transcript_path` e.g. `"/tmp/sub-start.jsonl"`
    2. Extra argv `["cursor", "subagentStop"]`; payload has `session_id`, `subagent_type`, `summary`, `transcript_path` e.g. `"/tmp/sub-stop.jsonl"`, and Cursor `agent_transcript_path` e.g. `"/tmp/agent-sub.jsonl"` (so a writer that copied the Cursor key would still put `transcript_path` in the session-file text)
    3. Extra argv `["cursor", "stop"]`; payload has `session_id` and `transcript_path` e.g. `"/tmp/agent-stop.jsonl"`. Spawn only — do not add extra events to `.cursor/hooks.json`; do not remove `stop`
- [ ] Act: spawn the three ingests in order (title includes `AC-F005.4`; no “YAML”)
- [ ] Assert: all three `exitCode === 0`; stdout empty. Event log has exactly three parseable object lines; each parsed object deep-equals that spawn’s stdin (including `transcript_path` / `agent_transcript_path`); each Event log JSONL line **contains** the substring `transcript_path`. `{session_id}.jsonl` has exactly three JSON objects; **no** object (and not the file as a whole) contains the substring `transcript_path`. Header is four keys (`Object.keys` slice 0..4 = `harness`, `event`, `timestamp`, `turn`); `"session_id" in record` is false. Body keys (`keys.slice(4)`): (1) `subagent` only; (2) `subagent` then `response_text` (from Cursor `summary`); (3) empty (agent-stop header only). Session index includes `"sess-ac-f005-4"` (AC-F005.4). Do not assert F008 numbering

---

### Step 5: AC-F005.5 — beforeSubmitPrompt ingest and transcript-omit session log stay observe-only
Redo. Those spawns (a user-prompt ingest and a transcript-omit case) exit 0 with empty stdout. No continue/block/permission/followup rewrite on stdout. Does not slice header keys. Verifies AC-F005.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.5-observe-only-prompt-and-omit.test.ts`
- [ ] Arrange: two isolated fixtures. Drop `readSessionYaml` / `sessionYamlPath` / `yamlDocuments`. Use `sessionJsonlPath` / `readSessionJsonl` / `jsonlRecords`. Case A — extra argv `["cursor", "beforeSubmitPrompt"]`; payload has `session_id` and `prompt` (same shape as AC-F005.2). Case B — extra argv `["cursor", "subagentStart"]`; payload has `session_id`, `subagent_type`, and `transcript_path` (Session JSONL must omit the path; this is the transcript-omit observe-only case). Do not import `cli/src/**`
- [ ] Act: spawn ingest for each case (each title includes `AC-F005.5`; Case B title “transcript-omit session log”, not YAML)
- [ ] Assert: both `exitCode === 0` and stdout `""` (no blocking stdout: no `continue`, `permission`, `followup_message`, or other rewrite JSON). Case A: Event log + Session index + Session JSONL as F001/F010 (`jsonlRecords` length 1). Case B: Session JSONL text / object does not contain `transcript_path`; Event log line still does; still exit 0 and empty stdout (AC-F005.5)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md).
- Did not run `node --test e2e/*.test.ts` (planify must not; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F010).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- Copied shared store wording from the sibling [cli.plan.md](./cli.plan.md).
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. JSONL helpers already exist (F010). YAML helpers stay on `e2e/spawn.ts` until later specs drop them. F005 redo tests must not call them.
- JSONL in tests is observed with Node `JSON.parse` via `jsonlRecords`. No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude prompt aliases are out of this e2e file (cli units cover them). Copilot `sessionId` is not a F001 session identifier; cases that need Session JSONL still include `session_id`.
- Do not register extra Cursor events. Do not remove F006 `stop` from `.cursor/hooks.json`. Agent-stop mapping in AC-F005.4 is spawned as ingest extra argv (product already registers `stop`). Do not change hooks.json unless a test proves a bug.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- How `turn` is numbered is F008. AC-F005.6 asserts field order and JSON-number type (`typeof === "number"`), not exact `0`, incrementing, or prompt-kind counting.
- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`. Redo of AC-F005.4 authorizes deleting `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts` after the session-jsonl file exists. Redo of AC-F005.6 authorizes deleting `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts` after the jsonl-header file exists.
- This plan carries **no unit tests** and plans no `cli/test/` work.
- Do not change mapping. Production already writes Session JSONL and omits `transcript_path`.

---

> last updated: 2026-09-02T16:00:00Z
