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
} from "./spawn.ts";

test("AC-F005.2 — ingest cursor beforeSubmitPrompt persists Event log, Session index, and YAML", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f005-2",
    prompt: "hello from f005",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
  assert.equal(parsed.prompt, "hello from f005");
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
