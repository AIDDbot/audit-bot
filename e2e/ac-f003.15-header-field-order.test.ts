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

test("AC-F003.15 — initial session-start header order is session_id, harness, event, timestamp, turn", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-15-start";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.deepEqual(Object.keys(record).slice(0, 5), [
    "session_id",
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal(typeof record.turn, "number");
});

test("AC-F003.15 — non-session-start header order is harness, event, timestamp, turn", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-15-other";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.deepEqual(Object.keys(record).slice(0, 4), [
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal("session_id" in record, false);
  assert.equal(typeof record.turn, "number");
});
