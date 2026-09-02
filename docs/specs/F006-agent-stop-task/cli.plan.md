---
spec-kind: functional
container: cli
---
# F006-agent-stop-task - cli

## Specification

Register Cursor `stop` in `.cursor/hooks.json` with the same shell-string command shape as the five existing events. On `ingest cursor stop`, persist as F001 (verbatim Event log, Session index) and F010/F003 (Session JSONL log when a session identifier exists). Agent-stop JSON objects use the F003 compact header (`harness` / `event`; `session_id` only on the initial session-start; JSON-number `turn`) then no table-driven body (F005 already dropped `transcript_path`; F009 may still emit `subagent` when a matching payload attribute is present). Add `task` after `subagent` on subagent-start JSON objects (Cursor source key `task`; Copilot and Claude Code have no source key). F004 Details for subagent start stay `task` only (identity is the Subagent cell, F009). Remain observe-only. This spec does not replace F001–F005 or F007–F010. This amend (C001 / F010) is **wording only**: Session YAML log / YAML document → Session JSONL log / JSON object. Stop ingest, `stop` registration, and `task` mapping stay. Do not revert F007 `agent_display_name` or F009 `subagent`. Do not implement F008 numbering. Do not change when a Session report is written, overview `harness`, or duration (F004 as shipped). F004 groups the report by turn; F006 does not change report structure. Do not change mapping or `.cursor/hooks.json` unless a test proves a bug.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this amend**. Already names Session JSONL log `{session_id}.jsonl`, six Cursor events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, `stop`) and the same `node .agents/hooks/index.mjs ingest cursor {event}` command shape. Compact header is `harness` / `event`; `session_id` only on the initial session-start. New objects may include `subagent` after the compact header on any event kind when a matching payload attribute is present. [`system.arch.md`](../../arch/system.arch.md) overview already lists those six events and `subagent`. [`docs/normalized-fields.md`](../../normalized-fields.md) already has `subagent` then `task` on subagent start (Cursor `task`; Copilot and Claude Code empty) plus the intro exception, and F007 `agent_display_name`. Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F006 shipped 0.10.0; F003 compact header; F010 production already writes Session JSONL; F008 numbering; F009 `subagent`; this is the C001 / F010 wording amend):

- `cli/src/yaml.ts`: `emitSessionRecord` already emits compact JSON objects then body, including JSON-number `turn`. `stop` / `agentStop` / `Stop` already `emptyFields`. `subagentStartFields` is `agent_display_name` (F007) then `task` (Cursor `task`; Copilot/Claude empty `""`). Identity is F009 `subagent` (not a table-driven `agent_type` row). **Do not change product code.** Do not revert F007 or F009. Do not change mapping unless a test proves a bug
- `cli/src/ingest.ts` / `cli/src/store.ts`: already persist `{session_id}.jsonl` (F010) and write `{session_id}.md` after that append (F004). Keep them. Numbering is F008 — this container must not count prompt-kind records
- `cli/src/report.ts`: `detailsByEvent` subagent start is `["task"]` only (F009 / F004). Agent stop Details already `[]`. Subagent cell is the bare `subagent` value. Report already groups by turn (F004). **F006 does not change report structure.** Do not change `maybeWriteReport`, duration, or overview
- `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F010 JSONL append, F004 report-after-every-JSONL-append. Keep them
- `.cursor/hooks.json`: six events including `stop`. **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/hooks.test.ts`: already asserts those six events and the shell-string commands (AC-F006.1)
- `cli/test/yaml.test.ts`: Cursor / Copilot / Claude agent-stop exact-string fixtures already cite `AC-F006.8` and **are** JSONL compact-header lines (`harness`, `event`, `timestamp`, `turn` then no table-driven body). Cursor subagent-start exact strings already cite `AC-F006.5` and emit `subagent` then `task`. **Keep those strings.** Do not restore `session_id` / `source_harness` / `source_event` on stop objects. Do not restore `agent_type` as a JSON key
- `cli/test/ingest.test.ts`: leftover F006 titles still say yaml while they already `readFile(jsonlPath)`. Bindings named `yaml` already hold JSONL text. YAML-colon leftover: `includes("task:")`. Copilot `sessionId` still asserts `.yaml` files absent. Redo those F006 titles/bindings/asserts onto Session JSONL / JSON objects. Do **not** retitle AC-F005 / F003 / F007 / F008 / F010 tests
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` change, so no rebuild unless a later step edits source. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, Session JSONL log append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not register Copilot or Claude. JSONL mapping for Copilot/Claude subagent start and agent-stop still applies if those events are received via ingest
- Do not implement F008 numbering. Do not revert F007 `agent_display_name`. Do not revert F009 `subagent`. Do not change F010 format/filename/serialization. Do not change `.cursor/hooks.json`

Unit tests cover AC-F006.1, .2, .4, .5, .6, .7, .8 at lib except entry spawn/`exitCode`/stdout (those are e2e). Not AC-F006.3 (deprecated). Unchecked this amend (spec text now says Session JSONL log / JSON object): **AC-F006.2**, **AC-F006.5**, **AC-F006.6**, **AC-F006.7**, **AC-F006.8**. Checked keep (no YAML in spec AC text): **AC-F006.1**, **AC-F006.4**.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010; mapped by F003), each with integer `turn` (F008); a **Session report** is the Markdown file derived from that JSONL (F004).

This spec does not add persisted entities. It adds a sixth Cursor invocation that writes the same ingest artifacts, and it extends the subagent-start JSON object body (and thus F004 Details) with `task` after `subagent`. Agent-stop table-driven body is empty (compact header only, plus `subagent` when present). This amend aligns wording with Session JSONL log / JSON object. Do not persist `turn` or `subagent` on the Event log line.

### Shared store wording

> Copy this block verbatim into the F006 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped. Agent-stop body is empty. `task` is Cursor-only on subagent start, after `subagent`. Cursor registration is six events including `stop`. F004 Details for subagent start are `task` only (identity is the Subagent cell). Session JSONL / Details omit `transcript_path`.

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
- Persist every received JSON object regardless of event kind (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.
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
- One JSON object per line. Append-only. Format, filename, and serialization stay F010.
- Do not write `{session_id}.yaml`. Do not read/migrate/rewrite existing `.yaml`. Do not mix YAML and JSONL in one session.
- Do not merge into `events.jsonl`.
- When the payload has a session identifier: append exactly one JSON object as one new line in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; do not re-read the line just appended to *produce* it). Under `ingest.lock`, read that session’s **existing** Session JSONL log (missing file → empty) to compute `turn` and initial session-start. Do not read the Event log or Session index to determine those values. Do not read `.yaml`.
- When the payload has no session identifier: do not create or append a Session JSONL log.
- Every object is an independent sequential event. Do not nest a subagent event under a parent. Do not copy `subagent` onto later objects that omit a matching source attribute.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008 shipped; not a body field). This spec requires the field and that it is a JSON number. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extraction is F009: first present of `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; do **not** select the source key from the F002 `harness` positional. This spec does not duplicate those ACs. Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit JSON `null`. New objects write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `task` from any other payload field on those harnesses. Omit `task` when the source key is absent. When Cursor sends `task`, it appears **after `subagent`** (and after `agent_display_name` when that field is also present). When the source key is present and the value is `null`, emit JSON `null`.
- Subagent stop remaining body is `agent_display_name`, then `response_text`.
- Do **not** include `transcript_path` in any Session JSONL record (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear). Do not duplicate `session_id` in the body.
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (F004 as shipped). Overwrite on a later Session JSONL append for the same session the same day. JSONL-only source. Trigger, per-turn subsections, and duration stay F004; F006 does **not** change report structure. Do not re-specify grouping here.
- Subagent cell is the bare `subagent` value when that field is present (F009 / F004). Details follow `docs/normalized-fields.md` excluding identity: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. This F006 amend does **not** change `.cursor/hooks.json` unless a test proves a bug.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Add `task` to YAML mapping | keep | already shipped on Session JSONL objects after F009 (`task` after `subagent`, not `agent_type`; empty `sourceKey` skip). Do not revert F007 `agent_display_name` or F009 `subagent`. Do not change mapping unless a test proves a bug |
| Add `task` to report Details | keep | already shipped as `task` only (identity is the Subagent cell). F004 groups by turn; F006 does not change report structure |
| Register the sixth Cursor event | keep | `stop` already in `.cursor/hooks.json`; six events. Do not change hooks.json (AC-F006.1) |
| ingestHook coverage for stop persist and `task` | redo | persist, `task`, omit-`task`, observe-only already work on Session JSONL. Leftover F006 ingest titles/bindings still say yaml / `{session_id}.yaml`. F004 already writes `.md` after stop ingest — do not restore “no `.md`” |
| Agent-stop header tests (four-field / AC-F006.3) | redo | `yaml.test.ts` AC-F006.8 exact strings already JSONL compact header. Ingest AC-F006.8 titles still say yaml. Compact header is `harness` / `event` / `timestamp` / `turn`; `session_id` only on the initial session-start. No product code |
| Confirm `task` after `subagent` (AC-F006.5) | redo | `yaml.test.ts` AC-F006.5 titles already `after subagent` and JSONL exact strings. Ingest AC-F006.5 title still says yaml. No product code |
| Amend architecture for the sixth event | keep | `cli.arch.md` / `system.arch.md` already list six events including `stop`, compact header, `subagent`, and Session JSONL log. `/codify` does not amend those files |
| Test runner and AC sweep | redo | coverage is AC-F006.1, .2, .4, .5, .6, .7, .8 (not .3). Retitle leftover yaml in F006 tests only |

Deprecated ACs stay drop (not a prior implementation step): AC-F006.3.

## Implementation Steps

### Step 1: Retarget F006 unit tests onto Session JSONL / JSON objects
No product code. `emitSessionRecord` already emits compact JSON objects, maps Cursor `task` after `subagent`, omits `task` for Copilot/Claude, and emits agent-stop as header-only. Cursor / Copilot / Claude exact-string fixtures in `cli/test/yaml.test.ts` already are JSONL lines. Redo leftover F006 ingest titles, bindings named `yaml`, and YAML-colon asserts. Do not change expected JSONL strings. Do not implement F008 numbering. Do not change mapping or `.cursor/hooks.json`.
- Paths:
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
    - `cli/src/yaml.ts` (read-only confirm)
- [x] Keep `yaml.test.ts` AC-F006.8 exact-string tests (`Cursor stop is header-only even when payload has transcript_path`; `Copilot agentStop is header-only even when payload has task`; `Claude Stop is header-only even when payload has task`). They already start with `harness`, `event`, `timestamp`, `turn` then no table-driven body (no `transcript_path`; no body `session_id`). Do not change those strings. Do not require incrementing, prompt-kind counting, or turn 1 in the emitter (it passes `turn: 0`). Do **not** leave an AC-F006.3 title (AC-F006.8)
- [x] Keep `yaml.test.ts` AC-F006.5 exact-string tests (`Cursor subagentStart body is subagent only`; `Cursor subagentStart body is task after subagent`; `Cursor subagentStart task null emits null after subagent`). They already emit `subagent` then `task` when present. Do not change those strings. Do not restore `agent_type` as a JSON key (AC-F006.5)
- [x] Prefix `yaml.test.ts` Copilot / Claude omit-`task` titles with **AC-F006.6** (`Copilot subagentStart omits task even when payload has task`; `Claude SubagentStart omits task even when payload has task`). Keep the existing exact strings (AC-F006.6)
- [x] Retitle ingest `AC-F006.8 cursor stop with session id writes jsonl index and header-only yaml` onto Event log, Session index, Session JSONL, and header-only JSON object. Include **AC-F006.2** and **AC-F006.8** in that title. Rename binding `yaml` → `jsonl`. Keep the existing exact-string (compact header; `turn`: 0; no `session_id`; no `transcript_path`). Do not restore `{session_id}.yaml` (AC-F006.2, AC-F006.8)
- [x] Retitle ingest `AC-F006.8 subagentStart subagentStop and stop keep transcript_path on jsonl not yaml` onto Event log not Session JSONL. Rename binding `yaml` → `jsonl`. Keep omit-transcript asserts (`transcript_path` on payload, absent from Session JSONL text, present on Event log) (AC-F006.8)
- [x] Retitle ingest `stop with only Copilot sessionId writes jsonl and no yaml` onto Event log and no Session JSONL or md (**AC-F006.2**). Assert no session `*.jsonl` besides `events.jsonl` (not `.yaml` files). Copilot `sessionId` only still writes no Session JSONL and no `.md` (AC-F006.2)
- [x] Retitle ingest `AC-F006.5 cursor subagentStart keeps task on jsonl and yaml after subagent` onto Session JSONL after subagent. Rename binding `yaml` → `jsonl`. Keep the existing exact-string (`subagent` then `task`) (AC-F006.5)
- [x] Retitle ingest `copilot and claude-code subagentStart omit task from yaml` with **AC-F006.6**. Rename bindings `copilotYaml` / `claudeYaml` → `copilotJsonl` / `claudeJsonl`. Replace YAML-colon `includes("task:")` with `"task" in` the parsed record (AC-F006.6)
- [x] Keep ingest persist for `stop` (verbatim Event log, Session index, Session JSONL when a session identifier exists). F004 already writes `.md` after that JSONL append — do **not** restore a “no `.md`” assert (AC-F006.2)
- [x] Keep hooks.json six-event tests as shipped (AC-F006.1). Mapping-table `task` exception stays e2e (AC-F006.4)
- [x] Do not edit `cli/src/**`. Do not change `.cursor/hooks.json`. Do not revert F007 `agent_display_name` or F009 `subagent`. Do not retitle F003 / F005 / F007 / F008 / F010 tests

---

### Step 2: Test runner and AC sweep
No product code unless Step 1 somehow forces it (it must not). Cover AC-F006.8, not .3. Cover AC-F006.5 as `after subagent`.
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library (AC-F006.7)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. No `bun run build` unless `cli/src/` changed (it must not)
- [x] Unit tests cover AC-F006.1, .2, .4, .5, .6, .7, .8 at lib (hooks.json + emitter + ingestHook persist) except entry argv/`exitCode`/stdout spawn, which is e2e. Do **not** keep tests whose pass condition is AC-F006.3 (four-field YAML header) or YAML key `agent_type` as identity
- [x] Leave `hooks.test.ts` asserting the current six shell-string commands (F006 does not add or remove hooks on this amend) (AC-F006.1)

---

### Deviations

- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`) is current: six Cursor events including `stop`; compact header; `subagent` after the header; Session JSONL log. This planify run does not amend those files; `/codify` has no architecture step.
- Product code is **not** needed. Production already writes Session JSONL (F010), registers `stop`, and emits `subagent` then `task`. Remaining work is F006 test titles/bindings/asserts off YAML document / `{session_id}.yaml`.
- Do not change `.cursor/hooks.json` (six events including `stop`). Do not change mapping unless a test proves a bug.
- Do not revert F007 `agent_display_name` or F009 `subagent`. Do not restore `agent_type` as a JSON key.
- Do not implement F008 numbering. Emitter exact-strings may keep `turn: 0`; ingest first-stop exact-strings may keep `"turn":0`. They must not require a new numbering formula.
- F004 already writes `{session_id}.md` after every Session JSONL append, including `stop`. F006 does not change report structure (grouping stays F004). Details for subagent start are `task` only.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitSessionRecord` / `ingestHook` / `hooks.json` by importing `cli/src` (and reading the JSON file).
- `task` and `transcript_path` stay on the Event log line (F001 verbatim). Do not overlay, redact, or omit them from the Event log.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not retitle F003 / F005 / F007 / F008 / F010 tests even when their titles still say yaml.
- `/codify` (cli): retarget F006 unit tests only. Spec status set to `in-progress` after both containers. No `cli/src/` change; no rebuild.

---

> last updated: 2026-09-02T16:30:00Z
