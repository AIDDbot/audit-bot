import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionYaml,
  sessionReportPath,
  sessionYamlPath,
  spawnIngest,
  yamlDocuments,
} from "./spawn.ts";

async function assertPersistAndYaml(input: {
  projectRoot: string;
  payload: Record<string, unknown>;
  sessionId: string;
}): Promise<void> {
  const lines = await readLines(input.projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, input.payload);
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
  const sessions = await readSessions(input.projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(input.sessionId));
  await access(sessionYamlPath(input.projectRoot, input.sessionId));
  const documents = yamlDocuments(
    await readSessionYaml(input.projectRoot, input.sessionId),
  );
  assert.equal(documents.length, 1);
  assert.ok((documents[0] ?? "").startsWith("---"));
}

test("AC-F004.1 — ingest cursor sessionEnd writes YAML and Session report in the same invocation", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f004-1",
    reason: "completed",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  await assertPersistAndYaml({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  await access(sessionReportPath(projectRoot, payload.session_id));
});

test("AC-F004.1 — ingest claude-code SessionEnd writes YAML and Session report in the same invocation", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f004-1-claude",
    reason: "clear",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["claude-code", "SessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  await assertPersistAndYaml({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  await access(sessionReportPath(projectRoot, payload.session_id));
});

test("AC-F004.1 — sessionStart positional does not infer a Session report from payload hook_event_name", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f004-1-no-infer",
    hook_event_name: "sessionEnd",
    reason: "completed",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  await assertPersistAndYaml({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  await assert.rejects(access(sessionReportPath(projectRoot, payload.session_id)));
});
