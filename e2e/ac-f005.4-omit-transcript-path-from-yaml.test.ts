import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

test("AC-F005.4 — YAML omits transcript_path for subagent start, stop, and agent stop; JSONL keeps it", async () => {
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

  const yamlText = await readSessionYaml(projectRoot, sessionId);
  assert.equal(yamlText.includes("transcript_path"), false);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 3);
  const expectedBodies = [
    ["agent_type"],
    ["agent_type", "response_text"],
    [],
  ];
  for (let i = 0; i < documents.length; i++) {
    const document = documents[i] ?? "";
    assert.ok(document.startsWith("---"));
    assert.equal(document.includes("transcript_path"), false);
    const mapping = yamlMapping(document);
    assert.deepEqual(mapping.keys.slice(0, 5), [
      "session_id",
      "source_harness",
      "source_event",
      "timestamp",
      "turn",
    ]);
    assert.deepEqual(mapping.keys.slice(5), expectedBodies[i]);
  }
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(sessionId));
});
