---
spec-kind: functional
container: e2e
---
# F003-ingest-normalized-yaml - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional harness and event positionals. Persistence stays F001: verbatim Event log, Session index rules, exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation also appends one normalized JSON object to `{session_id}.jsonl` in that day’s folder (F010 Session JSONL log). Positionals are used for the compact JSON object header only; they are not written onto the Event log line. Compact headers stay as shipped: `harness` / `event`; `session_id` only on the initial session-start object. This amend (C001 / F010) does **not** change compact-header keys or Cursor registration. Product Cursor registration is already six events (`beforeSubmitPrompt` F005, `stop` F006). This F003 amend does **not** change `.cursor/hooks.json`. Do not add `.cmd` wrappers.

F010 owns format, filename `{session_id}.jsonl`, and serialization. F010 e2e already covers AC-F010.1–.8 (filename, `JSON.stringify` / `JSON.parse`, no yaml, third artifact, no session id). This plan does **not** duplicate those. F003 owns compact header, `session_id` only on the initial session-start, omit-absent / present-null, table-driven body, unmapped header-only, and the subagent-after-header exception (F009). Mapped records are F010 JSON objects, not YAML documents (AC-F003.18).

F009 persists identity as `subagent` (rename of `agent_type`) after the header on **every** JSON object when a matching payload attribute is present — including prompt, agent-stop, session start/end, and header-only unmapped objects (`harness` / `event` empty or unmatched). Other body fields stay table-driven for the event kind. Extraction, source-key preference, and the mapping-table rename are F009; this e2e plan does not duplicate those ACs. F003 still needs **its own** AC-F003.17-titled tests (do **not** rely on AC-F009.2 titles for F003 verify mapping). Omit-absent / present-null stay (present-null is JSON `null`).

This spec does not replace F001, F002, or F010. How `turn` is numbered is F008 and is out of scope here. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md) (YAML-era; not replanned this run). F010 e2e: [F010 e2e.plan.md](../F010-session-normalized-jsonl/e2e.plan.md)

Grounding (C001 / F010 amend/replan of F003 e2e; prior plan last updated 2026-09-02T10:20:00Z). Production already writes JSONL (F010).

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`) via existing `spawnIngest`. Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. **Do not break F001 or F002 spawn tests.** **Do not change the default `extraArgv` behavior.** JSONL helpers already exist (F010): `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords` (split lines + `JSON.parse`), `listJsonlSessionFiles` (day-folder `*.jsonl` excluding `events.jsonl`). YAML helpers (`sessionYamlPath`, `readSessionYaml`, `listYamlFiles`, `yamlDocuments`, `yamlMapping`, `yamlRawScalar`, `assertYamlIntegerTurn`) **stay** until later specs drop them. Do **not** add a helpers step. Retarget F003 spawn tests to `jsonlRecords` / `{session_id}.jsonl`. Key order via `Object.keys` on parsed objects. `turn` is a JSON number (`typeof === "number"`). No `---` documents. JSON `null` not YAML null. Do **not** treat quote-stripped YAML scalars as proof of type
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F003.17 — …`). Redo in place: keep existing `e2e/ac-f003.{13,14,15,4,5,6,16,17,9,10}-*.test.ts` paths (AC id in titles). New file: `e2e/ac-f003.18-mapped-record-is-jsonl-object.test.ts`. Drop authorizes **deleting** `e2e/ac-f003.1-*.test.ts`, `e2e/ac-f003.2-*.test.ts`, `e2e/ac-f003.7-*.test.ts`. Do **not** retitle F010 tests
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`). Identity row is `subagent` (not `agent_type`). Mapping table lists `subagent` only on subagent start/stop; F009 still persists it on every kind when a preferred payload key is present
- Do not register extra Cursor events. Do not spawn Copilot or Claude. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names
- When testing Copilot or Claude mapping, still put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F010.5; dropped AC-F003.7)
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Do **not** assert F008 turn numbering (incrementing, prompt-kind counting, or exact `0`). `turn` is a JSON number: `typeof === "number"` after parse
- Do **not** assert F009 preference order (`subagent_type` > `agent_type` > `agentType` > `agentName`) or trap-key non-mapping (`agentDisplayName` / `subagent_id` / `task`). Those stay AC-F009.3 / AC-F009.4. F003.17 only asserts: `subagent` after the header when a matching attribute is present (unmapped + kinds whose mapping row does not list `subagent`); omit when no preferred key; no other extra body field on unmapped
- Existing F009 file `e2e/ac-f009.2-subagent-on-every-event.test.ts` already covers every-event + unmapped `subagent` under **AC-F009.2** titles. F003 verify mapping must find **AC-F003.17** titles. Do not retitle F009 tests. Do not skip AC-F003.17 because F009 exists
- Do **not** duplicate F010 e2e: AC-F010.1 (same invocation / filename), AC-F010.2 (stringify / append-only bytes), AC-F010.3 (no yaml / planted yaml unread), AC-F010.4 (third artifact / events verbatim as format), AC-F010.5 (no session id), AC-F010.6 (compact-header smoke as F010 format), AC-F010.7 (concurrent JSONL completeness as F010 format), AC-F010.8 (ESM as F010). F003 scenarios below assert **mapping** on JSON objects already written as F010 JSONL
- Codify of e2e: compile/lint only; do not run `node --test e2e/*.test.ts` in this container’s later codify. Drop authorizes deleting the matching test file

### Shared store wording

> F001 / F002 wording stays as F001. The third artifact is the F010 Session JSONL log (not YAML). Compact-header keys `harness` / `event`; `session_id` only on the initial session-start object. `subagent` may follow the header on any object when a matching payload attribute is present. Sibling [cli.plan.md](./cli.plan.md) still names YAML (not replanned this run); this e2e plan uses Session JSONL log wording so it matches production and F010. Present-null is JSON `null`.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated session-log timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
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
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session JSONL log (AC-F010.5; not re-tested here).

**Session JSONL log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`

- Always a `.jsonl` file named for the F001 session identifier. One file per distinct identifier for that day. Format, filename, and serialization are F010; this spec maps each Event onto one JSON object in that file.
- Each line is one JSON object (`JSON.parse` of a `JSON.stringify` line). One new line per Event / per successful ingest that has a session identifier.
- Append-only: do not rewrite, reorder, or restructure previously written objects, including their `turn` values, whether they contain `session_id`, and whether they still have `agent_type`. Do not migrate old `source_harness` / `source_event` keys. Do not migrate old `agent_type` keys.
- When the payload has a session identifier: append exactly one JSON object in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the object). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing JSONL.
- When the payload has no session identifier: do not create or append a Session JSONL log (F010; AC-F010.5).
- Every object is an independent sequential event. Do not nest a subagent event under a parent. A scalar JSON key `subagent` after the header is identity (F009), not nesting.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log does not already contain a session-start object. Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior objects' `turn`. Prompt-kind is JSON `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id`, using those snake_case names, in table order — except `subagent`, which F009 may include after the header and before other body fields on any object when a matching payload attribute is present. Source keys for every other body field are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). `subagent` source attributes are F009 (not the F002 `harness` positional). New objects write `subagent`, not `agent_type`.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set — except `subagent` when a matching payload attribute is present (F009; AC-F003.17).
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null` (`=== null`, not the string `"null"`, not omitted). Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present (F009; AC-F003.17): five fields when initial session-start; four otherwise. Do not include any other extra body field on an unmapped object (`reason` / `prompt` / `agent_type` stay omitted).
- Node builtins only: no YAML library and no JSON library (`JSON.stringify` / `JSON.parse`).
- Do **not** write `{session_id}.yaml` for new ingests (F010; AC-F010.3 — not re-tested here except the thin AC-F003.18 no-`.yaml` check).

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) append one complete Session JSONL object line. No torn, concatenated, or invalid JSON; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the JSON object header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do not use `harness` to choose the `subagent` source key (F009).
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F003 registered the four F001 events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`). The product now also registers `beforeSubmitPrompt` (F005) and `stop` (F006). This F003 amend does **not** change `.cursor/hooks.json`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. JSON object mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn `cli/src/index.ts`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F003.13** — THE SYSTEM SHALL write header fields `harness` and `event` (not `source_harness` or `source_event`) on every new JSON object in the Session JSONL log, equal to the F002 ingest positionals as supplied (`ingest {harness} {event}`); WHEN a positional is omitted, that header field SHALL be the empty string; THE SYSTEM SHALL NOT infer harness or event from the payload.
- [x] **AC-F003.14** — WHEN the JSON object is the initial session-start for that session (`event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log does not already contain a session-start object), THE SYSTEM SHALL write `session_id` equal to the F001 session identifier used as the filename stem; WHEN the object is any other event (including prompt, stop, subagent, sessionEnd, a later or duplicate sessionStart, header-only unmapped, or when the first event for the session is not session-start), THE SYSTEM SHALL omit `session_id`; WHEN the first event for a session is not session-start, THE SYSTEM SHALL write `session_id` on no object; THE SYSTEM SHALL NOT rewrite previously written objects to strip or add `session_id`.
- [x] **AC-F003.15** — WHEN the JSON object is the initial session-start (has `session_id`), THE SYSTEM SHALL start the object with `session_id`, `harness`, `event`, `timestamp`, and `turn` in that order; WHEN the object is any other object (no `session_id`), THE SYSTEM SHALL start the object with `harness`, `event`, `timestamp`, and `turn` in that order.
- [x] **AC-F003.4** — WHEN the payload includes its own `timestamp`, THE SYSTEM SHALL write `timestamp` as that instant in host-local `HH:MM:SS`. WHEN it does not, THE SYSTEM SHALL write a generated host-local `HH:MM:SS` from receive time and SHALL NOT add that value to the Event log line.
- [x] **AC-F003.5** — THE SYSTEM SHALL include in the body of the JSON object only the normalized common fields for the event kind in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), mapped from the harness-specific source keys for `harness` and `event`, in table order, omitting absent keys and emitting JSON `null` for present nulls; THE SYSTEM SHALL NOT include fields outside that set, except `subagent` when a matching payload attribute is present (F009; AC-F003.17).
- [x] **AC-F003.6** — THE SYSTEM SHALL write every JSON object as an independent sequential event (no nesting of subagent events under a parent).
- [x] **AC-F003.16** — WHEN `harness` or `event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a JSON object that contains the header fields only, except `subagent` when a matching payload attribute is present (F009; AC-F003.17): five fields (`session_id`, `harness`, `event`, `timestamp`, `turn`) WHEN the object is the initial session-start; four fields (`harness`, `event`, `timestamp`, `turn`) WHEN it is any other object; THE SYSTEM SHALL NOT include any other extra body field on that object.
- [x] **AC-F003.17** — WHEN the payload has a matching `subagent` source attribute (F009), THE SYSTEM SHALL include `subagent` after the header of that JSON object, including WHEN `harness` or `event` is empty or does not match a mapping row and column, and including WHEN the event-kind mapping row does not list `subagent`; THE SYSTEM SHALL NOT include any other body field that the event-kind mapping does not list on that basis; WHEN no matching `subagent` source attribute is present, THE SYSTEM SHALL omit `subagent`.
- [x] **AC-F003.9** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete JSONL records and SHALL keep the Event log and Session index valid as F001 (no torn, concatenated, or duplicated records).
- [x] **AC-F003.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.
- [x] **AC-F003.18** — THE SYSTEM SHALL map each ingested event that belongs to a session identifier to one F010 Session JSONL log object (not a YAML document); header and body mapping in this spec apply to that JSON object. Format, filename, and serialization remain F010.

Deprecated (not under test): **AC-F003.1** (same invocation writes `{session_id}.yaml`; replaced by AC-F010.1); **AC-F003.2** (multi-document YAML `---`; replaced by AC-F010.2); **AC-F003.7** (no session id → no YAML; replaced by AC-F010.5); **AC-F003.3** (four-field header; replaced by AC-F003.11); **AC-F003.8** (four-field header-only unmapped; replaced by AC-F003.12); **AC-F003.11** (five-field header with `session_id` / `source_harness` / `source_event` on every document; replaced by AC-F003.13, AC-F003.14, AC-F003.15); **AC-F003.12** (five-field header-only unmapped; replaced by AC-F003.16).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F003.1 — Same invocation writes Event log, Session index, and one YAML document | drop | deprecated YAML serialization; F010.1 owns three artifacts / `{session_id}.jsonl`. Delete `e2e/ac-f003.1-*.test.ts` |
| AC-F003.2 — YAML file is append-only multi-document with `---` per document | drop | deprecated `---` YAML; F010.2 owns JSONL append-only. Delete `e2e/ac-f003.2-*.test.ts` |
| AC-F003.3 — Document header is session_id, source_harness, source_event, timestamp | drop | deprecated; files already gone |
| AC-F003.11 — Document header is session_id, source_harness, source_event, timestamp, turn | drop | deprecated; files already gone |
| AC-F003.13 — Header keys are harness and event; empty when omitted; not inferred | redo | AC text is JSON object / Session JSONL log; retarget to `jsonlRecords` / `{session_id}.jsonl` |
| AC-F003.14 — session_id only on the initial session-start document | redo | same five cases on JSON objects; snapshot first-line bytes not YAML document text |
| AC-F003.15 — Header field order is five vs four | redo | `Object.keys` on parsed objects; `turn` is `typeof === "number"` (not `assertYamlIntegerTurn`) |
| AC-F003.4 — Payload timestamp formatted local HH:MM:SS; generated time not on Event log | redo | keep timestamp behavior; retarget file to `jsonlRecords` / `{session_id}.jsonl` |
| AC-F003.5 — YAML body only mapped normalized fields (omit absent, null stays null) | redo | body on JSON objects; present-null is JSON `null`; keep seven spawn cases |
| AC-F003.6 — Subagent event is a sibling document, not nested | redo | sibling sequential JSON objects (no `---` / indent); scalar `subagent` is identity |
| AC-F003.7 — No session identifier: F001 persist, no YAML file | drop | deprecated; F010.5 owns no-session-id. Delete `e2e/ac-f003.7-*.test.ts` |
| AC-F003.8 — Unrecognized harness/event: header-only YAML document | drop | deprecated; files already gone |
| AC-F003.12 — Unrecognized harness/event: five-field header-only YAML document | drop | deprecated; files already gone |
| AC-F003.16 — Unrecognized harness/event: five- vs four-field header-only YAML document | redo | header-only JSON object except `subagent`; `Object.keys`; JSON number `turn` |
| AC-F003.17 — subagent after header on unmapped and on kinds that do not list it | redo | same five cases on JSON objects; omit-when-absent via missing key not YAML text |
| AC-F003.9 — Repeated/concurrent ingest: complete YAML docs; Event log and index stay valid | redo | complete JSONL records (`JSON.parse`); keep AC-F003.9 titles; do not retitle F010.7 |
| AC-F003.10 — Existing Node ESM ingest, no extra runtime dependencies | redo | keep ESM/no-deps; assert `{session_id}.jsonl` present, not `.yaml` |

New scenario (not in the prior plan): **AC-F003.18** (mapped records are F010 JSON objects, not YAML documents). New file `e2e/ac-f003.18-mapped-record-is-jsonl-object.test.ts`. One spawn. Do not duplicate F010.1–.8.

## Implementation Steps

### Step 1: AC-F003.13 — Header keys are harness and event; empty when omitted; not inferred
Redo in place (`e2e/ac-f003.13-yaml-header-harness-event.test.ts`; keep `AC-F003.13` in every title). Spawn ingest with both positionals, and again with neither → every new JSON object has `harness` and `event` (not `source_harness` or `source_event`) equal to the F002 argv as supplied. Empty string when omitted. Do not infer from the payload. Do not assert `session_id` presence (AC-F003.14) or five-vs-four field order (AC-F003.15). Do not assert F008 numbering. Do not duplicate F010.6 compact-header smoke. Verifies AC-F003.13.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.13-yaml-header-harness-event.test.ts`
- [x] Arrange: do **not** change `spawnIngest` default extraArgv. Reuse `sessionJsonlPath` / `readSessionJsonl` / `jsonlRecords`. Parse with `jsonlRecords` then property access (not `yamlDocuments` / `yamlMapping`). Two isolated fixtures. Case A — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-13-both"` and `hook_event_name` `"sessionEnd"` so inference from the payload would disagree. Case B — no extra argv (omit `extraArgv`); payload `session_id` `"sess-ac-f003-13-neither"` and `hook_event_name` `"sessionStart"`. Empty positional → JSON empty string `""`
- [x] Act: spawn both cases (each title includes `AC-F003.13`)
- [x] Assert: both `exitCode === 0`; stdout empty. Neither object has keys `source_harness` or `source_event`. Case A: filename stem `sess-ac-f003-13-both` (`path.basename(..., ".jsonl")`); `harness` is `cursor`; `event` is `sessionStart` (not `sessionEnd`). Case B: filename stem `sess-ac-f003-13-neither`; `harness` and `event` are `""` (not inferred from `hook_event_name`). Event log line still has no overlay from argv and no `turn` key (AC-F003.13)

---

### Step 2: AC-F003.14 — session_id only on the initial session-start object
Redo in place (`e2e/ac-f003.14-session-id-initial-session-start.test.ts`; keep `AC-F003.14` in every title). `session_id` on the JSON object only when this is the initial session-start (`event` is `sessionStart` or `SessionStart` and that session’s JSONL log does not already contain a session-start object). Value is the F001 identifier (filename stem). Omit on every other object. When the first event for a session is not session-start, no object gets `session_id`. Second `sessionStart` omits. Do not rewrite prior objects to strip or add `session_id` (first-line bytes unchanged). Do not assert F008 numbering. Do not duplicate F010.6 cases 1–3 beyond F003.14’s five mapping cases. Verifies AC-F003.14.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.14-session-id-initial-session-start.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`. Reuse `sessionJsonlPath` / `readSessionJsonl` / `jsonlRecords`. Do not change `spawnIngest` default extraArgv. Snapshot first-line bytes (utf8 prefix / first record line), not YAML document text. Cases (each title includes `AC-F003.14`):
    1. Initial Cursor `sessionStart` — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-14-initial"`
    2. Initial Claude `SessionStart` alias — extra argv `["claude-code", "SessionStart"]`; payload `session_id` `"sess-ac-f003-14-alias"` (do not spawn a Claude process)
    3. Later events omit — after case 1’s file exists, spawn `sessionEnd`, then `beforeSubmitPrompt`, then `subagentStart` for the same identifier (snapshot the first line before those appends)
    4. Second `sessionStart` omits — extra argv `["cursor", "sessionStart"]` twice for `"sess-ac-f003-14-dup"`; snapshot the first line after the first spawn
    5. First event is not session-start — extra argv `["cursor", "sessionEnd"]` then `["cursor", "sessionStart"]` for `"sess-ac-f003-14-abrupt"` (no prior JSONL)
- [x] Act: spawn each case (do not import `cli/src/**`)
- [x] Assert: cases 1–2: exactly one `jsonlRecords` object; `session_id` equals the filename stem; file is `{session_id}.jsonl`. Case 3: first line bytes unchanged and first object still has `session_id`; later objects omit `session_id`. Case 4: first object has `session_id` and first line is unchanged; second object omits `session_id`. Case 5: both objects omit `session_id`; filename stem is still `sess-ac-f003-14-abrupt` (AC-F003.14)

---

### Step 3: AC-F003.15 — Header field order is five vs four
Redo in place (`e2e/ac-f003.15-header-field-order.test.ts`; keep `AC-F003.15` in every title). Initial session-start (has `session_id`) starts with `session_id`, `harness`, `event`, `timestamp`, `turn`. Every other object starts with `harness`, `event`, `timestamp`, `turn`. `turn` is a JSON number (`typeof === "number"`). `subagent` is not a header field (it would appear after `turn`). Do not assert F008 numbering. Do not use `assertYamlIntegerTurn`. Verifies AC-F003.15.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.15-header-field-order.test.ts`
- [x] Arrange: two isolated fixtures. Parse with `jsonlRecords` then `Object.keys` (insertion order). Case A — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-15-start"`. Case B — extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f003-15-other"` (first event is not session-start, so no `session_id` on the object)
- [x] Act: spawn both cases (each title includes `AC-F003.15`)
- [x] Assert: both `exitCode === 0`; stdout empty. Case A: first five keys `session_id`, `harness`, `event`, `timestamp`, `turn`; `typeof turn === "number"`. Case B: first four keys `harness`, `event`, `timestamp`, `turn`; no `session_id` key; `typeof turn === "number"` (AC-F003.15)

---

### Step 4: AC-F003.4 — Payload timestamp formatted local HH:MM:SS; generated time not on Event log
Redo file target in place (`e2e/ac-f003.4-timestamp-hhmmss.test.ts`; keep `AC-F003.4` in every title). Keep timestamp behavior. Spawn ingest with a payload `timestamp`, and again without → JSON object `timestamp` is host-local zero-padded `HH:MM:SS`. A generated value is not written onto the Event log line. Verifies AC-F003.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.4-timestamp-hhmmss.test.ts`
- [x] Arrange: keep the existing three isolated fixtures and payloads (Unix-ms, ISO string, absent); extra argv `["cursor", "sessionStart"]` each. Read `timestamp` from `jsonlRecords` of `{session_id}.jsonl` (replace `readYamlTimestamp` / `yamlDocuments` / `yamlMapping`)
- [x] Act: spawn all three cases (each title includes `AC-F003.4`)
- [x] Assert: formatted instant vs generated receive time; Event log line unchanged (AC-F003.4)

---

### Step 5: AC-F003.5 — JSON object body only mapped normalized fields (omit absent, JSON null)
Redo in place (`e2e/ac-f003.5-normalized-body-fields.test.ts`; keep `AC-F003.5` in every title). Same seven spawn cases. Parse with `jsonlRecords` + `Object.keys`. Identity key is `subagent` (not `agent_type`). Body stays table-driven for the event kind. Present-null of a mapped source key is JSON `null` (`=== null`, not omitted, not `"null"`). The F009 exception (`subagent` on kinds whose mapping row does not list it, and on unmapped objects) is **AC-F003.17**, not this file — do not add those cases here. `bodyKeys` must not treat `session_id` or `turn` as body. Do not treat key `subagent` as an illegal extra on subagent start/stop (the mapping table lists it). Do not assert F008 numbering. Do not duplicate F010.6 case 5 (`subagent: null`) — use mapped `task: null` for present-null. Verifies AC-F003.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.5-normalized-body-fields.test.ts`
- [x] Arrange: keep the existing seven isolated fixtures and argv/payloads, except case 4 adds mapped `task: null`. In `spawnCase`, assert header prefix `harness`, `event`, `timestamp`, `turn` (four keys) except Cursor `sessionStart` (case 7), which is `session_id`, `harness`, `event`, `timestamp`, `turn` (five keys). `bodyKeys` is `Object.keys(record).slice(4)` for four-key headers and `.slice(5)` for the session-start case. No `source_harness` / `source_event` keys. No key `agent_type`. Filename checks use `sessionJsonlPath` / `.jsonl` (not `sessionYamlPath`). Do not add F008 numbering asserts. Do not spawn Copilot or Claude processes; pass mapping names on argv. Do not change `.cursor/hooks.json`. Do not change `spawnIngest` default extraArgv. Cases (each title includes `AC-F003.5`):
    1. Cursor session end — four-key header; body key `reason` only (no `subagent_type` in payload)
    2. Cursor subagent start — four-key header; body keys in table order (`subagent`, then `task`); extras / `transcript_path` / `subagent_id` / payload key `subagent_type` absent from the object
    3. Absent key omitted — four-key header; no `reason` in body
    4. Present null — four-key header; payload `subagent_type` `"explore"`, `task` `null`, `transcript_path` `null`; `subagent` present; `task === null` (JSON `null`); `transcript_path` omitted (not in the mapping set / F005). Retitle off `omitted from YAML`
    5. Prompt mapping without registering the event — four-key header; body key `prompt` only (no `subagent_type` in payload)
    6. Copilot subagent stop mapping via argv — four-key header; body keys in table order (`subagent`, `response_text`); Copilot `sessionId` is not the filename; omit `session_id` on the object; basename of `{session_id}.jsonl` is `sess-ac-f003-5-copilot-stop`
    7. Cursor session start — five-key header including `session_id`; object is header-only after those five keys (payload has no preferred `subagent` key); extras such as `composer_mode` absent from the object
- [x] Act: spawn each case (do not import `cli/src/**`)
- [x] Assert: body keys are the mapped snake_case names in table order after the compact header; omitted when the source key is absent; mapped present-null is JSON `null`; no field outside that set except the mapping-table `subagent` on start/stop; Event log line remains verbatim including extras and source keys (`subagent_type` / `agentType` / `transcript_path`); `turn` is not in the body slice; JSON key is `subagent` not `agent_type` (AC-F003.5)

---

### Step 6: AC-F003.6 — Subagent event is a sibling JSON object, not nested
Redo in place (`e2e/ac-f003.6-subagent-sibling-document.test.ts`; keep `AC-F003.6` in every title). Spawn a session-start ingest then a subagent-start ingest that share a F001 session identifier → two independent sequential JSON objects; the subagent event is not nested under the parent. First object is initial session-start (five-key header including `session_id`). Second object omits `session_id` (four-key header `harness`, `event`, `timestamp`, `turn`). Scalar JSON `subagent` on the second object is identity (F009), not a nested object. No `---` documents. Do not assert F008 numbering. Verifies AC-F003.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.6-subagent-sibling-document.test.ts`
- [x] Arrange: keep the existing fixture and payloads (`session_id` then `parent_conversation_id` `"sess-ac-f003-6"`). Parse `{session_id}.jsonl` with `jsonlRecords` + `Object.keys`. First object keys.slice(0, 5) = `session_id`, `harness`, `event`, `timestamp`, `turn`; second object keys.slice(0, 4) = `harness`, `event`, `timestamp`, `turn` and no `session_id` key. Do not nest under `children` / `events`. No `source_harness` / `source_event`. Drop `assertUnindented` / `startsWith("---")`
- [x] Act: spawn ingest twice in order (title includes `AC-F003.6`)
- [x] Assert: `{dayFolder}/sess-ac-f003-6.jsonl` has exactly two `jsonlRecords`; each is a plain object (not array, not null); first starts with `session_id`, `harness`, `event`, `timestamp`, `turn`; second starts with `harness`, `event`, `timestamp`, `turn`; second object `event` is `subagentStart`; `subagent` is `"explore"` (string, not nested); no nested object under the first record. Event log has two verbatim lines; Session index is `["sess-ac-f003-6"]` (AC-F003.6). Do not assert turn incrementing between the two objects

---

### Step 7: AC-F003.16 — Unrecognized harness/event: header then optional subagent
Redo in place (`e2e/ac-f003.16-unrecognized-header-only.test.ts`; keep `AC-F003.16` in every title). Spawn ingest with unrecognized positionals and a F001 session identifier → a JSON object is still appended. Header is five fields when that object is the initial session-start; four otherwise. Payload already includes `subagent_type` plus traps (`reason`, `prompt`) that would map if the event were recognized. After the header, `subagent` is present (F009 exception); no other extra body field (`reason` / `prompt` / `agent_type` / payload key `subagent_type`). `turn` is a JSON number. Do not assert F008 numbering. Do not rely on AC-F009.2 titles. Verifies AC-F003.16.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.16-unrecognized-header-only.test.ts`
- [x] Arrange: isolated fixtures; stdin JSON object with `session_id`, `reason`, `prompt`, and `subagent_type` `"explore"`. Case A — extra argv `["unknown-harness", "sessionStart"]` (unmapped harness, initial session-start). Case B — extra argv `["unknown-harness", "notAnEvent"]` (unmapped, not session-start). Case C — extra argv `["cursor", "notAnEvent"]` (known harness, unknown event). Parse with `jsonlRecords` + `Object.keys`. `typeof turn === "number"`. Do not change `spawnIngest` default extraArgv. Drop `assertYamlIntegerTurn` / `startsWith("---")`
- [x] Act: spawn ingest (each title includes `AC-F003.16`)
- [x] Assert: each `exitCode === 0`; stdout empty; Event log line deep-equals stdin (extras kept on JSONL; no `turn` / `subagent` overlay on the Event log line); `{session_id}.jsonl` exists with exactly one object; no `reason` / `prompt` / `agent_type` / other extra body keys. After the compact header, key `subagent` is `"explore"`. Case A: first five keys `session_id`, `harness`, `event`, `timestamp`, `turn` then `subagent`; `harness` is `unknown-harness`; `event` is `sessionStart`; `typeof turn === "number"`. Cases B and C: first four keys `harness`, `event`, `timestamp`, `turn` then `subagent`; no `session_id` key; `typeof turn === "number"` (AC-F003.16)

---

### Step 8: AC-F003.17 — subagent after header on unmapped and on kinds that do not list it
Redo in place (`e2e/ac-f003.17-subagent-on-unmapped-and-every-kind.test.ts`; keep `AC-F003.17` in every title). Matching preferred key present → `subagent` immediately after the compact header on unmapped/unknown events and on event kinds whose mapping row does **not** list `subagent` (`stop`, `sessionStart`). Traps `reason` / `prompt` stay omitted on unmapped. No preferred key → omit `subagent`. Do **not** retitle or depend on `e2e/ac-f009.2-subagent-on-every-event.test.ts`. Do not assert F009 preference order or trap-key non-mapping. Do not assert F008 numbering. Do not assert F004 Subagent column. Each test title includes `AC-F003.17`. Verifies AC-F003.17.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.17-subagent-on-unmapped-and-every-kind.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`. Parse with `jsonlRecords` + `Object.keys` (not `yamlDocuments` / `yamlMapping`). Each case includes a F001 `session_id` (not Copilot `sessionId` alone). Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not spawn Copilot or Claude processes. Do not change `spawnIngest` default extra argv. Cases (each title includes `AC-F003.17`):
    1. Unmapped unknown event — extra argv `["cursor", "notAnEvent"]`; payload `session_id` `"sess-ac-f003-17-unknown"`, `subagent_type` `"explore"`, traps `reason` `"completed"`, `prompt` `"hello"`
    2. Unmapped empty extraArgv — omit `extraArgv` (default none); payload `session_id` `"sess-ac-f003-17-empty-argv"`, `subagent_type` `"explore"`, traps `reason` `"completed"`, `prompt` `"hello"`
    3. `stop` (mapping row does not list `subagent`) — extra argv `["cursor", "stop"]`; payload `session_id` `"sess-ac-f003-17-stop"`, `subagent_type` `"explore"`
    4. `sessionStart` (mapping row does not list `subagent`) — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-17-start"`, `subagent_type` `"explore"`
    5. No preferred key — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-17-omit"` only (no `subagent_type` / `agent_type` / `agentType` / `agentName`)
- [x] Act: spawn each case via `spawnIngest` → `cli/src/index.ts` (each title includes `AC-F003.17`)
- [x] Assert: all `exitCode === 0`; stdout empty. Compact header (not `source_harness` / `source_event`). `"agent_type"` is not a JSON key. Cases 1–2: four-key header `harness`, `event`, `timestamp`, `turn` then `subagent`; `subagent` is `"explore"`; traps `reason` / `prompt` absent; case 1 `event` is `notAnEvent`; case 2 `harness` and `event` are `""`. Case 3: four-key header then `subagent`; body is `subagent` only; `event` is `stop`. Case 4: five-key header `session_id`, `harness`, `event`, `timestamp`, `turn` then `subagent`; `subagent` is `"explore"`; no other body keys; `event` is `sessionStart`. Case 5: object does **not** have key `subagent`; five-field header only. Event log line remains verbatim (AC-F003.17)

---

### Step 9: AC-F003.9 — Repeated/concurrent ingest: complete JSONL records; Event log and index stay valid
Redo in place (`e2e/ac-f003.9-concurrent-yaml-complete.test.ts`; keep `AC-F003.9` in every title). Two overlapping ingest processes plus a sequential repeat → complete Session JSONL records (each `JSON.parse`s to one object); Event log and Session index stay valid as F001. Same overlap pattern as `e2e/ac-f001.5-concurrent-persist.test.ts`. Complete records use compact keys: five-field header on the initial `sessionStart` for `concurrent-a`; four-field on the later `sessionStart` repeat and on `concurrent-b` (`sessionEnd`). Do not assert F008 numbering. Do **not** retitle `e2e/ac-f010.7-concurrent-jsonl-complete.test.ts`. Verifies AC-F003.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.9-concurrent-yaml-complete.test.ts`
- [x] Arrange: keep the existing fixture, payloads (`concurrent-a` / `concurrent-b`), and `Promise.all` overlap then sequential repeat. Parse with `jsonlRecords`. Header is either `session_id`, `harness`, `event`, `timestamp`, `turn` (initial session-start only) or `harness`, `event`, `timestamp`, `turn` (every other). No `source_harness` / `source_event`. Drop `---` / `yamlDocuments`. Do not import `cli/src/**`
- [x] Act: spawn two children so their writes overlap (`Promise.all`); then spawn a sequential third with payload A (title includes `AC-F003.9`)
- [x] Assert: all three `exitCode === 0` and stdout empty; `events.jsonl` has exactly three complete parseable object lines (no torn, concatenated, or interleaved fragments); `sessions.json` is a JSON array of unique identifiers (two ids, no duplicate of `"concurrent-a"`); `concurrent-a.jsonl` has exactly two complete `jsonlRecords` and `concurrent-b.jsonl` has exactly one; every session-log record is one object; the first `concurrent-a` object may include `session_id`; the second `concurrent-a` object (repeat `sessionStart`) and the `concurrent-b` object omit `session_id` (AC-F003.9)

---

### Step 10: AC-F003.10 — Existing Node ESM ingest, no extra runtime dependencies
Redo file target in place (`e2e/ac-f003.10-existing-esm-ingest.test.ts`; keep `AC-F003.10` in every title). Keep ESM/no-deps behavior. Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty, no new binary. Session log artifact is `{session_id}.jsonl` (not `.yaml`). Do not duplicate F010.8 beyond this F003.10 smoke. Verifies AC-F003.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.10-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [x] Arrange: load `cli/package.json`; isolated fixture for the spawn smoke. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML or JSON library. Do not register extra Cursor events. Do not modify untracked `cli/package.json` / `cli/scripts/build.ts` as part of this plan. Reuse `readSessionJsonl` / `jsonlRecords` / `sessionJsonlPath`. Drop `readSessionYaml` / `yamlDocuments` / `startsWith("---")`
- [x] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionStart` (title includes `AC-F003.10`)
- [x] Assert: `"type": "module"`; `"dependencies": {}`; `engines.node` starts with `>=24`; Event log + Session index + `{session_id}.jsonl` present with `jsonlRecords` length 1; `{session_id}.yaml` is not present (AC-F003.10)

---

### Step 11: AC-F003.18 — Mapped record is one F010 JSON object, not a YAML document
New. One spawn: `sessionStart` writes a parseable JSON object in `{session_id}.jsonl` and does not write `{session_id}.yaml`. Header and body mapping in this spec apply to that JSON object. Do **not** re-test F010.1 three-artifact same-invocation, F010.2 stringify/append-only, F010.3 planted-yaml unread, or F010.4 third-artifact vs `events.jsonl`. Each test title includes `AC-F003.18`. Verifies AC-F003.18.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.18-mapped-record-is-jsonl-object.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`; extra argv `["cursor", "sessionStart"]`; stdin one JSON object with `session_id` `"sess-ac-f003-18"`. Reuse `sessionJsonlPath` / `readSessionJsonl` / `jsonlRecords` / `sessionYamlPath` / `listYamlFiles`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not change `spawnIngest` default extraArgv. Do not plant a prior `.yaml`
- [x] Act: spawn `node cli/src/index.ts ingest cursor sessionStart` once (title includes `AC-F003.18`)
- [x] Assert: `exitCode === 0`; stdout empty; `{session_id}.jsonl` exists; `jsonlRecords` length 1; that record is one JSON object (`typeof` object, not array, not null); `{session_id}.yaml` does not exist; `listYamlFiles` is `[]` (AC-F003.18)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md).
- Did not run `node --test e2e/*.test.ts` (planify must not; e2e codify: compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001/F002).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. YAML helpers stay on `e2e/spawn.ts` until all specs drop them. JSONL helpers already exist (F010); no helper step.
- JSONL in tests is observed with Node `JSON.parse` / `JSON.stringify` (split lines via `jsonlRecords`). Key order via `Object.keys`. No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude. Copilot/Claude mapping is exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier; Copilot mapping cases still include `session_id` (or `conversation_id` / `parent_conversation_id`) so a JSONL file is created.
- Do not change `.cursor/hooks.json` (already six events from F005/F006). Do not register extra Cursor events. Prompt and agent-stop mapping are spawned as ingest extra argv only.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- How `turn` is numbered is F008. Assert JSON number only (`typeof === "number"` after parse). Do not assert exact `0`, incrementing, or prompt-kind counting. Do not use `assertYamlIntegerTurn` in F003 tests.
- Do not assert F009 preference order or trap-key non-mapping in F003 titles. AC-F009.2 already covers every-event + unmapped under F009 titles; F003 still owns AC-F003.17-titled tests.
- Do not duplicate F010 e2e AC-F010.1–.8. Do not retitle F010 tests.
- Drop authorizes deleting `e2e/ac-f003.1-same-invocation-three-artifacts.test.ts`, `e2e/ac-f003.2-append-only-multidoc-yaml.test.ts`, `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`.
- Left spec status `pending` (do not change status this run). Did not edit `spec.md`. Sibling `cli.plan.md` is not replanned this run (still YAML-era wording).

---

> last updated: 2026-09-02T15:30:00Z
