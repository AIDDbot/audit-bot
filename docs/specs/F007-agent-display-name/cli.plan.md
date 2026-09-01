---
spec-kind: functional
container: cli
---
# F007-agent-display-name - cli

## Specification

Add Copilot `agentDisplayName` to subagent-start and subagent-stop YAML (and thus F004 Details) as `agent_display_name` after `agent_type`. Copilot source key is `agentDisplayName`. Cursor and Claude Code have no source key. Do not overlay `agent_type` (Copilot start stays `agentName`; Copilot stop stays `agentType`). Keep the F006 `task` exception. Remain observe-only. This spec does not replace F001–F006. Do not change when a Session report is written, overview `source_harness`, or duration (F004 as shipped). Do not add Cursor events or Copilot/Claude registrations.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current for this spec** (already names the six Cursor events). F007 adds **no** new events. Do not amend architecture event lists in this planify run or in `/codify`. [`docs/normalized-fields.md`](../../normalized-fields.md) still omits `agent_display_name` and still states only the `task` exception — `/codify` Step 1 amends that file (keep the `task` exception; add `agent_display_name` as a second explicit exception). Do not amend F003/F004/F006 specs or their plans. F004 spec already lists Details `agent_display_name` (amended at specify time); this F007 cli plan owns the **code** change to `detailsByEvent`.

Grounding (F006 shipped 0.10.0; this is the first F007 plan):

- `cli/src/yaml.ts`: `subagentStartFields` is `agent_type` then `task` (Cursor `task`; Copilot/Claude empty `""`). `subagentStopFields` is `agent_type` then `response_text`. `bodyLines` already skips empty `sourceKey` (`sourceKey.length === 0`) **before** `sourceKey in payload`. Reuse that skip; do **not** invent a second skip mechanism. Insert `agent_display_name` with Copilot `agentDisplayName` and empty Cursor/Claude keys
- `cli/src/report.ts`: `detailsByEvent` subagent start `["agent_type", "task"]`; subagent stop `["agent_type", "response_text"]`. Add `agent_display_name` after `agent_type` (before `task` on start; before `response_text` on stop). Do **not** change `maybeWriteReport`, `triggeringHarness`, duration, or overview
- `cli/src/ingest.ts` / `cli/src/store.ts` / `cli/src/event.ts` / `cli/src/argv.ts` / `cli/src/index.ts`: keep F001 persist, F003 YAML append, F004 report-after-every-YAML-append as shipped. Do not strip `agentDisplayName` from JSONL
- `.cursor/hooks.json`: six events. **Do not change** in F007
- `docs/normalized-fields.md`: intro has the `task` exception only. Section 3 has `agent_type` then `task`. Section 4 has `agent_type` then `response_text`. `/codify` Step 1 amends this file: add `agent_display_name` after `agent_type` in sections 3 and 4 (Copilot `agentDisplayName`; Cursor and Claude empty). Keep the `task` exception and add `agent_display_name` as a second explicit exception (same style). Do **not** remove the `task` exception
- `docs/events-args.md` already documents Copilot `agentDisplayName?: string`. Do not remap `agent_type` (start `agentName`, stop `agentType`)
- `cli/test/yaml.test.ts`: Copilot `subagentStart` with trap `task` → `agent_type` only. Keep that; add `agent_display_name` tests. Cursor fixtures without `agentDisplayName` stay without `agent_display_name`
- `cli/test/report.test.ts`: Details from handwritten YAML body. Add cases for `agent_display_name` present/absent; keep existing `task` cases (Cursor YAML without `agent_display_name` still shows `agent_type; task`)
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, YAML header / append-only rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events (hooks stay the six from F006)
- Do not register Copilot or Claude. YAML mapping for Copilot/Claude subagent start/stop still applies if those events are received via extra argv
- Do not plan ingest report-gate changes (`maybeWriteReport`) or `triggeringHarness` (F004 as shipped)

Unit tests cover AC-F007.1–7 at lib except entry spawn/`exitCode`/stdout (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents (F003); a **Session report** is the Markdown file derived from that YAML (F004).

This spec does not add persisted entities. Event log stays verbatim. YAML and report gain `agent_display_name` for Copilot when present; Cursor and Claude Code omit it.

### Shared store wording

> Copy this block verbatim into the F007 e2e plan.

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
- `transcript_path`, `task`, `agentDisplayName`, `agentName`, `agentDescription`, and every other payload key stay on the Event log line (F001 verbatim). Do not strip them.

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
- Subagent start body is `agent_type`, then `agent_display_name`, then `task`. Copilot source key for `agent_display_name` is `agentDisplayName`. Cursor and Claude Code have no source key for `agent_display_name` (explicit exception to the three-harness intro, alongside `task`). Cursor source key for `task` is `task`. Copilot and Claude Code have no source key for `task` (keep the F006 exception). Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor or Claude Code key. Do not use `agentDisplayName` as a fallback or overlay for `agent_type` (Copilot start `agent_type` stays `agentName`; Copilot stop `agent_type` stays `agentType`). Omit `agent_display_name` or `task` when that field’s source key is absent.
- Do **not** include `transcript_path` in any YAML document (F005). Agent stop body is empty (header only).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the four header fields only.
- Node builtins only: no YAML library.

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Generation trigger, overview `source_harness`, and duration stay F004 as shipped (write/overwrite after every YAML append). Do not change them here.
- Details follow `docs/normalized-fields.md`: session start empty; session end `reason`; subagent start `agent_type`, then `agent_display_name`, then `task`; subagent stop `agent_type`, then `agent_display_name`, then `response_text`; user prompt `prompt`; agent stop empty. Do **not** put `transcript_path` in Details. Omit absent fields.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. After that YAML document is in the file, the same invocation may **read** that Session YAML log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F003 writes. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Session report trigger stays F004 as shipped.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health, harness, or report).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `stop` continue/block, `beforeSubmitPrompt` continue/block, `subagentStart` `permission`, and `subagentStop` `followup_message`). Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Subscribe `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop`. Each event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register tool-use, Tab, `workspaceOpen`, or other Cursor events beyond these six. F007 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | keep | First F007 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: Add `agent_display_name` to YAML mapping
Insert `agent_display_name` after `agent_type` and before `task` on subagent start; after `agent_type` and before `response_text` on subagent stop. Copilot source key `agentDisplayName`. Cursor and Claude Code empty source keys. Reuse the existing empty-`sourceKey` skip. Keep the four-field header and omit-absent / present-`null` rules. Do not strip `agentDisplayName` from the payload used for JSONL. Do not overlay `agent_type`.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
    - `docs/normalized-fields.md`
- [ ] Insert a `MappedField` `{ name: "agent_display_name", cursor: "", copilot: "agentDisplayName", "claude-code": "" }` into `subagentStartFields` immediately after `agent_type` and before `task`. Insert the same field into `subagentStopFields` immediately after `agent_type` and before `response_text`. Do not add a new emitter API (AC-F007.1, AC-F007.2, AC-F007.3)
- [ ] Keep the existing `bodyLines` skip when `sourceKey` is empty (`sourceKey.length === 0`) **before** `sourceKey in payload`. Do **not** invent a second skip mechanism. Cursor and Claude Code never map `agent_display_name` from any other payload key (AC-F007.4, AC-F007.5)
- [ ] Mapping table after the add (source key per harness; body name is the normalized field). Session start and agent stop bodies stay empty. Copilot start YAML with `agentDisplayName` and **without** Cursor `task` mapping: body is `agent_type` then `agent_display_name` (`task` omitted because Copilot has no `task` source key). Copilot stop YAML with `agentDisplayName`: body is `agent_type` then `agent_display_name` then `response_text`

| kind | `source_event` aliases | body field | cursor | copilot | claude-code |
|------|------------------------|------------|--------|---------|-------------|
| sessionStart | `sessionStart`, `SessionStart` | *(none)* | | | |
| sessionEnd | `sessionEnd`, `SessionEnd` | `reason` | `reason` | `reason` | `reason` |
| subagentStart | `subagentStart`, `SubagentStart` | `agent_type` | `subagent_type` | `agentName` | `agent_type` |
| | | `agent_display_name` | *(none)* | `agentDisplayName` | *(none)* |
| | | `task` | `task` | *(none)* | *(none)* |
| subagentStop | `subagentStop`, `SubagentStop` | `agent_type` | `subagent_type` | `agentType` | `agent_type` |
| | | `agent_display_name` | *(none)* | `agentDisplayName` | *(none)* |
| | | `response_text` | `summary` | `response` | `last_assistant_message` |
| prompt | `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit` | `prompt` | `prompt` | `prompt` | `prompt` |
| agentStop | `stop`, `agentStop`, `Stop` | *(none)* | | | |

- [ ] `docs/normalized-fields.md`: add `agent_display_name` after `agent_type` in section 3 (Inicio de subagente) and section 4 (Fin de subagente) — Copilot `agentDisplayName`; Cursor and Claude Code columns empty. Keep the `task` exception in the intro; add `agent_display_name` as a second explicit exception (same style: Copilot has the source key; Cursor and Claude Code have no source key; ingest must not map `agent_display_name` from any other payload field). Do **not** remove the `task` exception (AC-F007.1)
- [ ] Keep the existing Copilot `subagentStart` exact-string test (trap `task` → `agent_type` only; YAML must **not** contain `task:`). That fixture has no `agentDisplayName` and must still omit `agent_display_name` (AC-F007.4)
- [ ] Keep Cursor `subagentStart` fixtures that omit `agentDisplayName` as **without** `agent_display_name` (absent `task` → `agent_type` only; present `task` → `agent_type` then `task`). Cursor `stop` stays header-only (AC-F007.5)
- [ ] Add Copilot `subagentStart` exact-string test: payload `{ agentName: "explore", agentDisplayName: "Explore" }` (and trap `task` if useful) → body `agent_type: explore` then `agent_display_name: Explore`; YAML must **not** contain `task:`; `agent_type` stays `"explore"` not `"Explore"` (AC-F007.2, AC-F007.6). Use different values for slug vs label. Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor/Claude key
- [ ] Add Copilot `subagentStart` `agentDisplayName: null` → YAML `null` after `agent_type` (AC-F007.2)
- [ ] Add Copilot `subagentStop` exact-string test: payload `{ agentType: "explore", agentDisplayName: "Explore", response: "done" }` → body `agent_type: explore` then `agent_display_name: Explore` then `response_text: done`; `agent_type` stays `"explore"` (AC-F007.3, AC-F007.6). Keep the existing Copilot `subagentStop` fixture without `agentDisplayName` as `agent_type` then `response_text` only
- [ ] Add Copilot start/stop tests with trap fields (`agentDescription`, `task`, Cursor `subagent_type`) and **absent** `agentDisplayName` → omit `agent_display_name`; do not invent it (AC-F007.4)
- [ ] Add Cursor `subagentStart` / `subagentStop` and Claude `SubagentStart` / `SubagentStop` exact-string tests: payload may include trap `agentDisplayName` / `agentDescription`; YAML must **not** contain `agent_display_name:` (AC-F007.5)
- [ ] Keep the “absent body key omitted / present null” and “body has no `session_id` / keys stay flat” tests; those Cursor fixtures may still omit `agent_display_name` — assert it is absent when the Cursor source key is empty (AC-F007.5)

---

### Step 2: Add `agent_display_name` to report Details
F004 Details follow `docs/normalized-fields.md`. After Step 1, `yamlDoc` helpers emit `agent_display_name` when Copilot sends it, so Details must list it. Touch `report.ts` **only** to add `agent_display_name` to `detailsByEvent`. Do not change `triggeringHarness`, duration, overview, or any report-gate helper. F004 spec already lists this Details order; this step owns the **code**.
- Paths:
    - `cli/src/report.ts`
    - `cli/test/report.test.ts`
- [ ] `detailsByEvent`: subagent start → `["agent_type", "agent_display_name", "task"]` (both `subagentStart` and `SubagentStart`). Subagent stop → `["agent_type", "agent_display_name", "response_text"]` (both `subagentStop` and `SubagentStop`). Leave agent stop `[]`. Do not list `transcript_path`. Do not edit `triggeringHarness` or `maybeWriteReport`
- [ ] Details unit tests from handwritten YAML: sessionStart empty; sessionEnd `reason`; subagentStart `agent_type: explore; agent_display_name: Explore; task: do the thing` when all three present; subagentStart `agent_type: explore; task: do the thing` when `agent_display_name` absent (keep existing Cursor `task` cases); subagentStop `agent_type: explore; agent_display_name: Explore; response_text: done` when present; omit `agent_display_name` when that body key is absent; prompt `prompt: hello`; agent stop empty (`| 15:00:00 | stop |  |`); header-only / unrecognized empty; absent omitted; present `null` still appears
- [ ] Assert Details omit `transcript_path` even when a fixture YAML document still contains that body key (locks `detailsByEvent`, independent of the emitter) (F005 remains in force)
- [ ] Assert Details include `agent_display_name` when a fixture YAML document has it after `agent_type`; omit it when that body key is absent. Cursor YAML without `agent_display_name` still shows `agent_type; task`
- [ ] Keep locked Overview/Event-counts Markdown shape, duration, truncation, `|` cell escape, consecutive subagent rows, Claude `SessionEnd` vs Copilot `sessionEnd`. Consecutive-row fixtures may still pass `transcript_path` into `yamlDoc`; do not require it in Details. Do not change duration or overview `source_harness` assertions (F004 as shipped)

---

### Step 3: ingestHook coverage
YAML mapping already works at the emitter after Step 1. Cover AC-F007.2–7 through `ingestHook` (same persist path extra argv will invoke). Observe-only `exitCode` / stdout remain e2e. Do not change persist, `maybeWriteReport`, or `triggeringHarness`.
- Paths:
    - `cli/test/ingest.test.ts`
    - `cli/src/ingest.ts`
    - `cli/src/store.ts`
    - `cli/src/event.ts`
    - `.agents/hooks/index.mjs`
- [ ] Keep `parseArgv`, `index.ts` (shebang, `readFileSync(0)`, `ingestHook({ … harness, event })`, `finally { process.exitCode = 0 }`), `sessionIdentifier`, `eventLogLine`, `persistIngest`, and the shipped F004 report-after-every-YAML-append as shipped. Do not add a command. Entry spawn/`exitCode`/stdout remains e2e (AC-F007.7)
- [ ] Do not change Event log serialization to strip `agentDisplayName`, `agentName`, `agentDescription`, `task`, or `transcript_path`. Do not use `agent_display_name` to skip, filter, or transform the JSONL line (AC-F007.7)
- [ ] Unit-test `ingestHook`: `harness: "copilot"`, `event: "subagentStart"`, payload `{ session_id: "sess-1", agentName: "explore", agentDisplayName: "Explore" }` writes verbatim jsonl (deep-equals payload, still has `agentDisplayName`), and YAML with `agent_type: explore` then `agent_display_name` then no `task:`; `agent_type` is not `"Explore"` (AC-F007.2, AC-F007.6, AC-F007.7)
- [ ] Unit-test `ingestHook`: `harness: "copilot"`, `event: "subagentStop"`, payload `{ session_id: "sess-1", agentType: "explore", agentDisplayName: "Explore", response: "done" }` writes verbatim jsonl including `agentDisplayName`, and YAML with `agent_type` then `agent_display_name` then `response_text`; `agent_type` stays `"explore"` (AC-F007.3, AC-F007.6, AC-F007.7)
- [ ] Unit-test `ingestHook`: Copilot start/stop with F001 `session_id` but **absent** `agentDisplayName` (may include trap `task` / `agentDescription`) writes YAML **without** `agent_display_name:` (AC-F007.4)
- [ ] Unit-test `ingestHook`: Cursor and Claude Code subagent start/stop (payload may include trap `agentDisplayName`) write YAML **without** `agent_display_name:` (AC-F007.5). Keep existing Cursor `task` and Copilot/Claude omit-`task` ingest assertions
- [ ] Unit-test `ingestHook`: Copilot `sessionId` alone (no F001 identifier) on start/stop still writes jsonl, leaves `sessions.json` as `[]`, creates no `.yaml` (AC-F007.7)
- [ ] Unit-test `ingestHook` still resolves (does not throw) for Copilot start/stop with or without `agentDisplayName` and for Cursor/Claude payloads that include trap fields (AC-F007.7)
- [ ] Keep existing F001/F003/F004/F005/F006 ingest assertions (verbatim jsonl, yaml append, report-after-YAML-append `.md` gate, prompt persist, `task`, stop header-only). Do not rewrite the report gate
- [ ] `cd cli && bun run build` after `cli/src/` changes so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build)

---

### Step 4: Confirm architecture unchanged
Architecture already names six Cursor events. F007 adds no events. `normalized-fields.md` is amended in Step 1, not a separate architecture rewrite. Confirm-no-change only.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
- [ ] Confirm `cli.arch.md` **Used by** still lists `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` with `command` `node .agents/hooks/index.mjs ingest cursor {event}`. Do **not** edit those lists
- [ ] Confirm `system.arch.md` overview still names those six events. Do **not** edit it. Do not add Copilot/Claude registrations
- [ ] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not register tool-use, Tab, `workspaceOpen`, or other extra Cursor events. Do not change ingest report-gate wording in architecture (F004 as shipped)

---

### Step 5: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library (AC-F007.7)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [ ] Unit tests cover AC-F007.1–7 at lib (yaml/report emitters + ingestHook persist + `normalized-fields.md` mapping) except entry argv/`exitCode`/stdout spawn, which is e2e. Do not change `hooks.test.ts` event count (stays six)

---

### Deviations

- Spec status stays `pending`; this run does not set `planned`. Sibling e2e planify runs in parallel; the parent coordinates status after both plans exist. Leave `docs/specs/F007-agent-display-name/spec.md` untouched.
- `docs/normalized-fields.md` amend is `/codify` Step 1, not this planify commit. Keep the `task` exception; add `agent_display_name` as a second explicit exception. Do not remove the `task` exception.
- No `.cursor/hooks.json` change. Hooks stay the six from F006. F007 does not add a registration.
- No architecture event-list change. `cli.arch.md` and `system.arch.md` already name six Cursor events; Step 4 is confirm-no-change only.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `emitYamlDocument` / `emitSessionReport` / `ingestHook` by importing `cli/src`.
- Do not overlay `agent_type`. Copilot start `agent_type` stays `agentName`; Copilot stop `agent_type` stays `agentType`. Tests must use different values (e.g. `agentName: "explore"` vs `agentDisplayName: "Explore"`) and assert `agent_type` stays `"explore"`. Do not map `agent_display_name` from `agentName`, `agentType`, `agentDescription`, `task`, or any Cursor/Claude key.
- `agentDisplayName`, `agentName`, `agentDescription`, `task`, and `transcript_path` stay on the Event log line (F001 verbatim). Do not overlay, redact, or omit them from JSONL.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- Do not register Copilot, Claude, tool-use, Tab, or `workspaceOpen`.
- Do not change `maybeWriteReport`, `triggeringHarness`, duration, or overview `source_harness` (F004 as shipped).
- Do not amend F003/F004/F006 specs or their plans. F004 spec already lists Details `agent_display_name`; this plan owns the `detailsByEvent` code change only.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- `/codify`: YAML exact-string for `agent_display_name: Explore` is quoted (`"Explore"`). F003 `needsQuote` quotes strings with spaces; the plan’s unquoted `agent_display_name: Explore` is the logical body field, not the scalar form. Report Details stay unquoted (`agent_display_name: Explore`).

---

> last updated: 2026-09-01T18:43:00Z
