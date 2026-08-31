import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import { eventsPath, makeFixture, spawnIngest } from "./spawn.ts";

function assertObserveOnly(result: {
  exitCode: number | null;
  stdout: string;
}): void {
  assert.equal(result.exitCode, 0);
  assert.notEqual(result.exitCode, 2);
  assert.equal(result.stdout.trim(), "");
}

test("AC-F001.4 — success exits 0 with empty stdout", async () => {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({ hook_event_name: "sessionStart" }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assertObserveOnly(result);
});

test("AC-F001.4 — non-JSON stdin exits 0 with empty stdout", async () => {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    harness: "claude",
    hint: "Stop",
    stdin: "not-json",
    env: { CLAUDE_PROJECT_DIR: projectRoot },
  });
  assertObserveOnly(result);
  await assert.rejects(access(eventsPath(projectRoot)));
});

test("AC-F001.4 — missing project root exits 0 with empty stdout", async () => {
  const result = await spawnIngest({
    harness: "cursor",
    hint: "stop",
    stdin: JSON.stringify({ hook_event_name: "stop" }),
  });
  assertObserveOnly(result);
});
