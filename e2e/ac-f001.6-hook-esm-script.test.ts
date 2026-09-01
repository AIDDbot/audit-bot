import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const requiredEvents = [
  "sessionStart",
  "sessionEnd",
  "subagentStart",
  "subagentStop",
] as const;

const ingestCommand = ".cursor/hooks/ingest.cmd";

type HookEntry = { command?: unknown };

async function loadJson(rel: string): Promise<unknown> {
  return JSON.parse(await readFile(path.join(repoRoot, rel), "utf8"));
}

test("AC-F001.6 — CLI package is Node ≥ 24 ESM with no runtime deps", async () => {
  const pkg = (await loadJson(path.join("cli", "package.json"))) as {
    type?: unknown;
    dependencies?: unknown;
    engines?: { node?: unknown };
  };
  assert.equal(pkg.type, "module");
  assert.deepEqual(pkg.dependencies, {});
  assert.equal(typeof pkg.engines?.node, "string");
  assert.ok(String(pkg.engines?.node).startsWith(">=24"));
});

test("AC-F001.6 — Cursor hooks.json registers ingest for the four events", async () => {
  const config = (await loadJson(path.join(".cursor", "hooks.json"))) as {
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
      assert.equal(entry.command, ingestCommand);
      assert.equal("failClosed" in entry, false);
    }
  }
});
