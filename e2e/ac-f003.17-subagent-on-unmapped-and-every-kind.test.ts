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

const fourKeyHeader = ["harness", "event", "timestamp", "turn"] as const;
const fiveKeyHeader = [
  "session_id",
  "harness",
  "event",
  "timestamp",
  "turn",
] as const;

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

async function spawnCase(input: {
  extraArgv?: string[];
  payload: Record<string, unknown>;
}): Promise<{
  keys: string[];
  values: Record<string, unknown>;
}> {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    stdin: JSON.stringify(input.payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: input.extraArgv,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, input.payload);
  assert.equal("subagent" in event, false);
  const sessionId = String(input.payload.session_id);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal("agent_type" in record, false);
  return { keys: Object.keys(record), values: record };
}

test("AC-F003.17 — unmapped unknown event has subagent after four-key header", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "notAnEvent"],
    payload: {
      session_id: "sess-ac-f003-17-unknown",
      subagent_type: "explore",
      reason: "completed",
      prompt: "hello",
    },
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.event, "notAnEvent");
  assert.equal("session_id" in got.values, false);
  assert.equal("reason" in got.values, false);
  assert.equal("prompt" in got.values, false);
});

test("AC-F003.17 — unmapped empty extraArgv has subagent after four-key header", async () => {
  const got = await spawnCase({
    payload: {
      session_id: "sess-ac-f003-17-empty-argv",
      subagent_type: "explore",
      reason: "completed",
      prompt: "hello",
    },
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.harness, "");
  assert.equal(got.values.event, "");
  assert.equal("session_id" in got.values, false);
  assert.equal("reason" in got.values, false);
  assert.equal("prompt" in got.values, false);
});

test("AC-F003.17 — stop has subagent after four-key header though mapping omits it", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "stop"],
    payload: {
      session_id: "sess-ac-f003-17-stop",
      subagent_type: "explore",
    },
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.event, "stop");
  assert.equal("session_id" in got.values, false);
});

test("AC-F003.17 — sessionStart has subagent after five-key header though mapping omits it", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload: {
      session_id: "sess-ac-f003-17-start",
      subagent_type: "explore",
    },
  });
  assert.deepEqual(got.keys.slice(0, 5), [...fiveKeyHeader]);
  assert.equal(got.keys[5], "subagent");
  assert.deepEqual(got.keys.slice(5), ["subagent"]);
  assert.equal(got.values.session_id, "sess-ac-f003-17-start");
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.event, "sessionStart");
});

test("AC-F003.17 — omit subagent when no preferred key is present", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload: {
      session_id: "sess-ac-f003-17-omit",
    },
  });
  assert.equal("subagent" in got.values, false);
  assert.deepEqual(got.keys, [...fiveKeyHeader]);
  assert.equal(got.values.session_id, "sess-ac-f003-17-omit");
});
