import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readLines,
  readSessionJsonl,
  readSessionReport,
  spawnIngest,
} from "./spawn.ts";

test("C002 — Codex lifecycle keeps raw events and normalized native correlation", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "codex-c002";
  const events = [
    ["SessionStart", { session_id: sessionId, cwd: projectRoot, source: "startup", model: "gpt-5.6", permission_mode: "workspace-write" }],
    ["UserPromptSubmit", { session_id: sessionId, cwd: projectRoot, turn_id: "turn-1", prompt: "Add Codex support" }],
    ["SubagentStart", { session_id: sessionId, cwd: projectRoot, turn_id: "turn-1", agent_id: "agent-1", agent_type: "builder" }],
    ["SubagentStop", { session_id: sessionId, cwd: projectRoot, turn_id: "turn-1", agent_id: "agent-1", agent_type: "builder", last_assistant_message: "implemented" }],
    ["Stop", { session_id: sessionId, cwd: projectRoot, turn_id: "turn-1", last_assistant_message: null }],
    ["SessionEnd", { session_id: sessionId, cwd: projectRoot, reason: "other" }],
  ] as const;

  for (const [event, payload] of events) {
    const result = await spawnIngest({
      stdin: JSON.stringify(payload),
      extraArgv: ["codex", event],
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
  }

  const raw = (await readLines(projectRoot)).map((line) => JSON.parse(line));
  assert.deepEqual(raw, events.map(([, payload]) => payload));
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId)) as Record<string, unknown>[];
  assert.deepEqual(records.map((record) => record.turn), [0, 1, 1, 1, 1, 1]);
  assert.equal(records[1]?.turn_id, "turn-1");
  assert.equal(records[2]?.subagent, "builder");
  assert.equal(records[2]?.agent_id, "agent-1");
  assert.equal(records[3]?.response_text, "implemented");
  assert.equal(records[4]?.response_text, null);
  assert.equal(records[5]?.reason, "other");
  const report = await readSessionReport(projectRoot, sessionId);
  assert.match(report, /agent_id: agent-1; response_text: implemented/);
  assert.match(report, /response_text: null/);
  assert.doesNotMatch(report, /turn_id:/);
});
