import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolderName,
  eventsPath,
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

test("AC-F001.1 — appends exactly one JSONL line in the dated folder", async () => {
  const projectRoot = await makeFixture();
  const day = dayFolderName();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f001-1",
    composer_mode: "agent",
  };
  const stdin = JSON.stringify(payload, null, 2);
  await assert.rejects(access(eventsPath(projectRoot, day)));

  const result = await spawnIngest({
    stdin,
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot, day);
  assert.equal(lines.length, 1);
  const line = lines[0] ?? "";
  const parsed = parseObject(line);
  assert.deepEqual(parsed, payload);
  assert.equal(JSON.stringify(parsed), JSON.stringify(payload));
  assert.notEqual(line, stdin);
});
