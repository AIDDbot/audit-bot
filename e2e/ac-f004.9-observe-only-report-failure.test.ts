import assert from "node:assert";
import { mkdir, stat } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolder,
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

test("AC-F004.9 — sessionEnd is observe-only: exit 0 and empty stdout", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-9-ok";
  const payload = {
    session_id: sessionId,
    reason: "completed",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const info = await stat(sessionReportPath(projectRoot, sessionId));
  assert.equal(info.isFile(), true);
});

test("AC-F004.9 — report write failure still persists F001 and F003 and stays observe-only", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-9-fail";
  const payload = {
    session_id: sessionId,
    reason: "completed",
  };
  await mkdir(dayFolder(projectRoot), { recursive: true });
  await mkdir(sessionReportPath(projectRoot, sessionId));

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(sessionId));
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  assert.ok((documents[0] ?? "").startsWith("---"));
  const reportInfo = await stat(sessionReportPath(projectRoot, sessionId));
  assert.equal(reportInfo.isDirectory(), true);
  const yamlInfo = await stat(sessionYamlPath(projectRoot, sessionId));
  assert.equal(yamlInfo.isFile(), true);
});
