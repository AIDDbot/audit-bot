---
spec-kind: functional
container: e2e
---
# F008-conversation-turns - e2e

## Specification

User-facing flow under test: ingest (spawned as `ingest {harness} {event}`) persists F001 Event log / Session index and F010 Session JSONL. Each appended JSON object’s `turn` (after `timestamp`) is a JSON number: the count of prompt-kind objects already in that session’s Session JSONL log, plus one when this object is itself prompt-kind; otherwise that same count; `0` when none are present and this object is not prompt-kind. Prompt-kind is only the JSON `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` (F002 positional written as `event`, not `source_event`, not payload `hook_event_name`). Repeated `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` stay on the current turn. Prior objects are not rewritten. The Event log stays F001 verbatim (no `turn` overlay, no sidecar Turn file). Observe-only: exit 0, no blocking stdout. F008 does not change Cursor registration (six events stay). Do not add Copilot or Claude registrations. Do not add `.cmd` wrappers.

This spec does not replace F001–F007 or F010. Compact header keys (`harness` / `event`) and `session_id` only on the initial sessionStart are F003. Session JSONL format, filename, and serialization are F010. Session report grouping, turn duration, and prompt-in-subsection are F004 — do not reopen. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts` via `spawnIngest`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work. This plan does **not** cover F004 report-trigger e2e.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (C001 / F010 amend of F008 e2e; prior plan last updated 2026-09-02T08:37:47Z). Production already writes JSONL and scans that session’s JSONL for turn (F010 `nextConversationTurn`).

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`) via existing `spawnIngest`. Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). F001 tests (AC-F001.1–7) rely on default none. **Do not change the default `extraArgv` behavior.** JSONL helpers already exist (F010): `sessionJsonlPath`, `readSessionJsonl`, `jsonlRecords`, `listJsonlSessionFiles`. YAML helpers stay on `spawn.ts` until later specs drop them. **F008 tests must not read yaml** (`readSessionYaml` / `yamlDocuments` / `yamlMapping` / `yamlRawScalar` / `assertYamlIntegerTurn` / `sessionYamlPath` / `listYamlFiles`). Parse with `jsonlRecords`. `turn` is `typeof === "number"`. Do **not** add a helpers step
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No JSON library (`JSON.parse` / `JSON.stringify` only). No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F008.1 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only (`copilot` / `claude-code` + `userPromptSubmitted` / `UserPromptSubmit` / `agentStop` / `Stop` / `SubagentStop`)
- When a Session JSONL log is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers. F008 does **not** change `.cursor/hooks.json` (six events stay)
- Do **not** reopen F001–F007 or F010 ACs. F003 compact-header tests and F004 report-consumer tests are sibling plans. Plan Step 7 as leave-as-is
- Do **not** plan F004 report-trigger e2e
- Do **not** change turn numbering assertions (0 / 1 / 2 / 3 as already specified per scenario). Redo the observation: JSON number via `jsonlRecords`, not unquoted YAML integer
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite). There is no e2e tsconfig/oxlint — typecheck and lint are typically skipped (same as F001–F010). Planify must not run e2e either

### Shared store wording

> Copied from [cli.plan.md](./cli.plan.md). Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. This container numbers `turn` by counting prompt-kind `event` values on parsed JSONL objects in **that session’s** Session JSONL log only.

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
- Do **not** merge the Session JSONL log into this file. Do **not** read this file to compute `turn`.

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
- Do **not** read this file to compute `turn`.

**Session JSONL log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`

- Always a `.jsonl` file named for the F001 session identifier (F010). One file per distinct identifier for that day.
- One JSON object per line. Append-only. Format, filename, and serialization stay F010.
- Do not write `{session_id}.yaml`. Do not read/migrate/rewrite existing `.yaml`. Do not mix YAML and JSONL in one session.
- Do not merge into `events.jsonl`.
- When the payload has a session identifier: append exactly one JSON object as one new line in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; do not re-read the line just appended to *produce* it). Under `ingest.lock`, read that session’s **existing** Session JSONL log (missing file → zero prompt-kind objects) to compute `turn`. Determining whether this is the initial session-start (F003) may use that same read. Do not read the Event log or Session index to determine `turn`. Do not read `.yaml`.
- When the payload has no session identifier: do not create or append a Session JSONL log.
- Every object is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (never a string, never a zero-padded string, never a body field). When appending an object, `turn` is the number of prompt-kind objects already present in that session’s Session JSONL log, plus one if this object is itself prompt-kind; otherwise that same already-present count. When none are already present and this object is not prompt-kind, `turn` is 0. Prompt-kind is only JSON `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` (the F002 positional written as header `event`, not payload `hook_event_name`, not `source_event`). The first prompt-kind object is turn 1; each later prompt-kind object is one greater (`2`, `3`, …). Objects written before that first prompt-kind object are turn 0. `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` belong to the current turn; their multiplicity does not start or end a turn. Do not rewrite `turn` on previously written objects. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session JSONL log to determine `turn`.
- Body after the header stays F003 / F009 / F007 / F006. Do not add `turn` to the body or to `docs/normalized-fields.md`.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every Session JSONL log append). Do not change them here. The report already reads `turn` from JSONL; correct numbering is this spec’s job.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn`, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = harness. Optional `process.argv[4]` = event.
- Harness and event are F002 invocation inputs. Pass them into ingest so the session-record header (including prompt-kind for `turn`) can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do not change F002 command positionals. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F008 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn `cli/src/index.ts`, not that artifact.

### Acceptance criteria under test

- [ ] **AC-F008.1** — WHEN ingest appends a JSON object to a Session JSONL log, THE SYSTEM SHALL set `turn` to the number of prompt-kind objects already present in that file, plus one if the JSON object being appended is itself prompt-kind, otherwise that same number; WHEN no prompt-kind object is already present and the JSON object being appended is not prompt-kind, THE SYSTEM SHALL set `turn` to 0.
- [x] **AC-F008.2** — THE SYSTEM SHALL treat as prompt-kind only `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit`; THE SYSTEM SHALL NOT increment `turn` for any other `event`, including `stop`, `agentStop`, `Stop`, `subagentStop`, and `SubagentStop`.
- [ ] **AC-F008.3** — THE SYSTEM SHALL write `turn` `1` on the first prompt-kind object in that Session JSONL log and SHALL write `turn` `2`, `3`, … on each later prompt-kind object in file order; THE SYSTEM SHALL write `turn` `0` on every object that precedes the first prompt-kind object.
- [ ] **AC-F008.4** — THE SYSTEM SHALL NOT rewrite `turn` on previously written objects in that Session JSONL log.
- [ ] **AC-F008.5** — THE SYSTEM SHALL NOT persist `turn` on the Event log line and SHALL NOT require any file other than that session’s Session JSONL log to determine `turn`.
- [x] **AC-F008.6** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) and SHALL provide this behavior as the existing Node.js ≥ 24 ESM ingest (plus any small helper it needs) with no external dependencies.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1 | redo | formula 0 then 1 then 1 stays; retarget to `jsonlRecords` / `{session_id}.jsonl`; `typeof turn === "number"`; do not read yaml |
| AC-F008.2 — only three prompt-kind aliases increment turn | redo | prompt-kind is JSON `event` values; retarget to `jsonlRecords`; trap still F002 positional vs payload `hook_event_name`; `typeof turn === "number"`; do not read yaml |
| AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0 | redo | numbering 0, 0, 1, 2 stays; retarget to `jsonlRecords`; `typeof turn === "number"`; do not read yaml |
| AC-F008.4 — append-only: prior documents' turn is not rewritten | redo | first-line bytes stay identical; snapshot JSONL (not a YAML document / `---`); `typeof turn === "number"`; do not read yaml |
| AC-F008.5 — Event log has no turn overlay and no sidecar Turn file | redo | Event log / sidecar asserts keep; day-folder session file is `{session_id}.jsonl` not `.yaml`; do not read yaml; do not require `events.jsonl` to compute turn |
| AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration | keep | spawn/stdout/`cli/package.json` only; no YAML in the AC; leave as-is |
| Step 7: Leave existing F001–F007 e2e files | keep | F008 still does not edit F001–F007/F010 files; siblings own their JSONL retargets — do not reopen them here |

## Implementation Steps

### Step 1: AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1
Keep numbering. Spawn three sequential ingests for the same `session_id`: `sessionStart` (not prompt-kind, none already present → `turn` `0`); `beforeSubmitPrompt` (prompt-kind, zero already present → `turn` `1`); `stop` (not prompt-kind, one already present → `turn` `1`). Retarget observation to `jsonlRecords` of `{session_id}.jsonl`. `turn` is `typeof === "number"` (must **not** be the string `"0"` / `"1"`). Do not read yaml. Do not use `assertYamlIntegerTurn`. Do not change turn numbering 0 then 1 then 1. Verifies AC-F008.1.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.1-turn-formula-session-prompt-stop.test.ts`
- [ ] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Same `session_id` `"sess-ac-f008-1"` on every payload. Sequential extra argv: `["cursor", "sessionStart"]`, then `["cursor", "beforeSubmitPrompt"]` (payload may include `prompt`), then `["cursor", "stop"]`. Parse with `jsonlRecords` / `readSessionJsonl`. Key order via `Object.keys`. Drop `readSessionYaml` / `yamlDocuments` / `yamlMapping` / `yamlRawScalar` / `assertYamlIntegerTurn`. Expected keys are `harness` / `event` (not `source_harness` / `source_event`). Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not change `spawnIngest` default extra argv
- [ ] Act: spawn the three ingests in order via `spawnIngest` against the same fixture (title includes `AC-F008.1`)
- [ ] Assert: all three `exitCode === 0`; stdout empty. After spawn 1: one object; keys `session_id`, `harness`, `event`, `timestamp`, `turn`; `event` is `"sessionStart"`; `typeof turn === "number"` and `turn === 0`. After spawn 2: two objects; latest omits `session_id`; keys `harness`, `event`, `timestamp`, `turn`; `event` is `"beforeSubmitPrompt"`; latest `turn === 1` and `typeof === "number"`. After spawn 3: three objects; latest omits `session_id`; `event` is `"stop"`; latest `turn === 1`; first object’s `turn` stays `0`. `turn` is not a body field (last header key only — 5th on the initial sessionStart, 4th on later objects). No `source_event` / `source_harness` keys. File is `{session_id}.jsonl` (AC-F008.1)

---

### Step 2: AC-F008.2 — only three prompt-kind aliases increment turn
Redo. Prompt-kind is JSON `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` — not `source_event`, not payload `hook_event_name`. Same session: after a Cursor prompt (`turn` `1`), spawn non-prompt-kind stops across harnesses — they stay `turn` `1`. Then Copilot `userPromptSubmitted` → `turn` `2`; Claude `UserPromptSubmit` → `turn` `3`. Trap: positional `stop` with payload `hook_event_name: beforeSubmitPrompt` must **not** increment (`event` is the F002 positional `stop`). First event is a prompt, so **no** object gets `session_id` (F003). Do not spawn Copilot or Claude processes (extra argv only). Do not read yaml. Do not change turn numbering 1 / 1 / 2 / 3. Verifies AC-F008.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.2-prompt-kind-aliases-only.test.ts`
- [ ] Arrange: isolated fixture; same F001 `session_id` `"sess-ac-f008-2"` on every payload (Copilot `sessionId` alone is not a session identifier). Sequential extra argv after the first prompt (each later title includes `AC-F008.2`):
    1. Cursor prompt — `["cursor", "beforeSubmitPrompt"]` → expect `event` `"beforeSubmitPrompt"`, `turn` `1`
    2. Trap — `["cursor", "stop"]` with payload `hook_event_name: "beforeSubmitPrompt"` → `event` `"stop"` (not inferred from payload), still `turn` `1`
    3. Cursor `["cursor", "stop"]` → `event` `"stop"`, `turn` `1`
    4. Cursor `["cursor", "subagentStop"]` → `event` `"subagentStop"`, `turn` `1`
    5. Copilot `["copilot", "agentStop"]` → `event` `"agentStop"`, `turn` `1`
    6. Claude `["claude-code", "Stop"]` → `event` `"Stop"`, `turn` `1`
    7. Claude `["claude-code", "SubagentStop"]` → `event` `"SubagentStop"`, `turn` `1`
    8. Copilot `["copilot", "userPromptSubmitted"]` → `event` `"userPromptSubmitted"`, `turn` `2`
    9. Claude `["claude-code", "UserPromptSubmit"]` → `event` `"UserPromptSubmit"`, `turn` `3`
    Parse with `jsonlRecords`. Drop YAML helpers. Do not import `cli/src/**`. Do not spawn a Copilot or Claude process. Assert `typeof turn === "number"`
- [ ] Act: spawn all nine in order via `spawnIngest` against the same fixture
- [ ] Assert: every spawn `exitCode === 0`; stdout empty. Every object has `event` equal to that spawn’s F002 event positional and has **no** `source_event` key. No object has `session_id` (first event is not session-start). After step 1, latest `turn === 1` (`typeof === "number"`) and `event` is `"beforeSubmitPrompt"`. After steps 2–7, latest `turn` is still `1` (trap included: payload `hook_event_name` does not make `stop` prompt-kind). After step 8, latest `turn === 2` and `event` is `"userPromptSubmitted"`. After step 9, latest `turn === 3` and `event` is `"UserPromptSubmit"`. Fail if `turn` is a string (AC-F008.2)

---

### Step 3: AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0
Keep numbering. Sequence on one session: `sessionStart` then `subagentStart` (both preamble → `turn` `0`); first `beforeSubmitPrompt` → `turn` `1`; second `beforeSubmitPrompt` → `turn` `2`. Retarget to `jsonlRecords`. `typeof turn === "number"`. `session_id` only on the initial sessionStart. Do not read yaml. Do not change turn numbering 0, 0, 1, 2. Verifies AC-F008.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.3-first-prompt-one-preamble-zero.test.ts`
- [ ] Arrange: isolated fixture; same `session_id` `"sess-ac-f008-3"`. Sequential extra argv: `["cursor", "sessionStart"]`; `["cursor", "subagentStart"]` (payload may include `subagent_type`); `["cursor", "beforeSubmitPrompt"]` (first prompt); `["cursor", "beforeSubmitPrompt"]` (second prompt). Parse with `jsonlRecords`. Drop YAML helpers. Do not import `cli/src/**`
- [ ] Act: spawn the four ingests in order via `spawnIngest` (title includes `AC-F008.3`)
- [ ] Assert: all `exitCode === 0`; stdout empty. Four objects in file order: `turn` `0`, `0`, `1`, `2`, each `typeof === "number"`. Objects that precede the first prompt-kind object are both `0`. First prompt-kind object is `1`; the later prompt-kind object is `2`. First object has `session_id` and `event` `"sessionStart"`. Later objects omit `session_id` and use `event` (`subagentStart`, `beforeSubmitPrompt`, `beforeSubmitPrompt`) — not `source_event` (AC-F008.3)

---

### Step 4: AC-F008.4 — append-only: prior objects' turn is not rewritten
Keep numbering. Capture the first JSONL line bytes after `sessionStart` (`turn` `0`). After a later prompt then stop, the first line (including `turn` `0`) is unchanged. No rewrite of prior `turn`. Snapshot is JSONL text, not a YAML document (`---`). Do not read yaml. Do not change the `turn` `0` assertion (as a JSON number). Verifies AC-F008.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.4-append-only-prior-turn-unchanged.test.ts`
- [ ] Arrange: isolated fixture; same `session_id` `"sess-ac-f008-4"`. After the first spawn, snapshot the Session JSONL file bytes (utf8) or the first line. Then spawn `beforeSubmitPrompt` and `stop`. Parse with `jsonlRecords`. Drop `yamlDocuments` / `startsWith("---")` / `assertYamlIntegerTurn`. Do not import `cli/src/**`
- [ ] Act: spawn `ingest cursor sessionStart` via `spawnIngest`, snapshot, then spawn `ingest cursor beforeSubmitPrompt`, then `ingest cursor stop` (title includes `AC-F008.4`)
- [ ] Assert: all `exitCode === 0`; stdout empty. After all three, three `jsonlRecords`. File text starts with the first-spawn snapshot (first line bytes unchanged; includes `turn` `0` as a JSON number, `event` `"sessionStart"`, `session_id`; does **not** contain `source_event`). First object’s `typeof turn === "number"` and `turn === 0`. Later objects may be `turn` `1` and omit `session_id`; that must not rewrite the first (AC-F008.4)

---

### Step 5: AC-F008.5 — Event log has no turn overlay and no sidecar Turn file
Redo. Prompt ingest: Event log line deep-equals the payload and has **no** `turn` key. No sidecar Turn file. Day-folder files besides Event log / index / md / lock are only `{session_id}.jsonl` (not `{session_id}.yaml`). Prompt ingest stays observe-only. Do not read yaml. Do not require `events.jsonl` to compute `turn`. Verifies AC-F008.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.5-no-event-log-turn-no-sidecar.test.ts`
- [ ] Arrange: isolated fixture; extra argv `["cursor", "beforeSubmitPrompt"]`; payload `session_id` `"sess-ac-f008-5"`, `prompt` `"hello"` — **no** `turn` key on stdin. After spawn, `readdir` the day folder (`dayFolder(projectRoot)`). Reuse `listJsonlSessionFiles` / `sessionJsonlPath`. Drop `listYamlFiles` and allowed-name `{sessionId}.yaml`. Do not import `cli/src/**`. Do not plant a Turn file
- [ ] Act: spawn ingest via `spawnIngest` (title includes `AC-F008.5`)
- [ ] Assert: `exitCode === 0`; stdout `""` (observe-only: no `continue` / `permission` / `followup_message`). Event log has one line; `parseObject` deep-equals the payload; `"turn" in line === false`. Session JSONL files in the day folder are exactly `["sess-ac-f008-5.jsonl"]`. Day-folder names are a subset of `events.jsonl`, `sessions.json`, `sess-ac-f008-5.jsonl`, `sess-ac-f008-5.md`, `ingest.lock`. No sidecar such as `turn`, `turns.json`, `turns.yaml`, `sess-ac-f008-5.turn`. `{session_id}.yaml` is not required and must not be the session log (AC-F008.5)

---

### Step 6: AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration
Keep. `sessionStart`, `beforeSubmitPrompt`, and `stop` all `exitCode === 0` and stdout `""` (no continue/block/permission JSON). Existing ESM ingest: spawn `cli/src/index.ts` via `spawnIngest` (not `.agents/hooks/index.mjs`). `cli/package.json` stays Node ≥ 24 ESM with empty `dependencies`. Do not edit `.cursor/hooks.json`. No YAML in the AC — do not start reading yaml. Verifies AC-F008.6.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f008.6-observe-only-existing-esm.test.ts`
    - `cli/package.json`
- [x] Arrange: isolated fixture(s); three payloads each with a F001 `session_id` (`"sess-ac-f008-6-start"`, `"sess-ac-f008-6-prompt"`, `"sess-ac-f008-6-stop"`). Extra argv `["cursor", "sessionStart"]`, `["cursor", "beforeSubmitPrompt"]`, `["cursor", "stop"]`. Load `cli/package.json`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Do not edit `.cursor/hooks.json`. Do not add `.cmd` wrappers. Do not read yaml
- [x] Act: parse `cli/package.json`; spawn the three ingests via `spawnIngest` (each title includes `AC-F008.6`)
- [x] Assert: `"type": "module"`; `"dependencies": {}`; `engines.node` starts with `>=24`. All three `exitCode === 0` and stdout `""` (no `continue`, `block`, `permission`, `followup_message`, or other rewrite JSON). Spawn path remains `cli/src/index.ts` (`spawnIngest`); do not invoke the bun-bundled hook artifact (AC-F008.6)

---

### Step 7: Leave existing F001–F007 and F010 e2e files
Keep. Leave existing F001–F007 and F010 e2e files as-is from this container. F003 compact-header tests and F004 report-consumer tests are sibling plans. Do not reopen them here. F008 numbering must **not** break F003/F010 tests that only assert `typeof turn === "number"`. Hook-key tests stay six events. F008 adds **no** Cursor registration. Do not plan F004 report-trigger e2e. Do not drop YAML helpers from `e2e/spawn.ts` (later specs).
- Paths:
    - `e2e/ac-f003.*.test.ts` (F003 sibling)
    - `e2e/ac-f010.*.test.ts` (F010 sibling)
    - `e2e/ac-f005.6-prompt-yaml-header-and-body.test.ts`
    - `e2e/ac-f006.8-stop-yaml-header-only.test.ts`
    - `e2e/ac-f004.18-turn-duration.test.ts`
    - `e2e/ac-f004.19-turn-prompt.test.ts`
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts`
    - `e2e/ac-f005.1-register-before-submit-prompt.test.ts`
    - `e2e/ac-f006.1-register-stop.test.ts`
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts`
- [x] Arrange: keep those test files and their AC titles from this container’s point of view. Do not drop them here. Do not change `spawnIngest` default extra argv. Do not edit `.cursor/hooks.json` for F008. Do not add `.cmd` wrappers. Do not edit F001–F007 or F010 files in this plan
- [x] Act: leave as-is (no assertion edits in this container)
- [x] Assert:
    - F003 compact-header e2e and F010 format e2e — sibling plans; they assert JSON number only, not F008 incrementing
    - F005.6 / F006.8 — sibling retargets; leave as-is here
    - F004 turn-subsection / duration / prompt-in-subsection — F004 report consumer; do not reopen
    - Hook-key tests (F001.6 / F002.4 / F005.1 / F006.1) stay six events. F008 adds **no** registration
    - `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` — leave as-is

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F007/F010.
- Did not run `node --test e2e/*.test.ts` (planify must not; e2e codify: compile/lint only; `/verify` runs the suite). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F010).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. Did not change the helper’s default. Did not add JSONL helpers (F010 already did). YAML helpers stay on `e2e/spawn.ts` until all specs drop them. F008 tests must not call them.
- JSONL in tests is observed with Node `JSON.parse` / `JSON.stringify` (split lines via `jsonlRecords`). Key order via `Object.keys`. `turn` is `typeof === "number"`. No YAML library and no JSON library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude cases are extra argv only. Copilot `sessionId` is not a F001 session identifier; cases that need a Session JSONL log still include `session_id`.
- Do not add Cursor registrations or `.cmd` wrappers. F008 does not change `.cursor/hooks.json` (six events stay).
- Do not plan F004 report-trigger e2e. Do not reopen F004. Do not reopen F001–F007 or F010 ACs. Step 7 leaves those e2e files as-is from this container.
- Did not change turn numbering assertions (0 / 1 / 2 / 3 per scenario). Observation retargets from unquoted YAML integer / `{session_id}.yaml` to JSON number / `{session_id}.jsonl`.
- Copied shared store wording from the sibling cli plan (Session JSONL log; `turn` is a JSON number; do not read `events.jsonl`).
- Did not amend F003 / F004 / F005 / F006 / F007 / F010 specs or their plans.
- AC-F008.6 is keep (observe-only; no YAML in the AC). Do not start reading yaml in that file.
- Spec status is set to `planned` in this planify run (both containers now have plans). `/codify` sets `in-progress`.

---

> last updated: 2026-09-02T15:32:41Z
