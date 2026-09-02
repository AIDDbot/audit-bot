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

async function spawnSubagentStart(payload: Record<string, unknown>): Promise<{
  keys: string[];
  values: Record<string, unknown>;
  event: Record<string, unknown>;
  jsonlText: string;
  jsonlStem: string;
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
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  const jsonlText = await readSessionJsonl(projectRoot, sessionId);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  return {
    keys: Object.keys(record),
    values: record,
    event,
    jsonlText,
    jsonlStem: path.basename(jsonlPath, ".jsonl"),
  };
}

test("AC-F006.5 — Cursor subagentStart JSON object includes task after subagent when present", async () => {
  const payload = {
    session_id: "sess-ac-f006-5-present",
    subagent_type: "explore",
    task: "review the diff",
    subagent_id: "sa-1",
    hook_event_name: "subagentStart",
    transcript_path: "/tmp/sub-start.jsonl",
  };
  const got = await spawnSubagentStart(payload);
  assert.equal(got.jsonlStem, "sess-ac-f006-5-present");
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
  assert.equal(got.jsonlText.includes("transcript_path"), false);
  assert.equal(got.event.task, "review the diff");
  assert.equal("subagent_id" in got.event, true);
  assert.equal("hook_event_name" in got.event, true);
  assert.equal("transcript_path" in got.event, true);
});

test("AC-F006.5 — Cursor subagentStart JSON object omits task when absent", async () => {
  const payload = {
    session_id: "sess-ac-f006-5-absent",
    subagent_type: "explore",
    subagent_id: "sa-1",
    hook_event_name: "subagentStart",
  };
  const got = await spawnSubagentStart(payload);
  assert.equal(got.jsonlStem, "sess-ac-f006-5-absent");
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
