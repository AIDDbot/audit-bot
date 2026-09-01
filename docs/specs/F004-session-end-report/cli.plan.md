---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest that appends a Session YAML log document (payload has an F001 session identifier), after that document is in `{session_id}.yaml`, write `{session_id}.md` in the same daily folder. Produce the report only from that YAML file (every document, file order, no re-sort), including when no session-end document is present. Same invocation. No second process. No new CLI command. No new hook registrations (F001 / F005 / F006). This spec does not replace F001–F003 or F005–F008. This amend is F008’s report consumer: group the chronological event list by conversation turn. Do not implement F008 prompt-counting in ingest.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this grouping amend**. Ingest already writes `{session_id}.md` after every YAML append; argv does not gate the report; six Cursor events. [`model.schema.md`](../../model/model.schema.md) already groups the Session report by document `turn`. `cli.arch.md` does **not** describe a session-wide Events table. Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F004 shipped 0.10.0 session-end-gate drop; F003 0.12.0 five-field header; this is an amend/replan of F008 report grouping):

- `cli/src/report.ts`: `YamlDoc` is `session_id`, `source_harness`, `source_event`, `timestamp`, `body`. **No `turn`.** `headerKeys` already includes `"turn"` (F003 0.12.0) so `turn` is not in Details. `stringField` returns strings. `eventsSection` still emits `## Events` plus one table of all docs. Overview last-document `source_harness`, first→last duration, and `detailsByEvent` (incl. `agent_display_name`, `task`) stay. Redo: parse integer `turn` onto `YamlDoc` (missing/invalid → `0`); drop `## Events`; group by `doc.turn` ascending. Complexity ≤ 8: split `turnGroups`, `turnDuration`, `turnPrompt`, `turnSection`. Reuse `formatDuration` / `preview`. Do not add a YAML library
- `cli/src/ingest.ts`: `maybeWriteReport` already writes after any YAML append (`sessionId` defined). Persist-then-isolate-report stays. **Keep.** Do **not** redo the 0.10.0 session-end-gate drop. `sessionYamlDocument` still passes `turn: 0` — numbering is F008; this container must not count prompt-kind documents
- `cli/src/yaml.ts`: F003 emitter already has five-field header including integer `turn`. **Do not** change it. Report tests feed mixed turns via `emitYamlDocument({ ..., turn: n })`
- `cli/src/store.ts`: `persistIngest` under `ingest.lock` still does not write `.md`. Keep it
- `cli/src/argv.ts` / `cli/src/index.ts` / `cli/src/event.ts`: keep. Positionals are YAML-header only; they do **not** gate the report
- `.cursor/hooks.json`: six events (F001/F005/F006). Leave it. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/report.test.ts`: locked Markdown still has `## Events`. `yamlDoc` always passes `turn: 0`. Four-field handwritten fixtures (no `turn` key) must still parse as `turn` `0`. Rewrite tests that assume a session-wide Events table. Add AC-F004.17 / .18 / .19
- `cli/test/ingest.test.ts`: overwrite test still splits `## Events` to count table rows. Flip that. Do not change when `.md` is written
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except this invocation may **read** the Session YAML log after the document just appended is present, including each document’s `turn`), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not implement F008 numbering. Do not register hooks. Do not add a YAML npm package

Unit tests cover AC-F004.2, .4, .6–.11, .13–.19 at lib except entry spawn/`exitCode` (those are e2e). Drop AC-F004.1, .3, .5, .12.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003), each with integer `turn` (F008).

This feature’s fourth daily artifact: **Session report** — one `{session_id}.md` per session that received a YAML document that day; Markdown with tables; overwritten on every later YAML append for that session the same day; events grouped by `turn`. Schema already says grouping; this container owns the Markdown emitter.

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, YAML, project root, and day folder stay as F003. Session YAML header is five fields including integer `turn` (F003 0.12.0). Numbering is F008; ingest may write `0`. Session report is written after every YAML append. Argv does not gate the report.

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
  - `turn` is a YAML integer (F008; not a body field). Numbering is F008. This F004 amend **reads** `turn`; ingest may write `0` until F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
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
- Each subsection: heading `## Turn {n}`; that turn’s duration as zero-padded `HH:MM:SS`; for turn **n ≥ 1**, that turn’s prompt preview when `prompt` is present on the prompt-kind document (omit the prompt line when `prompt` is absent); turn **0** has no prompt line; then a Markdown table of that turn’s documents in file order with columns Time, Event, and Details only. Do not add a fourth column. Blank line between Duration and the table (and between Duration and Prompt, and Prompt and the table, when Prompt is present).
- Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do not treat `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop` as a turn boundary or as the prompt-kind document.
- Turn duration: elapsed clock time, last-before-first or equal → `00:00:00`. For turn **n ≥ 1**, start = that turn’s prompt-kind document `timestamp` (first prompt-kind in that turn’s file-order docs if more than one); end = the last document in the file that has `turn: n`. For turn **0**, start = the first document with `turn: 0`; end = the last document with `turn: 0`. Do **not** close a turn on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. When turn **n ≥ 1** has no prompt-kind document, start = the first document of that turn so Duration still emits.
- Details follow current `docs/normalized-fields.md` excluding `session_id`: session start empty; session end `reason`; subagent start `agent_type`, then `agent_display_name`, then `task`; subagent stop `agent_type`, then `agent_display_name`, then `response_text`; user prompt `prompt`; agent stop empty. Header-only / unmapped empty. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Cursor and Claude Code have no `agent_display_name`; `task` still Copilot/Claude-absent (F006); omit absent fields. Preview >80 chars → first 80 + `...`; ≤80 no ellipsis; newlines become spaces before the limit. The same preview rules apply to the per-turn prompt line.
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
| Report parser + Markdown emitter (lib) | redo | group by `turn`; parse YAML integer `turn` onto `YamlDoc` (missing/invalid → `0`); drop `## Events` (AC-F004.5 drop → AC-F004.17–.19). Keep last-document overview, first→last session duration, current Details mapping. Do not redo the 0.10.0 session-end-gate drop |
| Wire report into ingest after YAML persist | keep | already writes after every YAML append (`sessionId` defined); persist-then-isolate-report stays. Do not redo the 0.10.0 session-end-gate drop. Ingest still passes `turn: 0` (F008 numbers later) |
| Amend architecture and model schema | keep | `cli.arch.md` does not describe a session-wide Events table; ingest row already writes `.md` after every YAML append; `model.schema.md` already groups by `turn`. Do not amend architecture in this planify run or `/codify` |
| Test runner and AC sweep | redo | coverage includes AC-F004.17 .18 .19; drop .5; rewrite tests that assume `## Events` or a single table of all documents |

## Implementation Steps

### Step 1: Parse `turn` and emit per-turn subsections
Keep overview, counts, Details, truncation, and cell escape. Change the event list from one `## Events` table to one `## Turn {n}` subsection per distinct `turn`. Parse `turn` as a number. Do not number turns in ingest. Do not add a YAML package.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [x] Add `turn: number` to `YamlDoc`. Parse it from the header (YAML integer). `stringField` stays for string headers. Missing key, empty, non-integer (including `1.5`), or otherwise invalid → `0` so four-field handwritten fixtures do not crash. Unquoted `0` / `1` / `3` parse as those numbers. Keep `headerKeys` including `"turn"` so `turn` never appears in Details (AC-F004.17)
- [x] Drop `eventsSection` / `## Events`. `emitSessionReport` still emits overview then event-count (session-level, unchanged), then one subsection per distinct `turn` in **ascending turn-number order**. Documents inside a subsection stay in **file order** (no timestamp re-sort). Omit a turn-0 subsection when no document has `turn` `0`. Do not invent empty intermediate turns. Do not add a fourth table column (AC-F004.2, AC-F004.17)
- [x] Split helpers so each stays complexity ≤ 8. Reuse `formatDuration` and `preview`. Suggested shape (tests lock this):

```
## Turn {n}

Duration: HH:MM:SS

Prompt: {80-char preview}

| Time | Event | Details |
| --- | --- | --- |
| ... | ... | ... |
```

  - `turnGroups(docs)` → `{ turn, docs }[]` for turns that appear, sorted by `turn` ascending; each `docs` array is that turn’s documents in file order
  - `turnDuration(group)` → `HH:MM:SS`. Turn **n ≥ 1**: start = that turn’s prompt-kind document `timestamp` (first prompt-kind in the group if more than one); end = last document in the group. Turn **0**: first group doc → last group doc. Prompt-kind is only `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`. Do **not** close on `stop` / `agentStop` / `Stop` / `subagentStop` / `SubagentStop`. Last before first or equal → `00:00:00`. When turn **n ≥ 1** has no prompt-kind document, start = first document of the group (AC-F004.18)
  - `turnPrompt(group)` → preview string or omit. Turn **0**: always omit. Turn **n ≥ 1**: from that turn’s prompt-kind document `body.prompt`, same 80-character single-line `preview` as Details. Omit when `prompt` is absent. Present `null` still previews as `null` (AC-F004.19, AC-F004.6)
  - `turnSection(group)` → heading, Duration line, optional Prompt line, then the three-column table. Blank line between Duration and the table; when Prompt is present, blank line after Duration before Prompt and after Prompt before the table. Reuse `eventRow` / `formatDetails`. Do not nest subagents (AC-F004.7, AC-F004.8)
- [x] Keep `detailsByEvent` as shipped (subagent start `agent_type`, `agent_display_name`, `task`; subagent stop `agent_type`, `agent_display_name`, `response_text`; session start empty; session end `reason`; prompt `prompt`; agent stop empty; unmapped / header-only empty). Omit absent; present `null` still `null`. Do not redo Details mapping (AC-F004.17)

| kind | `source_event` aliases | Details fields (table order) |
|------|------------------------|------------------------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none — empty)* |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type`, `agent_display_name`, `task` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type`, `agent_display_name`, `response_text` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none — empty)* |
| unmapped | any other header `source_event` | *(none — empty)* |

- [x] Replace the locked Markdown for sessionStart then sessionEnd (both `turn` `0`) with `## Turn 0` (Duration `00:01:00`, no Prompt line, same two table rows). Assert the report does **not** contain `## Events`. Keep Field / Value overview order and Event counts as shipped (AC-F004.8, AC-F004.15, AC-F004.17)
- [x] Extend `yamlDoc` (or equivalent) so tests pass `turn: n` into `emitYamlDocument`. Do not implement F008 numbering. Mixed-turn fixtures must set `turn` explicitly (AC-F004.17)
- [x] Unit-test parser: unquoted `turn: 3` → `docs[0].turn === 3`; omitted `turn` / four-field header → `0`; `turn: "x"` or `turn: 1.5` → `0`. `turn` is not a Details field even when present (AC-F004.17)
- [x] Unit-test AC-F004.17 grouping: documents with `turn` `0`, `2`, `1` (file order not sorted by turn) emit `## Turn 0` then `## Turn 1` then `## Turn 2`; each table contains only that turn’s rows in file order; no `## Events`; three columns only; a prompt-only file (`turn: 1`, no turn 0) omits `## Turn 0`
- [x] Unit-test AC-F004.18 duration: turn 1 prompt `15:00:00` then two `stop` docs `15:00:10` and `15:01:00` (all `turn: 1`) → that subsection `Duration: 00:01:00` (not closed on the first stop). Turn 0 sessionStart `15:00:00` then later sessionEnd `15:02:00` with a turn-1 block in between → Turn 0 duration `00:02:00`. Equal and inverted timestamps in a turn → `00:00:00`. Session overview duration stays first→last of the whole file (AC-F004.15, AC-F004.18)
- [x] Unit-test AC-F004.19 prompt line: turn 1 `beforeSubmitPrompt` with `prompt: hello` → `Prompt: hello`; Copilot `userPromptSubmitted` and Claude `UserPromptSubmit` also supply the prompt line; `prompt` absent → no `Prompt:` line; turn 0 subsection has no `Prompt:` line; prompt >80 characters uses the same `preview` as Details (`...`); `|` in prompt stays one cell on the table row and is escaped on the Prompt line if it appears there (AC-F004.6, AC-F004.19)
- [x] Keep existing Details `task` / `agent_display_name` / null / header-only / `transcript_path` omit / truncation / `|` escape / consecutive subagent rows / Claude `SessionEnd` vs Copilot `sessionEnd` counts — rewrite only the `## Events` assumption (rows still match; they now live under `## Turn 0` when those fixtures use default `turn: 0`) (AC-F004.2, AC-F004.4, AC-F004.6, AC-F004.7, AC-F004.8)
- [x] Keep overview `source_harness` from the last document and duration first→last regardless of `source_event` (already shipped; do not revive session-end walk) (AC-F004.15)

---

### Step 4: Re-verify remaining ACs
Keep ingest wiring. Flip tests that still assume `## Events`. Do not change when the report is written. Do not number turns in ingest.
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
- [x] Keep `parseArgv`, `index.ts`, `sessionIdentifier`, `eventLogLine`, `persistIngest`, and `maybeWriteReport` (write when `sessionId` is defined; try/catch; no session-end gate) as shipped. Do not add a report command. Do not change `.cursor/hooks.json`. Do not pass anything but `turn: 0` from `sessionYamlDocument` (F008). Entry spawn/`exitCode` remains e2e (AC-F004.9, AC-F004.10, AC-F004.14)
- [x] In `cli/test/ingest.test.ts`, replace the overwrite test’s `.split("## Events")` row count with a count of Time rows (`/^\| \d{2}:/`) across turn subsections; still one `## Overview`; row count still matches yaml document count; `.md` still equals `emitSessionReport` of that yaml. Do **not** keep a pass condition that requires `## Events` (AC-F004.16, AC-F004.5 drop)
- [x] Keep: YAML-appending events write `.md`; Copilot `sessionId` only writes no `.md`; report path does not consult jsonl; `writeSessionReport` throw still isolated (AC-F004.8, AC-F004.9, AC-F004.11, AC-F004.13, AC-F004.14)
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F004.10)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8 for `turnGroups` / `turnDuration` / `turnPrompt` / `turnSection` / `emitSessionReport`
- [x] Unit tests cover AC-F004.2, .4, .6–.11, .13–.19 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Do **not** keep tests whose pass condition is AC-F004.1 (session-end-only write), AC-F004.3 (session-end-only harness), AC-F004.5 (session-wide Events table), or AC-F004.12 (overwrite only on later session-end)
- [x] Leave `hooks.test.ts` asserting the current six shell-string commands (F004 does not add or remove hooks)
- [x] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Deviations

- Spec status was already `planned` (this plan assumed `pending` until the sibling e2e planify); `/codify` sets `in-progress`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) is current for this grouping amend: no session-wide Events table in `cli.arch.md`; schema already groups by `turn`. This planify run does not amend those files; `/codify` has no architecture step.
- Wire-report-into-ingest is **keep**. Do not redo the 0.10.0 session-end-gate drop (`maybeWriteReport` already runs after every YAML append).
- Do not implement F008 prompt-counting. Ingest may keep writing `turn: 0`. Unit tests feed mixed `turn` values through `emitYamlDocument` / handwritten YAML.
- YAML emitter for `turn` is F003 (shipped 0.12.0). This container must not change `yaml.ts` header/body mapping. Report Details still list `task` / `agent_display_name` when those keys are already in the YAML document.
- Cursor registration stays six events (F001 / F005 / F006). This plan does not add or remove hooks.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseYamlDocuments` / `emitSessionReport` by importing `cli/src`.
- No YAML parsing library: the report parser accepts only F003’s fixed-structure multi-document key-value YAML. It is not a general YAML 1.1 parser.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F003 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Session overview duration uses first and last `HH:MM:SS` on that calendar day only, regardless of `source_event`. Turn duration uses that turn’s prompt-kind (or first/last turn-0) timestamps. Never Cursor `duration_ms`. Inverted and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|`. Newlines are spaces before the 80-character preview limit. The Prompt line uses the same `preview`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML, no Markdown (AC-F004.13).
- F001 stdin decode and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers jsonl, index, YAML). Report is written after persist returns. A later YAML append the same day overwrites `.md`.

---

> last updated: 2026-09-01T20:50:00Z
