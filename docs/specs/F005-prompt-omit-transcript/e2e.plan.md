---
spec-kind: functional
container: e2e
---
# F005-prompt-omit-transcript - e2e

## Specification

User-facing flow under test: Cursor (or a spawn that mimics it) invokes ingest with optional source harness and source event positionals. Persistence stays F001 and F003: verbatim Event log, Session index rules, append-only Session YAML log, exit 0, no blocking stdout. Cursor registration adds a fifth event, `beforeSubmitPrompt`, with the same shell-command shape as `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`. That invocation still persists as F001 and appends F003 YAML when a session identifier exists. User-prompt YAML starts with the four F003 header fields and then `prompt` when the mapped source key is present (omit when absent; do not duplicate `session_id` in the body). Session YAML log documents for subagent start, subagent stop, and agent stop omit `transcript_path` even when the payload has a transcript path; the Event log line stays F001 verbatim (JSONL may still contain `transcript_path`). Session report Details follow the same mapping (no `transcript_path`). Do not add Copilot or Claude registrations. Do not register `stop`. Do not add `.cmd` wrappers.

This spec does not replace F001, F002, F003, or F004. This is a functional-spec extra run. Architecture has **no e2e product container** — do not invent `e2e.arch.md` and do not rename `cli-node`. Scenarios live in a thin `e2e/` folder of `node:test` files that **spawn** `cli/src/index.ts`. They must not import `cli/src/**` as the system under test. They must not spawn `.agents/hooks/index.mjs`. This plan carries **no unit tests** and plans no `cli/test/` work.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [System architecture](../../arch/system.arch.md) — no `e2e.arch.md`; e2e is the repo-root spawn suite from AGENTS.md. Sibling plan: [cli.plan.md](./cli.plan.md)

Grounding (first e2e plan for F005):

- Suite: repo-root `e2e/` via `node --test e2e/*.test.ts` (not `node --test e2e` — Node 26 on Windows treats a directory name as a CJS module, not a test glob). CLI units stay `cd cli && bun run test` and are out of this container
- Spawn SUT: `node cli/src/index.ts ingest` (`process.execPath`). Do **not** spawn `{repo}/.agents/hooks/index.mjs`. Do **not** import `cli/src/**` as SUT
- Helper: `e2e/spawn.ts` — `spawnIngest` already accepts optional `extraArgv` after `"ingest"` (default none). YAML helpers (`sessionYamlPath`, `readSessionYaml`, `yamlDocuments`, `yamlMapping`) and jsonl helpers (`readLines`, `parseObject`, `readSessions`) already exist. Extend only if needed; do not change the default `extraArgv` behavior. F001 tests (AC-F001.1–7) rely on default none and remain valid except the exact-four hook-key assertion in `e2e/ac-f001.6-hook-esm-script.test.ts` (update in Step 6)
- Fixtures under `{repo}/temp/e2e/` (gitignored via `temp`) so tests never write the real `{repo}/temp/audit/`
- No HTTP, no ports, no database. `/verify` "free the ports" **does not apply**
- Node builtins only (`node:test`, `node:child_process`, `node:fs`, `node:path`, `node:assert`). No YAML library. No e2e unit tests; no `cli/test/` work
- [`.agents/rules/e2e.rules.md`](../../../.agents/rules/e2e.rules.md) is still a stub
- Each `node:test` title must carry the AC id (e.g. `AC-F005.1 — …`)
- Mapping: [`docs/normalized-fields.md`](../../normalized-fields.md) and [`docs/events-args.md`](../../events-args.md). Event kinds: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`)
- Do not spawn Copilot or Claude processes. Do not register `stop` in `.cursor/hooks.json`. Agent-stop mapping is spawned as ingest extra argv only
- When a YAML file is required, put a F001 session identifier on the payload (`session_id`, `conversation_id`, or `parent_conversation_id`). Copilot `sessionId` alone is not a session identifier
- AGENTS.md learning scar: Cursor `hooks.json` `command` is a shell string; extra argv tokens are kept on Windows. Do not revive `.cmd` wrappers
- Do **not** break F001–F004 spawn tests except those that assert “exactly four” hook keys or YAML `transcript_path`. Plan explicit updates in Step 6 (F005 work, not reopening F001–F004)
- Codify of e2e: compile/lint only; do **not** run `node --test e2e/*.test.ts` in this container’s later codify (`/verify` runs the suite)

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

### Acceptance criteria under test

- [ ] **AC-F005.1** — THE SYSTEM SHALL register Cursor `beforeSubmitPrompt` in `.cursor/hooks.json` with `command` `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`, in the same shape as `sessionStart`, `sessionEnd`, `subagentStart`, and `subagentStop`.
- [ ] **AC-F005.2** — WHEN ingest is invoked as `ingest cursor beforeSubmitPrompt` and receives a JSON object, THE SYSTEM SHALL persist that object as F001 (verbatim Event log line, Session index rules) and SHALL append a Session YAML log document as F003 when the payload has a session identifier.
- [ ] **AC-F005.3** — WHEN that invocation’s payload has a session identifier, THE SYSTEM SHALL write a YAML document that starts with `session_id`, `source_harness`, `source_event`, and `timestamp` and then `prompt` when the mapped source key is present; WHEN `prompt` is absent, THE SYSTEM SHALL omit it; THE SYSTEM SHALL NOT duplicate `session_id` in the body.
- [ ] **AC-F005.4** — WHEN ingest writes a YAML document for subagent start, subagent stop, or agent stop, THE SYSTEM SHALL NOT include `transcript_path` in that document, even when the payload contains a transcript path; THE SYSTEM SHALL still write the Event log line as F001 (the JSONL line may still contain `transcript_path`).
- [ ] **AC-F005.5** — THE SYSTEM SHALL remain observe-only (exit 0, no blocking stdout) for `beforeSubmitPrompt` ingest and when YAML omits `transcript_path`.

> Include the AC id in each test title so a criterion's tests are easy to find, run, and fix.

## Checkpoints

> On amend/replan only. Classify every scenario from the prior e2e plan, then rewrite
> Implementation Steps. First plan: write `first`.

| Prior scenario | Action | Note |
|----------------|--------|------|
| first | keep | First e2e plan for F005; no prior scenarios to classify |

## Implementation Steps

### Step 1: AC-F005.1 — Cursor hooks.json registers beforeSubmitPrompt with the same node ingest shell command
Parse `.cursor/hooks.json` (do not spawn ingest). Five events: keep the original four and add `beforeSubmitPrompt`. Each `command` is the exact shell string `node .agents/hooks/index.mjs ingest cursor {event}`. No `.cmd` files. Verifies AC-F005.1.
- Paths:
    - `.cursor/hooks.json`
    - `e2e/ac-f005.1-register-before-submit-prompt.test.ts`
- [ ] Arrange: repo root as the project; load `.cursor/hooks.json`. Do not spawn ingest. Do not import `cli/src/**`. Do not add `.cmd` wrappers. Learning scar: extra tokens after `node … index.mjs` are kept. Do not register `stop`
- [ ] Act: parse the file (title includes `AC-F005.1`)
- [ ] Assert: `"version": 1`; `failClosed` unset on the file and on each entry; events nested under `config.hooks`; keys are exactly `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, and `beforeSubmitPrompt` (five keys; original four still present); each entry `command` equals `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that key, including `node .agents/hooks/index.mjs ingest cursor beforeSubmitPrompt`; `.cursor/hooks/{event}.cmd` for each of the five and `.cursor/hooks/ingest.cmd` are absent; `stop` is not a hook key (AC-F005.1)

---

### Step 2: AC-F005.2 — ingest cursor beforeSubmitPrompt persists Event log, Session index, and YAML
Spawn ingest as `ingest cursor beforeSubmitPrompt` with a JSON object that has a session identifier and `prompt` → F001 persist plus one YAML document in `{session_id}.yaml` in the dated folder. One process, one invocation. Verifies AC-F005.2.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.2-prompt-ingest-persists.test.ts`
- [ ] Arrange: isolated fixture under `{repo}/temp/e2e/`; env `CURSOR_PROJECT_DIR` pointing at it. Extra argv `["cursor", "beforeSubmitPrompt"]`. Stdin one JSON object with `session_id` e.g. `"sess-ac-f005-2"` and `prompt` e.g. `"hello from f005"`. Do not import `cli/src/**`. Do not spawn `.agents/hooks/index.mjs`. Use existing helpers (`readLines`, `parseObject`, `readSessions`, `readSessionYaml`, `yamlDocuments`)
- [ ] Act: spawn `node cli/src/index.ts ingest cursor beforeSubmitPrompt` with that stdin (title includes `AC-F005.2`)
- [ ] Assert: `exitCode === 0`; stdout empty; `{dayFolder}/events.jsonl` has exactly one line whose parsed object deep-equals the stdin payload (no `harness` / `hookEvent` overlay; `prompt` kept); `{dayFolder}/sessions.json` is a JSON array that includes that `session_id`; `{dayFolder}/{session_id}.yaml` exists with exactly one YAML document and that document begins with `---` (AC-F005.2)

---

### Step 3: AC-F005.3 — prompt YAML starts with F003 header then prompt when present, omitted when absent
Two cases in one AC file: present `prompt` and absent `prompt`. Header is `session_id`, `source_harness`, `source_event`, `timestamp` in that order; `prompt` follows when the mapped Cursor source key is present; omit when absent; `session_id` is not duplicated in the body. One Cursor case is enough (Copilot `userPromptSubmitted` / Claude `UserPromptSubmit` aliases stay in cli unit tests). Verifies AC-F005.3.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.3-prompt-yaml-header-and-body.test.ts`
- [ ] Arrange: two isolated fixtures; extra argv `["cursor", "beforeSubmitPrompt"]` each. Parse YAML with existing `yamlDocuments` + `yamlMapping` (Node builtins only). Cases (each title includes `AC-F005.3`):
    1. Present prompt — payload `session_id` `"sess-ac-f005-3-present"` and `prompt` `"hello world"`, plus extras that must not leak (`attachments`, `hook_event_name`)
    2. Absent prompt — payload `session_id` `"sess-ac-f005-3-absent"` and extras (`attachments`, `hook_event_name`) but **no** `prompt` key
- [ ] Act: spawn both cases (do not import `cli/src/**`)
- [ ] Assert: both `exitCode === 0`; stdout empty. Both documents start with keys `session_id`, `source_harness`, `source_event`, `timestamp` in that order; `source_harness` is `cursor`; `source_event` is `beforeSubmitPrompt`; `session_id` equals the filename stem and appears once (not repeated in the body). Case 1: fifth key is `prompt` with value `"hello world"`; extras absent from YAML. Case 2: body has no `prompt` (header-only after the four fields); extras absent. Event log line remains verbatim including extras (AC-F005.3)

---

### Step 4: AC-F005.4 — YAML omits transcript_path for subagent start, stop, and agent stop; JSONL keeps it
One fixture, three sequential spawns: `subagentStart`, `subagentStop`, and `stop`, each with a transcript path on the payload (Cursor source keys). YAML documents must not contain the substring `transcript_path`; JSONL lines must still contain it. Do not register `stop` in `hooks.json`. Verifies AC-F005.4.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.4-omit-transcript-path-from-yaml.test.ts`
- [ ] Arrange: one isolated fixture; env `CURSOR_PROJECT_DIR`; same `session_id` `"sess-ac-f005-4"` for every payload. Cursor keys on each payload. Sequence:
    1. Extra argv `["cursor", "subagentStart"]`; payload has `session_id`, `subagent_type`, and `transcript_path` e.g. `"/tmp/sub-start.jsonl"`
    2. Extra argv `["cursor", "subagentStop"]`; payload has `session_id`, `subagent_type`, `summary`, `transcript_path` e.g. `"/tmp/sub-stop.jsonl"`, and Cursor `agent_transcript_path` e.g. `"/tmp/agent-sub.jsonl"` (so a writer that copied the Cursor key would still put `transcript_path` in the YAML text)
    3. Extra argv `["cursor", "stop"]`; payload has `session_id` and `transcript_path` e.g. `"/tmp/agent-stop.jsonl"`. Spawn only — do not add `stop` to `.cursor/hooks.json`
- [ ] Act: spawn the three ingests in order (title includes `AC-F005.4`)
- [ ] Assert: all three `exitCode === 0`; stdout empty. Event log has exactly three parseable object lines; each parsed object deep-equals that spawn’s stdin (including `transcript_path` / `agent_transcript_path`); each JSONL line **contains** the substring `transcript_path`. `{session_id}.yaml` has exactly three documents, each beginning with `---`; **no** document (and not the file as a whole) contains the substring `transcript_path`. Body keys: (1) `agent_type` only; (2) `agent_type` then `response_text` (from Cursor `summary`); (3) empty (agent-stop header only). Session index includes `"sess-ac-f005-4"` (AC-F005.4)

---

### Step 5: AC-F005.5 — beforeSubmitPrompt ingest and transcript-omit YAML stay observe-only
Those spawns (a user-prompt ingest and a transcript-omit case) exit 0 with empty stdout. No continue/block/permission/followup rewrite on stdout. Verifies AC-F005.5.
- Paths:
    - `e2e/spawn.ts`
    - `e2e/ac-f005.5-observe-only-prompt-and-omit.test.ts`
- [ ] Arrange: two isolated fixtures. Case A — extra argv `["cursor", "beforeSubmitPrompt"]`; payload has `session_id` and `prompt` (same shape as AC-F005.2). Case B — extra argv `["cursor", "subagentStart"]`; payload has `session_id`, `subagent_type`, and `transcript_path` (YAML must omit the path; this is the transcript-omit observe-only case). Do not import `cli/src/**`
- [ ] Act: spawn ingest for each case (each title includes `AC-F005.5`)
- [ ] Assert: both `exitCode === 0` and stdout `""` (no blocking stdout: no `continue`, `permission`, `followup_message`, or other rewrite JSON). Case A: Event log + Session index + YAML as F001/F003. Case B: YAML document does not contain `transcript_path`; Event log line still does; still exit 0 and empty stdout (AC-F005.5)

---

### Step 6: Update existing e2e files so the suite stays green
F001/F002 exact-four hook-key assertions and F003/F004 YAML `transcript_path` assertions will fail once F005 registration and mapping land. Update those files in this container. This is F005 work, not reopening F001–F004. Leave `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` (it only loops the original four names; still valid if a fifth key exists). Leave `e2e/ac-f004.7-subagent-ordinary-rows.test.ts` (payload may still carry `transcript_path`; it does not assert that field in YAML or Details).
- Paths:
    - `e2e/ac-f001.6-hook-esm-script.test.ts`
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts`
    - `e2e/ac-f003.5-normalized-body-fields.test.ts`
    - `e2e/ac-f004.5-details-normalized-fields.test.ts`
- [ ] Arrange: keep those test files and their AC-F001.6 / AC-F002.4 / AC-F003.5 / AC-F004.5 titles. Do not drop them. Do not change `spawnIngest` default extra argv
- [ ] Act: update assertions only (still parse `.cursor/hooks.json` for F001.6/F002.4; still spawn ingest for F003.5/F004.5)
- [ ] Assert:
    - `e2e/ac-f001.6-hook-esm-script.test.ts` — `requiredEvents` is the original four **plus** `beforeSubmitPrompt`; `hookKeys.length === 5`; exact key set of those five; each `command` still `node .agents/hooks/index.mjs ingest cursor {event}`; keep package ESM (`"type": "module"`), `"dependencies": {}`, `engines.node` `>=24`, `version === 1`, `failClosed` unset
    - `e2e/ac-f002.4-register-wrapper-commands.test.ts` — same five-key set and `hookKeys.length === 5`; each `command` exact shell string; `.cursor/hooks/{event}.cmd` absent for all five including `beforeSubmitPrompt`; `ingest.cmd` still absent; `failClosed` unset
    - `e2e/ac-f003.5-normalized-body-fields.test.ts` — Cursor subagentStart body keys are `agent_type` only (payload still has `transcript_path`; JSONL still has the path; YAML body does not). Present-null `transcript_path` is omitted from YAML (body is `agent_type` only; JSONL still has `transcript_path: null`). Copilot subagentStop body keys are `agent_type` then `response_text` (no `transcript_path`; JSONL still has Copilot `transcriptPath`)
    - `e2e/ac-f004.5-details-normalized-fields.test.ts` — mapped-kinds Details become F005: sessionStart empty; subagentStart `agent_type: …`; subagentStop `agent_type: …; response_text: …`; prompt `prompt: …`; agent stop empty; sessionEnd `reason: …`. Present-null row Details are `agent_type: explore` only. Keep YAML-null-in-Details coverage by setting the sessionEnd `reason` of that fixture to `null` so that row’s Details are `reason: null`

## Deviations

- No `docs/arch/e2e.arch.md` — architecture has no e2e product container; this suite is the repo-root spawn folder from AGENTS.md. Architecture link is [`system.arch.md`](../../arch/system.arch.md), same as F004.
- Did not run `node --test e2e/*.test.ts` (planify only; later e2e codify is compile/lint only). No e2e `tsconfig` and no e2e oxlint config, so typecheck and lint are skipped (same as F001–F004).
- No HTTP, no ports, no database. `/verify` "free the ports" does not apply.
- `spawnIngest` already has optional extra argv; omitting it keeps F001 spawn tests on argv `["ingest"]` only. This plan does not change the helper’s default. Extend helpers only if needed.
- YAML and Markdown in tests are observed as text (split YAML on `---`, read keys in order). No YAML library in e2e either.
- Do not spawn Copilot or Claude processes. Copilot/Claude prompt aliases are out of this e2e file (cli units cover them). Copilot `sessionId` is not a F001 session identifier; cases that need YAML still include `session_id`.
- Do not register `stop` (or tool-use, Tab, `workspaceOpen`, or any Cursor event beyond the five). Agent-stop mapping is spawned as ingest extra argv only.
- Do not revive `.cmd` wrappers (AGENTS.md learning scar).
- Do not break F001–F004 spawn tests except the four files in Step 6 (exact-four hook keys or YAML/Details `transcript_path`). `e2e/ac-f002.3-distinct-cursor-wrappers.test.ts` is left as-is.
- This container does not set spec status to `planned` (sibling cli planify runs in parallel). Spec status stays `pending`.
- e2e codify: skipped typecheck, lint, and `node --test e2e/*.test.ts` (no e2e tsconfig/oxlint; skill forbids running the e2e suite). Did not edit `cli/src`, `spec.md`, or spec status. Did not commit `.cursor/hooks.json`.

---

> last updated: 2026-09-01T11:35:00Z
