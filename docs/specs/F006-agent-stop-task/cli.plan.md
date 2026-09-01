---
spec-kind: functional
container: cli
---
# F006-agent-stop-task - cli

## Specification

Register Cursor `stop` in `.cursor/hooks.json` with the same shell-string command shape as the five existing events. On `ingest cursor stop`, persist as F001 (verbatim Event log, Session index) and F003 (Session YAML log when a session identifier exists). Agent-stop YAML is the four-field header only (no body; F005 already dropped `transcript_path`). Add `task` after `agent_type` on subagent-start YAML (Cursor source key `task`; Copilot and Claude Code have no source key). F004 Details follow that table (`task` after `agent_type`). Remain observe-only. This spec does not replace F001–F005. Do not change when a Session report is written, overview `source_harness`, or duration (F004 amend).

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **stale for this spec** (still names five Cursor events and the session-end report gate). `/codify` must amend the sixth-event lists (Step 5). Do not amend architecture in this planify run. Do not amend the session-end report gate here (F004 sibling). [`docs/normalized-fields.md`](../../normalized-fields.md) still omits `task` and still states the three-harness-only intro — `/codify` Step 1 amends that file.

Grounding (F005 shipped 0.9.0; this is the first F006 plan):

- `cli/src/yaml.ts`: `stop` / `agentStop` / `Stop` already `emptyFields`. `subagentStartFields` is `agent_type` only. Add `task` after `agent_type`. Cursor source key `task`. Copilot and Claude Code: **no source key** (empty string). In `bodyLines`, skip a field when `sourceKey` is empty so Copilot/Claude never map `task` from any other payload key (AC-F006.6). Omit when Cursor `task` absent (existing `sourceKey in payload` rule)
- `cli/src/report.ts`: `detailsByEvent` subagent start is `["agent_type"]`. Add `task` after `agent_type`. Agent stop Details already `[]`. Do **not** change `maybeWriteReport`, `triggeringHarness`, duration, or overview
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F003 YAML append, F004 session-end report gate as shipped. Keep them. YAML mapping already handles `ingest cursor stop` if invoked (`cli/test/yaml.test.ts`, `cli/test/ingest.test.ts` stop fixtures)
- `.cursor/hooks.json`: five committed events including `beforeSubmitPrompt`, `node .agents/hooks/index.mjs ingest cursor {event}`. Add sixth: `stop`. Keep the five. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/hooks.test.ts`: asserts **exactly five** events. Must become **six** including `stop`
- `cli/test/yaml.test.ts`: Cursor `subagentStart` body is `agent_type` only (no `task` in the fixture). Cursor `stop` is already header-only with no `transcript_path` and no body `session_id` — keep that lock; add `task` tests
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML header / append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or extra Cursor events beyond the sixth (`stop` is in; tool-use, Tab, `workspaceOpen` stay out)
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude subagent start and agent-stop still applies if those events are received via ingest
- Do not plan ingest report-gate changes (`maybeWriteReport` / sessionEnd-only write) or `triggeringHarness` (F004 sibling)

Unit tests cover AC-F006.1–7 at lib except entry spawn/`exitCode` (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add persisted entities. It adds a sixth Cursor invocation that writes the same ingest artifacts, and it extends the subagent-start YAML body (and thus F004 Details) with `task`. Agent-stop YAML stays header-only.

### Shared store wording

> Copy this block verbatim into the F006 e2e plan.

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
- `transcript_path` and `task` on the payload stay on the Event log line (F001 verbatim). Do not strip them.

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
- Subagent start body is `agent_type`, then `task`. Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (explicit exception to the three-harness intro). Do not map `task` from any other payload field on those harnesses. Omit `task` when the source key is absent.
- Do **not** include `transcript_path` in any YAML document (F005). Agent stop body is empty (header only).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the four header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `source_harness`, and duration are F004 amend (not this spec). Do not change them here.
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `agent_type`, then `task`; subagent stop `agent_type`, `response_text`; user prompt `prompt`; agent stop empty. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger is F004 amend (no longer session-end-only); do not re-specify it here.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | keep | First F006 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: Add `task` to YAML mapping
Add `task` after `agent_type` on subagent start. Skip empty source keys so Copilot/Claude never pick `task` from another payload field. Keep agent-stop header-only. Keep the four-field header and omit-absent / present-`null` rules. Do not strip `task` or `transcript_path` from the payload used for JSONL.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
    - `docs/normalized-fields.md`
- [x] Append a `MappedField` `{ name: "task", cursor: "task", copilot: "", "claude-code": "" }` to `subagentStartFields` immediately after `agent_type`. Keep `stop` / `agentStop` / `Stop` on `emptyFields`. Do not add a new emitter API (AC-F006.3, AC-F006.5)
- [x] In `bodyLines`, skip the field when `sourceKey` is empty (`sourceKey.length === 0`) **before** `sourceKey in payload`, so Copilot and Claude Code never map `task` from any other payload key (AC-F006.6)
- [x] Mapping table after the add (source key per harness; body name is the normalized field). Session start and agent stop bodies stay empty. Copilot and Claude Code `task` columns are empty (explicit exception)

| kind | `source_event` aliases | body field | cursor | copilot | claude-code |
|------|------------------------|------------|--------|---------|-------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none)* | | | |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` | `reason` | `reason` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type` | `subagent_type` | `agentName` | `agent_type` |
| | | `task` | `task` | *(none)* | *(none)* |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type` | `subagent_type` | `agentType` | `agent_type` |
| | | `response_text` | `summary` | `response` | `last_assistant_message` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` | `prompt` | `prompt` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none)* | | | |

- [x] `docs/normalized-fields.md`: add `task` to section 3 (Inicio de subagente) after `agent_type` — Cursor `task`, Copilot and Claude Code columns empty. Amend the intro so the exception is visible: keep the three-harness rule, then state that `task` on subagent start is an explicit exception (Copilot and Claude Code have no source key; ingest must not map `task` from any other payload field on those harnesses) (AC-F006.4)
- [x] Keep the existing Cursor `subagentStart` exact-string test as **absent `task` → `agent_type` only** (payload still has `transcript_path`; YAML has no `task:` and no `transcript_path`) (AC-F006.5)
- [x] Add Cursor `subagentStart` exact-string test: payload `{ subagent_type: "explore", task: "do the thing", transcript_path: "/tmp/t" }` → body `agent_type: explore` then `task: do the thing`; no `transcript_path`; no body `session_id` (AC-F006.5)
- [x] Add Cursor `subagentStart` `task: null` → YAML `null` after `agent_type` (AC-F006.5)
- [x] Add Copilot `subagentStart` exact-string test: payload `{ agentName: "explore", task: "do the thing", prompt: "hello" }` → body `agent_type: explore` only; YAML must **not** contain `task:` (AC-F006.6)
- [x] Add Claude Code `SubagentStart` exact-string test: payload `{ agent_type: "explore", task: "do the thing" }` → body `agent_type: explore` only; YAML must **not** contain `task:` (AC-F006.6)
- [x] Keep Cursor `stop` header-only even when payload has `transcript_path`; body has no `session_id` and no `task`. Optionally lock Copilot `agentStop` and Claude `Stop` as header-only the same way (AC-F006.3)
- [x] Keep the “absent body key omitted / present null” and “body has no `session_id` / keys stay flat” tests; those fixtures may still omit `task` — assert `task` is absent when the Cursor key is absent (AC-F006.5)

---

### Step 2: Add `task` to report Details
F004 Details follow `docs/normalized-fields.md`. After Step 1, `yamlDoc` helpers emit `task` when Cursor sends it, so Details must list it. Touch `report.ts` **only** to add `task` to Details. Do not change `triggeringHarness`, duration, overview, or any report-gate helper.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [x] `detailsByEvent`: subagent start → `["agent_type", "task"]` (both `subagentStart` and `SubagentStart`). Leave agent stop `[]`. Do not list `transcript_path`. Do not edit `triggeringHarness` or `maybeWriteReport` (AC-F006.5)
- [x] Update Details unit tests: sessionStart empty; sessionEnd `reason`; subagentStart `agent_type: explore; task: do the thing` when both present; subagentStart `agent_type: explore` when `task` absent; subagentStop `agent_type: explore; response_text: done`; prompt `prompt: hello`; agent stop empty (`| 15:00:00 | stop |  |`); header-only / unrecognized empty; absent omitted; present `null` still appears
- [x] Assert Details omit `transcript_path` even when a fixture YAML document still contains that body key (locks `detailsByEvent`, independent of the emitter) (F005 remains in force)
- [x] Assert Details include `task` when a fixture YAML document has `task` after `agent_type`; omit `task` when that body key is absent
- [x] Keep locked Overview/Event-counts Markdown shape, duration, truncation, `|` cell escape, consecutive subagent rows, Claude `SessionEnd` vs Copilot `sessionEnd`. Consecutive-row fixtures may still pass `transcript_path` into `yamlDoc`; do not require it in Details. Do not change duration or overview `source_harness` assertions (F004 sibling)

---

### Step 3: Register the sixth Cursor event
Add `stop` in the same command shape as the five existing events. Do not add `.cmd` wrappers. Do not register other extra Cursor events. Do not register Copilot or Claude.
- Paths:
    - `.cursor/hooks.json`
    - `cli/test/hooks.test.ts`
- [x] `.cursor/hooks.json`: `"version": 1`; hooks keys `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, `stop` (keep the five; add the sixth). Each `command` is `node .agents/hooks/index.mjs ingest cursor {event}`. Do not set `failClosed` (AC-F006.1)
- [x] `hooks.test.ts`: `events` array becomes those six names. Assert `Object.keys(config.hooks)` equals that list. Per-event command still `node .agents/hooks/index.mjs ingest cursor ${event}`. Still assert no `.cursor/hooks/{event}.cmd` and no shared `ingest.cmd`. Rename the “five events” test title to six (AC-F006.1)
- [x] Do not add `.claude/settings.json` or `.github/hooks/` ingest config. Do not subscribe tool-use, Tab, `workspaceOpen`, or any other Cursor event beyond these six

---

### Step 4: ingestHook coverage for stop persist and `task`
Stop YAML already works at the emitter. Cover AC-F006.2 / AC-F006.3 / AC-F006.5 / AC-F006.6 / AC-F006.7 through `ingestHook` (same persist path Cursor will invoke). Observe-only `exitCode` / stdout remain e2e. Do not change `maybeWriteReport` or `triggeringHarness`.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/event.ts`
    - `.agents/hooks/index.mjs`
- [x] Keep `parseArgv`, `index.ts` (shebang, `readFileSync(0)`, `ingestHook({ … harness, event })`, `finally { process.exitCode = 0 }`), `sessionIdentifier`, `eventLogLine`, `persistIngest`, and the shipped session-end report gate as shipped. Do not add a stop command. Entry spawn/`exitCode` remains e2e (AC-F006.7)
- [x] Do not change Event log serialization to strip `task` or `transcript_path`. Do not use `stop` or the `task` field to skip, filter, or transform the JSONL line (AC-F006.2)
- [x] Unit-test `ingestHook`: `harness: "cursor"`, `event: "stop"`, payload `{ session_id: "sess-1" }` (and optionally `transcript_path`) writes verbatim jsonl (deep-equals payload), appends `sess-1` to the index, and appends one YAML document with header `session_id` / `source_harness: cursor` / `source_event: stop` / `timestamp` then **no body fields**; no `transcript_path`; no body `session_id` (AC-F006.2, AC-F006.3)
- [x] Unit-test `ingestHook`: `event: "stop"` with only Copilot `sessionId` (no F001 identifier) writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` (AC-F006.2)
- [x] Unit-test `ingestHook`: `event: "subagentStart"`, `harness: "cursor"`, payload `{ session_id: "sess-1", subagent_type: "explore", task: "do the thing" }` writes jsonl that still has `task`, and YAML with `agent_type` then `task: do the thing` (AC-F006.5)
- [x] Unit-test `ingestHook`: `harness: "copilot"` / `"claude-code"`, subagent-start event, payload that includes `task` (and the harness `agent_type` source key) writes YAML **without** `task:` (AC-F006.6)
- [x] Keep the existing `subagentStart` / `subagentStop` / `stop` fixture that keeps `transcript_path` on jsonl not yaml and locks `stop` YAML as header-only (AC-F006.3)
- [x] Unit-test `ingestHook` still resolves (does not throw) for `stop` and for Cursor/Copilot/Claude subagent-start payloads that include or omit `task` (AC-F006.7)
- [x] Keep existing F001/F003/F004/F005 ingest assertions (verbatim jsonl, yaml append, session-end `.md` gate, prompt persist). Do not rewrite the report gate
- [x] `cd cli && bun run build` after `cli/src/` changes so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 5: Amend architecture for the sixth event
`cli.arch.md` and `system.arch.md` still name five Cursor events. `normalized-fields.md` is amended in Step 1 for `task` and the intro exception. Amend architecture in the `/codify` run (not this planify run). Do **not** rewrite the session-end report gate (F004 sibling).
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
    - `docs/normalized-fields.md`
- [x] `cli.arch.md` **Used by**: Cursor invokes ingest on `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`, each with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Keep the shell-string / no-`.cmd` sentence
- [x] `system.arch.md` overview: those six events and the same command shape. Do not drop `beforeSubmitPrompt`. Do not add Copilot/Claude registrations
- [x] Confirm `docs/normalized-fields.md` section 3 has `task` (Cursor `task`; Copilot and Claude Code empty) and the intro names the exception. Sections 4–6 still have no `transcript_path`. Do not reopen F003/F004 specs
- [x] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other extra Cursor events. Do not change ingest report-gate wording in architecture (F004 sibling)

---

### Step 6: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F006.7)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [x] Unit tests cover AC-F006.1–7 at lib (hooks.json + yaml/report emitters + ingestHook persist) except entry argv/`exitCode`/stdout spawn, which is e2e

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Architecture: `cli.arch.md` and `system.arch.md` are stale (five Cursor events; session-end report gate). This planify run does not amend those files; `/codify` Step 5 adds `stop` to the event lists only. F004 sibling owns report-gate architecture wording.
- `docs/normalized-fields.md` still omits `task` and the intro exception. This planify commit does **not** include that amend; `/codify` Step 1 does.
- `.cursor/hooks.json` does not yet list `stop`. This planify commit does **not** include it; `/codify` Step 3 does.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `emitSessionReport` / `ingestHook` / `hooks.json` by importing `cli/src` (and reading the JSON file).
- Agent-stop YAML mapping already exists (header only after F005). This spec registers the event and adds `task`. Do not rewrite the emitter beyond `subagentStartFields` + empty-`sourceKey` skip.
- `task` and `transcript_path` stay on the Event log line (F001 verbatim). Do not overlay, redact, or omit them from JSONL.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not change `maybeWriteReport`, `triggeringHarness`, duration, or overview `source_harness` (F004 amend / sibling planify).
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- `/codify`: YAML exact-string for `task: "do the thing"` is quoted. F003 `needsQuote` quotes strings with spaces; the plan’s unquoted `task: do the thing` is the logical body field, not the scalar form. Report Details stay unquoted (`task: do the thing`).

---

> last updated: 2026-09-01T12:14:00Z
