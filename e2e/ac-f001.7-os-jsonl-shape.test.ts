import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  iso8601Pattern,
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

function assertFieldTypes(event: Record<string, unknown>): void {
  assert.equal(typeof event.harness, "string");
  assert.equal(typeof event.receivedAt, "string");
  assert.equal(typeof event.hookEvent, "string");
  assert.match(String(event.receivedAt), iso8601Pattern);
}

function assertKeysAreNotPaths(event: Record<string, unknown>): void {
  for (const key of Object.keys(event)) {
    assert.equal(key.includes(path.sep), false);
  }
}

test("AC-F001.7 — JSONL keys and types are OS-independent", async () => {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      cwd: projectRoot,
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assert.equal(result.exitCode, 0);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assertFieldTypes(event);
  assertKeysAreNotPaths(event);
  assert.deepEqual(new Set(Object.keys(event)), new Set([
    "harness",
    "receivedAt",
    "hookEvent",
    "hook_event_name",
    "cwd",
  ]));
  assert.equal(event.cwd, projectRoot);
});
