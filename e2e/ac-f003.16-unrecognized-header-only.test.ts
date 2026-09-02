import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

async function spawnUnrecognized(input: {
  extraArgv: string[];
  sessionId: string;
}): Promise<{
  keys: string[];
  values: Record<string, unknown>;
}> {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: input.sessionId,
    reason: "completed",
    prompt: "hello",
    subagent_type: "explore",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: input.extraArgv,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsedLine = parseObject(lines[0] ?? "");
  assert.deepEqual(parsedLine, payload);
  assert.equal("turn" in parsedLine, false);
  assert.equal("subagent" in parsedLine, false);
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, input.sessionId),
  );
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  const keys = Object.keys(record);
  assert.equal("reason" in record, false);
  assert.equal("prompt" in record, false);
  assert.equal("agent_type" in record, false);
  assert.equal("subagent_type" in record, false);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal(record.subagent, "explore");
  assert.equal(typeof record.turn, "number");
  return { keys, values: record };
}

test("AC-F003.16 — unrecognized harness on initial sessionStart is five-field header then subagent", async () => {
  const got = await spawnUnrecognized({
    extraArgv: ["unknown-harness", "sessionStart"],
    sessionId: "sess-ac-f003-16-unknown-start",
  });
  assert.deepEqual(got.keys.slice(0, 5), [
    "session_id",
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal(got.keys[5], "subagent");
  assert.deepEqual(got.keys.slice(5), ["subagent"]);
  assert.equal(got.values.session_id, "sess-ac-f003-16-unknown-start");
  assert.equal(got.values.harness, "unknown-harness");
  assert.equal(got.values.event, "sessionStart");
  assert.equal(typeof got.values.turn, "number");
});

test("AC-F003.16 — unrecognized harness and event is four-field header then subagent", async () => {
  const got = await spawnUnrecognized({
    extraArgv: ["unknown-harness", "notAnEvent"],
    sessionId: "sess-ac-f003-16-unknown",
  });
  assert.deepEqual(got.keys.slice(0, 4), [
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "unknown-harness");
  assert.equal(got.values.event, "notAnEvent");
  assert.equal(typeof got.values.turn, "number");
});

test("AC-F003.16 — known harness with unrecognized event is four-field header then subagent", async () => {
  const got = await spawnUnrecognized({
    extraArgv: ["cursor", "notAnEvent"],
    sessionId: "sess-ac-f003-16-unknown-event",
  });
  assert.deepEqual(got.keys.slice(0, 4), [
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "notAnEvent");
  assert.equal(typeof got.values.turn, "number");
});
