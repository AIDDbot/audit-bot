# Model schema — audit-bot

Conceptual model from current ingest.

- **Event** is the verbatim JSONL record (one hook payload per Event log line).
- **Session** is a related set of events (indexed by distinct session identifiers).
- **Session YAML log** is the per-session append-only file of normalized YAML documents (one document per Event; `{session_id}.yaml` in the daily folder). Each document includes `turn` (which conversation turn the Event belongs to; a property of the document, not a separate persisted entity).
- **Session report** is the per-session Markdown file (`{session_id}.md` in the daily folder) overwritten on every later YAML append for that session the same day. The report groups events by each document’s `turn`. Each per-turn table has Time, Event, Subagent, and Details (Subagent is optional).

---

> last updated: 2026-09-02T07:55:58Z
