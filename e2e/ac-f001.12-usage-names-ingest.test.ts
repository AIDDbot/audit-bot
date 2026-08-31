import assert from "node:assert";
import { test } from "node:test";
import { spawnCli } from "./spawn.ts";

test("AC-F001.12 — usage names ingest and does not name health", async () => {
  const result = await spawnCli({});
  assert.match(result.stderr, /ingest/);
  assert.doesNotMatch(result.stderr, /\bhealth\b/i);
});
