import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F010.2 — each line is one JSON.parse object and appends without rewriting the first line", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f010-2";
  const firstPayload = {
    hook_event_name: "sessionStart",
    session_id: sessionId,
  };
  const secondPayload = {
    hook_event_name: "sessionEnd",
    session_id: sessionId,
    reason: "completed",
  };

  const first = await spawnIngest({
    stdin: JSON.stringify(firstPayload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  assert.equal(first.stdout, "");
  const afterFirst = await readSessionJsonl(projectRoot, sessionId);
  const firstRecords = jsonlRecords(afterFirst);
  assert.equal(firstRecords.length, 1);
  assertJsonObject(firstRecords[0]);
  const firstLine = afterFirst.split("\n").find((line) => line.length > 0) ?? "";
  assertJsonObject(JSON.parse(firstLine));
  const firstSnapshot = afterFirst;

  const second = await spawnIngest({
    stdin: JSON.stringify(secondPayload),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(second.exitCode, 0);
  assert.equal(second.stdout, "");
  const afterSecond = await readSessionJsonl(projectRoot, sessionId);
  const secondRecords = jsonlRecords(afterSecond);
  assert.equal(secondRecords.length, 2);
  for (const record of secondRecords) {
    assertJsonObject(record);
  }
  const secondLines = afterSecond.split("\n").filter((line) => line.length > 0);
  assert.equal(secondLines.length, 2);
  for (const line of secondLines) {
    assertJsonObject(JSON.parse(line));
  }
  assert.ok(afterSecond.startsWith(firstSnapshot));
});
