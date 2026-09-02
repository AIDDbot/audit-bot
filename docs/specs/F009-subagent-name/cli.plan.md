---
spec-kind: functional
container: cli
---
# F009-subagent-name - cli

## Specification

Rename identity `agent_type` → `subagent`. Persist `subagent` after the compact header and before other body fields on **every** Session JSONL log record when a matching payload attribute is present (session start/end, prompt, agent stop, subagent start/stop, and header-only unmapped). Extract with first present payload key `subagent_type`, then `agent_type`, then `agentType`, then `agentName` — do **not** use the F002 `harness` positional to pick the key. New objects write `subagent`, never `agent_type`. Keep F007 `agent_display_name` (Copilot-only, after `subagent`) and F006 `task` (after `subagent`, and after display name when present). Report Subagent cell is the **bare** `subagent` value when that field is present on any event kind; no `{name}: {value}` prefix; do not show `agent_display_name` in that cell. Event log stays verbatim. Remain observe-only. This spec does not replace F001–F008 or F010. Do not migrate old `agent_type` keys. Do not change compact header (`harness` / `event`; `session_id` only on the initial sessionStart; JSON-number `turn`). This amend (C001 / F010) is **wording only**: Session YAML log / YAML document → Session JSONL log / JSON object; YAML `null` → JSON `null`. Do not revert F007 `agent_display_name`. Do not change F010 format/filename/serialization.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this amend**. Already names Session JSONL log `{session_id}.jsonl`, six Cursor events, compact header, `src/yaml.ts` as the normalized session JSONL record, and `subagent` after the compact header on any event kind when a matching payload attribute is present. F009 adds **no** new events. Do not amend architecture in this planify run. `/codify` has no architecture step. [`docs/normalized-fields.md`](../../normalized-fields.md) already lists identity as `subagent` on subagent start/stop (Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`). Do not amend F003/F004/F006/F007/F010 specs or their plans.

Grounding (F009 shipped 0.17.0; F010 production already writes Session JSONL; this is the C001 / F010 wording amend):

- `cli/src/yaml.ts`: `emitSessionRecord` already emits compact JSON objects then body. Identity is **not** a `MappedField` — `subagentValue(payload)` walks `subagent_type` → `agent_type` → `agentType` → `agentName` with `key in payload` (not harness). `subagent` is spliced after the header and before `bodyLines`. Present `null` is JSON `null`. **Do not change product code.** Do not revert F007. Do not restore `agent_type` as a JSON key
- `cli/src/report.ts`: Subagent cell is the bare `subagent` value when present. Details exclude identity. **Do not change** `maybeWriteReport`, duration, overview, grouping, or `detailsByEvent`
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F010 JSONL append, F004 report-after-every-JSONL-append, F008 numbering as shipped. Keep them. Do not strip identity source keys from the Event log
- `.cursor/hooks.json`: six events. **Do not change.** No `.cmd` wrappers
- `docs/normalized-fields.md`: identity row is already `subagent`. Confirm-no-change. Keep the `task` and `agent_display_name` exceptions
- `cli/test/yaml.test.ts`: F009 cases already emit JSONL exact strings (`"subagent":"explore"`, `"subagent":null`). Leftover: titles still `AC-F003.17` (or untitled) instead of **AC-F009.1–5**. Add those AC ids. Do **not** restore YAML-colon `subagent:` / `agent_type:`. Do **not** retitle F006 / F007 / F003.16 / F010 tests
- `cli/test/ingest.test.ts`: F009-coverage persist tests already `readFile(jsonlPath)` and parse JSON objects. Leftover: titles still `AC-F003.17` / untitled. Add **AC-F009** ids on those F009 cases only. Do **not** edit F007 tests (bindings named `yaml`, YAML-colon `agent_type:`) — F007 owns those
- `cli/test/report.test.ts`: F004 owns Subagent-cell asserts. Do **not** edit in this container
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` change, so no rebuild unless a later step edits source. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, Session JSONL log append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not register Copilot or Claude. JSONL mapping for Copilot/Claude still applies if those events are received via extra argv
- Do not change F010 format/filename/serialization. Do not change `.cursor/hooks.json`

Unit tests cover AC-F009.1–5 at lib except entry spawn/`exitCode`/stdout (those are e2e). Unchecked this amend (spec text now says Session JSONL log / JSON object / JSON `null`): **AC-F009.1**, **AC-F009.2**. Checked keep (no YAML in spec AC text): **AC-F009.3**, **AC-F009.4**, **AC-F009.5**.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010); a **Session report** is the Markdown file derived from that JSONL (F004).

This spec does not add a persisted entity. It renames the identity field `agent_type` → `subagent`, persists that field on every JSON object when a matching payload attribute is present (including header-only/unmapped), and changes the report Subagent cell to that value only. Event log stays verbatim. Prior objects are not rewritten. This amend aligns wording with Session JSONL log / JSON object / JSON `null`.

### Shared store wording

> Copy this block verbatim into the F009 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003. Format, filename, and serialization stay F010. F008 numbering is already shipped. This container adds harness-independent `subagent` after the header on every object when a matching payload attribute is present, including header-only/unmapped. New objects write `subagent`, never `agent_type`. Present-null is JSON `null`.

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
- `turn` is a JSON number (F008 shipped; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extract with the first present payload key in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`. Do **not** select the source key from the F002 `harness` positional (a Cursor payload with `subagent_type` still yields `subagent` when harness is `copilot` or empty). Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit JSON `null`. Do not map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`. Do not use `agentDisplayName` / `agent_display_name` as a fallback or overlay for `subagent`. New objects write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key.
- Subagent stop remaining body is `agent_display_name`, then `response_text`. Copilot source key for `response_text` is `response`; Cursor `summary`; Claude Code `last_assistant_message`.
- Do **not** include `transcript_path` in any Session JSONL record (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit JSON `null`. Present non-null values are JSON values.
- When `harness` or `event` does not match a mapping row and column, the object is header-only **except** `subagent` may still appear when a matching source attribute is present. Other extra body fields stay closed (no `reason` / `prompt` / `task` / `agent_display_name` on unmapped objects).
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `harness`, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every Session JSONL append). Do not change them here.
- Subagent cell: when the JSON object has `subagent`, the cell is that value only (no `subagent:` / `agent_type:` / `agent_display_name:` prefix). When `subagent` is absent, the cell is empty. Fill the cell for **any** event kind that has `subagent` on that object (session start/end, prompt, agent stop, subagent start/stop, header-only unmapped), not only start/stop. Do not show `agent_display_name` in the Subagent cell. Do not fall back to `agent_type`. Do not copy identity onto later objects that omit it. Do not reconstruct parent→subagent hierarchy. AC-F004.6 100-character single-line preview still applies to that cell.
- Details: remaining table-driven body fields excluding identity. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F009 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Rename mapping row and emit `subagent` after the header | keep | already shipped on Session JSONL objects. `normalized-fields.md` already `subagent`. Identity is not table-driven. Do not change product code |
| Report Subagent cell is the bare `subagent` value | keep | already shipped. F004 owns the cell. Do not edit `report.ts` or `report.test.ts` |
| ingestHook coverage and rebuild the harness artifact | redo | persist already JSONL. Leftover: F009 cases in `yaml.test.ts` / `ingest.test.ts` titled `AC-F003.17` or untitled. Add AC-F009.1–5. Do not touch F007 tests |
| Confirm architecture unchanged | keep | `cli.arch.md` / `system.arch.md` already name Session JSONL log, six events, compact header, and `subagent`. `/codify` does not amend those files |
| Test runner and AC sweep | redo | coverage is AC-F009.1–5. Add AC-F009 ids on F009 cases. Keep .3 .4 .5 (no YAML). Redo .1 .2 titles onto Session JSONL / JSON `null` |

## Implementation Steps

### Step 1: Retarget F009 unit tests onto Session JSONL / JSON objects
No product code. `emitSessionRecord` already emits compact JSON objects with `subagent` after the header, JSON `null` for present-null, preference order, and trap omit. Exact-string fixtures in `cli/test/yaml.test.ts` already are JSONL lines. Redo leftover F009 titles that still omit AC-F009 or still say YAML document / YAML `null`. Keep AC-F009.3 / .4 / .5 cases (no YAML in those titles or strings). Do not change expected JSONL strings. Do not revert F007. Do not retitle F006 / F007 / F003.16 / F010 tests.
- Paths:
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
    - `cli/src/yaml.ts` (read-only confirm)
- [ ] Prefix `yaml.test.ts` `AC-F003.5 AC-F003.17 subagent follows header on every mapped event when subagent_type is present` with **AC-F009.1 AC-F009.2**. Keep the existing JSONL exact strings (`subagent` after header; `"agent_type"` not a JSON key). Do not restore YAML-colon `subagent:` (AC-F009.1, AC-F009.2)
- [ ] Prefix `yaml.test.ts` `AC-F003.5 AC-F003.17 present null emits JSON null after header` with **AC-F009.2**. Keep `"subagent":null` / `parseRecord(got).subagent === null`. Do **not** restore YAML `null` (AC-F009.2)
- [ ] Prefix `yaml.test.ts` `AC-F003.16 AC-F003.17 unknown empty and unmapped events still emit subagent from subagent_type` and `AC-F003.16 AC-F003.17 unmapped initial sessionStart with subagent_type is five headers then subagent` with **AC-F009.2**. Keep existing JSONL strings (AC-F009.2)
- [ ] Prefix `yaml.test.ts` `subagent prefers subagent_type then agent_type then agentType then agentName` with **AC-F009.3**. Keep the existing preference exact strings (AC-F009.3)
- [ ] Prefix `yaml.test.ts` `AC-F003.17 subagent is omitted for display-name description id and task traps` with **AC-F009.4**. Keep trap omit (AC-F009.4)
- [ ] Prefix ingest `AC-F003.5 AC-F003.17 every Cursor event with subagent_type writes verbatim Event log and Session JSONL subagent after header` with **AC-F009.1 AC-F009.2**. Keep existing JSON object expects (AC-F009.1, AC-F009.2)
- [ ] Prefix ingest `harness does not pick the subagent source key` with **AC-F009.3**. Keep existing JSONL exact string (AC-F009.3)
- [ ] Prefix ingest `AC-F003.17 ingestHook subagent preference order and trap-only omit` with **AC-F009.3 AC-F009.4**. Keep existing asserts (AC-F009.3, AC-F009.4)
- [ ] Prefix ingest `AC-F003.16 AC-F003.17 unmapped initial sessionStart with subagent_type writes five headers then subagent` and `AC-F003.16 AC-F003.17 unknown harness and unmapped event still write header plus subagent` with **AC-F009.2**. Keep existing JSON object asserts. Copilot `sessionId` alone still writes Event log and no Session JSONL (AC-F009.2, AC-F009.5)
- [ ] Do **not** edit F007 ingest tests (titles `AC-F007.2` / `.3` / `.6`; bindings named `yaml`; YAML-colon `agent_type:`). F007 owns those. Do not edit `report.test.ts`. Do not edit `cli/src/**`. Do not change `.cursor/hooks.json`

---

### Step 2: Test runner and AC sweep
No product code unless Step 1 somehow forces it (it must not). Cover AC-F009.1–5 at lib.
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library (AC-F009.5)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. No `bun run build` unless `cli/src/` changed (it must not)
- [ ] Unit tests cover AC-F009.1–5 at lib (emitter + ingestHook persist + `normalized-fields.md` already renamed) except entry argv/`exitCode`/stdout spawn, which is e2e. Keep .3 .4 .5 (no YAML). Do not restore YAML key `agent_type` as identity
- [ ] Leave `hooks.test.ts` asserting the current six shell-string commands (F009 does not add or remove hooks)

---

### Deviations

- This run writes both plans and sets spec status to `planned`. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`) is current: six Cursor events; compact header; `subagent` after the header; Session JSONL log. This planify run does not amend those files; `/codify` has no architecture step.
- Product code is **not** needed. Production already writes Session JSONL (F010) and emits harness-independent `subagent`. Remaining work is F009 test titles onto Session JSONL / JSON object / JSON `null`.
- Do not change `.cursor/hooks.json` (six events). Do not change mapping unless a test proves a bug.
- Do not revert F007 `agent_display_name`. Do not restore `agent_type` as a JSON key.
- Do not implement F008 numbering. Emitter exact-strings may keep `turn: 0`.
- F004 already writes `{session_id}.md` after every Session JSONL append. F009 does not change report structure. Do not edit `report.test.ts` (F004).
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitSessionRecord` / `ingestHook` by importing `cli/src`.
- Do not overlay `subagent` on JSONL. `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `task`, and `transcript_path` stay on the Event log line (F001 verbatim).
- Do not use `agentDisplayName` / `agent_display_name` as a fallback for `subagent`.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Do not retitle F006 / F007 / F003.16-only / F010 tests. Dual-tag F009 cases with AC-F009 **and** keep existing AC-F003.17 ids so F003 coverage stays findable.
- F007 is a sibling sequential spec. Do not edit F007 tests in `ingest.test.ts` / `yaml.test.ts`. If those files are uncommitted by F007, touch only F009-titled regions.
- `/codify` (cli): retarget F009 unit-test titles only. Spec status set to `in-progress` after both containers. No `cli/src/` change; no rebuild.

---

> last updated: 2026-09-02T16:21:00Z
