import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  spawnIngest,
} from "./spawn.ts";

test("AC-F001.3 — Session index appends new ids and skips duplicates", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const first = { hook_event_name: "sessionStart", session_id: "a" };
  const duplicate = { hook_event_name: "sessionEnd", session_id: "a" };
  const second = { hook_event_name: "sessionStart", conversation_id: "b" };

  const firstResult = await spawnIngest({
    stdin: JSON.stringify(first),
    env,
  });
  const duplicateResult = await spawnIngest({
    stdin: JSON.stringify(duplicate),
    env,
  });
  assert.equal(firstResult.exitCode, 0);
  assert.equal(duplicateResult.exitCode, 0);
  assert.equal(firstResult.stdout, "");
  assert.equal(duplicateResult.stdout, "");
  assert.deepEqual(await readSessions(projectRoot), ["a"]);

  const secondResult = await spawnIngest({
    stdin: JSON.stringify(second),
    env,
  });
  assert.equal(secondResult.exitCode, 0);
  assert.equal(secondResult.stdout, "");
  assert.deepEqual(await readSessions(projectRoot), ["a", "b"]);

  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines.map((line) => parseObject(line)), [
    first,
    duplicate,
    second,
  ]);
});
