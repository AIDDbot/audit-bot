---
spec-kind: functional
container: e2e
---
# F009-subagent-name - e2e

## Specification

User-facing flow under test: ingest (spawned as `ingest {harness} {event}`) persists F001 Event log / Session index and F010/F003 Session JSONL. Identity on new JSON objects is `subagent` (not `agent_type`), immediately after the compact header, on every event kind when a preferred payload attribute is present — including header-only/unmapped. Preference is payload-key order (`subagent_type` > `agent_type` > `agentType` > `agentName`), not the F002 `harness` positional. Do not map from `agentDisplayName` / `agent_display_name` / `agentDescription` / `agentId` / `subagent_id` / `task`. Omit when absent; JSON `null` when the chosen key is present and null. Event log stays F001 verbatim (original keys remain on the JSONL line). Observe-only: exit 0, no blocking stdout. F009 does not change Cursor registration (six events stay). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers. Do not plan F004 Subagent-column e2e (AC-F004.24 belongs to F004).

This spec does not replace F001–F008 or F010. This amend (C001 / F010) is wording: Session YAML log → Session JSONL log / JSON object; YAML `null` → JSON `null`. Compact header keys (`harness` / `event`) and `session_id` only on the initial sessionStart are F003. `turn` is a JSON number; numbering is F008. `agent_display_name` stays F007 (Copilot-only; not an identity fallback). Session report Subagent cell is F004 — do not reopen. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. Do not change mapping or `.cursor/hooks.json` unless a test proves a bug.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (C001 / F010 amend/replan of F009 e2e; prior plan last updated 2026-09-02T10:00:00Z). Production already writes Session JSONL (F010) and emits harness-independent `subagent`.

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). JSONL helpers already exist (F010): `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords`, `listJsonlSessionFiles`. YAML helpers stay on `spawn.ts` until later specs drop them. **F009 redo scenarios must not read yaml** (`readSessionYaml` / `yamlDocuments` / `yamlMapping` / `yamlRawScalar` / `sessionYamlPath` / `assertYamlIntegerTurn`). Parse with `jsonlRecords`. Key order via `Object.keys` on parsed objects. `turn` is a JSON number (`typeof === "number"`). Present-null is JSON `null` (`record.subagent === null`). No `---` documents. Do **not** change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F009.1 — …`). Redo .1 / .2 titles that still say YAML / YAML null. Keep .3 / .4 / .5 titles (no YAML)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only (`copilot` / `claude-code` + event)
- When a Session JSONL log is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers. F009 does **not** change `.cursor/hooks.json` (six events stay)
- F009 scenarios must assert JSON key `subagent`, **not** `agent_type`. Do **not** depend on YAML key `agent_type:` or YAML `null`
- Do **not** rewrite F004’s plan file. Do **not** edit F007 e2e files (sibling sequential spec)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). Planify must not run e2e either. There is no e2e tsconfig/oxlint — typecheck and lint are typically skipped (same as F001–F010)

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003. Format, filename, and serialization stay F010. F008 numbering is already shipped. This container adds harness-independent `subagent` after the header on every object when a matching payload attribute is present, including header-only/unmapped. New objects write `subagent`, never `agent_type`. Present-null is JSON `null`.

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
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.
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
- `turn` is a JSON number (F008 shipped; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extract with the first present payload key in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`. Do **not** select the source key from the F002 `harness` positional (a Cursor payload with `subagent_type` still yields `subagent` when harness is `copilot` or empty). Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit JSON `null`. Do not map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`. Do not use `agentDisplayName` / `agent_display_name` as a fallback or overlay for `subagent`. New objects write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key.
- Subagent stop remaining body is `agent_display_name`, then `response_text`. Copilot source key for `response_text` is `response`; Cursor `summary`; Claude Code `last_assistant_message`.
- Do **not** include `transcript_path` in any Session JSONL record (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object is header-only **except** `subagent` may still appear when a matching source attribute is present. Other extra body fields stay closed (no `reason` / `prompt` / `task` / `agent_display_name` on unmapped objects).
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `harness`, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every Session JSONL append). Do not change them here.
- Subagent cell: when the JSON object has `subagent`, the cell is that value only (no `subagent:` / `agent_type:` / `agent_display_name:` prefix). When `subagent` is absent, the cell is empty. Fill the cell for **any** event kind that has `subagent` on that object (session start/end, prompt, agent stop, subagent start/stop, header-only unmapped), not only start/stop. Do not show `agent_display_name` in the Subagent cell. Do not fall back to `agent_type`. Do not copy identity onto later objects that omit it. Do not reconstruct parent→subagent hierarchy. AC-F004.6 100-character single-line preview still applies to that cell.
- Details: remaining table-driven body fields excluding identity. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F009 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [ ] **AC-F009.1** — THE SYSTEM SHALL rename the normalized field `agent_type` to `subagent` in [`docs/normalized-fields.md`](../../normalized-fields.md) (Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`) and SHALL persist that field as `subagent` on new Session JSONL log records (JSON objects) (not `agent_type`).
- [ ] **AC-F009.2** — WHEN ingest appends a JSON object to a Session JSONL log and the payload has a matching subagent source attribute, THE SYSTEM SHALL include `subagent` on that JSON object after the header and before other body fields, for every event kind including session start, session end, user prompt, agent stop, subagent start, subagent stop, and header-only unmapped objects; WHEN no matching source attribute is present, THE SYSTEM SHALL omit `subagent`; WHEN the matching source key is present and the value is `null`, THE SYSTEM SHALL write JSON `null`.
- [x] **AC-F009.3** — WHEN extracting `subagent`, THE SYSTEM SHALL use the first present payload attribute in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; THE SYSTEM SHALL NOT select the source key from the F002 `harness` positional.
- [x] **AC-F009.4** — THE SYSTEM SHALL NOT map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`.
- [x] **AC-F009.5** — THE SYSTEM SHALL remain F001 verbatim for the Event log and SHALL remain observe-only (exit 0, no blocking stdout).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F009.1 — normalized-fields.md identity row is subagent; Cursor spawn writes subagent not agent_type | redo | docs parse keep (no YAML). Spawn title still says YAML and still calls `readSessionYaml`. Persist JSON object not YAML document |
| AC-F009.2 — subagent after header on every event kind; omit-absent; present null | redo | titles still say YAML / YAML null. Retarget off yaml helpers. JSON object after header; omit; JSON `null` |
| AC-F009.3 — preference order; harness positional does not choose the source key | keep | spec AC and titles have no YAML. Tests still call `readSessionYaml` — retarget helpers only so they observe Session JSONL; **keep titles** |
| AC-F009.4 — do not map subagent from display name or traps | keep | spec AC and titles have no YAML. Tests still call `readSessionYaml` — retarget helpers only; **keep titles** |
| AC-F009.5 — JSONL stays verbatim; observe-only | keep | Event log JSONL + observe-only; no Session YAML helpers. Leave the file |
| Leave existing F001–F008 e2e files that do not hardcode identity | drop | other specs own those files. Do not edit F007 e2e |
| Keep the existing suite green after the identity rename | drop | already shipped. Do not edit F003 / F004 / F006 / F007 e2e. F007 is a sibling sequential spec |

## Implementation Steps

### Step 1: AC-F009.1 — normalized-fields.md identity row is subagent; Cursor spawn writes subagent not agent_type
Redo the spawn. Parse [`docs/normalized-fields.md`](../../normalized-fields.md) as text (do not import `cli/src`). Section 3 (Inicio de subagente) **and** section 4 (Fin de subagente) have a `subagent` row and **no** normalized-field row named `agent_type`. Source keys: Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`. Then spawn `ingest cursor subagentStart` with `subagent_type: explore` → JSON object body key `subagent` is `"explore"`, not `agent_type`. Docs test unchanged (no YAML). Spawn drops yaml helpers. Two tests; every title includes `AC-F009.1`. Duplicate small table helpers in this file (do not import `cli/src`). Compact header: `harness` / `event` / `timestamp` / `turn` (no `session_id` on this non-start object). Verifies AC-F009.1.
- Paths:
    - `docs/normalized-fields.md`
    - `e2e/spawn.ts`
    - `e2e/ac-f009.1-normalized-fields-subagent.test.ts`
- [x] Arrange: keep the docs-parse test as shipped (title includes `AC-F009.1`; no YAML). Spawn test: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`. Extra argv `["cursor", "subagentStart"]`. Payload `session_id` `"sess-ac-f009-1"` and `subagent_type` `"explore"` (no `task`). Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`. Parse with `jsonlRecords` then `Object.keys`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`
- [x] Act: parse the docs file (title includes `AC-F009.1`); spawn `node cli/src/index.ts ingest cursor subagentStart` with that stdin. Retitle spawn from `Cursor subagentStart YAML writes subagent not agent_type` to `AC-F009.1 — Cursor subagentStart JSON object writes subagent not agent_type`
- [x] Assert: docs asserts unchanged. Spawn: `exitCode === 0`; stdout empty. Filename stem is the payload `session_id` (`path.basename(..., ".jsonl")`). Object starts with keys `harness`, `event`, `timestamp`, `turn` (compact; no `session_id`; not `source_harness` / `source_event`); `harness` is `cursor`; `event` is `subagentStart`. Body keys are `subagent` only; `subagent` is `"explore"`; `"agent_type"` is not a JSON key. Event log line remains verbatim including `subagent_type` (AC-F009.1)

---

### Step 2: AC-F009.2 — subagent after header on every event kind; omit-absent; present JSON null
Redo. Matching preferred key present → `subagent` immediately after the compact header on sessionStart, sessionEnd, beforeSubmitPrompt, stop, subagentStart, subagentStop, **and** unmapped/header-only (`ingest` with empty extraArgv **or** unknown event; payload still has `session_id` + `subagent_type`). Absent key → omit. Present null → JSON `null`. Other body fields stay after `subagent`. Drop yaml helpers. Retitle every case that still says YAML / YAML null. Do not assert F004 Subagent column. Each test title includes `AC-F009.2`. Verifies AC-F009.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.2-subagent-on-every-event.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping` / `yamlRawScalar`. Parse with `jsonlRecords` then `Object.keys`. Each Session JSONL case includes a F001 `session_id` (not Copilot `sessionId` alone). Keep the ten cases (each title includes `AC-F009.2`; no “YAML” / “YAML null”):
    1. sessionStart — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f009-2-start"`, `subagent_type` `"explore"`
    2. sessionEnd — extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f009-2-end"`, `subagent_type` `"explore"`, `reason` `"completed"`
    3. beforeSubmitPrompt — extra argv `["cursor", "beforeSubmitPrompt"]`; payload `session_id` `"sess-ac-f009-2-prompt"`, `subagent_type` `"explore"`, `prompt` `"hello"`
    4. stop — extra argv `["cursor", "stop"]`; payload `session_id` `"sess-ac-f009-2-stop"`, `subagent_type` `"explore"`
    5. subagentStart — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f009-2-sub-start"`, `subagent_type` `"explore"`, `task` `"review the diff"`
    6. subagentStop — extra argv `["cursor", "subagentStop"]`; payload `session_id` `"sess-ac-f009-2-sub-stop"`, `subagent_type` `"explore"`, `summary` `"done"`
    7. unmapped empty extraArgv — omit `extraArgv` (default none); payload `session_id` `"sess-ac-f009-2-empty-argv"`, `subagent_type` `"explore"`, traps `reason` `"completed"`, `prompt` `"hello"`
    8. unmapped unknown event — extra argv `["cursor", "notAnEvent"]`; payload `session_id` `"sess-ac-f009-2-unknown"`, `subagent_type` `"explore"`, traps `reason` `"completed"`, `prompt` `"hello"`
    9. absent — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f009-2-absent"` only (no preferred key)
    10. present null — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f009-2-null"`, `subagent_type` `null`
    Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not spawn Copilot or Claude processes. Do not change `spawnIngest` default extra argv
- [x] Act: spawn each case. Retitle cases 1–6 from “YAML includes/body is” to “JSON object includes/body is”. Retitle case 10 from `present null subagent_type is YAML null` to `present null subagent_type is JSON null`
- [x] Assert: all `exitCode === 0`; stdout empty. Compact header: case 1 keys start `session_id`, `harness`, `event`, `timestamp`, `turn` then `subagent`; cases 2–8 and 10 start `harness`, `event`, `timestamp`, `turn` then `subagent` (no `session_id`; not `source_harness` / `source_event`). `"agent_type"` is not a JSON key on any object. Case 1: `subagent` is `"explore"`; no other body keys. Case 2: body keys `subagent` then `reason`. Case 3: `subagent` then `prompt`. Case 4: body is `subagent` only. Case 5: `subagent` then `task`. Case 6: `subagent` then `response_text`. Cases 7–8: `subagent` is `"explore"`; traps `reason` / `prompt` absent; header `harness` / `event` are the positionals as supplied (empty strings when extraArgv omitted). Case 9: `"subagent" in record` is false; five-field header only. Case 10: `subagent` is JSON `null` (`record.subagent === null`; do **not** use `yamlRawScalar`). Event log line remains verbatim (AC-F009.2)

---

### Step 3: AC-F009.3 — preference order; harness positional does not choose the source key
Keep titles (no YAML). Retarget helpers only: drop `readSessionYaml` / `yamlDocuments` / `yamlMapping`; parse with `jsonlRecords`. Traps: payload with both `agentType` and `agentName` → `agentType` wins; `subagent_type` wins over `agent_type`; harness positional `copilot` but payload only has `subagent_type` → still persist `subagent`; empty harness + `agentName` → persist. Distinct values are mandatory on overlap cases. Each test title includes `AC-F009.3` and stays as shipped. Verifies AC-F009.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.3-preference-order-not-harness.test.ts`
- [x] Arrange: four isolated fixtures. Each payload includes a F001 `session_id`. Distinct overlap values (`"from-agentType"` vs `"from-agentName"`; `"from-subagent_type"` vs `"from-agent_type"`). Drop yaml helpers. Parse with `jsonlRecords` then `Object.keys`. Keep the four cases and their titles (each includes `AC-F009.3`; no “YAML”)
- [x] Act: spawn all four (titles unchanged)
- [x] Assert: all four `exitCode === 0`; stdout empty. Compact header `harness` / `event` (not `source_*`). `"agent_type"` is not a JSON key. Case 1: `subagent` is `"from-agentType"`, **not** `"from-agentName"`. Case 2: `subagent` is `"from-subagent_type"`, **not** `"from-agent_type"`. Case 3: `harness` is `copilot`; `subagent` is `"explore"` (from `subagent_type`; must not require the Copilot column). Case 4: `harness` is `""`; `subagent` is `"explore"` (from `agentName`). Event log line remains verbatim including both overlap keys (AC-F009.3)

---

### Step 4: AC-F009.4 — do not map subagent from display name or traps
Keep titles (no YAML). Retarget helpers only. Plant `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, `task` without any preferred key → omit `subagent`. Copilot start with `agentName` + `agentDisplayName` → `subagent` from `agentName`, not the display name (`"explore"` vs `"Explore"`). F007 `agent_display_name` may still appear on the Copilot start object; that must not overlay identity. Each test title includes `AC-F009.4` and stays as shipped. Verifies AC-F009.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.4-not-from-display-name-or-traps.test.ts`
- [x] Arrange: two isolated fixtures. Distinct slug vs label is required on the Copilot case (`"explore"` vs `"Explore"`). Drop yaml helpers (`yamlText` / `readSessionYaml` / `yamlDocuments` / `yamlMapping`). Parse with `jsonlRecords`. Keep both cases and their titles (each includes `AC-F009.4`; no “YAML”)
- [x] Act: spawn both cases (titles unchanged)
- [x] Assert: both `exitCode === 0`; stdout empty. Case 1: `"subagent" in record` is false (not from traps); five-field compact header only; traps are not body keys. Case 2: `subagent` is `"explore"` (from `agentName`), **not** `"Explore"`; `"agent_type"` is not a JSON key; `agent_display_name` is `"Explore"` (F007). Event log line remains verbatim including traps / `agentDisplayName` (AC-F009.4)

---

### Step 5: AC-F009.5 — JSONL stays verbatim; observe-only
Keep. JSONL still has original keys (`subagent_type`, `agentDisplayName`, and the other planted keys). `exitCode` 0, stdout empty. No continue/permission/followup rewrite. Do not edit the file. Verifies AC-F009.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.5-observe-only-and-verbatim.test.ts`
- [x] Arrange: leave as shipped. Two isolated fixtures. Case A — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f009-5-cursor"`, `subagent_type` `"explore"`, traps. Case B — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f009-5-copilot"`, `agentName` `"explore"`, `agentDisplayName` `"Explore"`. Do not import `cli/src/**`
- [x] Act: leave as-is (titles already include `AC-F009.5`; no YAML)
- [x] Assert: both `exitCode === 0` and stdout `""` (no blocking stdout: no `continue`, `permission`, `followup_message`, or other rewrite JSON). Event log line deep-equals the stdin payload and includes the original keys. Session JSONL may include `subagent`; that must not strip or overlay the Event-log keys (AC-F009.5)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md).
- Did not run `node --test e2e/*.test.ts` (planify must not; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F010).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- Copied shared store wording from the sibling [cli.plan.md](./cli.plan.md).
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. JSONL helpers already exist (F010). YAML helpers stay on `e2e/spawn.ts` until later specs drop them. F009 redo tests must not call them. AC-F009.3 / .4 titles stay (no YAML) but those files still called yaml helpers — retarget helpers only.
- JSONL in tests is observed with Node `JSON.parse` via `jsonlRecords`. No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only. Copilot `sessionId` is not a F001 session identifier; cases that need Session JSONL still include `session_id`.
- Do not add Cursor registrations or `.cmd` wrappers. F009 does not change `.cursor/hooks.json` (six events stay).
- Do not edit F001–F008 / F010 e2e files. Do not edit F007 e2e files (sibling sequential spec). Dropped prior Step 6 / Step 7.
- Product code is **not** needed. Production already writes Session JSONL and emits `subagent`. Remaining work is F009 e2e titles/helpers off YAML document / YAML `null`.
- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`.
- This plan carries **no unit tests** and plans no `cli/test/` work.
- AC-F009.1 mixes docs parse + one Cursor spawn in one file (two tests; same AC id).
- Do not change mapping. Production already writes Session JSONL.

---

> last updated: 2026-09-02T16:21:00Z
