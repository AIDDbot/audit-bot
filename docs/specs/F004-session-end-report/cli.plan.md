---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest that appends a Session JSONL log record (payload has an F001 session identifier), after that record is in `{session_id}.jsonl`, write `{session_id}.md` in the same daily folder. Produce the report only from that Session JSONL log (every record, file order, no re-sort), including when no session-end record is present. Same invocation. No second process. No new CLI command. No new hook registrations (F001 / F005 / F006). This spec does not replace F001–F003, F005–F008, or F010. This amend (C001 / F010) is **report-source only**: the Markdown `{session_id}.md` is unchanged (duration, counts, turn grouping, Subagent cell, 100-character previews). Do not read `events.jsonl` or `sessions.json`. F003 still owns mapping. F010 owns format, filename, and serialization. F008 owns turn numbering. Compact headers (`harness` / `event`; `session_id` only on the initial session-start) stay. Do not migrate or rewrite old `{session_id}.yaml`. AC-F004.20 is retired.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **already names** Session JSONL log `{session_id}.jsonl`, `src/yaml.ts` as the normalized session JSONL record, `src/store.ts` Session JSONL log under `ingest.lock`, and `src/report.ts` Session report from Session JSONL log. Ingest already writes `{session_id}.md` after every Session JSONL append; argv does not gate the report; six Cursor events; F008 numbering already in ingest; four-column per-turn tables, 100-char preview, compact `harness` / `event` labels, overview `session_id` from the filename stem, and bare Subagent cell already shipped. This plan does **not** amend architecture. `/codify` has no architecture step.

Grounding (F004 shipped 0.10.0 session-end-gate drop, 0.13.0 per-turn grouping / Subagent column / 100-char preview; F008 numbering 0.14.0; compact-header report labels 0.16.0; F009 `subagent` and bare Subagent cell 0.17.0; F010 production already parses `{session_id}.jsonl` for the report; this amend/replan is the report **source file** onto Session JSONL log):

- `cli/src/report.ts`: **already** `parseSessionRecords` (`JSON.parse` each non-empty line, file order, no re-sort) and `writeSessionReport({ jsonlPath, mdPath })`. `emitSessionReport` Markdown stays (duration, counts, `turnGroups`, Subagent, 100-char `preview`, Details). `headerKeys` = `session_id`, `harness`, `event`, `timestamp`, `turn`. Overview stem from `path.parse(jsonlPath).name`. Empty file still throws `"empty jsonl"`. **Do not rewrite** `formatSubagent`, `detailsByEvent`, grouping, duration, or preview unless a new test proves a gap. Do not read `events.jsonl` or `sessions.json`. Do not add a YAML or JSON library (platform `JSON.parse` is allowed). Leftover: helper `yamlDoc` (already emits JSONL via `emitSessionRecord`); titles `throws on empty yaml text`, `parser accepts … YAML null`, `parses YAML integer turn`, `AC-F004.23 … when YAML omits it`
- `cli/src/ingest.ts`: `maybeWriteReport` **already** writes after any Session JSONL append (`sessionId` defined) via `writeSessionReport({ jsonlPath: …{sessionId}.jsonl, mdPath })`. Persist-then-isolate-report stays. **Keep.** Do **not** redo the 0.10.0 session-end-gate drop. F008 numbering is **already in ingest**. Do **not** pass hardcoded `turn: 0`
- `cli/src/yaml.ts`: F010 / F003 already emit compact JSONL records. **Do not** change it. This amend is **report-only**
- `cli/src/store.ts`: `persistIngest` under `ingest.lock` still does not write `.md`. F008 numbering already runs under the lock. Keep it
- `cli/src/argv.ts` / `cli/src/index.ts` / `cli/src/event.ts`: keep. Positionals are JSONL-header only; they do **not** gate the report
- `.cursor/hooks.json`: six events (F001/F005/F006). Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/report.test.ts`: compact labels, grouping, duration, filename-stem overview, bare Subagent, and JSONL parse already exist. **Still to change:** rename `yamlDoc` → a JSONL helper; drop YAML-as-source titles; AC-F004.23 title “when JSONL omits `session_id`”; empty-file title is empty JSONL. Do not change Markdown fixtures or pass conditions (duration / counts / turns / Subagent / 100-char)
- `cli/test/ingest.test.ts`: report-side asserts already use `| harness |` / `| event | count |` / four-column headers and read `{sessionId}.jsonl`. Leftover F004 titles still say YAML: `writes md matching emitSessionReport of the yaml`; `writes yaml and md`; `later YAML append … from the yaml`; `md is derived from yaml without consulting jsonl`; `report write failure still persists jsonl yaml and index`. Bindings named `yaml` already hold JSONL text. Retitle those F004 tests onto Session JSONL vs Event log. Do **not** retitle F003 / F005 / F006 / F008 / F010 tests. Keep overwrite Time-row count. Do not change when `.md` is written
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** production `report.ts` edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, Session JSONL log append-only rules (except this invocation may **read** the Session JSONL log after the record just appended is present, including each record’s `turn`), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not redo F008 numbering, F010 emit/scan, compact-header parse, overview stem, grouping, duration, Subagent cell, or 100-char preview. Do not register hooks. Do not add a YAML or JSON npm package. Do not change `docs/normalized-fields.md`. Do not migrate mixed historical YAML

Unit tests cover AC-F004.2, .6–.11, .13–.14, .16, .18–.19, .21–.24 at lib except entry spawn/`exitCode` (those are e2e). Drop AC-F004.1, .3, .4, .5, .12, .15, .17, **.20**. Unchecked this amend (spec text now says Session JSONL log): **AC-F004.2**, **AC-F004.21**, **AC-F004.22**, **AC-F004.8**, **AC-F004.9**, **AC-F004.10**, **AC-F004.14**, **AC-F004.23**, **AC-F004.16**. Checked keep (no YAML in spec AC text; Markdown unchanged): .24 .18 .19 .6 .7 .11 .13.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (F010), mapped by F003, each with integer `turn` (F008). The filename stem is always the F001 identifier.

This feature’s fourth daily artifact: **Session report** — one `{session_id}.md` per session that received a Session JSONL log record that day; Markdown with tables; overwritten on every later Session JSONL log append for that session the same day; events grouped by `turn`; each per-turn table has Time, Event, Subagent, and Details. This container owns the Markdown emitter. Subagent is the bare `subagent` value when that field is present; Details are the remaining normalized body fields excluding `session_id`, `subagent`, and `agent_display_name`. Source file is `{session_id}.jsonl` (not `{session_id}.yaml`).

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the F010 Session JSONL log. Compact header + mapping stay F003/F009. Format, filename, and serialization stay F010. F008 numbering is already shipped; this amend reads `turn`. Session report is written after every Session JSONL append. Argv does not gate the report. Subagent cell is the bare `subagent` value (AC-F004.24). Details exclude `subagent` and `agent_display_name` (AC-F004.22).

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
- Do **not** merge the Session JSONL log into this file. Do **not** read this file to produce the Session report.

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
- Do **not** read this file to produce the Session report.

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
- `turn` is a JSON number (F008 shipped; not a body field). This F004 amend **reads** `turn`. Do not change numbering. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written objects.
- Body after the header stays F003 / F009 / F007 / F006. After the compact header, `subagent` may appear when a matching payload attribute is present (F009). This report **reads** `subagent` when present.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log record (payload has a session identifier), after that record is in the file. Do **not** require `event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the Event log payload. Still produce a report when no session-end record is in the file. Argv does not gate the report.
- Produce only from that session’s Session JSONL log (every record, file order, no re-sort). Read `turn` from each JSONL record. Do not read the Event log (`events.jsonl`) or the Session index (`sessions.json`).
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later Session JSONL log append for the same session the same day; do not append a second report.
- Overview: `session_id` = the F001 identifier (filename stem already used for that session); `harness` from the **last** record (the ingest that just ran), not from a session-end record; start = first record `timestamp`; end = last record `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those records’ `event`. Do **not** require `session_id` on every JSONL record. When the first record has `session_id`, it matches; when omitted, still show the F001 identifier. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`. Session overview stays session-level.
- Event-count summary: total JSONL records; count per distinct `event` (first-seen order); table header `event`. Counts stay session-level, not per-turn.
- One Markdown subsection per distinct `turn` that appears, in ascending turn-number order. No session-wide Events table. When no record has `turn` 0, omit a turn-0 subsection; do not invent an empty turn 0. Do not invent missing intermediate turns.
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind record (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s records in file order with four columns in this order: Time, Event, Subagent, Details. Event column is JSONL `event`. Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present). Do not nest subagents.
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind record.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind record `timestamp` (first prompt-kind in that turn’s file-order records if more than one); end = the last record in the file that has `turn: n`. For turn **0**, start = the first record with `turn: 0`; end = the last record with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind record, start = the first record of that turn so Duration still emits.
- Subagent cell: when the record has `subagent`, the cell is **only that field’s value** (the name), with no field-name prefix (`agent_type:`, `subagent:`, `agent_display_name:`, or similar). Fill the cell for **any** event kind when `subagent` is present. When `subagent` is absent, Subagent is empty. Present values including JSON `null` appear as that value (`null`). `agent_display_name` must **not** appear in the Subagent cell. Do **not** fall back to `agent_type`. Do **not** reconstruct parent→subagent hierarchy. Do **not** copy `subagent` onto later records that omit it.
- Details: remaining normalized body fields from `docs/normalized-fields.md` excluding `session_id` and excluding `subagent` / `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty (`subagent` when present is the Subagent cell, not Details). Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; Copilot persists it in the Session JSONL log when present and it stays out of Details and out of the Subagent cell; `task` still Copilot/Claude-absent (F006); omit absent fields.
- Preview: value longer than **100** characters → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same preview for Details cells, Subagent cells, and the per-turn prompt line. Subagent preview applies to the **bare** name (no `subagent:` prefix budget).
- List subagent start and stop as ordinary chronological rows inside that turn’s table. Do not nest a subagent under a parent, and do not nest further inside a turn.
- When report generation fails: still persist F001/F010/F003, exit 0, no blocking stdout.
- No YAML parsing library. No JSON library (platform `JSON.parse` is allowed). The report must **accept** the Session JSONL log as F010 writes it (one JSON object per line). An ingest must **not** migrate or rewrite old `{session_id}.yaml`. No new CLI command. No new hook registrations. This F004 amend does not change hooks.json. Mixed historical YAML is out of scope.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report. Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the JSONL header (`harness` / `event`). They do **not** gate the Session report (any Session-JSONL-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged by this F004 amend. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Parse `turn` and emit per-turn subsections | keep | grouping and turn duration already shipped. Parser already JSONL (F010). Do not redo Markdown grouping |
| Compact YAML keys in the report consumer | keep | overview `harness` / `event`, filename-stem `session_id`, counts header `event`, Event column `event` already shipped. Source objects are JSONL records, not YAML documents |
| Wire report into ingest after YAML persist | redo | production already points `writeSessionReport` at `{session_id}.jsonl`. Leftover F004 ingest titles still say YAML persist / “from the yaml”. Do not redo the 0.10.0 session-end-gate drop. Do not redo F008 numbering |
| Amend architecture and model schema | keep | `cli.arch.md` and `model.schema.md` already name Session JSONL log and report-from-JSONL. Do not amend architecture in this planify run or `/codify` |
| Details exclude `subagent` (AC-F004.22) | keep | Markdown Details unchanged. Retarget observation only if a title still says YAML documents |
| Subagent cell is the bare `subagent` value (AC-F004.24) | keep | AC-F004.24 shipped; spec AC has no YAML. Do not rewrite `formatSubagent` |
| Re-verify remaining ACs | redo | retitle leftover YAML-as-source (`yamlDoc`, empty yaml, YAML omits `session_id`, md from yaml not jsonl). Unchecked ACs .2 .21 .22 .8 .9 .10 .14 .23 .16. Leave checked .24 .18 .19 .6 .7 .11 .13 |
| AC-F004.20 Subagent `{name}: {value}` on start/stop only | drop | deprecated 2026-09-02; Subagent cell is AC-F004.24 |

Deprecated ACs stay drop (not prior implementation steps): AC-F004.1, .3, .4, .5, .12, .15, .17, .20.

## Implementation Steps

### Step 1: Report parser reads Session JSONL in file order (AC-F004.2)
Production already `parseSessionRecords` / `writeSessionReport({ jsonlPath })`. Keep Markdown `emitSessionReport`. Redo leftover YAML helper names and titles. Do not re-sort records. Do not read `events.jsonl`. Do not add a YAML or JSON library.
- Paths:
    - `cli/src/report.ts` (read-only confirm)
    - `cli/test/report.test.ts`
- [ ] Confirm `parseSessionRecords` splits on `"\n"`, skips empty lines, `JSON.parse` each line, maps to `SessionRecord` in file order. Confirm `writeSessionReport` reads `jsonlPath` only (not `events.jsonl`, not `sessions.json`, not `{session_id}.yaml`). Confirm empty file throws `"empty jsonl"`. Do not edit the parser unless a new test proves a bug (AC-F004.2, AC-F004.11)
- [ ] Rename helper `yamlDoc` to a JSONL name (`jsonlRecord` / `sessionLine`). It already calls `emitSessionRecord`. Bindings named `yaml` that hold JSONL text become `jsonl` / `text`. Do not change the emitted Markdown (AC-F004.2)
- [ ] Retitle `throws on empty yaml text` → empty JSONL. Retitle `parser accepts F003 quoted timestamp, block scalar, empty harness, and YAML null` off YAML (JSON `null` / JSON strings). Retitle `parses YAML integer turn…` → JSON-number `turn` (`typeof === "number"`; missing/invalid → 0) (AC-F004.2, AC-F004.18)
- [ ] Keep file-order vs timestamp-sort fixtures (later clock first, earlier prompt second). Assert turn-table row order follows JSONL file order, not Time sort (AC-F004.2)
- [ ] Keep `headerKeys` = `session_id`, `harness`, `event`, `timestamp`, `turn`; Event column `doc.event`; no `source_harness` / `source_event` fallback (AC-F004.21, AC-F004.22, AC-F004.23)

---

### Step 2: Ingest writes `{session_id}.md` after Session JSONL persist
`maybeWriteReport` already uses `{sessionId}.jsonl`. Keep persist-then-isolate. Redo F004 ingest titles that still name YAML as the report source. Do not change when `.md` is written. Do not change `yaml.ts`.
- Paths:
    - `cli/src/ingest.ts` (read-only confirm)
    - `cli/test/ingest.test.ts`
    - `cli/test/report.test.ts`
- [ ] Confirm `maybeWriteReport` writes when `sessionId` is defined; `jsonlPath` is `{sessionId}.jsonl`; try/catch; no session-end gate. Do not add a report command. Do not change `.cursor/hooks.json`. Do **not** pass hardcoded `turn: 0` from ingest (AC-F004.9, AC-F004.10, AC-F004.14)
- [ ] Retitle F004 ingest tests off YAML-as-source: `cursor sessionEnd writes md matching emitSessionReport of the yaml` → of the Session JSONL; `sessionStart with a session id writes yaml and md` → jsonl and md; `later YAML append the same day overwrites md from the yaml` → later Session JSONL append overwrites md from the current JSONL; `md is derived from yaml without consulting jsonl` → md is derived from Session JSONL without consulting Event log `events.jsonl` / Session index; `report write failure still persists jsonl yaml and index` → persists Event log, Session JSONL, and index (F001/F010). Rename bindings `yaml` → `jsonl` in those tests. Round-trip stays `md === emitSessionReport(parseSessionRecords(jsonl), stem)` (AC-F004.11, AC-F004.14, AC-F004.16, AC-F004.9)
- [ ] Retitle `AC-F004.23 overview session_id is filename stem when YAML omits it` → when JSONL omits `session_id` (AC-F004.23)
- [ ] Do **not** retitle F003 / F005 / F006 / F008 / F010 tests (even if their titles still say yaml). Those are sibling specs
- [ ] Keep: Session-JSONL-appending events write `.md`; Copilot `sessionId` only writes no session jsonl and no `.md`; `writeSessionReport` throw still isolated (AC-F004.8, AC-F004.9, AC-F004.11, AC-F004.13, AC-F004.14)

---

### Step 3: Keep Markdown emit (duration, counts, turns, Subagent, 100-char)
Grouping, Details exclude, Subagent cell, duration, preview, and overview labels stay as shipped. Do not rewrite `formatSubagent` / `detailsByEvent` / `turnGroups` / `preview` unless a new test proves a gap.
- Paths:
    - `cli/src/report.ts` (read-only confirm)
    - `cli/test/report.test.ts`
- [x] Confirm `detailsByEvent` still lists only remaining body fields and does **not** list `subagent` or `agent_display_name`. Unmapped `event` still returns empty Details (AC-F004.22)
- [x] Confirm `formatSubagent`: if `"subagent" in doc.body`, return `scalarText(doc.body.subagent ?? null)` only; else `""`. No `subagentByEvent`. No `agent_display_name` / `agent_type` fallback (AC-F004.24)
- [x] Keep `turnGroups` / `turnDuration` / `turnPrompt` / `turnSection`. Missing/invalid `turn` still → `0`. Do not redo grouping or duration logic (AC-F004.18, AC-F004.22)
- [x] Keep 100-character `preview` (first 100 + `...`; newlines to spaces before the limit) for Details, Subagent, and per-turn prompt (AC-F004.6, AC-F004.19)
- [x] Keep consecutive subagent start/stop as ordinary rows without nesting (AC-F004.7)
- [x] Keep locked Markdown shape for sessionStart then sessionEnd (compact `harness` / `event` labels; four-column headers) (AC-F004.8, AC-F004.21, AC-F004.23)

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

### Step 4: Confirm architecture unchanged
Architecture already names Session JSONL log and report-from-JSONL. Confirm-no-change only. Do not edit `cli.arch.md` / `system.arch.md` / `model.schema.md`.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
    - `docs/model/model.schema.md`
- [x] Confirm `cli.arch.md` ingest already appends `{session_id}.jsonl` and writes `{session_id}.md` from that file. Do **not** edit those files
- [x] Confirm `system.arch.md` / `model.schema.md` already name Session JSONL log and Session report. Do **not** edit them
- [x] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not change `.cursor/hooks.json` (stays six). Do not add a CLI command

---

### Step 5: Test runner, rebuild, and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/ingest.test.ts`
    - `cli/test/report.test.ts`
    - `cli/.oxlint.json`
    - `.agents/hooks/index.mjs`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library to dependencies or devDependencies (AC-F004.10)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8 for `parseSessionRecords` / `formatSubagent` / `formatDetails` / `turnGroups` / `turnDuration` / `turnPrompt` / `turnSection` / `emitSessionReport` / `writeSessionReport` / `overviewSection` / `eventCounts` / `preview`. Expect **no** production `report.ts` diff unless a test gap forces a fix
- [ ] Unit tests cover AC-F004.2, .6–.11, .13–.14, .16, .18–.19, .21–.24 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Unchecked this amend covered at lib: **AC-F004.2** (JSONL file order, no re-sort), **AC-F004.21** (JSONL record counts; header `event`), **AC-F004.22** (turn subsections from Session JSONL), **AC-F004.8** (`.md` beside session jsonl), **AC-F004.9** (observe-only; persist F001/F010 on report fail), **AC-F004.10** (no YAML/JSON library), **AC-F004.14** (report after every JSONL append), **AC-F004.23** (overview from JSONL records / filename stem), **AC-F004.16** (overwrite from current Session JSONL). Checked keep: AC-F004.6, .7, .11, .13, .18, .19, .24. Do **not** keep tests whose pass condition is AC-F004.1, .3, .4, .5, .12, .15, .17, or **.20**
- [ ] Leave `hooks.test.ts` asserting the current six shell-string commands (F004 does not add or remove hooks)
- [ ] Skip `bun run build` unless a production `cli/src/` file actually changes. If it does: `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Deviations

- This run writes both `cli.plan.md` and `e2e.plan.md` (parent asked for both containers) and sets spec status to `planned`. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is current for this amend: ingest already writes `.md` from `{session_id}.jsonl`. This planify run does not amend those files; `/codify` has no architecture step.
- Production already reads `{session_id}.jsonl` for the Markdown report (F010). This amend does **not** rewrite `emitSessionReport` (duration, counts, turns, Subagent, 100-char stay). `/codify` confirms `parseSessionRecords` / `jsonlPath` and retitles leftover YAML-as-source tests.
- F008 numbering is already in ingest (released 0.14.0). Do not redo numbering. Do not pass hardcoded `turn: 0`.
- JSONL emit is F010 / F003. This container must not change `yaml.ts`. Mixed historical YAML (`source_*`, per-doc `session_id`, body `agent_type`) is out of scope to migrate; the report must not treat `agent_type` as the Subagent cell. Do not read or rewrite `{session_id}.yaml`.
- Cursor registration stays six events (F001 / F005 / F006). This plan does not add or remove hooks.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseSessionRecords` / `emitSessionReport` / `writeSessionReport` by importing `cli/src`.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F010 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Session overview duration uses first and last `HH:MM:SS` on that calendar day only, regardless of `event`. Turn duration uses that turn’s prompt-kind (or first/last turn-0) timestamps. Never Cursor `duration_ms`. Inverted and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|`. Newlines are spaces before the 100-character preview limit. The Prompt line and Subagent cell use the same `preview` on the **bare** value.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no Session JSONL log, no Markdown (AC-F004.13).
- F001 stdin decode and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers Event log, index, Session JSONL log). Report is written after persist returns. A later JSONL append the same day overwrites `.md`.
- `/codify`: spec status set to `in-progress`. Do not reopen compact-header parse, grouping, duration, Subagent cell, or F010 emit. Do not rewrite `formatSubagent` unless a test gap proves a bug.

---

> last updated: 2026-09-02T15:55:00Z
