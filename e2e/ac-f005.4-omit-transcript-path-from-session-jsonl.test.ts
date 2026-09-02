import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F005.4 — Session JSONL omits transcript_path for subagent start, stop, and agent stop; Event log keeps it", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f005-4";
  const steps = [
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        transcript_path: "/tmp/sub-start.jsonl",
      },
    },
    {
      extraArgv: ["cursor", "subagentStop"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        summary: "done",
        transcript_path: "/tmp/sub-stop.jsonl",
        agent_transcript_path: "/tmp/agent-sub.jsonl",
      },
    },
    {
      extraArgv: ["cursor", "stop"],
      payload: {
        session_id: sessionId,
        transcript_path: "/tmp/agent-stop.jsonl",
      },
    },
  ];

  for (const step of steps) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
  }

  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 3);
  for (let i = 0; i < steps.length; i++) {
    const line = lines[i] ?? "";
    assert.deepEqual(parseObject(line), steps[i]?.payload);
    assert.ok(line.includes("transcript_path"));
  }

  const jsonlText = await readSessionJsonl(projectRoot, sessionId);
  assert.equal(jsonlText.includes("transcript_path"), false);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 3);
  const expectedBodies = [["subagent"], ["subagent", "response_text"], []];
  for (let i = 0; i < records.length; i++) {
    const record = assertJsonObject(records[i]);
    assert.equal("transcript_path" in record, false);
    const keys = Object.keys(record);
    assert.deepEqual(keys.slice(0, 4), [
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    assert.equal("session_id" in record, false);
    assert.deepEqual(keys.slice(4), expectedBodies[i]);
  }
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(sessionId));
});
