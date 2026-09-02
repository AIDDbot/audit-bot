---
spec-kind: functional
container: cli
---
# F009-subagent-name - cli

## Specification

Rename YAML identity `agent_type` → `subagent`. Persist `subagent` after the compact header and before other body fields on **every** Session YAML log document when a matching payload attribute is present (session start/end, prompt, agent stop, subagent start/stop, and header-only unmapped). Extract with first present payload key `subagent_type`, then `agent_type`, then `agentType`, then `agentName` — do **not** use the F002 `harness` positional to pick the key. New documents write `subagent`, never `agent_type`. Keep F007 `agent_display_name` (Copilot-only, after `subagent`) and F006 `task` (after `subagent`, and after display name when present). Report Subagent cell is the **bare** `subagent` value when that body field is present on any event kind; no `{name}: {value}` prefix; do not show `agent_display_name` in that cell. JSONL stays verbatim. Remain observe-only. This spec does not replace F001–F008. Do not migrate old `agent_type` keys. Do not change compact header (`harness` / `event`; `session_id` only on the initial sessionStart; `turn`).

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this spec** (already names the six Cursor events, compact YAML header, `src/yaml.ts`, `src/report.ts`, and YAML append under `ingest.lock`). F009 adds **no** new events. Do not amend architecture in this planify run or in `/codify`. [`docs/normalized-fields.md`](../../normalized-fields.md) still lists identity as `agent_type` on subagent start/stop only — `/codify` Step 1 renames that row to `subagent` (same source-key columns). Do not amend F003/F004/F006/F007 specs or their plans. F004.24 will replan the Subagent cell later; this F009 cli plan still owns the **code** change to `formatSubagent` so the YAML rename does not empty the column.

Grounding (F007 `agent_display_name` shipped; F003 compact header shipped; this is the first F009 plan):

- `cli/src/yaml.ts`: `subagentStartFields` / `subagentStopFields` start with `name: "agent_type"` mapped **per harness column** via `bodyLines` (`asHarness` → empty body if harness unknown; empty body if event unmapped). F009 must **stop** using the harness column for identity. Add `subagentValue(payload)` that walks `subagent_type`, then `agent_type`, then `agentType`, then `agentName` with `key in payload` (sequential guards). Emit `subagent` after `headerLines` and before `bodyLines` via `subagentLines(payload)` — do **not** grow `emitYamlDocument` / `bodyLines` complexity. Remove the `agent_type` `MappedField` from both subagent field lists (do **not** keep identity in the table — table-driven-per-harness **conflicts** with harness-independent extraction). `agent_display_name` and `task` / `response_text` stay table-driven. Compact header unchanged
- `cli/src/report.ts`: `subagentByEvent` maps start/stop to `["agent_type", "agent_display_name"]`; `formatSubagent` uses `formatFieldList` (`name: value`). Change to: if `"subagent" in doc.body`, cell = `scalarText(value)` only; else empty. Drop `subagentByEvent` if unused. `detailsByEvent` already excludes identity (`task` / `response_text` only) — keep that; do not add `subagent` to Details. Keep 100-char preview
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: keep F001 persist, F003 YAML append, F004 report-after-every-YAML-append, F008 numbering as shipped. Do not strip identity source keys from JSONL
- `.cursor/hooks.json`: six events. **Do not change** in F009. No `.cmd` wrappers
- `docs/normalized-fields.md`: sections 3 and 4 still name `agent_type`. `/codify` Step 1 renames those rows to `subagent` (Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`). Keep the `task` and `agent_display_name` exceptions
- `cli/test/yaml.test.ts` and `cli/test/report.test.ts`: existing assertions on `agent_type` **must** be updated in this container so the suite stays green (exact-string YAML `agent_type:` → `subagent:`; Subagent cell `agent_type: explore` → bare `explore`)
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML compact header / append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events (hooks stay the six from F006)
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or overview/duration/grouping (F004 as shipped except the Subagent cell)

Unit tests cover AC-F009.1–5 at lib except entry spawn/`exitCode`/stdout (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add a persisted entity. It renames the YAML identity field `agent_type` → `subagent`, persists that field on every document when a matching payload attribute is present (including header-only/unmapped), and changes the report Subagent cell to that value only. Event log stays verbatim. Prior documents are not rewritten.

### Shared store wording

> Copy this block verbatim into the F009 e2e plan. Event log, Session index, project root, and day folder stay as F001. Session YAML log uses F003 compact headers (`harness` / `event`; `session_id` only on the initial session-start). F008 numbering is already shipped. This container adds harness-independent `subagent` after the header on every document when a matching payload attribute is present, including header-only/unmapped. New documents write `subagent`, never `agent_type`.

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
- After the compact header, when a matching subagent source attribute is present, emit `subagent` first (before any other body field). Extract with the first present payload key in this preference: `subagent_type`, then `agent_type`, then `agentType`, then `agentName`. Do **not** select the source key from the F002 `harness` positional (a Cursor payload with `subagent_type` still yields `subagent` when harness is `copilot` or empty). Omit `subagent` when none of those four keys are present. When the chosen key is present and the value is `null`, emit YAML `null`. Do not map `subagent` from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task`. Do not use `agentDisplayName` / `agent_display_name` as a fallback or overlay for `subagent`. New documents write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`). Identity is **not** table-driven-per-harness.
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Subagent start remaining body is `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (keep the F007 exception). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key.
- Subagent stop remaining body is `agent_display_name`, then `response_text`. Copilot source key for `response_text` is `response`; Cursor `summary`; Claude Code `last_assistant_message`.
- Do **not** include `transcript_path` in any YAML document (F005). Session end remaining body is `reason`. Prompt remaining body is `prompt`. Session start and agent stop have no other table-driven body fields (`subagent` may still appear).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document is header-only **except** `subagent` may still appear when a matching source attribute is present. Other extra body fields stay closed (no `reason` / `prompt` / `task` / `agent_display_name` on unmapped documents).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `harness`, duration, per-turn subsections, turn duration, and prompt-in-subsection stay F004 as shipped (write/overwrite after every YAML append). Do not change them here.
- Subagent cell: when the document body has `subagent`, the cell is that value only (no `subagent:` / `agent_type:` / `agent_display_name:` prefix). When `subagent` is absent, the cell is empty. Fill the cell for **any** event kind that has `subagent` on that document (session start/end, prompt, agent stop, subagent start/stop, header-only unmapped), not only start/stop. Do not show `agent_display_name` in the Subagent cell. Do not fall back to `agent_type`. Do not copy identity onto later documents that omit it. Do not reconstruct parent→subagent hierarchy. AC-F004.6 100-character single-line preview still applies to that cell.
- Details: remaining table-driven body fields excluding identity. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty. Do **not** list `subagent`, `agent_type`, or `agent_display_name` in Details. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F009 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | n/a | First F009 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: Rename mapping row and emit `subagent` after the header
Rename identity in `docs/normalized-fields.md`. Stop emitting `agent_type` from the harness-column table. Extract `subagent` with a harness-independent helper and splice it after `headerLines`. Keep compact header, omit-absent / present-`null`, F007 display name, and F006 `task`. Do not strip identity source keys from the payload used for JSONL. Do not grow `emitYamlDocument` / `bodyLines` complexity past 8.
- Paths:
    - `docs/normalized-fields.md`
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
- [x] `docs/normalized-fields.md`: rename the `agent_type` row to `subagent` in section 3 (Inicio de subagente) and section 4 (Fin de subagente). Keep source-key columns: Cursor `subagent_type`; Copilot start `agentName` / stop `agentType`; Claude Code `agent_type`. Keep `agent_display_name` after `subagent` in both sections. Keep the `task` and `agent_display_name` intro exceptions. Do **not** add `subagent` rows to session start/end, prompt, or agent-stop tables (those kinds still persist `subagent` from the preference list in code; the mapping table documents start/stop source keys only) (AC-F009.1)
- [x] Remove the `{ name: "agent_type", … }` `MappedField` from `subagentStartFields` and `subagentStopFields`. After the remove, start fields are `agent_display_name` then `task`; stop fields are `agent_display_name` then `response_text`. Do **not** re-add identity as a table-driven `subagent` row — harness column would skip it on unknown harness / unmapped event (AC-F009.1, AC-F009.2, AC-F009.3)
- [x] Add file-private `subagentValue(payload)` that walks `subagent_type`, then `agent_type`, then `agentType`, then `agentName` with sequential `key in payload` guards (not truthiness, not harness). First present key is the source. Add `subagentLines(payload)` that emits `emitPair("subagent", value)` when a source key is present, else `[]`. Present `null` → YAML `null`. Do not map from `agentDisplayName`, `agent_display_name`, `agentDescription`, `agentId`, `subagent_id`, or `task` (AC-F009.2, AC-F009.3, AC-F009.4)
- [x] `emitYamlDocument`: splice `...subagentLines(input.payload)` after `headerLines` and before `bodyLines`. Do not fold this into `bodyLines`. Keep `headerLines` unchanged (`harness` / `event`; `session_id` only when `includeSessionId`; `turn`) (AC-F009.2)
- [x] Mapping after the change (identity is **not** a harness column). Session start and agent stop have no other table-driven body; `subagent` may still appear

| kind | `event` aliases | body field | cursor | copilot | claude-code |
|------|-----------------|------------|--------|---------|-------------|
| *(every kind, including unmapped)* | *(any)* | `subagent` | first present of `subagent_type`, `agent_type`, `agentType`, `agentName` — **not** the harness column | | |
| sessionStart | `sessionStart`, `SessionStart` | *(none besides `subagent`)* | | | |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` | `reason` | `reason` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_display_name` | *(none)* | `agentDisplayName` | *(none)* |
| | | `task` | `task` | *(none)* | *(none)* |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_display_name` | *(none)* | `agentDisplayName` | *(none)* |
| | | `response_text` | `summary` | `response` | `last_assistant_message` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` | `prompt` | `prompt` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none besides `subagent`)* | | | |

- [x] Update every exact-string YAML assertion in `cli/test/yaml.test.ts` that currently expects `agent_type:` to expect `subagent:` instead, in the same position (after header, before `agent_display_name` / `task` / `response_text`). New documents must **not** contain `agent_type:` as a YAML key (payload key `agent_type` may still be the *source*) (AC-F009.1)
- [x] Keep Copilot `subagentStart` without `agentDisplayName` as `subagent` only (trap `task` → YAML must **not** contain `task:`). Keep Copilot start/stop with `agentDisplayName` as `subagent` then `agent_display_name` (then `response_text` on stop). Keep Cursor start with `task` as `subagent` then `task`. `subagent` stays the slug (`explore`), not the label (`Explore`) (AC-F009.1, F007, F006)
- [x] Rewrite Copilot start/stop fixtures that currently use `subagent_type` as a **harness-column trap** (ignored because Copilot’s column was `agentName` / `agentType`). After F009 that key is first in the preference list. Split: (a) omit-display-name traps use `agentDescription` / `task` **without** `subagent_type`; identity comes from `agentName` / `agentType`; (b) preference tests put `subagent_type` + `agentName` (and/or `agentType`) and expect `subagent` from `subagent_type` (AC-F009.3)
- [x] Add exact-string tests: `subagent` after header on `sessionStart`, `sessionEnd` (then `reason`), `beforeSubmitPrompt` (then `prompt`), `stop`, `subagentStart`, `subagentStop` when `subagent_type` is present. Omit `subagent` when none of the four keys are present (existing sessionStart / stop header-only fixtures without those keys stay header-only) (AC-F009.2)
- [x] Add exact-string tests: unknown harness (`other`) / empty harness (`""`) / unmapped event (`workspaceOpen`) with payload `subagent_type: explore` still emit `subagent: explore` after the compact header; `reason` / other table-driven fields stay omitted on unmapped (AC-F003.16 fixtures **without** identity keys stay header-only — do not rewrite those payloads) (AC-F009.2, AC-F009.3)
- [x] Add preference tests: all four keys present → `subagent_type` wins; Copilot stop with `agentType` + `agentName` (no `subagent_type`) → `agentType` wins; Copilot start with only `agentName` → `agentName`; Claude `agent_type` only → that value (AC-F009.3)
- [x] Add omit tests: payload has `agentDisplayName` / `agent_display_name` / `agentDescription` / `agentId` / `subagent_id` / `task` and **none** of the four identity keys → omit `subagent` (Cursor start with only `task` is `task` only, no `subagent`) (AC-F009.4)
- [x] Keep `subagent_type: null` → `subagent: null`. Keep “body has no `session_id` / keys stay flat”; that fixture’s `  agent_type` indent assert becomes `  subagent` (AC-F009.2)
- [x] Keep functions ≤ 8 complexity (`subagentLines` / `subagentValue` / `emitYamlDocument` / `bodyLines`)

---

### Step 2: Report Subagent cell is the bare `subagent` value
F004 Details already exclude identity. After Step 1, YAML body is `subagent` not `agent_type`, so `formatSubagent` must read `subagent` or the column goes empty. Fill the cell for any event kind that has the field. Do not change `maybeWriteReport`, duration, overview, grouping, or `detailsByEvent`.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [x] `formatSubagent`: if `"subagent" in doc.body`, return `scalarText(doc.body.subagent ?? null)` only; else `""`. Do **not** use `formatFieldList`. Do not prefix `subagent:` / `agent_type:`. Do not include `agent_display_name`. Drop `subagentByEvent` if unused (AC-F009 required report behavior; F004.24 replans later)
- [x] Keep `detailsByEvent` as shipped: session start `[]`; session end `["reason"]`; subagent start `["task"]`; subagent stop `["response_text"]`; prompt `["prompt"]`; agent stop `[]`. Do not add `subagent` or `agent_type` or `agent_display_name` to Details
- [x] Update handwritten YAML fixtures that currently have `agent_type:` to `subagent:`. Update Subagent-cell asserts from `agent_type: explore` / `agent_type: explore; agent_display_name: Explore` / `agent_type: null` to bare `explore` / `explore` / `null`. Copilot start/stop with `agent_display_name` still show **only** `explore` in Subagent; Details stay `task: …` / `response_text: …` (AC-F009.1)
- [x] Add report tests: handwritten YAML for `sessionStart` / `beforeSubmitPrompt` / `stop` / unmapped `workspaceOpen` with body `subagent: builder` → Subagent cell `builder`; same kinds without `subagent` → empty cell. Do not copy identity onto a later row that omits it (AC-F009 required report behavior)
- [x] Add report test: handwritten YAML body `agent_type: explore` **without** `subagent` → Subagent cell empty (no fallback; historical keys are not migrated)
- [x] Redo 100-char Subagent preview: preview applies to the **bare** name. A 101-char `subagent` value truncates to 100 + `...`; a 100-char value has no ellipsis. Drop the old `agent_type: ${"e".repeat(100)}...` prefix budget. Long `agent_display_name` must **not** appear in the Subagent cell (AC-F004.6 stays)
- [x] Keep Details omit `transcript_path`; keep Details omit `agent_type` / `subagent` / `agent_display_name`; keep `|` cell escape, duration, overview `harness`, Event column `event`, grouping. Existing AC-F004.20 “Subagent filled only for start/stop” asserts that later rows are empty must be updated where those later-row fixtures now carry `subagent` via `yamlDoc` + payload identity keys; rows whose YAML omits `subagent` stay empty

---

### Step 3: ingestHook coverage and rebuild the harness artifact
YAML mapping already works at the emitter after Step 1. Cover AC-F009.1–5 through `ingestHook` (same persist path extra argv will invoke). Observe-only `exitCode` / stdout remain e2e. Do not change persist, `maybeWriteReport`, compact header, or F008 numbering.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/event.ts`
    - `.agents/hooks/index.mjs`
- [x] Keep `parseArgv`, `index.ts` (shebang, `readFileSync(0)`, `ingestHook({ … harness, event })`, `finally { process.exitCode = 0 }`), `sessionIdentifier`, `eventLogLine`, `persistIngest`, and the shipped F004 report-after-every-YAML-append as shipped. Do not add a command. Entry spawn/`exitCode`/stdout remains e2e (AC-F009.5)
- [x] Do not change Event log serialization to strip `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `agentId`, `subagent_id`, `task`, or `transcript_path`. Do not overlay `subagent` on the JSONL line (AC-F009.5)
- [x] Update existing ingest YAML asserts that expect `agent_type: explore` to `subagent: explore` (Cursor start/stop, Copilot start/stop, Claude start/stop, display-name order, `task` order). New YAML must **not** contain the key `agent_type:` (AC-F009.1)
- [x] Unit-test `ingestHook`: Cursor `sessionStart` / `sessionEnd` / `beforeSubmitPrompt` / `stop` / `subagentStart` / `subagentStop` with `session_id` + `subagent_type` write verbatim jsonl (deep-equals payload, still has `subagent_type`) and YAML with `subagent:` after the compact header and before other body fields (`reason` / `prompt` / `task` / `response_text` as mapped) (AC-F009.2, AC-F009.5)
- [x] Unit-test `ingestHook`: `harness: "copilot"` or `harness: ""` with Cursor payload `{ session_id, subagent_type: "explore" }` and event `subagentStart` (or `stop`) still writes `subagent: explore` — harness does not pick the key (AC-F009.3)
- [x] Unit-test `ingestHook`: unknown harness + unmapped event with `session_id` + `subagent_type` writes header + `subagent` only; Copilot `sessionId` alone (no F001 identifier) still writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` (AC-F009.2, AC-F009.5)
- [x] Unit-test `ingestHook`: preference order (all four keys → `subagent_type`; Copilot stop `agentType` + `agentName` → `agentType`); trap-only payload (`agentDisplayName` / `agentDescription` / `agentId` / `subagent_id` / `task`, no identity keys) omits `subagent`; Copilot start with `agentName` + `agentDisplayName` writes `subagent` then `agent_display_name`; `subagent` is not the label (AC-F009.3, AC-F009.4, F007)
- [x] Unit-test `ingestHook` still resolves (does not throw). Keep existing F001/F003/F004/F005/F006/F007/F008 ingest assertions (verbatim jsonl, yaml append, compact header, report-after-YAML-append `.md` gate, prompt persist, `task`, `agent_display_name`, stop without identity stays header-only, turn numbering). Do not rewrite the report gate (AC-F009.5)
- [x] `cd cli && bun run build` after `cli/src/` changes so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 4: Confirm architecture unchanged
Architecture already names six Cursor events, compact header, Subagent column, and 100-char preview. F009 adds no events. `normalized-fields.md` is amended in Step 1, not a separate architecture rewrite. Confirm-no-change only.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
- [x] Confirm `cli.arch.md` **Used by** still lists `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Do **not** edit those lists
- [x] Confirm `system.arch.md` overview still names those six events and compact header. Do **not** edit it. Do not add Copilot/Claude registrations
- [x] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other extra Cursor events. Do not change ingest report-gate wording in architecture (F004 as shipped)

---

### Step 5: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F009.5)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [x] Unit tests cover AC-F009.1–5 at lib (yaml/report emitters + ingestHook persist + `normalized-fields.md` rename) except entry argv/`exitCode`/stdout spawn, which is e2e. Existing `yaml.test.ts` / `report.test.ts` `agent_type` asserts updated so the suite stays green. Do not change `hooks.test.ts` event count (stays six)

---

### Deviations

- Spec status stays `pending`; this run does not set `planned`. Sibling e2e planify runs in parallel; the parent coordinates status after both plans exist. Leave `docs/specs/F009-subagent-name/spec.md` untouched.
- No git commit (parent instruction). Write `cli.plan.md` only. Do not write `e2e.plan.md`.
- `docs/normalized-fields.md` amend is `/codify` Step 1, not this planify commit. Rename `agent_type` → `subagent` on start/stop rows only; keep `task` and `agent_display_name` exceptions.
- No `.cursor/hooks.json` change. Hooks stay the six from F006. F009 does not add a registration. No `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- No architecture event-list change. `cli.arch.md` and `system.arch.md` already name six Cursor events and compact header; Step 4 is confirm-no-change only. `/codify` does not amend those files.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `emitSessionReport` / `ingestHook` by importing `cli/src`.
- Do not amend F003/F004/F006/F007 specs or their plans. F004.24 will replan the Subagent cell later; this plan still owns the `report.ts` `formatSubagent` change so the YAML rename does not empty the column.
- Do not migrate historical YAML. New documents write `subagent`, never `agent_type`. Report does not fall back to body `agent_type`.
- Identity must **not** go through `bodyLines` harness column. Copilot fixtures that used `subagent_type` as a harness-column trap must be rewritten for preference order.
- Existing `cli/test/yaml.test.ts` and `cli/test/report.test.ts` assertions on `agent_type` must be updated in this container so the suite stays green.
- Do not overlay `subagent` on JSONL. `subagent_type`, `agent_type`, `agentType`, `agentName`, `agentDisplayName`, `agentDescription`, `task`, and `transcript_path` stay on the Event log line (F001 verbatim).
- Do not use `agentDisplayName` / `agent_display_name` as a fallback for `subagent`. Copilot start identity source stays `agentName` when that is the first present preferred key; Copilot stop stays `agentType` when that is the first present preferred key among the four. Tests must use different values for slug vs label (e.g. `agentName: "explore"` vs `agentDisplayName: "Explore"`).
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not change `maybeWriteReport`, duration, overview `harness`, F008 numbering, or compact header keys.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- `/codify`: YAML exact-string for `subagent: explore` is unquoted (`needsQuote` does not trigger). Report Subagent cell is unquoted `explore`. Present null is YAML `null` and report cell `null`.

---

> last updated: 2026-09-02T09:51:00Z
