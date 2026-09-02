---
spec-kind: functional
container: cli
---
# F005-prompt-omit-transcript - cli

## Specification

Register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with the same shell-string command shape as the other registered events. On `ingest cursor beforeSubmitPrompt`, persist as F001 (verbatim Event log, Session index) and F010/F003 (Session JSONL log when a session identifier exists). Prompt JSON objects use the F003 compact header (`harness`, `event`, `timestamp`, `turn`; `session_id` only on the initial session-start) then `prompt` when present (omit if absent; do not duplicate `session_id` in the body). Drop `transcript_path` from Session JSONL records for subagent start, subagent stop, and agent stop (agent stop body is empty); Event log stays verbatim. F004 Details follow that table. Remain observe-only. This spec does not replace F001–F004 or F010. This amend (C001 / F010) is **wording only**: Session YAML log → Session JSONL log / JSON object. Prompt ingest, `beforeSubmitPrompt` registration, and omit `transcript_path` from the session file stay. Do not revert F006 `task` or F007 `agent_display_name`. Do not implement F008 numbering. Do not change mapping or `.cursor/hooks.json` unless a test proves a bug.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this amend**. Already names Session JSONL log `{session_id}.jsonl`, six Cursor events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, `stop`), and the same `node .agents/hooks/index.mjs ingest cursor {event}` command shape. Compact header is `harness` / `event`; `session_id` only on the initial session-start. [`system.arch.md`](../../arch/system.arch.md) already lists those six events. [`docs/normalized-fields.md`](../../normalized-fields.md) already dropped `transcript_path` and keeps `prompt` (plus later F006 `task` / F007 `agent_display_name` / F009 `subagent`). Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F005 shipped 0.9.0; F003 compact header; F010 production already writes Session JSONL and omits `transcript_path`; this is the C001 / F010 wording amend):

- `cli/src/yaml.ts`: `emitSessionRecord` already emits compact JSON objects then body, including JSON-number `turn`. Prompt mapping (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit` → `prompt`) already exists. `transcript_path` is already absent from `subagentStartFields`, `subagentStopFields`, and `agentStopFields` (`emptyFields`). F006 `task` and F007 `agent_display_name` are already on the subagent maps. F009 `subagent` already follows the compact header. **Do not change product code.** Do not revert those later fields. Do not change mapping unless a test proves a bug
- `cli/src/ingest.ts` / `cli/src/store.ts`: already persist `{session_id}.jsonl` (F010) and write `{session_id}.md` after that append (F004). Keep them. Numbering is F008 — this container must not count prompt-kind records
- `cli/src/report.ts`: Details already omit `transcript_path`. Report already groups by turn (F004). Prompt Details stay `prompt`. Agent stop Details empty. F006 `task` / F007 `agent_display_name` / F009 Subagent cell stay. **F005 does not change report structure**
- `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F010 JSONL append, F004 report-after-every-JSONL-append. Keep them
- `.cursor/hooks.json`: six events including `beforeSubmitPrompt` and F006 `stop`. **Do not change.** Do not remove `stop`. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/hooks.test.ts`: already asserts those six events and the shell-string commands (AC-F005.1)
- `cli/test/yaml.test.ts`: Cursor prompt exact-string fixtures already **are** JSONL compact-header lines (`harness`, `event`, `timestamp`, `turn` then `prompt` when present). Titles already cite `AC-F005.6`. **Keep those strings.** Do not restore `session_id` / `source_harness` / `source_event` on prompt objects
- `cli/test/ingest.test.ts`: leftover F005 titles still say yaml while they already `readFile(jsonlPath)`. Bindings named `yaml` already hold JSONL text. YAML-colon leftover: `yaml.includes("prompt:")`. Copilot `sessionId` still asserts `.yaml` files absent. Redo those F005 titles/bindings/asserts onto Session JSONL / JSON objects. Do **not** retitle AC-F006 / F003 / F008 / F010 tests
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` change, so no rebuild unless a later step edits source. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, Session JSONL log append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not register Copilot or Claude. JSONL mapping for Copilot/Claude prompt and agent-stop still applies if those events are received via ingest
- Do not implement F008 numbering. Do not revert F006 `task` or F007 `agent_display_name`. Do not restore `agent_type`. Do not change F010 format/filename/serialization

Unit tests cover AC-F005.1, .2, .4, .5, .6 at lib except entry spawn/`exitCode` (those are e2e). Not AC-F005.3 (deprecated). Unchecked this amend (spec text now says Session JSONL log / JSON object): **AC-F005.2**, **AC-F005.4**, **AC-F005.5**, **AC-F005.6**. Checked keep (no YAML in spec AC text): **AC-F005.1**.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010; mapped by F003), each with integer `turn` (F008); a **Session report** is the Markdown file derived from that JSONL (F004).

This spec does not add persisted entities. It adds a Cursor `beforeSubmitPrompt` invocation that writes the same ingest artifacts, and it narrows the JSON object body (and thus F004 Details) by dropping `transcript_path`. Agent-stop JSON objects are header-only. This amend aligns wording with Session JSONL log / JSON object. Do not persist `turn` on the Event log line.

### Shared store wording

> Copy this block verbatim into the F005 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped. Session JSONL / Details omit `transcript_path`. Cursor registration is six events including F006 `stop`. Prompt body follows the compact header.

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
- `transcript_path` on the payload stays on the Event log line (F001 verbatim). Do not strip it.
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
- Every object is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new objects: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- Initial session-start object field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other object field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008 shipped; not a body field). This spec requires the field and that it is a JSON number. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- Body after the compact header stays F003 / F009 / F007 / F006. User-prompt body after the header is `prompt` when the mapped source key is present. When that key is absent, omit `prompt`. Do not duplicate `session_id` in the body.
- Do **not** include `transcript_path` in any Session JSONL record (including subagent start, subagent stop, and agent stop). Agent stop body is empty (compact header only, plus `subagent` when F009 applies).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as F009.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object contains the header fields only, except `subagent` when a matching payload attribute is present.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (F004 as shipped). Overwrite on a later Session JSONL append for the same session the same day. JSONL-only source. Trigger, per-turn subsections, and duration stay F004; do not re-specify them here.
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty. `subagent` / `agent_display_name` stay out of Details (F004 / F009). Omit absent fields. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `beforeSubmitPrompt` continue/block, `stop` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F005 registered five events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`). The product now also registers `stop` (F006) — six events. This F005 amend does **not** add extra events and does **not** remove F006 `stop`. Do **not** change `.cursor/hooks.json` unless a test proves a bug. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. JSONL mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Drop `transcript_path` from YAML mapping | keep | already omitted from Session JSONL objects for subagent start/stop and agent stop; prompt mapping stays; do not revert F006 `task`, F007 `agent_display_name`, or F009 `subagent`. Do not change mapping unless a test proves a bug |
| Drop `transcript_path` from report Details | keep | already omitted; F004 groups by turn; F005 does not change report structure |
| Register the fifth Cursor event | keep | `beforeSubmitPrompt` already in `.cursor/hooks.json`; six events including F006 `stop` — do not remove `stop`; do not change hooks.json (AC-F005.1) |
| ingestHook coverage for prompt persist and omit-transcript | redo | persist, omit-transcript, and observe-only already work on Session JSONL. Leftover F005 ingest titles/bindings still say yaml / `{session_id}.yaml`. F004 already writes `.md` after prompt ingest — do not restore “no `.md`” |
| Prompt YAML header tests (four-field / AC-F005.3) | redo | `yaml.test.ts` AC-F005.6 exact strings already JSONL compact header. Ingest AC-F005.6 titles still say yaml. Compact header is `harness` / `event` / `timestamp` / `turn`; `session_id` only on the initial session-start. No product code |
| Amend architecture for the fifth event | keep | `cli.arch.md` / `system.arch.md` already list six events including `beforeSubmitPrompt` and Session JSONL log. `/codify` does not amend those files |
| Test runner and AC sweep | redo | coverage is AC-F005.1, .2, .4, .5, .6 (not .3). Retitle leftover yaml in F005 tests only |

Deprecated ACs stay drop (not a prior implementation step): AC-F005.3.

## Implementation Steps

### Step 1: Retarget F005 unit tests onto Session JSONL / JSON objects
No product code. `emitSessionRecord` already emits compact JSON objects, maps `prompt`, and omits `transcript_path`. Cursor prompt exact-string fixtures in `cli/test/yaml.test.ts` already are JSONL lines. Redo leftover F005 ingest titles, bindings named `yaml`, and YAML-colon asserts. Do not change expected JSONL strings. Do not implement F008 numbering. Do not change mapping or `.cursor/hooks.json`.
- Paths:
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
    - `cli/src/yaml.ts` (read-only confirm)
- [ ] Keep `yaml.test.ts` AC-F005.6 exact-string tests (`Cursor prompt maps prompt`; `Cursor prompt absent is header only`; `Cursor prompt present null emits null and body has no session_id`). They already start with `harness`, `event`, `timestamp`, `turn` then `prompt` when present (omit when absent; no `session_id` on the prompt object). Do not change those strings. Do not require incrementing, prompt-kind counting, or turn 1 in the emitter (it passes `turn: 0`). Do **not** leave an AC-F005.3 title (AC-F005.6)
- [ ] Retitle ingest `AC-F005.6 cursor beforeSubmitPrompt with prompt writes jsonl index yaml and md` onto Event log, Session index, Session JSONL, and md. Include **AC-F005.2** and **AC-F005.6** in that title. Rename binding `yaml` → `jsonl`. Keep the existing exact-string (`turn`: 1 from F008 on a first prompt; compact header; `prompt`; no `session_id`). Do not restore `{session_id}.yaml` (AC-F005.2, AC-F005.6)
- [ ] Retitle ingest `AC-F005.6 cursor beforeSubmitPrompt without prompt writes yaml header only` onto JSON object header only. Rename binding `yaml` → `jsonl`. Replace YAML-colon `includes("prompt:")` with `"prompt" in` the parsed record. Keep the existing exact-string (header only; `turn`: 1) (AC-F005.6)
- [ ] Retitle ingest `beforeSubmitPrompt with only Copilot sessionId writes jsonl and no yaml or md` onto Event log and no Session JSONL or md (**AC-F005.2**). Assert no session `*.jsonl` besides `events.jsonl` (not `.yaml` files). Copilot `sessionId` only still writes no Session JSONL and no `.md` (AC-F005.2)
- [ ] Keep omit-transcript asserts (`transcript_path` on payload, absent from Session JSONL text, present on Event log). Do **not** retitle AC-F006 tests even when they also omit `transcript_path`. Keep hooks.json six-event tests as shipped (AC-F005.1, AC-F005.4)
- [ ] Keep ingest persist for `beforeSubmitPrompt` (verbatim Event log, Session index, Session JSONL when a session identifier exists). F004 already writes `.md` after that JSONL append — do **not** restore the prior-plan “no `.md`” assert (AC-F005.2)
- [ ] Retitle `ingestHook resolves for beforeSubmitPrompt and transcript_path payloads` with **AC-F005.5** (lib observe-only: ingestHook does not throw). Do not add stdout/`exitCode` spawn here (e2e) (AC-F005.5)
- [ ] Do not edit `cli/src/**`. Do not change `.cursor/hooks.json`. Do not revert F006 `task`, F007 `agent_display_name`, or F009 `subagent`. Do not retitle F003 / F006 / F008 / F010 tests

---

### Step 2: Test runner and AC sweep
No product code unless Step 1 somehow forces it (it must not). Cover AC-F005.6, not .3.
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library (AC-F005.5)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. No `bun run build` unless `cli/src/` changed (it must not)
- [ ] Unit tests cover AC-F005.1, .2, .4, .5, .6 at lib (hooks.json + emitter + ingestHook persist) except entry argv/`exitCode`/stdout spawn, which is e2e. Do **not** keep tests whose pass condition is AC-F005.3 (four-field YAML header)
- [ ] Leave `hooks.test.ts` asserting the current six shell-string commands (F005 does not add or remove hooks on this amend) (AC-F005.1)

---

### Deviations

- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`) is current: six Cursor events including `beforeSubmitPrompt` and `stop`; Session JSONL log. This planify run does not amend those files; `/codify` has no architecture step.
- Product code is **not** needed. Production already writes Session JSONL (F010) and omits `transcript_path`. Remaining work is F005 test titles/bindings/asserts off YAML document / `{session_id}.yaml`.
- Do not change `.cursor/hooks.json` (six events). Do not remove F006 `stop`. Do not change mapping unless a test proves a bug.
- Do not revert F006 `task`, F007 `agent_display_name`, or F009 `subagent`.
- Do not implement F008 numbering. Emitter exact-strings may keep `turn: 0`; ingest first-prompt exact-strings may keep `"turn":1`. They must not require a new numbering formula.
- F004 already writes `{session_id}.md` after every Session JSONL append, including prompt. The prior F005 plan’s “no `.md` for prompt” assert is stale; do not restore it. F005 does not change report structure (grouping stays F004).
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitSessionRecord` / `ingestHook` / `hooks.json` by importing `cli/src` (and reading the JSON file).
- `transcript_path` stays on the Event log line (F001 verbatim). Do not overlay, redact, or omit it from the Event log.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not retitle F003 / F006 / F008 / F010 tests even when their titles still say yaml.
- `/codify` (cli): retarget F005 unit tests only. Spec status set to `in-progress` after both containers. No `cli/src/` change; no rebuild.

---

> last updated: 2026-09-02T16:00:00Z
