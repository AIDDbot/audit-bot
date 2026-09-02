# CLI architecture — audit-bot

> Container `cli` from [`system.arch.md`](./system.arch.md).
> Tier: `cli`.


## Overview

Node.js TypeScript CLI (ESM, Bun as package manager and runner). 

- **Folder**: `cli/`
- **Archetype**: TypeScript — Node CLI (Bun, Oxlint)

### Dependencies

- **Depends on**: Node ≥ 24 or Bun ≥ 1.4 (no sibling containers)
- **Used by**: Developer (local run/tests). Cursor invokes ingest via project-level `.cursor/hooks.json`. Each of `sessionStart`, `sessionEnd`, `subagentStart`, `subagentStop`, `beforeSubmitPrompt`, and `stop` has `command`: `node .agents/hooks/index.mjs ingest cursor {event}`. Cursor `command` is a shell string (interpreter + script + args); extra argv tokens are passed on Windows. No `.cmd` wrappers.
- **Libraries**: none (`dependencies`: `{}`). Dev: `@types/node`, `oxlint`, `oxlint-tsgolint`, `typescript`. Tests use `node:test` and `node:assert`

### CLI surface (not HTTP)

No HTTP API; no [`api.schema.md`](../model/api.schema.md). Commands:

| Command | Behavior |
| --- | --- |
| `ingest` `[harness]` `[event]` | Optional source harness then source event (`ingest cursor sessionStart`). Passed into ingest for the session-record header only. They do not gate the Session report. Not overlaid on the Event log; not used to skip/filter persist; empty string when omitted. Read one JSON object from stdin. Append it as one line to `{projectRoot}/temp/audit/{YYYY-MM-DD}/events.jsonl`. Update `{projectRoot}/temp/audit/{YYYY-MM-DD}/sessions.json` when the payload introduces a new session identifier. When a session identifier exists, also append one normalized JSON object to `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.jsonl`. After that JSONL line is in the file, write `{projectRoot}/temp/audit/{YYYY-MM-DD}/{session_id}.md` (any session-JSONL-appending ingest, including when no session-end object is present). Event log, Session index, and Session JSONL log writes run under the same `ingest.lock`. Write no stdout. Always `exitCode` 0, including when Session report generation fails. Extra tokens after `ingest` are still ingest. |
| *(omitted or other)* | `usage: cli-node ingest` on stderr, `exitCode` 1. |

**Project root** — first non-empty among `CURSOR_PROJECT_DIR`, payload `workspace_roots[0]`, payload `cwd`, process cwd. **Session identifier** — first non-empty among `session_id`, `conversation_id`, `parent_conversation_id`. Event log, Session index, and Session JSONL log writes run under `ingest.lock`. New session JSONL objects use compact header keys `harness` and `event` (F002 positionals). `session_id` is written only on the initial sessionStart object; later objects omit it (the filename stem remains the F001 identifier). New session JSONL objects may include `subagent` after the compact header on any event kind when a matching payload attribute is present (`subagent_type` / `agent_type` / `agentType` / `agentName`). When appending a Session JSONL object, ingest reads that session’s existing JSONL and sets integer `turn` to the count of prompt-kind `event` values already present (`beforeSubmitPrompt` / `userPromptSubmitted` / `UserPromptSubmit`), plus one if this object is prompt-kind; otherwise that count; 0 when none and this is not prompt-kind. Do not persist `turn` on the Event log. The Session report is written after persist returns. Overview `session_id` is the filename stem when JSONL omits it; overview `harness` and counts/Event column use JSONL `harness` / `event`. Each per-turn table is Markdown columns Time, Event, Subagent, and Details; the Subagent cell is the bare `subagent` value when that field is present; previews truncate at 100 characters.

Harness artifact: `{repo}/.agents/hooks/index.mjs` (bun-bundled from `cli/src/index.ts`).

---

## Code organization

**Pattern**: Layer-based (entry → argv / ingest → event / project / store / yaml / report). Tests live under `cli/test/`, not colocated. Functional spawn tests live under repo-root `e2e/` and spawn `cli/src/index.ts`, not the `.mjs` artifact.

| File | Role |
| --- | --- |
| `src/index.ts` | argv, stdin, `exitCode` |
| `src/argv.ts` | parse `ingest` plus optional harness/event positionals |
| `src/ingest.ts` | parse stdin object, swallow errors |
| `src/event.ts` | session identifier, verbatim JSONL line |
| `src/project.ts` | project root, local `YYYY-MM-DD` |
| `src/store.ts` | dated folder, lock, append, session index, Session JSONL log |
| `src/yaml.ts` | normalized session JSONL record |
| `src/report.ts` | Session report from Session JSONL log |
| `src/usage.ts` | `usageMessage` |

---

> last updated: 2026-09-02T14:37:00Z
