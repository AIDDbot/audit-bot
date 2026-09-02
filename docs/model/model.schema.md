# Model schema — audit-bot

Conceptual model from current ingest.

- **Event** is the verbatim JSONL record (one hook payload per Event log line).
- **Session** is a related set of events (indexed by distinct session identifiers).
- **Session JSONL log** is the per-session append-only file of normalized JSON objects (one JSON object per line / per Event; `{session_id}.jsonl` in the daily folder). Compact header keys are `harness` and `event`. `session_id` appears on the object only for the initial session-start; the filename stem is always the F001 identifier. New objects may include `subagent` after the compact header on any event kind when a matching payload attribute is present. Each object includes `turn` (which conversation turn the Event belongs to; a property of the object, not a separate persisted entity).
- **Session report** is the per-session Markdown file (`{session_id}.md` in the daily folder) overwritten on every later Session JSONL log append for that session the same day. The report groups events by each object’s `turn`. Overview `session_id` is the F001 filename stem (JSONL may omit `session_id` on later objects); overview `harness` and counts/Event column use JSONL `harness` / `event`. Each per-turn table has Time, Event, Subagent, and Details (Subagent cell is the bare `subagent` value when that field is present).

---

> last updated: 2026-09-02T14:37:00Z
