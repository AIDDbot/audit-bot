import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  readSessions,
  sessionJsonlPath,
  sessionReportPath,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

async function assertPersistJsonlAndReport(input: {
  projectRoot: string;
  payload: Record<string, unknown>;
  sessionId: string;
}): Promise<Record<string, unknown>> {
  const lines = await readLines(input.projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, input.payload);
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
  const sessions = await readSessions(input.projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(input.sessionId));
  await access(sessionJsonlPath(input.projectRoot, input.sessionId));
  const records = jsonlRecords(
    await readSessionJsonl(input.projectRoot, input.sessionId),
  );
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  await access(sessionReportPath(input.projectRoot, input.sessionId));
  return record;
}

test("AC-F004.14 — ingest cursor sessionStart writes Session JSONL and Session report without sessionEnd", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f004-14-start",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const record = await assertPersistJsonlAndReport({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  assert.equal(record.session_id, payload.session_id);
  assert.notEqual(record.event, "sessionEnd");
  assert.notEqual(record.event, "SessionEnd");
});

test("AC-F004.14 — ingest cursor stop writes Session JSONL and Session report without sessionEnd", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f004-14-stop",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "stop"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const record = await assertPersistJsonlAndReport({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  assert.equal("session_id" in record, false);
  assert.notEqual(record.event, "sessionEnd");
  assert.notEqual(record.event, "SessionEnd");
});

test("AC-F004.14 — ingest cursor sessionEnd still writes Session JSONL and Session report", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f004-14-end",
    reason: "completed",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const record = await assertPersistJsonlAndReport({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  assert.equal("session_id" in record, false);
});
