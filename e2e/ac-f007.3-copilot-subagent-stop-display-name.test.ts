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

test("AC-F007.3 — Copilot subagentStop JSON object includes agent_display_name after subagent and before response_text", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f007-3",
    agentType: "explore",
    agentDisplayName: "Explore",
    response: "done",
    transcriptPath: "/tmp/t.jsonl",
    sessionId: "copilot-wrong-id",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "subagentStop"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.agentDisplayName, "Explore");
  assert.equal(event.transcriptPath, "/tmp/t.jsonl");
  assert.equal(event.sessionId, "copilot-wrong-id");

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
  assert.equal(record.event, "subagentStop");
  assert.deepEqual(keys.slice(4), [
    "subagent",
    "agent_display_name",
    "response_text",
  ]);
  assert.equal(record.subagent, "explore");
  assert.equal(record.agent_display_name, "Explore");
  assert.equal(record.response_text, "done");
  assert.equal("transcript_path" in record, false);
  assert.equal("transcriptPath" in record, false);
  assert.equal("sessionId" in record, false);
  assert.equal("agent_type" in record, false);
});
