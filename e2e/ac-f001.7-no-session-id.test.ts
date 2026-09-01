import assert from "node:assert";
import { mkdir, writeFile } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolder,
  dayFolderName,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  sessionsPath,
  spawnIngest,
} from "./spawn.ts";

const payload = {
  hook_event_name: "sessionStart",
  composer_mode: "agent",
};

test("AC-F001.7 — no session identifier still logs and leaves a new index empty", async () => {
  const projectRoot = await makeFixture();

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  assert.deepEqual(await readSessions(projectRoot), []);
});

test("AC-F001.7 — no session identifier leaves a pre-seeded index unchanged", async () => {
  const projectRoot = await makeFixture();
  const day = dayFolderName();
  await mkdir(dayFolder(projectRoot, day), { recursive: true });
  await writeFile(sessionsPath(projectRoot, day), JSON.stringify(["keep-me"]));

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot, day);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  assert.deepEqual(await readSessions(projectRoot, day), ["keep-me"]);
});
