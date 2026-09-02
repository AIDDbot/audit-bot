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
  yamlMapping,
} from "./spawn.ts";

async function assertPersistYamlAndReport(input: {
  projectRoot: string;
  payload: Record<string, unknown>;
  sessionId: string;
}): Promise<string[]> {
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
  await access(sessionReportPath(input.projectRoot, input.sessionId));
  return documents;
}

test("AC-F004.14 — ingest cursor sessionStart writes YAML and Session report without sessionEnd", async () => {
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
  const documents = await assertPersistYamlAndReport({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  const event = yamlMapping(documents[0] ?? "").values.event;
  assert.notEqual(event, "sessionEnd");
  assert.notEqual(event, "SessionEnd");
});

test("AC-F004.14 — ingest cursor stop writes YAML and Session report without sessionEnd", async () => {
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
  const documents = await assertPersistYamlAndReport({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
  const event = yamlMapping(documents[0] ?? "").values.event;
  assert.notEqual(event, "sessionEnd");
  assert.notEqual(event, "SessionEnd");
});

test("AC-F004.14 — ingest cursor sessionEnd still writes YAML and Session report", async () => {
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
  await assertPersistYamlAndReport({
    projectRoot,
    payload,
    sessionId: payload.session_id,
  });
});
