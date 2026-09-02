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

test("AC-F007.5 — Cursor subagentStart YAML omits planted agentDisplayName", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f007-5-cursor-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStart");
  assert.equal(got.yamlText.includes("agent_display_name"), false);
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type", "task"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal(got.values.task, "review the diff");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.5 — Cursor subagentStop YAML omits planted agentDisplayName", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f007-5-cursor-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStop");
  assert.equal(got.yamlText.includes("agent_display_name"), false);
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type", "response_text"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal(got.values.response_text, "done");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.5 — Claude Code SubagentStart YAML omits planted agentDisplayName", async () => {
  const payload = {
    session_id: "sess-ac-f007-5-claude-start",
    agent_type: "explore",
    agentDisplayName: "Explore",
  };
  const got = await spawnCase({
    extraArgv: ["claude-code", "SubagentStart"],
    payload,
  });
  assert.equal(got.yamlStem, "sess-ac-f007-5-claude-start");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "claude-code");
  assert.equal(got.values.event, "SubagentStart");
  assert.equal(got.yamlText.includes("agent_display_name"), false);
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal(got.event.agentDisplayName, "Explore");
});

test("AC-F007.5 — Claude Code SubagentStop YAML omits planted agentDisplayName", async () => {
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
  assert.equal(got.yamlStem, "sess-ac-f007-5-claude-stop");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.harness, "claude-code");
  assert.equal(got.values.event, "SubagentStop");
  assert.equal(got.yamlText.includes("agent_display_name"), false);
  assert.equal("agent_display_name" in got.values, false);
  assert.deepEqual(got.keys.slice(4), ["agent_type", "response_text"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal(got.values.response_text, "done");
  assert.equal(got.event.agentDisplayName, "Explore");
});
