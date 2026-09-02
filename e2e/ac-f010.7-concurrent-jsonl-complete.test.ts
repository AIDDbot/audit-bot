import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  readSessions,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F010.7 — concurrent and repeated ingest persist complete JSONL lines", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const payloadA = {
    hook_event_name: "sessionStart",
    session_id: "concurrent-a",
  };
  const payloadB = {
    hook_event_name: "sessionEnd",
    session_id: "concurrent-b",
  };

  const first = spawnIngest({
    stdin: JSON.stringify(payloadA),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const second = spawnIngest({
    stdin: JSON.stringify(payloadB),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  const concurrent = await Promise.all([first, second]);
  assert.equal(concurrent[0]?.exitCode, 0);
  assert.equal(concurrent[1]?.exitCode, 0);
  assert.equal(concurrent[0]?.stdout, "");
  assert.equal(concurrent[1]?.stdout, "");

  const repeat = await spawnIngest({
    stdin: JSON.stringify(payloadA),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(repeat.exitCode, 0);
  assert.equal(repeat.stdout, "");

  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 3);
  const events = lines.map((line) => {
    assert.equal(line, JSON.stringify(JSON.parse(line)));
    return parseObject(line);
  });
  const ids = events.map((event) => event.session_id);
  assert.equal(ids.filter((id) => id === "concurrent-a").length, 2);
  assert.equal(ids.filter((id) => id === "concurrent-b").length, 1);

  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  const sessionIds = sessions as unknown[];
  assert.equal(sessionIds.length, 2);
  assert.equal(new Set(sessionIds).size, 2);
  assert.ok(sessionIds.includes("concurrent-a"));
  assert.ok(sessionIds.includes("concurrent-b"));
  assert.equal(sessionIds.filter((id) => id === "concurrent-a").length, 1);

  const textA = await readSessionJsonl(projectRoot, "concurrent-a");
  const textB = await readSessionJsonl(projectRoot, "concurrent-b");
  const recordsA = jsonlRecords(textA);
  const recordsB = jsonlRecords(textB);
  assert.equal(recordsA.length, 2);
  assert.equal(recordsB.length, 1);
  for (const record of [...recordsA, ...recordsB]) {
    assertJsonObject(record);
  }
  for (const line of [...textA.split("\n"), ...textB.split("\n")].filter(
    (entry) => entry.length > 0,
  )) {
    assert.equal(line, JSON.stringify(JSON.parse(line)));
    assertJsonObject(JSON.parse(line));
  }
});
