import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

const fiveKeyHeader = [
  "session_id",
  "harness",
  "event",
  "timestamp",
  "turn",
] as const;
const fourKeyHeader = ["harness", "event", "timestamp", "turn"] as const;

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function assertSnakeCaseKeys(record: Record<string, unknown>): void {
  for (const key of Object.keys(record)) {
    assert.match(key, /^[a-z][a-z0-9_]*$/);
  }
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal("hookEvent" in record, false);
}

function assertJsonNumberTurn(record: Record<string, unknown>): void {
  assert.equal(typeof record.turn, "number");
}

test("AC-F010.6 — initial Cursor sessionStart writes session_id then compact snake_case header", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f010-6-start";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  assert.equal(path.basename(jsonlPath, ".jsonl"), sessionId);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assertSnakeCaseKeys(record);
  assert.deepEqual(Object.keys(record).slice(0, 5), [...fiveKeyHeader]);
  assert.equal(record.session_id, sessionId);
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, "sessionStart");
  assertJsonNumberTurn(record);
});

test("AC-F010.6 — later event omits session_id and leaves the first line bytes unchanged", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f010-6-start";
  const first = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  assert.equal(first.stdout, "");
  const afterFirst = await readSessionJsonl(projectRoot, sessionId);
  const firstRecords = jsonlRecords(afterFirst);
  assert.equal(firstRecords.length, 1);
  assertJsonObject(firstRecords[0]);
  const firstSnapshot = afterFirst;

  const later = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(later.exitCode, 0);
  assert.equal(later.stdout, "");
  const afterSecond = await readSessionJsonl(projectRoot, sessionId);
  assert.ok(afterSecond.startsWith(firstSnapshot));
  const records = jsonlRecords(afterSecond);
  assert.equal(records.length, 2);
  const second = assertJsonObject(records[1]);
  assertSnakeCaseKeys(second);
  assert.equal("session_id" in second, false);
  assert.deepEqual(Object.keys(second).slice(0, 4), [...fourKeyHeader]);
  assert.equal(second.harness, "cursor");
  assert.equal(second.event, "sessionEnd");
  assertJsonNumberTurn(second);
});

test("AC-F010.6 — first event that is not session-start writes no session_id", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f010-6-other";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assertSnakeCaseKeys(record);
  assert.equal("session_id" in record, false);
  assert.deepEqual(Object.keys(record).slice(0, 4), [...fourKeyHeader]);
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, "sessionEnd");
  assertJsonNumberTurn(record);
});

test("AC-F010.6 — subagent is explore after the compact header when subagent_type is present", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f010-6-sub";
  const result = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      subagent_type: "explore",
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assertSnakeCaseKeys(record);
  assert.deepEqual(Object.keys(record).slice(0, 4), [...fourKeyHeader]);
  assert.equal(Object.keys(record)[4], "subagent");
  assert.equal(record.subagent, "explore");
  assert.equal("session_id" in record, false);
});

test("AC-F010.6 — present null subagent_type serializes as JSON null", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f010-6-null";
  const result = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      subagent_type: null,
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const text = await readSessionJsonl(projectRoot, sessionId);
  const records = jsonlRecords(text);
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assertSnakeCaseKeys(record);
  assert.equal("subagent" in record, true);
  assert.equal(record.subagent, null);
  assert.notEqual(record.subagent, "null");
  assert.equal(text.includes('"subagent":null') || text.includes('"subagent": null'), true);
});
