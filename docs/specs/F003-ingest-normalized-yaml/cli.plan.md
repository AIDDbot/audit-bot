---
spec-kind: functional
container: cli
---
# F003-ingest-normalized-yaml - cli

## Specification

On each ingest of a JSON object, keep F001 persist (verbatim Event log, Session index) and, when a session identifier exists, also append one normalized YAML document to `{session_id}.yaml` in that day’s folder. Build the document from the in-memory event plus F002 source harness and source event positionals. Same lock. No second process. No re-read of files just written. No YAML npm package. This spec does not replace F001 or F002.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **stale for this spec**; `/codify` must amend it (Step 3). Do not amend architecture in this planify run.

Grounding (F002 shipped 0.6.1; this is the first F003 plan):

- `cli/src/argv.ts`: `parseArgv` already returns ingest plus optional `harness`/`event` from argv[3]/argv[4]. Keep it
- `cli/src/index.ts`: already uses `parseArgv`; currently **discards** harness/event and does **not** pass them into `ingestHook`. F003 requires passing them in so YAML can use them
- `cli/src/ingest.ts`: `IngestInput` is `{ stdinText, env, cwd, now? }`. Extend it with optional `harness`/`event`. `ingestHook` never throws
- `cli/src/event.ts`: `sessionIdentifier` is F001 (first non-empty among `session_id`, `conversation_id`, `parent_conversation_id`; never invent; never Copilot `sessionId`). `eventLogLine` is `JSON.stringify(payload)` with no overlay. Keep both
- `cli/src/store.ts`: `persistIngest` writes Event log + Session index under `ingest.lock`. No YAML yet. Extend the locked writes to append one YAML document when a session identifier is present
- `cli/src/usage.ts`: `usage: cli-node ingest`. Keep naming ingest; do not require the positionals
- `.cursor/hooks.json`: four events, `node .agents/hooks/index.mjs ingest cursor {event}`. Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, project root, day folder, decode/lock, Copilot/Claude registration, or extra Cursor events
- Architecture currently says positionals are “not persisted, not passed into ingest”. F003 **requires** passing them into ingest for YAML only (still not overlaid on the Event log)

Unit tests cover AC-F003.1–10 except entry spawn/`exitCode` (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload.

This feature keeps F001’s two daily artifacts and adds a third: **Session YAML log** — one `{session_id}.yaml` per distinct F001 session identifier; append-only multi-document YAML; each document is one Event, normalized. `/codify` must document this in `model.schema.md` (Step 3).

### Shared store wording

> Copy this block verbatim into the F003 e2e plan. Event log, Session index, project root, and day folder stay as F001. Concurrency now covers the YAML append. Argv now passes harness/event into ingest for YAML only.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written).
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

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — unchanged from F002. Project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop` only. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register prompt, stop, tool-use, Tab, `workspaceOpen`, or other Cursor events. YAML mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | keep | First F003 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: YAML document emitter and field mapping (lib)
Add a data table plus a small emitter (no nested harness×event switches; complexity ≤ 8). Node builtins only; do not add a YAML package. Header `session_id` is the F001 identifier, not Copilot `sessionId`. Body never repeats `session_id`.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
    - `docs/normalized-fields.md`
    - `docs/events-args.md`
- [x] Export `emitYamlDocument({ payload, sessionId, harness, event, now })` that returns one document string beginning with `---` and ending with a newline (AC-F003.2, AC-F003.3, AC-F003.6)
- [x] Header keys always, in this order: `session_id` (the F001 `sessionId` argument), `source_harness` (positional or `""`), `source_event` (positional or `""`), `timestamp` (host-local zero-padded `HH:MM:SS`). Do not infer harness/event from the payload (AC-F003.3)
- [x] `timestamp`: when payload `timestamp` is a finite number, treat it as Unix milliseconds; when it is a non-empty string that `Date.parse`s to a finite instant, use that instant; otherwise use `now` (the same receive `Date` used for the day folder). Format with `getHours`/`getMinutes`/`getSeconds`, not UTC. Quote the `HH:MM:SS` scalar so YAML 1.1 does not read it as sexagesimal (AC-F003.4)
- [x] Body: look up `source_event` in the alias map and `source_harness` in `{ cursor, copilot, claude-code }`. Unrecognized either → return header only (AC-F003.8). Matched: emit only the body fields below, in table order, excluding `session_id`. Absent source key → omit. Present `null` → YAML `null`. Present non-null → YAML scalar, or a `|` block scalar when the string contains a newline. Do not emit any other payload key (AC-F003.5, AC-F003.6)
- [x] Mapping table (source key per harness; body name is the normalized field). Session start body is empty.

| kind | `source_event` aliases | body field | cursor | copilot | claude-code |
|------|------------------------|------------|--------|---------|-------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none)* | | | |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` | `reason` | `reason` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type` | `subagent_type` | `agentName` | `agent_type` |
| | | `transcript_path` | `transcript_path` | `transcriptPath` | `transcript_path` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type` | `subagent_type` | `agentType` | `agent_type` |
| | | `transcript_path` | `transcript_path` | `transcriptPath` | `transcript_path` |
| | | `response_text` | `summary` | `response` | `last_assistant_message` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` | `prompt` | `prompt` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | `transcript_path` | `transcript_path` | `transcriptPath` | `transcript_path` |

- [x] Unit-test documents as exact strings (no YAML parse library): Cursor `sessionStart` is header-only; Cursor `sessionEnd` body `reason` from `reason`; Cursor `subagentStart` `agent_type` ← `subagent_type`, `transcript_path` ← `transcript_path`; Cursor `subagentStop` those plus `response_text` ← `summary`; Cursor prompt `prompt` ← `prompt`; Cursor `stop` `transcript_path` ← `transcript_path` (AC-F003.5)
- [x] Unit-test Copilot column `copilot` and Claude column `claude-code` for at least one kind each (e.g. Copilot `subagentStop` uses `agentType`/`transcriptPath`/`response`; Claude `SessionEnd` uses `reason`) (AC-F003.5)
- [x] Unit-test omitted harness/event → header `""`; unrecognized harness or event → header only; absent body key omitted; present `null` emits `null`; body has no `session_id`; keys stay flat (no nested subagent mapping) (AC-F003.3, AC-F003.5, AC-F003.6, AC-F003.8)
- [x] Unit-test timestamp: payload number `Date.UTC(2026, 8, 1, 13, 5, 9)` formats that instant local `HH:MM:SS`; payload ISO string likewise; missing/invalid `timestamp` uses `now` (AC-F003.4)

---

### Step 2: Pass positionals into ingest; persist YAML under the same lock
Thread F002 positionals into `ingestHook`. Build the YAML document from the in-memory payload (do not read jsonl/sessions to produce it). Under `ingest.lock`: append JSONL, update the index, then append YAML when a session identifier is present.
- Paths:
    - `cli/src/index.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/event.ts`
    - `cli/src/argv.ts`
    - `cli/test/ingest.test.ts`
    - `cli/test/store.test.ts`
    - `cli/test/event.test.ts`
    - `.agents/hooks/index.mjs`
- [x] `index.ts`: keep shebang and `parseArgv`; on ingest, `readFileSync(0)` then `ingestHook({ stdinText, env, cwd, harness, event })` in try/finally with `process.exitCode = 0`; on unknown, `console.error(usageMessage)` and `exitCode` 1. Do not infer positionals from the payload. Entry spawn/`exitCode` remains e2e
- [x] Extend `IngestInput` with optional `harness?: string` and `event?: string`. Treat omitted as `""` when emitting YAML. Do not add them to `eventLogLine` / the Event log object (AC-F003.3, AC-F003.4)
- [x] Keep `parseArgv`, `usageMessage`, `sessionIdentifier`, and `eventLogLine` as shipped. Do not use Copilot `sessionId` as the YAML filename or header `session_id`
- [x] `ingestOrThrow`: after a parsed object and project root, `sessionId = sessionIdentifier(payload)`; `now = input.now ?? new Date()`; when `sessionId` is defined, `yamlDocument = emitYamlDocument(...)`; call `persistIngest({ projectRoot, eventLine: eventLogLine(payload), sessionId, yamlDocument, now })`. When `sessionId` is undefined, pass `yamlDocument` undefined. Do not mutate `payload` to inject a generated timestamp (AC-F003.1, AC-F003.7)
- [x] `persistIngest` / `writeUnderLock`: same lock file and acquire/retry/stale rules. Under the lock: append one JSONL line, update the Session index, then when `sessionId` and `yamlDocument` are both present `appendFile` to `{dayFolder}/{sessionId}.yaml`. Do not rewrite the YAML file. Do not create a `.yaml` when `sessionId` is undefined (AC-F003.1, AC-F003.2, AC-F003.7, AC-F003.9)
- [x] Unit-test `ingestHook`: one call with `session_id` + `harness: "cursor"` + `event: "sessionStart"` writes Event log + Session index + `{session_id}.yaml` with exactly one `---`-prefixed document; parsed jsonl deep-equals the payload (no added `timestamp`/`harness`/`hookEvent`) (AC-F003.1, AC-F003.2, AC-F003.3, AC-F003.4)
- [x] Unit-test `ingestHook`: two sequential calls to the same session append two documents; the first document bytes stay unchanged (AC-F003.2, AC-F003.6)
- [x] Unit-test `ingestHook`: payload with only Copilot `sessionId` (no F001 identifier) writes jsonl, leaves `sessions.json` as `[]`, and does not create any `.yaml` (AC-F003.7)
- [x] Unit-test `ingestHook`: F001 session id + unrecognized harness/event still writes a header-only YAML document; missing positionals still write YAML with empty header strings (AC-F003.3, AC-F003.8)
- [x] Unit-test `ingestHook`: payload without `timestamp` uses `now` in YAML and the Event log line still deep-equals the payload (AC-F003.4)
- [x] Unit-test `persistIngest`: overlapping calls yield complete YAML documents (each starts with `---`) plus valid jsonl lines and unique session ids (AC-F003.9)
- [x] Keep existing F001/F002 persist assertions (verbatim jsonl, no overlay, `sessions.json` `[]` when no id, no undated `events.jsonl`). Extend those `persistIngest` callers with `yamlDocument` only where the new argument is required
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F003.10)

---

### Step 3: Amend architecture and model schema for the third artifact
Architecture is stale: it still says positionals are not passed into ingest and it does not name the Session YAML log. Amend docs in this `/codify` run; do not change Cursor registration.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
    - `docs/model/model.schema.md`
- [x] `cli.arch.md` ingest row: optional positionals are passed into ingest **for YAML header only**; not overlaid on the Event log; not used to skip/filter/transform; empty string when omitted. Command still writes Event log + Session index, and when a session identifier exists also appends `{session_id}.yaml` under the same lock
- [x] `cli.arch.md` code organization: add `src/yaml.ts` (normalized YAML document). Keep entry vs lib split
- [x] `system.arch.md` overview: daily artifacts are Event log, Session index, and Session YAML log. Cursor invocation line stays `node .agents/hooks/index.mjs ingest cursor {event}`
- [x] `model.schema.md`: Event remains the verbatim JSONL record; Session remains a related set of events; add the Session YAML log as the per-session append-only normalized document file
- [x] Do not revive `.cmd` wrappers. Do not change `.cursor/hooks.json`. Do not register Copilot or Claude

---

### Step 4: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F003.10)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [x] Unit tests cover AC-F003.1–10 at lib (persist + emitter + mapping). Entry argv/`exitCode` spawn is e2e, not this container’s unit suite. Leave `hooks.test.ts` asserting the current shell-string commands (unchanged registration)

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is stale relative to this spec. This planify run does not amend those files; `/codify` Step 3 does.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `persistIngest` / `emitYamlDocument` by importing `cli/src`.
- Unquoted `HH:MM:SS` is a YAML 1.1 sexagesimal. The emitter quotes `timestamp` (and any other scalar that would be misread) so the document stays valid YAML and the clock value is preserved.
- Cursor `sessionStart` body is empty because that table’s only common field is `session_id`, which lives in the header. YAML mapping for `beforeSubmitPrompt` / `stop` still applies if those events arrive via ingest; they are not added to `.cursor/hooks.json`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML file (AC-F003.7), even when positionals are `copilot` / `sessionStart`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.

> last updated: 2026-09-01T09:50:45Z
