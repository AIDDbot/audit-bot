---
spec-kind: functional
container: cli
---
# F008-conversation-turns - cli

## Specification

On each Session JSONL log append, tag the new JSON object with `turn`: the count of prompt-kind objects already present in that session’s Session JSONL log (`{session_id}.jsonl`, F010), plus one if this object is prompt-kind; otherwise that same count. When none are already present and this object is not prompt-kind, `turn` is 0. `turn` is always a JSON number. Prompt-kind is only JSON `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not increment for `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. First prompt-kind object is turn 1; later prompt-kind objects 2, 3, …. Objects before the first prompt are turn 0. Do not rewrite prior objects. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session JSONL log to determine `turn`. Do not read `events.jsonl` or `sessions.json`. Remain observe-only Node.js ≥ 24 ESM, no external deps, no new hook registrations. This spec does not replace F001–F007 or F010. Do not change report grouping, duration, Details, or `maybeWriteReport` (F004 as shipped). Do not add `turn` to `docs/normalized-fields.md`. Do not change F002 positionals. F003 owns compact header keys and `session_id` only on the initial session-start. F010 owns format, filename, and serialization. This container owns **numbering**.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **already names** Session JSONL log `{session_id}.jsonl`, `src/yaml.ts` as the normalized session JSONL record, `src/store.ts` Session JSONL log under `ingest.lock`, and turn numbering from prompt-kind `event` values in that file. F008 adds **no** new events. Do not amend architecture in this planify run (`/shipify` does that). `/codify` has no architecture step. [`docs/normalized-fields.md`](../../normalized-fields.md) does **not** list `turn` (`turn` is a header field, not a body field) — do **not** add it. Do not amend F003/F004/F005/F006/F007/F010 specs or their plans. F003 owns compact header emit. F004 already groups the Session report by `turn`. F010 already shipped JSONL scan. This container owns **the number**.

Grounding (numbering formula shipped; F010 already retargeted the scan from YAML text to JSONL objects; this amend is tests + AC wording onto Session JSONL log / JSON number / do not read `events.jsonl`):

- `cli/src/yaml.ts`: **already** `SessionRecordInput.turn: number`; `emitSessionRecord` assigns JSON-number `turn`. Emitter does **not** compute turn. Export `nextConversationTurn(existingJsonl: string, event: string): number`. Prompt-kind set is those three aliases. **Today** `parseJsonlRecords` + `eventField` counts prompt-kind `event` **values on parsed JSONL objects** (not `^event:` YAML, not `source_event`). Unrecognized / empty event is not prompt-kind. Do **not** import `report.ts` from ingest/store just to reuse parse. **Do not rewrite `nextConversationTurn` unless a new unit test proves a numbering bug.** Keep function complexity ≤ 8
- `cli/src/ingest.ts`: already passes `sessionEmit` into `persistIngest` (no `turn: 0` outside the lock). Keep. Do not change `maybeWriteReport`
- `cli/src/store.ts`: **already** counts under `ingest.lock`: read existing `{session_id}.jsonl` (ENOENT → `""`), `turn = nextConversationTurn(existing, event)`, `emitSessionRecord({ …, turn })`, append. Keep numbering under the lock. Do not invent a second lock. Do not read `events.jsonl` or `sessions.json` to determine turn. Do not read `.yaml`. Prebuilt `yamlDocument` override is **gone** (F010)
- `cli/src/report.ts`: already groups by `turn` from Session JSONL log. **Do not change** report grouping, duration, Details, or `maybeWriteReport`. F008 out of scope
- `cli/test/yaml.test.ts`: `headerDoc` already emits a JSONL line. Scanner fixtures already JSON objects. Leftover YAML: titles `empty yaml is 0…` / `empty yaml is 1…`; unused `_quoted` YAML-scalar argument; test `quoted event scalars that equal a prompt-kind alias count`. Formula tests (0 / 1 / 2, stops stay, Copilot/Claude aliases, `source_event` / `hook_event_name` traps) keep. Emitter exact-strings are F003/F010
- `cli/test/ingest.test.ts`: numbering sequences already assert turns `0` / `1` / `2` via `parseSessionRecords` while reading `{session_id}.jsonl`. Leftover YAML: bindings named `yaml`, titles `missing yaml first …`, `later append leaves prior document bytes`. Exact-string `"turn":0` is already a JSON number token. Redo F008 tests onto `jsonlRecords` + `typeof === "number"`. Do not rewrite F003/F005/F006/F010 titles here
- `cli/test/store.test.ts`: `sessionEmit` path; overlapping JSONL objects; planted yaml unread (F010.3). Keep. Do not revive `yamlDocument`
- `.cursor/hooks.json`: six events. **Do not change**
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** production `cli/src/` edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, Session JSONL log append-only rules (except numbering the new object), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Do not register Copilot or Claude. JSONL mapping for Copilot/Claude prompt aliases still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or report grouping (F004 as shipped)
- Do not change F002 command positionals (`ingest {harness} {event}`)
- Do not redo F010 format/filename/serialization. Do not redo F003 mapping

Unit tests cover AC-F008.1–6 at lib except entry spawn/`exitCode`/stdout (those are e2e). Unchecked criteria (text now says Session JSONL log): AC-F008.1, AC-F008.3, AC-F008.4, AC-F008.5. Checked: AC-F008.2 (prompt-kind `event` values), AC-F008.6 (observe-only). Unchecked ACs need AC-titled lib coverage. Keep formula on .1 / .2 / .3.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010); a **Session report** is the Markdown file derived from that JSONL (F004). Each JSON object includes JSON-number `turn` (which conversation turn the Event belongs to; a property of the object, not a separate persisted entity).

This spec does not add a persisted Turn file. Event log stays verbatim (no `turn`). Session index unchanged. JSONL numbering is this container’s job. The report already reads `turn` from JSONL; correct numbering is this spec’s job. Do not amend `model.schema.md` in this run.

### Shared store wording

> Copy this block verbatim into the F008 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. This container numbers `turn` by counting prompt-kind `event` values on parsed JSONL objects in **that session’s** Session JSONL log only.

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

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Step 1: `nextConversationTurn` helper | redo | Production already parses JSONL objects (F010). Keep formula (AC-F008.1, .2, .3). Redo leftover YAML titles (`empty yaml…`, quoted YAML scalars). Scan is object `event`, not `^event:` YAML. `turn` is a JSON number |
| Step 2: Persist under lock — read, count, emit, append | keep | Count still uses `emit.event` under `ingest.lock` against `{session_id}.jsonl`. Do not read `events.jsonl`. `yamlDocument` override already dropped (F010) |
| Step 3: ingestHook sequence tests | redo | Tests still name `yaml` / “missing yaml” / “prior document” while reading `.jsonl`. Retarget F008 asserts onto `jsonlRecords`; `typeof turn === "number"`. Formula `0`/`1`/`2` and stop-stays keep |
| Step 4: Confirm architecture unchanged | keep | Architecture already names Session JSONL log and turn from prompt-kind `event` values. `/codify` does not edit `cli.arch.md` / `system.arch.md` |
| Step 5: Test runner and AC sweep | redo | Coverage AC-F008.1–6 at lib; unchecked ACs (.1, .3, .4, .5) need AC-titled JSON-object tests. Leave .2 / .6 checked. Do not retitle F003/F010 tests |

## Implementation Steps

### Step 1: Confirm `nextConversationTurn` scans Session JSONL objects
Numbering formula stays (count prompt-kind already in existing JSONL, plus one if this event is prompt-kind). Production already parses JSONL (F010 `parseJsonlRecords` / `eventField`). Do **not** rewrite `cli/src/yaml.ts` unless a new unit test proves a numbering bug. Redo leftover YAML titles and the unused quoted-YAML-scalar case. Do not import `report.ts`. Emitter key names stay F003. Keep function complexity ≤ 8.
- Paths:
    - `cli/src/yaml.ts` (read-only confirm)
    - `cli/test/yaml.test.ts`
- [ ] Confirm `nextConversationTurn(existingJsonl: string, event: string): number`. Prompt-kind set is `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Unrecognized / empty `event` is not prompt-kind. Do not accept a payload object (no `hook_event_name`). Do not read a `turn` field from the last object — count prompt-kind `event` values on parsed JSONL objects (AC-F008.1, AC-F008.2)
- [ ] Confirm the helper parses existing text with `JSON.parse` per non-empty line and looks at the object’s `event` field only. Do **not** scan `^event:` YAML. Do **not** treat `source_event` or `hook_event_name` as prompt-kind (AC-F008.2, AC-F008.5)
- [ ] Confirm it returns the already-present prompt-kind count, plus one if `event` is prompt-kind; otherwise that same count. Empty existing and non-prompt `event` → `0`. Empty existing and prompt-kind `event` → `1` (AC-F008.1, AC-F008.3)
- [ ] Keep `emitSessionRecord` / `SessionRecordInput.turn` unchanged in this step. Exact-string emitter tests are F003/F010. `turn` is a JSON number (`typeof === "number"`; serialized token is not `"turn":"0"`) (AC-F008.1)
- [ ] Retitle `empty yaml is 0…` / `empty yaml is 1…` off YAML (empty JSONL / no records). Keep the asserts: empty → `0` for `sessionStart` / `stop` / `""` / unrecognized; empty → `1` for `beforeSubmitPrompt` (AC-F008.1, AC-F008.3)
- [ ] Keep fixture with one `sessionStart` object: non-prompt → `0`; `beforeSubmitPrompt` → `1`. Fixture with one prompt then `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` → still `1`. Second `beforeSubmitPrompt` against a fixture that already has one prompt-kind object → `2` (AC-F008.2, AC-F008.3)
- [ ] Keep Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` as prompt-kind (empty → `1`; second of that alias → `2`). Mix of Cursor then Copilot/Claude aliases still increments (AC-F008.2, AC-F008.3)
- [ ] Drop or retarget `quoted event scalars that equal a prompt-kind alias count` (YAML leftover; `_quoted` is unused). JSON string `event` values already count via `JSON.parse`. Do not add a YAML quoted-scalar fixture (AC-F008.2)
- [ ] Keep JSON-object traps: `source_event: beforeSubmitPrompt` without prompt-kind `event` does not count; `hook_event_name` on an object whose `event` is not prompt-kind does not count. The helper takes the F002 `event` string only (AC-F008.2)
- [ ] Do not retitle `AC-F010.2 source_event or hook_event_name…` (F010). Do not change `isInitialSessionStart` (F003)

---

### Step 2: Persist under lock — read, count, emit, append
Session JSONL is built under `ingest.lock` with `nextConversationTurn`. Concurrent ingests must not race. Keep this step as shipped. Missing JSONL file → zero prompt-kind objects (ENOENT). Do not read `events.jsonl` or `sessions.json` to determine turn. Do not re-read the line just appended to *produce* it. Do not invent a second lock. Keep functions complexity ≤ 8.
- Paths:
    - `cli/src/store.ts`
    - `cli/src/ingest.ts`
    - `cli/test/store.test.ts`
    - `.agents/hooks/index.mjs`
- [x] Production ingest passes `sessionEmit` and does **not** pass a prebuilt document string. Under the lock, after Event log + index, `readFile` that session’s `{session_id}.jsonl`; ENOENT → `""`; `turn = nextConversationTurn(existing, event)`; `emitSessionRecord({ …, turn })`; append. Do not read Event log or Session index to determine `turn`. Do not read `.yaml` (AC-F008.1, AC-F008.5)
- [x] `yamlDocument?: string` override is gone (F010). Store tests use `sessionEmit` only. Overlapping calls yield complete JSONL objects; `sessionId` undefined must not create `leaked.jsonl`. Calls that omit `sessionEmit` still skip the session file (AC-F008.4)
- [x] `ingest.ts`: does not hardcode `turn: 0` outside the lock. Passes `sessionEmit` when `sessionId` is defined. Keep `maybeWriteReport` after persist returns; do not change it (AC-F008.1)
- [x] Do not add `turn` to `eventLogLine` / the Event log object. Do not mutate `payload`. Keep `parseArgv`, `usageMessage`, `sessionIdentifier`, `index.ts` (`finally { process.exitCode = 0 }`) as shipped (AC-F008.5, AC-F008.6)
- [x] F010 owns `.jsonl` filename / stringify / no-yaml-write. F003 owns compact emit keys and conditional `session_id`. This step does not change those

---

### Step 3: ingestHook sequence tests
JSONL numbering already works at persist after Step 2. Cover AC-F008.1–6 through `ingestHook`. Observe-only `exitCode` / stdout remain e2e. Do not change `maybeWriteReport`, report grouping, or Event log serialization. Do not change F002 positionals. Redo leftover YAML titles/bindings; keep formula.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
- [ ] Assert `turn` via `jsonlRecords` of `{session_id}.jsonl` (`typeof === "number"`). Do not split on `---`. Do not use `assertYamlIntegerTurn` / unquoted YAML integer. Rename F008-local `yaml` bindings that already read `.jsonl`. Do not rewrite F003/F005/F006/F010 titles (AC-F008.1)
- [ ] Retitle `missing yaml first sessionStart/stop/prompt` off YAML (missing Session JSONL log / ENOENT). Keep numbering: first non-prompt (`sessionStart` or `stop`) writes `turn` `0`; first prompt-kind with no prior records writes `turn` `1` (AC-F008.1, AC-F008.3, AC-F008.5)
- [ ] Keep first `beforeSubmitPrompt` is `turn` `1` (AC-F005.6 with prompt and without prompt — do not retitle those). Non-prompt first objects stay `turn` `0` (`sessionStart`, unrecognized harness/event, missing positionals, first `stop`, first `subagentStart`) (AC-F008.1, AC-F008.3)
- [ ] Unit-test `ingestHook` sequence on one session: `sessionStart` then `beforeSubmitPrompt` then two `stop` then a second `beforeSubmitPrompt`. Assert turns `0`, `1`, `1`, `1`, `2` as JSON numbers. Stop multiplicity does not increment. Event log lines deep-equal payloads and have no `turn` key. Retitle with `AC-F008.1` (and cover .2 / .3 / .5) (AC-F008.1, AC-F008.2, AC-F008.3, AC-F008.5)
- [ ] Keep Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` as first prompt-kind objects → `turn` `1`; a later same-alias prompt → `turn` `2`. Retitle with `AC-F008.2` / `AC-F008.3` (AC-F008.2, AC-F008.3)
- [ ] Keep trap: payload `{ session_id, hook_event_name: "beforeSubmitPrompt" }` with positional `event: "stop"` (and no prior prompt-kind object) writes JSON `event` `"stop"` and `turn` `0` — must **not** increment from payload `hook_event_name`. Compact header omits `session_id` on this non-session-start object. Retitle with `AC-F008.2` (AC-F008.2)
- [ ] Unit-test prior object bytes unchanged after a later append (read first jsonl buffer; append another event; `second.subarray(0, first.length).equals(first)`), including `turn` on the first object. Retitle off “prior document”; use `AC-F008.4` (AC-F008.4)
- [ ] Keep existing F001/F003/F004/F005/F006/F007/F010 ingest assertions. Do not rewrite the report gate. `ingestHook` still resolves (does not throw) (AC-F008.6)
- [ ] Sequence tests must not use the report parser as the source of prompt-kind (`event` on the JSON object). Do not change `report.ts` (F004) (AC-F008.2, AC-F008.5, AC-F008.6)
- [ ] Do not change `parseArgv`, `index.ts`, Event log serialization, Session index, or `.cursor/hooks.json` (AC-F008.5, AC-F008.6)

---

### Step 4: Confirm architecture unchanged
Architecture already names Session JSONL log, `src/yaml.ts` as the normalized session JSONL record, and turn from prompt-kind `event` values under `ingest.lock`. F008 adds no events. Confirm-no-change only. Do not edit `cli.arch.md` / `system.arch.md`. Do not edit `docs/normalized-fields.md`.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
- [x] Confirm `cli.arch.md` **Used by** still lists `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Confirm ingest already appends `{session_id}.jsonl` and sets integer `turn` from prompt-kind `event` values already in that file. Do **not** edit those lists
- [x] Confirm `system.arch.md` overview still names Session JSONL log and integer `turn` numbered from prompt-kind `event` values in that file. Do **not** edit it. Do not add Copilot/Claude registrations
- [x] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other extra Cursor events. Do not change ingest report-gate wording in architecture (F004 as shipped). Do not add `turn` to `docs/normalized-fields.md`

---

### Step 5: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library (AC-F008.6)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. Skip `bun run build` unless a production `cli/src/` file actually changes
- [ ] Unit tests cover AC-F008.1–6 at lib (`nextConversationTurn` + persist-under-lock + ingestHook sequences) except entry argv/`exitCode`/stdout spawn, which is e2e. Unchecked ACs (.1, .3, .4, .5) have AC-titled lib tests on JSON objects / `{session_id}.jsonl`. Do not retitle F003/F010 tests. Do not change `hooks.test.ts` event count (stays six)

---

### Deviations

- Spec status stays `pending`. This run does not set `planned`. Sibling `e2e.plan.md` is out of scope for this planify; parent coordinates status after both plans exist. This run does not edit `spec.md`.
- Write `cli.plan.md` only. Do not write `e2e.plan.md`. Do not amend architecture. Do not change F002 positionals, F001 Event log/index, F003 mapping, F010 format, or `.cursor/hooks.json`.
- Production already scans JSONL for turn (F010 `nextConversationTurn` parses JSONL). `/codify` confirms the formula and retargets leftover YAML titles/asserts. Do not revive `^event:` YAML scan or `yamlDocument`.
- AC checkboxes stay as in spec.md: `.1` `.3` `.4` `.5` unchecked (Session JSONL log); `.2` `.6` checked. `/codify` sets `in-progress`.
- No architecture edit. Step 4 is confirm-no-change only. `/codify` does not amend `cli.arch.md` / `system.arch.md` / `model.schema.md` (`/shipify` does that).
- No `.cursor/hooks.json` change. Hooks stay the six from F006. F008 does not add a registration.
- No report grouping, duration, Details, or `maybeWriteReport` change (F004 as shipped). Do not import `report.ts` from ingest/store for counting.
- No `docs/normalized-fields.md` change. `turn` is a header field, not a body field.
- Do not amend F003/F004/F005/F006/F007/F010 specs or their plans. F010 already shipped JSONL scan. This plan keeps the count formula and retargets F008 tests.
- Do not change F002 command positionals.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `nextConversationTurn` / `persistIngest` / `ingestHook` by importing `cli/src`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not persist `turn` on the Event log line. Do not rewrite prior JSONL objects. Do not use last object’s `turn` field as the source of truth. Do not read `events.jsonl` to compute `turn`.
- Concurrent numbering must happen under the existing `ingest.lock`. Do not invent a second lock.
- `/codify` of this container should not reopen F010 stringify/filename or F003 compact emit. Scanner looks at JSON `event` only.
- `/codify`: spec status set to `in-progress` only if this container’s later codify runs before e2e planify sets `planned`. Skip rebuild unless `cli/src/` changes.

---

> last updated: 2026-09-02T15:30:23Z
