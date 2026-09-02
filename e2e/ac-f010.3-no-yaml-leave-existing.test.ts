import assert from "node:assert";
import { access, mkdir, readFile, stat, utimes, writeFile } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolder,
  dayFolderName,
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

test("AC-F010.3 — new ingest writes JSONL only and does not create YAML", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f010-3-fresh";
  const payload = {
    hook_event_name: "sessionStart",
    session_id: sessionId,
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  await access(sessionJsonlPath(projectRoot, sessionId));
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  await assert.rejects(access(sessionYamlPath(projectRoot, sessionId)));
  assert.deepEqual(await listYamlFiles(projectRoot), []);
});

test("AC-F010.3 — planted YAML is unread and unrewritten; new ingest writes JSONL only", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f010-3-planted";
  const day = dayFolderName();
  const yamlPath = sessionYamlPath(projectRoot, sessionId, day);
  const planted = "source_harness: planted\n";
  await mkdir(dayFolder(projectRoot, day), { recursive: true });
  await writeFile(yamlPath, planted, "utf8");
  const past = new Date(Date.now() - 60_000);
  await utimes(yamlPath, past, past);
  const before = await stat(yamlPath);
  const plantedBytes = await readFile(yamlPath);

  const result = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      session_id: sessionId,
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  await access(sessionJsonlPath(projectRoot, sessionId, day));
  const jsonlText = await readSessionJsonl(projectRoot, sessionId, day);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
  for (const raw of records) {
    const record = assertJsonObject(raw);
    assert.equal("source_harness" in record, false);
  }
  assert.equal(jsonlText.includes("source_harness: planted"), false);
  const afterBytes = await readFile(yamlPath);
  const after = await stat(yamlPath);
  assert.deepEqual(afterBytes, plantedBytes);
  assert.equal(after.mtimeMs, before.mtimeMs);
  assert.equal(afterBytes.toString("utf8"), planted);
  assert.deepEqual(await listYamlFiles(projectRoot, day), [`${sessionId}.yaml`]);
});
