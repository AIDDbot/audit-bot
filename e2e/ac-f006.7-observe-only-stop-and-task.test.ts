import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

function assertObserveOnly(result: {
  exitCode: number | null;
  stdout: string;
}): void {
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stdout.includes("continue"), false);
  assert.equal(result.stdout.includes("permission"), false);
  assert.equal(result.stdout.includes("followup_message"), false);
}

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F006.7 — stop ingest stays observe-only", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f006-7-stop",
    transcript_path: "/tmp/agent-stop.jsonl",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "stop"],
  });

  assertObserveOnly(result);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
  await access(sessionJsonlPath(projectRoot, payload.session_id));
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
});

test("AC-F006.7 — Cursor subagentStart with task stays observe-only", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f006-7-present",
    subagent_type: "explore",
    task: "review the diff",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });

  assertObserveOnly(result);
  const jsonlText = await readSessionJsonl(projectRoot, payload.session_id);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.deepEqual(Object.keys(record).slice(4), ["subagent", "task"]);
  assert.equal(record.task, "review the diff");
});

test("AC-F006.7 — Cursor subagentStart without task stays observe-only", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f006-7-absent",
    subagent_type: "explore",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });

  assertObserveOnly(result);
  const jsonlText = await readSessionJsonl(projectRoot, payload.session_id);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.deepEqual(Object.keys(record).slice(4), ["subagent"]);
  assert.equal("task" in record, false);
});
