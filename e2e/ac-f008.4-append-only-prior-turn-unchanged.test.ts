import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-4";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function assertNoLegacySourceKeys(record: Record<string, unknown>): void {
  assert.equal("source_event" in record, false);
  assert.equal("source_harness" in record, false);
}

test("AC-F008.4 — append-only: prior documents' turn is not rewritten", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };

  const start = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      session_id: sessionId,
    }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  const afterStart = await readSessionJsonl(projectRoot, sessionId);
  const firstRecords = jsonlRecords(afterStart);
  assert.equal(firstRecords.length, 1);
  const firstSnapshot = afterStart;
  assert.equal(firstSnapshot.startsWith("---"), false);
  assert.equal(firstSnapshot.includes("source_event"), false);
  const firstLine = afterStart.split("\n").find((line) => line.length > 0) ?? "";
  assert.equal(firstLine.includes('"turn":0') || firstLine.includes('"turn": 0'), true);
  assert.equal(firstLine.includes('"turn":"0"'), false);
  const snapshotRecord = assertJsonObject(firstRecords[0]);
  assert.equal(typeof snapshotRecord.turn, "number");
  assert.equal(snapshotRecord.turn, 0);
  assert.equal(snapshotRecord.session_id, sessionId);
  assert.equal(snapshotRecord.event, "sessionStart");
  assert.equal(snapshotRecord.harness, "cursor");
  assertNoLegacySourceKeys(snapshotRecord);

  const prompt = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "beforeSubmitPrompt",
      session_id: sessionId,
      prompt: "hello",
    }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(prompt.exitCode, 0);
  assert.equal(prompt.stdout, "");

  const stop = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "stop",
      session_id: sessionId,
    }),
    env,
    extraArgv: ["cursor", "stop"],
  });
  assert.equal(stop.exitCode, 0);
  assert.equal(stop.stdout, "");

  const afterAll = await readSessionJsonl(projectRoot, sessionId);
  assert.ok(afterAll.startsWith(firstSnapshot));
  const records = jsonlRecords(afterAll);
  assert.equal(records.length, 3);
  const first = assertJsonObject(records[0]);
  const second = assertJsonObject(records[1]);
  const third = assertJsonObject(records[2]);
  assert.equal(typeof first.turn, "number");
  assert.equal(first.turn, 0);
  assert.equal(first.event, "sessionStart");
  assert.equal(first.session_id, sessionId);
  assertNoLegacySourceKeys(first);
  assert.equal("session_id" in second, false);
  assert.equal("session_id" in third, false);
  assert.equal(second.event, "beforeSubmitPrompt");
  assert.equal(third.event, "stop");
  assert.equal(typeof second.turn, "number");
  assert.equal(second.turn, 1);
  assert.equal(typeof third.turn, "number");
  assert.equal(third.turn, 1);
  assertNoLegacySourceKeys(second);
  assertNoLegacySourceKeys(third);
});
