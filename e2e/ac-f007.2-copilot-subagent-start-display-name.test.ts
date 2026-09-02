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

test("AC-F007.2 — Copilot subagentStart JSON object includes agent_display_name after subagent", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f007-2",
    agentName: "explore",
    agentDisplayName: "Explore",
    agentDescription: "do not map",
    sessionId: "copilot-wrong-id",
    task: "should not map",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "subagentStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.agentDisplayName, "Explore");
  assert.equal(event.agentName, "explore");
  assert.equal(event.agentDescription, "do not map");
  assert.equal(event.sessionId, "copilot-wrong-id");
  assert.equal(event.task, "should not map");

  const sessionId = payload.session_id;
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  const jsonlText = await readSessionJsonl(projectRoot, sessionId);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  const keys = Object.keys(record);
  assert.equal(path.basename(jsonlPath, ".jsonl"), sessionId);
  assert.deepEqual(keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in record, false);
  assert.equal(record.harness, "copilot");
  assert.equal(record.event, "subagentStart");
  assert.deepEqual(keys.slice(4), ["subagent", "agent_display_name"]);
  assert.equal(record.subagent, "explore");
  assert.equal(record.agent_display_name, "Explore");
  assert.equal("task" in record, false);
  assert.equal("agentDescription" in record, false);
  assert.equal("sessionId" in record, false);
  assert.equal("agent_type" in record, false);
});
