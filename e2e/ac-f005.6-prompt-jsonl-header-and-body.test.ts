import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

const headerKeys = ["harness", "event", "timestamp", "turn"] as const;

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

async function spawnPromptCase(payload: Record<string, unknown>): Promise<{
  keys: string[];
  values: Record<string, unknown>;
  event: Record<string, unknown>;
  jsonlStem: string;
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
  assert.equal("turn" in event, false);
  const sessionId = String(payload.session_id);
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  return {
    keys: Object.keys(record),
    values: record,
    event,
    jsonlStem: path.basename(jsonlPath, ".jsonl"),
  };
}

test("AC-F005.6 — present prompt JSON object is compact F003 header then prompt", async () => {
  const payload = {
    session_id: "sess-ac-f005-6-present",
    prompt: "hello world",
    attachments: ["file.md"],
    hook_event_name: "beforeSubmitPrompt",
  };
  const got = await spawnPromptCase(payload);
  assert.equal(got.jsonlStem, "sess-ac-f005-6-present");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "beforeSubmitPrompt");
  assert.equal(typeof got.values.turn, "number");
  assert.equal(got.keys[4], "prompt");
  assert.equal(got.values.prompt, "hello world");
  assert.equal("attachments" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("attachments" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
});

test("AC-F005.6 — absent prompt JSON object is header-only after the four fields", async () => {
  const payload = {
    session_id: "sess-ac-f005-6-absent",
    attachments: ["file.md"],
    hook_event_name: "beforeSubmitPrompt",
  };
  const got = await spawnPromptCase(payload);
  assert.equal(got.jsonlStem, "sess-ac-f005-6-absent");
  assert.deepEqual(got.keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "beforeSubmitPrompt");
  assert.equal(typeof got.values.turn, "number");
  assert.deepEqual(got.keys.slice(4), []);
  assert.equal("prompt" in got.values, false);
  assert.equal("attachments" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("prompt" in got.event, false);
  assert.equal("attachments" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
});
