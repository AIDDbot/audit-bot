import assert from "node:assert";
import { access, mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolder,
  dayFolderName,
  listYamlFiles,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  sessionYamlPath,
  sessionsPath,
  spawnIngest,
} from "./spawn.ts";

const payload = {
  sessionId: "copilot-sess-not-f001",
  hook_event_name: "sessionStart",
};

test("AC-F003.7 — Copilot sessionId alone writes no YAML on first use", async () => {
  const projectRoot = await makeFixture();

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  assert.deepEqual(await readSessions(projectRoot), []);
  assert.deepEqual(await listYamlFiles(projectRoot), []);
  await assert.rejects(access(sessionYamlPath(projectRoot, payload.sessionId)));
});

test("AC-F003.7 — Copilot sessionId alone leaves a pre-seeded index unchanged and writes no YAML", async () => {
  const projectRoot = await makeFixture();
  const day = dayFolderName();
  await mkdir(dayFolder(projectRoot, day), { recursive: true });
  await writeFile(sessionsPath(projectRoot, day), JSON.stringify(["keep-me"]));

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot, day);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  assert.deepEqual(await readSessions(projectRoot, day), ["keep-me"]);
  assert.deepEqual(await listYamlFiles(projectRoot, day), []);
  await assert.rejects(access(sessionYamlPath(projectRoot, payload.sessionId, day)));
});
