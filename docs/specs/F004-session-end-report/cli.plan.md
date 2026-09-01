---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest whose F002 `source_event` positional is `sessionEnd` or `SessionEnd` and whose payload has an F001 session identifier, after the session-end YAML document is in `{session_id}.yaml`, write `{session_id}.md` in the same daily folder. Produce the report only from that YAML file (every document, file order, no re-sort). Same invocation. No second process. No new CLI command. No new hook registrations. This spec does not replace F001–F003.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **stale for this spec**; `/codify` must amend it (Step 3). Do not amend architecture in this planify run.

Grounding (F003 shipped 0.7.0; this is the first F004 plan):

- `cli/src/argv.ts`: `parseArgv` returns ingest plus optional `harness`/`event`. Keep it
- `cli/src/index.ts`: passes harness/event into `ingestHook`. Keep it. Entry spawn/`exitCode` remains e2e
- `cli/src/ingest.ts`: `IngestInput` has optional `harness`/`event`. `ingestOrThrow` emits YAML then `persistIngest`. `ingestHook` never throws. After persist there is **no** report write yet
- `cli/src/yaml.ts`: `emitYamlDocument` — header `session_id`, `source_harness`, `source_event`, `timestamp` (quoted `HH:MM:SS`); body mapped fields; block scalar `|` when string has newline; YAML `null` for present null. Unrecognized harness/event → header only
- `cli/src/store.ts`: `persistIngest` under `ingest.lock`: append JSONL, update index, then append YAML when session id + yamlDocument present. Does **not** write `.md`. Does **not** re-read YAML
- `cli/src/event.ts`: F001 session identifier (`session_id` / `conversation_id` / `parent_conversation_id`; never Copilot `sessionId`). Keep it
- `.cursor/hooks.json`: four events, `node .agents/hooks/index.mjs ingest cursor {event}`. Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except this invocation may **read** the Session YAML log after the session-end document is present), project root, day folder, decode/lock, Copilot/Claude registration, or extra Cursor events
- Architecture currently names three daily artifacts and `src/yaml.ts`. It does not name a Session report or `src/report.ts`. Positionals are documented as YAML-header only and “not used to skip/filter/transform”. F004 **requires** using `source_event` to **gate the report** only (still not overlaying argv on the Event log; still not skipping persist)

Unit tests cover AC-F004.1–13 except entry spawn/`exitCode` (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003).

This feature adds a fourth daily artifact: **Session report** — one `{session_id}.md` per session for which a session-end kind was ingested that day; Markdown with tables; overwritten on a later session-end the same day. `/codify` must document this in `model.schema.md` (Step 3).

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, YAML, project root, and day folder stay as F003. Concurrency now notes the report read-after-YAML. Argv session-end positional gates the report.

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
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session YAML log; do not create a Session report.

**Session YAML log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml`

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the four header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Always a `.md` file named for the F001 session identifier. Markdown with tables, never HTML. One file per session for which a session-end kind was ingested that day.
- An ingest may write a Session report **only if** the F002 `source_event` positional is the session-end kind (`sessionEnd` or `SessionEnd`) **and** the event has a session identifier. Do **not** infer session-end from the JSONL payload (not from `hook_event_name` or any other payload key).
- When those conditions hold, write the Session report in the **same invocation**, **after** the session-end YAML document is in that session’s Session YAML log — no second process, no new user-facing report command.
- Produce the report **only from** that session’s Session YAML log (every document, in file order). Do **not** read the Event log or the Session index to produce it. Do **not** re-sort documents.
- When the payload has no session identifier: do not create a Session report (and F003 writes no YAML).
- When a later session-end kind arrives for the same session the same day: **overwrite** `{session_id}.md` from the YAML as it then stands. Do **not** append a second report in that file.
- Overview: `session_id` (the F001 identifier); `source_harness` from the **triggering session-end document**; start time (first document’s `timestamp`); end time (last document’s `timestamp`); total duration.
- Start time, end time, and duration are always from the documents in that day’s Session YAML log (the folder’s calendar day). Do **not** reconstruct across days.
- Duration is elapsed clock time on that calendar day, displayed as zero-padded `HH:MM:SS`, computed from the first and last `HH:MM:SS` timestamps. When the last timestamp is **before** the first, duration is `00:00:00`. When they are equal, duration is `00:00:00`.
- Event-count summary: the number of YAML documents, and a breakdown of how many documents have each distinct `source_event` value.
- Chronological event list: a Markdown table with one row per YAML document, in file order, columns Time (`timestamp`), Event (`source_event`), and Details (relevant normalized body fields).
- Details may include **only** the normalized common body fields for that event kind in `docs/normalized-fields.md`, excluding `session_id` (already in the overview and YAML header), using those snake_case names, in table order, omitting fields absent from the document. Present values including YAML `null` appear. Multiple present fields in one cell are `{name}: {value}` pairs in table order, separated by `; `.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`) — Details empty; session end (`sessionEnd` / `SessionEnd`) — `reason`; subagent start (`subagentStart` / `SubagentStart`) — `agent_type`, `transcript_path`; subagent stop (`subagentStop` / `SubagentStop`) — `agent_type`, `transcript_path`, `response_text`; user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`) — `prompt`; agent stop (`stop` / `agentStop` / `Stop`) — `transcript_path`. When the document is header-only (F003 unmapped harness or event), Details is empty.
- A Details value longer than 80 characters appears as the first 80 characters followed by an ellipsis (`...`). A value of 80 characters or fewer must **not** receive an ellipsis. A preview is always a single line (newlines in the source value are spaces **before** the limit is applied).
- List subagent start and stop as ordinary chronological rows. Do **not** nest a subagent under a parent.
- A table cell must remain one cell even when a field value contains `|`, newlines, or other Markdown-significant characters.
- When Session report generation **fails**, still persist as F001 and F003, still exit 0, and do not write blocking stdout.
- Node builtins only: no YAML parsing library. The report must accept the Session YAML log as F003 writes it (fixed-structure multi-document key-value YAML).

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them **and** so the Session report gate can use `source_event` (`sessionEnd` or `SessionEnd`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — unchanged from F003. Project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` only. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register prompt, stop, tool-use, Tab, `workspaceOpen`, or other Cursor events. YAML mapping for prompt and agent-stop still applies if those events are received via ingest. F001’s four Cursor registrations already include `sessionEnd`; do not add a report hook.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | keep | First F004 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: Report parser + Markdown emitter (lib)
Add a fixed-structure YAML reader plus a Markdown emitter (no nested harness×event switches; complexity ≤ 8). Node builtins only; do not add a YAML parse package. Parser input is YAML text as F003 `emitYamlDocument` writes it, not JSONL. Details come from already-normalized YAML body keys, not payload source keys.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
    - `docs/normalized-fields.md`
    - `cli/src/yaml.ts`
- [x] Export `parseYamlDocuments(text)` that splits on lines that are exactly `---`, then reads each document’s header + body as key/value. Accept F003 shapes: unquoted scalars, JSON-quoted scalars (`timestamp: "15:00:00"`, `source_harness: ""`), YAML `null`, and `|` block scalars (content lines indented two spaces, joined with `\n`). Do not use a YAML library (AC-F004.2, AC-F004.10)
- [x] Export `emitSessionReport(docs)` that returns the Markdown string (tables, never HTML) ending with a newline. Use every document in array order; do not sort. Empty `docs` is a generation failure (throw) (AC-F004.2, AC-F004.8)
- [x] Overview table, Field / Value rows in this order: `session_id` (first document’s header); `source_harness` from the **last** document whose `source_event` is `sessionEnd` or `SessionEnd` (the triggering session-end); `start` (first document’s `timestamp`); `end` (last document’s `timestamp`); `duration` (zero-padded `HH:MM:SS`). Headings: `## Overview` then `| Field | Value |` / `| --- | --- |` (AC-F004.3, AC-F004.8)
- [x] Duration: parse each `HH:MM:SS` as seconds-of-day; elapsed = last − first; when last < first or last === first, emit `00:00:00`. Do not reconstruct across days (AC-F004.3)
- [x] Event-count section: `## Event counts`, a `Total: {n}` line (`n` = document count), then `| source_event | count |` with one row per distinct `source_event` in **first-seen** order, values as stored in YAML (`sessionEnd` vs `SessionEnd` stay distinct) (AC-F004.4)
- [x] Events table: `## Events` then `| Time | Event | Details |` with one row per document in file order. Time = `timestamp`; Event = `source_event`. Subagent start/stop are ordinary rows; do not emit nested lists or parent headings (AC-F004.5, AC-F004.7)
- [x] Details from `source_event` only, using this table (normalized YAML keys; omit absent; present `null` renders as `null`). Unrecognized / header-only `source_event` → empty Details. Multiple present fields: `{name}: {value}` in table order, separated by `; ` (AC-F004.5)

| kind | `source_event` aliases | Details fields (table order) |
|------|------------------------|------------------------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none — empty)* |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type`, `transcript_path` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type`, `transcript_path`, `response_text` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | `transcript_path` |
| unmapped | any other header `source_event` | *(none — empty)* |

- [x] Preview each Details **value** as a single line: replace CR/LF newlines with a space **first**, then if the result is longer than 80 characters take the first 80 and append `...`; 80 or fewer must not get an ellipsis. Apply per value, not to the whole cell (AC-F004.6)
- [x] Escape table cells so `|` does not split columns (`|` → `\|` in cell text). Newlines are already spaces. A cell stays one cell (AC-F004.8)
- [x] Locked Markdown shape (unit tests assert this exact string, including the trailing newline):

```
## Overview

| Field | Value |
| --- | --- |
| session_id | sess-1 |
| source_harness | cursor |
| start | 15:00:00 |
| end | 15:01:00 |
| duration | 00:01:00 |

## Event counts

Total: 2

| source_event | count |
| --- | --- |
| sessionStart | 1 |
| sessionEnd | 1 |

## Events

| Time | Event | Details |
| --- | --- | --- |
| 15:00:00 | sessionStart |  |
| 15:01:00 | sessionEnd | reason: completed |
```

- [x] Unit-test `parseYamlDocuments` + `emitSessionReport` as exact Markdown strings (or stable substrings where a full file is long): two-document sessionStart then sessionEnd matches the locked shape above (AC-F004.2, AC-F004.3, AC-F004.4, AC-F004.5, AC-F004.8)
- [x] Unit-test duration: first `15:00:00` last `16:01:09` → `01:01:09`; equal timestamps → `00:00:00`; last before first (`16:00:00` then `15:00:00`) → `00:00:00` (AC-F004.3)
- [x] Unit-test Details: sessionStart empty; sessionEnd `reason`; subagentStart `agent_type` then `transcript_path`; subagentStop those plus `response_text`; prompt `prompt`; agent stop `transcript_path`; header-only / unrecognized event empty; absent field omitted; present `null` appears as `reason: null` (or `agent_type: null`) (AC-F004.5)
- [x] Unit-test parser input is F003 YAML text: quoted timestamp, `|` block scalar `hello\nworld` → Details preview `hello world`; JSON-quoted empty harness; YAML `null`. Do not pass jsonl into the emitter (AC-F004.2, AC-F004.11)
- [x] Unit-test truncation: 81-character value → first 80 + `...`; 80-character value has no ellipsis; a newline in a 80+ character source is a space before the limit (AC-F004.6)
- [x] Unit-test subagent start and stop appear as two consecutive table rows (no nesting) (AC-F004.7)
- [x] Unit-test a Details value containing `|` remains one cell (`\|` in the rendered row) (AC-F004.8)
- [x] Unit-test Claude `SessionEnd` and Copilot `sessionEnd` as stored `source_event` values in the Event column and counts (AC-F004.4, AC-F004.5)

---

### Step 2: Wire report into ingest after YAML persist
Keep `persistIngest` as F001+F003 (jsonl, index, YAML append under `ingest.lock`). After it returns, when `event` is `sessionEnd` or `SessionEnd` **and** `sessionId` is defined, read `{session_id}.yaml` and `writeFile` `{session_id}.md` (overwrite). Isolate report failures so persist stays written and `ingestHook` still does not throw. Do not read `events.jsonl` or `sessions.json` for the report.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/report.ts`
    - `cli/src/index.ts`
    - `cli/src/argv.ts`
    - `cli/test/ingest.test.ts`
    - `cli/test/store.test.ts`
    - `.agents/hooks/index.mjs`
- [x] Keep `parseArgv`, `index.ts` (shebang, `readFileSync(0)`, `ingestHook({ … harness, event })`, `finally { process.exitCode = 0 }`), `sessionIdentifier`, `eventLogLine`, and `persistIngest` lock/append behavior as shipped. Do not add a report command. Entry spawn/`exitCode` remains e2e (AC-F004.9, AC-F004.10)
- [x] Export `writeSessionReport({ yamlPath, mdPath })` from `report.ts`: `readFile` yaml, parse, emit, `writeFile` md (overwrite). Throw on empty parse. `ingestOrThrow`: after `persistIngest`, if `input.event` is exactly `sessionEnd` or `SessionEnd` and `sessionId` is defined, call it with `{dayFolder}/{sessionId}.yaml` and `{dayFolder}/{sessionId}.md`. Recompute `dayFolder` with existing `dayFolderName(now)` + `path.join(projectRoot, "temp", "audit", …)`. Wrap **only** that call in try/catch so a throw cannot undo persist; `ingestHook` still swallows everything (AC-F004.1, AC-F004.9, AC-F004.12)
- [x] Gate on the F002 positional only. Do **not** treat payload `hook_event_name` (or any other payload key) as session-end. Omitted/`""` event does not write a report (AC-F004.1, AC-F004.13)
- [x] Do not change `store.ts` to write `.md` or to re-read YAML to *produce* YAML. Report read happens after persist returns (lock already released). Do not open jsonl or `sessions.json` inside `report.ts` (AC-F004.11)
- [x] Unit-test `ingestHook`: `harness: "cursor"`, `event: "sessionEnd"`, payload `{ session_id: "sess-1", reason: "completed" }` writes jsonl + index + yaml **and** `{session_id}.md` whose text equals `emitSessionReport` of that yaml (AC-F004.1, AC-F004.8)
- [x] Unit-test `ingestHook`: `event: "sessionStart"` with a session id writes yaml and does **not** create a `.md` (AC-F004.1)
- [x] Unit-test `ingestHook`: `event: "sessionStart"` even when payload `hook_event_name` is `sessionEnd` does **not** create a `.md` (do not infer from the payload) (AC-F004.1)
- [x] Unit-test `ingestHook`: Claude positional `event: "SessionEnd"` with a session id **does** write `.md` (AC-F004.1)
- [x] Unit-test `ingestHook`: payload with only Copilot `sessionId` (no F001 identifier) + `event: "sessionEnd"` writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` and no `.md` (AC-F004.13)
- [x] Unit-test `ingestHook`: sessionStart then sessionEnd then a later sessionEnd the same day overwrites `{session_id}.md` (file is one report, not two concatenated overviews; table row count matches yaml document count) (AC-F004.12)
- [x] Unit-test `ingestHook`: report path does not consult jsonl — after a successful sessionEnd, the `.md` still matches the yaml even if the test never reads `events.jsonl` / `sessions.json` to build expected Markdown (derive expected only from the yaml file) (AC-F004.11)
- [x] Unit-test `writeSessionReport` throws on empty yaml text. Unit-test `ingestHook`: mkdir `{session_id}.md` as a directory before a sessionEnd ingest so `writeFile` fails; assert ingestHook still resolves, jsonl/yaml/index are written, and no blocking throw (AC-F004.9)
- [x] Keep existing F001/F003 ingest assertions (verbatim jsonl, yaml append, no overlay). A sessionEnd fixture that previously only checked yaml should still pass **and** now expect `.md` when `event` is session-end
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Step 3: Amend architecture and model schema for the fourth artifact
Architecture is stale: it names Event log, Session index, and Session YAML log, and says positionals are for the YAML header only. Amend docs in the `/codify` run (not this planify run); do not change Cursor registration.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
    - `docs/model/model.schema.md`
- [x] `cli.arch.md` ingest row: optional positionals are passed into ingest for the YAML header **and** to gate the Session report (`source_event` is `sessionEnd` or `SessionEnd`). Not overlaid on the Event log; not used to skip/filter persist; empty string when omitted. Command still writes Event log + Session index, appends `{session_id}.yaml` when a session identifier exists, and after that YAML document is in the file may write `{session_id}.md` when the session-end gate holds
- [x] `cli.arch.md` code organization: add `src/report.ts` (Session report from Session YAML log). Keep entry vs lib split
- [x] `system.arch.md` overview: daily artifacts are Event log, Session index, Session YAML log, and Session report. Cursor invocation line stays `node .agents/hooks/index.mjs ingest cursor {event}`
- [x] `model.schema.md`: Event remains the verbatim JSONL record; Session remains a related set of events; Session YAML log remains the append-only normalized document file; add the Session report as the per-session Markdown file overwritten on a later session-end the same day
- [x] Do not revive `.cmd` wrappers. Do not change `.cursor/hooks.json`. Do not register Copilot or Claude. Do not add a report hook

---

### Step 4: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F004.10)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [x] Unit tests cover AC-F004.1–13 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Leave `hooks.test.ts` asserting the current shell-string commands (unchanged registration)

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is stale relative to this spec (no Session report artifact, no `report.ts`, positionals documented as YAML-header only). This planify run does not amend those files; `/codify` Step 3 does.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseYamlDocuments` / `emitSessionReport` by importing `cli/src`.
- No YAML parsing library: the report parser accepts only F003’s fixed-structure multi-document key-value YAML (quoted `HH:MM:SS`, `|` block scalars, YAML `null`). It is not a general YAML 1.1 parser.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F003 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Duration uses first and last `HH:MM:SS` on that calendar day only. Inverted timestamps (last before first) and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|` so the row stays three columns. Newlines are spaces before the 80-character preview limit.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML, no Markdown (AC-F004.13), even when the positional is `sessionEnd`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers jsonl, index, YAML). Report is written after persist returns. A later session-end the same day overwrites `.md`.

---

> last updated: 2026-09-01T10:31:52Z
