import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-1";
const initialHeaderKeys = [
  "session_id",
  "harness",
  "event",
  "timestamp",
  "turn",
];
const laterHeaderKeys = ["harness", "event", "timestamp", "turn"];

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function assertJsonNumberTurn(
  record: Record<string, unknown>,
  expected: number,
): void {
  assert.equal(typeof record.turn, "number");
  assert.notEqual(typeof record.turn, "string");
  assert.equal(record.turn, expected);
}

function assertNoLegacySourceKeys(record: Record<string, unknown>): void {
  assert.equal("source_event" in record, false);
  assert.equal("source_harness" in record, false);
}

function assertInitialSessionStart(record: Record<string, unknown>): void {
  const keys = Object.keys(record);
  assert.deepEqual(keys.slice(0, 5), initialHeaderKeys);
  assert.equal(keys[4], "turn");
  assert.equal(record.session_id, sessionId);
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, "sessionStart");
  assert.equal(keys.filter((key) => key === "turn").length, 1);
  assertNoLegacySourceKeys(record);
}

function assertLaterRecord(
  record: Record<string, unknown>,
  expectedEvent: string,
): void {
  const keys = Object.keys(record);
  assert.equal("session_id" in record, false);
  assert.deepEqual(keys.slice(0, 4), laterHeaderKeys);
  assert.equal(keys[3], "turn");
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, expectedEvent);
  assert.equal(keys.filter((key) => key === "turn").length, 1);
  assertNoLegacySourceKeys(record);
}

test("AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1", async () => {
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
  const afterStart = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(afterStart.length, 1);
  const startRecord = assertJsonObject(afterStart[0]);
  assertJsonNumberTurn(startRecord, 0);
  assertInitialSessionStart(startRecord);

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
  const afterPrompt = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(afterPrompt.length, 2);
  const promptRecord = assertJsonObject(afterPrompt[1]);
  assertJsonNumberTurn(promptRecord, 1);
  assertLaterRecord(promptRecord, "beforeSubmitPrompt");

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
  const afterStop = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(afterStop.length, 3);
  const first = assertJsonObject(afterStop[0]);
  const second = assertJsonObject(afterStop[1]);
  const third = assertJsonObject(afterStop[2]);
  assertJsonNumberTurn(third, 1);
  assertJsonNumberTurn(first, 0);
  assertInitialSessionStart(first);
  assertLaterRecord(second, "beforeSubmitPrompt");
  assertLaterRecord(third, "stop");
});
