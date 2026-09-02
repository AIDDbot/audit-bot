import assert from "node:assert";
import { readdir } from "node:fs/promises";
import { test } from "node:test";
import {
  dayFolder,
  listYamlFiles,
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-5";

const allowedNames = new Set([
  "events.jsonl",
  "sessions.json",
  `${sessionId}.yaml`,
  `${sessionId}.md`,
  "ingest.lock",
]);

test("AC-F008.5 — Event log has no turn overlay and no sidecar Turn file", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: sessionId,
    prompt: "hello",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stdout.includes("continue"), false);
  assert.equal(result.stdout.includes("permission"), false);
  assert.equal(result.stdout.includes("followup_message"), false);

  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal("turn" in parsed, false);

  const names = await readdir(dayFolder(projectRoot));
  for (const name of names) {
    assert.ok(allowedNames.has(name), `unexpected day-folder file: ${name}`);
  }
  assert.deepEqual(await listYamlFiles(projectRoot), [`${sessionId}.yaml`]);
  assert.equal(names.includes("turn"), false);
  assert.equal(names.includes("turns.json"), false);
  assert.equal(names.includes("turns.yaml"), false);
  assert.equal(names.includes(`${sessionId}.turn`), false);
});
