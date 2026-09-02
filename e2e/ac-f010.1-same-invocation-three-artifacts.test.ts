import assert from "node:assert";
import { access } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  eventsPath,
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  readSessions,
  sessionJsonlPath,
  sessionsPath,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F010.1 — same invocation writes Event log, Session index, and one JSONL object line", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f010-1",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  await access(eventsPath(projectRoot));
  await access(sessionsPath(projectRoot));
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
  const jsonlPath = sessionJsonlPath(projectRoot, payload.session_id);
  await access(jsonlPath);
  assert.equal(path.basename(jsonlPath, ".jsonl"), payload.session_id);
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
  assertJsonObject(records[0]);
});
