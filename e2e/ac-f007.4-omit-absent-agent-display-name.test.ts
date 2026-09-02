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

test("AC-F007.4 — Copilot subagentStart JSON object omits agent_display_name when agentDisplayName is absent", async () => {
  const payload = {
    session_id: "sess-ac-f007-4-start",
    agentName: "explore",
    agentDescription: "do not invent",
    task: "should not map",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-4-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal("agent_display_name" in got.values, false);
  assert.equal("agentDisplayName" in got.event, false);
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal(got.event.agentDescription, "do not invent");
  assert.equal(got.event.task, "should not map");
});

test("AC-F007.4 — Copilot subagentStop JSON object omits agent_display_name when agentDisplayName is absent", async () => {
  const payload = {
    session_id: "sess-ac-f007-4-stop",
    agentType: "explore",
    response: "done",
    agentDescription: "do not invent",
    task: "should not map",
    agentName: "wrong",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStop"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-4-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStop");
  assert.equal("agent_display_name" in got.values, false);
  assert.equal("agentDisplayName" in got.event, false);
  assert.deepEqual(got.keys.slice(4), ["subagent", "response_text"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.response_text, "done");
  assert.equal("task" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal("agentName" in got.values, false);
  assert.equal(got.event.agentDescription, "do not invent");
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agentName, "wrong");
});
