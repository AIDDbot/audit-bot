---
spec-kind: functional
container: cli
---
# F004-session-end-report - cli

## Specification

On ingest that appends a Session YAML log document (payload has an F001 session identifier), after that document is in `{session_id}.yaml`, write `{session_id}.md` in the same daily folder. Produce the report only from that YAML file (every document, file order, no re-sort), including when no session-end document is present. Same invocation. No second process. No new CLI command. No new hook registrations (F006 registers `stop`). This spec does not replace F001–F003 or F005–F006.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **stale for this amend**; `/codify` must amend it (Step 3). Do not amend architecture in this planify run. [`system.arch.md`](../../arch/system.arch.md) still says the Session report is overwritten on a later session-end. [`docs/specs/PRD.md`](../PRD.md) report blurb still says “when session-end is ingested”.

Grounding (F004 shipped 0.8.0; F005 0.9.0; this is an amend/replan of the session-end gate):

- `cli/src/report.ts`: `parseYamlDocuments` / `emitSessionReport` / `writeSessionReport` already exist. Overview duration is already first→last `HH:MM:SS`. `triggeringHarness` still walks documents whose `source_event` is `sessionEnd` / `SessionEnd` — redo to last document. `detailsByEvent` subagent start is `agent_type` only — redo to `agent_type`, then `task`. Parser, locked Markdown shape, truncation, cell escape, and event-count first-seen order stay
- `cli/src/ingest.ts`: `maybeWriteReport` still returns unless `input.event` is `sessionEnd` or `SessionEnd`. Redo: write after any YAML append (`sessionId` defined). Persist-then-isolate-report stays
- `cli/src/yaml.ts`: F003 emitter. **Do not** add `task` source-key mapping here (F006 cli plan). Report Details must still list `task` when that key is already present in the YAML document
- `cli/src/store.ts`: `persistIngest` under `ingest.lock` still does not write `.md`. Keep it
- `cli/src/argv.ts` / `cli/src/index.ts` / `cli/src/event.ts`: keep. Positionals are YAML-header only; they do **not** gate the report
- `.cursor/hooks.json`: five F005 events. Leave it. Do not register `stop` here. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/report.test.ts`: tests that assume overview `source_harness` comes from a session-end document, and Details without `task`, must be rewritten. Duration tests today use sessionStart then sessionEnd only
- `cli/test/ingest.test.ts`: several fixtures still assert **no** `.md` for `sessionStart`, `beforeSubmitPrompt`, and subagent/stop (F005 leftover). Flip those. Overwrite test is still a later `sessionEnd`
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules (except this invocation may **read** the Session YAML log after the document just appended is present), project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks

Unit tests cover AC-F004.2, .4–.11, .13–.16 at lib except entry spawn/`exitCode` (those are e2e). Drop AC-F004.1, .3, .12.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003).

This feature’s fourth daily artifact: **Session report** — one `{session_id}.md` per session that received a YAML document that day; Markdown with tables; overwritten on every later YAML append for that session the same day. `/codify` must document this (Step 3); schema today still says overwritten on a later session-end.

### Shared store wording

> Copy this block verbatim into the F004 e2e plan. Event log, Session index, YAML, project root, and day folder stay as F003. Session report is written after every YAML append. Argv does not gate the report.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order.
- Event kinds: session start; session end; subagent start; subagent stop; user prompt; agent stop (names in `docs/events-args.md`).
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (payload has a session identifier), after that document is in the file. Do **not** require `source_event` to be `sessionEnd` or `SessionEnd`. Do **not** infer the trigger from the JSONL payload. Still produce a report when no session-end document is in the file.
- Produce only from that session’s Session YAML log (every document, file order, no re-sort). Do not read the Event log or Session index.
- Always a `.md` file. Markdown with tables, never HTML. Overwrite on a later YAML append for the same session the same day; do not append a second report.
- Overview: `session_id` (F001 identifier / first document); `source_harness` from the **last** document (the ingest that just ran), not from a session-end document; start = first document `timestamp`; end = last document `timestamp`; duration = elapsed clock time first→last as zero-padded `HH:MM:SS`, regardless of those documents’ `source_event`. Do **not** use Cursor `duration_ms` or any session-end-only field. Last before first or equal → `00:00:00`.
- Event-count summary: total YAML documents; count per distinct `source_event` (first-seen order).
- Chronological table: Time, Event, Details. Details follow `docs/normalized-fields.md` excluding `session_id`: session start empty; session end `reason`; subagent start `agent_type`, then `task`; subagent stop `agent_type`, `response_text`; user prompt `prompt`; agent stop empty. Omit absent fields. Present `null` appears. Multiple fields `{name}: {value}` separated by `; `. Preview >80 chars → first 80 + `...`; ≤80 no ellipsis; newlines become spaces before the limit. Flat rows; do not nest subagents.
- When report generation fails: still persist F001/F003, exit 0, no blocking stdout.
- No YAML parsing library. No new CLI command. No new hook registrations (F006 registers `stop`).

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After persist returns, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs for the YAML header. They do **not** gate the Session report (any YAML-appending ingest writes the report). Do not write them onto the Event log line. Do not use them to skip or filter persist. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — unchanged by this F004 amend. Registrations are F001 / F005 / F006. Do not add or remove hooks in this plan.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Report parser + Markdown emitter (lib) | redo | `triggeringHarness` still walks session-end docs; Details omit `task`; tests assume session-end-only overview harness (AC-F004.3 drop → AC-F004.15) |
| Wire report into ingest after YAML persist | redo | Gate is still `sessionEnd` / `SessionEnd` (AC-F004.1 drop → AC-F004.14); overwrite test is later session-end (AC-F004.12 drop → AC-F004.16) |
| Amend architecture and model schema | redo | Docs still say session-end report gate and later-session-end overwrite; PRD report blurb still session-end |
| Test runner and AC sweep | redo | AC ids changed: drop .1 .3 .12; add .14 .15 .16; re-verify .2 .4–.11 .13 |

## Implementation Steps

### Step 1: Last-document overview and Details `task`
Keep the shipped parser and Markdown shape. Change overview `source_harness` to the last YAML document (not a session-end walk). Add `task` after `agent_type` in subagent-start Details. Feed `task` from YAML text already containing that key — do not map it in `yaml.ts`.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [ ] Replace `triggeringHarness` so overview `source_harness` is the last document’s header (file order), not the last `sessionEnd` / `SessionEnd`. One-document files use that document. Keep Field / Value order: `session_id` (first), `source_harness` (last), `start` (first `timestamp`), `end` (last `timestamp`), `duration` (AC-F004.15, AC-F004.8)
- [ ] Keep duration as seconds-of-day last − first; last < first or last === first → `00:00:00`. Do not read `duration_ms` or any session-end-only field from body or header (AC-F004.15)
- [ ] `detailsByEvent`: subagent start (`subagentStart` / `SubagentStart`) → `["agent_type", "task"]`. Keep session start empty; session end `reason`; subagent stop `agent_type`, `response_text`; prompt `prompt`; agent stop empty; unmapped / header-only empty. Omit absent; present `null` still `null` (AC-F004.5)

| kind | `source_event` aliases | Details fields (table order) |
|------|------------------------|------------------------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none — empty)* |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type`, `task` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type`, `response_text` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none — empty)* |
| unmapped | any other header `source_event` | *(none — empty)* |

- [ ] Keep locked Markdown shape for sessionStart then sessionEnd (still valid when last doc is session-end / cursor). Keep parser F003 shapes, truncation, `|` escape, consecutive subagent rows, Claude `SessionEnd` vs Copilot `sessionEnd` counts (AC-F004.2, AC-F004.4, AC-F004.6, AC-F004.7, AC-F004.8)
- [ ] Unit-test overview `source_harness` from the last document when that document is **not** session-end: sessionStart `cursor` then `beforeSubmitPrompt` `copilot` → `copilot`; sessionEnd `cursor` then sessionStart `copilot` → `copilot` (must not stay `cursor`). Single sessionStart `cursor` (no session-end in the file) → `cursor` and duration `00:00:00` (AC-F004.15)
- [ ] Unit-test duration first→last regardless of `source_event`: sessionStart `15:00:00` then `stop` `15:01:00` → `00:01:00`; two `subagentStart` timestamps `15:00:00` then `16:01:09` → `01:01:09`. Equal and inverted still `00:00:00`. YAML body extra `duration_ms: 999999` (or payload `duration_ms`) must not change duration (AC-F004.15)
- [ ] Unit-test Details `task` from **hand-written** YAML (do not call `emitYamlDocument` / do not change `yaml.ts`): `agent_type: explore` then `task: do the thing` → `agent_type: explore; task: do the thing`; `task` absent → `agent_type` only; `task` present and `agent_type` absent → `task` only; present `task: null` appears; Copilot/Claude-shaped docs without `task` omit it. Truncate `task` >80; `|` in `task` stays one cell (`\|`) (AC-F004.5, AC-F004.6, AC-F004.8)
- [ ] Keep asserting Details omit `transcript_path` even when a fixture YAML document still contains that body key (AC-F004.5)

---

### Step 2: Write report after every YAML append
Keep `persistIngest` as F001+F003. After it returns, when `sessionId` is defined, read `{session_id}.yaml` and overwrite `{session_id}.md`. Do **not** gate on `sessionEnd` / `SessionEnd`. Isolate report failures. Do not read `events.jsonl` or `sessions.json`. Do not map `task` in `yaml.ts`.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/report.ts`
    - `cli/src/index.ts`
    - `cli/src/argv.ts`
    - `cli/test/ingest.test.ts`
    - `.agents/hooks/index.mjs`
- [ ] Keep `parseArgv`, `index.ts`, `sessionIdentifier`, `eventLogLine`, and `persistIngest` lock/append behavior as shipped. Do not add a report command. Do not change `.cursor/hooks.json`. Entry spawn/`exitCode` remains e2e (AC-F004.9, AC-F004.10)
- [ ] `maybeWriteReport`: drop the `sessionEnd` / `SessionEnd` check. If `sessionId` is defined, call `writeSessionReport` for `{dayFolder}/{sessionId}.yaml` and `{dayFolder}/{sessionId}.md`. Keep the try/catch so a throw cannot undo persist; `ingestHook` still swallows everything. Omitted/`""` event still writes a report when a session id exists (YAML still appended). Do **not** treat payload `hook_event_name` as the trigger (AC-F004.14, AC-F004.9)
- [ ] Do not change `store.ts` to write `.md`. Report read happens after persist returns. Do not open jsonl or `sessions.json` inside `report.ts` (AC-F004.11)
- [ ] Flip ingest tests that currently assert **no** `.md` for YAML-appending events: `sessionStart` with a session id **does** write `.md`; `beforeSubmitPrompt` with a session id **does** write `.md`; subagent start/stop/`stop` with a session id **does** write `.md`. Keep jsonl/yaml assertions (AC-F004.14)
- [ ] Unit-test `ingestHook`: `event: "sessionStart"` (and `event: "stop"`, omitted event) with `{ session_id: "sess-1" }` writes jsonl + index + yaml **and** `{session_id}.md` equal to `emitSessionReport` of that yaml, with no session-end document in the file. Overview `source_harness` matches the last (only) document (AC-F004.14, AC-F004.15, AC-F004.8)
- [ ] Unit-test `ingestHook`: `event: "sessionStart"` even when payload `hook_event_name` is `sessionEnd` **does** write `.md` from the yaml (positional/session id gate the persist; payload does not gate the report) (AC-F004.14)
- [ ] Keep: Copilot `sessionId` only (no F001 identifier) writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` and no `.md` — even when `event` is `sessionEnd` or `sessionStart` (AC-F004.13)
- [ ] Replace the later-sessionEnd overwrite test: sessionStart then `beforeSubmitPrompt` (or any later YAML append) the same day overwrites `{session_id}.md` (one `## Overview`, table row count matches yaml document count). A later `sessionEnd` may still overwrite, but is no longer the only overwrite case (AC-F004.16)
- [ ] Unit-test report path does not consult jsonl: after a YAML-appending ingest, `.md` matches the yaml; derive expected only from the yaml file (AC-F004.11)
- [ ] Keep `writeSessionReport` throws on empty yaml. Unit-test `ingestHook`: mkdir `{session_id}.md` as a directory before a **non-session-end** ingest (e.g. `sessionStart`) so `writeFile` fails; ingestHook still resolves; jsonl/yaml/index are written (AC-F004.9)
- [ ] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F004.10)

---

### Step 3: Amend architecture for YAML-append report
Architecture and PRD still describe a session-end report gate. Amend docs in the `/codify` run (not this planify run). Do not change Cursor registration. Do not add `task` mapping in `yaml.ts`.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
    - `docs/model/model.schema.md`
    - `docs/specs/PRD.md`
- [ ] `cli.arch.md` ingest row: optional positionals are passed into ingest for the YAML header only. They do **not** gate the Session report. Not overlaid on the Event log; not used to skip/filter persist; empty string when omitted. Command still writes Event log + Session index, appends `{session_id}.yaml` when a session identifier exists, and after that YAML document is in the file writes `{session_id}.md` (any YAML-appending ingest, including when no session-end document is present)
- [ ] `cli.arch.md` code organization: keep `src/report.ts`. Keep entry vs lib split
- [ ] `system.arch.md` overview: daily artifacts are Event log, Session index, Session YAML log, and Session report overwritten on every later YAML append for that session the same day (not “later session-end”). Cursor invocation line stays the current F005 five-event list unless F006 already amended it; this step does **not** add `stop`
- [ ] `model.schema.md`: Session report is the per-session Markdown file overwritten on every later YAML append for that session the same day
- [ ] `docs/specs/PRD.md` report blurb: generate the Markdown session report after every YAML-appending ingest, not only when session-end is ingested
- [ ] Do not revive `.cmd` wrappers. Do not change `.cursor/hooks.json`. Do not register Copilot, Claude, or Cursor `stop` in this spec

---

### Step 4: Re-verify remaining ACs
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F004.10)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. `triggeringHarness` / `maybeWriteReport` must stay ≤ 8 after dropping the session-end branches
- [ ] Unit tests cover AC-F004.2, .4–.11, .13–.16 at lib (parser/emitter + ingest wiring) except entry argv/`exitCode`/stdout spawn, which is e2e. Do **not** keep tests whose pass condition is AC-F004.1 (session-end-only write), AC-F004.3 (session-end-only harness), or AC-F004.12 (overwrite only on later session-end)
- [ ] Leave `hooks.test.ts` asserting the current five shell-string commands (F004 does not add or remove hooks)

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Architecture (`cli.arch.md`, `system.arch.md`, `model.schema.md`) and `docs/specs/PRD.md` are stale relative to this amend (session-end report gate, later-session-end overwrite). This planify run does not amend those files; `/codify` Step 3 does.
- YAML emitter for `task` is the F006 cli plan. This container must not duplicate `yaml.ts` source-key mapping. Report Details still list `task` when that field is already in the YAML document (hand-written fixtures).
- Cursor `stop` registration is F006. This plan does not add or remove hooks.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `parseYamlDocuments` / `emitSessionReport` by importing `cli/src`.
- No YAML parsing library: the report parser accepts only F003’s fixed-structure multi-document key-value YAML. It is not a general YAML 1.1 parser.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Report generation failure must not undo F001/F003 writes: persist first, isolate the report read/write, `ingestHook` still does not throw, still no blocking stdout (e2e asserts `exitCode` 0).
- Duration uses first and last `HH:MM:SS` on that calendar day only, regardless of `source_event`. Never Cursor `duration_ms`. Inverted and equal timestamps both yield `00:00:00`.
- Table-cell escaping: `|` in a field value is emitted as `\|`. Newlines are spaces before the 80-character preview limit.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML, no Markdown (AC-F004.13).
- F001 stdin decode and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock still covers jsonl, index, YAML). Report is written after persist returns. A later YAML append the same day overwrites `.md`.

---

> last updated: 2026-09-01T12:04:00Z
