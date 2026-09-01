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

async function spawnPromptCase(payload: Record<string, unknown>): Promise<{
  keys: string[];
  values: Record<string, string | null>;
  event: Record<string, unknown>;
  yamlStem: string;
}> {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  const sessionId = String(payload.session_id);
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

test("AC-F005.3 — present prompt YAML is F003 header then prompt", async () => {
  const payload = {
    session_id: "sess-ac-f005-3-present",
    prompt: "hello world",
    attachments: ["file.md"],
    hook_event_name: "beforeSubmitPrompt",
  };
  const got = await spawnPromptCase(payload);
  assert.equal(got.yamlStem, "sess-ac-f005-3-present");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.session_id, "sess-ac-f005-3-present");
  assert.equal(got.values.source_harness, "cursor");
  assert.equal(got.values.source_event, "beforeSubmitPrompt");
  assert.equal(got.keys.filter((key) => key === "session_id").length, 1);
  assert.equal(got.keys[4], "prompt");
  assert.equal(got.values.prompt, "hello world");
  assert.equal("attachments" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("attachments" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
});

test("AC-F005.3 — absent prompt YAML is header-only after the four fields", async () => {
  const payload = {
    session_id: "sess-ac-f005-3-absent",
    attachments: ["file.md"],
    hook_event_name: "beforeSubmitPrompt",
  };
  const got = await spawnPromptCase(payload);
  assert.equal(got.yamlStem, "sess-ac-f005-3-absent");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal(got.values.session_id, "sess-ac-f005-3-absent");
  assert.equal(got.values.source_harness, "cursor");
  assert.equal(got.values.source_event, "beforeSubmitPrompt");
  assert.equal(got.keys.filter((key) => key === "session_id").length, 1);
  assert.deepEqual(got.keys.slice(4), []);
  assert.equal("prompt" in got.values, false);
  assert.equal("attachments" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("prompt" in got.event, false);
  assert.equal("attachments" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
});
