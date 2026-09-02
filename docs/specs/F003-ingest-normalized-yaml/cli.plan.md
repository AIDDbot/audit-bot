---
spec-kind: functional
container: cli
---
# F003-ingest-normalized-yaml - cli

## Specification

On each ingest of a JSON object, keep F001 persist (verbatim Event log, Session index) and, when a session identifier exists, map exactly one normalized JSON object that F010 appends to `{session_id}.jsonl` in that day’s folder. Build the object from the in-memory event plus F002 harness and event positionals. Compact header keys `harness` and `event` (not `source_harness` / `source_event`). `session_id` only on the **initial session-start** object (`event` `sessionStart` / `SessionStart` and that session’s Session JSONL log has no records yet). Every other object omits `session_id`. Header order: initial session-start `session_id`, `harness`, `event`, `timestamp`, `turn`; others `harness`, `event`, `timestamp`, `turn`. After the header, emit `subagent` when a matching payload attribute is present (F009; harness-independent), including on unmapped / header-only objects and on kinds whose `docs/normalized-fields.md` row does not list `subagent`. Other body fields stay table-driven. Unmapped objects are header-only except that optional `subagent`: five header fields vs four, plus `subagent` when present; no other extra body fields. Omit `subagent` when no matching key. Omit absent mapped keys; present `null` is JSON `null`. `turn` is a JSON number (F008; not a body field). Numbering is F008 — do not redo it. Format, filename, and serialization stay F010 — do not redo them. Same lock. No second process. No re-read of files just written to *produce* the object (reading that session’s existing JSONL to set `turn` and whether this is the initial session-start is allowed). This spec does not replace F001, F002, or F010. Do not rewrite prior objects. Do not overlay `turn` on the Event log line. Do not migrate old `source_harness` / `source_event` keys. Do not change F009 extraction.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current** for the third artifact `{session_id}.jsonl`, `src/yaml.ts` as the normalized session JSONL record, compact header, six Cursor events, F008 numbering under `ingest.lock`, and harness-independent `subagent` after the header. Do not amend architecture in this planify run (`/shipify` does that). `/codify` has no architecture step. Do not change F009. Do not change F010 format work.

Grounding (F003 shipped 0.7.0; compact header 0.16.0; F009 `subagent` shipped 0.17.0; F010 JSONL already coded on this branch; this is the C001 / F010 mapping-on-JSON-objects amend/replan):

- `cli/src/yaml.ts`: **already** `emitSessionRecord` — insertion-order object, `assignHeader` then `assignSubagent` then `assignBody`, `JSON.stringify(obj) + "\n"`. Compact `harness` / `event`; `session_id` only when `includeSessionId`; `turn` is a JSON number; `subagentValue` walks `subagent_type` → `agent_type` → `agentType` → `agentName` (`key in payload`). Identity is **not** a `MappedField` in `subagentStartFields` / `subagentStopFields`. `assignBody` returns without extra keys when `asHarness` or `bodyByEvent.get(event)` is missing. Present-null assigns JSON `null`. **Do not rewrite `yaml.ts` unless a new unit test proves a mapping bug.** Keep the filename `yaml.ts`. Do not fold `subagent` back into `assignBody` (harness column would drop it on unmapped / kinds with no `subagent` row). Oxlint complexity ≤ 8
- `cli/src/store.ts`: `countedSessionRecord` already reads existing JSONL, calls `nextConversationTurn`, `isInitialSessionStart`, `emitSessionRecord`; `appendSessionJsonl` writes `{session_id}.jsonl`. Payload reaches the emitter unchanged. **Keep.** Do not invent a second lock. Do not compute `subagent` in store. Do not rewrite store unless a mapping test proves a bug. Filename / lock / no-yaml-write stay F010
- `cli/src/ingest.ts`: does **not** compute the header or `subagent`. `sessionEmit` already passes payload + positionals + now. **Keep.** Do not move header or identity logic here
- `cli/src/report.ts`: F004 / F009’s job. Do **not** change report labels, parse, `formatSubagent`, or Markdown. Do **not** retitle F004 tests. Isolate report fixtures from this amend
- Body mapping stays **current** `docs/normalized-fields.md` (F005 dropped `transcript_path`; F006 added `task`; F007 added `agent_display_name`; F009 renamed `agent_type` → `subagent` on start/stop rows only). Do **not** restore `agent_type`. Do **not** add `subagent` rows to session start/end, prompt, or agent-stop tables. Do **not** add `turn` or `session_id` to the body
- `cli/src/index.ts` / `cli/src/argv.ts` / `cli/src/event.ts`: already pass positionals, persist JSONL under `ingest.lock`. Keep them. F002 command positionals do not change
- `.cursor/hooks.json`: six events. **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` production edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Append-only: do not rewrite prior objects’ `turn`, whether they contain `session_id`, or old `agent_type` keys. Do not migrate old `source_*` keys
- Do **not** duplicate F010 format work (`.jsonl` filename, `JSON.stringify` / `JSON.parse`, stop writing yaml, lock). Do **not** retitle F010 / F004 / F005 / F006 tests. Do **not** redo F008 numbering (scanner fixtures, count formula)

Unit tests cover AC-F003.4, .5, .6, .9, .10, .13, .14, .15, .16, .17, .18 at lib except entry spawn/`exitCode` (those are e2e). Not AC-F003.1, .2, .3, .7, .8, .11, or .12 (deprecated). Unchecked ACs (.5, .6, .9, .13–.18) need AC-titled failing-until-green coverage at lib (retitle existing JSON-object asserts where they already prove the AC; add only the gaps). Checked ACs (.4 timestamp, .10 Node ESM) stay; do not redo them. F009 unit tests already cover extraction, preference order, every mapped kind, and unmapped-with-`subagent`. This amend **confirms** `emitSessionRecord` mapping and retargets leftover F003 YAML titles/asserts.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010); each object includes integer `turn` (a property of the object, not a separate persisted entity). New objects may include `subagent` after the compact header on any event kind when a matching payload attribute is present.

This amend does not add persisted entities. Compact header, F009 `subagent` emit, and F010 JSONL format are already shipped. Do not persist `session_id` on every object. Do not persist `turn` on the Event log line. Do not rewrite prior objects. Do not amend `model.schema.md` in this run.

### Shared store wording

> Copy this block verbatim into the F003 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. This spec owns compact header, `session_id` only on the initial session-start, omit-absent / present-null as JSON `null`, table-driven body, unmapped header-only, and the subagent-after-header exception (F009). Format, filename, and serialization stay F010. F008 numbering scans that session’s JSONL `event` values. F004 still writes `{session_id}.md` after every session-JSONL append.

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
- One JSON object per line. Append-only. Format, filename, and serialization stay F010. This spec maps header and body onto that JSON object (AC-F003.18).
- Do not write `{session_id}.yaml`. Do not read/migrate/rewrite existing `.yaml`. Do not mix YAML and JSONL in one session.
- Do not merge into `events.jsonl`.
- When the payload has a session identifier: append exactly one mapped JSON object as one new line in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the object). Determining `turn` (F008) and whether this is the initial session-start may read **that session’s existing JSONL only**. Do not read `events.jsonl` or `sessions.json` for those values. Do not read `.yaml`.
- When the payload has no session identifier: do not create or append a Session JSONL log (F010; AC-F010.5). Mapping in this spec applies only when F010 writes that log.
- Every object is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior objects' `turn`. Prompt-kind is JSON `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- After the compact header, when a matching `subagent` source attribute is present (F009), emit `subagent` first (before any other body field). Extraction, source-key preference, and the mapping-table rename are F009: first present of `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; do **not** select the source key from the F002 `harness` positional. This spec does not duplicate those ACs. Omit `subagent` when none of those keys are present. When the chosen key is present and the value is `null`, emit JSON `null`. New objects write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys for every other body field are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified (AC-F003.5, AC-F003.17).
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present (AC-F003.16, AC-F003.17): five header fields when initial session-start; four otherwise. An ingest must **not** include any other extra body field on an unmapped object (`reason` / `prompt` / `task` / `agent_display_name` stay closed). Kinds whose mapping row does not list `subagent` (session start/end, prompt, agent stop) still emit `subagent` after the header when a matching key is present; they must **not** gain other extra fields on that basis.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log object (payload has a session identifier), after that line is in the file. Produce only from that session’s Session JSONL log. Markdown behavior stays F004. This spec does not change report content.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log (F010 / F001). Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Complete mapped records and F001 validity stay this spec (AC-F003.9); lock and serialization stay F010. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the session-record header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F003 registered the four F001 events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`). The product now also registers `beforeSubmitPrompt` (F005) and `stop` (F006). This F003 amend does **not** change `.cursor/hooks.json`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. Mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Step 1: Confirm `subagent` after header (AC-F003.5, .16, .17) | redo | production is `emitSessionRecord` JSON objects, not `emitYamlDocument`. Confirm compact header + table-driven body + subagent + omit-absent + JSON `null`. Retarget F003 yaml unit titles/asserts off YAML / `---` / `yamlExact` colon lines |
| Step 2: Store wires initial session-start; persist still append-only | redo | persist already uses `countedSessionRecord` → `{session_id}.jsonl`. Confirm; do not rewrite store/ingest unless a mapping test proves a bug. Retarget F003 ingest/store titles/vars off yaml. Add AC-F003.6 / .9 / .18 titled coverage |
| Step 3: Amend architecture and model schema | keep | do not amend architecture in this planify run or in `/codify` (`/shipify` does that). Architecture already names Session JSONL log and `yaml.ts` as the JSONL record |
| Step 4: Test runner and AC sweep | redo | drop AC-F003.1 / .2 / .7 from coverage; add AC-F003.18; unchecked ACs need AC-titled lib coverage on JSON objects. Leave F010 / F004 / F008 numbering / report content alone |

Deprecated ACs are **drop** (not prior implementation steps): AC-F003.1, AC-F003.2, AC-F003.7 (retired 2026-09-02; F010 owns filename / JSONL lines / no-session-id). Already-deprecated: AC-F003.3, AC-F003.8, AC-F003.11, AC-F003.12.

## Implementation Steps

### Step 1: Confirm `emitSessionRecord` mapping on JSON objects
Do **not** rewrite `cli/src/yaml.ts` unless a new unit test proves a mapping bug. F010 already replaced YAML document emit with an insertion-order JSON object. `/codify` confirms compact header + table-driven body + `subagent` after header + omit-absent + JSON `null`, and retargets leftover F003 yaml-test titles/helpers/asserts onto `JSON.parse` objects. Do not fold identity back into `bodyByEvent`. Do not restore `agent_type`. Do not redo F010 stringify/filename. Do not redo F008 numbering.
- Paths:
    - `cli/src/yaml.ts` (read-only confirm)
    - `cli/test/yaml.test.ts`
- [ ] Confirm `emitSessionRecord` is `assignHeader` then `assignSubagent(input.payload)` then `assignBody`. Confirm `subagentValue` still walks `subagent_type` → `agent_type` → `agentType` → `agentName` with `key in payload`. Confirm `assignBody` still no-ops when `asHarness` or `bodyByEvent.get(event)` is missing. Confirm omit-absent (`sourceKey in payload`) and present-null assigns JSON `null`. Do not edit these helpers unless a new test proves a bug (AC-F003.5, AC-F003.13, AC-F003.15, AC-F003.16, AC-F003.17, AC-F003.18)
- [ ] Replace `yamlExact` / `yamlishValue` with a JSON-object helper (plain object + `JSON.stringify` + newline, or `assert.deepEqual(JSON.parse(got), expected)` plus `Object.keys` order). Stop feeding YAML-colon body lines (`subagent: explore`) into F003 exact-string tests (AC-F003.5, AC-F003.16, AC-F003.17)
- [ ] Retarget F003 yaml-test titles and leftover YAML asserts (`reason:`, `prompt:`, `session_id:`, `agent_type:`, `task:`, `subagent:`, `includes("  subagent")`) onto JSON keys / `Object.keys` / `"field" in parsed`. Retitle AC-F003.13 off “empty quoted”; AC-F003.5 / .17 off “YAML null” onto JSON `null`; AC-F003.15 onto JSON object key order. Drop YAML emit titles in this suite that still say block scalar / unquoted integer / quoted NaN (those fixtures already assert JSON). Do **not** retitle F008 scanner tests (`empty yaml is 0…`) or any `AC-F010.*` test (AC-F003.5, AC-F003.13, AC-F003.15, AC-F003.16, AC-F003.17)
- [ ] Confirm existing F009 yaml tests already cover: `subagent` on every mapped kind including sessionStart / sessionEnd / prompt / stop (rows that do **not** list `subagent`); unknown harness, empty harness, and unmapped `workspaceOpen` still emit `subagent` and omit other body; omit when no matching key / trap-only payload; present `null` → JSON `null`. Keep those cases; they now prove AC-F003.5 / .16 / .17 on JSON objects. Do not duplicate F009 preference-order tests (AC-F003.5, AC-F003.16, AC-F003.17)
- [ ] Keep existing AC-F003.16 tests that omit `subagent` (no matching payload key): omitted positionals, unrecognized harness, unrecognized event, unmapped sessionStart five-header vs unmapped prompt four-header. Asserts mean “header-only when no matching `subagent` key” on the **JSON object**; extras (`reason` / `prompt`) stay omitted (AC-F003.16, AC-F003.17)
- [ ] Keep the unmapped initial sessionStart (`includeSessionId: true`, unrecognized harness or event) **with** `subagent_type` case: five header fields then `subagent`; extra table fields (`reason`) stay omitted (AC-F003.16, AC-F003.17)
- [ ] Add AC-F003.18 emitter coverage: `emitSessionRecord` output is one `JSON.parse`-able object (not a YAML document: no leading `---`, no `source_harness`). Mapping (header keys, optional `session_id`, body / `subagent`) applies to that object. Do not restate F010 filename or lock here (AC-F003.18)
- [ ] Keep compact-header, `isInitialSessionStart`, timestamp (AC-F003.4), Copilot/Claude mapping, and F006 header-only-without-identity tests. Do not change F008 `nextConversationTurn` / `isInitialSessionStart` formulas or their F010 scanner fixtures

---

### Step 2: Confirm persist still maps via the emitter onto the Session JSONL log
`ingestHook` / `countedSessionRecord` already pass the payload into `emitSessionRecord` and append `{session_id}.jsonl`. Do not change `store.ts` or `ingest.ts` unless a mapping test proves a bug. Confirm existing F003 ingest tests; retitle/assert JSON objects; add only AC-F003.6 / .9 / .18 gaps.
- Paths:
    - `cli/src/store.ts` (read-only confirm)
    - `cli/src/ingest.ts` (read-only confirm)
    - `cli/test/ingest.test.ts`
    - `cli/test/store.test.ts`
- [ ] Do not change `sessionEmit`, `countedSessionRecord`, `appendSessionJsonl`, `parseArgv`, `usageMessage`, `sessionIdentifier`, or `persistIngest` unless a new mapping test fails (AC-F003.4, AC-F003.9, AC-F003.18)
- [ ] Retarget remaining **F003** ingest titles/vars/asserts off YAML / `{session_id}.yaml` / `---` / YAML-colon `includes("reason:")` onto `jsonlPath` records (`JSON.parse` lines, `"reason" in row`). Examples: AC-F003.16 “four-header-only yaml” → four-header-only JSON object; AC-F003.16 “still write yaml with empty harness” → Session JSONL log object; AC-F003.5 / .17 “verbatim jsonl and yaml subagent” → Event log verbatim and Session JSONL `subagent` after header. Rename F003-local `yaml` / `startYaml` bindings that already read `.jsonl`. Do **not** retitle AC-F005 / AC-F006 / AC-F010 / F004 report tests even when their titles still say yaml (AC-F003.5, AC-F003.14, AC-F003.16, AC-F003.17)
- [ ] Keep existing ingest cases: every Cursor event with `subagent_type` writes verbatim Event-log jsonl and Session JSONL `subagent` after the compact header; unknown harness + unmapped event writes header plus `subagent` only; AC-F003.14 prompt-after-start / second sessionStart / first-prompt-then-start; unmapped sessionStart five vs unmapped prompt four; unmapped initial sessionStart + `subagent_type` (AC-F003.5, AC-F003.14, AC-F003.16, AC-F003.17)
- [ ] Add AC-F003.6 failing-until-green: sequential sessionStart then subagentStart (or two sequential events) yields two independent JSON objects in that session’s JSONL; the parent object does not nest the subagent event; no nested JSON structure under a parent. Retitle the existing “append two documents” case if it already proves sequential independence; add the no-nest assert (AC-F003.6)
- [ ] Add AC-F003.9 failing-until-green at lib: overlapping `persistIngest` calls still persist complete mapped JSON objects plus a valid Event log and Session index (no torn / concatenated / duplicated records). Retitle the existing store “overlapping calls yield complete yaml documents plus valid jsonl” test with AC-F003.9; it already parses JSONL objects. Do not redo F010 lock/filename tests (AC-F003.9)
- [ ] Add AC-F003.18 ingest coverage: when the payload has a session identifier, the mapped record in `{session_id}.jsonl` is one JSON object (header + body mapping from this spec), not a YAML document (`---` absent; no `{session_id}.yaml` written by this mapping). Do not duplicate AC-F010.1–.3 titles or planted-yaml unread cases (AC-F003.18)
- [ ] Keep existing F001 persist assertions (verbatim Event log, no overlay, sequential append leaves first object bytes unchanged). Do not keep AC-F003.1 / .2 / .7 titles. No-session-id Copilot `sessionId` (Event log yes, no Session JSONL log) stays F010.5 — do not retitle it as F003 (AC-F003.4, AC-F003.9)
- [ ] Skip `bun run build` unless a production `cli/src/` file actually changes. If it does: `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F003.10)

---

### Step 3: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library to dependencies or devDependencies (AC-F003.10)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. Expect no production `yaml.ts` / `store.ts` / `ingest.ts` diff unless a mapping test proved a bug
- [ ] Unit tests cover AC-F003.4, .5, .6, .9, .10, .13, .14, .15, .16, .17, .18 at lib (emitter + persist mapping). Not AC-F003.1, .2, .3, .7, .8, .11, or .12. Unchecked ACs have AC-titled lib tests. Entry argv/`exitCode` spawn is e2e, not this container’s unit suite. Leave `hooks.test.ts` asserting the current six shell-string commands (unchanged registration). Leave `cli/src/report.ts` and F004 / F009 report tests alone. Leave F010 titles and F008 numbering tests alone

---

### Deviations

- Spec status stays `pending`. This run does not set `planned`. Sibling `e2e.plan.md` is out of scope for this planify; parent coordinates status after remaining containers have plans. This run does not edit `spec.md`.
- Write `cli.plan.md` only. Do not write `e2e.plan.md`. Do not amend architecture. Do not change F009 (extraction, preference order, mapping-table rename, report Subagent cell). Do not change F010 format/filename/serialization/lock. Do not change F004 Markdown. Do not change F008 count formula.
- Prior Step 3 is **keep**: do not amend `cli.arch.md` / `system.arch.md` / `model.schema.md` in this planify run or in `/codify` (`/shipify` does that). Architecture already names Session JSONL log and `src/yaml.ts` as the normalized session JSONL record.
- `cli/src/yaml.ts` / `store.ts` / `ingest.ts` need **no** production code for this amend unless a new mapping unit test fails. `/codify` confirms `emitSessionRecord` splice order and retargets F003 unit titles/asserts onto JSON objects. Do not re-add `subagent` as a harness-column `MappedField`. Do not revive `emitYamlDocument`.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `persistIngest` / `emitSessionRecord` by importing `cli/src`.
- Cursor `sessionStart` table-driven body is empty because that table’s only common field is `session_id`, which lives in the filename (and on the initial session-start header when present). Agent-stop table-driven body is empty (F005). Both kinds still emit `subagent` when a matching key is present (AC-F003.17). Mapping for `beforeSubmitPrompt` / `stop` still applies if those events arrive via ingest; this amend does not change `.cursor/hooks.json`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no Session JSONL log (AC-F010.5), even when positionals are `copilot` / `sessionStart`. Do not cite deprecated AC-F003.7.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Body mapping is current `docs/normalized-fields.md`. Do not revert F005 (`transcript_path` dropped), F006 (`task`), F007 (`agent_display_name`), or F009 (`subagent`). Do not add `subagent` rows to session start/end, prompt, or agent-stop tables.
- F008 numbering is already shipped. Compact header is already shipped. F009 `subagent` emit is already shipped. F010 JSONL format is already shipped. This amend does not pass hardcoded `turn: 0` and does not change the count formula, header keys, or `.jsonl` filename.
- `isInitialSessionStart` uses “no parsed JSONL records yet” (empty / blank lines only), not “no prior session-start object”. Prompt-then-sessionStart must omit `session_id` (AC-F003.14). Do not change that formula.
- `cli/src/report.ts` is unchanged (F004 / F009). Do not retitle or rewrite F004 / F009 report tests in this container.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- `/codify`: spec status set to `in-progress`. Do not reopen compact-header, F009 extraction, F008 numbering, F010 format, or F004 Markdown. Mixed historical YAML (`source_*`, per-doc `session_id`, body `agent_type`) is out of scope.

> last updated: 2026-09-02T15:25:00Z
