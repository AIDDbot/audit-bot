import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  eventsPath,
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

test("AC-F001.1 — appends exactly one JSONL line", async () => {
  const projectRoot = await makeFixture();
  await assert.rejects(access(eventsPath(projectRoot)));
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      conversation_id: "c1",
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assert.equal(result.exitCode, 0);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.equal(typeof event, "object");
  assert.notEqual(event, null);
});
