import assert from "node:assert";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { repoRoot } from "./spawn.ts";

const requiredEvents = [
  "sessionStart",
  "sessionEnd",
  "subagentStart",
  "subagentStop",
  "beforeSubmitPrompt",
  "stop",
] as const;

type HookEntry = { command?: unknown };

test("AC-F006.1 — Cursor hooks.json registers stop with the same node ingest shell command", async () => {
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
  assert.equal(hookKeys.length, 6);
  for (const event of requiredEvents) {
    const list = config.hooks[event];
    assert.ok(Array.isArray(list));
    assert.ok(list.length > 0);
    for (const entry of list) {
      assert.equal(
        entry.command,
        `node .agents/hooks/index.mjs ingest cursor ${event}`,
      );
      assert.equal("failClosed" in entry, false);
    }
    await assert.rejects(
      access(path.join(repoRoot, ".cursor", "hooks", `${event}.cmd`)),
    );
  }
  await assert.rejects(
    access(path.join(repoRoot, ".cursor", "hooks", "ingest.cmd")),
  );
});
