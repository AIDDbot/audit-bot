---
spec-kind: functional
container: cli
---
# F003-ingest-normalized-yaml - cli

## Specification

On each ingest of a JSON object, keep F001 persist (verbatim Event log, Session index) and, when a session identifier exists, also append one normalized YAML document to `{session_id}.yaml` in that day’s folder. Build the document from the in-memory event plus F002 harness and event positionals. New documents use compact header keys `harness` and `event` (not `source_harness` / `source_event`). `session_id` is written only on the **initial session-start** document (`event` `sessionStart` / `SessionStart` and that session’s YAML log does not already contain a document). Every other document omits `session_id`. Header order: initial session-start `session_id`, `harness`, `event`, `timestamp`, `turn`; others `harness`, `event`, `timestamp`, `turn`. Unmapped documents are header-only: five fields vs four. `turn` is a YAML integer (F008; not a body field). Numbering is F008 — do not redo it. Same lock. No second process. No re-read of files just written to *produce* the YAML (reading that session’s existing YAML to set `turn` and whether this is the initial session-start is allowed). No YAML npm package. This spec does not replace F001 or F002. Do not rewrite prior documents. Do not overlay `turn` on the Event log line. Do not migrate old `source_harness` / `source_event` keys.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current** for the third artifact, `src/yaml.ts`, positionals-for-YAML-header, six Cursor events, and F008 numbering under `ingest.lock`. Do not amend architecture in this planify run (`/shipify` does that). `/codify` has no architecture step.

Grounding (F003 shipped 0.7.0; F008 numbering shipped; this is the compact-header amend/replan):

- `cli/src/yaml.ts`: `emitYamlDocument` always emits `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`. `YamlDocumentInput` is `{ payload, sessionId, harness, event, now, turn }`. Redo the header: emit `harness` / `event`; emit `session_id` only when told this is the initial session-start. Keep `emitPair` numeric path for `turn`. Export `isInitialSessionStart(existingYaml, event)`. `nextConversationTurn` still scans `^source_event:`; sibling F008 cli plan will redo that scan to `^event:`. **This F003 plan must emit `event:` so that scan works.** Also match `^event:` in `nextConversationTurn` (keep `^source_event:` for unmigrated files) so shipped F008 numbering stays green on new documents — that is a scan-key alias, not a numbering-formula change. Prefer a small `headerLines` helper over growing `emitYamlDocument`. Oxlint complexity ≤ 8
- `cli/src/store.ts`: `countedYamlDocument` already reads existing YAML, calls `nextConversationTurn`, `emitYamlDocument`. Extend it to pass `includeSessionId: isInitialSessionStart(existing, emit.event)` (or let the emitter decide from existing+event). Keep the `yamlDocument?: string` override. Do not invent a second lock
- `cli/src/ingest.ts`: does **not** compute the header. `sessionYamlEmit` already passes payload + positionals + now. **Keep.** Do not move header logic here
- `cli/src/report.ts`: F004’s job. Do **not** change report labels, `YamlDoc`, `headerKeys`, or Markdown. `cli/test/report.test.ts` may need `emitYamlDocument` callers to still typecheck; isolate report fixtures from the new header keys so F004 tests stay green without changing `report.ts`
- Body mapping stays **current** `docs/normalized-fields.md` (F005 dropped `transcript_path`; F006 added `task`; F007 added `agent_display_name`). Do **not** restore the original F003 mapping table. Do **not** add `turn` or `session_id` to the body
- `cli/src/index.ts` / `cli/src/argv.ts` / `cli/src/event.ts`: already pass positionals, persist YAML under `ingest.lock`. Keep them. F002 command positionals do not change
- `.cursor/hooks.json`: six events (F001 four plus F005 `beforeSubmitPrompt` and F006 `stop`). **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Append-only: do not rewrite prior documents’ `turn` or whether they contain `session_id`. Do not migrate old `source_*` keys

Unit tests cover AC-F003.1, .2, .4, .5, .6, .7, .9, .10, .13, .14, .15, .16 at lib except entry spawn/`exitCode` (those are e2e). Not AC-F003.3, .8, .11, or .12 (deprecated).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents; each document includes integer `turn` (a property of the document, not a separate persisted entity).

This amend does not add persisted entities. New documents use compact header keys. `session_id` on the document only for the initial session-start; the filename stem is always the F001 identifier. Do not persist `session_id` on every document. Do not persist `turn` on the Event log line. Do not rewrite prior documents. Do not amend `model.schema.md` in this run.

### Shared store wording

> Copy this block verbatim into the F003 e2e plan. Event log, Session index, project root, and day folder stay as F001. Concurrency now covers the YAML append. Argv now passes harness/event into ingest for YAML only. New Session YAML log documents use compact header keys `harness` / `event`; `session_id` only on the initial session-start document.

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
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session YAML log.

**Session YAML log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.yaml`

- Always a `.yaml` file named for the F001 session identifier. One file per distinct identifier for that day.
- Multi-document YAML: each event is a separate document; documents are separated by `---`. Each appended document begins with the `---` separator so the file is valid multi-document YAML after every successful append.
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values and whether they contain `session_id`. Do not migrate old `source_harness` / `source_event` keys.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the YAML). Determining `turn` (F008) and whether this is the initial session-start may read that session’s existing YAML.
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header keys on new documents: `harness` and `event` (not `source_harness` or `source_event`). Values are the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `session_id` on the document only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session YAML log does not already contain a session-start document. Value is the F001 session identifier (filename stem). Omit `session_id` on every other document. When the first event for a session is not session-start, no document gets `session_id`.
- Initial session-start document field order: `session_id`, `harness`, `event`, `timestamp`, `turn`.
- Every other document field order: `harness`, `event`, `timestamp`, `turn`.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a YAML integer (F008; not a body field). Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`. Prompt-kind is YAML `event` values `beforeSubmitPrompt`, `userPromptSubmitted`, `UserPromptSubmit`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id`, using those snake_case names, in table order. Source keys are the row for the event kind matching `event` and the column matching `harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `harness` or `event` does not match a mapping row and column, the document contains the header fields only: five fields when initial session-start; four otherwise.
- Node builtins only: no YAML library.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session YAML log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete JSONL line, update the index, then (when a session identifier is present) append one complete YAML document. No torn, concatenated, or invalid JSON/YAML; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the YAML header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest` (names ingest; does not require the positionals; does not name health or harness).
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout** (observe-only: do not block/deny/rewrite, including `subagentStart` `permission` and `subagentStop` `followup_message`). Ingest always `exitCode` 0.

**Cursor registration** — project-level `.cursor/hooks.json` only (not Copilot, not Claude). `"version": 1`. Original F003 registered the four F001 events (`sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`). The product now also registers `beforeSubmitPrompt` (F005) and `stop` (F006). This F003 amend does **not** change `.cursor/hooks.json`. Each registered event’s `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}` with `{event}` equal to that hook’s Cursor event name. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. YAML mapping for prompt and agent-stop still applies if those events are received via ingest.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| Step 1: Five-field YAML header and integer `turn` (lib) | redo | compact `harness`/`event`; `session_id` only on initial session-start (AC-F003.13–.16); AC-F003.11/12 dropped |
| Step 2: Ingest supplies `turn`; persist still append-only | redo | store wires `isInitialSessionStart` from existing YAML; ingest still does not compute the header |
| Step 3: Amend architecture and model schema | keep | do not amend architecture in this planify run (`/shipify` does that) |
| Step 4: Test runner and AC sweep | redo | unit coverage is AC-F003.1,2,4,5,6,7,9,10,13,14,15,16 (not 3, 8, 11, or 12) |

## Implementation Steps

### Step 1: Compact YAML header (`harness`/`event`; `session_id` only on initial session-start)
Extend the existing emitter. Do not change body mapping. Do not add a YAML package. Do not add `turn` or `session_id` to `docs/normalized-fields.md`. Do not redo F008 numbering. Header `session_id` is the F001 identifier when present. Body never includes `session_id`. `turn` stays header-only.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
    - `cli/test/report.test.ts`
- [ ] Export `isInitialSessionStart(existingYaml: string, event: string): boolean`. True only when `event` is `sessionStart` or `SessionStart` **and** `existingYaml` has no documents yet (missing/empty / no `---`). Sequential guards. A later `sessionStart` after a prompt is **not** initial — when the first event was not session-start, no document gets `session_id`. Do not treat “no prior `sessionStart` line” alone as initial
- [ ] Keep `emitYamlDocument` a pure formatter: add `includeSessionId: boolean` to `YamlDocumentInput` (do not default it inside the emitter; do not scan YAML there). `sessionId` stays on the input for the cases that include it. Extract `headerLines` so `emitYamlDocument` complexity stays ≤ 8
- [ ] `headerLines`: when `includeSessionId` is true, emit `session_id`, `harness`, `event`, `timestamp`, `turn` in that order (AC-F003.13, AC-F003.14, AC-F003.15). When false, emit `harness`, `event`, `timestamp`, `turn` and omit `session_id`. Keys are `harness` / `event`, never `source_harness` / `source_event`
- [ ] Unrecognized harness or event still returns header only — five fields when `includeSessionId`; four otherwise (AC-F003.16). Keep current `bodyByEvent` / field arrays. Do not restore the original F003 mapping table
- [ ] `nextConversationTurn`: also match `^event:` (keep `^source_event:` for unmigrated files) so F008 numbering still counts prompt-kind on new documents. Do not change the count formula. Prefer a shared line helper so neither function exceeds complexity 8. Sibling F008 may later drop `source_event`
- [ ] Update every exact-string document in `cli/test/yaml.test.ts`: `harness` / `event` instead of `source_*`. Session-start-with-`includeSessionId: true` keeps `session_id` first; every other document omits `session_id`. Drop assertions that every doc has `session_id` / `source_*`. Replace AC-F003.11 / AC-F003.12 titles with AC-F003.13 / AC-F003.15 / AC-F003.16
- [ ] Unit-test `isInitialSessionStart`: empty + `sessionStart`/`SessionStart` is true; empty + prompt is false; existing `---` + `sessionStart` is false (covers second sessionStart and prompt-then-sessionStart)
- [ ] Unit-test compact keys (AC-F003.13): omitted harness/event emit empty quoted strings; values are the positionals; no inference from payload
- [ ] Unit-test header order (AC-F003.15): initial session-start is five fields `session_id`, `harness`, `event`, `timestamp`, `turn`; a prompt (or `includeSessionId: false`) is four fields starting with `harness`
- [ ] Unit-test unmapped (AC-F003.16): unmapped `sessionStart` with `includeSessionId: true` is five header-only fields; unmapped prompt / unrecognized event is four header-only fields; no body
- [ ] Keep the unquoted `turn: 3` (not `turn: "3"`) emitter test — retitle off AC-F003.11; still proves the numeric path
- [ ] Keep existing body, timestamp, null/omit, and Copilot/Claude mapping exact-string tests (AC-F003.4, AC-F003.5, AC-F003.6) — only the header keys/`session_id` presence change
- [ ] `cli/test/report.test.ts`: do **not** change `cli/src/report.ts` or report Markdown labels. If `yamlDoc` / other helpers call `emitYamlDocument`, pass `includeSessionId` so typecheck passes. Those helpers’ output will no longer match the shipped F004 parser (`source_harness` / `source_event` / per-doc `session_id`). Isolate report fixtures: keep a local old-key YAML helper (or inline documents) for `parseYamlDocuments` / `emitSessionReport` tests. Do not use the new compact emitter as the Session YAML fixture for report parsing

---

### Step 2: Store wires initial session-start; persist still append-only
`countedYamlDocument` already reads existing YAML for F008. Reuse that read for `isInitialSessionStart`. `ingest.ts` still does not compute the header. Persist, lock, argv, and Event log stay as shipped.
- Paths:
    - `cli/src/store.ts`
    - `cli/src/ingest.ts`
    - `cli/test/ingest.test.ts`
    - `.agents/hooks/index.mjs`
- [ ] `countedYamlDocument`: `turn = nextConversationTurn(existing, emit.event)` unchanged formula; `includeSessionId = isInitialSessionStart(existing, emit.event)`; pass both into `emitYamlDocument` with the F001 `sessionId` (AC-F003.13, AC-F003.14)
- [ ] Do not change `sessionYamlEmit` / `ingest.ts` to compute headers. Keep `parseArgv`, `usageMessage`, `sessionIdentifier`, and `persistIngest` as shipped (AC-F003.1, AC-F003.4, AC-F003.7)
- [ ] Do not rewrite previously written YAML documents when appending (AC-F003.2). Do not strip or add `session_id` on prior docs. Do not migrate `source_*`
- [ ] Update every exact-string YAML assertion in `cli/test/ingest.test.ts` to compact keys. Initial `sessionStart` keeps `session_id` first; prompt / stop / subagent / sessionEnd / duplicate sessionStart omit `session_id`. Drop assertions that every doc has `session_id` / `source_*` (including `/^session_id:/gm` counts that assumed one per document)
- [ ] Unit-test `ingestHook` (AC-F003.13–.16): prompt after sessionStart omits `session_id`; second sessionStart omits `session_id`; first event is prompt → no `session_id` on that doc (and a later sessionStart still omits); omitted positionals → empty `harness`/`event` (four fields — empty `event` is not session-start); unmapped sessionStart vs unmapped prompt = 5 vs 4 header-only fields
- [ ] Keep existing F001 persist assertions (verbatim jsonl, no overlay, no YAML when no session identifier, sequential append leaves first document bytes unchanged) (AC-F003.1, AC-F003.2, AC-F003.4, AC-F003.7, AC-F003.9)
- [ ] Drop ingest assertions that the Session report MD contains `| source_harness |` (F004 reads YAML keys; do not change `report.ts`). Keep `md === emitSessionReport(parseYamlDocuments(yaml))` if it still holds; otherwise stop asserting report label strings in this container
- [ ] `cli/test/store.test.ts`: keep the prebuilt `yamlDocument` override path (concurrency / no-session-id leak). Do not require those fixtures to use compact keys
- [ ] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (track the `.mjs`; do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F003.10)

---

### Step 4: Test runner and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library to dependencies or devDependencies (AC-F003.10)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8
- [ ] Unit tests cover AC-F003.1, .2, .4, .5, .6, .7, .9, .10, .13, .14, .15, .16 at lib (persist + emitter + mapping). Not AC-F003.3, .8, .11, or .12. Entry argv/`exitCode` spawn is e2e, not this container’s unit suite. Leave `hooks.test.ts` asserting the current six shell-string commands (unchanged registration)

---

### Deviations

- Spec status stays `pending`. Sibling `e2e.plan.md` still reflects the prior header; parent sets `planned` after all planify runs. This run does not edit `spec.md`.
- Step 3 is **keep**: do not amend `cli.arch.md` / `system.arch.md` / `model.schema.md` in this planify run or in `/codify` (`/shipify` does that).
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `persistIngest` / `emitYamlDocument` by importing `cli/src`.
- Unquoted `HH:MM:SS` is a YAML 1.1 sexagesimal. The emitter still quotes `timestamp`. `turn` must stay an unquoted YAML integer (`emitPair` numeric path).
- Cursor `sessionStart` body is empty because that table’s only common field is `session_id`, which lives in the filename (and on the initial session-start header when present). Agent-stop body is empty (F005). YAML mapping for `beforeSubmitPrompt` / `stop` still applies if those events arrive via ingest; this amend does not change `.cursor/hooks.json`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML file (AC-F003.7), even when positionals are `copilot` / `sessionStart`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Body mapping is current `docs/normalized-fields.md`. Do not revert F005 (`transcript_path` dropped), F006 (`task`), or F007 (`agent_display_name`).
- F008 numbering is already shipped (`store` + `nextConversationTurn`). This amend does not pass hardcoded `turn: 0` and does not change the count formula. Emitting `event:` is required so F008’s scan can work; matching `^event:` in addition to `^source_event:` keeps numbering green on new documents until the F008 sibling drops the old key.
- `isInitialSessionStart` uses “no documents yet” (empty / no `---`), not “no prior session-start line”. Prompt-then-sessionStart must omit `session_id` (AC-F003.14: when the first event is not session-start, no document gets `session_id`).
- `cli/src/report.ts` is unchanged (F004). Compact keys would break `yamlDoc()` fixtures that round-trip through `parseYamlDocuments`. Isolate those fixtures with old-key YAML; do not rename report labels here.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.

> last updated: 2026-09-02T08:10:00Z
