import assert from "node:assert";
import { access, mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolder,
  dayFolderName,
  listMdFiles,
  listYamlFiles,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  sessionReportPath,
  sessionYamlPath,
  sessionsPath,
  spawnIngest,
} from "./spawn.ts";

const payload = {
  sessionId: "copilot-sess-not-f001",
  hook_event_name: "sessionEnd",
  reason: "completed",
};

test("AC-F004.13 — Copilot sessionId alone writes no Session report on first use", async () => {
  const projectRoot = await makeFixture();

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
  assert.deepEqual(await readSessions(projectRoot), []);
  assert.deepEqual(await listYamlFiles(projectRoot), []);
  assert.deepEqual(await listMdFiles(projectRoot), []);
  await assert.rejects(access(sessionYamlPath(projectRoot, payload.sessionId)));
  await assert.rejects(access(sessionReportPath(projectRoot, payload.sessionId)));
});

test("AC-F004.13 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no report", async () => {
  const projectRoot = await makeFixture();
  const day = dayFolderName();
  await mkdir(dayFolder(projectRoot, day), { recursive: true });
  await writeFile(sessionsPath(projectRoot, day), JSON.stringify(["keep-me"]));

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot, day);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  assert.deepEqual(await readSessions(projectRoot, day), ["keep-me"]);
  assert.deepEqual(await listYamlFiles(projectRoot, day), []);
  assert.deepEqual(await listMdFiles(projectRoot, day), []);
  await assert.rejects(
    access(sessionYamlPath(projectRoot, payload.sessionId, day)),
  );
  await assert.rejects(
    access(sessionReportPath(projectRoot, payload.sessionId, day)),
  );
});
