---
spec-kind: functional
container: cli
---
# F008-conversation-turns - cli

## Specification

On each YAML-appending ingest, tag the new document with `turn`: the count of prompt-kind documents already present in that session’s Session YAML log, plus one if this document is prompt-kind; otherwise that same count. When none are already present and this document is not prompt-kind, `turn` is 0. Prompt-kind is only YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not increment for `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. First prompt-kind document is turn 1; later prompt-kind documents 2, 3, …. Documents before the first prompt are turn 0. Do not rewrite prior documents. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session YAML log to determine `turn`. Remain observe-only Node.js ≥ 24 ESM, no external deps, no new hook registrations. This spec does not replace F001–F007. Do not change report grouping, duration, Details, or `maybeWriteReport` (F004 as shipped). Do not add `turn` to `docs/normalized-fields.md`. Do not change F002 positionals. F003 sibling plan owns emitting compact header keys `harness` / `event` and conditional `session_id`. This plan owns numbering: scan `^event:` (not `source_event`, not payload `hook_event_name`).

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this spec** (already names the six Cursor events, `src/yaml.ts`, and YAML append under `ingest.lock`). F008 adds **no** new events. Do not amend architecture event lists in this planify run or in `/codify`. [`docs/normalized-fields.md`](../../normalized-fields.md) does **not** list `turn` (`turn` is a header field, not a body field) — do **not** add it. Do not amend F003/F004/F005/F006/F007 specs or their plans. F003 sibling plan owns compact header emit (`harness` / `event`; `session_id` only on the initial session-start). F004 already groups the Session report by `turn`. This container owns **numbering**.

Grounding (numbering shipped; this amend is YAML key `source_event` → `event` for prompt-kind detection):

- `cli/src/yaml.ts`: `YamlDocumentInput.turn: number`; `emitYamlDocument` emits `turn` via `emitPair("turn", input.turn)` (numeric path → unquoted integer). Emitter does **not** compute turn. Header key names (`harness` / `event`, conditional `session_id`) are F003 — do **not** change emit keys here. Export `nextConversationTurn(existingYaml: string, event: string): number`. Prompt-kind set is those three aliases. **Today** `sourceEventValue` scans `^source_event:`. **This amend** scans `^event:` (Node builtins; no YAML library). Unrecognized / empty event is not prompt-kind. Do **not** import `report.ts` from ingest/store just to reuse `parseYamlDocuments` (report is downstream)
- `cli/src/ingest.ts`: already passes emit-inputs into `persistIngest` (no `turn: 0` outside the lock). Keep. Do not change `maybeWriteReport`
- `cli/src/store.ts`: already counts under `ingest.lock`: read existing `{session_id}.yaml` (ENOENT → `""`), `turn = nextConversationTurn(existing, event)`, `emitYamlDocument({ …, turn })`, append. Keep numbering under the lock. F003 may extend that read for initial session-start; do not invent a second lock. Do not read `events.jsonl` or `sessions.json` to determine turn
- `cli/src/report.ts`: already has `promptKinds` set (`beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`) and groups by `turn`. **Do not change** report grouping, duration, Details, or `maybeWriteReport`. F004 reads compact `event` (sibling F004 plan). F008 out of scope
- `cli/test/yaml.test.ts`: exact-string emitter docs are F003. `nextConversationTurn` fixtures currently use `source_event:` via `headerDoc` — those must use `event:`. Emitter tests stay passing explicit turn
- `cli/test/ingest.test.ts`: numbering sequences already assert turns `0` / `1` / `2`. F008 traps that exact-string `source_event:` must look for `event:`. Non-prompt first documents stay `turn: 0`. Do not rewrite F003/F005/F006 exact-string headers here (F003 sibling)
- `cli/test/store.test.ts`: passes prebuilt `yamlDocument` for concurrency / no-session-id leak tests. Keep a prebuilt-string path working for those tests
- `.cursor/hooks.json`: six events. **Do not change**
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except numbering the new document), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude prompt aliases still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or report grouping (F004 as shipped)
- Do not change F002 command positionals (`ingest {harness} {event}`)

Unit tests cover AC-F008.1–6 at lib except entry spawn/`exitCode`/stdout (those are e2e). This amend’s unchecked criterion is AC-F008.2 (`event`).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004). Each YAML document includes integer `turn` (which conversation turn the Event belongs to; a property of the document, not a separate persisted entity).

This spec does not add a persisted Turn file. Event log stays verbatim (no `turn`). Session index unchanged. YAML numbering is this container’s job. The report already reads `turn` from YAML; correct numbering is this spec’s job.

### Shared store wording

> Copy this block verbatim into the F008 e2e plan. Session YAML log header is F003 compact keys (`harness` / `event`; `session_id` only on the initial session-start). This container numbers `turn` by scanning YAML `event`.

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
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; do not re-read the document just appended to *produce* it). Under `ingest.lock`, read that session’s **existing** Session YAML log (missing file → zero prompt-kind documents) to compute `turn`. Determining whether this is the initial session-start (F003) may use that same read. Do not read the Event log or Session index to determine `turn`.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (never a zero-padded string, never a body field). When appending a document, `turn` is the number of prompt-kind documents already present in that session’s Session YAML log, plus one if this document is itself prompt-kind; otherwise that same already-present count. When none are already present and this document is not prompt-kind, `turn` is 0. Prompt-kind is only YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` (the F002 positional written as header `event`, not payload `hook_event_name`, not `source_event`). The first prompt-kind document is turn 1; each later prompt-kind document is one greater (`2`, `3`, …). Documents written before that first prompt-kind document are turn 0. `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` belong to the current turn; their multiplicity does not start or end a turn. Do not rewrite `turn` on previously written documents. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session YAML log to determine `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id`, using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start body is `agent_type`, then `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name`. Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task`. Do **not** include `transcript_path` in any YAML document (F005). Agent stop body is empty (header only).
- Do not include any harness-specific or event-specific field that is not in that normalized set. Do not add `turn` to the body or to `docs/normalized-fields.md`.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields only: five fields when initial session-start; four otherwise (including computed `turn`).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every YAML append). Do not change them here. The report already reads `turn` from YAML; correct numbering is this spec’s job.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session YAML log (missing file → empty), compute `turn`, emit one complete YAML document, and append it. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = harness. Optional `process.argv[4]` = event.
- Harness and event are F002 invocation inputs. Pass them into ingest so the YAML header (including prompt-kind for `turn`) can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do not change F002 command positionals. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F008 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Step 1: `nextConversationTurn` helper | redo | Scan `^event:` not `^source_event:`; fixtures and traps that exact-string `source_event:`. Numbering formula stays |
| Step 2: Persist under lock — read, count, emit, append | keep | Count still uses `emit.event` under `ingest.lock`. F003 owns emitting `event:` and conditional `session_id` |
| Step 3: ingestHook sequence tests | redo | F008 traps/fixtures that exact-string `source_event:`. Numbering sequences (`0`/`1`/`2`, stops stay) keep |
| Step 4: Confirm architecture unchanged | keep | Do not amend architecture. `/codify` does not edit `cli.arch.md` / `system.arch.md` |
| Step 5: Test runner and AC sweep | keep | Coverage AC-F008.1–6 at lib; AC-F008.2 now names YAML `event` |

## Implementation Steps

### Step 1: `nextConversationTurn` helper
Numbering formula stays (count prompt-kind already in existing YAML, plus one if this event is prompt-kind). Change the scan key from `source_event` to `event`. Do not import `report.ts`. Emitter key names stay F003. Keep function complexity ≤ 8.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
- [x] Export `nextConversationTurn(existingYaml: string, event: string): number`. Prompt-kind set is `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Unrecognized / empty `event` is not prompt-kind. Do not accept a payload object (no `hook_event_name`). Do not read a `turn` field from the last document — count prompt-kind `event` values in existing documents (AC-F008.1, AC-F008.2)
- [x] Scan existing YAML text for header `event` lines (`^event:` / split documents / line scan; no YAML library). Quoted or unquoted scalars that equal a prompt-kind alias count as one prompt-kind document. Do **not** treat `source_event` or any other key as prompt-kind (AC-F008.2)
- [x] Return the already-present prompt-kind count, plus one if `event` is prompt-kind; otherwise that same count. Empty `existingYaml` and non-prompt `event` → `0`. Empty `existingYaml` and prompt-kind `event` → `1` (AC-F008.1, AC-F008.3)
- [x] Keep `emitYamlDocument` / `YamlDocumentInput.turn` unchanged in this step. Exact-string emitter tests are F003 (compact `harness` / `event`). This plan does not change emit keys (AC-F003.13 / AC-F003.15 remain F003)
- [x] Unit-test empty yaml → `0` for `sessionStart` / `stop` / `""` / unrecognized; empty yaml → `1` for `beforeSubmitPrompt` (AC-F008.1, AC-F008.3)
- [x] Unit-test a fixture with one `sessionStart` document: non-prompt → `0`; `beforeSubmitPrompt` → `1`. Fixture with one prompt then `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` → still `1` (stops do not increment). Second `beforeSubmitPrompt` against a fixture that already has one prompt-kind document → `2` (AC-F008.2, AC-F008.3)
- [x] Unit-test Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` as prompt-kind (empty yaml → `1`; second of that alias → `2`). Mix of Cursor then Copilot/Claude aliases still increments (AC-F008.2, AC-F008.3)
- [x] Update `headerDoc` / `nextConversationTurn` fixtures to header key `event:` (not `source_event:`). Compact header shape is fine (`harness` / `event`; `session_id` optional on fixtures — the helper scans lines, not field order) (AC-F008.2)
- [x] Unit-test counting ignores a trap line that is not `event` (e.g. `hook_event_name: beforeSubmitPrompt` in the existing text does not count). The helper takes the F002 `event` string only (AC-F008.2)
- [x] Unit-test a trap line `source_event: beforeSubmitPrompt` in existing YAML does **not** count as prompt-kind (scan `^event:` only) (AC-F008.2)
- [x] Rename `sourceEventValue` / `countPromptKindSourceEvents` if they still say `source_event` (keep complexity ≤ 8). Quoted `event` scalars that equal a prompt-kind alias still count (AC-F008.2)

---

### Step 2: Persist under lock — read, count, emit, append
YAML is built under `ingest.lock` with `nextConversationTurn`. Concurrent ingests must not race. Keep this step as shipped. Missing YAML file → zero prompt-kind documents (ENOENT). Do not read `events.jsonl` or `sessions.json` to determine turn. Do not re-read the document just appended to *produce* it. Do not invent a second lock. Keep functions complexity ≤ 8.
- Paths:
    - `cli/src/store.ts`
    - `cli/src/ingest.ts`
    - `cli/test/store.test.ts`
    - `.agents/hooks/index.mjs`
- [x] Keep `yamlDocument?: string` as an **override** that skips counting (existing concurrency / leak tests pass a prebuilt string). When `yamlDocument` is present and `sessionId` is present, append that string as today (AC-F008.4)
- [x] Production ingest passes emit-inputs and does **not** pass a prebuilt `yamlDocument`. When emit-inputs are present, `sessionId` is present, and `yamlDocument` is omitted: under the lock, after JSONL + index, `readFile` that session’s `{session_id}.yaml`; ENOENT → `""`; `turn = nextConversationTurn(existing, event)`; `emitYamlDocument({ …, turn })`; append. Do not read Event log or Session index to determine `turn` (AC-F008.1, AC-F008.5)
- [x] Extract helpers so `writeUnderLock` / `persistIngest` stay complexity ≤ 8 (e.g. `readExistingYaml` ENOENT → `""`; `appendSessionYaml` resolves override vs count-and-emit). Do not add a second lock file
- [x] `ingest.ts`: does not hardcode `turn: 0` outside the lock. Passes emit-inputs (`payload`, `harness`, `event`, `now`) when `sessionId` is defined. Keep `maybeWriteReport` after persist returns; do not change it (AC-F008.1)
- [x] Keep `cli/test/store.test.ts` prebuilt-`yamlDocument` tests working: overlapping complete yaml documents, and `sessionId` undefined + prebuilt string must not create `leaked.yaml`. Calls that omit both override and emit-inputs still skip YAML (jsonl/index-only cases) (AC-F008.4, AC-F008.5)
- [x] Do not add `turn` to `eventLogLine` / the Event log object. Do not mutate `payload`. Keep `parseArgv`, `usageMessage`, `sessionIdentifier`, `index.ts` (`finally { process.exitCode = 0 }`) as shipped (AC-F008.5, AC-F008.6)
- [x] F003 sibling owns compact emit keys and conditional `session_id` on this same persist path. This step does not change header key names

---

### Step 3: ingestHook sequence tests
YAML numbering already works at persist after Step 2. Cover AC-F008.1–6 through `ingestHook`. Observe-only `exitCode` / stdout remain e2e. Do not change `maybeWriteReport`, report grouping, or Event log serialization. Do not change F002 positionals.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
- [x] First `beforeSubmitPrompt` is `turn: 1` (AC-F005.6 with prompt and without prompt). Non-prompt first documents stay `turn: 0` (`sessionStart`, unrecognized harness/event, missing positionals, first `stop`, first `subagentStart` / Copilot start/stop). Do not rewrite F003/F005/F006 exact-string headers here (F003 sibling owns compact keys) (AC-F008.1, AC-F008.3)
- [x] Unit-test `ingestHook` sequence on one session: `sessionStart` then `beforeSubmitPrompt` then two `stop` then a second `beforeSubmitPrompt`. Assert turns `0`, `1`, `1`, `1`, `2`. Stop multiplicity does not increment. JSONL lines deep-equal payloads and have no `turn` key (AC-F008.1, AC-F008.2, AC-F008.3, AC-F008.5)
- [x] Unit-test Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` as first prompt-kind documents → `turn: 1`; a later same-alias prompt → `turn: 2` (AC-F008.2, AC-F008.3)
- [x] Unit-test trap: payload `{ session_id, hook_event_name: "beforeSubmitPrompt" }` with positional `event: "stop"` (and no prior prompt-kind document) writes YAML `event: stop` (not `source_event: stop`) and `turn: 0` — must **not** increment from payload `hook_event_name`. Match F003 compact header (omit `session_id` on this non-session-start document) (AC-F008.2)
- [x] F008 exact-string YAML assertions that currently snapshot `source_event:` (missing-yaml first `sessionStart` / `stop` / `beforeSubmitPrompt`, and the trap above) expect header key `event:`. Match F003 compact header: `session_id` only on the initial session-start; other documents start `harness`, `event`, `timestamp`, `turn`. Do not change F002 positionals passed into `ingestHook` (AC-F008.2)
- [x] Unit-test prior document bytes unchanged after a later append (read first yaml buffer; append another event; `second.subarray(0, first.length).equals(first)`), including `turn` on the first document (AC-F008.4)
- [x] Unit-test missing yaml file: first non-prompt ingest (`sessionStart` or `stop`) writes `turn: 0` (ENOENT → zero prompt-kind documents). First prompt-kind ingest with no prior yaml writes `turn: 1` (AC-F008.1, AC-F008.5)
- [x] Keep existing F001/F003/F004/F005/F006/F007 ingest assertions (verbatim jsonl, yaml append, report-after-YAML-append `.md` gate, prompt persist, `task`, `agent_display_name`, stop header-only). Do not rewrite the report gate. `ingestHook` still resolves (does not throw) (AC-F008.6)
- [x] Sequence tests keep asserting `doc.turn`. Do not change `report.ts` / `parseYamlDocuments` (F004). Do not use `doc.source_event` from the report parser as the prompt-kind assertion (AC-F008.2, AC-F008.5, AC-F008.6)
- [x] Do not change `parseArgv`, `index.ts`, Event log serialization, Session index, or `.cursor/hooks.json` (AC-F008.5, AC-F008.6)

---

### Step 4: Confirm architecture unchanged
Architecture already names six Cursor events, `src/yaml.ts`, and YAML append under `ingest.lock`. F008 adds no events. Confirm-no-change only. Do not edit `cli.arch.md` / `system.arch.md`. Do not edit `docs/normalized-fields.md`.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
- [x] Confirm `cli.arch.md` **Used by** still lists `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Do **not** edit those lists
- [x] Confirm `system.arch.md` overview still names those six events. Do **not** edit it. Do not add Copilot/Claude registrations
- [x] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other extra Cursor events. Do not change ingest report-gate wording in architecture (F004 as shipped). Do not add `turn` to `docs/normalized-fields.md`

---

### Step 5: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F008.6)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build)
- [x] Unit tests cover AC-F008.1–6 at lib (`nextConversationTurn` + persist-under-lock + ingestHook sequences) except entry argv/`exitCode`/stdout spawn, which is e2e. Do not change `hooks.test.ts` event count (stays six)

---

### Deviations

- Spec status left `pending` (user; e2e sibling also replanning). Do not set `planned` in this run. AC checkboxes stay as in spec.md (only AC-F008.2 is `[ ]`). `/codify` sets `in-progress`.
- No git commit (user; parent commits planify outputs together).
- No architecture edit. `cli.arch.md` still names prompt-kind via `source_event` in the overview sentence; `/shipify` amends architecture. Step 4 is confirm-no-change only. `/codify` does not amend those files.
- No `.cursor/hooks.json` change. Hooks stay the six from F006. F008 does not add a registration.
- No report grouping, duration, Details, or `maybeWriteReport` change (F004 as shipped). Do not import `report.ts` from ingest/store. Do not change `parseYamlDocuments` field names (F004 sibling).
- No `docs/normalized-fields.md` change. `turn` is a header field, not a body field.
- Do not amend F003/F004/F005/F006/F007 specs or their plans. F003 sibling owns emitting `event:` and conditional `session_id`. This plan scans `event:` and updates F008 traps/fixtures that still exact-string `source_event:`.
- Do not change F002 command positionals.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `nextConversationTurn` / `persistIngest` / `ingestHook` by importing `cli/src`.
- F003 e2e `assertYamlIntegerTurn` already accepts any integer, so numbering must not require changing those e2e files in *this* container (e2e sibling owns spawn tests).
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not persist `turn` on the Event log line. Do not rewrite prior YAML documents. Do not use last document’s `turn` field as the source of truth. Do not migrate old `source_harness` / `source_event` keys (append-only; scanner ignores `source_event:`).
- Concurrent numbering must happen under the existing `ingest.lock`. Do not invent a second lock. Prebuilt `yamlDocument` remains an override for store tests.
- `/codify` of this container should land with F003 compact emit so ingest-written YAML has `event:` lines for the scanner to count. Scanner ignores `source_event:`.
- `/codify`: spec status set to `in-progress`. Scan is `^event:` only (does not also match `^source_event:`). Compact emit landed in the same run as F003.

---

> last updated: 2026-09-02T08:35:00Z
