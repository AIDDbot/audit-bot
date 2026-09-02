---
spec-kind: functional
container: cli
---
# F007-agent-display-name - cli

## Specification

Copilot `agentDisplayName` maps to YAML `agent_display_name` after `subagent` (not `agent_type`) on subagent start (before `task`) and subagent stop (before `response_text`) when that Copilot source key is present. Cursor and Claude Code have no source key. Do not overlay `subagent` with the display name. Copilot start identity stays `agentName`; Copilot stop identity stays `agentType` **when those are the first present preferred keys** (F009 preference: `subagent_type` > `agent_type` > `agentType` > `agentName`). Tests that assert Copilot-column identity must **not** plant a higher-preference key. Keep the F006 `task` exception. Remain observe-only. This spec does not replace F001–F006 or F009. Do not change when a Session report is written, overview `harness`, or duration (F004 as shipped). `agent_display_name` stays in YAML and **out** of Details and out of the Subagent cell (F004). Do not add Cursor events or Copilot/Claude registrations.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this spec** (six Cursor events; compact YAML header; F009 `subagent` after the header). F007 adds **no** new events. Do not amend architecture in this planify run or in `/codify`. [`docs/normalized-fields.md`](../../normalized-fields.md) already has `agent_display_name` after `subagent` in sections 3 and 4 (Copilot `agentDisplayName`; Cursor and Claude empty) and already names both the `task` and `agent_display_name` exceptions. Do not amend F003/F004/F006/F009 specs or their plans.

Grounding (F007 YAML mapping shipped; F009 0.17.0 renamed identity `agent_type` → `subagent`; this amend is AC-F007.2 / .3 / .6 after that rename):

- `cli/src/yaml.ts`: **already** implements F007. `subagentStartFields` is `agent_display_name` (Copilot `agentDisplayName`; Cursor/Claude `""`) then `task`. `subagentStopFields` is `agent_display_name` then `response_text`. Identity is **not** a `MappedField` — F009 `subagentLines(payload)` walks `subagent_type` → `agent_type` → `agentType` → `agentName` after `headerLines` and before `bodyLines`. `bodyLines` already skips empty `sourceKey` (`sourceKey.length === 0`) **before** `sourceKey in payload`. **Do not rewrite `yaml.ts`.** `/codify` confirms emit order and retitles AC-F007.2 / .3 / .6
- `cli/src/report.ts`: `detailsByEvent` is remaining body only (`task` / `response_text`); it does **not** list `subagent` or `agent_display_name`. Subagent cell is the bare `subagent` value (F004). **Do not** re-add `agent_display_name` to Details. Do **not** change `maybeWriteReport`, `triggeringHarness`, duration, or overview
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: keep F001 persist, F003 YAML append, F004 report-after-every-YAML-append, F008 numbering, F009 `subagent` as shipped. Do not strip `agentDisplayName` from JSONL
- `.cursor/hooks.json`: six events. **Do not change** in F007
- `docs/normalized-fields.md`: already has `agent_display_name` after `subagent` and both intro exceptions. Confirm-no-change. Do **not** remove the `task` exception
- `docs/events-args.md` already documents Copilot `agentDisplayName?: string`. Do not remap F009 identity keys
- `cli/test/yaml.test.ts`: Copilot start/stop fixtures already emit `subagent` then `agent_display_name`. **Still to change:** retitle AC-F007.2 / .3 / .6 (`after subagent`, not `after agent_type`; identity is `subagent`, not `agent_type`). Copilot-column identity cases must plant `agentName` (start) or `agentType` (stop) as the **first present** preferred key — do **not** plant `subagent_type` / `agent_type` (or `agentType` on start)
- `cli/test/ingest.test.ts`: persist path already maps Copilot `agentDisplayName` after `subagent`. Retitle AC-F007.2 / .3 / .6 the same way. Same Copilot-column trap rule
- `cli/test/report.test.ts`: F004 already asserts Details and Subagent exclude `agent_display_name`. Leave those titles as F004. Do not add F007 Details-include cases
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** production `cli/src/` edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML compact header / append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events (hooks stay the six from F006)
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude subagent start/stop still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or overview/duration (F004 as shipped)
- Do not change F009 extraction / preference order

Unit tests cover AC-F007.1–7 at lib except entry spawn/`exitCode`/stdout (those are e2e). Unchecked this amend: **AC-F007.2**, **AC-F007.3**, **AC-F007.6**. Other F007 ACs stay shipped (keep): .1 .4 .5 .7.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004). New documents may include `subagent` after the compact header when a matching payload attribute is present (F009).

This spec does not add persisted entities. Event log stays verbatim. YAML gains `agent_display_name` for Copilot when present (after `subagent`); Cursor and Claude Code omit it. The Session report Subagent cell is the bare `subagent` value; `agent_display_name` stays out of that cell and out of Details.

### Shared store wording

> Copy this block verbatim into the F007 e2e plan. Event log, Session index, project root, and day folder stay as F001. Session YAML log uses F003 compact headers (`harness` / `event`; `session_id` only on the initial session-start). F008 numbering and F009 `subagent` are already shipped (0.17.0). This container owns Copilot `agent_display_name` after `subagent` when `agentDisplayName` is present.

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
- `transcript_path`, `task`, `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them. Do not overlay `subagent`.

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
- `turn` is a YAML integer (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extract with the first present payload key in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`. Do **not** select the source key from the F002 `harness` positional. Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit YAML `null`. Do not map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`. Do not use `agentDisplayName` / `agent_display_name` as a fallback or overlay for `subagent`. New documents write `subagent`, never `agent_type`. Copilot start identity source stays `agentName`; Copilot stop identity source stays `agentType` **when those preferred keys are the first present**.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key.
- Subagent stop remaining body is `agent_display_name`, then `response_text`. Copilot source key for `response_text` is `response`; Cursor `summary`; Claude Code `last_assistant_message`.
- Do **not** include `transcript_path` in any YAML document (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document is header-only **except** `subagent` may still appear when a matching source attribute is present. Other extra body fields stay closed (no `reason` / `prompt` / `task` / `agent_display_name` on unmapped documents).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `harness`, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every YAML append). Do not change them here.
- Subagent cell: when the document body has `subagent`, the cell is that value only (no `subagent:` / `agent_type:` / `agent_display_name:` prefix). When `subagent` is absent, the cell is empty. Fill the cell for **any** event kind that has `subagent` on that document. Do not show `agent_display_name` in the Subagent cell. Do not fall back to `agent_type`. Do not copy identity onto later documents that omit it. Do not reconstruct parent→subagent hierarchy.
- Details: remaining table-driven body fields excluding identity and excluding `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Copilot persists `agent_display_name` in YAML when present; it stays out of Details and out of the Subagent cell.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F007 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Add `agent_display_name` to YAML mapping | keep | Mapping already in `yaml.ts` after F009 identity (`subagentLines` then `agent_display_name`). No src rewrite. Retitle AC-F007.2 / .3 / .6 (`after subagent`; Copilot-column identity without a higher-preference key) |
| Add `agent_display_name` to report Details | drop | F004: `agent_display_name` stays in YAML, out of Details and out of the Subagent cell. Do not re-add it to `detailsByEvent` |
| ingestHook coverage | keep | Persist path already maps Copilot `agentDisplayName` after `subagent`. Retitle AC-F007.2 / .3 / .6 the same way |
| Confirm architecture unchanged | keep | Six Cursor events; no F007 registration. Confirm-no-change only. Do not amend architecture in this run or in `/codify` |
| Test runner and AC sweep | redo | Retitle AC-F007.2 / .3 / .6; Copilot start identity from `agentName`, stop from `agentType` when those are the first present preferred keys |

## Implementation Steps

### Step 1: Confirm `agent_display_name` after `subagent` (AC-F007.2, .3, .6)
Do **not** rewrite `cli/src/yaml.ts`. F007 mapping and F009 `subagentLines` are already shipped. `/codify` confirms emit order and retitles AC-F007.2 / .3 / .6. Do not restore `agent_type` as a `MappedField`. Do not overlay `subagent` with `agentDisplayName`. Do not redo F009 preference order.
- Paths:
    - `cli/src/yaml.ts` (read-only confirm)
    - `cli/test/yaml.test.ts`
    - `docs/normalized-fields.md` (read-only confirm)
- [ ] Confirm `emitYamlDocument` is `headerLines` then `subagentLines(input.payload)` then `bodyLines`. Confirm `subagentStartFields` / `subagentStopFields` start with `{ name: "agent_display_name", cursor: "", copilot: "agentDisplayName", "claude-code": "" }` (then `task` / `response_text`). Confirm `bodyLines` still skips empty `sourceKey` (`sourceKey.length === 0`) **before** `sourceKey in payload`. Do not edit these helpers unless a new test proves a bug (AC-F007.1, AC-F007.2, AC-F007.3, AC-F007.4, AC-F007.5)
- [ ] Confirm `docs/normalized-fields.md`: `agent_display_name` after `subagent` in section 3 and section 4 — Copilot `agentDisplayName`; Cursor and Claude Code columns empty. Intro still names `task` and `agent_display_name` as explicit exceptions. Do **not** remove the `task` exception. Do **not** restore an `agent_type` normalized-field row (AC-F007.1)
- [ ] Mapping table after F009 (identity is **not** a harness-column `MappedField`). Session start and agent stop table-driven bodies stay empty. Copilot start YAML with `agentDisplayName` and **without** Cursor `task` mapping: body after `subagent` is `agent_display_name` (`task` omitted because Copilot has no `task` source key). Copilot stop YAML with `agentDisplayName`: body after `subagent` is `agent_display_name` then `response_text`

| kind | `event` aliases | body field | cursor | copilot | claude-code |
|------|-----------------|------------|--------|---------|-------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none table-driven)* | | | |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` | `reason` | `reason` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_display_name` | *(none)* | `agentDisplayName` | *(none)* |
| | | `task` | `task` | *(none)* | *(none)* |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_display_name` | *(none)* | `agentDisplayName` | *(none)* |
| | | `response_text` | `summary` | `response` | `last_assistant_message` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` | `prompt` | `prompt` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none table-driven)* | | | |

- [ ] Keep the existing Copilot `subagentStart` exact-string test (trap `task` → `subagent` only; YAML must **not** contain `task:`). That fixture has no `agentDisplayName` and must still omit `agent_display_name`. Do **not** plant `subagent_type` / `agent_type` / `agentType` on that Copilot start fixture (AC-F007.4)
- [ ] Keep Cursor `subagentStart` fixtures that omit `agentDisplayName` as **without** `agent_display_name` (absent `task` → `subagent` only; present `task` → `subagent` then `task`). Cursor `stop` stays header-only except F009 `subagent` when a preferred key is present (AC-F007.5)
- [ ] Retitle Copilot `subagentStart` exact-string with **AC-F007.2**: payload `{ agentName: "explore", agentDisplayName: "Explore" }` (and trap `task` if useful) → body `subagent: explore` then `agent_display_name: Explore`; YAML must **not** contain `task:`; `subagent` stays `"explore"` not `"Explore"`. Distinct slug vs label. Do **not** plant `subagent_type`, `agent_type`, or `agentType` (those outrank `agentName`). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor/Claude key (AC-F007.2, AC-F007.6)
- [ ] Keep Copilot `subagentStart` `agentDisplayName: null` → YAML `null` after `subagent`. Retitle with AC-F007.2 if the title still says `agent_type` (AC-F007.2)
- [ ] Retitle Copilot `subagentStop` exact-string with **AC-F007.3**: payload `{ agentType: "explore", agentDisplayName: "Explore", response: "done" }` → body `subagent: explore` then `agent_display_name: Explore` then `response_text: done`; `subagent` stays `"explore"`. Do **not** plant `subagent_type` or `agent_type` (those outrank `agentType`). Keep the existing Copilot `subagentStop` fixture without `agentDisplayName` as `subagent` then `response_text` only (AC-F007.3, AC-F007.6)
- [ ] Keep Copilot start/stop tests with trap fields (`agentDescription`, `task`) and **absent** `agentDisplayName` → omit `agent_display_name`; do not invent it. If a Copilot start fixture still plants `agentType` / `subagent_type` / `agent_type` while asserting Copilot-column identity, drop those higher-preference keys (AC-F007.4)
- [ ] Keep Cursor `subagentStart` / `subagentStop` and Claude `SubagentStart` / `SubagentStop` exact-string tests: payload may include trap `agentDisplayName` / `agentDescription`; YAML must **not** contain `agent_display_name:` (AC-F007.5)
- [ ] Retitle a dedicated AC-F007.6 case (or the existing overlay asserts on the .2 / .3 fixtures): Copilot start `agentName: "explore"` vs `agentDisplayName: "Explore"` → `subagent` is `"explore"` not `"Explore"`; Copilot stop `agentType: "explore"` vs `agentDisplayName: "Explore"` → `subagent` is `"explore"`. Distinct values are mandatory. YAML must **not** contain `agent_type:`. Do not fold this into F009 preference tests (AC-F007.6)

---

### Step 2: Confirm ingestHook coverage
YAML mapping already works at the emitter. Cover AC-F007.2–7 through `ingestHook`. Observe-only `exitCode` / stdout remain e2e. Do not change persist, `maybeWriteReport`, F009 extraction, or `yaml.ts`.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts` (read-only confirm)
    - `cli/src/store.ts` (read-only confirm)
    - `cli/src/event.ts` (read-only confirm)
- [ ] Keep `parseArgv`, `index.ts` (shebang, `readFileSync(0)`, `ingestHook({ … harness, event })`, `finally { process.exitCode = 0 }`), `sessionIdentifier`, `eventLogLine`, `persistIngest`, and the shipped F004 report-after-every-YAML-append as shipped. Do not add a command. Entry spawn/`exitCode`/stdout remains e2e (AC-F007.7)
- [ ] Do not change Event log serialization to strip `agentDisplayName`, `agentName`, `agentDescription`, `task`, or `transcript_path`. Do not use `agent_display_name` to skip, filter, or transform the JSONL line (AC-F007.7)
- [ ] Retitle `ingestHook` Copilot start with **AC-F007.2**: `harness: "copilot"`, `event: "subagentStart"`, payload `{ session_id: "sess-1", agentName: "explore", agentDisplayName: "Explore" }` writes verbatim jsonl (deep-equals payload, still has `agentDisplayName`), and YAML with `subagent: explore` then `agent_display_name` then no `task:`; `subagent` is not `"Explore"`; YAML has no `agent_type:`. Do **not** plant `subagent_type` / `agent_type` / `agentType` (AC-F007.2, AC-F007.6, AC-F007.7)
- [ ] Retitle `ingestHook` Copilot stop with **AC-F007.3**: `harness: "copilot"`, `event: "subagentStop"`, payload `{ session_id: "sess-1", agentType: "explore", agentDisplayName: "Explore", response: "done" }` writes verbatim jsonl including `agentDisplayName`, and YAML with `subagent` then `agent_display_name` then `response_text`; `subagent` stays `"explore"`. Do **not** plant `subagent_type` / `agent_type` (AC-F007.3, AC-F007.6, AC-F007.7)
- [ ] Keep `ingestHook` Copilot start/stop with F001 `session_id` but **absent** `agentDisplayName` (may include trap `task` / `agentDescription`) writes YAML **without** `agent_display_name:`. Do not plant a higher-preference identity key if the test still asserts Copilot-column identity (AC-F007.4)
- [ ] Keep `ingestHook` Cursor and Claude Code subagent start/stop (payload may include trap `agentDisplayName`) write YAML **without** `agent_display_name:` (AC-F007.5). Keep existing Cursor `task` and Copilot/Claude omit-`task` ingest assertions
- [ ] Keep `ingestHook` Copilot `sessionId` alone (no F001 identifier) on start/stop still writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` (AC-F007.7)
- [ ] Keep `ingestHook` still resolves (does not throw) for Copilot start/stop with or without `agentDisplayName` and for Cursor/Claude payloads that include trap fields (AC-F007.7)
- [ ] Keep existing F001/F003/F004/F005/F006/F008/F009 ingest assertions. Do not rewrite the report gate. Do not retitle F004 Details tests as F007
- [ ] Skip `bun run build` unless a production `cli/src/` file actually changes. If it does: `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 4: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F007.7)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. Expect no production `yaml.ts` / `report.ts` diff
- [ ] Unit tests cover AC-F007.1–7 at lib (yaml emitter + ingestHook persist + `normalized-fields.md` mapping) except entry argv/`exitCode`/stdout spawn, which is e2e. AC-F007.2 / .3 / .6 titles say `subagent`, not `agent_type`. Do not change `hooks.test.ts` event count (stays six). Leave `cli/src/report.ts` and F004 Subagent/Details tests alone

---

### Deviations

- Spec status is set to `planned` in this planify run (parent: both cli and e2e plans written here). `/codify` sets `in-progress`.
- No git commit (parent instruction). Write `cli.plan.md` and `e2e.plan.md`. Do not amend architecture. Do not change F009 extraction / preference order / mapping-table rename.
- `cli/src/yaml.ts` and `cli/src/report.ts` need **no** production code for this amend. `/codify` confirms emit order and retitles AC-F007.2 / .3 / .6. Do not re-add `agent_display_name` to `detailsByEvent`.
- Step “Add `agent_display_name` to report Details” is **drop**. F004 owns Details exclude and the bare Subagent cell. Do not reopen AC-F004.22 / AC-F004.24 as F007 titles.
- Confirm architecture unchanged is **keep**: do not amend `cli.arch.md` / `system.arch.md` in this planify run or in `/codify`.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `ingestHook` by importing `cli/src`.
- Do not overlay `subagent`. Copilot start `subagent` stays `agentName`; Copilot stop `subagent` stays `agentType` **when those are the first present preferred keys**. Tests that assert Copilot-column identity must not plant `subagent_type` / `agent_type` (or `agentType` on start). Distinct values (e.g. `agentName: "explore"` vs `agentDisplayName: "Explore"`) and assert `subagent` stays `"explore"`. Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor/Claude key.
- `agentDisplayName`, `agentName`, `agentDescription`, `task`, and `transcript_path` stay on the Event log line (F001 verbatim). Do not overlay, redact, or omit them from JSONL.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not change `maybeWriteReport`, duration, or overview `harness` (F004 as shipped).
- Do not amend F003/F004/F006/F009 specs or their plans.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- `/codify`: YAML exact-string for `agent_display_name: Explore` is unquoted. `needsQuote` does not trigger (no space). Report Details stay without `agent_display_name`.

---

> last updated: 2026-09-02T11:10:00Z
