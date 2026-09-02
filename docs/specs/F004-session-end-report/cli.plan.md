---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest that appends a Session YAML log document (payload has an F001 session identifier), after that document is in `{session_id}.yaml`, write `{session_id}.md` in the same daily folder. Produce the report only from that YAML file (every document, file order, no re-sort), including when no session-end document is present. Same invocation. No second process. No new CLI command. No new hook registrations (F001 / F005 / F006). This spec does not replace F001–F003 or F005–F008. This amend is report-only: each per-turn table gains a Subagent column; Details no longer repeats identity; preview length is 100. Do not change YAML body mapping or F008 numbering.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this Subagent/preview amend**. Ingest already writes `{session_id}.md` after every YAML append; argv does not gate the report; six Cursor events; F008 numbering already in ingest (0.14.0). [`cli.arch.md`](../../arch/cli.arch.md) does **not** name three columns or an 80-character preview. [`model.schema.md`](../../model/model.schema.md) already groups the Session report by document `turn`. Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F004 shipped 0.10.0 session-end-gate drop and 0.13.0 per-turn grouping; F003 0.12.0 five-field header; F008 numbering released 0.14.0; this is an amend/replan of report columns / Details / preview):

- `cli/src/report.ts`: `YamlDoc` already has `turn`. Per-turn subsections already exist (`turnGroups`, `turnDuration`, `turnPrompt`, `turnSection`). Complexity ≤ 8. **Still to change:** `detailsByEvent` still puts `agent_type` + `agent_display_name` in Details for subagent start/stop; table header is `| Time | Event | Details |`; `preview` uses **80**. Redo: split identity into a Subagent field list used only for subagent start/stop aliases; Details for those kinds become `task` / `response_text` only; four-column header and four cells per row; `preview` limit **100**. Keep grouping/duration/overview. Do not add a YAML library
- `cli/src/ingest.ts`: `maybeWriteReport` already writes after any YAML append (`sessionId` defined). Persist-then-isolate-report stays. **Keep.** Do **not** redo the 0.10.0 session-end-gate drop. F008 numbering is **already in ingest** (store calls `nextConversationTurn` under the lock). Do **not** redo numbering. Do **not** pass hardcoded `turn: 0` as a requirement
- `cli/src/yaml.ts`: F003 emitter already has five-field header including integer `turn`. **Do not** change it. YAML body mapping unchanged (`docs/normalized-fields.md` unchanged). This amend is **report-only**
- `cli/src/store.ts`: `persistIngest` under `ingest.lock` still does not write `.md`. F008 numbering already runs under the lock. Keep it
- `cli/src/argv.ts` / `cli/src/index.ts` / `cli/src/event.ts`: keep. Positionals are YAML-header only; they do **not** gate the report
- `.cursor/hooks.json`: six events (F001/F005/F006). Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/report.test.ts`: locked Markdown and assertions still assume three columns and 80-char truncation. Rewrite those. Add AC-F004.20 tests (Subagent filled/empty). Keep grouping/duration/observe-only tests (update row strings to four cells)
- `cli/test/ingest.test.ts`: overwrite test already counts Time rows (`/^\| \d{2}:/`). Flip any three-column / 80-char assumptions (four-column header on produced `.md`). Do not change when `.md` is written
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except this invocation may **read** the Session YAML log after the document just appended is present, including each document’s `turn`), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not redo F008 numbering. Do not register hooks. Do not add a YAML npm package. Do not change `docs/normalized-fields.md`

Unit tests cover AC-F004.2, .4, .6–.11, .13–.20 at lib except entry spawn/`exitCode` (those are e2e). Drop AC-F004.1, .3, .5, .12. Unchecked this amend: **AC-F004.17**, **AC-F004.20**, **AC-F004.19**, **AC-F004.6**. Other F004 ACs stay shipped (keep).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003), each with integer `turn` (F008).

This feature’s fourth daily artifact: **Session report** — one `{session_id}.md` per session that received a YAML document that day; Markdown with tables; overwritten on every later YAML append for that session the same day; events grouped by `turn`; each per-turn table has Time, Event, Subagent, and Details. Schema already says grouping; this container owns the Markdown emitter (column split and 100-char preview).

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, YAML, project root, and day folder stay as F003. Session YAML header is five fields including integer `turn` (F003 0.12.0). F008 numbering is already shipped (0.14.0); this amend reads `turn`. Session report is written after every YAML append. Argv does not gate the report.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008 shipped 0.14.0; not a body field). This F004 amend **reads** `turn`. Do not change numbering. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order.
- Event kinds: session start; session end; subagent start; subagent stop; user prompt; agent stop (names in `docs/events-args.md`).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (payload has a session identifier), after that document is in the file. Do **not** require `source_event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the JSONL payload. Still produce a report when no session-end document is in the file. Argv does not gate the report.
- Produce only from that session’s Session YAML log (every document, file order, no re-sort). Read `turn` from each YAML document. Do not read the Event log or Session index.
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later YAML append for the same session the same day; do not append a second report.
- Overview: `session_id` (F001 identifier / first document); `source_harness` from the **last** document (the ingest that just ran), not from a session-end document; start = first document `timestamp`; end = last document `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those documents’ `source_event`. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`. Session overview stays session-level.
- Event-count summary: total YAML documents; count per distinct `source_event` (first-seen order). Counts stay session-level, not per-turn.
- One Markdown subsection per distinct `turn` that appears, in ascending turn-number order. No session-wide Events table. When no document has `turn` 0, omit a turn-0 subsection; do not invent an empty turn 0. Do not invent missing intermediate turns.
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind document (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s documents in file order with four columns in this order: Time, Event, Subagent, Details. Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present). Do not nest subagents.
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind document.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind document `timestamp` (first prompt-kind in that turn’s file-order docs if more than one); end = the last document in the file that has `turn: n`. For turn **0**, start = the first document with `turn: 0`; end = the last document with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind document, start = the first document of that turn so Duration still emits.
- Subagent cell: filled **only** for `subagentStart` / `SubagentStart` / `subagentStop` / `SubagentStop`. Identity fields in table order: `agent_type`, then `agent_display_name` when present, as `{name}: {value}` pairs separated by `; `, omitting absent fields. When both are absent, Subagent is empty. For every other event kind (session start, session end, user prompt, agent stop, header-only), Subagent is empty. Do **not** reconstruct parent→subagent hierarchy. Do **not** copy identity onto later non-subagent rows.
- Details: remaining normalized body fields from `docs/normalized-fields.md` excluding `session_id` and excluding `agent_type` / `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; `task` still Copilot/Claude-absent (F006); omit absent fields.
- Preview: value longer than **100** characters → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same preview for Details cells, Subagent cells, and the per-turn prompt line.
- List subagent start and stop as ordinary chronological rows inside that turn’s table. Do not nest a subagent under a parent, and do not nest further inside a turn.
- When report generation fails: still persist F001/F003, exit 0, no blocking stdout.
- No YAML parsing library. No new CLI command. No new hook registrations. This F004 amend does not change hooks.json.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After persist returns, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the YAML header. They do **not** gate the Session report (any YAML-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged by this F004 amend. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Parse `turn` and emit per-turn subsections | redo | four columns (Time, Event, Subagent, Details); split identity out of Details; preview 100; AC-F004.17 / .20 / .19 / .6. Keep grouping, duration, overview. Do not redo parser/`turn` on `YamlDoc` |
| Wire report into ingest after YAML persist | keep | already writes after every YAML append (`sessionId` defined); persist-then-isolate-report stays. Do not redo the 0.10.0 session-end-gate drop. Do not redo F008 numbering |
| Amend architecture and model schema | keep | `cli.arch.md` does not name three columns or 80 chars; ingest row already writes `.md` after every YAML append; `model.schema.md` already groups by `turn`. Do not amend architecture in this planify run or `/codify` |
| Re-verify remaining ACs | redo | rewrite tests that assume three columns or 80 chars; add AC-F004.20; keep grouping/duration/observe-only. Drop .1 .3 .5 .12 |

## Implementation Steps

### Step 1: Four-column table, split identity, 100-char preview
Keep overview, counts, grouping, duration, cell escape, and `turn` parser. Change Details mapping, add Subagent, raise preview to 100. Do not number turns in ingest. Do not add a YAML package. Do not change `yaml.ts`.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [ ] Keep `YamlDoc.turn`, `headerKeys` including `"turn"`, `integerField` / `parseTurnValue`, `turnGroups`, `turnDuration`, `turnPrompt`. Missing/invalid `turn` still → `0`. Do not redo grouping or duration logic (AC-F004.17, AC-F004.18)
- [ ] Split identity out of `detailsByEvent` into a Subagent field list (`agent_type`, then `agent_display_name`) used **only** for `subagentStart` / `SubagentStart` / `subagentStop` / `SubagentStop`. Details for those kinds become `task` / `response_text` only. Share a small `formatFieldList(doc, fields)` (omit absent; present `null` still `null`; `{name}: {value}` joined by `; `) so `formatSubagent` and `formatDetails` stay complexity ≤ 8. For every other event kind, Subagent is empty (not in the Subagent map → `""`). When both identity fields are absent, Subagent is empty. Do **not** copy identity onto later non-subagent rows (AC-F004.17, AC-F004.20)

| kind | `source_event` aliases | Subagent fields | Details fields |
|------|------------------------|-----------------|----------------|
| sessionStart | `sessionStart`, `SessionStart` | *(empty)* | *(empty)* |
| sessionEnd | `sessionEnd`, `SessionEnd` | *(empty)* | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type`, `agent_display_name` | `task` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type`, `agent_display_name` | `response_text` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | *(empty)* | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(empty)* | *(empty)* |
| unmapped | any other header `source_event` | *(empty)* | *(empty)* |

- [ ] Table header `| Time | Event | Subagent | Details |` and separator `| --- | --- | --- | --- |`. `eventRow` emits four cells (empty Subagent when not filled). Suggested locked shape (tests lock this):

```
## Turn {n}

Duration: HH:MM:SS

Prompt: {100-char preview}

| Time | Event | Subagent | Details |
| --- | --- | --- | --- |
| ... | ... | ... | ... |
```

  Blank line between Duration and the table; when Prompt is present, blank line after Duration before Prompt and after Prompt before the table. Do not nest subagents (AC-F004.7, AC-F004.8, AC-F004.17)
- [ ] `preview` limit **100**: value longer than 100 → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same `preview` for Details cells, Subagent cells, and the per-turn prompt line (`turnPrompt` already uses `scalarText`) (AC-F004.6, AC-F004.19)
- [ ] Replace the locked Markdown for sessionStart then sessionEnd (both `turn` `0`) with four columns and empty Subagent cells. Assert the report does **not** contain `## Events`. Keep Field / Value overview order and Event counts as shipped (AC-F004.8, AC-F004.15, AC-F004.17)

```
| Time | Event | Subagent | Details |
| --- | --- | --- | --- |
| 15:00:00 | sessionStart |  |  |
| 15:01:00 | sessionEnd |  | reason: completed |
```

- [ ] Rewrite Details tests so identity is not in Details. Handwritten YAML with `agent_type` + `task` → Subagent `agent_type: explore`, Details `task: do the thing`. Task-only (no identity) → empty Subagent, Details `task: …`. `task: null` still `task: null` in Details. `agent_type: null` still `agent_type: null` in Subagent. `transcript_path` still omitted. Cursor/Claude omit `agent_display_name` when absent. Header-only / unmapped / session start / agent stop stay empty Details **and** empty Subagent. Session end still `reason` in Details, empty Subagent. User prompt still `prompt` in Details, empty Subagent. `|` in a field value stays one cell (`\|`). Four-column rows: `line.split("|").length === 6` (AC-F004.17, AC-F004.20)
- [ ] Unit-test AC-F004.20 fill rules (new; do not fold only into Details tests):
  - Copilot `subagentStart` with `agent_type` + `agent_display_name` (+ optional `task`) → Subagent `agent_type: explore; agent_display_name: Explore`; Details `task: …` or empty; Details must **not** contain `agent_type` or `agent_display_name`
  - Copilot `subagentStop` with both identity fields + `response_text` → Subagent both identity pairs; Details `response_text` only
  - Cursor `subagentStart` / `subagentStop` with `agent_type` only → Subagent `agent_type: explore`; no `agent_display_name`
  - Claude `SubagentStart` / `SubagentStop` same as Cursor for identity (no `agent_display_name`)
  - Both identity fields absent → empty Subagent (even on subagent start/stop)
  - Session start, session end, user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`), agent stop (`stop` / `agentStop` / `Stop`), header-only → empty Subagent
  - Subagent start then a later `stop` / prompt in the same turn → later row Subagent empty (do **not** copy identity onto later non-subagent rows)
- [ ] Rewrite truncation tests from 80 to 100: exactly 100 characters → no ellipsis; 101 → first 100 + `...`; newlines collapsed to spaces before the limit. Apply to Details (`prompt` / `task` / `response_text`), Subagent (long `agent_display_name` or `agent_type`), and the turn ≥ 1 Prompt line (AC-F004.6, AC-F004.19)
- [ ] Keep grouping tests: documents with `turn` `0`, `2`, `1` emit `## Turn 0` then `## Turn 1` then `## Turn 2`; each table only that turn’s rows in file order; no `## Events`; prompt-only file omits `## Turn 0`; skip-middle does not invent `## Turn 1`. Update asserted row strings to four cells; every `| Time |` header is `| Time | Event | Subagent | Details |` (AC-F004.17)
- [ ] Keep AC-F004.18 duration tests unchanged in logic (turn 1 two stops → `00:01:00`; turn 0 spanning a turn-1 block → `00:02:00`; equal/inverted → `00:00:00`; no prompt-kind still emits Duration from first→last of that turn)
- [ ] Keep AC-F004.19 prompt-line tests: Cursor / Copilot / Claude prompt-kind aliases supply `Prompt:`; `prompt` absent → no `Prompt:`; turn 0 has no `Prompt:`; present `null` still `Prompt: null`; `|` escaped on the Prompt line. Change the 81-char fixture to 101 so the Prompt line uses the 100-char `preview` (AC-F004.6, AC-F004.19)
- [ ] Keep consecutive subagent rows without nesting (`###` / `<ul>` absent); start then stop still adjacent Time rows (AC-F004.7)
- [ ] Keep overview `source_harness` from the last document and duration first→last regardless of `source_event` (already shipped; do not revive session-end walk) (AC-F004.15)
- [ ] Keep parser tests: unquoted `turn: 3` → `3`; omitted / four-field header / `"x"` / `1.5` → `0`; `turn` is not a Details or Subagent field (AC-F004.17)

---

### Step 4: Re-verify remaining ACs
Keep ingest wiring and F008 numbering. Flip tests that still assume three columns or 80 chars. Do not change when the report is written. Do not change `yaml.ts`.
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
- [ ] Keep `parseArgv`, `index.ts`, `sessionIdentifier`, `eventLogLine`, `persistIngest`, and `maybeWriteReport` (write when `sessionId` is defined; try/catch; no session-end gate) as shipped. Do not add a report command. Do not change `.cursor/hooks.json`. Do **not** pass hardcoded `turn: 0` from ingest; F008 numbering stays in `store.ts` via `nextConversationTurn`. Entry spawn/`exitCode` remains e2e (AC-F004.9, AC-F004.10, AC-F004.14)
- [ ] In `cli/test/ingest.test.ts`, keep the overwrite test’s Time-row count (`/^\| \d{2}:/`) across turn subsections; still one `## Overview`; row count still matches yaml document count; `.md` still equals `emitSessionReport` of that yaml. Assert produced `.md` contains `| Time | Event | Subagent | Details |` and does **not** contain `| Time | Event | Details |`. Do **not** keep a pass condition that requires `## Events` or an 80-char ellipsis (AC-F004.16, AC-F004.17)
- [ ] Keep: YAML-appending events write `.md`; Copilot `sessionId` only writes no `.md`; report path does not consult jsonl; `writeSessionReport` throw still isolated (AC-F004.8, AC-F004.9, AC-F004.11, AC-F004.13, AC-F004.14)
- [ ] Keep F008 ingest numbering tests (turns `0 1 1 1 2` etc.). This amend does not change them
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F004.10)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8 for `formatSubagent` / `formatDetails` / `formatFieldList` / `turnGroups` / `turnDuration` / `turnPrompt` / `turnSection` / `emitSessionReport` / `preview`
- [ ] Unit tests cover AC-F004.2, .4, .6–.11, .13–.20 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Unchecked this amend covered at lib: **AC-F004.17** (four-column per-turn tables, Details without identity), **AC-F004.20** (Subagent fill/empty rules), **AC-F004.19** (prompt line uses 100-char preview), **AC-F004.6** (100-char truncation on Details, Subagent, Prompt). Shipped keep: AC-F004.2, .4, .7–.11, .13–.16, .18. Do **not** keep tests whose pass condition is AC-F004.1 (session-end-only write), AC-F004.3 (session-end-only harness), AC-F004.5 (session-wide Events table / three columns only), or AC-F004.12 (overwrite only on later session-end)
- [ ] Leave `hooks.test.ts` asserting the current six shell-string commands (F004 does not add or remove hooks)
- [ ] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Deviations

- Spec status stays `pending` this run (sibling e2e planify is in parallel). Do **not** set `planned` here. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is current for this amend: no three-column / 80-char wording in `cli.arch.md`; schema already groups by `turn`; F008 numbering already described. This planify run does not amend those files; `/codify` has no architecture step.
- Wire-report-into-ingest is **keep**. Do not redo the 0.10.0 session-end-gate drop (`maybeWriteReport` already runs after every YAML append).
- F008 numbering is already in ingest (released 0.14.0). Do not redo numbering. Do not pass hardcoded `turn: 0`. Unit tests that need mixed `turn` values still feed them through `emitYamlDocument` / handwritten YAML.
- YAML emitter for `turn` is F003 (shipped 0.12.0). This container must not change `yaml.ts` header/body mapping. YAML still persists `agent_type` / `agent_display_name` / `task` / `response_text`; this amend only changes how the report displays them.
- Cursor registration stays six events (F001 / F005 / F006). This plan does not add or remove hooks.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseYamlDocuments` / `emitSessionReport` by importing `cli/src`.
- No YAML parsing library: the report parser accepts only F003’s fixed-structure multi-document key-value YAML. It is not a general YAML 1.1 parser.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F003 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Session overview duration uses first and last `HH:MM:SS` on that calendar day only, regardless of `source_event`. Turn duration uses that turn’s prompt-kind (or first/last turn-0) timestamps. Never Cursor `duration_ms`. Inverted and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|`. Newlines are spaces before the 100-character preview limit. The Prompt line and Subagent cell use the same `preview`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML, no Markdown (AC-F004.13).
- F001 stdin decode and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers jsonl, index, YAML). Report is written after persist returns. A later YAML append the same day overwrites `.md`.

---

> last updated: 2026-09-02T07:30:18Z
