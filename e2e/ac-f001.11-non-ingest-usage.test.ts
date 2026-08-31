import assert from "node:assert";
import { test } from "node:test";
import { spawnCli } from "./spawn.ts";

function assertNonIngestUsage(result: {
  exitCode: number | null;
  stdout: string;
  stderr: string;
}): void {
  assert.match(result.stderr, /usage/i);
  assert.equal(result.exitCode, 1);
  assert.doesNotMatch(result.stdout, /up and running/i);
}

test("AC-F001.11 — omitted argv writes usage, exits 1, no health stdout", async () => {
  const result = await spawnCli({});
  assertNonIngestUsage(result);
});

test("AC-F001.11 — health argv writes usage, exits 1, no health stdout", async () => {
  const result = await spawnCli({ extraArgs: ["health"] });
  assertNonIngestUsage(result);
});

test("AC-F001.11 — non-ingest argv writes usage, exits 1, no health stdout", async () => {
  const result = await spawnCli({ extraArgs: ["report"] });
  assertNonIngestUsage(result);
});
