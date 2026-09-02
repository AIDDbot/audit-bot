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
  assert.deepEqual(Object.keys(record).slice(0, 4), [...fourKeyHeader]);
  assert.equal("session_id" in record, false);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal("agent_type" in record, false);
  return { keys: Object.keys(record), values: record, event };
}

test("AC-F009.3 — agentType wins over agentName when both are present", async () => {
  const payload = {
    session_id: "sess-ac-f009-3-agent-type-wins",
    agentType: "from-agentType",
    agentName: "from-agentName",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStop"],
    payload,
  });
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStop");
  assert.equal(got.values.subagent, "from-agentType");
  assert.notEqual(got.values.subagent, "from-agentName");
  assert.equal(got.event.agentType, "from-agentType");
  assert.equal(got.event.agentName, "from-agentName");
});

test("AC-F009.3 — subagent_type wins over agent_type when both are present", async () => {
  const payload = {
    session_id: "sess-ac-f009-3-subagent-type-wins",
    subagent_type: "from-subagent_type",
    agent_type: "from-agent_type",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStart"],
    payload,
  });
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStart");
  assert.equal(got.values.subagent, "from-subagent_type");
  assert.notEqual(got.values.subagent, "from-agent_type");
  assert.equal(got.event.subagent_type, "from-subagent_type");
  assert.equal(got.event.agent_type, "from-agent_type");
});

test("AC-F009.3 — copilot positional still persists subagent from Cursor subagent_type", async () => {
  const payload = {
    session_id: "sess-ac-f009-3-copilot-subagent-type",
    subagent_type: "explore",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal(got.values.subagent, "explore");
  assert.equal("agentName" in got.event, false);
  assert.equal("agentType" in got.event, false);
});

test("AC-F009.3 — empty harness still persists subagent from agentName", async () => {
  const payload = {
    session_id: "sess-ac-f009-3-empty-harness",
    agentName: "explore",
  };
  const got = await spawnCase({ payload });
  assert.equal(got.values.harness, "");
  assert.equal(got.values.event, "");
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.event.agentName, "explore");
});
