---
spec-kind: functional
container: cli
---
# F006-agent-stop-task - cli

## Specification

Register Cursor `stop` in `.cursor/hooks.json` with the same shell-string command shape as the five existing events. On `ingest cursor stop`, persist as F001 (verbatim Event log, Session index) and F003 (Session YAML log when a session identifier exists). Agent-stop YAML is the F003 compact header (`harness` / `event`; `session_id` only on the initial session-start; integer `turn`) then no table-driven body (F005 already dropped `transcript_path`; F009 may still emit `subagent` when a matching payload attribute is present). Add `task` after `subagent` on subagent-start YAML (Cursor source key `task`; Copilot and Claude Code have no source key). F004 Details for subagent start stay `task` only (identity is the Subagent cell, F009). Remain observe-only. This spec does not replace F001–F005 or F007–F009. This amend does not revert F007 `agent_display_name` or F009 `subagent`. Do not implement F008 numbering. Do not change when a Session report is written, overview `harness`, or duration (F004 as shipped). F004 groups the report by turn; F006 does not change report structure.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this amend**. Already names six Cursor events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, `stop`) and the same `node .agents/hooks/index.mjs ingest cursor {event}` command shape. Compact YAML header (`harness` / `event`; `session_id` only on the initial sessionStart). New documents may include `subagent` after the compact header on any event kind when a matching payload attribute is present. [`system.arch.md`](../../arch/system.arch.md) overview already lists those six events and `subagent`. [`docs/normalized-fields.md`](../../normalized-fields.md) already has `subagent` then `task` on subagent start (Cursor `task`; Copilot and Claude Code empty) plus the intro exception, and F007 `agent_display_name`. Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F006 shipped 0.10.0; F003 compact header; F008 numbering 0.14.0; F009 `subagent` 0.17.0; this is the F009-amend replan of AC-F006.5 only):

- `cli/src/yaml.ts`: `emitYamlDocument` already emits compact header then `subagentLines` then `bodyLines`. `stop` / `agentStop` / `Stop` already `emptyFields`. `subagentStartFields` is `agent_display_name` (F007) then `task` (Cursor `task`; Copilot/Claude empty `""`). Identity is F009 `subagent` (not a table-driven `agent_type` row). `bodyLines` already skips empty `sourceKey`. **Do not change product code.** Do not revert F007 or F009
- `cli/src/ingest.ts`: F008 numbering already shipped. This container must not recount prompt-kind documents
- `cli/src/report.ts`: `detailsByEvent` subagent start is `["task"]` only (F009 / F004). Agent stop Details already `[]`. Subagent cell is the bare `subagent` value. Report already groups by turn (F004). **F006 does not change report structure.** Do not change `maybeWriteReport`, duration, or overview
- `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F003 YAML append, F004 report-after-every-YAML-append. Keep them
- `.cursor/hooks.json`: six events including `stop`. **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/hooks.test.ts`: already asserts those six events and the shell-string commands
- `cli/test/yaml.test.ts` and `cli/test/ingest.test.ts`: Cursor / Copilot / Claude agent-stop exact-string fixtures already cite `AC-F006.8` and use compact `harness` / `event` / `timestamp` / `turn` then no table-driven body. Cursor subagent-start exact strings already emit `subagent` then `task`. **Redo is AC-F006.5 titles/wording only:** `after subagent` not `after agent_type`; titles still `AC-F006.5`. Do not change expected YAML strings. Do not restore `agent_type` as a YAML key
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` change, so no rebuild unless a later step edits source. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only / compact-header rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude subagent start and agent-stop still applies if those events are received via ingest
- Do not implement F008 numbering. Do not revert F007 `agent_display_name`. Do not revert F009 `subagent`. Do not change `.cursor/hooks.json`

Unit tests cover AC-F006.1, .2, .4, .5, .6, .7, .8 at lib except entry spawn/`exitCode`/stdout (those are e2e). Not AC-F006.3 (deprecated). Unchecked this amend: **AC-F006.5** only (`task` after `subagent`).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003), each with integer `turn` (F008); a **Session report** is the Markdown file derived from that YAML (F004), grouped by `turn`. New documents use compact headers: `harness` / `event`; `session_id` only on the initial session-start. After the header, `subagent` may appear on any event kind when a matching payload attribute is present (F009).

This spec does not add persisted entities. It adds a sixth Cursor invocation that writes the same ingest artifacts, and it extends the subagent-start YAML body (and thus F004 Details) with `task` after `subagent`. Agent-stop table-driven body is empty (compact header only, plus `subagent` when present). This amend aligns AC-F006.5 wording with F009 (`task` after `subagent`, not `agent_type`). Do not persist `turn` or `subagent` on the Event log line.

### Shared store wording

> Copy this block verbatim into the F006 e2e plan. Event log, Session index, project root, and day folder stay as F001. Session YAML log uses F003 compact headers (`harness` / `event`; `session_id` only on the initial session-start). After the header, `subagent` may appear on any document when a matching payload attribute is present (F009). Agent-stop table-driven body is empty. `task` is Cursor-only on subagent start, after `subagent`. Cursor registration is six events. Report groups by turn (F004); F006 does not change report structure. F004 Details for subagent start are `task` only (identity is the Subagent cell).

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values, whether they contain `session_id`, or old `agent_type` keys. Do not migrate old `source_harness` / `source_event` / `agent_type` keys.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML). Determining `turn` (F008) and whether this is the initial session-start (F003) may read that session’s existing YAML.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent. Do not copy `subagent` onto later documents that omit a matching source attribute.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (F008; not a body field). This spec requires the field, its order, and that it is a YAML integer. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extraction is F009: first present of `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; do **not** select the source key from the F002 `harness` positional. This spec does not duplicate those ACs. Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit YAML `null`. New documents write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `task` from any other payload field on those harnesses. Omit `task` when the source key is absent. When Cursor sends `task`, it appears **after `subagent`** (and after `agent_display_name` when that field is also present).
- Subagent stop remaining body is `agent_display_name`, then `response_text`.
- Do **not** include `transcript_path` in any YAML document (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear). Do not duplicate `session_id` in the body.
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document is header-only **except** `subagent` may still appear when a matching source attribute is present.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (F004 as shipped). Overwrite on a later YAML append for the same session the same day. YAML-only source. Trigger, per-turn subsections, and duration stay F004; F006 does **not** change report structure. Do not re-specify grouping here.
- Subagent cell is the bare `subagent` value when that field is present (F009 / F004). Details follow `docs/normalized-fields.md` excluding identity: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. This F006 amend does **not** change `.cursor/hooks.json`.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Add `task` to YAML mapping | keep | already shipped after F009 (`task` after `subagent`, not `agent_type`; empty `sourceKey` skip). Do not revert F007 `agent_display_name` or F009 `subagent` |
| Add `task` to report Details | keep | already shipped as `task` only (identity is the Subagent cell). F004 groups by turn; F006 does not change report structure |
| Register the sixth Cursor event | keep | `stop` already in `.cursor/hooks.json`; six events. Do not change hooks.json |
| ingestHook coverage for stop persist and `task` | keep | persist, `task`, omit-`task`, observe-only already covered; stop YAML already compact header + empty table-driven body |
| Agent-stop header tests (four-field / AC-F006.3) | keep | already AC-F006.8; compact `harness` / `event` / `timestamp` / `turn`; empty body. Do not restore `source_harness` / `source_event`. Nested “five keys including `session_id` on every stop” is stale |
| Amend architecture for the sixth event | keep | `cli.arch.md` / `system.arch.md` already list six events including `stop`, compact header, and `subagent`. `/codify` does not amend those files |
| Test runner and AC sweep | keep | coverage is AC-F006.1, .2, .4, .5, .6, .7, .8 (not .3). Nested AC-F006.5 “after `agent_type`” titles are stale (superseded by Step 2) |

## Implementation Steps

### Step 1: Agent-stop YAML header tests cite AC-F006.8 (compact header then empty body)
Keep. No product code. Compact header already shipped. Cursor / Copilot / Claude agent-stop exact-string fixtures already cite `AC-F006.8` and emit `harness`, `event`, `timestamp`, `turn: 0` then no table-driven body. Do not restore `source_harness` / `source_event` or a per-document `session_id` on `stop`. Do not implement F008 numbering.
- Paths:
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
- [x] Keep the agent-stop exact-string tests titled with `AC-F006.8`. Do **not** leave an AC-F006.3 title. Current titles: `AC-F006.8 Cursor stop is header-only even when payload has transcript_path`; `AC-F006.8 Copilot agentStop is header-only even when payload has task`; `AC-F006.8 Claude Stop is header-only even when payload has task`; `AC-F006.8 cursor stop with session id writes jsonl index and header-only yaml`; `AC-F006.8 subagentStart subagentStop and stop keep transcript_path on jsonl not yaml` (AC-F006.8)
- [x] Keep the existing exact-string expected documents. They already start with `harness`, `event`, `timestamp`, `turn: 0`, then no table-driven body (no `transcript_path`; no body `session_id`). Do not change those strings. Do not require incrementing, prompt-kind counting, or turn 1 (AC-F006.8)
- [x] Do not edit `cli/src/**` for this step. Do not change `.cursor/hooks.json`. Do not revert F007 or F009. Do not implement F008 numbering

---

### Step 2: Confirm `task` after `subagent` (AC-F006.5)
Redo. No product code. F009 0.17.0 already splices `subagentLines` after the compact header and before table-driven `bodyLines`; `subagentStartFields` already has `task` after `agent_display_name`. `/codify` confirms that emit order and retitles the Cursor subagent-start unit tests so each title includes `AC-F006.5` and says `after subagent` (not `after agent_type`). Do not change expected YAML strings. Do not restore `agent_type` as a YAML key.
- Paths:
    - `cli/src/yaml.ts` (read-only confirm)
    - `cli/src/report.ts` (read-only confirm)
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
- [ ] Confirm `emitYamlDocument` is `headerLines` then `subagentLines(input.payload)` then `bodyLines`. Confirm `subagentStartFields` is `agent_display_name` then `task` (Cursor `task`; Copilot/Claude empty). Confirm `detailsByEvent` subagent start is `["task"]` only. Do not edit these helpers unless a new test proves a bug (AC-F006.5)
- [ ] Retitle the Cursor present-`task` emitter and ingest tests so each title includes `AC-F006.5` and `after subagent` (not `after agent_type`). Current titles (no AC-F006.5 today): `Cursor subagentStart body is subagent then task`; `cursor subagentStart keeps task on jsonl and yaml after subagent`. Keep the existing exact strings (`subagent: explore` then `task: "do the thing"`) (AC-F006.5)
- [ ] Retitle the Cursor absent-`task` emitter test so the title includes `AC-F006.5` (omit when absent). Current title: `Cursor subagentStart body is subagent only`. Keep the existing exact string (`subagent: explore`, no `task:`) (AC-F006.5)
- [ ] Keep `Cursor subagentStart task null emits null after subagent` (present key, YAML `null`). Optionally prefix `AC-F006.5`. Do not change that exact string
- [ ] Keep Copilot/Claude omit-`task` tests as shipped (AC-F006.6). Do not revert F007 `agent_display_name` fixtures. Do not revert F009 `subagent`
- [ ] Do not edit `cli/src/**`. Do not change `.cursor/hooks.json`. Skip `bun run build` unless a production `cli/src/` file actually changes (it must not)

---

### Step 3: Test runner and AC sweep
Keep. No product code unless Step 2 somehow forces it (it must not). Cover AC-F006.5 as `after subagent`. Cover AC-F006.8, not .3.
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F006.7)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. No `bun run build` unless `cli/src/` changed (it must not)
- [x] Unit tests cover AC-F006.1, .2, .4, .5, .6, .7, .8 at lib (hooks.json + yaml/report emitters + ingestHook persist) except entry argv/`exitCode`/stdout spawn, which is e2e. Do **not** keep tests whose pass condition is AC-F006.3 (four-field header) or YAML key `agent_type` as identity
- [x] Leave `hooks.test.ts` asserting the current six shell-string commands (F006 does not add or remove hooks on this amend)

---

### Deviations

- Spec status is set to `planned` after the sibling e2e planify run in this same agent also has a plan.
- Architecture (`cli.arch.md`, `system.arch.md`) is current: six Cursor events including `stop`; compact header; `subagent` after the header. This planify run does not amend those files; `/codify` has no architecture step.
- Product code is **not** needed. F009 already emits `subagent` then `task`. Remaining work is AC-F006.5 test titles/wording (`after subagent` not `after agent_type`). `/codify` confirms tests still titled `AC-F006.5`.
- Spec AC-F006.8 still names the pre-compact five-field header (`session_id`, `source_harness`, `source_event`, `timestamp`, `turn`). Product and AC-F006.8 tests already use compact `harness` / `event`. This amend does **not** reopen AC-F006.8 and must **not** restore `source_harness` / `source_event`.
- Do not change `.cursor/hooks.json` (six events including `stop`).
- Do not revert F007 `agent_display_name`.
- Do not revert F009 `subagent`. Do not restore YAML key `agent_type`.
- Do not implement F008 numbering. Ingest may keep writing the shipped count; unit exact-strings may keep `turn: 0`; they must not require incrementing or turn 1.
- F004 already writes `{session_id}.md` after every YAML append, including `stop`, and groups by turn. Details for subagent start are `task` only. F006 does not change report structure.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `emitSessionReport` / `ingestHook` / `hooks.json` by importing `cli/src` (and reading the JSON file).
- `task` and `transcript_path` stay on the Event log line (F001 verbatim). Do not overlay, redact, or omit them from JSONL.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Did not git commit (parent instruction: do not commit). Did not run tests (parent instruction).
- `/codify` (cli): confirm no `cli/src/**` change; retitle AC-F006.5 unit tests (`after subagent`); spec status `in-progress`. Do not commit unless the parent asks.

---

> last updated: 2026-09-02T10:49:00Z
