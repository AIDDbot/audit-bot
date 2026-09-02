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

async function spawnSubagentStart(payload: Record<string, unknown>): Promise<{
  keys: string[];
  values: Record<string, string | null>;
  event: Record<string, unknown>;
  yamlText: string;
  yamlStem: string;
}> {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  const sessionId = String(payload.session_id);
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

test("AC-F006.5 — Cursor subagentStart YAML includes task after subagent when present", async () => {
  const payload = {
    session_id: "sess-ac-f006-5-present",
    subagent_type: "explore",
    task: "review the diff",
    subagent_id: "sa-1",
    hook_event_name: "subagentStart",
    transcript_path: "/tmp/sub-start.jsonl",
  };
  const got = await spawnSubagentStart(payload);
  assert.equal(got.yamlStem, "sess-ac-f006-5-present");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStart");
  assert.deepEqual(got.keys.slice(4), ["subagent", "task"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.task, "review the diff");
  assert.equal("subagent_id" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("transcript_path" in got.values, false);
  assert.equal(got.yamlText.includes("transcript_path"), false);
  assert.equal(got.event.task, "review the diff");
  assert.equal("subagent_id" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
  assert.equal("transcript_path" in got.event, true);
});

test("AC-F006.5 — Cursor subagentStart YAML omits task when absent", async () => {
  const payload = {
    session_id: "sess-ac-f006-5-absent",
    subagent_type: "explore",
    subagent_id: "sa-1",
    hook_event_name: "subagentStart",
  };
  const got = await spawnSubagentStart(payload);
  assert.equal(got.yamlStem, "sess-ac-f006-5-absent");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "subagentStart");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal("task" in got.values, false);
  assert.equal("subagent_id" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("task" in got.event, false);
  assert.equal("subagent_id" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
});
