import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionYaml,
  sessionYamlPath,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
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
  await access(sessionYamlPath(projectRoot, payload.session_id));
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, payload.session_id),
  );
  assert.equal(documents.length, 1);
  assert.ok((documents[0] ?? "").startsWith("---"));
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
  const yamlText = await readSessionYaml(projectRoot, payload.session_id);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.deepEqual(mapping.keys.slice(5), ["agent_type", "task"]);
  assert.equal(mapping.values.task, "review the diff");
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
  const yamlText = await readSessionYaml(projectRoot, payload.session_id);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.deepEqual(mapping.keys.slice(5), ["agent_type"]);
  assert.equal("task" in mapping.values, false);
});
