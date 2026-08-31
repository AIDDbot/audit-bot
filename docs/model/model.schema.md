# Model schema — audit-bot

Conceptual model from current ingest. **Event** is the only persisted record (JSONL). **Session** is not a separate file (identity lives on the payload). **Report** is unused. There is no Health entity.

## Entity-Relationship diagram

```mermaid
erDiagram
    AgentHost ||--o{ Session : "hosts"
    Session ||--o{ Event : "emits"
    Session ||--o| Report : "summarizes"
```

## Entities

- **AgentHost** — Cursor, Claude, or Copilot (the environment that fires hooks). Stored on Event as `harness`: `"cursor"` \| `"claude"` \| `"copilot"` (argv, not inferred from the payload).
- **Session** — one agent session with start, end, and duration. Not a persisted entity; identity is whatever the payload already carries (`conversation_id` / `session_id` / `sessionId`). Duration is payload `duration_ms` when the harness sends it.
- **Event** — one JSON object per line in `{projectRoot}/temp/audit/events.jsonl`. Overlay last: `{ ...omitEmpty(payload), harness, receivedAt, hookEvent }`. `receivedAt` is `Date.toISOString()` at ingest. `hookEvent` is a non-empty payload `hook_event_name` if present, else the optional argv hint. Object keys whose values omit to null/empty (`""`, `[]`, `{}`) are dropped (nested first; empty parent objects then dropped). Array elements that are objects are omitted recursively, but empty objects stay as array items. `0`, `false`, and non-empty strings stay. Overlay keys win over payload keys of the same name. Payload `hook_event_name` is kept when it still has a value after omit.
- **Report** — aggregated view of a session's events for a human or another tool (not implemented).

---

> last updated: 2026-08-31T20:15:12Z
