---
spec-kind: functional
container: e2e
---
# F003-ingest-normalized-yaml - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional harness and event positionals. Persistence stays F001: verbatim Event log, Session index rules, exit 0, no blocking stdout. When the payload has a F001 session identifier, the same invocation also appends one normalized YAML document to `{session_id}.yaml` in that day’s folder. Positionals are used for the YAML header only; they are not written onto the Event log line. This amend shortens new YAML headers: `source_harness` / `source_event` become `harness` / `event`, and `session_id` is written only on the initial session-start document. Product Cursor registration is already six events (`beforeSubmitPrompt` F005, `stop` F006). This F003 amend does **not** change `.cursor/hooks.json`. Do not add `.cmd` wrappers.

This spec does not replace F001 or F002. How `turn` is numbered is F008 and is out of scope here. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (compact-header amend/replan of F003 e2e; prior plan last updated 2026-09-01T20:20:00Z):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none and remain valid. **Do not break F001 or F002 spawn tests.** **Do not change the default `extraArgv` behavior.** Existing YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`) stay; they will see `harness` / `event`. Reuse `assertYamlIntegerTurn` / `yamlRawScalar` for unquoted integer `turn` (`/^-?\d+$/`). Do **not** treat quote-stripped `yamlMapping` values as proof the scalar was unquoted
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. Parse YAML as text. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F003.13 — …`). New files: `e2e/ac-f003.13-*.test.ts`, `e2e/ac-f003.14-*.test.ts`, `e2e/ac-f003.15-*.test.ts`, `e2e/ac-f003.16-*.test.ts`
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not register extra Cursor events. Do not spawn Copilot or Claude. Prompt and agent-stop mapping may still be tested by spawning ingest with those event names
- When testing Copilot or Claude mapping, still put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier (AC-F003.7)
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Do **not** assert F008 turn numbering (incrementing, prompt-kind counting, or exact `0`). Prefer `/^-?\d+$/` for `turn` (unquoted; `assertYamlIntegerTurn`)
- Codify of e2e: compile/lint only; do not run `node --test e2e/*.test.ts` in this container’s later codify. Drop authorizes deleting the matching test file

### Shared store wording

> Copied verbatim from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. Concurrency now covers the YAML append. Argv now passes harness/event into ingest for YAML only. New Session YAML log documents use compact header keys `harness` / `event`; `session_id` only on the initial session-start document.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values and whether they contain `session_id`. Do not migrate old `source_harness` / `source_event` keys.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing YAML.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id`, using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields only: five fields when initial session-start; four otherwise.
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
- [x] **AC-F003.13** — THE SYSTEM SHALL write header fields `harness` and `event` (not `source_harness` or `source_event`) on every new YAML document, equal to the F002 ingest positionals as supplied (`ingest {harness} {event}`); WHEN a positional is omitted, that header field SHALL be the empty string; THE SYSTEM SHALL NOT infer harness or event from the payload.
- [x] **AC-F003.14** — WHEN the document is the initial session-start for that session (`event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document), THE SYSTEM SHALL write `session_id` equal to the F001 session identifier used as the filename stem; WHEN the document is any other event (including prompt, stop, subagent, sessionEnd, a later or duplicate sessionStart, header-only unmapped, or when the first event for the session is not session-start), THE SYSTEM SHALL omit `session_id`; WHEN the first event for a session is not session-start, THE SYSTEM SHALL write `session_id` on no document; THE SYSTEM SHALL NOT rewrite previously written documents to strip or add `session_id`.
- [x] **AC-F003.15** — WHEN the document is the initial session-start (has `session_id`), THE SYSTEM SHALL start the document with `session_id`, `harness`, `event`, `timestamp`, and `turn` in that order; WHEN the document is any other document (no `session_id`), THE SYSTEM SHALL start the document with `harness`, `event`, `timestamp`, and `turn` in that order.
- [x] **AC-F003.4** — WHEN the payload includes its own `timestamp`, THE SYSTEM SHALL write `timestamp` as that instant in host-local `HH:MM:SS`. WHEN it does not, THE SYSTEM SHALL write a generated host-local `HH:MM:SS` from receive time and SHALL NOT add that value to the Event log line.
- [x] **AC-F003.5** — THE SYSTEM SHALL include in the YAML body only the normalized common fields for the event kind in [`docs/normalized-fields.md`](../../normalized-fields.md) (excluding `session_id`), mapped from the harness-specific source keys for `harness` and `event`, in table order, omitting absent keys and emitting YAML `null` for present nulls; THE SYSTEM SHALL NOT include fields outside that set.
- [x] **AC-F003.6** — THE SYSTEM SHALL write every YAML document as an independent sequential event (no nesting of subagent events under a parent).
- [x] **AC-F003.7** — WHEN the payload has no session identifier, THE SYSTEM SHALL still persist as F001 and SHALL NOT create or append a Session YAML log.
- [x] **AC-F003.16** — WHEN `harness` or `event` does not match a mapping row and column in [`docs/normalized-fields.md`](../../normalized-fields.md), THE SYSTEM SHALL still append a YAML document that contains the header fields only: five fields (`session_id`, `harness`, `event`, `timestamp`, `turn`) WHEN the document is the initial session-start; four fields (`harness`, `event`, `timestamp`, `turn`) WHEN it is any other document.
- [x] **AC-F003.9** — WHEN ingest is invoked repeatedly or concurrently, THE SYSTEM SHALL persist complete YAML documents and SHALL keep the Event log and Session index valid as F001 (no torn, concatenated, or duplicated records).
- [x] **AC-F003.10** — THE SYSTEM SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

Deprecated (not under test): **AC-F003.3** (four-field header; replaced by AC-F003.11); **AC-F003.8** (four-field header-only unmapped; replaced by AC-F003.12); **AC-F003.11** (five-field header with `session_id` / `source_harness` / `source_event` on every document; replaced by AC-F003.13, AC-F003.14, AC-F003.15); **AC-F003.12** (five-field header-only unmapped; replaced by AC-F003.16).

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F003.1 — Same invocation writes Event log, Session index, and one YAML document | keep | three artifacts in one invocation; Arrange/Assert do not require `session_id` / `source_harness` / `source_event` on the YAML document |
| AC-F003.2 — YAML file is append-only multi-document with `---` per document | keep | append-only multi-doc `---`; first-document snapshot covers `turn` and whether `session_id` stays; does not require old keys on every document |
| AC-F003.3 — Document header is session_id, source_harness, source_event, timestamp | drop | already retired; files already gone |
| AC-F003.11 — Document header is session_id, source_harness, source_event, timestamp, turn | drop | retired; compact keys + `session_id` only on initial session-start are AC-F003.13 / .14 / .15. Delete `e2e/ac-f003.11-yaml-document-header.test.ts` |
| AC-F003.4 — Payload timestamp formatted local HH:MM:SS; generated time not on Event log | keep | timestamp only; does not slice header keys |
| AC-F003.5 — YAML body only mapped normalized fields (omit absent, null stays null) | redo | `spawnCase` still requires five keys `session_id`, `source_harness`, `source_event`, `timestamp`, `turn` on every document; Copilot case asserts `session_id` on a non-start document. Flip helpers to `harness` / `event`; 5 vs 4 header; omit `session_id` except initial session-start. Keep the seven body cases |
| AC-F003.6 — Subagent event is a sibling document, not nested | redo | `assertUnindentedHeader` requires `session_id` / `source_harness` / `source_event` on both documents; second document is not session-start. Flip to `harness` / `event`; 5-field first doc, 4-field sibling |
| AC-F003.7 — No session identifier: F001 persist, no YAML file | keep | no session id → no YAML |
| AC-F003.8 — Unrecognized harness/event: header-only YAML document | drop | already retired; files already gone |
| AC-F003.12 — Unrecognized harness/event: five-field header-only YAML document | drop | retired; unmapped 5 vs 4 header-only is AC-F003.16. Delete `e2e/ac-f003.12-unrecognized-header-only.test.ts` |
| AC-F003.9 — Repeated/concurrent ingest: complete YAML docs; Event log and index stay valid | redo | `assertCompleteDocuments` requires `session_id` / `source_harness` / `source_event` on every document; sequential repeat is a second `sessionStart` (omit `session_id`). Flip to compact keys; 5 vs 4 |
| AC-F003.10 — Existing Node ESM ingest, no extra runtime dependencies | keep | existing ESM ingest, no deps; does not slice header keys |

New scenarios (not in the prior plan): **AC-F003.13** (keys `harness` / `event`, empty when omitted, not inferred); **AC-F003.14** (`session_id` only on initial session-start; omit otherwise; none if first event is not session-start; second `sessionStart` omits); **AC-F003.15** (header order five vs four); **AC-F003.16** (unmapped header-only five vs four).

## Implementation Steps

### Step 1: AC-F003.1 — Same invocation writes Event log, Session index, and one YAML document
Keep. Spawn ingest once as `ingest cursor sessionStart` with a JSON object that has a session identifier → F001 persist plus exactly one YAML document in `{session_id}.yaml` in the dated folder. One process, one invocation. Does not assert header key names or `session_id` on the document. Verifies AC-F003.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.1-same-invocation-three-artifacts.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR`; stdin one JSON object with `session_id`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`
- [x] Act: spawn `node cli/src/index.ts ingest cursor sessionStart` (title includes `AC-F003.1`)
- [x] Assert: `exitCode === 0`; stdout empty; Event log + Session index + exactly one YAML document beginning with `---` (AC-F003.1)

---

### Step 2: AC-F003.2 — YAML file is append-only multi-document with `---` per document
Keep. Two sequential ingests for the same session identifier → multi-document YAML; each appended document begins with `---`; the first document is unchanged after the second append (including its `turn` and whether it contains `session_id`). Verifies AC-F003.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.2-append-only-multidoc-yaml.test.ts`
- [x] Arrange: isolated fixture; same `session_id`; snapshot first document after first spawn
- [x] Act: spawn ingest twice in order (each title includes `AC-F003.2`)
- [x] Assert: two documents each beginning with `---`; first document text byte-identical to the snapshot (AC-F003.2)

---

### Step 3: AC-F003.13 — Header keys are harness and event; empty when omitted; not inferred
New (replaces dropped AC-F003.11 for key names and positional values). Spawn ingest with both positionals, and again with neither → every new YAML document has `harness` and `event` (not `source_harness` or `source_event`) equal to the F002 argv as supplied. Empty string when omitted. Do not infer from the payload. Do not assert `session_id` presence (AC-F003.14) or five-vs-four field order (AC-F003.15). Do not assert F008 numbering. Verifies AC-F003.13.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.13-yaml-header-harness-event.test.ts` (do not keep an AC-F003.11 title)
- [x] Arrange: do **not** change `spawnIngest` default extraArgv. Reuse `yamlDocuments` / `yamlMapping` / `assertYamlIntegerTurn`. Two isolated fixtures. Case A — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-13-both"` and `hook_event_name` `"sessionEnd"` so inference from the payload would disagree. Case B — no extra argv; payload `session_id` `"sess-ac-f003-13-neither"` and `hook_event_name` `"sessionStart"`. Parse YAML as text (Node builtins only). Empty positional → YAML empty string (`""` or `''`)
- [x] Act: spawn both cases (each title includes `AC-F003.13`)
- [x] Assert: both `exitCode === 0`; stdout empty. Neither document has keys `source_harness` or `source_event`. Case A: filename stem `sess-ac-f003-13-both`; `harness` is `cursor`; `event` is `sessionStart` (not `sessionEnd`). Case B: filename stem `sess-ac-f003-13-neither`; `harness` and `event` are empty strings (not inferred from `hook_event_name`). Event log line still has no overlay from argv and no `turn` key (AC-F003.13)

---

### Step 4: AC-F003.14 — session_id only on the initial session-start document
New. `session_id` on the YAML document only when this is the initial session-start (`event` is `sessionStart` or `SessionStart` and that session’s YAML log does not already contain a session-start document). Value is the F001 identifier (filename stem). Omit on every other document. When the first event for a session is not session-start, no document gets `session_id`. Second `sessionStart` omits. Do not rewrite prior documents to strip or add `session_id`. Do not assert F008 numbering. Verifies AC-F003.14.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.14-session-id-initial-session-start.test.ts`
- [x] Arrange: isolated fixtures under `{repo}/temp/e2e/`. Reuse `yamlDocuments` / `yamlMapping`. Do not change `spawnIngest` default extraArgv. Cases (each title includes `AC-F003.14`):
    1. Initial Cursor `sessionStart` — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-14-initial"`
    2. Initial Claude `SessionStart` alias — extra argv `["claude-code", "SessionStart"]`; payload `session_id` `"sess-ac-f003-14-alias"` (do not spawn a Claude process)
    3. Later events omit — after case 1’s file exists, spawn `sessionEnd`, then `beforeSubmitPrompt`, then `subagentStart` for the same identifier (snapshot the first document before those appends)
    4. Second `sessionStart` omits — extra argv `["cursor", "sessionStart"]` twice for `"sess-ac-f003-14-dup"`; snapshot the first document after the first spawn
    5. First event is not session-start — extra argv `["cursor", "sessionEnd"]` then `["cursor", "sessionStart"]` for `"sess-ac-f003-14-abrupt"` (no prior YAML)
- [x] Act: spawn each case (do not import `cli/src/**`)
- [x] Assert: cases 1–2: exactly one document; `session_id` equals the filename stem; file is `{session_id}.yaml`. Case 3: first document still has `session_id` and is byte-identical to the snapshot; later documents omit `session_id`. Case 4: first document has `session_id` and is unchanged; second document omits `session_id`. Case 5: both documents omit `session_id`; filename stem is still `sess-ac-f003-14-abrupt` (AC-F003.14)

---

### Step 5: AC-F003.15 — Header field order is five vs four
New. Initial session-start (has `session_id`) starts with `session_id`, `harness`, `event`, `timestamp`, `turn`. Every other document starts with `harness`, `event`, `timestamp`, `turn`. `turn` is a YAML integer (unquoted; `/^-?\d+$/`). Do not assert F008 numbering. Verifies AC-F003.15.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.15-header-field-order.test.ts`
- [x] Arrange: two isolated fixtures. Reuse `assertYamlIntegerTurn`. Case A — extra argv `["cursor", "sessionStart"]`; payload `session_id` `"sess-ac-f003-15-start"`. Case B — extra argv `["cursor", "sessionEnd"]`; payload `session_id` `"sess-ac-f003-15-other"` (first event is not session-start, so no `session_id` on the document)
- [x] Act: spawn both cases (each title includes `AC-F003.15`)
- [x] Assert: both `exitCode === 0`; stdout empty. Case A: first five keys `session_id`, `harness`, `event`, `timestamp`, `turn`; `turn` matches `/^-?\d+$/` (unquoted). Case B: first four keys `harness`, `event`, `timestamp`, `turn`; no `session_id` key; `turn` matches `/^-?\d+$/` (unquoted) (AC-F003.15)

---

### Step 6: AC-F003.4 — Payload timestamp formatted local HH:MM:SS; generated time not on Event log
Keep. Spawn ingest with a payload `timestamp`, and again without → YAML `timestamp` is host-local zero-padded `HH:MM:SS`. A generated value is not written onto the Event log line. Verifies AC-F003.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.4-timestamp-hhmmss.test.ts`
- [x] Arrange: three isolated fixtures; extra argv `["cursor", "sessionStart"]` each (Unix-ms, ISO string, absent)
- [x] Act: spawn all three cases (each title includes `AC-F003.4`)
- [x] Assert: formatted instant vs generated receive time; Event log line unchanged (AC-F003.4)

---

### Step 7: AC-F003.5 — YAML body only mapped normalized fields (omit absent, null stays null)
Redo. Same seven spawn cases and the same body mapping (current [`docs/normalized-fields.md`](../../normalized-fields.md)). Flip header helpers from `source_harness` / `source_event` and a fixed five-key prefix to `harness` / `event` with a 5-field prefix only on the initial session-start (case 7) and a 4-field prefix on every other case. `bodyKeys` must not treat `session_id` or `turn` as body. Do not assert F008 numbering. Verifies AC-F003.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.5-normalized-body-fields.test.ts`
- [x] Arrange: keep the existing seven isolated fixtures and argv/payloads in `e2e/ac-f003.5-normalized-body-fields.test.ts`. In `spawnCase`, assert header prefix `harness`, `event`, `timestamp`, `turn` (four keys) except Cursor `sessionStart` (case 7), which is `session_id`, `harness`, `event`, `timestamp`, `turn` (five keys). `bodyKeys` is `keys.slice(4)` for four-key headers and `keys.slice(5)` for the session-start case. Do not require `session_id` on non-start documents (drop the Copilot `keys.filter(session_id).length === 1` assert; filename stem still `sess-ac-f003-5-copilot-stop`). No `source_harness` / `source_event` keys. Do not add F008 numbering asserts. Do not spawn Copilot or Claude processes; pass mapping names on argv. Do not change `.cursor/hooks.json`. Cases (each title includes `AC-F003.5`):
    1. Cursor session end — four-key header; body key `reason` only
    2. Cursor subagent start — four-key header; body keys in table order (`agent_type`, then `task` as the current mapping; extras / `transcript_path` absent)
    3. Absent key omitted — four-key header; no `reason` in body
    4. Present null — four-key header; current product omit/null behavior for `transcript_path`; `agent_type` present
    5. Prompt mapping without registering the event — four-key header; body key `prompt` only
    6. Copilot subagent stop mapping via argv — four-key header; body keys in table order (`agent_type`, `response_text`); Copilot `sessionId` is not the filename; omit `session_id` on the document
    7. Cursor session start — five-key header including `session_id`; document is header-only after those five keys; extras such as `composer_mode` absent from YAML
- [x] Act: spawn each case (do not import `cli/src/**`)
- [x] Assert: body keys are the mapped snake_case names in table order after the compact header; omitted when the source key is absent; no field outside that set; Event log line remains verbatim including extras; `turn` is not in the body slice (AC-F003.5)

---

### Step 8: AC-F003.6 — Subagent event is a sibling document, not nested
Redo. Spawn a session-start ingest then a subagent-start ingest that share a F001 session identifier → two independent sequential documents; the subagent event is not nested under the parent. First document is initial session-start (five-key header including `session_id`). Second document omits `session_id` (four-key header `harness`, `event`, `timestamp`, `turn`). Flip `source_event` → `event`. Do not assert F008 numbering. Verifies AC-F003.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.6-subagent-sibling-document.test.ts`
- [x] Arrange: keep the existing fixture and payloads (`session_id` then `parent_conversation_id` `"sess-ac-f003-6"`). Split `assertUnindentedHeader`: first document keys.slice(0, 5) = `session_id`, `harness`, `event`, `timestamp`, `turn`; second document keys.slice(0, 4) = `harness`, `event`, `timestamp`, `turn` and no `session_id` key. Lines stay unindented. Do not nest under `subagent` / `children` / `events`. No `source_harness` / `source_event`
- [x] Act: spawn ingest twice in order (title includes `AC-F003.6`)
- [x] Assert: `{dayFolder}/sess-ac-f003-6.yaml` has exactly two documents, each beginning with `---` and unindented; first starts with `session_id`, `harness`, `event`, `timestamp`, `turn`; second starts with `harness`, `event`, `timestamp`, `turn`; second document `event` is `subagentStart`; no nested mapping under the first document. Event log has two verbatim lines; Session index is `["sess-ac-f003-6"]` (AC-F003.6). Do not assert turn incrementing between the two documents

---

### Step 9: AC-F003.7 — No session identifier: F001 persist, no YAML file
Keep. Spawn ingest with a payload that has no F001 session identifier (only Copilot `sessionId`) → Event log line exists; Session index unchanged; no `{dayFolder}/*.yaml`. Verifies AC-F003.7.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.7-no-session-id-no-yaml.test.ts`
- [x] Arrange: extra argv `["copilot", "sessionStart"]`; payload has `sessionId` only. First-use and pre-seeded index cases
- [x] Act: spawn ingest for each case (each title includes `AC-F003.7`)
- [x] Assert: Event log persisted; Session index unchanged; no YAML file named for `sessionId` (AC-F003.7)

---

### Step 10: AC-F003.16 — Unrecognized harness/event: five- vs four-field header-only YAML document
New (replaces dropped AC-F003.12). Spawn ingest with unrecognized positionals and a F001 session identifier → a YAML document is still appended, containing the header fields only: five when that document is the initial session-start; four otherwise. `turn` is a YAML integer. Do not assert F008 numbering. Verifies AC-F003.16.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.16-unrecognized-header-only.test.ts` (replace `e2e/ac-f003.12-unrecognized-header-only.test.ts`; delete the `.12` file — do not leave an AC-F003.12 title)
- [x] Arrange: isolated fixtures; stdin JSON object with `session_id` and body-like extras (`reason`, `prompt`, `subagent_type`) that would map if the event were recognized. Case A — extra argv `["unknown-harness", "sessionStart"]` (unmapped harness, initial session-start). Case B — extra argv `["unknown-harness", "notAnEvent"]` (unmapped, not session-start). Case C — extra argv `["cursor", "notAnEvent"]` (known harness, unknown event). Reuse `assertYamlIntegerTurn`
- [x] Act: spawn ingest (each title includes `AC-F003.16`)
- [x] Assert: each `exitCode === 0`; stdout empty; Event log line deep-equals stdin (extras kept on JSONL; no `turn` on the JSONL line); `{session_id}.yaml` exists with exactly one document beginning with `---`; no `reason` / `prompt` / `agent_type` / other body keys. Case A: five header keys only (`session_id`, `harness`, `event`, `timestamp`, `turn`); `harness` is `unknown-harness`; `event` is `sessionStart`; `turn` matches `/^-?\d+$/` (unquoted). Cases B and C: four header keys only (`harness`, `event`, `timestamp`, `turn`); no `session_id` key; `turn` matches `/^-?\d+$/` (unquoted) (AC-F003.16)

---

### Step 11: AC-F003.9 — Repeated/concurrent ingest: complete YAML docs; Event log and index stay valid
Redo. Two overlapping ingest processes plus a sequential repeat → complete YAML documents (each starts with `---`); Event log and Session index stay valid as F001. Same overlap pattern as `e2e/ac-f001.5-concurrent-persist.test.ts`. Complete docs use compact keys: five-field header on the initial `sessionStart` for `concurrent-a`; four-field on the later `sessionStart` repeat and on `concurrent-b` (`sessionEnd`). Do not assert F008 numbering. Verifies AC-F003.9.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f003.9-concurrent-yaml-complete.test.ts`
- [x] Arrange: keep the existing fixture, payloads (`concurrent-a` / `concurrent-b`), and `Promise.all` overlap then sequential repeat. In `assertCompleteDocuments`, do not require `session_id` / `source_harness` / `source_event` on every document. Each document must start with `---`; header is either `session_id`, `harness`, `event`, `timestamp`, `turn` (initial session-start only) or `harness`, `event`, `timestamp`, `turn` (every other). No `source_harness` / `source_event`. Do not import `cli/src/**`
- [x] Act: spawn two children so their writes overlap (`Promise.all`); then spawn a sequential third with payload A (title includes `AC-F003.9`)
- [x] Assert: all three `exitCode === 0` and stdout empty; `events.jsonl` has exactly three complete parseable object lines (no torn, concatenated, or interleaved fragments); `sessions.json` is a JSON array of unique identifiers (two ids, no duplicate of `"concurrent-a"`); `concurrent-a.yaml` has exactly two complete documents and `concurrent-b.yaml` has exactly one; every YAML document begins with `---`; the first `concurrent-a` document may include `session_id`; the second `concurrent-a` document (repeat `sessionStart`) and the `concurrent-b` document omit `session_id` (AC-F003.9)

---

### Step 12: AC-F003.10 — Existing Node ESM ingest, no extra runtime dependencies
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
- Did not run `node --test e2e/*.test.ts` (planify must not; e2e codify: compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001/F002).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. `yamlDocuments` / `yamlMapping` stay; they will see `harness` / `event`.
- YAML in tests is observed as text (split on `---`, read keys in order). No YAML library in e2e either.
- Do not spawn Copilot or Claude. Copilot/Claude mapping is exercised by ingest argv. Copilot `sessionId` is not a F001 session identifier; Copilot mapping cases still include `session_id` (or `conversation_id` / `parent_conversation_id`) so a YAML file is created.
- Do not change `.cursor/hooks.json` (already six events from F005/F006). Do not register extra Cursor events. Prompt and agent-stop mapping are spawned as ingest extra argv only.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- How `turn` is numbered is F008. Prefer `/^-?\d+$/` (unquoted via `assertYamlIntegerTurn`). Do not assert exact `0`, incrementing, or prompt-kind counting.
- AC-F003.1 and AC-F003.2 are **keep** (not redo): their Arrange/Assert do not require `session_id` / `source_harness` / `source_event` on every YAML document.
- Left spec status `pending` (cli sibling also affected; parent commits later).
- Did not git commit (parent commits both containers together).

---

> last updated: 2026-09-02T08:35:00Z
