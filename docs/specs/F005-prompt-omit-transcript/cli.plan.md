---
spec-kind: functional
container: cli
---
# F005-prompt-omit-transcript - cli

## Specification

Register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with the same shell-string command shape as the other registered events. On `ingest cursor beforeSubmitPrompt`, persist as F001 (verbatim Event log, Session index) and F003 (Session YAML log when a session identifier exists). Prompt YAML is the five-field header including integer `turn`, then `prompt` when present (omit if absent; do not duplicate `session_id` in the body). Drop `transcript_path` from YAML for subagent start, subagent stop, and agent stop (agent stop body is empty); JSONL stays verbatim. F004 Details follow that table. Remain observe-only. This spec does not replace F001–F004. This amend does not revert F006 `task` or F007 `agent_display_name`. Do not implement F008 numbering.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this amend**. Already names six Cursor events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, `stop`) and the same `node .agents/hooks/index.mjs ingest cursor {event}` command shape. Does not describe a four-field YAML header. [`system.arch.md`](../../arch/system.arch.md) overview already lists those six events. [`docs/normalized-fields.md`](../../normalized-fields.md) already dropped `transcript_path` and keeps `prompt` (plus later F006 `task` / F007 `agent_display_name`). Do not amend architecture in this planify run. `/codify` has no architecture step.

Grounding (F005 shipped 0.9.0; F003 0.12.0 five-field header; F004 0.13.0 groups the report by turn; this is the F008-amend replan):

- `cli/src/yaml.ts`: `emitYamlDocument` already emits five header keys then body, including unquoted integer `turn`. `YamlDocumentInput` already has `turn: number`. Prompt mapping (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit` → `prompt`) already exists. `transcript_path` is already absent from `subagentStartFields`, `subagentStopFields`, and `agentStopFields` (`emptyFields`). F006 `task` and F007 `agent_display_name` are already on the subagent maps. **Do not change product code.** Do not revert those later fields
- `cli/src/ingest.ts`: `sessionYamlDocument` already passes `turn: 0`. Numbering is F008 — this container must not count prompt-kind documents
- `cli/src/report.ts`: Details already omit `transcript_path`. Report already groups by turn (F004 0.13.0). Prompt Details stay `prompt`. Agent stop Details empty. F006 `task` / F007 `agent_display_name` stay. **F005 does not change report structure**
- `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F003 YAML append, F004 report-after-every-YAML-append. Keep them
- `.cursor/hooks.json`: six events including `beforeSubmitPrompt` and F006 `stop`. **Do not change.** Do not remove `stop`. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/hooks.test.ts`: already asserts those six events and the shell-string commands
- `cli/test/yaml.test.ts` and `cli/test/ingest.test.ts`: Cursor prompt exact-string fixtures already include `turn: 0` immediately after `timestamp` (F003 0.12.0). No test title currently cites `AC-F005.3` or “four-field”. Redo is titles/AC ids only: cite `AC-F005.6`; five keys including `turn`. Do not change expected YAML strings
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` change, so no rebuild unless a later step edits source. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor hooks
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude prompt and agent-stop still applies if those events are received via ingest
- Do not implement F008 numbering. Do not revert F006 `task` or F007 `agent_display_name`

Unit tests cover AC-F005.1, .2, .4, .5, .6 at lib except entry spawn/`exitCode` (those are e2e). Not AC-F005.3 (deprecated).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003), each with integer `turn` (F008); a **Session report** is the Markdown file derived from that YAML (F004), grouped by `turn`.

This spec does not add persisted entities. It adds a Cursor `beforeSubmitPrompt` invocation that writes the same ingest artifacts, and it narrows the YAML body (and thus F004 Details) by dropping `transcript_path`. Agent-stop YAML is header-only. This amend aligns the prompt YAML header with the five F003 fields including `turn`. Do not persist `turn` on the Event log line.

### Shared store wording

> Copy this block verbatim into the F005 e2e plan. Event log, Session index, project root, and day folder stay as F001. Session YAML log header is five fields including integer `turn`. YAML/Details omit `transcript_path`. Cursor registration is six events including F006 `stop`. Prompt body follows the header.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, or any overlay. Do not omit empty fields. A generated YAML timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- `transcript_path` on the payload stays on the Event log line (F001 verbatim). Do not strip it.

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
  - `turn` is a YAML integer (F008; not a body field). This spec requires the field, its order, and that it is a YAML integer. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- User-prompt body after the five header fields is `prompt` when the mapped source key is present. When that key is absent, omit `prompt`. Do not duplicate `session_id` in the body.
- Do **not** include `transcript_path` in any YAML document (including subagent start, subagent stop, and agent stop). Agent stop body is empty (five header fields only).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the five header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session YAML log document (F004 as shipped). Overwrite on a later YAML append for the same session the same day. YAML-only source. Trigger, per-turn subsections, and duration stay F004; do not re-specify them here.
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `agent_type`, then `agent_display_name`, then `task`; subagent stop `agent_type`, then `agent_display_name`, then `response_text`; user prompt `prompt`; agent stop empty. Omit absent fields. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `beforeSubmitPrompt` continue/block, `stop` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F005 registered five events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`). The product now also registers `stop` (F006) — six events. This F005 amend does **not** add extra events and does **not** remove F006 `stop`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. YAML mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Drop `transcript_path` from YAML mapping | keep | already omitted from subagent start/stop and agent stop; prompt mapping stays; do not revert F006 `task` or F007 `agent_display_name` |
| Drop `transcript_path` from report Details | keep | already omitted; F004 groups by turn; F005 does not change report structure |
| Register the fifth Cursor event | keep | `beforeSubmitPrompt` already in `.cursor/hooks.json`; six events including F006 `stop` — do not remove `stop`; do not change hooks.json |
| ingestHook coverage for prompt persist and omit-transcript | keep | persist, omit-transcript, and observe-only already covered; prompt YAML already includes `turn: 0`; F004 already writes `.md` after prompt ingest — do not restore “no `.md`” |
| Prompt YAML header tests (four-field / AC-F005.3) | redo | four keys → five including `turn`; AC-F005.3 → AC-F005.6. Exact strings already have `turn: 0`; remaining is titles/AC ids. No product code |
| Amend architecture for the fifth event | keep | `cli.arch.md` / `system.arch.md` already list six events including `beforeSubmitPrompt` and `stop`; architecture never listed a four-field header. `/codify` does not amend those files |
| Test runner and AC sweep | redo | coverage is AC-F005.1, .2, .4, .5, .6 (not .3) |

## Implementation Steps

### Step 1: Prompt YAML header tests cite AC-F005.6 (five fields including `turn`)
No product code. `emitYamlDocument` already emits integer `turn`. Cursor prompt exact-string fixtures in `cli/test/yaml.test.ts` and `cli/test/ingest.test.ts` already include `turn: 0` after `timestamp`. Retitle those tests to AC-F005.6. Do not change expected YAML strings. Do not implement F008 numbering.
- Paths:
    - `cli/test/yaml.test.ts`
    - `cli/test/ingest.test.ts`
- [x] Retitle the Cursor prompt exact-string tests so each title includes `AC-F005.6`. Do **not** leave an AC-F005.3 title. Current titles (no AC id today): `Cursor prompt maps prompt`; `Cursor prompt absent is header only`; `Cursor prompt present null emits null and body has no session_id`; `cursor beforeSubmitPrompt with prompt writes jsonl index yaml and md`; `cursor beforeSubmitPrompt without prompt writes yaml header only` (AC-F005.6)
- [x] Keep the existing exact-string expected documents. They already start with `session_id`, `source_harness`, `source_event`, `timestamp`, `turn: 0`, then `prompt` when present (omit when absent; one `session_id` line). Do not change those strings. Do not require incrementing, prompt-kind counting, or turn 1 (AC-F005.6)
- [x] Keep omit-transcript YAML tests (`transcript_path` on payload, absent from YAML, present on JSONL) and hooks.json six-event tests as shipped (AC-F005.1, AC-F005.4)
- [x] Keep ingest persist for `beforeSubmitPrompt` (verbatim jsonl, Session index, YAML when a session identifier exists; Copilot `sessionId` only → no YAML). F004 already writes `.md` after that YAML append — do **not** restore the prior-plan “no `.md`” assert (AC-F005.2)
- [x] Do not edit `cli/src/**`. Do not change `.cursor/hooks.json`. Do not revert F006 `task` or F007 `agent_display_name`

---

### Step 2: Test runner and AC sweep
No product code unless Step 1 somehow forces it (it must not). Cover AC-F005.6, not .3.
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F005.5)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. No `bun run build` unless `cli/src/` changed (it must not)
- [x] Unit tests cover AC-F005.1, .2, .4, .5, .6 at lib (hooks.json + yaml/report emitters + ingestHook persist) except entry argv/`exitCode`/stdout spawn, which is e2e. Do **not** keep tests whose pass condition is AC-F005.3 (four-field header)
- [x] Leave `hooks.test.ts` asserting the current six shell-string commands (F005 does not add or remove hooks on this amend)

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Architecture (`cli.arch.md`, `system.arch.md`) is current: six Cursor events including `beforeSubmitPrompt` and `stop`; no four-field header. This planify run does not amend those files; `/codify` has no architecture step.
- Product code is **not** needed. `emitYamlDocument` already has `turn`. Prompt tests already include `turn: 0`. Remaining work is test titles/AC ids (AC-F005.3 → AC-F005.6).
- Do not change `.cursor/hooks.json` (six events). Do not remove F006 `stop`.
- Do not revert F006 `task` or F007 `agent_display_name`.
- Do not implement F008 numbering. Ingest may keep writing `turn: 0`. Unit exact-strings may keep `turn: 0`; they must not require incrementing or turn 1.
- F004 already writes `{session_id}.md` after every YAML append, including prompt. The prior F005 plan’s “no `.md` for prompt” assert is stale; do not restore it. F005 does not change report structure (grouping stays F004).
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `emitSessionReport` / `ingestHook` / `hooks.json` by importing `cli/src` (and reading the JSON file).
- `transcript_path` stays on the Event log line (F001 verbatim). Do not overlay, redact, or omit it from JSONL.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Did not git commit (parent instruction: stay on master, do not commit).
- `/codify` (cli): no `cli/test/**` title cited AC-F005.3 and no test sliced four header keys. Expected prompt YAML already has unquoted `turn: 0`; did not add extra key-slice asserts. Spec status set to `in-progress`. Did not commit (parent: stay on `feat/F005-prompt-omit-transcript`). No `cli/src/` change; no rebuild.

---

> last updated: 2026-09-01T21:20:00Z
