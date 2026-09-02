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

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F003.6 — subagent event is a sibling JSON object, not nested", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-6";
  const firstPayload = {
    hook_event_name: "sessionStart",
    session_id: sessionId,
  };
  const secondPayload = {
    hook_event_name: "subagentStart",
    parent_conversation_id: sessionId,
    subagent_type: "explore",
  };

  const first = await spawnIngest({
    stdin: JSON.stringify(firstPayload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const second = await spawnIngest({
    stdin: JSON.stringify(secondPayload),
    env,
    extraArgv: ["cursor", "subagentStart"],
  });

  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 2);
  const firstRecord = assertJsonObject(records[0]);
  const secondRecord = assertJsonObject(records[1]);
  assert.deepEqual(Object.keys(firstRecord).slice(0, 5), [
    "session_id",
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal(firstRecord.session_id, sessionId);
  assert.equal("children" in firstRecord, false);
  assert.equal("events" in firstRecord, false);
  for (const value of Object.values(firstRecord)) {
    assert.equal(typeof value === "object" && value !== null, false);
  }
  assert.deepEqual(Object.keys(secondRecord).slice(0, 4), [
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal("session_id" in secondRecord, false);
  assert.equal("source_harness" in secondRecord, false);
  assert.equal("source_event" in secondRecord, false);
  assert.equal(secondRecord.event, "subagentStart");
  assert.equal(secondRecord.subagent, "explore");
  assert.equal(typeof secondRecord.subagent, "string");
  assert.equal("agent_type" in secondRecord, false);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 2);
  assert.deepEqual(parseObject(lines[0] ?? ""), firstPayload);
  assert.deepEqual(parseObject(lines[1] ?? ""), secondPayload);
  assert.deepEqual(await readSessions(projectRoot), [sessionId]);
});
