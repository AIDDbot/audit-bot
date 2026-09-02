---
spec-kind: functional
container: cli
---
# F010-session-normalized-jsonl - cli

## Specification

Replace the per-session normalized log `{session_id}.yaml` with `{session_id}.jsonl` in the F001 daily folder. Each line is one JSON object (`JSON.stringify` + `"\n"`; read with `JSON.parse` per non-empty line). Append-only. Stop writing `{session_id}.yaml`. Do not migrate, read, or rewrite existing `.yaml`. Do not mix YAML and JSONL in one session. Do not merge into F001 `events.jsonl` (verbatim Event log stays; no harness / event / turn / generated-timestamp overlay). Keep mapping in `cli/src/yaml.ts` (file name stays; role is the normalized session JSONL record): compact header keys in insertion order — optional `session_id`, then `harness`, `event`, `timestamp`, `turn` (JSON **number**), then `subagent` when present, then table-driven body. Omit absent keys. Present-null is JSON `null`. Scan **that session’s JSONL only** for initial session-start and `turn`. Same `ingest.lock`. F004 owns Markdown content; this spec only retargets the report source file. Remain observe-only Node.js ≥ 24 ESM, `dependencies: {}`, no YAML library, no JSON library, no new command. This spec owns **format, filename, and serialization**. Mapping, omit-absent / present-null, and body tables stay F003 / F009 / F007 / F006 — do not restate those ACs. How `turn` is numbered stays F008; this spec changes the scan target from YAML text to JSONL objects.

- **Context**: [Source spec](./spec.md)
- **Architecture**: [Container architecture](../../arch/cli.arch.md) — **already names** Session JSONL log `{session_id}.jsonl`, `src/yaml.ts` as the normalized session JSONL record, `src/store.ts` Session JSONL log under `ingest.lock`, `src/report.ts` Session report from Session JSONL log, and turn numbering from prompt-kind `event` values in that file. Do not amend architecture in this planify run (`/shipify` does that). `/codify` has no architecture step.

Grounding (first F010 plan; production still emits `{session_id}.yaml`):

- `cli/src/yaml.ts`: **today** `emitYamlDocument` returns a `---` YAML document; `isInitialSessionStart` scans `---`; `nextConversationTurn` scans `^event:` lines. **This spec** keeps `bodyByEvent`, harness columns, `subagentValue` preference (`subagent_type` → `agent_type` → `agentType` → `agentName`), `sourceInstant` / `formatLocalHms`, compact header, omit-absent, present-null. Replace YAML string emit with an insertion-order object then `JSON.stringify` + newline. Redo start/turn scan to parse that session’s JSONL objects only. Keep the filename `yaml.ts`. Drop `needsQuote` / `emitScalar` / `blockLines` / `emitPair` / `unquoteYamlScalar` / `headerEventValue`. Oxlint complexity ≤ 8
- `cli/src/store.ts`: **today** `appendSessionYaml` writes `{session_id}.yaml`; `yamlDocument` prebuilt-string override; `readExistingYaml` feeds the scanners. **This spec** appends `{session_id}.jsonl` under the same `ingest.lock`. Prefer **one** JSONL append path: drop `yamlDocument`. Rename yaml* identifiers to session/jsonl. Never write `.yaml`. Never read `.yaml`
- `cli/src/ingest.ts`: **today** `sessionYamlEmit` + `maybeWriteReport` `yamlPath` `{session_id}.yaml` (report silently fails if that file is missing). **This spec** session emit; report source `{session_id}.jsonl`
- `cli/src/report.ts`: **today** YAML chunk parser (`---`, `parsePairAt`). **This spec** parse JSONL (file order, `JSON.parse` each non-empty line). Keep `emitSessionReport` Markdown (duration, counts, turns, Subagent cell, 100-char previews). `turn` is a JSON number. `null` stays null. Overview `session_id` from filename stem. Do not read `events.jsonl` or `sessions.json`. Do not change Details / grouping / preview rules (F004)
- `cli/src/index.ts` / `cli/src/argv.ts` / `cli/src/event.ts`: keep. F002 positionals unchanged. Event log line stays `JSON.stringify(payload)` with no overlay
- `.cursor/hooks.json`: six events. **Do not change.** Do not add `.cmd` wrappers (AGENTS.md learning scar)
- After `cli/src/` changes: `cd cli && bun run build` → `{repo}/.agents/hooks/index.mjs`. Do not emit `cli/dist`. Do not use `tsc` as the product build. Unit tests import `cli/src`, not the artifact
- Node builtins only; `dependencies: {}`; Oxlint complexity ≤ 8; ingest path always `exitCode` 0
- Package `name`/`bin` stay `cli-node`
- Do not change Event log verbatim rules, Session index rules, project root, day folder, decode/lock, Copilot/Claude registration, or Cursor events
- Do not retitle F003–F009 tests in this plan (later specs). Retarget fixtures so the suite stays green. F010 titles cover AC-F010.1–.8
- Do not re-specify F003 header/body mapping ACs or F005–F009 field ACs. Serialize those rules as JSON

Unit tests cover AC-F010.1–.8 at lib except entry spawn/`exitCode`/stdout (those are e2e).

### Data model

From [`model.schema.md`](../../model/model.schema.md): a **Session** is a related set of events; an **Event** is one hook payload; a **Session JSONL log** is the per-session append-only file of normalized JSON objects (one JSON object per line / per Event; `{session_id}.jsonl` in the daily folder). Compact header keys are `harness` and `event`. `session_id` appears on the object only for the initial session-start; the filename stem is always the F001 identifier. New objects may include `subagent` after the compact header on any event kind when a matching payload attribute is present. Each object includes integer `turn` (a property of the object, not a separate persisted entity). A **Session report** is the Markdown file derived from that JSONL (F004).

This spec replaces the Session YAML log artifact with the Session JSONL log. It does not add a persisted entity. Event log stays verbatim (no overlay). Session index unchanged. Do not persist `turn` on the Event log line. Do not rewrite prior lines. Do not amend `model.schema.md` in this run.

### Shared store wording

> Copy this block verbatim into the F010 e2e plan. Event log, Session index, project root, and day folder stay as F001. The third artifact is the Session JSONL log (not YAML). Compact header + mapping stay F003/F009/F007/F006; this spec serializes them as JSON. F008 numbering scans that session’s JSONL `event` values. F004 still writes `{session_id}.md` after every session-JSONL append.

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
- Do not add `receivedAt`, `harness`, `hookEvent`, `timestamp`, `turn`, `subagent`, or any overlay. Do not omit empty fields. A generated session-record timestamp must not be written onto the Event log line.
- Serialize as one JSONL line: `JSON.stringify(parsedObject) + "\n"` (parse only to validate an object and to keep the line valid JSONL).
- Persist every received JSON object regardless of event name (no filter by hook type).
- When stdin is not one JSON object, write no line.
- Do **not** merge the Session JSONL log into this file.

**Session index** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json`

- Always a `.json` file: a JSON array of distinct session identifier strings, in first-seen order.
- Create as `[]` when the day folder is first used so Event log and Session index exist.
- **Session identifier** — identity already on the payload, first non-empty string among:
  1. `session_id`
  2. `conversation_id`
  3. `parent_conversation_id` (subagent events when the two above are absent)
- Do not invent a session identifier. Do not use Copilot `sessionId`.
- When the identifier is not already in the array, append it. No duplicates.
- When the payload has no session identifier: still append the Event log line; leave the Session index array unchanged; do not create or append a Session JSONL log; do not create a Session report.

**Session JSONL log** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`

- Always a `.jsonl` file named for the F001 session identifier.
- One JSON object per line (`JSON.stringify` + newline). Append-only.
- Do not write `{session_id}.yaml`. Do not read/migrate/rewrite existing `.yaml`.
- Do not merge into `events.jsonl`.
- When no session identifier: do not create or append a Session JSONL log.
- Compact header + mapping stay F003/F009/F007/F006; this spec serializes them as JSON.
- One file per distinct F001 identifier for that day. `{session_id}` is the same stem as today’s `{session_id}.yaml`.
- Append-only: do not rewrite, reorder, or restructure previously written lines, including their `turn` values or whether they contain `session_id`.
- When the payload has a session identifier: append exactly one JSON object as one new line in the same invocation as the Event log and Session index, built from the in-memory event plus F002 harness and event positionals (no second process; no re-read of files just written to *produce* the object). Determining `turn` (F008) and whether this is the initial session-start may read **that session’s existing JSONL only**. Do not read `events.jsonl` or `sessions.json` for those values. Do not read `.yaml`.
- Every object is an independent sequential event. Do not nest a subagent event under a parent.
- Compact header keys in insertion order (`JSON.stringify` preserves insertion order): optional `session_id`, then `harness`, `event`, `timestamp`, `turn` (JSON number). Then `subagent` when a matching payload attribute is present. Then table-driven body. Omit absent keys. Present-null is JSON `null`. Field names are snake_case.
- `session_id` on the object only when this is the **initial session-start**: `event` is `sessionStart` or `SessionStart` AND that session’s Session JSONL log has **no records** (empty file / no parsed objects). Value is the F001 session identifier (filename stem). Omit `session_id` on every other object. When the first event for a session is not session-start, no object gets `session_id`.
- `harness` / `event` = the F002 ingest positionals as supplied (`ingest {harness} {event}`). Empty string when omitted. Do not infer from the payload. F002 command positionals do not change.
- `timestamp` = host-local 24-hour `HH:MM:SS` (zero-padded). When the payload has `timestamp` (a finite number = Unix milliseconds, or a non-empty string that denotes a date-time), format that instant. When it does not, generate the clock time at receive (the same receive instant used for the daily folder date). Do not write a generated timestamp onto the Event log line.
- `turn` is a JSON number (F008; not a body field). When appending an object, `turn` is the count of prompt-kind `event` values already present in parsed JSONL objects (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`), plus one if this event is prompt-kind; otherwise that count; 0 when none and this is not prompt-kind. Do not persist `turn` on the Event log line. Do not rewrite `turn` on previously written lines.
- Node builtins only: no YAML library, no JSON library (`JSON.stringify` / `JSON.parse` only).

**Session report** — `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md`

- Write after every ingest that appends a Session JSONL log object (payload has a session identifier), after that line is in the file. Produce only from that session’s Session JSONL log (every object, file order, no re-sort). Do not read the Event log or Session index.
- Markdown behavior stays F004 (duration, counts, turn grouping, Subagent cell, 100-char previews). This spec only retargets the source file from `{session_id}.yaml` to `{session_id}.jsonl` so persist+report still runs. Overview `session_id` is the filename stem. `turn` is a JSON number. JSON `null` stays null.
- When report generation fails: still persist F001/F010, exit 0, no blocking stdout.

**Concurrency** — one lock file `{projectRoot}/temp/audit/{YYYY-MM-DD}/ingest.lock` covers Event log, Session index, and Session JSONL log. Exclusive create (`wx`); retry on `EEXIST`; stale lock older than 2s may be unlinked; total wait well under 500ms. Under the lock: append one complete Event-log JSONL line, update the index, then (when a session identifier is present) read that session’s existing Session JSONL log (missing file → empty), compute `turn` and initial session-start, emit one complete JSON object line, and append it. After persist returns, the same invocation may **read** that Session JSONL log to write or overwrite the Session report (F004). Report generation failure must not undo F001/F010 writes. No torn, concatenated, or duplicated records; unique identifiers in the index.

**Argv / stdin / stdout**

- Command: `ingest` at `process.argv[2]`. Optional `process.argv[3]` = source harness. Optional `process.argv[4]` = source event.
- Source harness and source event are F002 invocation inputs. Pass them into ingest so the session-record header can use them. Do not write them onto the Event log line. Do not use them to skip or filter the event. Do not infer them from the payload.
- Unknown command (usage on stderr, `exitCode` 1) when argv is omitted or `process.argv[2]` is not `ingest`. Extra tokens after `ingest` are **not** an unknown command.
- Usage: `usage: cli-node ingest`.
- Stdin: one JSON object (`readFileSync(0)`).
- Ingest writes **no stdout**. Ingest always `exitCode` 0, including when Session report generation fails.

**Cursor registration** — six events (F001 / F005 / F006). Unchanged. Each `command` is the shell string `node .agents/hooks/index.mjs ingest cursor {event}`. Do not add `.cmd` wrappers. Do not set `failClosed`. Do not register Copilot or Claude. F010 does **not** add a registration.

**Harness entry** — `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`). Tests spawn/import `cli/src`, not that artifact.

## Checkpoints

| Prior step | Action | Note |
|------------|--------|------|
| first | | First F010 cli plan; no prior steps to classify |

## Implementation Steps

### Step 1: Emit a session JSONL record from `yaml.ts`
Keep mapping tables, compact header, `subagentValue`, omit-absent / present-null. Replace YAML document emit with an insertion-order object serialized as `JSON.stringify(record) + "\n"`. Keep the file name `yaml.ts`. Drop YAML scalar/block/pair helpers. Keep functions ≤ 8 complexity.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
- [ ] Rename `YamlDocumentInput` → `SessionRecordInput`; `YamlEmitInput` → `SessionEmitInput`; `emitYamlDocument` → `emitSessionRecord`. Return one JSONL line including the trailing newline. Do not keep a YAML emit path (AC-F010.2, AC-F010.6)
- [ ] Build the record as a plain object with keys assigned in this order: `session_id` only when `includeSessionId`; then `harness`, `event`, `timestamp`, `turn` (number, not string); then `subagent` when a matching payload key is present (`subagentValue` / `key in payload`); then table-driven body via existing `bodyByEvent` / harness column. Omit keys that are absent. Assign JSON `null` when the source is present and `null`. Do not assign `undefined`. `JSON.stringify` preserves insertion order (AC-F010.6)
- [ ] Keep `bodyByEvent`, `asHarness`, `sourceInstant`, `formatLocalHms`, `subagentSourceKeys`, and `subagentValue` preference order. Do not fold `subagent` into the harness column. Do not change mapped field names. Do not add a YAML or JSON library (AC-F010.6, AC-F010.8)
- [ ] Extract `assignHeader` / `assignSubagent` / `assignBody` (or equivalent) so `emitSessionRecord` stays complexity ≤ 8. Delete `needsQuote`, `emitScalar`, `blockLines`, `emitPair`, `headerLines`, `subagentLines`, `bodyLines`, `unquoteYamlScalar`, `headerEventValue`
- [ ] Retarget `cli/test/yaml.test.ts` exact-string fixtures from YAML documents to JSONL lines / parsed objects (`JSON.parse` each non-empty line; `Object.keys` insertion order; `turn` typeof `number`; present-null is `null`). Keep F003–F009 titles; do **not** retitle them. Replace YAML-only cases (block scalar newlines, unquoted YAML integer, quoted YAML timestamp, NaN/Infinity YAML quoting) with JSON equivalents: multiline strings are JSON strings; `JSON.stringify` of non-finite numbers is `null` — do not invent a JSON library (AC-F010.2, AC-F010.6)
- [ ] Add F010 titles: compact snake_case header key order; `session_id` only when `includeSessionId`; `turn` is a JSON number; present-null is JSON `null`; one object per line; stringify then parse round-trip (AC-F010.2, AC-F010.6)

---

### Step 2: Scan that session’s JSONL for initial session-start and turn
Redo `isInitialSessionStart` and `nextConversationTurn` to parse **that session’s JSONL objects only**. Do not scan `---` / `event:` YAML lines. Do not read `events.jsonl` or `sessions.json`. Numbering formula stays F008.
- Paths:
    - `cli/src/yaml.ts`
    - `cli/test/yaml.test.ts`
- [ ] Parse existing text with `JSON.parse` per non-empty line (skip empty). Do not use a YAML library. Extract a helper so both scanners and complexity stay ≤ 8 (AC-F010.2)
- [ ] `isInitialSessionStart(existingJsonl, event)`: true only when `event` is `sessionStart` or `SessionStart` **and** parsed JSONL has **no records** (empty file / only empty lines). A prior prompt (or any record) then session-start is false — matches current “no `---` yet” and AC “first event not session-start → no `session_id` on any record” (AC-F010.6)
- [ ] `nextConversationTurn(existingJsonl, event)`: count prompt-kind `event` **values on parsed JSONL objects** (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`), plus one if this event is prompt-kind; else that count; 0 when none and not prompt-kind. Look at the object’s `event` field only — ignore `source_event`, `hook_event_name`, and payload keys. Unrecognized / empty event is not prompt-kind (AC-F010.6)
- [ ] Retarget `headerDoc` / scanner fixtures to JSONL lines (`{"harness":"cursor","event":"…","timestamp":"15:00:00","turn":0}\n`). Keep existing test titles. Drop YAML `source_event:` line-scan fixtures; add an F010 trap: a JSON object with `source_event` or `hook_event_name` and no prompt-kind `event` does not count (AC-F010.2)
- [ ] Quoted YAML scalar tests become JSON string `event` values (already unquoted by `JSON.parse`). Mix of Cursor / Copilot / Claude prompt aliases still increments. Empty JSONL → 0 / 1 as today (AC-F010.6)

---

### Step 3: Store appends `{session_id}.jsonl` under `ingest.lock`
One JSONL append path. Same lock. Rename yaml* identifiers. Drop the unused `yamlDocument` prebuilt-string override (retarget store tests to `sessionEmit`). Never write `.yaml`. Never read `.yaml`.
- Paths:
    - `cli/src/store.ts`
    - `cli/src/ingest.ts`
    - `cli/test/store.test.ts`
- [ ] Persist path is `path.join(dayFolder, `${sessionId}.jsonl`)`. When `sessionId` is undefined, return without creating or appending a Session JSONL log (AC-F010.1, AC-F010.5)
- [ ] Drop `yamlDocument?: string` from `persistIngest`. Production and tests use `sessionEmit?: SessionEmitInput` only. Under the lock, after Event log + index: `readFile` that session’s `{session_id}.jsonl`; ENOENT → `""`; `turn = nextConversationTurn(existing, event)`; `includeSessionId = isInitialSessionStart(existing, event)`; `appendFile` `emitSessionRecord(...)`. Do not read Event log or Session index to determine those values. Do not re-read the line just appended to *produce* it (AC-F010.1, AC-F010.2, AC-F010.7)
- [ ] Rename `readExistingYaml` / `appendSessionYaml` / `countedYamlDocument` / `yamlEmit` to session/jsonl names. `writeUnderLock` / `persistIngest` stay complexity ≤ 8. Do not add a second lock (AC-F010.7)
- [ ] Never `appendFile` / `readFile` / `writeFile` a `*.yaml` session log. A planted `{session_id}.yaml` must be left untouched (bytes unchanged) and must not affect `turn` or `session_id` (AC-F010.3)
- [ ] Event log line stays verbatim `eventLine + "\n"`. Do not overlay harness, event, turn, or generated timestamp onto `events.jsonl` (AC-F010.4)
- [ ] Retarget store tests: overlapping calls with `sessionEmit` yield two complete parseable JSONL objects (not YAML documents) plus valid `events.jsonl`; `sessionId` undefined must not create `leaked.jsonl` or `leaked.yaml`; calls that omit `sessionEmit` still skip the session file (jsonl/index-only). Add F010 titles for filename `.jsonl`, no `.yaml` write, lock completeness (AC-F010.1, AC-F010.3, AC-F010.5, AC-F010.7)

---

### Step 4: Ingest session emit; report parses JSONL (Markdown stays F004)
`sessionYamlEmit` → session emit. `maybeWriteReport` must read `{session_id}.jsonl` or the report silently fails. Report parser is JSONL; `emitSessionReport` Markdown behavior stays.
- Paths:
    - `cli/src/ingest.ts`
    - `cli/src/report.ts`
    - `cli/test/ingest.test.ts`
    - `cli/test/report.test.ts`
- [ ] `ingest.ts`: rename `sessionYamlEmit` → `sessionEmit`; pass `sessionEmit` into `persistIngest` when `sessionId` is defined. Keep `maybeWriteReport` after persist returns, try/catch, no session-end gate. Point `writeSessionReport` at `{session_id}.jsonl` (not `.yaml`) (AC-F010.1, AC-F010.8)
- [ ] `report.ts`: replace YAML chunk parser with JSONL parse (split `"\n"`, skip empty, `JSON.parse` each line, file order, no re-sort). Map each object to the existing report doc shape (`session_id` / `harness` / `event` / `timestamp` / `turn` / `body` remaining keys including `subagent`). `turn` is a JSON number (`typeof number`; missing/invalid → 0). JSON `null` stays null. Rename `parseYamlDocuments` / `YamlDoc` / `yamlPath` to session/jsonl names. Overview `session_id` from `path.parse(jsonlPath).name`. Keep `emitSessionReport` Markdown (duration, counts, turn groups, Subagent, 100-char preview, Details). Do not read `events.jsonl` or `sessions.json` (AC-F010.2)
- [ ] Keep `formatSubagent`, `detailsByEvent`, grouping, duration, preview. Do not change F004 Markdown rules. Do not add a YAML or JSON library (AC-F010.8)
- [ ] Retarget `cli/test/ingest.test.ts`: `yamlPath` → `{sessionId}.jsonl`; stop splitting on `---`; parse JSONL lines; round-trip `md === emitSessionReport(parseSessionRecords(jsonl), stem)`. Keep F003–F009 titles. Copilot `sessionId` only still writes Event log and **no** session jsonl and **no** yaml and **no** md. Add F010 titles: jsonl filename; one object per line; events.jsonl deep-equals payload (no overlay); no `.yaml` write; planted `.yaml` unread; no session file without F001 id (AC-F010.1–.5, AC-F010.8)
- [ ] Retarget `cli/test/report.test.ts` fixtures from YAML text to JSONL (prefer `emitSessionRecord` / parsed objects; rewrite handwritten `---` fixtures). Keep F004 titles. `writeSessionReport` reads `.jsonl`; empty jsonl still throws; overview stem when JSONL omits `session_id` (AC-F010.2)

---

### Step 5: Confirm architecture unchanged
Architecture already names Session JSONL log, `src/yaml.ts` as the normalized session JSONL record, and report-from-JSONL. Confirm-no-change only. Do not edit `cli.arch.md` / `system.arch.md` / `model.schema.md`.
- Paths:
    - `docs/arch/cli.arch.md`
    - `docs/arch/system.arch.md`
- [ ] Confirm `cli.arch.md` ingest already appends `{session_id}.jsonl`, code-org role of `src/yaml.ts` is “normalized session JSONL record”, and report is from Session JSONL log. Do **not** edit those files
- [ ] Confirm `system.arch.md` overview already names Session JSONL log. Do **not** edit it
- [ ] Do not revive `.cmd` wrappers. Do not register Copilot or Claude. Do not change `.cursor/hooks.json` (stays six). Do not add a CLI command

---

### Step 6: Test runner, rebuild, and AC sweep
- Paths:
    - `cli/package.json`
    - `cli/test/*.test.ts`
    - `cli/.oxlint.json`
    - `.agents/hooks/index.mjs`
- [ ] Keep `name`/`bin` `cli-node`; keep `dependencies: {}`; do not add a YAML library or a JSON library to dependencies or devDependencies (AC-F010.8)
- [ ] Keep `test` as `node --test test/*.test.ts`; unit tests import `../src/…ts`, not `.agents/hooks/index.mjs`
- [ ] `cd cli && bun run test` green; `bun run typecheck` and `bun lint` clean; complexity ≤ 8 for emit/scan/store/report helpers
- [ ] `cd cli && bun run build` so `{repo}/.agents/hooks/index.mjs` matches source (do not emit `cli/dist`; do not use `tsc` as the product build) (AC-F010.8)
- [ ] Unit tests cover AC-F010.1–.8 at lib: jsonl filename; one object per line; stringify/parse; no yaml write; no yaml read; no merge into events.jsonl; no session file without session id; snake_case compact header; JSON null; lock; no deps. Entry argv/`exitCode`/stdout spawn is e2e. Do **not** retitle F003–F009 tests. Leave `hooks.test.ts` at six shell-string commands

---

### Deviations

- Spec status stays `pending`. This run does not set `planned`. Sibling `e2e.plan.md` is out of scope for this planify; parent coordinates status after remaining containers have plans. This run does not edit `spec.md`.
- Write `cli.plan.md` only. Do not write `e2e.plan.md`. Do not amend architecture. Do not change F002 positionals, F001 Event log/index, or `.cursor/hooks.json`.
- Keep `cli/src/yaml.ts` filename (cli.arch). Role is the normalized session JSONL record. Rename exports/types away from Yaml* as listed in Steps 1–4.
- Drop `yamlDocument` prebuilt-string persist path. Store tests that used it retarget to `sessionEmit`. Prefer one JSONL append path.
- Do not retitle F003–F009 tests (later amend specs). Retarget fixtures (YAML → JSONL) so the suite stays green. F010 titles own AC-F010.1–.8.
- `cli/test/report.test.ts` is retargeted only so parse+`writeSessionReport` stay green. F004 owns Markdown content; do not change grouping, duration, Subagent cell, Details, or 100-char preview.
- Do not migrate, delete, or rewrite existing `{session_id}.yaml`. New ingests write JSONL only. A planted `.yaml` beside a new `.jsonl` must not be read.
- Do not mix YAML and JSONL in one session file. Do not append JSON objects to `.yaml` or YAML documents to `.jsonl`.
- `JSON.stringify` of `NaN` / `Infinity` is `null`. Drop YAML quote tests for those; do not add a JSON library to preserve them.
- YAML block-scalar newline emit is gone; JSON encodes `\n` in strings. YAML sexagesimal quoting of `HH:MM:SS` is gone; timestamp is a JSON string.
- Scanner fixtures that exact-string `source_event:` YAML lines are replaced by JSON object traps. Formula stays F008; scan target is JSONL `event`.
- Entry spawn, stdin, and `exitCode`/stdout are e2e (sibling plan). This container unit-tests `emitSessionRecord` / `persistIngest` / `ingestHook` / report parse by importing `cli/src`.
- Copilot-only `sessionId` is not an F001 identifier: Event log still written, no Session JSONL log, no Markdown (AC-F010.5).
- F001 stdin decode (BOM / UTF-16 / double-encoded JSON unwrap) and `resolveProjectRoot` leading-slash Windows drive mapping stay as shipped; this plan does not redo them.
- The Session report is not covered by `ingest.lock` (lock covers Event log, index, Session JSONL log). Report is written after persist returns.
- Do not add `.cmd` wrappers. Learning scar: `node .agents/hooks/index.mjs ingest cursor {event}` keeps extra tokens on Windows.
- `/codify`: spec status set to `in-progress`. Do not reopen F003 mapping tables, F009 preference order, F008 count formula, or F004 Markdown. Serialize those as JSON.

---

> last updated: 2026-09-02T14:56:00Z
