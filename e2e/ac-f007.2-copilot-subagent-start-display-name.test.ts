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

test("AC-F007.2 — Copilot subagentStart YAML includes agent_display_name after agent_type", async () => {
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
  const yamlPath = sessionYamlPath(projectRoot, sessionId);
  const yamlText = await readSessionYaml(projectRoot, sessionId);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.equal(path.basename(yamlPath, ".yaml"), sessionId);
  assert.deepEqual(mapping.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in mapping.values, false);
  assert.equal(mapping.values.harness, "copilot");
  assert.equal(mapping.values.event, "subagentStart");
  assert.deepEqual(mapping.keys.slice(4), ["subagent", "agent_display_name"]);
  assert.equal(mapping.values.subagent, "explore");
  assert.equal(mapping.values.agent_display_name, "Explore");
  assert.equal("task" in mapping.values, false);
  assert.equal("agentDescription" in mapping.values, false);
  assert.equal("sessionId" in mapping.values, false);
});
