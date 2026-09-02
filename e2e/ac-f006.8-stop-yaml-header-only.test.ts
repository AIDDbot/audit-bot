import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
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

test("AC-F006.8 — stop YAML starts with four-field F003 header then empty body; transcript_path omitted", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f006-8",
    transcript_path: "/tmp/agent-stop.jsonl",
    status: "ok",
    loop_count: 2,
    hook_event_name: "stop",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "stop"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.transcript_path, "/tmp/agent-stop.jsonl");
  assert.equal("status" in event, true);
  assert.equal("loop_count" in event, true);
  assert.equal("hook_event_name" in event, true);
  assert.equal("turn" in event, false);

  const yamlPath = sessionYamlPath(projectRoot, payload.session_id);
  const yamlText = await readSessionYaml(projectRoot, payload.session_id);
  assert.equal(path.basename(yamlPath, ".yaml"), "sess-ac-f006-8");
  assert.equal(yamlText.includes("transcript_path"), false);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.deepEqual(mapping.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in mapping.values, false);
  assert.equal(mapping.values.harness, "cursor");
  assert.equal(mapping.values.event, "stop");
  assertYamlIntegerTurn(document);
  assert.deepEqual(mapping.keys.slice(4), []);
  assert.equal("transcript_path" in mapping.values, false);
  assert.equal("status" in mapping.values, false);
  assert.equal("loop_count" in mapping.values, false);
  assert.equal("hook_event_name" in mapping.values, false);
});
