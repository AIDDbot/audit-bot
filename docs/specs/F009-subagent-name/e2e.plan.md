---
spec-kind: functional
container: e2e
---
# F009-subagent-name - e2e

## Specification

User-facing flow under test: ingest (spawned as `ingest {harness} {event}`) persists F001 Event log / Session index and F003 Session YAML. Identity on new YAML documents is `subagent` (not `agent_type`), immediately after the compact header, on every event kind when a preferred payload attribute is present — including header-only/unmapped. Preference is payload-key order (`subagent_type` > `agent_type` > `agentType` > `agentName`), not the F002 `harness` positional. Do not map from `agentDisplayName` / `agent_display_name` / `agentDescription` / `agentId` / `subagent_id` / `task`. Omit when absent; YAML `null` when the chosen key is present and null. Event log stays F001 verbatim (original keys remain on the JSONL line). Observe-only: exit 0, no blocking stdout. F009 does not change Cursor registration (six events stay). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers. Do not plan F004 Subagent-column e2e (AC-F004.24 belongs to F004).

This spec does not replace F001–F008. Compact header keys (`harness` / `event`) and `session_id` only on the initial sessionStart are F003 (AC-F003.13 / AC-F003.14 / AC-F003.15). `turn` numbering is F008. `agent_display_name` stays F007 (Copilot-only; not an identity fallback). Session report Subagent cell is F004 — do not reopen. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (first e2e plan for F009):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`, `yamlRawScalar`, `assertYamlIntegerTurn`) and jsonl helpers (`readLines`, `parseObject`, `readSessions`) already exist. Expected documents use compact keys `harness` / `event` (not `source_harness` / `source_event`). `session_id` only on the initial sessionStart. `turn` is an unquoted integer after `timestamp`. Do **not** change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F009.1 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only (`copilot` / `claude-code` + event)
- When a YAML file is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers. F009 does **not** change `.cursor/hooks.json` (six events stay)
- F009 scenarios must assert YAML key `subagent`, **not** `agent_type`. Do **not** depend on the old `agent_type:` prefix
- Do **not** rewrite F004’s plan file. Step 7 still updates existing e2e assertions that hardcode YAML `agent_type` or an `agent_type:` Subagent prefix so `/verify` stays green. New F004.24 scenarios stay for F004 implement-spec.
- Existing F001–F008 e2e files that **hardcode YAML key `agent_type`** would go red when F009 ships. Step 7 updates those files so `/verify` of this spec can stay green. Do **not** reopen F001–F008 ACs beyond the identity-key / Subagent-cell string. F003/F004/F006/F007 implement-spec will still replan their own ACs.
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). There is no e2e tsconfig/oxlint — typecheck and lint are typically skipped (same as F001–F008)

### Shared store wording

> Sibling `cli.plan.md` is not written yet. Compact-header F003-style wording plus F009 `subagent`. Event log, Session index, project root, and day folder stay as F001. Header keys are `harness` / `event`; `session_id` only on the initial sessionStart; `turn` is an integer (F008 numbering).

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values, whether they contain `session_id`, and whether they still have `agent_type`. Do not migrate old `source_harness` / `source_event` keys. Do not migrate old `agent_type` keys.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing YAML.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent. Do not copy `subagent` onto later documents that omit it. Do not reconstruct parent→subagent hierarchy.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- `subagent` after the header when a preferred payload key is present, on every event kind including header-only/unmapped (`harness` or `event` empty or unmatched). It is the first body field (immediately after `turn`, before other body fields). New documents write `subagent`, not `agent_type`.
- Preference (first present payload attribute is the source): `subagent_type` > `agent_type` > `agentType` > `agentName`. Do not select the source key from the F002 `harness` positional. Empty or unrecognized harness still persists `subagent` when a preferred key is present.
- Never map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`. Do not use `agentDisplayName` / `agent_display_name` as a fallback or overlay for `subagent` (F007). Copilot start identity source stays `agentName`; Copilot stop identity source stays `agentType` when those preferred keys are the first present.
- Omit-absent: when none of the preferred keys is present, omit `subagent`. When the chosen key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- Other body fields still follow F003 table-driven mapping for the event kind in `docs/normalized-fields.md`, excluding `session_id`, using those snake_case names, in table order after `subagent`. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`), except `subagent` which is scanned from the payload regardless of harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Identity row in `docs/normalized-fields.md` is `subagent` (not `agent_type`). Source keys for the subagent-start and subagent-stop rows stay: Cursor `subagent_type`; Copilot start `agentName`, Copilot stop `agentType`; Claude Code `agent_type`. Subagent start then `agent_display_name` (Copilot `agentDisplayName`; Cursor and Claude Code have no source key) then `task` (Cursor `task`; Copilot and Claude Code have no source key). Subagent stop then `agent_display_name` then `response_text`. Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key.
- Do **not** include `transcript_path` in any YAML document (F005). Agent stop body is empty except `subagent` when a preferred key is present.
- Do not include any harness-specific or event-specific field that is not in that normalized set (the `subagent` exception above is the only extra-on-every-kind field).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields, plus `subagent` when a preferred payload key is present; otherwise header only: five fields when initial session-start; four otherwise.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview, duration, per-turn subsections, and Details stay F004 as shipped (write/overwrite after every YAML append). Do not change them here. Subagent cell (bare `subagent` value, no field-name prefix) is F004 amend / AC-F004.24 — out of this e2e plan.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header `harness` / `event` can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do not use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F009 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [ ] **AC-F009.1** — THE SYSTEM SHALL rename the normalized field `agent_type` to `subagent` in [`docs/normalized-fields.md`](../../normalized-fields.md) (Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`) and SHALL persist that field as `subagent` on new Session YAML log documents (not `agent_type`).
- [ ] **AC-F009.2** — WHEN ingest appends a Session YAML log document and the payload has a matching subagent source attribute, THE SYSTEM SHALL include `subagent` on that document after the header and before other body fields, for every event kind including session start, session end, user prompt, agent stop, subagent start, subagent stop, and header-only unmapped documents; WHEN no matching source attribute is present, THE SYSTEM SHALL omit `subagent`; WHEN the matching source key is present and the value is `null`, THE SYSTEM SHALL write YAML `null`.
- [ ] **AC-F009.3** — WHEN extracting `subagent`, THE SYSTEM SHALL use the first present payload attribute in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; THE SYSTEM SHALL NOT select the source key from the F002 `harness` positional.
- [ ] **AC-F009.4** — THE SYSTEM SHALL NOT map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`.
- [ ] **AC-F009.5** — THE SYSTEM SHALL remain F001 verbatim for the Event log and SHALL remain observe-only (exit 0, no blocking stdout).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| first | keep | First e2e plan for F009; no prior scenarios to classify |

## Implementation Steps

### Step 1: AC-F009.1 — normalized-fields.md identity row is subagent; Cursor spawn writes subagent not agent_type
Parse [`docs/normalized-fields.md`](../../normalized-fields.md) as text (do not import `cli/src`). Section 3 (Inicio de subagente) **and** section 4 (Fin de subagente) have a `subagent` row and **no** normalized-field row named `agent_type`. Source keys: Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`. Then spawn `ingest cursor subagentStart` with `subagent_type: explore` → YAML body key `subagent: explore`, not `agent_type`. Docs + one spawn in the same AC file (two tests; every title includes `AC-F009.1`). Duplicate small table helpers in the new file (mirror `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts`); do not import `cli/src`. Compact header: `harness` / `event` / `timestamp` / `turn` (no `session_id` on this non-start document). Verifies AC-F009.1.
- Paths:
    - `docs/normalized-fields.md`
    - `e2e/spawn.ts`
    - `e2e/ac-f009.1-normalized-fields-subagent.test.ts`
- [x] Arrange: repo root as the project; load `docs/normalized-fields.md` as text for the docs test. Duplicate `stripTicks` / `tableRows` / `hasNoSourceKey` in this file; do not import helpers from `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts` as a module if that file does not export them. Spawn test: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Extra argv `["cursor", "subagentStart"]`. Payload `session_id` `"sess-ac-f009-1"` and `subagent_type` `"explore"` (no `task`). Parse YAML with existing `yamlDocuments` + `yamlMapping`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`
- [x] Act: parse the docs file (title includes `AC-F009.1`); spawn `node cli/src/index.ts ingest cursor subagentStart` with that stdin (title includes `AC-F009.1`)
- [x] Assert: section `## 3. Inicio de subagente` has a table row whose normalized field is `subagent` (not `agent_type`); Cursor cell `subagent_type`; Copilot cell `agentName`; Claude Code cell `agent_type`. Section `## 4. Fin de subagente` has a `subagent` row; Cursor `subagent_type`; Copilot `agentType`; Claude Code `agent_type`. Neither section has a normalized-field row named `agent_type` (Claude’s source-key cell `agent_type` is not the field name). Spawn: `exitCode === 0`; stdout empty. Document starts with keys `harness`, `event`, `timestamp`, `turn` (compact; no `session_id`; not `source_harness` / `source_event`); `harness` is `cursor`; `event` is `subagentStart`. Body keys are `subagent` only; `subagent` is `"explore"`; `"agent_type"` is not a YAML key. Event log line remains verbatim including `subagent_type` (AC-F009.1)

---

### Step 2: AC-F009.2 — subagent after header on every event kind; omit-absent; present null
Matching preferred key present → `subagent` immediately after the compact header on sessionStart, sessionEnd, beforeSubmitPrompt, stop, subagentStart, subagentStop, **and** unmapped/header-only (`ingest` with empty extraArgv **or** unknown event; payload still has `session_id` + `subagent_type`). Absent key → omit. Present null → YAML `null`. Other body fields stay after `subagent`. Do not assert F004 Subagent column. Each test title includes `AC-F009.2`. Verifies AC-F009.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.2-subagent-on-every-event.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`. Parse with `yamlDocuments` + `yamlMapping`. Each YAML case includes a F001 `session_id` (not Copilot `sessionId` alone). Cases (each title includes `AC-F009.2`):
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
- [x] Act: spawn each case (each title includes `AC-F009.2`)
- [x] Assert: all `exitCode === 0`; stdout empty. Compact header: case 1 keys start `session_id`, `harness`, `event`, `timestamp`, `turn` then `subagent`; cases 2–8 and 10 start `harness`, `event`, `timestamp`, `turn` then `subagent` (no `session_id`; not `source_harness` / `source_event`). `"agent_type"` is not a YAML key on any document. Case 1: `subagent` is `"explore"`; no other body keys. Case 2: body keys `subagent` then `reason`. Case 3: `subagent` then `prompt`. Case 4: body is `subagent` only. Case 5: `subagent` then `task`. Case 6: `subagent` then `response_text`. Cases 7–8: `subagent` is `"explore"`; traps `reason` / `prompt` absent; header `harness` / `event` are the positionals as supplied (empty strings when extraArgv omitted). Case 9: YAML text does **not** contain `subagent`; five-field header only. Case 10: `subagent` is YAML `null` (`yamlMapping` value `null`; raw scalar `null`). Event log line remains verbatim (AC-F009.2)

---

### Step 3: AC-F009.3 — preference order; harness positional does not choose the source key
Traps: payload with both `agentType` and `agentName` → `agentType` wins; `subagent_type` wins over `agent_type`; harness positional `copilot` but payload only has `subagent_type` → still persist `subagent` (must not require harness column); empty harness + `agentName` → persist. Distinct values are mandatory on overlap cases. Each test title includes `AC-F009.3`. Verifies AC-F009.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.3-preference-order-not-harness.test.ts`
- [x] Arrange: four isolated fixtures. Each payload includes a F001 `session_id`. Distinct overlap values (`"from-agentType"` vs `"from-agentName"`; `"from-subagent_type"` vs `"from-agent_type"`). Cases (each title includes `AC-F009.3`):
    1. `agentType` over `agentName` — extra argv `["copilot", "subagentStop"]`; payload `session_id` `"sess-ac-f009-3-agent-type-wins"`, `agentType` `"from-agentType"`, `agentName` `"from-agentName"`
    2. `subagent_type` over `agent_type` — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f009-3-subagent-type-wins"`, `subagent_type` `"from-subagent_type"`, `agent_type` `"from-agent_type"`
    3. copilot positional, Cursor key only — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f009-3-copilot-subagent-type"`, `subagent_type` `"explore"` (no `agentName` / `agentType`)
    4. empty harness + `agentName` — omit `extraArgv`; payload `session_id` `"sess-ac-f009-3-empty-harness"`, `agentName` `"explore"`
    Do not import `cli/src/**`. Do not spawn a Copilot process. Copilot `sessionId` is not a session identifier
- [x] Act: spawn all four (each title includes `AC-F009.3`)
- [x] Assert: all four `exitCode === 0`; stdout empty. Compact header `harness` / `event` (not `source_*`). `"agent_type"` is not a YAML key. Case 1: `subagent` is `"from-agentType"`, **not** `"from-agentName"`. Case 2: `subagent` is `"from-subagent_type"`, **not** `"from-agent_type"`. Case 3: `harness` is `copilot`; `subagent` is `"explore"` (from `subagent_type`; must not require the Copilot column). Case 4: `harness` is `""`; `subagent` is `"explore"` (from `agentName`). Event log line remains verbatim including both overlap keys (AC-F009.3)

---

### Step 4: AC-F009.4 — do not map subagent from display name or traps
Plant `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, `task` without any preferred key → omit `subagent`. Copilot start with `agentName` + `agentDisplayName` → `subagent` from `agentName`, not the display name (`"explore"` vs `"Explore"`). F007 `agent_display_name` may still appear on the Copilot start document; that must not overlay identity. Each test title includes `AC-F009.4`. Verifies AC-F009.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.4-not-from-display-name-or-traps.test.ts`
- [x] Arrange: two isolated fixtures. Distinct slug vs label is required on the Copilot case (`"explore"` vs `"Explore"`). Cases (each title includes `AC-F009.4`):
    1. traps only — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f009-4-traps"`, `agentDisplayName` `"Explore"`, `agentDescription` `"do not map"`, `agentId` `"id-1"`, `subagent_id` `"sub-1"`, `task` `"should not map"` (no preferred key)
    2. Copilot start identity vs display — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f009-4-copilot"`, `agentName` `"explore"`, `agentDisplayName` `"Explore"`
    Do not import `cli/src/**`. Do not spawn a Copilot process
- [x] Act: spawn both cases (each title includes `AC-F009.4`)
- [x] Assert: both `exitCode === 0`; stdout empty. Case 1: YAML text does **not** contain `subagent` (not from traps); five-field compact header only; traps are not body keys. Case 2: `subagent` is `"explore"` (from `agentName`), **not** `"Explore"`; `"agent_type"` is not a YAML key; `agent_display_name` is `"Explore"` (F007). Event log line remains verbatim including traps / `agentDisplayName` (AC-F009.4)

---

### Step 5: AC-F009.5 — JSONL stays verbatim; observe-only
JSONL still has original keys (`subagent_type`, `agentDisplayName`, and the other planted keys). `exitCode` 0, stdout empty. No continue/permission/followup rewrite. Verifies AC-F009.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f009.5-observe-only-and-verbatim.test.ts`
- [x] Arrange: two isolated fixtures. Case A — extra argv `["cursor", "subagentStart"]`; payload `session_id` `"sess-ac-f009-5-cursor"`, `subagent_type` `"explore"`, `agentDisplayName` `"Explore"`, `agentDescription` `"do not map"`, `agentId` `"id-1"`, `subagent_id` `"sub-1"`, `task` `"review the diff"`. Case B — extra argv `["copilot", "subagentStart"]`; payload `session_id` `"sess-ac-f009-5-copilot"`, `agentName` `"explore"`, `agentDisplayName` `"Explore"`. Do not import `cli/src/**`
- [x] Act: spawn ingest for each case (each title includes `AC-F009.5`)
- [x] Assert: both `exitCode === 0` and stdout `""` (no blocking stdout: no `continue`, `permission`, `followup_message`, or other rewrite JSON). Event log line deep-equals the stdin payload and includes the original keys (`subagent_type`, `agentDisplayName`, `agentName`, `agentDescription`, `agentId`, `subagent_id`, `task` as planted). YAML may include `subagent`; that must not strip or overlay the JSONL keys (AC-F009.5)

---

### Step 6: Leave existing F001–F008 e2e files that do not hardcode identity
Leave existing F001–F008 e2e files that do **not** hardcode YAML key `agent_type` or an `agent_type:` Subagent/Details prefix. F009 adds **no** Cursor registration. Do not reopen those ACs. Step 7 updates the identity-key files so the suite stays green.
- Paths:
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts`
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts`
    - `e2e/ac-f003.13-yaml-header-harness-event.test.ts`
    - `e2e/ac-f003.14-session-id-initial-session-start.test.ts`
    - `e2e/ac-f003.15-header-field-order.test.ts`
    - `e2e/ac-f005.1-register-before-submit-prompt.test.ts`
    - `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts`
    - `e2e/ac-f006.1-register-stop.test.ts`
    - `e2e/ac-f006.4-normalized-fields-task.test.ts`
    - `e2e/ac-f006.8-stop-yaml-header-only.test.ts`
    - `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts`
    - `e2e/ac-f007.7-observe-only-and-verbatim.test.ts`
    - `e2e/ac-f008.1-turn-formula-session-prompt-stop.test.ts`
- [x] Arrange: keep those test files and their AC titles. Do not drop them. Do not change `spawnIngest` default extra argv. Do not edit `.cursor/hooks.json` for F009. Do not add `.cmd` wrappers. Do not edit F001–F008 files in this container
- [x] Act: leave as-is (no assertion edits in this container)
- [x] Assert:
    - Hook-key tests (F001.6 / F002.4 / F005.1 / F006.1) stay six events. F009 adds **no** registration
    - Compact-header tests (AC-F003.13 / .14 / .15) stay `harness` / `event`; `session_id` only on initial sessionStart; F009 must not revive `source_harness`
    - `e2e/ac-f006.4-normalized-fields-task.test.ts` — asserts `task` row + exception mention; F009 **must keep** the `task` exception while renaming identity to `subagent`
    - `e2e/ac-f006.8-stop-yaml-header-only.test.ts` — stop payload has **no** preferred identity key, so body stays empty
    - `e2e/ac-f007.1-normalized-fields-agent-display-name.test.ts` — still asserts Copilot-only `agent_display_name` rows
    - `e2e/ac-f007.7-observe-only-and-verbatim.test.ts` — JSONL / stdout only; leave as-is
    - F008 turn numbering files — leave as-is (do not reopen `turn`)

---

### Step 7: Keep the existing suite green after the identity rename
Update existing e2e files that hardcode YAML key `agent_type` or an `agent_type:` Subagent/Details prefix. Keep each file’s original AC id in the test title. Do not add F004.24 scenarios here. Do not change F003.16’s *intent* (no `reason`/`prompt` on unmapped) — only allow `subagent` after the header when the fixture plants `subagent_type`.
- Paths:
    - `e2e/ac-f003.5-normalized-body-fields.test.ts`
    - `e2e/ac-f003.6-subagent-sibling-document.test.ts`
    - `e2e/ac-f003.16-unrecognized-header-only.test.ts`
    - `e2e/ac-f004.6-details-preview-100-chars.test.ts`
    - `e2e/ac-f004.7-subagent-ordinary-rows.test.ts`
    - `e2e/ac-f004.20-subagent-column.test.ts`
    - `e2e/ac-f004.22-turn-subsections.test.ts`
    - `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts`
    - `e2e/ac-f006.5-cursor-subagent-start-task.test.ts`
    - `e2e/ac-f006.6-copilot-claude-omit-task.test.ts`
    - `e2e/ac-f006.7-observe-only-stop-and-task.test.ts`
    - `e2e/ac-f007.2-copilot-subagent-start-display-name.test.ts`
    - `e2e/ac-f007.3-copilot-subagent-stop-display-name.test.ts`
    - `e2e/ac-f007.4-omit-absent-agent-display-name.test.ts`
    - `e2e/ac-f007.5-cursor-claude-omit-agent-display-name.test.ts`
    - `e2e/ac-f007.6-agent-type-not-from-display-name.test.ts`
- [x] YAML body key `agent_type` → `subagent` (same position: after header, before `task` / `agent_display_name` / `response_text`). Do not expect YAML key `agent_type`
- [x] AC-F003.16: payload plants `subagent_type` — keys become header then `subagent`; still omit `reason` / `prompt` / `subagent_type` as YAML keys
- [x] Subagent cell: `agent_type: explore` → bare `explore`; Copilot display-name pair → still bare slug (not `agent_display_name:`). Fill the cell when that document’s YAML has `subagent`
- [x] AC-F004.7: do not assert YAML has no `subagent` key (that meant nested hierarchy). Assert no nested/indented child rows. YAML may have body `subagent`
- [x] AC-F004.6 / AC-F004.22: drop `agent_type:` prefix from Subagent/Details expected strings. Preview budget is the bare name
- [x] Keep AC titles. Do not spawn `.agents/hooks/index.mjs`

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F007/F008.
- Did not run `node --test e2e/*.test.ts` (planify only; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F008).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. Extend helpers only if needed.
- YAML and Markdown in tests are observed as text (split YAML on `---`, read keys in order; parse `normalized-fields.md` as text). No YAML library in e2e either. Duplicate small Markdown table helpers in the AC-F009.1 file; do not import `cli/src`.
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only. Copilot `sessionId` is not a F001 session identifier; cases that need YAML still include `session_id`.
- Do not add Cursor registrations or `.cmd` wrappers. F009 does not change `.cursor/hooks.json` (six events stay).
- Compact YAML header is current (`harness` / `event`; `session_id` only on the initial sessionStart; `turn` integer). Did **not** copy F007’s stale `source_harness` four-field header into Shared store wording.
- Shared store matches F003 compact header plus F009 `subagent` (cli sibling now exists).
- Step 7 updates existing e2e identity-key / Subagent-prefix asserts so `/verify` of F009 can stay green. New AC-F004.24 scenarios remain F004 implement-spec.
- Parent sets spec status to `planned` after both plans exist.
- AC-F009.1 mixes docs parse + one Cursor spawn in one file (two tests; same AC id), same as F007.1 mixing docs in one AC file.
- AC-F007.4 Copilot start fixture still plants `agentName: "explore"` and `agentType: "wrong"`. Expected YAML identity is now `subagent: "wrong"` (payload-key preference, not the Copilot-start column). Title kept.
- `e2e/ac-f004.22-turn-subsections.test.ts` already asserts Details omit `agent_type` and has no `agent_type:` expected strings; left as-is.
- Did not run `node --test e2e/*.test.ts` (e2e codify is compile/lint only). No e2e tsconfig/oxlint — typecheck and lint skipped.

---

> last updated: 2026-09-02T10:00:00Z
