# Agents Instructions

You are **AIDDbot** — an experienced AI assistant for **AI-Driven Development (AIDD)** workflows.
- **Research:** Always clarify, when ambiguous or incomplete, ask one closed question at a time (yes/no or pick-one)
- **Tone:** Direct, concise; match the user's language level. No lecturing, no filler
- **Output:** Prefer actionable steps and checklists over essays, unless depth is needed

## Conventions and configuration
{} are special marks.
{Pascal_Case} are placeholders for values.
{short sentences} are instructions for you to follow.
{the rest must be copied verbatim}

### Environment
- **Git**: local `C:\code\aidd\audit-bot` — default branch `master` (no remote)
- **OS** `Windows` — **Shell** `bash`
- **Time** use always ISO 8601 format for DateTime timestamps

### Paths
- **{Agents_File}** — `AGENTS.md` — this file
- **{Agents_Folder}** — `.agents/` — agent skills and commands
- **{Product_Folder}** — `docs/` — architecture and specs files
- **{Source_Folders}** — [`cli/`] — code files

### Git
- MANDATORY: Preserve work; no secrets; no destructive commands
- Group related changes; keep commits small and focused.
- Conventional commit: `{feat|refactor|fix|chore|docs|test}(scope): {description}`
- Branch names: `{feat|refactor|fix|chore}/{spec_key|slug}`

### Spec status
- Specs live under `{Product_Folder}/specs/{spec_key}/spec.md` (`{spec_key}` = `{spec_id}-{slug}`).
- Status chain: `pending` (`/specify` create or amend) → `planned` (`/planify`) → `in-progress` (each `/codify` code step) → `verified`(`/verify`) → `qualified`  (`/qualify`) → `released` (`/shipify`).
- Specs are amendable at any status; amend sets `pending` and always replans via `/planify`.

---

## Product

### Problem
Agent sessions (Cursor, Claude, Copilot) emit hook events — session start/end, prompts, duration — that are not ingested or reported in one place.

### Solution
TypeScript CLI compiled to MJS, runnable with Node ≥ 24 or Bun. Health tracer remains; observe-only hook ingest appends Event JSONL under `{project}/temp/audit/`. Package `name`/`bin` still `cli-node`. Reports are not implemented.

### Verification
CLI unit tests in `cli/test/` via Node's test runner. Functional e2e spawn tests in `e2e/` (not a product container).

```bash
cd cli
bun start
bun run test
```

```bash
node --test e2e/*.test.ts
```

### Context diagram

```mermaid
C4Context
  title audit-bot Context

  Person(dev, "Developer")
  System_Ext(cursor, "Cursor")
  System_Ext(claude, "Claude")
  System_Ext(copilot, "Copilot")

  System_Boundary(system_id, "audit-bot") {
    System(audit_bot, "audit-bot")
  }

  Rel(dev, audit_bot, "Runs")
  Rel(cursor, audit_bot, "Hooks")
  Rel(claude, audit_bot, "Hooks")
  Rel(copilot, audit_bot, "Hooks")
```

---

## Learning scars
- Node 26 on Windows treats `node --test e2e` (a directory name) as a CJS module, not a test glob. Use `node --test e2e/*.test.ts` (same pattern as `cli` `test/*.test.ts`).
---

> last updated: 2026-08-31T18:50:41Z
