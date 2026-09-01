---
spec-kind: functional
container: cli
---
# F005-prompt-omit-transcript - cli

## Specification

Register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with the same shell-string command shape as the four existing events. On `ingest cursor beforeSubmitPrompt`, persist as F001 (verbatim Event log, Session index) and F003 (Session YAML log when a session identifier exists). Prompt YAML is four-field header then `prompt` when present (omit if absent; do not duplicate `session_id` in the body). Drop `transcript_path` from YAML for subagent start, subagent stop, and agent stop (agent stop body is empty); JSONL stays verbatim. F004 Details follow that table. Remain observe-only. This spec does not replace F001–F004.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **stale for this spec** (still names four Cursor events). `/codify` must amend it (Step 5). Do not amend architecture in this planify run. [`system.arch.md`](../../arch/system.arch.md) overview already lists `beforeSubmitPrompt` (specify). [`docs/normalized-fields.md`](../../normalized-fields.md) already dropped `transcript_path` from sections 3, 4, and 6 and keeps `prompt` in section 5 (specify).

Grounding (F004 shipped 0.8.0 / 0.8.1; this is the first F005 plan):

- `cli/src/yaml.ts`: `emitYamlDocument` already maps `beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit` → `prompt`. It still lists `transcript_path` on `subagentStartFields`, `subagentStopFields`, and `agentStopFields`. Drop those three mappings. Agent stop → empty body (`emptyFields`, same as session start)
- `cli/src/report.ts`: `detailsByEvent` still lists `transcript_path` for subagent start, subagent stop, and agent stop. Drop it. Prompt Details stay `prompt`. Agent stop Details empty
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: F001 persist, F003 YAML append, F004 session-end report gate. Keep them. Prompt ingest already works when `event` is `beforeSubmitPrompt` (`cli/test/yaml.test.ts`, `cli/test/ingest.test.ts` timestamp fixture)
- `.cursor/hooks.json`: four committed events, `node .agents/hooks/index.mjs ingest cursor {event}`. Working tree may already add `beforeSubmitPrompt` — register it in `/codify`, not this planify commit. Keep the four. Do not add `.cmd` wrappers (AGENTS.md learning scar)
- `cli/test/hooks.test.ts`: asserts **exactly four** events. Must become **five** including `beforeSubmitPrompt`
- `cli/test/yaml.test.ts` and `cli/test/report.test.ts`: still assert `transcript_path` in YAML / Details. Those tests fail unless updated
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML header / append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or extra Cursor events beyond the fifth (`stop`, tool-use, Tab, `workspaceOpen`)
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude prompt and agent-stop still applies if those events are received via ingest

Unit tests cover AC-F005.1–5 at lib except entry spawn/`exitCode` (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add persisted entities. It adds a fifth Cursor invocation that writes the same ingest artifacts, and it narrows the YAML body (and thus F004 Details) by dropping `transcript_path`. Agent-stop YAML becomes header-only.

### Shared store wording

> Copy this block verbatim into the F005 e2e plan. Event log, Session index, project root, day folder, Session YAML log, Session report, concurrency, argv stay as F004 except Cursor registration is five events and YAML/Details omit `transcript_path`.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written to *produce* the YAML).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do **not** include `transcript_path` in any YAML document (including subagent start, subagent stop, and agent stop). Agent stop body is empty.
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the four header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Unchanged F004 generation rules (session-end gate, overwrite, YAML-only source).
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `agent_type`; subagent stop `agent_type`, `response_text`; user prompt `prompt`; agent stop empty. Do **not** put `transcript_path` in Details.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report. Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them **and** so the Session report gate can use `source_event` (`sessionEnd` or `SessionEnd`). Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register `stop`, tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these five.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | keep | First F005 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: Drop `transcript_path` from YAML mapping
Remove `transcript_path` from the YAML body tables. Prompt mapping stays. Agent stop becomes header-only. Keep the four-field header and omit-absent / present-`null` rules. Do not strip `transcript_path` from the payload used for JSONL.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
    - `docs/normalized-fields.md`
- [ ] Delete the `transcript_path` `MappedField` from `subagentStartFields` and `subagentStopFields`. Point `agentStopFields` (or the `stop` / `agentStop` / `Stop` map entries) at `emptyFields`. Keep `promptFields`. Do not add a new emitter API (AC-F005.4)
- [ ] Mapping table after the drop (source key per harness; body name is the normalized field). Session start and agent stop bodies are empty. `docs/normalized-fields.md` already matches this table (specify); do not re-add `transcript_path`

| kind | `source_event` aliases | body field | cursor | copilot | claude-code |
|------|------------------------|------------|--------|---------|-------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none)* | | | |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` | `reason` | `reason` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type` | `subagent_type` | `agentName` | `agent_type` |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type` | `subagent_type` | `agentType` | `agent_type` |
| | | `response_text` | `summary` | `response` | `last_assistant_message` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` | `prompt` | `prompt` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none)* | | | |

- [ ] Keep existing Cursor prompt exact-string test (`prompt` after the four-field header; extra payload keys omitted). Add/keep: absent `prompt` → header only; present `prompt: null` → YAML `null`; body has no second `session_id` (AC-F005.3)
- [ ] Rewrite YAML exact-string tests that currently expect `transcript_path`: Cursor `subagentStart` body is `agent_type` only (payload still has `transcript_path`); Cursor `subagentStop` is `agent_type` then `response_text`; Cursor `stop` is header-only even when payload has `transcript_path`; Copilot `subagentStop` still uses `agentType` / `response` and must **not** emit `transcript_path` even when payload has `transcriptPath` (AC-F005.4)
- [ ] Keep the “absent body key omitted / present null” and “body has no `session_id` / keys stay flat” tests; those fixtures may still *send* `transcript_path` on the payload — assert it is absent from the document (AC-F005.3, AC-F005.4)

---

### Step 2: Drop `transcript_path` from report Details
F004 Details follow `docs/normalized-fields.md`. After Step 1, `yamlDoc` helpers no longer emit `transcript_path`, so existing Details assertions that include it fail even before this change. Align `detailsByEvent` with the table and update tests.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [ ] `detailsByEvent`: subagent start → `["agent_type"]`; subagent stop → `["agent_type", "response_text"]`; prompt unchanged `["prompt"]`; agent stop → `[]` (same as session start). Do not list `transcript_path` (AC-F005.4)
- [ ] Update Details unit tests: sessionStart empty; sessionEnd `reason`; subagentStart `agent_type: explore` (not `transcript_path`); subagentStop `agent_type: explore; response_text: done`; prompt `prompt: hello`; agent stop empty (`| 15:00:00 | stop |  |`); header-only / unrecognized empty; absent omitted; present `null` still appears (AC-F005.4)
- [ ] Assert Details omit `transcript_path` even when a fixture YAML document still contains that body key (locks `detailsByEvent`, independent of the emitter) (AC-F005.4)
- [ ] Keep locked Overview/Event-counts Markdown shape, duration, truncation, `|` cell escape, consecutive subagent rows, Claude `SessionEnd` vs Copilot `sessionEnd`. Consecutive-row fixtures may still pass `transcript_path` into `yamlDoc`; do not require it in Details

---

### Step 3: Register the fifth Cursor event
Add `beforeSubmitPrompt` in the same command shape as the four existing events. Do not add `.cmd` wrappers. Do not register `stop` or other extra Cursor events. Do not register Copilot or Claude.
- Paths:
    - `.cursor/hooks.json`
    - `cli/test/hooks.test.ts`
- [ ] `.cursor/hooks.json`: `"version": 1`; hooks keys `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt` (keep the four; add the fifth). Each `command` is `node .agents/hooks/index.mjs ingest cursor {event}`. Do not set `failClosed`. Working-tree file may already contain the fifth key — keep that shape; this step is the `/codify` commit of it (AC-F005.1)
- [ ] `hooks.test.ts`: `events` array becomes those five names. Assert `Object.keys(config.hooks)` equals that list. Per-event command still `node .agents/hooks/index.mjs ingest cursor ${event}`. Still assert no `.cursor/hooks/{event}.cmd` and no shared `ingest.cmd` (AC-F005.1)
- [ ] Do not add `.claude/settings.json` or `.github/hooks/` ingest config. Do not subscribe `stop`, tool-use, Tab, `workspaceOpen`, or any other Cursor event

---

### Step 4: ingestHook coverage for prompt persist and omit-transcript
Prompt YAML already works at the emitter. Cover AC-F005.2 / AC-F005.3 / AC-F005.4 through `ingestHook` (same persist path Cursor will invoke). Observe-only `exitCode` / stdout remain e2e; lib asserts `ingestHook` resolves and does not write a Session report for prompt.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/event.ts`
    - `.agents/hooks/index.mjs`
- [ ] Keep `parseArgv`, `index.ts` (shebang, `readFileSync(0)`, `ingestHook({ … harness, event })`, `finally { process.exitCode = 0 }`), `sessionIdentifier`, `eventLogLine`, `persistIngest`, and the session-end report gate as shipped. Do not add a prompt command. Entry spawn/`exitCode` remains e2e (AC-F005.5)
- [ ] Do not change Event log serialization to strip `transcript_path`. Do not use `beforeSubmitPrompt` or the omitted YAML field to skip, filter, or transform the JSONL line (AC-F005.2, AC-F005.4)
- [ ] Unit-test `ingestHook`: `harness: "cursor"`, `event: "beforeSubmitPrompt"`, payload `{ session_id: "sess-1", prompt: "hello" }` writes verbatim jsonl (deep-equals payload), appends `sess-1` to the index, and appends one YAML document with header `session_id` / `source_harness: cursor` / `source_event: beforeSubmitPrompt` / `timestamp` then `prompt: hello`; no body `session_id`; no `.md` (AC-F005.2, AC-F005.3, AC-F005.5)
- [ ] Unit-test `ingestHook`: same event, payload `{ session_id: "sess-1" }` (no `prompt`) writes jsonl + yaml header only; YAML does not contain `prompt:` (AC-F005.3)
- [ ] Unit-test `ingestHook`: `event: "beforeSubmitPrompt"` with only Copilot `sessionId` (no F001 identifier) writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` and no `.md` (AC-F005.2)
- [ ] Unit-test `ingestHook`: `event: "subagentStart"` (and `subagentStop` / `stop`) with a session identifier and payload `transcript_path` writes jsonl that still has `transcript_path`, and YAML that does **not** include `transcript_path`; `stop` YAML is header-only (AC-F005.4)
- [ ] Unit-test `ingestHook` still resolves (does not throw) for `beforeSubmitPrompt` and for subagent/stop payloads that include `transcript_path` (AC-F005.5)
- [ ] Keep existing F001/F003/F004 ingest assertions (verbatim jsonl, yaml append, session-end `.md` gate). Keep the existing `beforeSubmitPrompt` timestamp fixture
- [ ] `cd cli && bun run build` after `cli/src/` changes so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 5: Amend architecture for the fifth event
`cli.arch.md` still names four Cursor events. `system.arch.md` overview already lists `beforeSubmitPrompt` (specify) — confirm; do not regress to four. `normalized-fields.md` already dropped `transcript_path` (specify) — do not re-add it. Amend docs in the `/codify` run (not this planify run).
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
    - `docs/normalized-fields.md`
- [ ] `cli.arch.md` **Used by**: Cursor invokes ingest on `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt`, each with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Keep the shell-string / no-`.cmd` sentence
- [ ] Confirm `system.arch.md` overview still lists those five events and the same command shape. Do not drop `beforeSubmitPrompt`
- [ ] Confirm `docs/normalized-fields.md` sections 3, 4, and 6 have no `transcript_path` and section 5 still has `prompt`. Do not reopen F003/F004 specs
- [ ] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register `stop` or other extra Cursor events

---

### Step 6: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F005.5)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [ ] Unit tests cover AC-F005.1–5 at lib (hooks.json + yaml/report emitters + ingestHook persist) except entry argv/`exitCode`/stdout spawn, which is e2e

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Architecture: `cli.arch.md` is stale (four Cursor events). `system.arch.md` and `docs/normalized-fields.md` were already updated by specify. This planify run does not amend those files; `/codify` Step 5 does.
- `.cursor/hooks.json` may already list `beforeSubmitPrompt` in the working tree. This planify commit does **not** include it; `/codify` Step 3 does.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `emitSessionReport` / `ingestHook` / `hooks.json` by importing `cli/src` (and reading the JSON file).
- Prompt YAML mapping already exists; this spec registers the event and drops `transcript_path`. Do not rewrite the emitter.
- Agent-stop YAML has no remaining body fields after the drop (header only). Details for agent stop are empty.
- `transcript_path` stays on the Event log line (F001 verbatim). Do not overlay, redact, or omit it from JSONL.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, Cursor `stop`, tool-use, Tab, or `workspaceOpen`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.

---

> last updated: 2026-09-01T11:33:03Z
