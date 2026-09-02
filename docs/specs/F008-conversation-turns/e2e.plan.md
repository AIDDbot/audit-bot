---
spec-kind: functional
container: e2e
---
# F008-conversation-turns - e2e

## Specification

User-facing flow under test: ingest (spawned as `ingest {harness} {event}`) persists F001 Event log / Session index and F003 Session YAML. Each appended YAML document’s `turn` (after `timestamp`) is an unquoted YAML integer: the count of prompt-kind documents already in that session’s Session YAML log, plus one when this document is itself prompt-kind; otherwise that same count; `0` when none are present and this document is not prompt-kind. Prompt-kind is only the YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` (F003 compact header: F002 positional written as `event:`, not `source_event:`, not payload `hook_event_name`). Repeated `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` stay on the current turn. Prior documents are not rewritten. The Event log stays F001 verbatim (no `turn` overlay, no sidecar Turn file). Observe-only: exit 0, no blocking stdout. F008 does not change Cursor registration (six events stay). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers.

This spec does not replace F001–F007. Compact header keys (`harness` / `event`) and `session_id` only on the initial sessionStart are F003 (AC-F003.13 / AC-F003.14 / AC-F003.15). Session report grouping, turn duration, and prompt-in-subsection are F004 — do not reopen. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. This plan does **not** cover F004 report-trigger e2e.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (F003 compact-header amend of F008 e2e; prior plan last updated 2026-09-02T06:51:04Z):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`, `yamlRawScalar`, `assertYamlIntegerTurn`) and jsonl helpers (`readLines`, `parseObject`, `readSessions`) already exist. `yamlMapping` strips quotes, so `turn: 0` and `turn: "0"` both become `"0"` — **use `yamlRawScalar` / `assertYamlIntegerTurn`** (or extend spawn.ts only if needed) to assert **unquoted** integer turn. Expected documents use compact keys `harness` / `event` (not `source_harness` / `source_event`). Do **not** change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F008.1 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only (`copilot` / `claude-code` + `userPromptSubmitted` / `UserPromptSubmit` / `agentStop` / `Stop` / `SubagentStop`)
- When a YAML file is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers. F008 does **not** change `.cursor/hooks.json` (six events stay)
- Do **not** reopen F001–F007 ACs. F003 compact-header tests (AC-F003.13 / .14 / .15 / .16) and F004 report-consumer tests are sibling plans. Plan Step 7 as leave-as-is
- Do **not** plan F004 report-trigger e2e
- Do **not** change turn numbering assertions (0 / 1 / 2 / 3 as already specified per scenario)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). There is no e2e tsconfig/oxlint — typecheck and lint are typically skipped (same as F001–F007)

### Shared store wording

> Copied from F003 compact Session YAML log. Event log, Session index, project root, and day folder stay as F001. `turn` numbering sentences are this spec. Prompt-kind is YAML `event` values.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path`, `task`, `agentDisplayName`, `agentName`, `agentDescription`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `turn`.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values and whether they contain `session_id`. Do not migrate old `source_harness` / `source_event` keys.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing YAML. Under `ingest.lock`, read that session’s **existing** Session YAML log (missing file → zero prompt-kind documents) to compute `turn`. Do not read the Event log or Session index to determine `turn`.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (never a zero-padded string, never a body field). When appending a document, `turn` is the number of prompt-kind documents already present in that session’s Session YAML log, plus one if this document is itself prompt-kind; otherwise that same already-present count. When none are already present and this document is not prompt-kind, `turn` is 0. Prompt-kind is only YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` (the F002 positional written as `event:`, not `source_event:`, not payload `hook_event_name`). The first prompt-kind document is turn 1; each later prompt-kind document is one greater (`2`, `3`, …). Documents written before that first prompt-kind document are turn 0. `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` belong to the current turn; their multiplicity does not start or end a turn. Do not rewrite `turn` on previously written documents. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session YAML log to determine `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id`, using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set. Do not add `turn` to the body or to `docs/normalized-fields.md`.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields only: five fields when initial session-start; four otherwise.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every YAML append). Do not change them here. The report already reads `turn` from YAML; correct numbering is this spec’s job.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session YAML log (missing file → empty), compute `turn`, emit one complete YAML document, and append it. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header `harness` / `event` (including prompt-kind for `turn`) can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F008 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

### Acceptance criteria under test

- [x] **AC-F008.1** — WHEN ingest appends a Session YAML log document, THE SYSTEM SHALL set `turn` to the number of prompt-kind documents already present in that file, plus one if the document being appended is itself prompt-kind, otherwise that same number; WHEN no prompt-kind document is already present and the document being appended is not prompt-kind, THE SYSTEM SHALL set `turn` to 0.
- [x] **AC-F008.2** — THE SYSTEM SHALL treat as prompt-kind only `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit`; THE SYSTEM SHALL NOT increment `turn` for any other `event`, including `stop`, `agentStop`, `Stop`, `subagentStop`, and `SubagentStop`.
- [x] **AC-F008.3** — THE SYSTEM SHALL write `turn` `1` on the first prompt-kind document in that Session YAML log and SHALL write `turn` `2`, `3`, … on each later prompt-kind document in file order; THE SYSTEM SHALL write `turn` `0` on every document that precedes the first prompt-kind document.
- [x] **AC-F008.4** — THE SYSTEM SHALL NOT rewrite `turn` on previously written documents in that Session YAML log.
- [x] **AC-F008.5** — THE SYSTEM SHALL NOT persist `turn` on the Event log line and SHALL NOT require any file other than that session’s Session YAML log to determine `turn`.
- [x] **AC-F008.6** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) and SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1 | keep | numbering 0 then 1 then 1 unchanged; flip expected YAML keys to `event:` / `harness:` (not `source_event:`); `session_id` only on the initial sessionStart; `turn` is last header field (5th on that document, 4th on later) |
| AC-F008.2 — only three prompt-kind aliases increment turn | redo | prompt-kind is YAML `event` values, not `source_event`; assert `event:` (not `source_event:`) on documents; trap still F002 positional vs payload `hook_event_name`; first event is prompt so no document gets `session_id` |
| AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0 | keep | numbering 0, 0, 1, 2 unchanged; flip expected YAML keys; `session_id` only on the initial sessionStart |
| AC-F008.4 — append-only: prior documents' turn is not rewritten | keep | snapshot still byte-identical; first doc is sessionStart (`session_id` present); expected keys `event:` not `source_event:`; do not change unquoted `turn: 0` |
| AC-F008.5 — Event log has no turn overlay and no sidecar Turn file | keep | no YAML header snapshot of `source_event:`; Event log / sidecar asserts unchanged |
| AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration | keep | spawn/stdout/package.json only; no YAML header snapshot |
| Step 7: Leave existing F001–F007 e2e files | keep | F008 still does not edit F001–F007 files; F003.11 / F003.12 / F004.17 are deprecated by sibling F003/F004 plans — do not reopen them here |

## Implementation Steps

### Step 1: AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1
Keep numbering. Spawn three sequential ingests for the same `session_id`: `sessionStart` (not prompt-kind, none already present → `turn: 0`); `beforeSubmitPrompt` (prompt-kind, zero already present → `turn: 1`); `stop` (not prompt-kind, one already present → `turn: 1`). Flip expected YAML keys: `event:` not `source_event:`; `session_id` only on the initial sessionStart. Assert unquoted YAML integers via `yamlRawScalar` / `assertYamlIntegerTurn` (must **not** be `"0"` / `"1"` quoted). Do not use `yamlMapping` values for `turn` (it strips quotes). Do not change turn numbering 0 then 1 then 1. Verifies AC-F008.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.1-turn-formula-session-prompt-stop.test.ts`
- [x] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Same `session_id` `"sess-ac-f008-1"` on every payload. Sequential extra argv: `["cursor", "sessionStart"]`, then `["cursor", "beforeSubmitPrompt"]` (payload may include `prompt`), then `["cursor", "stop"]`. Parse documents with `yamlDocuments`. Read `turn` with `yamlRawScalar` / `assertYamlIntegerTurn` (do **not** trust `yamlMapping.values.turn` for quote-stripping). Expected keys are `harness` / `event` (not `source_harness` / `source_event`). Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not change `spawnIngest` default extra argv
- [x] Act: spawn the three ingests in order against the same fixture (title includes `AC-F008.1`)
- [x] Assert: all three `exitCode === 0`; stdout empty. After spawn 1: one document; keys `session_id`, `harness`, `event`, `timestamp`, `turn`; `event: sessionStart` (not `source_event:`); `assertYamlIntegerTurn` returns `0` as an unquoted YAML integer (`yamlRawScalar` must match `/^-?\d+$/` and equal `0`; must **not** be the quoted scalars `"0"` / `'0'`). After spawn 2: two documents; latest omits `session_id`; keys `harness`, `event`, `timestamp`, `turn`; `event: beforeSubmitPrompt`; latest `turn` raw scalar is unquoted `1`. After spawn 3: three documents; latest omits `session_id`; `event: stop`; latest `turn` raw scalar is unquoted `1`. First document’s `turn` stays unquoted `0`. `turn` is not a body field (last header key only — 5th on the initial sessionStart, 4th on later documents). No `source_event:` / `source_harness:` on any document (AC-F008.1)

---

### Step 2: AC-F008.2 — only three prompt-kind aliases increment turn
Redo. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` — not `source_event:`, not payload `hook_event_name`. Same session: after a Cursor prompt (`turn: 1`), spawn non-prompt-kind stops across harnesses — they stay `turn: 1`. Then Copilot `userPromptSubmitted` → `turn: 2`; Claude `UserPromptSubmit` → `turn: 3`. Trap: positional `stop` with payload `hook_event_name: beforeSubmitPrompt` must **not** increment (`event:` is the F002 positional `stop`). First event is a prompt, so **no** document gets `session_id` (F003). Do not spawn Copilot or Claude processes (extra argv only). Do not change turn numbering 1 / 1 / 2 / 3. Verifies AC-F008.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.2-prompt-kind-aliases-only.test.ts`
- [x] Arrange: isolated fixture; same F001 `session_id` `"sess-ac-f008-2"` on every payload (Copilot `sessionId` alone is not a session identifier). Sequential extra argv after the first prompt (each later title includes `AC-F008.2`):
    1. Cursor prompt — `["cursor", "beforeSubmitPrompt"]` → expect `event: beforeSubmitPrompt`, `turn: 1`
    2. Trap — `["cursor", "stop"]` with payload `hook_event_name: "beforeSubmitPrompt"` → `event: stop` (not inferred from payload), still `turn: 1`
    3. Cursor `["cursor", "stop"]` → `event: stop`, `turn: 1`
    4. Cursor `["cursor", "subagentStop"]` → `event: subagentStop`, `turn: 1`
    5. Copilot `["copilot", "agentStop"]` → `event: agentStop`, `turn: 1`
    6. Claude `["claude-code", "Stop"]` → `event: Stop`, `turn: 1`
    7. Claude `["claude-code", "SubagentStop"]` → `event: SubagentStop`, `turn: 1`
    8. Copilot `["copilot", "userPromptSubmitted"]` → `event: userPromptSubmitted`, `turn: 2`
    9. Claude `["claude-code", "UserPromptSubmit"]` → `event: UserPromptSubmit`, `turn: 3`
    Do not import `cli/src/**`. Do not spawn a Copilot or Claude process. Assert unquoted integers via `yamlRawScalar` / `assertYamlIntegerTurn`. Read prompt-kind from YAML `event:` (not `source_event:`)
- [x] Act: spawn all nine in order against the same fixture
- [x] Assert: every spawn `exitCode === 0`; stdout empty. Every document has `event:` equal to that spawn’s F002 event positional and has **no** `source_event:` key. No document has `session_id` (first event is not session-start). After step 1, latest raw `turn` is unquoted `1` and `event: beforeSubmitPrompt`. After steps 2–7, latest raw `turn` is still unquoted `1` (trap included: payload `hook_event_name` does not make `stop` prompt-kind; `event:` stays the positional). After step 8, latest raw `turn` is unquoted `2` and `event: userPromptSubmitted`. After step 9, latest raw `turn` is unquoted `3` and `event: UserPromptSubmit`. `assertYamlIntegerTurn` must fail if the scalar is quoted (`"1"` / `'1'`) (AC-F008.2)

---

### Step 3: AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0
Keep numbering. Sequence on one session: `sessionStart` then `subagentStart` (both preamble → `turn: 0`); first `beforeSubmitPrompt` → `turn: 1`; second `beforeSubmitPrompt` → `turn: 2`. Flip expected YAML keys: `event:` not `source_event:`; `session_id` only on the initial sessionStart. Do not change turn numbering 0, 0, 1, 2. Verifies AC-F008.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.3-first-prompt-one-preamble-zero.test.ts`
- [x] Arrange: isolated fixture; same `session_id` `"sess-ac-f008-3"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "subagentStart"]` (payload may include `subagent_type`); `["cursor", "beforeSubmitPrompt"]` (first prompt); `["cursor", "beforeSubmitPrompt"]` (second prompt). Expected keys `harness` / `event` (not `source_harness` / `source_event`). Do not import `cli/src/**`. Assert unquoted integers via `yamlRawScalar` / `assertYamlIntegerTurn`
- [x] Act: spawn the four ingests in order (title includes `AC-F008.3`)
- [x] Assert: all `exitCode === 0`; stdout empty. Four documents in file order: raw unquoted `turn` `0`, `0`, `1`, `2`. Documents that precede the first prompt-kind document are both unquoted `0`. First prompt-kind document is unquoted `1`; the later prompt-kind document is unquoted `2`. First document has `session_id` and `event: sessionStart`. Later documents omit `session_id` and use `event:` (`subagentStart`, `beforeSubmitPrompt`, `beforeSubmitPrompt`) — not `source_event:` (AC-F008.3)

---

### Step 4: AC-F008.4 — append-only: prior documents' turn is not rewritten
Keep numbering. Capture the first document’s bytes after `sessionStart` (`turn: 0`). After a later prompt then stop, the first document text (including `turn: 0`) is unchanged. No rewrite of prior `turn`. Flip expected keys on the snapshot: first document is the initial sessionStart (`session_id` present, `event: sessionStart`, not `source_event:`). Do not change the unquoted `turn: 0` assertion. Verifies AC-F008.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.4-append-only-prior-turn-unchanged.test.ts`
- [x] Arrange: isolated fixture; same `session_id` `"sess-ac-f008-4"`. After the first spawn, snapshot the first document string (`yamlDocuments(text)[0]`). Then spawn `beforeSubmitPrompt` and `stop`. Do not import `cli/src/**`. Do not snapshot or expect `source_event:`
- [x] Act: spawn `ingest cursor sessionStart`, snapshot, then spawn `ingest cursor beforeSubmitPrompt`, then `ingest cursor stop` (title includes `AC-F008.4`)
- [x] Assert: all `exitCode === 0`; stdout empty. After all three, three documents each beginning with `---`. First document text is byte-identical to the snapshot (includes unquoted `turn: 0`, `event: sessionStart`, `session_id`; does **not** contain `source_event:`). First document’s `yamlRawScalar(..., "turn")` is still `"0"`. Later documents may be `turn: 1` and omit `session_id`; that must not rewrite the first (AC-F008.4)

---

### Step 5: AC-F008.5 — Event log has no turn overlay and no sidecar Turn file
Keep. Prompt ingest: Event log line deep-equals the payload and has **no** `turn` key. No sidecar Turn file. Day-folder files besides jsonl / index / md / lock are only `{session_id}.yaml`. Prompt ingest stays observe-only. No YAML header snapshot of `source_event:`. Verifies AC-F008.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.5-no-event-log-turn-no-sidecar.test.ts`
- [x] Arrange: isolated fixture; extra argv `["cursor", "beforeSubmitPrompt"]`; payload `session_id` `"sess-ac-f008-5"`, `prompt` `"hello"` — **no** `turn` key on stdin. After spawn, `readdir` the day folder (`dayFolder(projectRoot)`). Do not import `cli/src/**`. Do not plant a Turn file
- [x] Act: spawn ingest (title includes `AC-F008.5`)
- [x] Assert: `exitCode === 0`; stdout `""` (observe-only: no `continue` / `permission` / `followup_message`). Event log has one line; `parseObject` deep-equals the payload; `"turn" in line === false`. YAML files in the day folder are exactly `["sess-ac-f008-5.yaml"]`. Day-folder names are a subset of `events.jsonl`, `sessions.json`, `sess-ac-f008-5.yaml`, `sess-ac-f008-5.md`, `ingest.lock`. No sidecar such as `turn`, `turns.json`, `turns.yaml`, `sess-ac-f008-5.turn` (AC-F008.5)

---

### Step 6: AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration
Keep. `sessionStart`, `beforeSubmitPrompt`, and `stop` all `exitCode === 0` and stdout `""` (no continue/block/permission JSON). Existing ESM ingest: spawn `cli/src/index.ts` via `spawnIngest` (not `.agents/hooks/index.mjs`). `cli/package.json` stays Node ≥ 24 ESM with empty `dependencies`. Do not edit `.cursor/hooks.json`. No YAML header snapshot. Verifies AC-F008.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.6-observe-only-existing-esm.test.ts`
    - `cli/package.json`
- [x] Arrange: isolated fixture(s); three payloads each with a F001 `session_id` (`"sess-ac-f008-6-start"`, `"sess-ac-f008-6-prompt"`, `"sess-ac-f008-6-stop"`). Extra argv `["cursor", "sessionStart"]`, `["cursor", "beforeSubmitPrompt"]`, `["cursor", "stop"]`. Load `cli/package.json`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not edit `.cursor/hooks.json`. Do not add `.cmd` wrappers
- [x] Act: parse `cli/package.json`; spawn the three ingests (each title includes `AC-F008.6`)
- [x] Assert: `"type": "module"`; `"dependencies": {}`; `engines.node` starts with `>=24`. All three `exitCode === 0` and stdout `""` (no `continue`, `block`, `permission`, `followup_message`, or other rewrite JSON). Spawn path remains `cli/src/index.ts` (`spawnIngest`); do not invoke the bun-bundled hook artifact (AC-F008.6)

---

### Step 7: Leave existing F001–F007 e2e files
Keep. Leave existing F001–F007 e2e files as-is from this container. F003 compact-header tests and F004 report-consumer tests are sibling plans (AC-F003.11 / AC-F003.12 / AC-F004.17 are deprecated there). Do not reopen them here. F008 numbering must **not** break integer-turn helpers that accept any YAML integer. Hook-key tests stay six events. F008 adds **no** Cursor registration. Do not plan F004 report-trigger e2e.
- Paths:
    - `e2e/ac-f003.13-*.test.ts` (F003 sibling; was `e2e/ac-f003.11-yaml-document-header.test.ts`)
    - `e2e/ac-f003.16-*.test.ts` (F003 sibling; was `e2e/ac-f003.12-unrecognized-header-only.test.ts`)
    - `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts`
    - `e2e/ac-f006.8-stop-yaml-header-only.test.ts`
    - `e2e/ac-f004.18-turn-duration.test.ts`
    - `e2e/ac-f004.19-turn-prompt.test.ts`
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts`
    - `e2e/ac-f005.1-register-before-submit-prompt.test.ts`
    - `e2e/ac-f006.1-register-stop.test.ts`
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts`
- [x] Arrange: keep those test files and their AC titles from this container’s point of view. Do not drop them here. Do not change `spawnIngest` default extra argv. Do not edit `.cursor/hooks.json` for F008. Do not add `.cmd` wrappers. Do not edit F001–F007 files in this plan
- [x] Act: leave as-is (no assertion edits in this container)
- [x] Assert:
    - F003 compact-header e2e (AC-F003.13 / .14 / .15 / .16) — sibling F003 plan; `assertYamlIntegerTurn` / `/^-?\d+$/` still must **not** require exact `0`. F008 numbering must not break them
    - `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts` — already uses `assertYamlIntegerTurn` (not exact `0`); leave as-is here
    - `e2e/ac-f006.8-stop-yaml-header-only.test.ts` — already uses `assertYamlIntegerTurn`; leave as-is here
    - F004 turn-subsection / duration / prompt-in-subsection — F004 report consumer; do not reopen (AC-F004.17 dropped by F004 sibling)
    - Hook-key tests (F001.6 / F002.4 / F005.1 / F006.1) stay six events. F008 adds **no** registration
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` — leave as-is

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F007.
- Did not run `node --test e2e/*.test.ts` (e2e `/codify` is compile/lint only; `/verify` runs the suite). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F007).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. Did not change the helper’s default. Did not edit `e2e/spawn.ts` — `yamlRawScalar` / `assertYamlIntegerTurn` / `listYamlFiles` / `dayFolder` were sufficient.
- YAML in tests is observed as text (split on `---`, read keys in order). No YAML library in e2e either. `yamlMapping` strips quotes — F008 numbering asserts use `yamlRawScalar` / `assertYamlIntegerTurn` for unquoted integers (not `yamlMapping.values.turn`).
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only. Copilot `sessionId` is not a F001 session identifier; cases that need YAML still include `session_id`.
- Do not add Cursor registrations or `.cmd` wrappers. F008 does not change `.cursor/hooks.json` (six events stay).
- Do not plan F004 report-trigger e2e. Do not reopen F004. Do not reopen F001–F007 ACs. Step 7 leaves existing F001–F007 e2e files as-is from this container. Integer-turn helpers still accept any YAML integer.
- Did not change turn numbering assertions (0 / 1 / 2 / 3 per scenario).
- Copied F003 compact Session YAML log wording into the shared store section (`harness` / `event`; `session_id` only on the initial sessionStart). Prompt-kind is YAML `event` values.
- Did not edit `docs/specs/F008-conversation-turns/spec.md` (left `pending`). Did not git commit.
- Did not amend F003 / F004 / F005 / F006 / F007 specs or their plans.
- Compact-header flip of F008 e2e: edited `e2e/ac-f008.1`–`.4` only. Scanned all `e2e/ac-f008.*.test.ts` — none expected `source_event`/`source_harness` as positive keys (they never asserted those headers). Negative asserts now require `event:` / `harness:` and forbid `source_event:` / `source_harness:`. `session_id` only on the initial sessionStart (.1/.3/.4); AC-F008.2 first event is a prompt so no document has `session_id`. AC-F008.2 trap still uses positional `stop` vs payload `hook_event_name`. Numbering 0 / 1 / 2 / 3 and stop-stays unchanged. Left `e2e/ac-f008.5` and `e2e/ac-f008.6` unchanged (no YAML header snapshot). Did not edit `e2e/spawn.ts` or other e2e files.

---

> last updated: 2026-09-02T08:37:47Z
