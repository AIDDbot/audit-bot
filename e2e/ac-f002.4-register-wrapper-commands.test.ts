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

test("AC-F002.4 — hooks.json registers each wrapper path as the command only", async () => {
  const config = JSON.parse(
    await readFile(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
  ) as {
    version?: unknown;
    failClosed?: unknown;
    hooks?: Record<string, HookEntry[] | undefined>;
  };

  assert.equal(config.version, 1);
  assert.equal("failClosed" in config, false);
  assert.ok(config.hooks);
  const hookKeys = Object.keys(config.hooks).sort();
  assert.deepEqual(hookKeys, [...requiredEvents].sort());
  assert.equal(hookKeys.length, 4);
  for (const event of requiredEvents) {
    const list = config.hooks[event];
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 0);
    for (const entry of list) {
      assert.equal(entry.command, `.cursor/hooks/${event}.cmd`);
      assert.equal(String(entry.command).includes("ingest.cmd"), false);
      assert.equal("failClosed" in entry, false);
    }
  }
});
