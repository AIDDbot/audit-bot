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
  "session_id",
  "source_harness",
  "source_event",
  "timestamp",
] as const;

async function spawnCase(input: {
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

test("AC-F007.6 — Copilot subagentStart agent_type is from agentName not agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-6-start",
    agentName: "explore",
    agentDisplayName: "Explore",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStart"],
    payload,
  });
  assert.equal(got.yamlStem, "sess-ac-f007-6-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.source_harness, "copilot");
  assert.equal(got.values.source_event, "subagentStart");
  assert.equal(got.values.agent_type, "explore");
  assert.notEqual(got.values.agent_type, "Explore");
  assert.equal(got.values.agent_display_name, "Explore");
  assert.equal(got.event.agentName, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.6 — Copilot subagentStop agent_type is from agentType not agentDisplayName", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f007-6-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.source_harness, "copilot");
  assert.equal(got.values.source_event, "subagentStop");
  assert.equal(got.values.agent_type, "explore");
  assert.notEqual(got.values.agent_type, "Explore");
  assert.equal(got.values.agent_display_name, "Explore");
  assert.equal(got.values.response_text, "done");
  assert.equal(got.event.agentType, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});
