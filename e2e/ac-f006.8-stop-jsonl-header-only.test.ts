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

test("AC-F006.8 — stop JSON object starts with four-field F003 header then empty body; transcript_path omitted", async () => {
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

  const jsonlPath = sessionJsonlPath(projectRoot, payload.session_id);
  const jsonlText = await readSessionJsonl(projectRoot, payload.session_id);
  assert.equal(path.basename(jsonlPath, ".jsonl"), "sess-ac-f006-8");
  assert.equal(jsonlText.includes("transcript_path"), false);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  const keys = Object.keys(record);
  assert.deepEqual(keys.slice(0, 4), [...headerKeys]);
  assert.equal("session_id" in record, false);
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, "stop");
  assert.equal(typeof record.turn, "number");
  assert.deepEqual(keys.slice(4), []);
  assert.equal("transcript_path" in record, false);
  assert.equal("status" in record, false);
  assert.equal("loop_count" in record, false);
  assert.equal("hook_event_name" in record, false);
});
