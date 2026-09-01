# Model schema — audit-bot

Conceptual model from current ingest.

- **Event** is the verbatim JSONL record (one hook payload per Event log line).
- **Session** is a related set of events (indexed by distinct session identifiers).
- **Session YAML log** is the per-session append-only file of normalized YAML documents (one document per Event; `{session_id}.yaml` in the daily folder).

---

> last updated: 2026-09-01T09:50:45Z
