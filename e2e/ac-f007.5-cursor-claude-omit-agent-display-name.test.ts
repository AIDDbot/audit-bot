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

test("AC-F007.5 — Cursor subagentStart JSON object omits planted agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-5-cursor-start",
    subagent_type: "explore",
    agentDisplayName: "Explore",
    task: "review the diff",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStart"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-5-cursor-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStart");
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["subagent", "task"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.task, "review the diff");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.5 — Cursor subagentStop JSON object omits planted agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-5-cursor-stop",
    subagent_type: "explore",
    agentDisplayName: "Explore",
    summary: "done",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStop"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-5-cursor-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStop");
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["subagent", "response_text"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.response_text, "done");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.5 — Claude Code SubagentStart JSON object omits planted agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-5-claude-start",
    agent_type: "explore",
    agentDisplayName: "Explore",
  };
  const got = await spawnCase({
    extraArgv: ["claude-code", "SubagentStart"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-5-claude-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "claude-code");
  assert.equal(got.values.event, "SubagentStart");
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.5 — Claude Code SubagentStop JSON object omits planted agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-5-claude-stop",
    agent_type: "explore",
    agentDisplayName: "Explore",
    last_assistant_message: "done",
  };
  const got = await spawnCase({
    extraArgv: ["claude-code", "SubagentStop"],
    payload,
  });
  assert.equal(got.jsonlStem, "sess-ac-f007-5-claude-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "claude-code");
  assert.equal(got.values.event, "SubagentStop");
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["subagent", "response_text"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.response_text, "done");
  assert.equal(got.event.agentDisplayName, "Explore");
});
