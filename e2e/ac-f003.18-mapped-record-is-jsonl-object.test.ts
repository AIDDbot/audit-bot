import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  jsonlRecords,
  listYamlFiles,
  makeFixture,
  readSessionJsonl,
  sessionJsonlPath,
  sessionYamlPath,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F003.18 — mapped record is one JSON object in the Session JSONL log, not YAML", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-18";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  await access(sessionJsonlPath(projectRoot, sessionId));
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  assertJsonObject(records[0]);
  await assert.rejects(access(sessionYamlPath(projectRoot, sessionId)));
  assert.deepEqual(await listYamlFiles(projectRoot), []);
});
