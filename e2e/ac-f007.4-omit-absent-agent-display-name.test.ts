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

async function spawnCase(input: {
  extraArgv: string[];
  payload: Record<string, unknown>;
}): Promise<{
  keys: string[];
  values: Record<string, string | null>;
  event: Record<string, unknown>;
  yamlText: string;
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
  const yamlText = await readSessionYaml(projectRoot, sessionId);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  return {
    keys: mapping.keys,
    values: mapping.values,
    event,
    yamlText,
    yamlStem: path.basename(yamlPath, ".yaml"),
  };
}

test("AC-F007.4 — Copilot subagentStart YAML omits agent_display_name when agentDisplayName is absent", async () => {
  const payload = {
    session_id: "sess-ac-f007-4-start",
    agentName: "explore",
    agentDescription: "do not invent",
    task: "should not map",
    agentType: "wrong",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.equal(got.yamlStem, "sess-ac-f007-4-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStart");
  assert.equal(got.yamlText.includes("agent_display_name"), false);
  assert.equal("agent_display_name" in got.values, false);
  assert.equal("agentDisplayName" in got.event, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal("agentType" in got.values, false);
  assert.equal(got.event.agentDescription, "do not invent");
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agentType, "wrong");
});

test("AC-F007.4 — Copilot subagentStop YAML omits agent_display_name when agentDisplayName is absent", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f007-4-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "copilot");
  assert.equal(got.values.event, "subagentStop");
  assert.equal(got.yamlText.includes("agent_display_name"), false);
  assert.equal("agent_display_name" in got.values, false);
  assert.equal("agentDisplayName" in got.event, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type", "response_text"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal(got.values.response_text, "done");
  assert.equal("task" in got.values, false);
  assert.equal("agentDescription" in got.values, false);
  assert.equal("agentName" in got.values, false);
  assert.equal(got.event.agentDescription, "do not invent");
  assert.equal(got.event.task, "should not map");
  assert.equal(got.event.agentName, "wrong");
});
