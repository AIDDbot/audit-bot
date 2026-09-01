---
spec-kind: functional
container: e2e
---
# F003-ingest-normalized-yaml - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals. Persistence stays F001: verbatim Event log, Session index rules, exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation also appends one normalized YAML document to `{session_id}.yaml` in that day’s folder. Source arguments are used for the YAML header only; they are not written onto the Event log line. This F008 amend adds integer `turn` as the fifth YAML header field. Product Cursor registration is already six events (`beforeSubmitPrompt` F005, `stop` F006). This F003 amend does **not** change `.cursor/hooks.json`. Do not add `.cmd` wrappers.

This spec does not replace F001 or F002. How `turn` is numbered is F008 and is out of scope here. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (F008 amend/replan of F003 e2e; prior plan last updated 2026-09-01T09:50:00Z):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. **Do not break F001 or F002 spawn tests.** **Do not change the default `extraArgv` behavior.** Existing YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`) stay. `yamlMapping` strips quotes, so `turn: 0` and `turn: "0"` both become `"0"` — extend only if needed to read an **unquoted** integer `turn` (see Step 3)
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. Parse YAML as text. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F003.11 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not register extra Cursor events. Do not spawn Copilot or Claude. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names
- When testing Copilot or Claude mapping, still put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F003.7)
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- This amend’s e2e for AC-F003.11 / AC-F003.12 must assert: fifth key is `turn`; value is a YAML integer (unquoted decimal, match `/^-?\d+$/`; must **not** be a quoted string). Do **not** assert incrementing, prompt-kind counting, or turn 1 on prompts (F008). Prefer `/^-?\d+$/` over exact `0` so F008 numbering later does not break these tests. This F003 amend implementation may pass `turn: 0` until F008
- Codify of e2e: compile/lint only; do not run `node --test e2e/*.test.ts` in this container’s codify

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. Concurrency now covers the YAML append. Argv now passes harness/event into ingest for YAML only. Session YAML log header is five fields including integer `turn`.

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

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session YAML log.

**Session YAML log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml`

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008; not a body field). This spec requires the field, its order, and that it is a YAML integer. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the five header fields only.
- Node builtins only: no YAML library.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F003 registered the four F001 events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`). The product now also registers `beforeSubmitPrompt` (F005) and `stop` (F006). This F003 amend does **not** change `.cursor/hooks.json`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. YAML mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F003.1** — WHEN ingest receives a JSON object that has a session identifier, THE SYSTEM SHALL, in that same invocation, append the Event log line and update the Session index as F001, and SHALL append exactly one YAML document to `{session_id}.yaml` inside the folder named for the current date, using the in-memory event (no second process; no re-read of files just written).
- [x] **AC-F003.2** — THE SYSTEM SHALL write each Session YAML log as multi-document YAML with documents separated by `---`, SHALL begin each appended document with `---`, and SHALL NOT rewrite or restructure previously written documents in that file.
- [x] **AC-F003.11** — THE SYSTEM SHALL start every YAML document with `session_id`, `source_harness`, `source_event`, `timestamp`, and `turn` in that order, where `session_id` equals the F001 session identifier (and the filename stem), `source_harness` / `source_event` equal the F002 positionals (empty string when omitted), and `turn` is a YAML integer (F008).
- [x] **AC-F003.4** — WHEN the payload includes its own `timestamp`, THE SYSTEM SHALL write `timestamp` as that instant in host-local `HH:MM:SS`. WHEN it does not, THE SYSTEM SHALL write a generated host-local `HH:MM:SS` from receive time and SHALL NOT add that value to the Event log line.
- [x] **AC-F003.5** — THE SYSTEM SHALL include in the YAML body only the normalized common fields for the event kind in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), mapped from the harness-specific source keys for `source_harness` and `source_event`, in table order, omitting absent keys and emitting YAML `null` for present nulls; THE SYSTEM SHALL NOT include fields outside that set.
- [x] **AC-F003.6** — THE SYSTEM SHALL write every YAML document as an independent sequential event (no nesting of subagent events under a parent).
- [x] **AC-F003.7** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create or append a Session YAML log.
- [x] **AC-F003.12** — WHEN `source_harness` or `source_event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a YAML document that contains the five header fields only.
- [x] **AC-F003.9** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete YAML documents and SHALL keep the Event log and Session index valid as F001 (no torn, concatenated, or duplicated records).
- [x] **AC-F003.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

Deprecated (not under test): **AC-F003.3** (four-field header; replaced by AC-F003.11); **AC-F003.8** (four-field header-only unmapped; replaced by AC-F003.12).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F003.1 — Same invocation writes Event log, Session index, and one YAML document | keep | still three artifacts in one invocation; does not slice header keys |
| AC-F003.2 — YAML file is append-only multi-document with `---` per document | keep | still append-only multi-doc `---`; snapshot of first document still covers `turn` not being rewritten |
| AC-F003.3 — Document header is session_id, source_harness, source_event, timestamp | drop | retired; five-field header is AC-F003.11. Replace `e2e/ac-f003.3-yaml-document-header.test.ts` |
| AC-F003.4 — Payload timestamp formatted local HH:MM:SS; generated time not on Event log | keep | timestamp unchanged; does not slice header keys |
| AC-F003.5 — YAML body only mapped normalized fields (omit absent, null stays null) | redo | body mapping unchanged (current `normalized-fields.md`), but `spawnCase` slices first four keys and `bodyKeys` is `keys.slice(4)` — `turn` would be treated as a body field |
| AC-F003.6 — Subagent event is a sibling document, not nested | redo | asserts unindented four header keys; header keys now include `turn` |
| AC-F003.7 — No session identifier: F001 persist, no YAML file | keep | no session id → no YAML |
| AC-F003.8 — Unrecognized harness/event: header-only YAML document | drop | retired; unmapped five-field header is AC-F003.12. Replace `e2e/ac-f003.8-unrecognized-header-only.test.ts` |
| AC-F003.9 — Repeated/concurrent ingest: complete YAML docs; Event log and index stay valid | redo | complete docs currently assert four header keys; must include five |
| AC-F003.10 — Existing Node ESM ingest, no extra runtime dependencies | keep | existing ESM ingest, no deps; does not slice header keys |

New scenarios (not in the prior plan): **AC-F003.11** (five-field header including YAML integer `turn`); **AC-F003.12** (unmapped document is five header fields only).

## Implementation Steps

### Step 1: AC-F003.1 — Same invocation writes Event log, Session index, and one YAML document
Keep. Spawn ingest once as `ingest cursor sessionStart` with a JSON object that has a session identifier → F001 persist plus exactly one YAML document in `{session_id}.yaml` in the dated folder. One process, one invocation. Does not assert header key count. Verifies AC-F003.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.1-same-invocation-three-artifacts.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`; stdin one JSON object with `session_id`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`
- [x] Act: spawn `node cli/src/index.ts ingest cursor sessionStart` (title includes `AC-F003.1`)
- [x] Assert: `exitCode === 0`; stdout empty; Event log + Session index + exactly one YAML document beginning with `---` (AC-F003.1)

---

### Step 2: AC-F003.2 — YAML file is append-only multi-document with `---` per document
Keep. Two sequential ingests for the same session identifier → multi-document YAML; each appended document begins with `---`; the first document is unchanged after the second append (including its `turn`). Verifies AC-F003.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.2-append-only-multidoc-yaml.test.ts`
- [x] Arrange: isolated fixture; same `session_id`; snapshot first document after first spawn
- [x] Act: spawn ingest twice in order (each title includes `AC-F003.2`)
- [x] Assert: two documents each beginning with `---`; first document text byte-identical to the snapshot (AC-F003.2)

---

### Step 3: AC-F003.11 — Document header is session_id, source_harness, source_event, timestamp, turn
New (replaces dropped AC-F003.3). Spawn ingest with both positionals, and again with neither → every YAML document starts with those five keys in that order. Header `session_id` equals the F001 identifier and the filename stem. Positionals equal the argv values (empty string when omitted). Fifth key is `turn`; its value is a YAML integer (unquoted decimal). Do not assert F008 numbering. Verifies AC-F003.11.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.11-yaml-document-header.test.ts` (replace `e2e/ac-f003.3-yaml-document-header.test.ts`; delete or rename the `.3` file — do not leave an AC-F003.3 title)
- [x] Arrange: extend `e2e/spawn.ts` only if needed to read an unquoted integer `turn`. `yamlMapping` strips quotes, so a dedicated helper (or raw token before strip) must match `/^-?\d+$/` on the `turn` line and fail if the scalar is quoted (`"0"` / `'0'`). Do **not** change `spawnIngest` default extraArgv. Two isolated fixtures. Case A — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-11-both"` (also include `hook_event_name` so inference from payload would disagree if it were used). Case B — no extra argv; payload `session_id` `"sess-ac-f003-11-neither"`. Parse YAML as text (Node builtins only). Empty positional → YAML empty string (`""` or `''`)
- [x] Act: spawn both cases (each title includes `AC-F003.11`)
- [x] Assert: both `exitCode === 0`; stdout empty. Case A: filename stem `sess-ac-f003-11-both`; first five keys `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`; values `sess-ac-f003-11-both`, `cursor`, `sessionStart`, an `HH:MM:SS` scalar, and `turn` matching `/^-?\d+$/` (unquoted; do **not** require exact `0`). Case B: filename stem `sess-ac-f003-11-neither`; `source_harness` and `source_event` are empty strings (not inferred from `hook_event_name`); fifth key is `turn` as a YAML integer. Event log line still has no overlay from argv and no `turn` key (AC-F003.11). Do not assert incrementing, prompt-kind counting, or turn 1 on prompts

---

### Step 4: AC-F003.4 — Payload timestamp formatted local HH:MM:SS; generated time not on Event log
Keep. Spawn ingest with a payload `timestamp`, and again without → YAML `timestamp` is host-local zero-padded `HH:MM:SS`. A generated value is not written onto the Event log line. Verifies AC-F003.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.4-timestamp-hhmmss.test.ts`
- [x] Arrange: three isolated fixtures; extra argv `["cursor", "sessionStart"]` each (Unix-ms, ISO string, absent)
- [x] Act: spawn all three cases (each title includes `AC-F003.4`)
- [x] Assert: formatted instant vs generated receive time; Event log line unchanged (AC-F003.4)

---

### Step 5: AC-F003.5 — YAML body only mapped normalized fields (omit absent, null stays null)
Redo. Same seven spawn cases and the same body mapping (current [`docs/normalized-fields.md`](../../normalized-fields.md)). Header prefix and body slice must move from four keys to five so `turn` is not treated as a body field. Do not change body expectations. Do not assert F008 numbering. Verifies AC-F003.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.5-normalized-body-fields.test.ts`
- [x] Arrange: keep the existing seven isolated fixtures and argv/payloads in `e2e/ac-f003.5-normalized-body-fields.test.ts`. In `spawnCase`, change the header prefix assert from `keys.slice(0, 4)` (four keys) to `keys.slice(0, 5)` = `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`. Change `bodyKeys` from `keys.slice(4)` to `keys.slice(5)`. Do not add F008 numbering asserts. Do not spawn Copilot or Claude processes; pass mapping names on argv. Do not change `.cursor/hooks.json`. Cases (each title includes `AC-F003.5`):
    1. Cursor session end — body key `reason` only
    2. Cursor subagent start — body keys in table order (`agent_type`, then `task` as the current mapping; extras / `transcript_path` absent)
    3. Absent key omitted — no `reason` in body
    4. Present null — current product omit/null behavior for `transcript_path`; `agent_type` present
    5. Prompt mapping without registering the event — body key `prompt` only
    6. Copilot subagent stop mapping via argv — body keys in table order (`agent_type`, `response_text`); Copilot `sessionId` is not the filename
    7. Cursor session start — document is header-only after the five header keys; extras such as `composer_mode` absent from YAML
- [x] Act: spawn each case (do not import `cli/src/**`)
- [x] Assert: body keys are the mapped snake_case names in table order after the five header keys; omitted when the source key is absent; no field outside that set; Event log line remains verbatim including extras; `turn` is not in the body slice (AC-F003.5)

---

### Step 6: AC-F003.6 — Subagent event is a sibling document, not nested
Redo. Spawn a session-start ingest then a subagent-start ingest that share a F001 session identifier → two independent sequential documents; the subagent event is not nested under the parent. Header keys now include `turn`. Do not assert F008 numbering. Verifies AC-F003.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.6-subagent-sibling-document.test.ts`
- [x] Arrange: keep the existing fixture and payloads (`session_id` then `parent_conversation_id` `"sess-ac-f003-6"`). In `assertUnindentedHeader`, change `keys.slice(0, 4)` to `keys.slice(0, 5)` = `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`. Lines stay unindented. Do not nest under `subagent` / `children` / `events`
- [x] Act: spawn ingest twice in order (title includes `AC-F003.6`)
- [x] Assert: `{dayFolder}/sess-ac-f003-6.yaml` has exactly two documents, each beginning with `---` and each starting with unindented header keys `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`; second document `source_event` is `subagentStart`; no nested mapping under the first document. Event log has two verbatim lines; Session index is `["sess-ac-f003-6"]` (AC-F003.6). Do not assert turn incrementing between the two documents

---

### Step 7: AC-F003.7 — No session identifier: F001 persist, no YAML file
Keep. Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) → Event log line exists; Session index unchanged; no `{dayFolder}/*.yaml`. Verifies AC-F003.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`
- [x] Arrange: extra argv `["copilot", "sessionStart"]`; payload has `sessionId` only. First-use and pre-seeded index cases
- [x] Act: spawn ingest for each case (each title includes `AC-F003.7`)
- [x] Assert: Event log persisted; Session index unchanged; no YAML file named for `sessionId` (AC-F003.7)

---

### Step 8: AC-F003.12 — Unrecognized harness/event: five-field header-only YAML document
New (replaces dropped AC-F003.8). Spawn ingest with unrecognized positionals and a F001 session identifier → a YAML document is still appended, containing the five header fields only. `turn` is a YAML integer. Do not assert F008 numbering. Verifies AC-F003.12.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.12-unrecognized-header-only.test.ts` (replace `e2e/ac-f003.8-unrecognized-header-only.test.ts`; delete or rename the `.8` file — do not leave an AC-F003.8 title)
- [x] Arrange: isolated fixture; extra argv `["unknown-harness", "notAnEvent"]`; stdin JSON object with `session_id` and body-like extras (`reason`, `prompt`, `subagent_type`) that would map if the event were recognized. Second case: extra argv `["cursor", "notAnEvent"]` (known harness, unknown event). Reuse the unquoted-integer `turn` helper from Step 3
- [x] Act: spawn ingest (each title includes `AC-F003.12`)
- [x] Assert: `exitCode === 0`; stdout empty; Event log line deep-equals stdin (extras kept on JSONL; no `turn` on the JSONL line); `{session_id}.yaml` exists with exactly one document beginning with `---`; that document has the five header keys only (`session_id`, `source_harness`, `source_event`, `timestamp`, `turn`); `turn` matches `/^-?\d+$/` (unquoted); no `reason` / `prompt` / `agent_type` / other body keys (AC-F003.12)

---

### Step 9: AC-F003.9 — Repeated/concurrent ingest: complete YAML docs; Event log and index stay valid
Redo. Two overlapping ingest processes plus a sequential repeat → complete YAML documents (each starts with `---`); Event log and Session index stay valid as F001. Same overlap pattern as `e2e/ac-f001.5-concurrent-persist.test.ts`. Complete docs include five header keys. Do not assert F008 numbering. Verifies AC-F003.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.9-concurrent-yaml-complete.test.ts`
- [x] Arrange: keep the existing fixture, payloads (`concurrent-a` / `concurrent-b`), and `Promise.all` overlap then sequential repeat. In `assertCompleteDocuments`, change `keys.slice(0, 4)` to `keys.slice(0, 5)` = `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`. Do not import `cli/src/**`
- [x] Act: spawn two children so their writes overlap (`Promise.all`); then spawn a sequential third with payload A (title includes `AC-F003.9`)
- [x] Assert: all three `exitCode === 0` and stdout empty; `events.jsonl` has exactly three complete parseable object lines (no torn, concatenated, or interleaved fragments); `sessions.json` is a JSON array of unique identifiers (two ids, no duplicate of `"concurrent-a"`); `concurrent-a.yaml` has exactly two complete documents and `concurrent-b.yaml` has exactly one; every YAML document begins with `---`; each document includes the five header keys (AC-F003.9)

---

### Step 10: AC-F003.10 — Existing Node ESM ingest, no extra runtime dependencies
Keep. Read `cli/package.json` and spawn the existing ingest entry → Node ≥ 24 ESM, `dependencies` empty, no new binary. Verifies AC-F003.10.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.10-existing-esm-ingest.test.ts`
    - `cli/package.json`
- [x] Arrange: load `cli/package.json`; isolated fixture for the spawn smoke. Do not spawn `.agents/hooks/index.mjs`. Do not add a YAML library. Do not register extra Cursor events. Do not modify untracked `cli/package.json` / `cli/scripts/build.ts` as part of this plan
- [x] Act: parse `cli/package.json`; spawn `node cli/src/index.ts ingest cursor sessionStart` (title includes `AC-F003.10`)
- [x] Assert: `"type": "module"`; `"dependencies": {}`; `engines.node` starts with `>=24`; Event log + Session index + `{session_id}.yaml` present (AC-F003.10)

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md).
- Did not run `node --test e2e/*.test.ts` (e2e codify: compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001/F002).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan only extends YAML helpers if needed for unquoted integer `turn`; it does not change the helper’s default.
- YAML in tests is observed as text (split on `---`, read keys in order). No YAML library in e2e either.
- Do not spawn Copilot or Claude. Copilot/Claude mapping is exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier; Copilot mapping cases still include `session_id` (or `conversation_id` / `parent_conversation_id`) so a YAML file is created.
- Do not change `.cursor/hooks.json` (already six events from F005/F006). Do not register extra Cursor events. Prompt and agent-stop mapping are spawned as ingest extra argv only.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- How `turn` is numbered is F008. AC-F003.11 / AC-F003.12 assert field order and YAML integer type (`/^-?\d+$/`), not exact `0`, incrementing, or prompt-kind counting.
- AC-F003.5 redo applied: `spawnCase` header slice is five keys including `turn`; `bodyKeys` is `keys.slice(5)`.
- Did not set spec status (cli sibling sets `in-progress`).
- Did not git commit (parent commits both containers together).

---

> last updated: 2026-09-01T20:20:00Z
