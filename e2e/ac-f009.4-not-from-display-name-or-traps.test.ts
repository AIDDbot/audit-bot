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
  extraArgv: string[];
  payload: Record<string, unknown>;
}): Promise<{
  keys: string[];
  values: Record<string, unknown>;
  event: Record<string, unknown>;
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
  const sessionId = String(input.payload.session_id);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  return {
    keys: Object.keys(record),
    values: record,
    event,
  };
}

test("AC-F009.4 — display name and traps do not map to subagent", async () => {
  const payload = {
    session_id: "sess-ac-f009-4-traps",
    agentDisplayName: "Explore",
    agentDescription: "do not map",
    agentId: "id-1",
    subagent_id: "sub-1",
    task: "should not map",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload,
  });
  assert.equal("subagent" in got.values, false);
  assert.deepEqual(got.keys, [...fiveKeyHeader]);
  assert.equal("agentDisplayName" in got.values, false);
  assert.equal("agent_display_name" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal("agentId" in got.values, false);
  assert.equal("subagent_id" in got.values, false);
  assert.equal("task" in got.values, false);
  assert.equal(got.values.session_id, payload.session_id);
  assert.equal(got.event.agentDisplayName, "Explore");
  assert.equal(got.event.agentDescription, "do not map");
  assert.equal(got.event.agentId, "id-1");
  assert.equal(got.event.subagent_id, "sub-1");
  assert.equal(got.event.task, "should not map");
});

test("AC-F009.4 — Copilot subagentStart subagent is from agentName not agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f009-4-copilot",
    agentName: "explore",
    agentDisplayName: "Explore",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal("session_id" in got.values, false);
  assert.equal("agent_type" in got.values, false);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal(got.values.subagent, "explore");
  assert.notEqual(got.values.subagent, "Explore");
  assert.equal(got.values.agent_display_name, "Explore");
  assert.equal(got.event.agentName, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});
