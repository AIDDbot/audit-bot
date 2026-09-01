import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { repoRoot } from "./spawn.ts";

const requiredEvents = [
  "sessionStart",
  "sessionEnd",
  "subagentStart",
  "subagentStop",
] as const;

type HookEntry = { command?: unknown };

test("AC-F002.3 — each Cursor event command includes ingest cursor {event}", async () => {
  const config = JSON.parse(
    await readFile(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
  ) as {
    hooks?: Record<string, HookEntry[] | undefined>;
  };

  assert.ok(config.hooks);
  for (const event of requiredEvents) {
    const list = config.hooks[event];
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 0);
    for (const entry of list) {
      assert.ok(
        String(entry.command).includes(`ingest cursor ${event}`),
        `${event} command includes ingest cursor ${event}`,
      );
    }
  }
});
