---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest that appends a Session YAML log document (payload has an F001 session identifier), after that document is in `{session_id}.yaml`, write `{session_id}.md` in the same daily folder. Produce the report only from that YAML file (every document, file order, no re-sort), including when no session-end document is present. Same invocation. No second process. No new CLI command. No new hook registrations (F001 / F005 / F006). This spec does not replace F001–F003 or F005–F009. This amend is report-only: the Subagent cell is the **bare** `subagent` value whenever that field is present (any event kind), with no field-name prefix and no `agent_display_name`; Details exclude `subagent` (not `agent_type`). YAML persistence of `subagent` is F003 / F009. Compact headers (`harness` / `event`; `session_id` only on the initial session-start), grouping, duration, and overview labels stay as shipped. Do not change YAML emit, body mapping, or F008 numbering. Do not migrate old `source_*` or `agent_type` keys. AC-F004.20 is retired.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current** for this F009 report-consumer amend. Ingest already writes `{session_id}.md` after every YAML append; argv does not gate the report; six Cursor events; F008 numbering already in ingest (0.14.0); four-column per-turn tables, 100-char preview, compact `harness` / `event` labels, and overview `session_id` from the filename stem already shipped. [`cli.arch.md`](../../arch/cli.arch.md) and [`model.schema.md`](../../model/model.schema.md) already name the Subagent cell as the bare `subagent` value. This plan does **not** amend architecture. `/codify` has no architecture step.

Grounding (F004 shipped 0.10.0 session-end-gate drop, 0.13.0 per-turn grouping / Subagent column / 100-char preview; F008 numbering 0.14.0; compact-header report labels 0.16.0; F009 `subagent` and bare Subagent cell 0.17.0; this is an amend/replan of AC-F004.22 Details exclude + AC-F004.24 after F009):

- `cli/src/report.ts`: **already** implements AC-F004.24. `formatSubagent` is `if (!("subagent" in doc.body)) return ""; return scalarText(doc.body.subagent ?? null);` — no `formatFieldList`, no `subagentByEvent`, no `agent_type` / `agent_display_name` prefix. `detailsByEvent` lists remaining body only (`task` / `response_text` / `reason` / `prompt`); it does **not** list `subagent` or `agent_display_name`. Compact `YamlDoc` / `headerKeys` (`session_id`, `harness`, `event`, `timestamp`, `turn`), overview stem, counts/Event column `event`, grouping, duration, and 100-char `preview` stay. **Do not rewrite `formatSubagent`** unless a new test proves a gap. `/codify` confirms that helper and `detailsByEvent`, then adds missing unit titles. Do not add a YAML library. Do **not** fall back to `agent_type`
- `cli/src/ingest.ts`: `maybeWriteReport` already writes after any YAML append (`sessionId` defined) via `writeSessionReport({ yamlPath, mdPath })`. Persist-then-isolate-report stays. **Keep.** Do **not** redo the 0.10.0 session-end-gate drop. F008 numbering is **already in ingest**. Do **not** pass hardcoded `turn: 0`
- `cli/src/yaml.ts`: F003 / F009 already emit compact headers and `subagent` after the header when a matching payload key is present. **Do not** change it. This amend is **report-only**
- `cli/src/store.ts`: `persistIngest` under `ingest.lock` still does not write `.md`. F008 numbering already runs under the lock. Keep it
- `cli/src/argv.ts` / `cli/src/index.ts` / `cli/src/event.ts`: keep. Positionals are YAML-header only; they do **not** gate the report
- `.cursor/hooks.json`: six events (F001/F005/F006). Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/report.test.ts`: compact labels, grouping, duration, filename-stem overview, and bare Subagent cell cases already exist. **Still to change:** retitle; drop the AC-F004.20 title; AC-F004.22 Details asserts exclude `subagent` (not `agent_type` as the identity field); add AC-F004.24 titles on the F009 “any event kind” / no-inheritance / no-display-name / no-`agent_type`-fallback cases. Do not duplicate those fixtures
- `cli/test/ingest.test.ts`: report-side asserts already use `| harness |` / `| event | count |` / four-column headers. Keep overwrite Time-row count. Do **not** rewrite YAML-file exact-string header or `subagent:` emit asserts — those are F003 / F009. Do not change when `.md` is written
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** production `report.ts` edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except this invocation may **read** the Session YAML log after the document just appended is present, including each document’s `turn`), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not redo F008 numbering, compact-header parse, overview stem, grouping, or duration. Do not register hooks. Do not add a YAML npm package. Do not change `docs/normalized-fields.md`. Do not migrate mixed historical YAML

Unit tests cover AC-F004.2, .6–.11, .13–.14, .16, .18–.19, .21–.24 at lib except entry spawn/`exitCode` (those are e2e). Drop AC-F004.1, .3, .4, .5, .12, .15, .17, **.20**. Unchecked this amend: **AC-F004.22**, **AC-F004.24**. Other F004 ACs stay shipped (keep): .2 .21 .18 .19 .6 .7 .8 .9 .10 .11 .13 .14 .16 .23.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003), each with integer `turn` (F008). New documents use compact headers: `harness` / `event`; `session_id` only on the initial session-start. After the header, `subagent` may appear on any event kind when a matching payload attribute is present (F009). The filename stem is always the F001 identifier.

This feature’s fourth daily artifact: **Session report** — one `{session_id}.md` per session that received a YAML document that day; Markdown with tables; overwritten on every later YAML append for that session the same day; events grouped by `turn`; each per-turn table has Time, Event, Subagent, and Details. This container owns the Markdown emitter. Subagent is the bare `subagent` value when that field is present; Details are the remaining normalized body fields excluding `session_id`, `subagent`, and `agent_display_name`.

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, YAML, project root, and day folder stay as F003. Session YAML log uses compact headers (`harness` / `event`; `session_id` only on the initial session-start). After the header, `subagent` may appear on any document when a matching payload attribute is present (F009). F008 numbering is already shipped (0.14.0); this amend reads `turn`. Session report is written after every YAML append. Argv does not gate the report. Subagent cell is the bare `subagent` value (AC-F004.24). Details exclude `subagent` and `agent_display_name` (AC-F004.22).

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
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields on **new** documents: `harness` and `event` (not `source_harness` or `source_event`). `session_id` only on the initial session-start document (`event` `sessionStart` / `SessionStart` when that session’s YAML log does not already contain a session-start document). This F004 amend **reads** those keys. Do not emit them here (F003 owns `yaml.ts`). Do not migrate old `source_*` keys. Mixed historical YAML is out of scope.
  - Initial session-start (has `session_id`), in this order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
  - Every other document (no `session_id`), in this order: `harness`, `event`, `timestamp`, `turn`.
  - `session_id` when present = the F001 session identifier (same as the filename stem). When the first event for a session is not session-start, no document gets `session_id`; the filename still uses the F001 identifier.
  - `harness` / `event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008 shipped 0.14.0; not a body field). This F004 amend **reads** `turn`. Do not change numbering. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- After the compact header, when a matching `subagent` source attribute is present (F009), the document has `subagent` first (before any other body field). Extraction is F009. This spec does not duplicate those ACs. This report **reads** body `subagent` when present. Omit when absent. Present `null` is YAML `null`. New documents write `subagent`, never `agent_type`.
- Other body after `subagent` (or after the header when omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the filename, and on the initial session-start header when present), using those snake_case names, in table order.
- Event kinds: session start; session end; subagent start; subagent stop; user prompt; agent stop (names in `docs/events-args.md`).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (payload has a session identifier), after that document is in the file. Do **not** require `event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the JSONL payload. Still produce a report when no session-end document is in the file. Argv does not gate the report.
- Produce only from that session’s Session YAML log (every document, file order, no re-sort). Read `turn` from each YAML document. Do not read the Event log or Session index.
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later YAML append for the same session the same day; do not append a second report.
- Overview: `session_id` = the F001 identifier (filename stem already used for that session); `harness` from the **last** document (the ingest that just ran), not from a session-end document; start = first document `timestamp`; end = last document `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those documents’ `event`. Do **not** require `session_id` on every YAML document. When the first document has `session_id`, it matches; when omitted, still show the F001 identifier. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`. Session overview stays session-level.
- Event-count summary: total YAML documents; count per distinct `event` (first-seen order); table header `event`. Counts stay session-level, not per-turn.
- One Markdown subsection per distinct `turn` that appears, in ascending turn-number order. No session-wide Events table. When no document has `turn` 0, omit a turn-0 subsection; do not invent an empty turn 0. Do not invent missing intermediate turns.
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind document (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s documents in file order with four columns in this order: Time, Event, Subagent, Details. Event column is YAML `event`. Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present). Do not nest subagents.
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind document.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind document `timestamp` (first prompt-kind in that turn’s file-order docs if more than one); end = the last document in the file that has `turn: n`. For turn **0**, start = the first document with `turn: 0`; end = the last document with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind document, start = the first document of that turn so Duration still emits.
- Subagent cell: when the document body has `subagent`, the cell is **only that field’s value** (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar). Fill the cell for **any** event kind when `subagent` is present on that document (session start/end, user prompt, agent stop, subagent start/stop, header-only unmapped), not only start/stop. When `subagent` is absent, Subagent is empty. Present values including YAML `null` appear as that value (`null`). `agent_display_name` must **not** appear in the Subagent cell (it stays in YAML per F007 when Copilot sends it). Do **not** fall back to `agent_type`. Do **not** reconstruct parent→subagent hierarchy. Do **not** copy `subagent` onto later documents that omit it.
- Details: remaining normalized body fields from `docs/normalized-fields.md` excluding `session_id` and excluding `subagent` / `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty (`subagent` when present is the Subagent cell, not Details). Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; Copilot persists it in YAML when present and it stays out of Details and out of the Subagent cell; `task` still Copilot/Claude-absent (F006); omit absent fields.
- Preview: value longer than **100** characters → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same preview for Details cells, Subagent cells, and the per-turn prompt line. Subagent preview applies to the **bare** name (no `subagent:` prefix budget).
- List subagent start and stop as ordinary chronological rows inside that turn’s table. Do not nest a subagent under a parent, and do not nest further inside a turn.
- When report generation fails: still persist F001/F003, exit 0, no blocking stdout.
- No YAML parsing library. No new CLI command. No new hook registrations. This F004 amend does not change hooks.json.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After persist returns, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the YAML header (`harness` / `event`). They do **not** gate the Session report (any YAML-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged by this F004 amend. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Parse `turn` and emit per-turn subsections | keep | grouping and turn duration already shipped. Nested compact-key redo is done (0.16.0) |
| Compact YAML keys in the report consumer | keep | overview `harness` / `event`, filename-stem `session_id`, counts header `event`, Event column `event` already shipped. Nested AC-F004.20 Subagent `{name}: {value}` map is stale (superseded by Step 2) |
| Wire report into ingest after YAML persist | keep | already writes after every YAML append (`sessionId` defined); persist-then-isolate-report stays. Do not redo the 0.10.0 session-end-gate drop. Do not redo F008 numbering |
| Amend architecture and model schema | keep | `cli.arch.md` and `model.schema.md` already name four-column tables and the bare `subagent` Subagent cell. Do not amend architecture in this planify run or `/codify` |
| Re-verify remaining ACs | redo | drop AC-F004.20 coverage; retitle AC-F004.22 Details exclude `subagent`; add AC-F004.24 titles; keep grouping/duration/overview/compact-label asserts |
| AC-F004.20 Subagent `{name}: {value}` on start/stop only | drop | deprecated 2026-09-02; Subagent cell is AC-F004.24 |

Deprecated ACs stay drop (not prior implementation steps): AC-F004.1, .3, .4, .5, .12, .15, .17, .20.

## Implementation Steps

### Step 1: Details exclude `subagent` (AC-F004.22)
Keep grouping, four-column tables, Event column `event`, and `detailsByEvent` remaining-field lists. Redo the identity-exclude wording: Details omit `subagent` and `agent_display_name`, not `agent_type`. Do not add `subagent` to Details. Do not rewrite `formatDetails` unless a new test proves a leak. Do not redo turn grouping or compact labels.
- Paths:
    - `cli/src/report.ts` (read-only confirm)
    - `cli/test/report.test.ts`
- [x] Confirm `detailsByEvent` still lists only remaining body fields (`sessionStart` / `SessionStart` empty; `sessionEnd` / `SessionEnd` `reason`; `subagentStart` / `SubagentStart` `task`; `subagentStop` / `SubagentStop` `response_text`; prompt kinds `prompt`; `stop` / `agentStop` / `Stop` empty). Confirm it does **not** list `subagent` or `agent_display_name`. Unmapped `event` still returns empty Details via `fields === undefined`. Do not edit `formatDetails` / `formatFieldList` unless a new test proves a bug (AC-F004.22)
- [x] Keep `YamlDoc.turn`, `integerField` / `parseTurnValue`, `turnGroups`, `turnDuration`, `turnPrompt`, `turnSection`. Missing/invalid `turn` still → `0`. Do not redo grouping or duration logic (AC-F004.18, AC-F004.22)
- [x] Keep compact parse: `headerKeys` = `session_id`, `harness`, `event`, `timestamp`, `turn`; Event column `doc.event`; no `source_harness` / `source_event` fallback (AC-F004.21, AC-F004.22, AC-F004.23)
- [x] Retitle grouping tests with AC-F004.22 (`groups subsections by turn…`, omit empty turn 0, skip-middle does not invent, four columns Time / Event / Subagent / Details, `line.split("|").length === 6`, no `## Events`). Do not change those fixtures (AC-F004.22)
- [x] Retitle Details mapping tests with AC-F004.22 (`Details follow event fields…`, `Details keep task without identity…`). Assert Details cells do **not** contain `subagent` (the identity field) or `agent_display_name`; keep `task` / `response_text` / `reason` / `prompt` mapping, present `null`, header-only empty, `transcript_path` omitted. Historical `agent_type` on a document without `subagent` still must not appear in Details (unmapped extra). Prefer `details.includes("subagent") === false` over `agent_type` as the identity-exclude check; a leftover `agent_type` assert may stay as “historical key is not shown” (AC-F004.22)
- [x] Keep locked Markdown shape for sessionStart then sessionEnd (compact `harness` / `event` labels; empty Subagent cells when those docs omit `subagent`) (AC-F004.8, AC-F004.21, AC-F004.22, AC-F004.23)

| kind | `event` aliases | Subagent | Details fields |
|------|-----------------|----------|----------------|
| sessionStart | `sessionStart`, `SessionStart` | bare `subagent` when present | *(empty)* |
| sessionEnd | `sessionEnd`, `SessionEnd` | bare `subagent` when present | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | bare `subagent` when present | `task` |
| subagentStop | `subagentStop`, `SubagentStop` | bare `subagent` when present | `response_text` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | bare `subagent` when present | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | bare `subagent` when present | *(empty)* |
| unmapped | any other header `event` | bare `subagent` when present | *(empty)* |

---

### Step 2: Subagent cell is the bare `subagent` value (AC-F004.24)
F009 0.17.0 already changed `formatSubagent`. `/codify` confirms that helper and adds missing unit titles. Do not restore `subagentByEvent` or `{name}: {value}` prefixes. Do not show `agent_display_name`. Do not copy identity onto later rows. Do not rewrite `formatSubagent` unless a new test proves a gap.
- Paths:
    - `cli/src/report.ts` (read-only confirm)
    - `cli/test/report.test.ts`
- [x] Confirm `formatSubagent`: if `"subagent" in doc.body`, return `scalarText(doc.body.subagent ?? null)` only; else `""`. Confirm there is **no** `subagentByEvent`. Confirm it does **not** call `formatFieldList`. Confirm it does **not** read `agent_display_name` or `agent_type`. Do not edit this helper unless a new test proves a bug (AC-F004.24)
- [x] Drop the test title `AC-F004.20 Subagent filled only for start/stop identity; later rows empty`. Retitle the keepable asserts under AC-F004.24: Copilot start/stop Subagent is bare `explore` (not `subagent: explore` / `agent_type: explore` / `agent_display_name: Explore`); Details still `task` / `response_text` only; later `stop` / prompt rows whose YAML omits `subagent` stay empty (no inheritance). Do not keep a pass condition that Subagent is empty on non-start/stop kinds that **have** `subagent` (AC-F004.24)
- [x] Retitle `Subagent cell is the bare subagent value on any event kind` with AC-F004.24. Keep handwritten YAML for `sessionStart` / `beforeSubmitPrompt` / `stop` / unmapped `workspaceOpen` with `subagent: builder` → cell `builder`, same kinds without the field → empty. If a kind is missing from that loop, add it as a title/case not a src change: `sessionEnd`, `subagentStart` / `SubagentStart`, `agentStop` / `Stop` (AC-F004.24)
- [x] Retitle `historical agent_type without subagent leaves the Subagent cell empty` with AC-F004.24 (no fallback; mixed historical YAML is out of scope to migrate, but the consumer must not treat `agent_type` as the cell) (AC-F004.24)
- [x] Confirm present YAML `null` → Subagent cell `null` (existing `subagent_type: null` / `subagent: null` fixtures). Confirm a 101-char `subagent` value truncates to 100 + `...` and a 100-char value has no ellipsis; long `agent_display_name` must **not** appear in the cell (AC-F004.6, AC-F004.24)
- [x] Keep consecutive subagent start/stop as ordinary rows without nesting (AC-F004.7)

---

### Step 4: Re-verify remaining ACs
Keep ingest wiring, F008 numbering, compact labels, grouping, and duration. Drop AC-F004.20 from the coverage list. Do not change when the report is written. Do not change `yaml.ts`.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/index.ts`
    - `cli/src/argv.ts`
    - `cli/test/ingest.test.ts`
    - `cli/test/report.test.ts`
    - `cli/package.json`
    - `cli/.oxlint.json`
    - `.agents/hooks/index.mjs`
- [x] Keep `parseArgv`, `index.ts`, `sessionIdentifier`, `eventLogLine`, `persistIngest`, and `maybeWriteReport` (write when `sessionId` is defined; try/catch; no session-end gate) as shipped. Do not add a report command. Do not change `.cursor/hooks.json`. Do **not** pass hardcoded `turn: 0` from ingest (AC-F004.9, AC-F004.10, AC-F004.14)
- [x] Keep ingest report-side asserts: `| harness |`; `| event | count |`; `| Time | Event | Subagent | Details |`; overwrite Time-row count (`/^\| \d{2}:/`); round-trip `md === emitSessionReport(parseYamlDocuments(yaml), stem)`. Do **not** keep a pass condition that requires `source_harness` / `source_event` as report labels, `## Events`, an 80-char ellipsis, or AC-F004.20 start/stop-only Subagent (AC-F004.16, AC-F004.21, AC-F004.22, AC-F004.23, AC-F004.24)
- [x] Do **not** rewrite YAML-file exact-string header or `subagent:` emit asserts in `ingest.test.ts`. F003 / F009 own those
- [x] Keep: YAML-appending events write `.md`; Copilot `sessionId` only writes no `.md`; report path does not consult jsonl; `writeSessionReport` throw still isolated (AC-F004.8, AC-F004.9, AC-F004.11, AC-F004.13, AC-F004.14)
- [x] Keep F008 ingest numbering tests. This amend does not change numbering
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F004.10)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8 for `formatSubagent` / `formatDetails` / `formatFieldList` / `turnGroups` / `turnDuration` / `turnPrompt` / `turnSection` / `emitSessionReport` / `writeSessionReport` / `overviewSection` / `eventCounts` / `preview`. Expect **no** production `report.ts` diff unless a test gap forces a fix
- [x] Unit tests cover AC-F004.2, .6–.11, .13–.14, .16, .18–.19, .21–.24 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Unchecked this amend covered at lib: **AC-F004.22** (turn subsections; Details exclude `subagent` / `agent_display_name`), **AC-F004.24** (bare `subagent` value, any event kind when present, no prefix, no display name, no inheritance). Shipped keep: AC-F004.2, .6–.11, .13–.14, .16, .18–.19, .21, .23. Do **not** keep tests whose pass condition is AC-F004.1, .3, .4, .5, .12, .15, .17, or **.20**
- [x] Leave `hooks.test.ts` asserting the current six shell-string commands (F004 does not add or remove hooks)
- [x] Skip `bun run build` unless a production `cli/src/` file actually changes. If it does: `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Deviations

- Spec status stays `pending` this run (sibling e2e planify is in parallel). Do **not** set `planned` here. `/codify` sets `in-progress`.
- No git commit (parent instruction). Write `cli.plan.md` only. Do not write `e2e.plan.md`. Do not amend architecture. Do not change F009 extraction / preference order / mapping-table rename.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is current for this amend: ingest already writes `.md` after every YAML append; four-column / 100-char / compact labels / bare Subagent cell already described. This planify run does not amend those files; `/codify` has no architecture step.
- Wire-report-into-ingest is **keep**. Do not redo the 0.10.0 session-end-gate drop. Compact-header report labels, grouping, duration, and overview stem are **keep**.
- `cli/src/report.ts` needs **no** production code for this amend. `/codify` confirms `formatSubagent` / `detailsByEvent` and adds unit titles/cases only. Do not restore `subagentByEvent`. Do not prefix the Subagent cell. Do not put `subagent` in Details.
- F008 numbering is already in ingest (released 0.14.0). Do not redo numbering. Do not pass hardcoded `turn: 0`.
- YAML compact emit and F009 `subagent` persist are F003 / F009. This container must not change `yaml.ts`. Mixed historical YAML (`source_*`, per-doc `session_id`, body `agent_type`) is out of scope to migrate; the report must not treat `agent_type` as the Subagent cell.
- Cursor registration stays six events (F001 / F005 / F006). This plan does not add or remove hooks.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseYamlDocuments` / `emitSessionReport` / `writeSessionReport` by importing `cli/src`.
- No YAML parsing library: the report parser accepts only F003’s fixed-structure multi-document key-value YAML. It is not a general YAML 1.1 parser.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F003 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Session overview duration uses first and last `HH:MM:SS` on that calendar day only, regardless of `event`. Turn duration uses that turn’s prompt-kind (or first/last turn-0) timestamps. Never Cursor `duration_ms`. Inverted and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|`. Newlines are spaces before the 100-character preview limit. The Prompt line and Subagent cell use the same `preview` on the **bare** value.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML, no Markdown (AC-F004.13).
- F001 stdin decode and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers jsonl, index, YAML). Report is written after persist returns. A later YAML append the same day overwrites `.md`.
- `/codify`: spec status set to `in-progress`. Do not reopen compact-header parse, grouping, or duration. Do not rewrite `formatSubagent` unless a test gap proves a bug.

---

> last updated: 2026-09-02T10:38:44Z
