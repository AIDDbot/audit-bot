import assert from "node:assert";
import { test } from "node:test";
import { makeFixture, parseObject, readLines, spawnIngest } from "./spawn.ts";

test("AC-F001.9 — concurrent ingest appends two complete JSONL lines", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const first = spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      session_id: "a",
    }),
    env,
  });
  const second = spawnIngest({
    harness: "cursor",
    hint: "stop",
    stdin: JSON.stringify({
      hook_event_name: "stop",
      session_id: "b",
    }),
    env,
  });
  const results = await Promise.all([first, second]);
  assert.equal(results[0]?.exitCode, 0);
  assert.equal(results[1]?.exitCode, 0);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 2);
  const events = lines.map((line) => parseObject(line));
  const ids = events.map((event) => event.session_id).sort();
  assert.deepEqual(ids, ["a", "b"]);
});
