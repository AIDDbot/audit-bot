import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  readSessions,
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

function isPrefix(keys: string[], expected: readonly string[]): boolean {
  return (
    keys.length >= expected.length &&
    expected.every((key, index) => keys[index] === key)
  );
}

function assertCompleteRecords(text: string, expectedCount: number): Record<string, unknown>[] {
  const records = jsonlRecords(text);
  assert.equal(records.length, expectedCount);
  const objects: Record<string, unknown>[] = [];
  for (const record of records) {
    const object = assertJsonObject(record);
    assert.equal("source_harness" in object, false);
    assert.equal("source_event" in object, false);
    const keys = Object.keys(object);
    const five = isPrefix(keys, fiveKeyHeader);
    const four = isPrefix(keys, fourKeyHeader) && keys[0] !== "session_id";
    assert.ok(five || four);
    objects.push(object);
  }
  return objects;
}

test("AC-F003.9 — concurrent and repeated ingest persist complete JSONL records", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const payloadA = {
    hook_event_name: "sessionStart",
    session_id: "concurrent-a",
  };
  const payloadB = {
    hook_event_name: "sessionEnd",
    session_id: "concurrent-b",
  };

  const first = spawnIngest({
    stdin: JSON.stringify(payloadA),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const second = spawnIngest({
    stdin: JSON.stringify(payloadB),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  const concurrent = await Promise.all([first, second]);
  assert.equal(concurrent[0]?.exitCode, 0);
  assert.equal(concurrent[1]?.exitCode, 0);
  assert.equal(concurrent[0]?.stdout, "");
  assert.equal(concurrent[1]?.stdout, "");

  const repeat = await spawnIngest({
    stdin: JSON.stringify(payloadA),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(repeat.exitCode, 0);
  assert.equal(repeat.stdout, "");

  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 3);
  const events = lines.map((line) => {
    assert.equal(line, JSON.stringify(JSON.parse(line)));
    return parseObject(line);
  });
  const ids = events.map((event) => event.session_id);
  assert.equal(ids.filter((id) => id === "concurrent-a").length, 2);
  assert.equal(ids.filter((id) => id === "concurrent-b").length, 1);

  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  const sessionIds = sessions as unknown[];
  assert.equal(sessionIds.length, 2);
  assert.equal(new Set(sessionIds).size, 2);
  assert.ok(sessionIds.includes("concurrent-a"));
  assert.ok(sessionIds.includes("concurrent-b"));

  const recordsA = assertCompleteRecords(
    await readSessionJsonl(projectRoot, "concurrent-a"),
    2,
  );
  const recordsB = assertCompleteRecords(
    await readSessionJsonl(projectRoot, "concurrent-b"),
    1,
  );
  const firstA = recordsA[0] ?? {};
  const secondA = recordsA[1] ?? {};
  const onlyB = recordsB[0] ?? {};
  assert.equal("session_id" in secondA, false);
  assert.equal("session_id" in onlyB, false);
  if ("session_id" in firstA) {
    assert.equal(firstA.session_id, "concurrent-a");
  }
});
