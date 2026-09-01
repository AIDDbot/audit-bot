---
spec-kind: functional
container: cli
---
# F003-ingest-normalized-yaml - cli

## Specification

On each ingest of a JSON object, keep F001 persist (verbatim Event log, Session index) and, when a session identifier exists, also append one normalized YAML document to `{session_id}.yaml` in that day’s folder. Build the document from the in-memory event plus F002 source harness and source event positionals. Every document starts with five header fields in this order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`. `turn` is a YAML integer (F008; not a body field). This amend requires the field, its order, and that it is a YAML integer; numbering is F008 — pass `0` until F008 so this container stays isolated. Same lock. No second process. No re-read of files just written to *produce* the YAML. No YAML npm package. This spec does not replace F001 or F002. Do not rewrite prior documents. Do not overlay `turn` on the Event log line.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **current** for the third artifact, `src/yaml.ts`, positionals-for-YAML-header, and six Cursor events. [`model.schema.md`](../../model/model.schema.md) already documents `turn` on the Session YAML log document. Do not amend architecture in this planify run. `/codify` does not redo Step 3.

Grounding (F003 shipped 0.7.0; later F005/F006/F007 mapping is current; this is the F008-amend replan):

- `cli/src/yaml.ts`: `emitYamlDocument` emits four header keys then body. `YamlDocumentInput` is `{ payload, sessionId, harness, event, now }` — no `turn`. `emitPair` already has a numeric path (`typeof value !== "string"` → `emitScalar` → unquoted finite number). Extend the input with `turn: number` and emit `turn` as the fifth header field via that path (`turn: 0`, never `turn: "0"`)
- `cli/src/ingest.ts`: `sessionYamlDocument` calls `emitYamlDocument` without `turn`. Supply the integer. **Numbering is F008 — this F003 amend must not implement prompt-counting.** Pass `0` until F008. Do not read the YAML log to compute `turn`. Do not persist `turn` on the Event log line
- Body mapping stays **current** `docs/normalized-fields.md` (F005 dropped `transcript_path`; F006 added `task`; F007 added `agent_display_name`). Do **not** restore the original F003 mapping table. Do **not** add `turn` to `docs/normalized-fields.md` (`turn` is not a body field)
- `cli/src/index.ts` / `cli/src/argv.ts` / `cli/src/event.ts` / `cli/src/store.ts`: already pass positionals, persist YAML under `ingest.lock`. Keep them. Do not rewrite prior YAML documents
- `.cursor/hooks.json`: six events (F001 four plus F005 `beforeSubmitPrompt` and F006 `stop`). **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build`. Harness entry is `.agents/hooks/index.mjs`. Unit tests import `cli/src`, not the artifact. Do not emit `cli/dist`. Do not use `tsc` as the product build
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- `cli/test/report.test.ts` helpers call `emitYamlDocument` — they must pass `turn` so typecheck passes. Do not change report grouping, Details, or duration (F004/F008)

Unit tests cover AC-F003.1, .2, .4, .5, .6, .7, .9, .10, .11, .12 except entry spawn/`exitCode` (those are e2e). Not AC-F003.3 or AC-F003.8 (deprecated).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session YAML log** is the per-session append-only file of normalized documents; each document includes integer `turn` (a property of the document, not a separate persisted entity).

This amend does not add persisted entities. It adds `turn` as the fifth YAML header field. Do not persist `turn` on the Event log line. Do not rewrite prior documents’ `turn`.

### Shared store wording

> Copy this block verbatim into the F003 e2e plan. Event log, Session index, project root, and day folder stay as F001. Concurrency now covers the YAML append. Argv now passes harness/event into ingest for YAML only. Session YAML log header is five fields including integer `turn`.

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
- Append-only: do not rewrite, reorder, or restructure previously written documents, including their `turn` values.
- When the payload has a session identifier: append exactly one YAML document in the same invocation as the Event log and Session index, built from the in-memory event plus F002 source harness and source event (no second process; no re-read of files just written).
- When the payload has no session identifier: do not create or append a Session YAML log.
- Every document is an independent sequential event. Do not nest a subagent event under a parent.
- Header fields, always, in this order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`.
  - `session_id` = the F001 session identifier (same as the filename stem).
  - `source_harness` / `source_event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload.
  - `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
  - `turn` is a YAML integer (F008; not a body field). This spec requires the field, its order, and that it is a YAML integer. Numbering is F008. Do not persist `turn` on the Event log line. Do not rewrite prior documents' `turn`.
- Body after the header: only the normalized common fields that apply to this event type in `docs/normalized-fields.md`, excluding `session_id` (already in the header), using those snake_case names, in table order. Source keys are the row for the event kind matching `source_event` and the column matching `source_harness` (`cursor`, `copilot`, `claude-code`).
- Event kinds for that mapping: session start (`sessionStart` / `SessionStart`); session end (`sessionEnd` / `SessionEnd`); subagent start (`subagentStart` / `SubagentStart`); subagent stop (`subagentStop` / `SubagentStop`); user prompt (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`); agent stop (`stop` / `agentStop` / `Stop`).
- Do not include any harness-specific or event-specific field that is not in that normalized set.
- When a mapped source key is absent from the payload, omit the body field. When the source key is present and the value is `null`, emit YAML `null`. Present non-null values are YAML scalars (or block scalars when needed).
- When `source_harness` or `source_event` does not match a mapping row and column, the document contains the five header fields only.
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
| Step 1: YAML document emitter and field mapping | redo | five-field header + turn integer (AC-F003.11); unmapped five fields (AC-F003.12); AC-F003.3/8 dropped |
| Step 2: Pass positionals into ingest; persist YAML | redo | ingest supplies `turn`; tests that cited AC-F003.3/8 move to .11/.12 |
| Step 3: Amend architecture and model schema | keep | specify already documented Session YAML log + `turn` on the document in `model.schema.md`; architecture is not stale vs five-field header (it never listed the four-field header) |
| Step 4: Test runner and AC sweep | redo | unit coverage is AC-F003.1,2,4,5,6,7,9,10,11,12 (not 1–10; not 3 or 8) |

## Implementation Steps

### Step 1: Five-field YAML header and integer `turn` (lib)
Extend the existing emitter. Do not change body mapping. Do not add a YAML package. Do not add `turn` to `docs/normalized-fields.md`. Header `session_id` stays the F001 identifier. Body never repeats `session_id`. `turn` is header-only.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
    - `cli/test/report.test.ts`
- [ ] Add `turn: number` to `YamlDocumentInput`. Do not accept a string. Do not default it inside the emitter
- [ ] `emitYamlDocument`: after `timestamp`, emit `emitPair("turn", input.turn)` so a finite integer uses the existing numeric path (`turn: 0`, never `turn: "0"`). Keep header order: `session_id`, `source_harness`, `source_event`, `timestamp`, `turn`, then body (AC-F003.11)
- [ ] Unrecognized harness or event still returns header only — now the five header fields, no body (AC-F003.12). Keep current `bodyByEvent` / field arrays (F005 no `transcript_path`; F006 `task`; F007 `agent_display_name`). Do not restore the original F003 mapping table
- [ ] Every exact-string document in `cli/test/yaml.test.ts` includes `turn: 0` (or the passed number) immediately after `timestamp`. Replace AC-F003.3 / AC-F003.8 references with AC-F003.11 / AC-F003.12
- [ ] Unit-test a non-zero passed `turn` (e.g. `3`) emits unquoted `turn: 3` and does not emit `turn: "3"` — proves the emitter does not hardcode `0` (AC-F003.11)
- [ ] Unit-test omitted harness/event, unrecognized harness, and unrecognized event: document has exactly those five header keys and no body (AC-F003.11, AC-F003.12)
- [ ] Pass `turn: 0` at every `emitYamlDocument` call in `cli/test/report.test.ts` so typecheck passes. Do not change Details, duration, or grouping (F004/F008)
- [ ] Keep existing body, timestamp, null/omit, and Copilot/Claude mapping exact-string tests (AC-F003.4, AC-F003.5, AC-F003.6) — only the header gains `turn`

---

### Step 2: Ingest supplies `turn`; persist still append-only
`sessionYamlDocument` supplies the integer. Numbering is F008. Persist, lock, argv, and Event log stay as shipped.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/test/ingest.test.ts`
    - `.agents/hooks/index.mjs`
- [ ] `sessionYamlDocument`: pass `turn: 0` into `emitYamlDocument`. Do not read the Session YAML log. Do not count prompt-kind documents. Do not add `turn` to `IngestInput` unless a later spec needs it (AC-F003.11)
- [ ] Do not add `turn` to `eventLogLine` / the Event log object. Do not mutate `payload`. Keep `parseArgv`, `usageMessage`, `sessionIdentifier`, and `persistIngest` as shipped (AC-F003.1, AC-F003.4, AC-F003.7)
- [ ] Do not rewrite previously written YAML documents when appending (AC-F003.2)
- [ ] Update every exact-string YAML assertion in `cli/test/ingest.test.ts` to include `turn: 0` after `timestamp` (prompt events included — numbering is not this amend)
- [ ] Unit-test `ingestHook`: F001 session id + unrecognized harness/event still writes a five-header-only YAML document (no body); missing positionals still write YAML with empty header strings plus `turn: 0` (AC-F003.11, AC-F003.12)
- [ ] Keep existing F001 persist assertions (verbatim jsonl, no overlay, no YAML when no session identifier, sequential append leaves first document bytes unchanged) (AC-F003.1, AC-F003.2, AC-F003.4, AC-F003.7, AC-F003.9)
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
- [ ] Unit tests cover AC-F003.1, .2, .4, .5, .6, .7, .9, .10, .11, .12 at lib (persist + emitter + mapping). Not AC-F003.3 or AC-F003.8. Entry argv/`exitCode` spawn is e2e, not this container’s unit suite. Leave `hooks.test.ts` asserting the current six shell-string commands (unchanged registration)

---

### Deviations

- Spec status stays `pending` until the sibling e2e planify run also has a plan; this run does not set `planned`.
- Step 3 is **keep**: `cli.arch.md` / `system.arch.md` already name the Session YAML log, `src/yaml.ts`, and positionals-for-YAML-header; `model.schema.md` already documents `turn` on the document. Architecture never listed a four-field header, so it is not stale vs five fields. `/codify` does not amend those files for this replan.
- Entry spawn, stdin, and `exitCode` are e2e (sibling plan). This container unit-tests `ingestHook` / `persistIngest` / `emitYamlDocument` by importing `cli/src`.
- Unquoted `HH:MM:SS` is a YAML 1.1 sexagesimal. The emitter still quotes `timestamp`. `turn` must stay an unquoted YAML integer (`emitPair` numeric path).
- Cursor `sessionStart` body is empty because that table’s only common field is `session_id`, which lives in the header. Agent-stop body is empty (F005). YAML mapping for `beforeSubmitPrompt` / `stop` still applies if those events arrive via ingest; this amend does not change `.cursor/hooks.json`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no YAML file (AC-F003.7), even when positionals are `copilot` / `sessionStart`.
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- Body mapping is current `docs/normalized-fields.md`. Do not revert F005 (`transcript_path` dropped), F006 (`task`), or F007 (`agent_display_name`).
- This amend passes `turn: 0` and does not read the YAML log. F008 numbers `turn`. Do not persist `turn` on the Event log line.
- `cli/src/report.ts` `headerKeys` still lists four keys. Do not change report grouping or Details here (F004/F008). `cli/test/report.test.ts` only gains a `turn` argument so `emitYamlDocument` typechecks.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.

> last updated: 2026-09-01T20:08:40Z
