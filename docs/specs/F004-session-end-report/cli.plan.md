---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest that appends a Session YAML log document (payload has an F001 session identifier), after that document is in `{session_id}.yaml`, write `{session_id}.md` in the same daily folder. Produce the report only from that YAML file (every document, file order, no re-sort), including when no session-end document is present. Same invocation. No second process. No new CLI command. No new hook registrations (F001 / F005 / F006). This spec does not replace F001–F003 or F005–F008. This amend is report-only: the report reads F003 compact YAML headers (`harness` / `event`; `session_id` only on the initial session-start). Do not change YAML emit, body mapping, or F008 numbering. Do not migrate old `source_*` keys.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this compact-header report-consumer amend**. Ingest already writes `{session_id}.md` after every YAML append; argv does not gate the report; six Cursor events; F008 numbering already in ingest (0.14.0); four-column per-turn tables and 100-char preview already shipped. [`cli.arch.md`](../../arch/cli.arch.md) still names F008 numbering off prompt-kind `source_event` (emitter / store). This plan does **not** amend architecture. `/codify` has no architecture step.

Grounding (F004 shipped 0.10.0 session-end-gate drop, 0.13.0 per-turn grouping, Subagent column / 100-char preview; F008 numbering released 0.14.0; this is an amend/replan of report labels to F003 compact YAML):

- `cli/src/report.ts`: `YamlDoc` still has `session_id`, `source_harness`, `source_event`. `headerKeys` still those plus `timestamp`, `turn`. Overview is `| session_id | ${first.session_id} |` and `| source_harness | ${last.source_harness} |`. Counts table header is `| source_event | count |` from `doc.source_event`. Event column is `doc.source_event`. `writeSessionReport({ yamlPath, mdPath })` does not pass a filename stem. **Still to change:** parse `harness` / `event`; treat those plus `session_id` (when present) as headers so they never leak into Details; overview `session_id` = F001 identifier (filename stem) without requiring it on every YAML document; overview `harness` from last document; counts and Event column from `event`. Keep grouping, Subagent/Details maps, 100-char preview, duration. Do not add a YAML library. Do **not** read old `source_harness` / `source_event`
- `cli/src/ingest.ts`: `maybeWriteReport` already writes after any YAML append (`sessionId` defined) via `writeSessionReport({ yamlPath, mdPath })` with matching `{sessionId}.yaml` / `{sessionId}.md`. Persist-then-isolate-report stays. **Keep.** Filename stem is already that F001 identifier. Do **not** redo the 0.10.0 session-end-gate drop. F008 numbering is **already in ingest**. Do **not** pass hardcoded `turn: 0`
- `cli/src/yaml.ts`: F003 emitter still writes `source_harness` / `source_event` and `session_id` on every document. **Do not** change it. Sibling F003 cli plan owns compact emit (`harness` / `event`; `session_id` only on initial session-start). YAML body mapping unchanged. This amend is **report-only**
- `cli/src/store.ts`: `persistIngest` under `ingest.lock` still does not write `.md`. F008 numbering already runs under the lock. Keep it
- `cli/src/argv.ts` / `cli/src/index.ts` / `cli/src/event.ts`: keep. Positionals are YAML-header only; they do **not** gate the report
- `.cursor/hooks.json`: six events (F001/F005/F006). Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/report.test.ts`: locked Markdown and assertions still use `source_harness` / `source_event` labels. Handwritten YAML still uses those keys. `yamlDoc` / `emitYamlDocument` fixtures will emit compact headers after F003 lands — assert new report labels; fixtures may still go through ingest or `emitYamlDocument`. Add a case where YAML has no `session_id` on later docs (or only prompt docs) and overview still shows the F001 id from the filename. Keep grouping/duration/Subagent/observe-only tests
- `cli/test/ingest.test.ts`: overwrite test already counts Time rows (`/^\| \d{2}:/`). Flip report-side asserts (`| source_harness |` → `| harness |`; `doc.source_event` → `doc.event`). Do **not** rewrite YAML-file exact-string header asserts (`source_harness:` / `source_event:` on disk) — those are F003 emit. Do not change when `.md` is written
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except this invocation may **read** the Session YAML log after the document just appended is present, including each document’s `turn`), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not redo F008 numbering. Do not register hooks. Do not add a YAML npm package. Do not change `docs/normalized-fields.md`. Do not migrate mixed historical YAML

Unit tests cover AC-F004.2, .6–.11, .13–.14, .16, .18–.23 at lib except entry spawn/`exitCode` (those are e2e). Drop AC-F004.1, .3, .4, .5, .12, .15, .17. Unchecked this amend: **AC-F004.21**, **AC-F004.22**, **AC-F004.23**. Other F004 ACs stay shipped (keep): .2 .20 .18 .19 .6 .7 .8 .9 .10 .11 .13 .14 .16.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003), each with integer `turn` (F008). New documents use compact headers: `harness` / `event`; `session_id` only on the initial session-start. The filename stem is always the F001 identifier.

This feature’s fourth daily artifact: **Session report** — one `{session_id}.md` per session that received a YAML document that day; Markdown with tables; overwritten on every later YAML append for that session the same day; events grouped by `turn`; each per-turn table has Time, Event, Subagent, and Details. This container owns the Markdown emitter (compact-header labels and overview `session_id` from the F001 identifier).

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, YAML, project root, and day folder stay as F003. Session YAML log uses compact headers (`harness` / `event`; `session_id` only on the initial session-start). F008 numbering is already shipped (0.14.0); this amend reads `turn`. Session report is written after every YAML append. Argv does not gate the report.

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
- Header fields on **new** documents: `harness` and `event` (not `source_harness` or `source_event`). `session_id` only on the initial session-start document (`event` `sessionStart` / `SessionStart` when that session’s YAML log does not already contain a session-start document). This F004 amend **reads** those keys. Do not emit them here (F003 owns `yaml.ts`). Do not migrate old `source_*` keys. Mixed historical YAML is out of scope.
  - Initial session-start (has `session_id`), in this order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
  - Every other document (no `session_id`), in this order: `harness`, `event`, `timestamp`, `turn`.
  - `session_id` when present = the F001 session identifier (same as the filename stem). When the first event for a session is not session-start, no document gets `session_id`; the filename still uses the F001 identifier.
  - `harness` / `event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008 shipped 0.14.0; not a body field). This F004 amend **reads** `turn`. Do not change numbering. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the filename, and on the initial session-start header when present), using those snake_case names, in table order.
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
- Subagent cell: filled **only** for `subagentStart` / `SubagentStart` / `subagentStop` / `SubagentStop`. Identity fields in table order: `agent_type`, then `agent_display_name` when present, as `{name}: {value}` pairs separated by `; `, omitting absent fields. When both are absent, Subagent is empty. For every other event kind (session start, session end, user prompt, agent stop, header-only), Subagent is empty. Do **not** reconstruct parent→subagent hierarchy. Do **not** copy identity onto later non-subagent rows.
- Details: remaining normalized body fields from `docs/normalized-fields.md` excluding `session_id` and excluding `agent_type` / `agent_display_name`. Mapping: session start empty; session end `reason`; subagent start `task` only; subagent stop `response_text` only; user prompt `prompt`; agent stop empty; header-only / unmapped empty. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; `task` still Copilot/Claude-absent (F006); omit absent fields.
- Preview: value longer than **100** characters → first 100 + `...`; 100 or fewer → no ellipsis. Newlines become spaces before the limit. Same preview for Details cells, Subagent cells, and the per-turn prompt line.
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
| Parse `turn` and emit per-turn subsections | redo | compact keys `harness` / `event`; overview `session_id` from filename stem (AC-F004.21 / .22 / .23). Keep grouping, Subagent/Details, 100-char, turn duration. Do not redo parser/`turn` on `YamlDoc`. Do not migrate `source_*` |
| Wire report into ingest after YAML persist | keep | already writes after every YAML append (`sessionId` defined); persist-then-isolate-report stays. Filename stem is already the F001 identifier. Do not redo the 0.10.0 session-end-gate drop. Do not redo F008 numbering |
| Amend architecture and model schema | keep | `cli.arch.md` already writes `.md` after every YAML append; four-column / 100-char already described; `model.schema.md` already groups by `turn`. Do not amend architecture in this planify run or `/codify` |
| Re-verify remaining ACs | redo | flip overview/count labels; add no-`session_id`-on-later-docs filename case; keep grouping/duration/Subagent/observe-only. Drop .1 .3 .4 .5 .12 .15 .17 |

## Implementation Steps

### Step 1: Compact YAML keys in the report consumer
Keep grouping, duration, Subagent/Details maps, cell escape, 100-char preview, and `turn` parser. Change header keys and report labels. Do not number turns in ingest. Do not add a YAML package. Do not change `yaml.ts`.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [x] Keep `YamlDoc.turn`, `integerField` / `parseTurnValue`, `turnGroups`, `turnDuration`, `turnPrompt`, `turnSection`. Missing/invalid `turn` still → `0`. Do not redo grouping or duration logic (AC-F004.18, AC-F004.22)
- [x] Rename `YamlDoc.source_harness` → `harness` and `YamlDoc.source_event` → `event`. Parse those keys (`stringField(pairs, "harness")` / `"event"`). Do **not** fall back to `source_harness` / `source_event` (AC-F004.21, AC-F004.22, AC-F004.23)
- [x] `headerKeys` = `session_id`, `harness`, `event`, `timestamp`, `turn`. `session_id` stays a header key when present so it never leaks into Details. `harness` / `event` are headers, not body (AC-F004.22, AC-F004.23)
- [x] Keep `subagentByEvent`, `detailsByEvent`, and `promptKinds` keyed by **event name strings** (`sessionStart`, `beforeSubmitPrompt`, …). Those values did not change; only the YAML **key** did. Look them up with `doc.event` (AC-F004.20, AC-F004.22)

| kind | `event` aliases | Subagent fields | Details fields |
|------|-----------------|-----------------|----------------|
| sessionStart | `sessionStart`, `SessionStart` | *(empty)* | *(empty)* |
| sessionEnd | `sessionEnd`, `SessionEnd` | *(empty)* | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type`, `agent_display_name` | `task` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type`, `agent_display_name` | `response_text` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | *(empty)* | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(empty)* | *(empty)* |
| unmapped | any other header `event` | *(empty)* | *(empty)* |

- [x] Overview: `| harness | ${last.harness} |` (not `source_harness`). Counts: `| event | count |` from `doc.event` (not `source_event`). Event column: `doc.event`. Suggested locked shape (tests lock this) (AC-F004.21, AC-F004.22, AC-F004.23):

```
## Overview

| Field | Value |
| --- | --- |
| session_id | sess-1 |
| harness | cursor |
| start | 15:00:00 |
| end | 15:01:00 |
| duration | 00:01:00 |

## Event counts

Total: 2

| event | count |
| --- | --- |
| sessionStart | 1 |
| sessionEnd | 1 |

## Turn 0

Duration: 00:01:00

| Time | Event | Subagent | Details |
| --- | --- | --- | --- |
| 15:00:00 | sessionStart |  |  |
| 15:01:00 | sessionEnd |  | reason: completed |
```

- [x] Overview `session_id` is always the F001 identifier. `writeSessionReport({ yamlPath, mdPath })` takes it from the **filename stem** of `yamlPath` (same stem as `mdPath`). Pass that stem into `emitSessionReport` so overview does not require `session_id` on every YAML document. When the first document has `session_id`, it matches the stem; when omitted, still show the stem. Keep `emitSessionReport(docs)` usable in unit tests: optional stem, else `first.session_id`. Extract a small helper if needed so `writeSessionReport` / `emitSessionReport` / `overviewSection` stay complexity ≤ 8 (AC-F004.23)
- [x] Replace the locked Markdown for sessionStart then sessionEnd (both `turn` `0`) with `harness` / `event` labels. Assert the report does **not** contain `## Events`, `source_harness`, or `source_event`. Keep Field / Value overview order (AC-F004.8, AC-F004.21, AC-F004.22, AC-F004.23)
- [x] Flip handwritten YAML fixtures from `source_harness` / `source_event` to `harness` / `event`. `yamlDoc` / `emitYamlDocument` fixtures keep calling the F003 emitter; after F003 compact emit lands they get the new headers — assert new report labels, do not change `yaml.ts` here. Parser tests: omitted `harness` → `""`; `turn` still not a Details or Subagent field; `session_id` still not a Details field (AC-F004.21, AC-F004.22)
- [x] Add a `writeSessionReport` case (new; AC-F004.23): YAML with **no** `session_id` on later docs, or only prompt-kind docs (no `session_id` at all), written to `{f001-id}.yaml`; overview still `| session_id | {f001-id} |`. Also cover sessionStart (has `session_id`) then a prompt (omits it) — overview still the stem, `harness` from the last document
- [x] Keep Subagent fill/empty rules, Details mapping, four-column rows (`line.split("|").length === 6`), 100-char preview on Details / Subagent / Prompt, grouping (`## Turn 0` then `1` then `2`; omit empty turn 0; skip-middle does not invent), AC-F004.18 duration tests, AC-F004.19 prompt-line tests, consecutive subagent rows without nesting. Update only Event-column / overview / count **labels** in asserted strings (AC-F004.6, AC-F004.7, AC-F004.18, AC-F004.19, AC-F004.20, AC-F004.22)
- [x] Overview `harness` from the last document and duration first→last regardless of `event` (already shipped as last-document / first→last; flip label `source_harness` → `harness`; do not revive session-end walk) (AC-F004.23)

---

### Step 4: Re-verify remaining ACs
Keep ingest wiring and F008 numbering. Flip report-side labels. Do not change when the report is written. Do not change `yaml.ts`.
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
- [x] Keep `parseArgv`, `index.ts`, `sessionIdentifier`, `eventLogLine`, `persistIngest`, and `maybeWriteReport` (write when `sessionId` is defined; try/catch; no session-end gate) as shipped. Do not add a report command. Do not change `.cursor/hooks.json`. Do **not** pass hardcoded `turn: 0` from ingest; F008 numbering stays in `store.ts` via `nextConversationTurn`. Entry spawn/`exitCode` remains e2e (AC-F004.9, AC-F004.10, AC-F004.14)
- [x] In `cli/test/ingest.test.ts`, flip report-side asserts: `| source_harness |` → `| harness |`; `doc.source_event` → `doc.event`; `doc.source_harness` → `doc.harness`. Round-trip `md === emitSessionReport(parseYamlDocuments(yaml))` must pass the filename stem into `emitSessionReport` (prompt-only / later docs omit `session_id` after F003). Keep the overwrite test’s Time-row count (`/^\| \d{2}:/`); still one `## Overview`; row count still matches yaml document count. Assert produced `.md` contains `| Time | Event | Subagent | Details |` and `| event | count |`. Do **not** keep a pass condition that requires `source_harness` / `source_event` as report labels, `## Events`, or an 80-char ellipsis (AC-F004.16, AC-F004.21, AC-F004.22, AC-F004.23)
- [x] Do **not** rewrite YAML-file exact-string header asserts in `ingest.test.ts` (`source_harness:` / `source_event:` on disk, AC-F003.11/12-named cases). Sibling F003 cli plan owns those. After F003 compact emit, those strings become `harness:` / `event:` and `session_id` only on initial session-start — not this container’s emit work
- [x] Keep: YAML-appending events write `.md`; Copilot `sessionId` only writes no `.md`; report path does not consult jsonl; `writeSessionReport` throw still isolated (AC-F004.8, AC-F004.9, AC-F004.11, AC-F004.13, AC-F004.14)
- [x] Keep F008 ingest numbering tests (turns `0 1 1 1 2` etc.). This amend does not change numbering. Only the `YamlDoc` field used to assert event names flips (`doc.event`)
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F004.10)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8 for `formatSubagent` / `formatDetails` / `formatFieldList` / `turnGroups` / `turnDuration` / `turnPrompt` / `turnSection` / `emitSessionReport` / `writeSessionReport` / `overviewSection` / `eventCounts` / `preview`
- [x] Unit tests cover AC-F004.2, .6–.11, .13–.14, .16, .18–.23 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Unchecked this amend covered at lib: **AC-F004.21** (counts by `event`, table header `event`), **AC-F004.22** (Event column is `event`; Subagent/Details/turn tables unchanged), **AC-F004.23** (overview `session_id` from F001 identifier / filename stem; `harness` from last document). Shipped keep: AC-F004.2, .6–.11, .13–.14, .16, .18–.20. Do **not** keep tests whose pass condition is AC-F004.1 (session-end-only write), AC-F004.3 (session-end-only harness), AC-F004.4 (counts by `source_event`), AC-F004.5 (session-wide Events table / three columns only), AC-F004.12 (overwrite only on later session-end), AC-F004.15 (overview `source_harness` / `session_id` from first document only), or AC-F004.17 (Event column `source_event`)
- [x] Leave `hooks.test.ts` asserting the current six shell-string commands (F004 does not add or remove hooks)
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Deviations

- Spec status stays `pending` this run (sibling e2e planify is in parallel). Do **not** set `planned` here. `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is current for this amend: ingest already writes `.md` after every YAML append; four-column / 100-char already in `cli.arch.md`; schema already groups by `turn`. This planify run does not amend those files; `/codify` has no architecture step. `cli.arch.md` still names F008 numbering off prompt-kind `source_event` (emitter); this container only changes the report reader.
- Wire-report-into-ingest is **keep**. Do not redo the 0.10.0 session-end-gate drop (`maybeWriteReport` already runs after every YAML append). `writeSessionReport` already receives `{sessionId}.yaml` / `{sessionId}.md`; this amend only reads the stem for overview `session_id`.
- F008 numbering is already in ingest (released 0.14.0). Do not redo numbering. Do not pass hardcoded `turn: 0`. Unit tests that need mixed `turn` values still feed them through `emitYamlDocument` / handwritten YAML.
- YAML compact emit (`harness` / `event`; `session_id` only on initial session-start) is F003. This container must not change `yaml.ts`. Report tests that call `emitYamlDocument` / `yamlDoc` / ingest will get new headers after F003 lands — plan asserts new report labels; do not migrate old `source_*` keys; mixed historical YAML is out of scope. Codify of this report consumer assumes F003 compact emit has landed (or uses handwritten compact YAML). YAML-file exact-string header asserts in `ingest.test.ts` stay F003’s plan.
- Cursor registration stays six events (F001 / F005 / F006). This plan does not add or remove hooks.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseYamlDocuments` / `emitSessionReport` / `writeSessionReport` by importing `cli/src`.
- No YAML parsing library: the report parser accepts only F003’s fixed-structure multi-document key-value YAML. It is not a general YAML 1.1 parser.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F003 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Session overview duration uses first and last `HH:MM:SS` on that calendar day only, regardless of `event`. Turn duration uses that turn’s prompt-kind (or first/last turn-0) timestamps. Never Cursor `duration_ms`. Inverted and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|`. Newlines are spaces before the 100-character preview limit. The Prompt line and Subagent cell use the same `preview`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML, no Markdown (AC-F004.13).
- F001 stdin decode and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers jsonl, index, YAML). Report is written after persist returns. A later YAML append the same day overwrites `.md`.

---

> last updated: 2026-09-02T08:31:30Z
