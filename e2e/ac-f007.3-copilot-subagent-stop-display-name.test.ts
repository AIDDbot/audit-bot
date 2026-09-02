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

test("AC-F007.3 — Copilot subagentStop YAML includes agent_display_name after agent_type and before response_text", async () => {
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
  const yamlPath = sessionYamlPath(projectRoot, sessionId);
  const yamlText = await readSessionYaml(projectRoot, sessionId);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.equal(path.basename(yamlPath, ".yaml"), sessionId);
  assert.deepEqual(mapping.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in mapping.values, false);
  assert.equal(mapping.values.harness, "copilot");
  assert.equal(mapping.values.event, "subagentStop");
  assert.deepEqual(mapping.keys.slice(4), [
    "agent_type",
    "agent_display_name",
    "response_text",
  ]);
  assert.equal(mapping.values.agent_type, "explore");
  assert.equal(mapping.values.agent_display_name, "Explore");
  assert.equal(mapping.values.response_text, "done");
  assert.equal("transcript_path" in mapping.values, false);
  assert.equal("transcriptPath" in mapping.values, false);
  assert.equal("sessionId" in mapping.values, false);
  assert.equal(yamlText.includes("transcript_path"), false);
  assert.equal(yamlText.includes("transcriptPath"), false);
  assert.equal(yamlText.includes("sessionId"), false);
});
