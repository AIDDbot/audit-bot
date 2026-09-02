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

async function spawnSubagentStart(input: {
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

test("AC-F006.6 — Copilot subagentStart JSON object omits task and does not map decoys", async () => {
  const payload = {
    session_id: "sess-ac-f006-6-copilot",
    agentName: "explore",
    task: "should not map",
    agentDescription: "do not map this either",
  };
  const got = await spawnSubagentStart({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f006-6-copilot");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal("session_id" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agentDescription, "do not map this either");
});

test("AC-F006.6 — Claude Code SubagentStart JSON object omits task and does not map decoys", async () => {
  const payload = {
    session_id: "sess-ac-f006-6-claude",
    agent_type: "explore",
    task: "should not map",
    agent_id: "sa-1",
  };
  const got = await spawnSubagentStart({
    extraArgv: ["claude-code", "SubagentStart"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f006-6-claude");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "claude-code");
  assert.equal(got.values.event, "SubagentStart");
  assert.equal("session_id" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("agent_id" in got.values, false);
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agent_id, "sa-1");
});
