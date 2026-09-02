import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

const headerKeys = ["harness", "event", "timestamp", "turn"] as const;

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
  jsonlStem: string;
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
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  return {
    keys: Object.keys(record),
    values: record,
    event,
    jsonlStem: path.basename(jsonlPath, ".jsonl"),
  };
}

test("AC-F007.6 — Copilot subagentStart subagent is from agentName not agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-6-start",
    agentName: "explore",
    agentDisplayName: "Explore",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-6-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal(got.values.subagent, "explore");
  assert.notEqual(got.values.subagent, "Explore");
  assert.equal(got.values.agent_display_name, "Explore");
  assert.equal("agent_type" in got.values, false);
  assert.equal(got.event.agentName, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.6 — Copilot subagentStop subagent is from agentType not agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-6-stop",
    agentType: "explore",
    agentDisplayName: "Explore",
    response: "done",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStop"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-6-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStop");
  assert.equal(got.values.subagent, "explore");
  assert.notEqual(got.values.subagent, "Explore");
  assert.equal(got.values.agent_display_name, "Explore");
  assert.equal("agent_type" in got.values, false);
  assert.equal(got.values.response_text, "done");
  assert.equal(got.event.agentType, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});
