---
spec-kind: functional
container: cli
---
# F007-agent-display-name - cli

## Specification

Copilot `agentDisplayName` maps to JSON `agent_display_name` after `subagent` on subagent start (before `task`) and subagent stop (before `response_text`) when that Copilot source key is present. Cursor and Claude Code have no source key. Do not overlay `subagent` with the display name. Copilot start identity stays `agentName`; Copilot stop identity stays `agentType` **when those are the first present preferred keys** (F009 preference: `subagent_type` > `agent_type` > `agentType` > `agentName`). Tests that assert Copilot-column identity must **not** plant a higher-preference key. Keep the F006 `task` exception. Remain observe-only. This spec does not replace F001–F006, F009, or F010. This amend (C001 / F010) is **wording only**: YAML document / Session YAML log → JSON object / Session JSONL log. Mapping stays Copilot-only. Do not change when a Session report is written, overview `harness`, or duration (F004 as shipped). `agent_display_name` stays on the JSON object and **out** of Details and out of the Subagent cell (F004). Do not add Cursor events or Copilot/Claude registrations. Do not change mapping unless a test proves a bug.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this amend**. Already names Session JSONL log `{session_id}.jsonl`, six Cursor events, compact header `harness` / `event`, `session_id` only on the initial session-start, and `subagent` after the header. F007 adds **no** new events. [`docs/normalized-fields.md`](../../normalized-fields.md) already has `agent_display_name` after `subagent` in sections 3 and 4 (Copilot `agentDisplayName`; Cursor and Claude empty) and already names both the `task` and `agent_display_name` exceptions. Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F007 mapping shipped; F009 renamed identity `agent_type` → `subagent`; F010 production already writes Session JSONL; this is the C001 / F010 wording amend):

- `cli/src/yaml.ts`: `emitSessionRecord` already emits compact JSON objects. `subagentStartFields` is `agent_display_name` (Copilot `agentDisplayName`; Cursor/Claude `""`) then `task`. `subagentStopFields` is `agent_display_name` then `response_text`. Identity is F009 `subagentLines` (not a `MappedField`). Empty `sourceKey` skip stays. **Do not rewrite product code.** Do not restore `agent_type` as a JSON key. Do not overlay `subagent` with `agentDisplayName`
- `cli/src/report.ts`: `detailsByEvent` is remaining body only (`task` / `response_text`); it does **not** list `subagent` or `agent_display_name`. Subagent cell is the bare `subagent` value (F004). **Do not** re-add `agent_display_name` to Details. Do **not** change `maybeWriteReport`, duration, or overview
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: keep F001 persist, F010 JSONL append, F004 report-after-every-JSONL-append, F008 numbering, F009 `subagent` as shipped. Do not strip `agentDisplayName` from the Event log
- `.cursor/hooks.json`: six events. **Do not change** in F007
- `docs/normalized-fields.md`: already has `agent_display_name` after `subagent` and both intro exceptions. Confirm-no-change. Do **not** remove the `task` exception
- `docs/events-args.md` already documents Copilot `agentDisplayName?: string`. Do not remap F009 identity keys
- `cli/test/yaml.test.ts`: Copilot start/stop exact-string fixtures already emit JSONL with `subagent` then `agent_display_name`. **Keep those strings.** Prefix AC-F007.4 / .5 on omit titles that still lack the id. Do not restore YAML documents
- `cli/test/ingest.test.ts`: persist path already maps Copilot `agentDisplayName` after `subagent` onto Session JSONL. Leftover F007 titles/bindings still say yaml; YAML-colon leftover `includes("agent_display_name:")` / `includes("task:")` / `includes("agent_type:")`. Copilot `sessionId` still asserts `.yaml` files absent. Redo those F007 titles/bindings/asserts onto Session JSONL / JSON objects. Do **not** retitle AC-F003 / F005 / F006 / F008 / F010 tests
- `cli/test/report.test.ts`: F004 already asserts Details and Subagent exclude `agent_display_name`. Leave those titles as F004. Do not add F007 Details-include cases
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** production `cli/src/` edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, Session JSONL log append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events (hooks stay the six from F006)
- Do not register Copilot or Claude. JSONL mapping for Copilot/Claude subagent start/stop still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or overview/duration (F004 as shipped)
- Do not change F009 extraction / preference order. Do not change F010 format/filename/serialization

Unit tests cover AC-F007.1–7 at lib except entry spawn/`exitCode`/stdout (those are e2e). Unchecked this amend (spec text now says JSON object): **AC-F007.2**, **AC-F007.3**, **AC-F007.5**. Checked keep (no YAML in spec AC text): **AC-F007.1**, **AC-F007.4**, **AC-F007.6**, **AC-F007.7**.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010; mapped by F003), each with integer `turn` (F008); a **Session report** is the Markdown file derived from that JSONL (F004). New objects may include `subagent` after the compact header when a matching payload attribute is present (F009).

This spec does not add persisted entities. Event log stays verbatim. Session JSONL gains `agent_display_name` for Copilot when present (after `subagent`); Cursor and Claude Code omit it. The Session report Subagent cell is the bare `subagent` value; `agent_display_name` stays out of that cell and out of Details. This amend aligns wording with Session JSONL log / JSON object.

### Shared store wording

> Copy this block verbatim into the F007 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped. This container owns Copilot `agent_display_name` after `subagent` when `agentDisplayName` is present. Cursor and Claude Code omit it. Do not overlay `subagent` with the display name. F004 Subagent cell is the bare `subagent` value; `agent_display_name` stays out of that cell and out of Details. Cursor registration is six events. Session JSONL / Details omit `transcript_path`.

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
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.
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
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extraction is F009: first present of `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; do **not** select the source key from the F002 `harness` positional. Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit JSON `null`. Do not map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`. Do not use `agentDisplayName` / `agent_display_name` as a fallback or overlay for `subagent`. New objects write `subagent`, never `agent_type`. Copilot start identity source stays `agentName`; Copilot stop identity source stays `agentType` **when those preferred keys are the first present**.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key. Omit the field when the Copilot source key is absent. When the source key is present and the value is `null`, emit JSON `null`.
- Subagent stop remaining body is `agent_display_name`, then `response_text`. Copilot source key for `response_text` is `response`; Cursor `summary`; Claude Code `last_assistant_message`.
- Do **not** include `transcript_path` in any Session JSONL record (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear). Do not duplicate `session_id` in the body.
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present. Other extra body fields stay closed (no `reason` / `prompt` / `task` / `agent_display_name` on unmapped objects).
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (F004 as shipped). Overwrite on a later Session JSONL append for the same session the same day. JSONL-only source. Trigger, per-turn subsections, and duration stay F004; F007 does **not** change report structure. Do not re-specify grouping here.
- Subagent cell is the bare `subagent` value when that field is present (F009 / F004). Do not show `agent_display_name` in that cell. Details follow `docs/normalized-fields.md` excluding identity and excluding `agent_display_name`: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Copilot persists `agent_display_name` on the JSON object when present; it stays out of Details and out of the Subagent cell. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F007 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Add `agent_display_name` to YAML mapping | keep | Mapping already on Session JSONL objects after F009 identity (`subagent` then `agent_display_name`). No src rewrite. Do not restore `agent_type` as a JSON key |
| Add `agent_display_name` to report Details | drop | F004: `agent_display_name` stays on the JSON object, out of Details and out of the Subagent cell. Do not re-add it to `detailsByEvent` |
| ingestHook coverage | redo | Persist path already maps Copilot `agentDisplayName` after `subagent` onto Session JSONL. Leftover F007 ingest titles/bindings still say yaml; YAML-colon leftover `includes("agent_display_name:")` |
| Confirm architecture unchanged | keep | Six Cursor events; Session JSONL log; no F007 registration. Confirm-no-change only. Do not amend architecture |
| Test runner and AC sweep | redo | Retitle leftover yaml in F007 tests only. Keep `yaml.test.ts` exact JSONL strings. Prefix AC-F007.4 / .5 on omit titles |

## Implementation Steps

### Step 1: Retarget F007 unit tests onto Session JSONL / JSON objects
No product code. `emitSessionRecord` already emits compact JSON objects, maps Copilot `agentDisplayName` after `subagent`, omits it for Cursor/Claude and when absent, and does not overlay `subagent`. Copilot start/stop exact-string fixtures in `cli/test/yaml.test.ts` already are JSONL lines. Redo leftover F007 ingest titles, bindings named `yaml`, and YAML-colon asserts. Do not change expected JSONL strings. Do not change mapping.
- Paths:
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
    - `cli/src/yaml.ts` (read-only confirm)
    - `docs/normalized-fields.md` (read-only confirm)
- [x] Keep `yaml.test.ts` AC-F007.2 / .3 / .6 exact-string tests (`Copilot subagentStart body is agent_display_name after subagent`; `Copilot subagentStart agentDisplayName null emits null after subagent`; `Copilot subagentStop body is agent_display_name after subagent then response_text`). They already emit JSONL with `subagent` then `agent_display_name`. Do not change those strings. Do not plant a higher-preference identity key on Copilot-column fixtures (AC-F007.2, AC-F007.3, AC-F007.6)
- [x] Prefix `yaml.test.ts` Copilot omit titles with **AC-F007.4** (`Copilot subagentStart omits agent_display_name even with trap fields`; `Copilot subagentStop omits agent_display_name even with trap fields`). Keep the existing exact strings (AC-F007.4)
- [x] Prefix `yaml.test.ts` Cursor / Claude omit titles with **AC-F007.5** (`Cursor subagentStart omits agent_display_name even with trap agentDisplayName`; `Claude SubagentStart omits…`; `Cursor subagentStop omits…`; `Claude SubagentStop omits…`). Keep the existing exact strings (AC-F007.5)
- [x] Confirm `docs/normalized-fields.md`: `agent_display_name` after `subagent` in section 3 and section 4 — Copilot `agentDisplayName`; Cursor and Claude Code columns empty. Intro still names `task` and `agent_display_name` as explicit exceptions. Do **not** remove the `task` exception (AC-F007.1)
- [x] Retitle ingest `AC-F007.2 AC-F007.6 copilot subagentStart maps agentDisplayName after subagent and keeps jsonl verbatim` onto Session JSONL after subagent. Rename binding `yaml` → `jsonl`. Replace YAML-colon `includes("task:")` / `includes("agent_type:")` with `"task" in` / `"agent_type" in` the parsed record. Keep the existing exact-string (AC-F007.2, AC-F007.6)
- [x] Retitle ingest `AC-F007.3 AC-F007.6 copilot subagentStop maps agentDisplayName after subagent then response_text` onto Session JSONL. Rename binding `yaml` → `jsonl`. Replace YAML-colon `includes("agent_type:")` with `"agent_type" in` the parsed record. Keep the existing exact-string (AC-F007.3, AC-F007.6)
- [x] Prefix ingest omit-absent title with **AC-F007.4**. Rename bindings `startYaml` / `stopYaml` → `startRecord` / `stopRecord`. Keep `"agent_display_name" in` asserts (AC-F007.4)
- [x] Prefix ingest Cursor/Claude omit title with **AC-F007.5**. Rename bindings `cursorYaml` / `claudeYaml` → `cursorJsonl` / `claudeJsonl`. Replace YAML-colon `includes("agent_display_name:")` with `"agent_display_name" in` the parsed records (AC-F007.5)
- [x] Retitle ingest `copilot sessionId alone on subagent start and stop writes jsonl and no yaml` onto Event log and no Session JSONL (**AC-F007.7**). Assert no session `*.jsonl` besides `events.jsonl` (not `.yaml` files) (AC-F007.7)
- [x] Keep existing F001/F003/F004/F005/F006/F008/F009/F010 ingest assertions. Do not rewrite the report gate. Do not retitle F004 Details tests as F007. Do not retitle F003 / F005 / F006 / F008 / F010 tests
- [x] Do not edit `cli/src/**`. Do not change `.cursor/hooks.json`. Do not revert F009 `subagent`. Do not change F010 format

---

### Step 2: Test runner and AC sweep
No product code unless Step 1 somehow forces it (it must not).
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library (AC-F007.7)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. No `bun run build` unless `cli/src/` changed (it must not)
- [x] Unit tests cover AC-F007.1–7 at lib (yaml emitter + ingestHook persist + `normalized-fields.md` mapping) except entry argv/`exitCode`/stdout spawn, which is e2e. Do not change `hooks.test.ts` event count (stays six). Leave `cli/src/report.ts` and F004 Subagent/Details tests alone

---

### Deviations

- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`) is current: six Cursor events; compact header; `subagent` after the header; Session JSONL log. This planify run does not amend those files; `/codify` has no architecture step.
- Product code is **not** needed. Production already writes Session JSONL (F010) and emits `subagent` then `agent_display_name` for Copilot. Remaining work is F007 test titles/bindings/asserts off YAML document / `{session_id}.yaml`.
- Step “Add `agent_display_name` to report Details” stays **drop**. F004 owns Details exclude and the bare Subagent cell.
- Confirm architecture unchanged is **keep**: do not amend `cli.arch.md` / `system.arch.md`.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `emitSessionRecord` / `ingestHook` by importing `cli/src`.
- Do not overlay `subagent`. Copilot start `subagent` stays `agentName`; Copilot stop `subagent` stays `agentType` **when those are the first present preferred keys**. Tests that assert Copilot-column identity must not plant `subagent_type` / `agent_type` (or `agentType` on start). Distinct values (e.g. `agentName: "explore"` vs `agentDisplayName: "Explore"`) and assert `subagent` stays `"explore"`. Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor/Claude key.
- `agentDisplayName`, `agentName`, `agentDescription`, `task`, and `transcript_path` stay on the Event log line (F001 verbatim). Do not overlay, redact, or omit them from the Event log.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not change `maybeWriteReport`, duration, or overview `harness` (F004 as shipped).
- Do not amend F003/F004/F006/F009/F010 specs or their plans. Do not retitle F003 / F005 / F006 / F008 / F010 tests even when their titles still say yaml.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- `/codify` (cli): retarget F007 unit tests only. Spec status set to `in-progress` after both containers. No `cli/src/` change; no rebuild.

---

> last updated: 2026-09-02T16:20:00Z
