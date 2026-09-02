import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  sessionYamlPath,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

const headerKeys = [
  "harness",
  "event",
  "timestamp",
  "turn",
] as const;

async function spawnSubagentStart(input: {
  extraArgv: string[];
  payload: Record<string, unknown>;
}): Promise<{
  keys: string[];
  values: Record<string, string | null>;
  event: Record<string, unknown>;
  yamlStem: string;
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
  const yamlPath = sessionYamlPath(projectRoot, sessionId);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  return {
    keys: mapping.keys,
    values: mapping.values,
    event,
    yamlStem: path.basename(yamlPath, ".yaml"),
  };
}

test("AC-F006.6 — Copilot subagentStart YAML omits task and does not map decoys", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f006-6-copilot");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal("session_id" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agentDescription, "do not map this either");
});

test("AC-F006.6 — Claude Code SubagentStart YAML omits task and does not map decoys", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f006-6-claude");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "claude-code");
  assert.equal(got.values.event, "SubagentStart");
  assert.equal("session_id" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("agent_id" in got.values, false);
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agent_id, "sa-1");
});
