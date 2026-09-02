---
spec-kind: functional
container: cli
---
# F003-ingest-normalized-yaml - cli

## Specification

On each ingest of a JSON object, keep F001 persist (verbatim Event log, Session index) and, when a session identifier exists, also append one normalized YAML document to `{session_id}.yaml` in that day’s folder. Build the document from the in-memory event plus F002 harness and event positionals. New documents use compact header keys `harness` and `event` (not `source_harness` / `source_event`). `session_id` is written only on the **initial session-start** document (`event` `sessionStart` / `SessionStart` and that session’s YAML log does not already contain a document). Every other document omits `session_id`. Header order: initial session-start `session_id`, `harness`, `event`, `timestamp`, `turn`; others `harness`, `event`, `timestamp`, `turn`. After the header, emit `subagent` when a matching payload attribute is present (F009; harness-independent), including on unmapped / header-only documents and on kinds whose `docs/normalized-fields.md` row does not list `subagent`. Other body fields stay table-driven. Unmapped documents are header-only except that optional `subagent`: five header fields vs four, plus `subagent` when present; no other extra body fields. Omit `subagent` when no matching key. `turn` is a YAML integer (F008; not a body field). Numbering is F008 — do not redo it. Same lock. No second process. No re-read of files just written to *produce* the YAML (reading that session’s existing YAML to set `turn` and whether this is the initial session-start is allowed). No YAML npm package. This spec does not replace F001 or F002. Do not rewrite prior documents. Do not overlay `turn` on the Event log line. Do not migrate old `source_harness` / `source_event` keys. Do not change F009 extraction.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current** for the third artifact, `src/yaml.ts`, compact header, six Cursor events, F008 numbering under `ingest.lock`, and harness-independent `subagent` after the header. Do not amend architecture in this planify run (`/shipify` does that). `/codify` has no architecture step. Do not change F009.

Grounding (F003 shipped 0.7.0; compact header 0.16.0; F009 `subagent` shipped 0.17.0; this is the AC-F003.5 / .16 / .17 amend/replan):

- `cli/src/yaml.ts`: **already** emits compact `harness` / `event`; `session_id` only when `includeSessionId`; `turn` via `emitPair` numeric path; `subagentLines(payload)` after `headerLines` and before `bodyLines`. `subagentValue` walks `subagent_type`, then `agent_type`, then `agentType`, then `agentName` (`key in payload`). Identity is **not** a `MappedField` in `subagentStartFields` / `subagentStopFields`. `bodyLines` still returns `[]` when harness or event is unmapped. **Do not rewrite `yaml.ts`.** `/codify` confirms `subagentValue` / `subagentLines` / `emitYamlDocument` splice order. Do not fold `subagent` back into `bodyLines` (harness column would drop it on unmapped / kinds with no `subagent` row). Oxlint complexity ≤ 8
- `cli/src/store.ts`: `countedYamlDocument` already reads existing YAML, calls `nextConversationTurn`, `isInitialSessionStart`, `emitYamlDocument`. Payload reaches the emitter unchanged. **Keep.** Do not invent a second lock. Do not compute `subagent` in store
- `cli/src/ingest.ts`: does **not** compute the header or `subagent`. `sessionYamlEmit` already passes payload + positionals + now. **Keep.** Do not move header or identity logic here
- `cli/src/report.ts`: F004 / F009’s job. Do **not** change report labels, `YamlDoc`, `formatSubagent`, or Markdown. Isolate report fixtures from this amend
- Body mapping stays **current** `docs/normalized-fields.md` (F005 dropped `transcript_path`; F006 added `task`; F007 added `agent_display_name`; F009 renamed `agent_type` → `subagent` on start/stop rows only). Do **not** restore `agent_type`. Do **not** add `subagent` rows to session start/end, prompt, or agent-stop tables. Do **not** add `turn` or `session_id` to the body
- `cli/src/index.ts` / `cli/src/argv.ts` / `cli/src/event.ts`: already pass positionals, persist YAML under `ingest.lock`. Keep them. F002 command positionals do not change
- `.cursor/hooks.json`: six events. **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build`. This amend expects **no** `cli/src/` production edits; skip rebuild unless a test gap forces a code fix. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Append-only: do not rewrite prior documents’ `turn`, whether they contain `session_id`, or old `agent_type` keys. Do not migrate old `source_*` keys

Unit tests cover AC-F003.1, .2, .4, .5, .6, .7, .9, .10, .13, .14, .15, .16, .17 at lib except entry spawn/`exitCode` (those are e2e). Not AC-F003.3, .8, .11, or .12 (deprecated). F009 unit tests already cover extraction, preference order, every mapped kind, and unmapped-with-`subagent`. This amend mostly **confirms** those tests and adds only AC-F003.5 / .16 / .17 gaps.

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents; each document includes integer `turn` (a property of the document, not a separate persisted entity). New documents may include `subagent` after the compact header on any event kind when a matching payload attribute is present.

This amend does not add persisted entities. Compact header and F009 `subagent` emit are already shipped. Do not persist `session_id` on every document. Do not persist `turn` on the Event log line. Do not rewrite prior documents. Do not amend `model.schema.md` in this run.

### Shared store wording

> Copy this block verbatim into the F003 e2e plan. Event log, Session index, project root, and day folder stay as F001. Concurrency now covers the YAML append. Argv now passes harness/event into ingest for YAML only. New Session YAML log documents use compact header keys `harness` / `event`; `session_id` only on the initial session-start document. After the header, `subagent` may appear on any document when a matching payload attribute is present (F009), including unmapped / header-only.

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
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session YAML log.

**Session YAML log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml`

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values, whether they contain `session_id`, or old `agent_type` keys. Do not migrate old `source_harness` / `source_event` / `agent_type` keys.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing YAML.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- After the compact header, when a matching `subagent` source attribute is present (F009), emit `subagent` first (before any other body field). Extraction, source-key preference, and the mapping-table rename are F009: first present of `subagent_type`, then `agent_type`, then `agentType`, then `agentName`; do **not** select the source key from the F002 `harness` positional. This spec does not duplicate those ACs. Omit `subagent` when none of those keys are present. When the chosen key is present and the value is `null`, emit YAML `null`. New documents write `subagent`, never `agent_type`.
- Other body fields after `subagent` (or after the header when `subagent` is omitted): only the remaining normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` and excluding `subagent` (already emitted above), using those snake_case names, in table order. Source keys for every other body field are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set, except `subagent` as specified (AC-F003.5, AC-F003.17).
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields only, except `subagent` when a matching payload attribute is present (AC-F003.16, AC-F003.17): five header fields when initial session-start; four otherwise. An ingest must **not** include any other extra body field on an unmapped document (`reason` / `prompt` / `task` / `agent_display_name` stay closed). Kinds whose mapping row does not list `subagent` (session start/end, prompt, agent stop) still emit `subagent` after the header when a matching key is present; they must **not** gain other extra fields on that basis.
- Node builtins only: no YAML library.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload. Do **not** use `harness` to choose the `subagent` source key.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F003 registered the four F001 events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`). The product now also registers `beforeSubmitPrompt` (F005) and `stop` (F006). This F003 amend does **not** change `.cursor/hooks.json`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. YAML mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Step 1: Compact YAML header (`harness`/`event`; `session_id` only on initial session-start) | keep | compact keys, session_id-on-start, integer `turn` already shipped (0.16.0). Nested “unmapped is header only / no body” AC-F003.16 line is stale (superseded by new Step 1) |
| Step 2: Store wires initial session-start; persist still append-only | keep | `countedYamlDocument` / `includeSessionId` already shipped; payload already reaches `emitYamlDocument` |
| Step 3: Amend architecture and model schema | keep | do not amend architecture in this planify run or in `/codify` (`/shipify` does that) |
| Step 4: Test runner and AC sweep | redo | AC-F003.5 / .16 wording now allows `subagent`; add AC-F003.17; confirm F009 yaml/ingest tests rather than rewriting `yaml.ts` |

Deprecated ACs stay drop (not prior implementation steps): AC-F003.3, .8, .11, .12.

## Implementation Steps

### Step 1: Confirm `subagent` after header (AC-F003.5, .16, .17)
Do **not** rewrite `cli/src/yaml.ts`. F009 0.17.0 already splices `subagentLines` after `headerLines` and before table-driven `bodyLines`. `/codify` confirms that emit order and adds only missing unit cases for the amended criteria. Do not fold identity back into `bodyByEvent`. Do not restore `agent_type`. Do not redo compact header, F008 numbering, or F009 preference order.
- Paths:
    - `cli/src/yaml.ts` (read-only confirm)
    - `cli/test/yaml.test.ts`
- [x] Confirm `emitYamlDocument` is `headerLines` then `subagentLines(input.payload)` then `bodyLines`. Confirm `subagentValue` / `subagentLines` still walk `subagent_type` → `agent_type` → `agentType` → `agentName` with `key in payload`. Confirm `bodyLines` still returns `[]` when `asHarness` or `bodyByEvent.get(event)` is missing. Do not edit these helpers unless a new test proves a bug (AC-F003.5, AC-F003.16, AC-F003.17)
- [x] Confirm existing F009 yaml tests already cover: `subagent` on every mapped kind including sessionStart / sessionEnd / prompt / stop (rows that do **not** list `subagent`); unknown harness, empty harness, and unmapped `workspaceOpen` still emit `subagent` and omit other body; omit when no matching key / trap-only payload; present `null` → YAML `null`. Retitle those tests with AC-F003.5 / AC-F003.16 / AC-F003.17 as they apply. Do not duplicate them (AC-F003.5, AC-F003.16, AC-F003.17)
- [x] Keep existing AC-F003.16 tests that omit `subagent` (no matching payload key): omitted positionals, unrecognized harness, unrecognized event, unmapped sessionStart five-header vs unmapped prompt four-header. Retitle if needed so they mean “header-only when no matching `subagent` key”; they still prove no other extra body (`reason` / `prompt` closed) (AC-F003.16, AC-F003.17)
- [x] Add the missing emitter case: unmapped initial sessionStart (`includeSessionId: true`, unrecognized harness or event) **with** `subagent_type` is five header fields then `subagent`; extra table fields (`reason`) stay omitted. This is the AC-F003.16 five-field document plus AC-F003.17 `subagent`; do not treat it as strictly header-only (AC-F003.16, AC-F003.17)
- [x] Retitle or add one AC-F003.5 exact-string: mapped body stays table-driven (e.g. sessionEnd `reason`, prompt `prompt`, subagentStart `task`) with extras / `transcript_path` omitted, **and** `subagent` may appear after the header when a matching key is present. Reuse existing “sessionEnd + extra omit”, “body has no session_id and keys stay flat”, and “subagent follows header on every mapped event” rather than rewriting those fixtures (AC-F003.5)
- [x] Keep compact-header, `isInitialSessionStart`, unquoted `turn`, timestamp, Copilot/Claude mapping, and F006 header-only-without-identity tests unchanged

---

### Step 2: Confirm ingest persist still uses the emitter
`ingestHook` / `countedYamlDocument` already pass the payload into `emitYamlDocument`. Do not change `store.ts` or `ingest.ts`. Confirm existing F009 ingest tests; add only the unmapped initial sessionStart + `subagent` gap.
- Paths:
    - `cli/src/store.ts` (read-only confirm)
    - `cli/src/ingest.ts` (read-only confirm)
    - `cli/test/ingest.test.ts`
- [x] Do not change `sessionYamlEmit`, `countedYamlDocument`, `parseArgv`, `usageMessage`, `sessionIdentifier`, or `persistIngest` (AC-F003.1, AC-F003.4, AC-F003.7)
- [x] Confirm existing ingest tests: every Cursor event with `subagent_type` writes verbatim jsonl and YAML `subagent` after the compact header; unknown harness + unmapped event writes header plus `subagent` only; no-session-id Copilot `sessionId` still writes jsonl and no YAML (AC-F003.5, AC-F003.16, AC-F003.17)
- [x] Keep existing AC-F003.16 ingest tests that have no matching `subagent` key (unrecognized harness/event four-header-only; missing positionals; unmapped sessionStart five vs unmapped prompt four). Retitle if needed: header-only **when no matching `subagent` key**; extras such as `reason` / `prompt` still omitted (AC-F003.16)
- [x] Add the missing ingestHook case: unmapped initial `sessionStart` (unknown harness) with `session_id` + `subagent_type` (+ a closed extra such as `reason`) writes five header fields then `subagent: explore`; JSONL stays verbatim; no `reason:` / `agent_type:` in YAML (AC-F003.16, AC-F003.17)
- [x] Keep existing F001 persist assertions (verbatim jsonl, no overlay, no YAML when no session identifier, sequential append leaves first document bytes unchanged) (AC-F003.1, AC-F003.2, AC-F003.4, AC-F003.7, AC-F003.9)
- [x] Skip `bun run build` unless a production `cli/src/` file actually changes. If it does: `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F003.10)

---

### Step 4: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [x] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F003.10)
- [x] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [x] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8. Expect no production `yaml.ts` diff
- [x] Unit tests cover AC-F003.1, .2, .4, .5, .6, .7, .9, .10, .13, .14, .15, .16, .17 at lib (persist + emitter + mapping). Not AC-F003.3, .8, .11, or .12. Entry argv/`exitCode` spawn is e2e, not this container’s unit suite. Leave `hooks.test.ts` asserting the current six shell-string commands (unchanged registration). Leave `cli/src/report.ts` and F009 report tests alone

---

### Deviations

- Spec status stays `pending`. This run does not set `planned`. Sibling `e2e.plan.md` is out of scope for this planify; parent coordinates status after remaining containers have plans. This run does not edit `spec.md`.
- No git commit (parent instruction). Write `cli.plan.md` only. Do not write `e2e.plan.md`. Do not amend architecture. Do not change F009 (extraction, preference order, mapping-table rename, report Subagent cell).
- Step 3 is **keep**: do not amend `cli.arch.md` / `system.arch.md` / `model.schema.md` in this planify run or in `/codify` (`/shipify` does that). Architecture already names compact header and `subagent` after the header.
- `cli/src/yaml.ts` needs **no** production code for this amend. `/codify` confirms `subagentValue` / `subagentLines` and adds unit titles/cases only. Do not re-add `subagent` as a harness-column `MappedField`.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `persistIngest` / `emitYamlDocument` by importing `cli/src`.
- Unquoted `HH:MM:SS` is a YAML 1.1 sexagesimal. The emitter still quotes `timestamp`. `turn` must stay an unquoted YAML integer (`emitPair` numeric path).
- Cursor `sessionStart` table-driven body is empty because that table’s only common field is `session_id`, which lives in the filename (and on the initial session-start header when present). Agent-stop table-driven body is empty (F005). Both kinds still emit `subagent` when a matching key is present (AC-F003.17). YAML mapping for `beforeSubmitPrompt` / `stop` still applies if those events arrive via ingest; this amend does not change `.cursor/hooks.json`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML file (AC-F003.7), even when positionals are `copilot` / `sessionStart`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Body mapping is current `docs/normalized-fields.md`. Do not revert F005 (`transcript_path` dropped), F006 (`task`), F007 (`agent_display_name`), or F009 (`subagent`). Do not add `subagent` rows to session start/end, prompt, or agent-stop tables.
- F008 numbering is already shipped. Compact header is already shipped. F009 `subagent` emit is already shipped. This amend does not pass hardcoded `turn: 0` and does not change the count formula or header keys.
- `isInitialSessionStart` uses “no documents yet” (empty / no `---`), not “no prior session-start line”. Prompt-then-sessionStart must omit `session_id` (AC-F003.14).
- `cli/src/report.ts` is unchanged (F004 / F009). Do not retitle or rewrite F009 report tests in this container.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- `/codify`: spec status set to `in-progress`. Do not reopen compact-header or F009 extraction. Mixed historical YAML (`source_*`, per-doc `session_id`, body `agent_type`) is out of scope.

> last updated: 2026-09-02T10:25:00Z
