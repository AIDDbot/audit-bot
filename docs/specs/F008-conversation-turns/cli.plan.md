---
spec-kind: functional
container: cli
---
# F008-conversation-turns - cli

## Specification

On each YAML-appending ingest, tag the new document with `turn`: the count of prompt-kind documents already present in that session’s Session YAML log, plus one if this document is prompt-kind; otherwise that same count. When none are already present and this document is not prompt-kind, `turn` is 0. Prompt-kind is only F002 `source_event` (`beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`). Do not increment for `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. First prompt-kind document is turn 1; later prompt-kind documents 2, 3, …. Documents before the first prompt are turn 0. Do not rewrite prior documents. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session YAML log to determine `turn`. Remain observe-only Node.js ≥ 24 ESM, no external deps, no new hook registrations. This spec does not replace F001–F007. Do not change report grouping, duration, Details, or `maybeWriteReport` (F004 as shipped). Do not add `turn` to `docs/normalized-fields.md`.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this spec** (already names the six Cursor events, `src/yaml.ts`, and YAML append under `ingest.lock`). F008 adds **no** new events. Do not amend architecture event lists in this planify run or in `/codify`. [`docs/normalized-fields.md`](../../normalized-fields.md) does **not** list `turn` (`turn` is a header field, not a body field) — do **not** add it. Do not amend F003/F004/F005/F006/F007 specs or their plans. F003 already emits five-field header `turn` as an unquoted YAML integer (currently ingest hardcodes `turn: 0`). F004 already groups the Session report by `turn`. This container owns **numbering**.

Grounding (F003 five-field header shipped; F004 grouping shipped; this is the first F008 plan):

- `cli/src/yaml.ts`: `YamlDocumentInput.turn: number`; `emitYamlDocument` emits five-field header via `emitPair("turn", input.turn)` (numeric path → `turn: 0` not `turn: "0"`). Emitter does **not** compute turn. Export `nextConversationTurn(existingYaml: string, sourceEvent: string): number`. Prompt-kind set is those three aliases. Scan existing multi-doc YAML for `source_event` (Node builtins; no YAML library). Unrecognized / empty event is not prompt-kind. Do **not** import `report.ts` from ingest/store just to reuse `parseYamlDocuments` (report is downstream)
- `cli/src/ingest.ts`: `sessionYamlDocument` **hardcodes** `turn: 0` **before** `persistIngest` (outside the lock). Stop that. Pass emit-inputs so production counting happens **inside** the lock. Do not change `maybeWriteReport`
- `cli/src/store.ts`: `persistIngest` takes optional prebuilt `yamlDocument` string; under `ingest.lock`: append JSONL, update index, append yaml if sessionId + yamlDocument. Keep `yamlDocument?: string` as an override that skips counting (concurrency / no-session-id leak tests). When a session YAML document is needed and no override is given, **under the lock** read existing `{session_id}.yaml` (ENOENT → `""`), `turn = nextConversationTurn(existing, event)`, `emitYamlDocument({ …, turn })`, append. Do not invent a second lock. Do not read `events.jsonl` or `sessions.json` to determine turn
- `cli/src/report.ts`: already has `promptKinds` set (`beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`) and groups by `turn`. **Do not change** report grouping, duration, Details, or `maybeWriteReport`. F008 out of scope
- `cli/test/yaml.test.ts`: exact-string docs pass `turn` in; includes AC-F003.11 `turn: 3` unquoted. Emitter tests stay passing explicit turn
- `cli/test/ingest.test.ts`: several exact-string YAML assertions use `turn: 0` including **first** `beforeSubmitPrompt` cases (AC-F005.6). Those must become `turn: 1` when numbering lands. Non-prompt first documents stay `turn: 0`
- `cli/test/store.test.ts`: passes prebuilt `yamlDocument` for concurrency / no-session-id leak tests. Keep a prebuilt-string path working for those tests
- `.cursor/hooks.json`: six events. **Do not change**
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except numbering the new document), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude prompt aliases still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or report grouping (F004 as shipped)

Unit tests cover AC-F008.1–6 at lib except entry spawn/`exitCode`/stdout (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004). Each YAML document includes integer `turn` (which conversation turn the Event belongs to; a property of the document, not a separate persisted entity).

This spec does not add a persisted Turn file. Event log stays verbatim (no `turn`). Session index unchanged. YAML numbering is this container’s job. The report already reads `turn` from YAML; correct numbering is this spec’s job.

### Shared store wording

> Copy this block verbatim into the F008 e2e plan.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; do not re-read the document just appended to *produce* it). Under `ingest.lock`, read that session’s **existing** Session YAML log (missing file → zero prompt-kind documents) to compute `turn`. Do not read the Event log or Session index to determine `turn`.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (never a zero-padded string, never a body field). When appending a document, `turn` is the number of prompt-kind documents already present in that session’s Session YAML log, plus one if this document is itself prompt-kind; otherwise that same already-present count. When none are already present and this document is not prompt-kind, `turn` is 0. Prompt-kind is only `source_event` values `beforeSubmitPrompt`, `userPromptSubmitted`, and `UserPromptSubmit` (the F002 positional, not payload `hook_event_name`). The first prompt-kind document is turn 1; each later prompt-kind document is one greater (`2`, `3`, …). Documents written before that first prompt-kind document are turn 0. `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` belong to the current turn; their multiplicity does not start or end a turn. Do not rewrite `turn` on previously written documents. Do not persist `turn` on the Event log line. Do not require any file other than that session’s Session YAML log to determine `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start body is `agent_type`, then `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name`. Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task`. Do **not** include `transcript_path` in any YAML document (F005). Agent stop body is empty (header only).
- Do not include any harness-specific or event-specific field that is not in that normalized set. Do not add `turn` to the body or to `docs/normalized-fields.md`.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the five header fields only (including computed `turn`).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `source_harness`, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every YAML append). Do not change them here. The report already reads `turn` from YAML; correct numbering is this spec’s job.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session YAML log (missing file → empty), compute `turn`, emit one complete YAML document, and append it. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header (including prompt-kind for `turn`) can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F008 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | keep | First F008 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: `nextConversationTurn` helper
Export `nextConversationTurn(existingYaml: string, sourceEvent: string): number` from `cli/src/yaml.ts` (or a small helper next to it). Prompt-kind is only those three `source_event` aliases. Scan existing multi-doc YAML for `source_event` with Node builtins; do not import `report.ts`. Emitter stays pass-through: `emitYamlDocument` still takes `turn` and does not compute it. Keep function complexity ≤ 8.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
- [ ] Export `nextConversationTurn(existingYaml: string, sourceEvent: string): number`. Prompt-kind set is `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Unrecognized / empty `sourceEvent` is not prompt-kind. Do not accept a payload object (no `hook_event_name`). Do not read a `turn` field from the last document — count prompt-kind `source_event` values in existing documents (AC-F008.1, AC-F008.2)
- [ ] Scan existing YAML text for header `source_event` lines (split documents / line scan; no YAML library). Quoted or unquoted scalars that equal a prompt-kind alias count as one prompt-kind document. Do not treat any other key as prompt-kind (AC-F008.2)
- [ ] Return the already-present prompt-kind count, plus one if `sourceEvent` is prompt-kind; otherwise that same count. Empty `existingYaml` and non-prompt `sourceEvent` → `0`. Empty `existingYaml` and prompt-kind `sourceEvent` → `1` (AC-F008.1, AC-F008.3)
- [ ] Keep `emitYamlDocument` / `YamlDocumentInput.turn` unchanged. Exact-string emitter tests keep passing explicit `turn` (including AC-F003.11 `turn: 3` unquoted and prompt fixtures that still pass `turn: 0`) (AC-F003.11 remains in force)
- [ ] Unit-test empty yaml → `0` for `sessionStart` / `stop` / `""` / unrecognized; empty yaml → `1` for `beforeSubmitPrompt` (AC-F008.1, AC-F008.3)
- [ ] Unit-test a fixture with one `sessionStart` document: non-prompt → `0`; `beforeSubmitPrompt` → `1`. Fixture with one prompt then `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` → still `1` (stops do not increment). Second `beforeSubmitPrompt` against a fixture that already has one prompt-kind document → `2` (AC-F008.2, AC-F008.3)
- [ ] Unit-test Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` as prompt-kind (empty yaml → `1`; second of that alias → `2`). Mix of Cursor then Copilot/Claude aliases still increments (AC-F008.2, AC-F008.3)
- [ ] Unit-test counting ignores a trap line that is not `source_event` (e.g. a body or comment-shaped `hook_event_name: beforeSubmitPrompt` in the existing text does not count). The helper takes `sourceEvent` string only (AC-F008.2)

---

### Step 2: Persist under lock — read, count, emit, append
Today YAML is built **outside** the lock with `turn: 0`. Concurrent ingests would race if turn is counted outside the lock. Count prompt-kind documents already in that session YAML **under `ingest.lock`**, then emit, then append. Missing YAML file → zero prompt-kind documents (ENOENT). Do not read `events.jsonl` or `sessions.json` to determine turn. Do not re-read the document just appended to *produce* it (body still from in-memory event + F002 positionals). Do not invent a second lock. Keep functions complexity ≤ 8.
- Paths:
    - `cli/src/store.ts`
    - `cli/src/ingest.ts`
    - `cli/test/store.test.ts`
    - `.agents/hooks/index.mjs`
- [ ] Keep `yamlDocument?: string` as an **override** that skips counting (existing concurrency / leak tests pass a prebuilt string). When `yamlDocument` is present and `sessionId` is present, append that string as today (AC-F008.4)
- [ ] Add emit-inputs on `persistIngest` (e.g. payload, harness, event, now — reuse `YamlDocumentInput` minus `turn`, or a small sibling type). Production ingest passes emit-inputs and does **not** pass a prebuilt `yamlDocument`. When emit-inputs are present, `sessionId` is present, and `yamlDocument` is omitted: under the lock, after JSONL + index, `readFile` that session’s `{session_id}.yaml`; ENOENT → `""`; `turn = nextConversationTurn(existing, event)`; `emitYamlDocument({ …, turn })`; append. Do not read Event log or Session index to determine `turn` (AC-F008.1, AC-F008.5)
- [ ] Extract helpers so `writeUnderLock` / `persistIngest` stay complexity ≤ 8 (e.g. `readExistingYaml` ENOENT → `""`; `appendSessionYaml` resolves override vs count-and-emit). Do not add a second lock file
- [ ] `ingest.ts`: remove `sessionYamlDocument` hardcoding `turn: 0` outside the lock. Stop calling `emitYamlDocument` before `persistIngest`. Pass emit-inputs (`payload`, `harness`, `event`, `now`) when `sessionId` is defined. Keep `maybeWriteReport` after persist returns; do not change it (AC-F008.1)
- [ ] Keep `cli/test/store.test.ts` prebuilt-`yamlDocument` tests working: overlapping complete yaml documents, and `sessionId` undefined + prebuilt string must not create `leaked.yaml`. Calls that omit both override and emit-inputs still skip YAML (jsonl/index-only cases) (AC-F008.4, AC-F008.5)
- [ ] Do not add `turn` to `eventLogLine` / the Event log object. Do not mutate `payload`. Keep `parseArgv`, `usageMessage`, `sessionIdentifier`, `index.ts` (`finally { process.exitCode = 0 }`) as shipped (AC-F008.5, AC-F008.6)
- [ ] `cd cli && bun run build` after `cli/src/` changes so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F008.6)

---

### Step 3: ingestHook sequence tests
YAML numbering already works at persist after Step 2. Cover AC-F008.1–6 through `ingestHook` (same persist path extra argv will invoke). Observe-only `exitCode` / stdout remain e2e. Do not change `maybeWriteReport`, report grouping, or Event log serialization.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
- [ ] Update existing exact-string `turn: 0` on **first** `beforeSubmitPrompt` cases to `turn: 1` (AC-F005.6 with prompt and without prompt). Non-prompt first documents stay `turn: 0` (`sessionStart`, unrecognized harness/event, missing positionals, first `stop`, first `subagentStart` / Copilot start/stop) (AC-F008.1, AC-F008.3)
- [ ] Unit-test `ingestHook` sequence on one session: `sessionStart` then `beforeSubmitPrompt` then two `stop` then a second `beforeSubmitPrompt`. Assert turns `0`, `1`, `1`, `1`, `2`. Stop multiplicity does not increment. JSONL lines deep-equal payloads and have no `turn` key (AC-F008.1, AC-F008.2, AC-F008.3, AC-F008.5)
- [ ] Unit-test Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` as first prompt-kind documents → `turn: 1`; a later same-alias prompt → `turn: 2` (AC-F008.2, AC-F008.3)
- [ ] Unit-test trap: payload `{ session_id, hook_event_name: "beforeSubmitPrompt" }` with positional `event: "stop"` (and no prior prompt-kind document) writes `source_event: stop` and `turn: 0` — must **not** increment from payload `hook_event_name` (AC-F008.2)
- [ ] Unit-test prior document bytes unchanged after a later append (read first yaml buffer; append another event; `second.subarray(0, first.length).equals(first)`), including `turn` on the first document (AC-F008.4)
- [ ] Unit-test missing yaml file: first non-prompt ingest (`sessionStart` or `stop`) writes `turn: 0` (ENOENT → zero prompt-kind documents). First prompt-kind ingest with no prior yaml writes `turn: 1` (AC-F008.1, AC-F008.5)
- [ ] Keep existing F001/F003/F004/F005/F006/F007 ingest assertions (verbatim jsonl, yaml append, report-after-YAML-append `.md` gate, prompt persist, `task`, `agent_display_name`, stop header-only). Do not rewrite the report gate. `ingestHook` still resolves (does not throw) (AC-F008.6)
- [ ] Do not change `parseArgv`, `index.ts`, Event log serialization, Session index, or `.cursor/hooks.json` (AC-F008.5, AC-F008.6)

---

### Step 4: Confirm architecture unchanged
Architecture already names six Cursor events, `src/yaml.ts`, and YAML append under `ingest.lock`. F008 adds no events. Confirm-no-change only. Do not edit `cli.arch.md` / `system.arch.md`. Do not edit `docs/normalized-fields.md`.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
- [ ] Confirm `cli.arch.md` **Used by** still lists `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Do **not** edit those lists
- [ ] Confirm `system.arch.md` overview still names those six events. Do **not** edit it. Do not add Copilot/Claude registrations
- [ ] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other extra Cursor events. Do not change ingest report-gate wording in architecture (F004 as shipped). Do not add `turn` to `docs/normalized-fields.md`

---

### Step 5: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F008.6)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [ ] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build)
- [ ] Unit tests cover AC-F008.1–6 at lib (`nextConversationTurn` + persist-under-lock + ingestHook sequences) except entry argv/`exitCode`/stdout spawn, which is e2e. Do not change `hooks.test.ts` event count (stays six)

---

### Deviations

- Spec status stays `pending`; this run does not set `planned`. Sibling e2e planify runs in parallel; the parent coordinates status after both plans exist. Leave `docs/specs/F008-conversation-turns/spec.md` untouched.
- No architecture edit. `cli.arch.md` and `system.arch.md` already name six Cursor events and YAML append under lock; Step 4 is confirm-no-change only. `/codify` does not amend those files.
- No `.cursor/hooks.json` change. Hooks stay the six from F006. F008 does not add a registration.
- No report grouping, duration, Details, or `maybeWriteReport` change (F004 as shipped). Do not import `report.ts` from ingest/store.
- No `docs/normalized-fields.md` change. `turn` is a header field, not a body field.
- Do not amend F003/F004/F005/F006/F007 specs or their plans.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `nextConversationTurn` / `persistIngest` / `ingestHook` by importing `cli/src`.
- F003 e2e `assertYamlIntegerTurn` already accepts any integer, so numbering must not require changing those e2e files in *this* container (e2e sibling owns spawn tests).
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not persist `turn` on the Event log line. Do not rewrite prior YAML documents. Do not use last document’s `turn` field as the source of truth.
- Concurrent numbering must happen under the existing `ingest.lock`. Do not invent a second lock. Prebuilt `yamlDocument` remains an override for store tests.

---

> last updated: 2026-09-02T06:44:35Z
