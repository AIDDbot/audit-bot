---
spec-kind: functional
container: e2e
---
# F007-agent-display-name - e2e

## Specification

User-facing flow under test: ingest (spawned as `ingest {harness} {event}`) persists F001 Event log / Session index and F003 Session YAML. Copilot subagent start and stop may include `agent_display_name` after `agent_type` when the payload has `agentDisplayName`. Cursor and Claude Code omit that field and must not map it from any other key, including a planted Copilot `agentDisplayName`. `agent_type` stays F003: Copilot start from `agentName`, Copilot stop from `agentType` — never from `agentDisplayName`. Event log stays F001 verbatim (`agentDisplayName` remains on the JSONL line). Observe-only: exit 0, no blocking stdout. F007 does not change Cursor registration (six events stay). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers.

This spec does not replace F001–F006. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. This plan does **not** cover F004 report-trigger (sessionEnd gate was already dropped; duration; overwrite).

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (first e2e plan for F007):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`) and jsonl helpers (`readLines`, `parseObject`, `readSessions`) already exist. Extend only if needed; do not change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F007.1 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only (`copilot` / `claude-code` + `subagentStart` / `subagentStop` / `SubagentStart` / `SubagentStop`)
- When a YAML file is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers. F007 does **not** change `.cursor/hooks.json` (six events stay)
- Do **not** reopen F001–F006 ACs. Existing-suite files that lack Copilot `agentDisplayName` stay green (omit-absent). Plan Step 8 as leave-as-is
- Do **not** plan F004 report-trigger e2e (sessionEnd gate was already dropped; duration; overwrite)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). There is no e2e tsconfig/oxlint — typecheck and lint are typically skipped (same as F001–F006)

### Shared store wording

> Copied verbatim for the cli sibling.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path`, `task`, `agentDisplayName`, `agentName`, `agentDescription`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session YAML log; do not create a Session report.

**Session YAML log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml`

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start body is `agent_type`, then `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (explicit exception to the three-harness intro, alongside `task`). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key. Do not use `agentDisplayName` as a fallback or overlay for `agent_type` (Copilot start `agent_type` stays `agentName`; Copilot stop `agent_type` stays `agentType`). Omit `agent_display_name` or `task` when that field’s source key is absent.
- Do **not** include `transcript_path` in any YAML document (F005). Agent stop body is empty (header only).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the four header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `source_harness`, and duration stay F004 as shipped (write/overwrite after every YAML append). Do not change them here.
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `agent_type`, then `agent_display_name`, then `task`; subagent stop `agent_type`, then `agent_display_name`, then `response_text`; user prompt `prompt`; agent stop empty. Do **not** put `transcript_path` in Details. Omit absent fields.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F007 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F007.1** — THE SYSTEM SHALL include `agent_display_name` in `docs/normalized-fields.md` for subagent start and for subagent stop, with Copilot source key `agentDisplayName` and no Cursor or Claude Code source key, as an explicit exception to that document’s rule that only fields present in all three harnesses appear, alongside the existing `task` exception.
- [x] **AC-F007.2** — WHEN ingest writes a YAML document for Copilot subagent start and the payload has `agentDisplayName`, THE SYSTEM SHALL include `agent_display_name` after `agent_type` and before `task`.
- [x] **AC-F007.3** — WHEN ingest writes a YAML document for Copilot subagent stop and the payload has `agentDisplayName`, THE SYSTEM SHALL include `agent_display_name` after `agent_type` and before `response_text`.
- [x] **AC-F007.4** — WHEN the Copilot source key `agentDisplayName` is absent, THE SYSTEM SHALL omit `agent_display_name` and SHALL NOT invent it from any other payload field.
- [x] **AC-F007.5** — WHEN ingest writes a YAML document for Cursor or Claude Code subagent start or subagent stop, THE SYSTEM SHALL NOT include `agent_display_name` and SHALL NOT map it from any other payload field.
- [x] **AC-F007.6** — THE SYSTEM SHALL NOT use `agentDisplayName` or `agent_display_name` as a fallback or overlay for `agent_type`; Copilot subagent-start `agent_type` SHALL remain from `agentName`; Copilot subagent-stop `agent_type` SHALL remain from `agentType`.
- [x] **AC-F007.7** — THE SYSTEM SHALL remain F001 verbatim for the Event log (JSONL still has `agentDisplayName` when the payload has it) and SHALL remain observe-only (exit 0, no blocking stdout).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| first | keep | First e2e plan for F007; no prior scenarios to classify |

## Implementation Steps

### Step 1: AC-F007.1 — normalized-fields.md includes agent_display_name for subagent start and stop (Copilot only)
Parse [`docs/normalized-fields.md`](../../normalized-fields.md) as text (do not spawn ingest). Section 3 (Inicio de subagente) **and** section 4 (Fin de subagente) have `agent_display_name` rows; Copilot cell `agentDisplayName`; Cursor and Claude empty/`—`. Intro still names the `task` exception **and** names the `agent_display_name` exception. Duplicate small table helpers in the new file (mirror `e2e/ac-f006.4-normalized-fields-task.test.ts`); do not import `cli/src`. Verifies AC-F007.1.
- Paths:
    - `docs/normalized-fields.md`
    - `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts`
- [x] Arrange: repo root as the project; load `docs/normalized-fields.md` as text. Do not spawn ingest. Do not import `cli/src/**`. Node builtins only (no YAML library; this is Markdown). Duplicate `stripTicks` / `tableRows` / `hasNoSourceKey` in this file; do not import helpers from `e2e/ac-f006.4-normalized-fields-task.test.ts` as a module if that file does not export them
- [x] Act: parse the file (title includes `AC-F007.1`)
- [x] Assert: section `## 3. Inicio de subagente` has a table row whose normalized field is `agent_display_name`; that row’s Copilot cell is `agentDisplayName`; Cursor and Claude Code cells have no source key (empty, `—`, or equivalent absence — not a field name). Section `## 4. Fin de subagente` has the same `agent_display_name` row shape (Copilot `agentDisplayName`; Cursor and Claude empty/`—`). Intro still names `task` as an explicit exception **and** names `agent_display_name` as an explicit exception (alongside `task`). Do not require the `task` row to disappear (AC-F007.1)

---

### Step 2: AC-F007.2 — Copilot subagentStart YAML includes agent_display_name after agent_type
Spawn `ingest copilot subagentStart` with a F001 `session_id`, `agentName: "explore"`, `agentDisplayName: "Explore"`, plus extras that must not leak (`agentDescription`, `sessionId`, trap `task`). Body keys: `agent_type` then `agent_display_name` (Copilot has no `task` mapping so `task` is absent — still “before `task`” in table order). `agent_type` is `"explore"`; `agent_display_name` is `"Explore"`. JSONL verbatim including `agentDisplayName`. Header four F003 fields; `source_harness: copilot`; `source_event: subagentStart`. Verifies AC-F007.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f007.2-copilot-subagent-start-display-name.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Extra argv `["copilot", "subagentStart"]`. Parse YAML with existing `yamlDocuments` + `yamlMapping`. Payload `session_id` `"sess-ac-f007-2"`, `agentName` `"explore"`, `agentDisplayName` `"Explore"`, `agentDescription` `"do not map"`, `sessionId` `"copilot-wrong-id"`, trap `task` `"should not map"`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not spawn a Copilot process. Copilot `sessionId` is not a session identifier; `session_id` is required
- [x] Act: spawn `node cli/src/index.ts ingest copilot subagentStart` with that stdin (title includes `AC-F007.2`)
- [x] Assert: `exitCode === 0`; stdout empty. Document starts with keys `session_id`, `source_harness`, `source_event`, `timestamp` in that order; `source_harness` is `copilot`; `source_event` is `subagentStart`; `session_id` equals the filename stem and appears once. Body keys are `agent_type` then `agent_display_name` (no `task`); `agent_type` is `"explore"`; `agent_display_name` is `"Explore"`. Extras absent from YAML (`agentDescription`, `sessionId`, `task` not body keys). Event log line remains verbatim including `agentDisplayName`, `agentName`, `agentDescription`, `sessionId`, and trap `task` (AC-F007.2)

---

### Step 3: AC-F007.3 — Copilot subagentStop YAML includes agent_display_name after agent_type and before response_text
Spawn `ingest copilot subagentStop` with `session_id`, `agentType: "explore"`, `agentDisplayName: "Explore"`, `response: "done"`, extras (`transcriptPath`, `sessionId`). Body keys: `agent_type`, `agent_display_name`, `response_text` in that order. Verifies AC-F007.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f007.3-copilot-subagent-stop-display-name.test.ts`
- [x] Arrange: isolated fixture; extra argv `["copilot", "subagentStop"]`. Payload `session_id` `"sess-ac-f007-3"`, `agentType` `"explore"`, `agentDisplayName` `"Explore"`, `response` `"done"`, `transcriptPath` `"/tmp/t.jsonl"`, `sessionId` `"copilot-wrong-id"`. Do not import `cli/src/**`. Do not spawn a Copilot process
- [x] Act: spawn ingest (title includes `AC-F007.3`)
- [x] Assert: `exitCode === 0`; stdout empty. Document starts with the four F003 header keys; `source_harness` is `copilot`; `source_event` is `subagentStop`; `session_id` equals the filename stem. Body keys are `agent_type`, `agent_display_name`, `response_text` in that order; `agent_type` is `"explore"`; `agent_display_name` is `"Explore"`; `response_text` is `"done"`. No `transcript_path` / `transcriptPath` / `sessionId` in YAML. Event log line remains verbatim including `agentDisplayName`, `transcriptPath`, and `sessionId` (AC-F007.3)

---

### Step 4: AC-F007.4 — Copilot YAML omits agent_display_name when agentDisplayName is absent
Two Copilot cases without `agentDisplayName`: (1) start with `agentName` plus traps `agentDescription` / `task` / `agentType`; (2) stop with `agentType` plus traps. YAML must **not** contain `agent_display_name`. Do not invent from traps. Verifies AC-F007.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f007.4-omit-absent-agent-display-name.test.ts`
- [x] Arrange: two isolated fixtures. Each payload includes a F001 `session_id` (not Copilot `sessionId` alone) and **no** `agentDisplayName` key. Cases (each title includes `AC-F007.4`):
    1. Copilot start — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f007-4-start"`, `agentName` `"explore"`, traps `agentDescription` `"do not invent"`, `task` `"should not map"`, `agentType` `"wrong"`
    2. Copilot stop — extra argv `["copilot", "subagentStop"]`; payload `session_id` `"sess-ac-f007-4-stop"`, `agentType` `"explore"`, `response` `"done"`, traps `agentDescription` `"do not invent"`, `task` `"should not map"`, `agentName` `"wrong"`
- [x] Act: spawn both cases (do not import `cli/src/**`; do not spawn a Copilot process)
- [x] Assert: both `exitCode === 0`; stdout empty. YAML text does **not** contain `agent_display_name` (not from traps). Case 1 body keys are `agent_type` only; `agent_type` is `"explore"` (from `agentName`, not `agentType`). Case 2 body keys are `agent_type` then `response_text`; `agent_type` is `"explore"` (from `agentType`, not `agentName`). Event log line remains verbatim including traps and **without** inventing `agentDisplayName` (AC-F007.4)

---

### Step 5: AC-F007.5 — Cursor and Claude Code YAML omit agent_display_name even when the Copilot key is planted
Cursor start (`subagent_type` + trap `agentDisplayName` + `task`) and stop (`subagent_type` + trap `agentDisplayName` + `summary`); Claude `SubagentStart` / `SubagentStop` with trap `agentDisplayName`. YAML must not include `agent_display_name` even when the Copilot key is planted on Cursor/Claude payloads. Cursor start still has `task` after `agent_type` (F006). Verifies AC-F007.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f007.5-cursor-claude-omit-agent-display-name.test.ts`
- [x] Arrange: four isolated fixtures. Each payload includes a F001 `session_id` and a trap `agentDisplayName` `"Explore"`. Cases (each title includes `AC-F007.5`):
    1. Cursor start — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f007-5-cursor-start"`, `subagent_type` `"explore"`, trap `agentDisplayName` `"Explore"`, `task` `"review the diff"`
    2. Cursor stop — extra argv `["cursor", "subagentStop"]`; payload `session_id` `"sess-ac-f007-5-cursor-stop"`, `subagent_type` `"explore"`, trap `agentDisplayName` `"Explore"`, `summary` `"done"`
    3. Claude start — extra argv `["claude-code", "SubagentStart"]`; payload `session_id` `"sess-ac-f007-5-claude-start"`, `agent_type` `"explore"`, trap `agentDisplayName` `"Explore"`
    4. Claude stop — extra argv `["claude-code", "SubagentStop"]`; payload `session_id` `"sess-ac-f007-5-claude-stop"`, `agent_type` `"explore"`, trap `agentDisplayName` `"Explore"`, `last_assistant_message` `"done"`
- [x] Act: spawn all four (do not import `cli/src/**`; do not spawn Copilot or Claude processes)
- [x] Assert: all four `exitCode === 0`; stdout empty. YAML text does **not** contain `agent_display_name`. Case 1 body keys are `agent_type` then `task` (F006); `agent_type` is `"explore"`; `task` is `"review the diff"`. Case 2 body keys are `agent_type` then `response_text`; `response_text` is `"done"`. Case 3 body keys are `agent_type` only. Case 4 body keys are `agent_type` then `response_text`. Event log line remains verbatim including the trap `agentDisplayName` (AC-F007.5)

---

### Step 6: AC-F007.6 — agent_type is not taken from agentDisplayName
Copilot start `agentName: "explore"` vs `agentDisplayName: "Explore"` → `agent_type` is explore not Explore. Copilot stop `agentType: "explore"` vs `agentDisplayName: "Explore"` → `agent_type` is explore. Distinct values are mandatory. Verifies AC-F007.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f007.6-agent-type-not-from-display-name.test.ts`
- [x] Arrange: two isolated fixtures. Distinct slug vs label is required (`"explore"` vs `"Explore"`). Cases (each title includes `AC-F007.6`):
    1. Copilot start — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f007-6-start"`, `agentName` `"explore"`, `agentDisplayName` `"Explore"`
    2. Copilot stop — extra argv `["copilot", "subagentStop"]`; payload `session_id` `"sess-ac-f007-6-stop"`, `agentType` `"explore"`, `agentDisplayName` `"Explore"`, `response` `"done"`
- [x] Act: spawn both cases (do not import `cli/src/**`; do not spawn a Copilot process)
- [x] Assert: both `exitCode === 0`; stdout empty. Case 1: `agent_type` is `"explore"` (from `agentName`), **not** `"Explore"`; `agent_display_name` is `"Explore"`. Case 2: `agent_type` is `"explore"` (from `agentType`), **not** `"Explore"`; `agent_display_name` is `"Explore"`. Do not use `agentDisplayName` or `agent_display_name` as a fallback or overlay for `agent_type` (AC-F007.6)

---

### Step 7: AC-F007.7 — Copilot start/stop with agentDisplayName stay observe-only and JSONL verbatim
Copilot start/stop with `agentDisplayName` exit 0, stdout `""`, JSONL still has `agentDisplayName`. No continue/permission/followup rewrite. Verifies AC-F007.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f007.7-observe-only-and-verbatim.test.ts`
- [x] Arrange: two isolated fixtures. Case A — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f007-7-start"`, `agentName` `"explore"`, `agentDisplayName` `"Explore"`. Case B — extra argv `["copilot", "subagentStop"]`; payload `session_id` `"sess-ac-f007-7-stop"`, `agentType` `"explore"`, `agentDisplayName` `"Explore"`, `response` `"done"`. Do not import `cli/src/**`
- [x] Act: spawn ingest for each case (each title includes `AC-F007.7`)
- [x] Assert: both `exitCode === 0` and stdout `""` (no blocking stdout: no `continue`, `permission`, `followup_message`, or other rewrite JSON). Event log line deep-equals the stdin payload and includes `agentDisplayName` `"Explore"` (F001 verbatim). YAML may include `agent_display_name`; that must not strip the JSONL key (AC-F007.7)

---

### Step 8: Leave existing F001–F006 e2e files
Leave existing F001–F006 e2e files; no hook-key or body-key assertion breaks when Copilot fixtures lack `agentDisplayName`. F007 adds **no** Cursor registration. Do not reopen F001–F006 ACs. Do not plan F004 report-trigger e2e.
- Paths:
    - `e2e/ac-f003.5-normalized-body-fields.test.ts`
    - `e2e/ac-f006.4-normalized-fields-task.test.ts`
    - `e2e/ac-f006.6-copilot-claude-omit-task.test.ts`
    - `e2e/ac-f004.5-details-normalized-fields.test.ts`
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts`
    - `e2e/ac-f005.1-register-before-submit-prompt.test.ts`
    - `e2e/ac-f006.1-register-stop.test.ts`
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts`
- [x] Arrange: keep those test files and their AC titles. Do not drop them. Do not change `spawnIngest` default extra argv. Do not edit `.cursor/hooks.json` for F007. Do not add `.cmd` wrappers
- [x] Act: leave as-is (no assertion edits in this container)
- [x] Assert:
    - `e2e/ac-f003.5-normalized-body-fields.test.ts` — Copilot `subagentStop` payload has **no** `agentDisplayName`, so body stays `agent_type` then `response_text`. Cursor `subagentStart` body stays `agent_type` then `task` (Cursor has no `agent_display_name` source key)
    - `e2e/ac-f006.4-normalized-fields-task.test.ts` — asserts `task` row + exception mention. F007 **must keep** the `task` exception in `normalized-fields.md` while adding `agent_display_name`. This test should still pass
    - `e2e/ac-f006.6-copilot-claude-omit-task.test.ts` — Copilot start has trap `task` and no `agentDisplayName`; body stays `agent_type` only
    - `e2e/ac-f004.5-details-normalized-fields.test.ts` — Cursor payloads, no `agentDisplayName`; Details omit absent `agent_display_name`
    - Hook-key tests (F001.6 / F002.4 / F005.1 / F006.1) stay six events. F007 adds **no** registration
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` — leave as-is

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F006.
- Did not run `node --test e2e/*.test.ts` (planify only; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F006).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. Extend helpers only if needed.
- YAML and Markdown in tests are observed as text (split YAML on `---`, read keys in order; parse `normalized-fields.md` as text). No YAML library in e2e either. Duplicate small Markdown table helpers in the AC-F007.1 file; do not import `cli/src`.
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only (`copilot` / `claude-code` + `subagentStart` / `subagentStop` / `SubagentStart` / `SubagentStop`). Copilot `sessionId` is not a F001 session identifier; cases that need YAML still include `session_id`.
- Do not add Cursor registrations or `.cmd` wrappers. F007 does not change `.cursor/hooks.json` (six events stay).
- Do not plan F004 report-trigger e2e (sessionEnd gate was already dropped; duration; overwrite). Do not reopen F001–F006 ACs. Step 8 leaves existing F001–F006 e2e files as-is.
- This container does not set spec status to `planned` (sibling cli planify runs in parallel). Spec status stays `pending`.
- AC-F007.6 is a dedicated file (not folded into AC-F007.2/3) so each AC id has one Implementation Step and one test file.

---

> last updated: 2026-09-01T18:42:02Z
