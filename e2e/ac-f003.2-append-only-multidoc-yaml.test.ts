import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
} from "./spawn.ts";

test("AC-F003.2 — YAML file is append-only multi-document with --- per document", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-2";
  const firstPayload = {
    hook_event_name: "sessionStart",
    session_id: sessionId,
  };
  const secondPayload = {
    hook_event_name: "sessionEnd",
    session_id: sessionId,
    reason: "completed",
  };

  const first = await spawnIngest({
    stdin: JSON.stringify(firstPayload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  const afterFirst = await readSessionYaml(projectRoot, sessionId);
  const firstDocuments = yamlDocuments(afterFirst);
  assert.equal(firstDocuments.length, 1);
  assert.ok((firstDocuments[0] ?? "").startsWith("---"));
  const firstDocumentSnapshot = firstDocuments[0] ?? "";

  const second = await spawnIngest({
    stdin: JSON.stringify(secondPayload),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(second.exitCode, 0);
  const afterSecond = await readSessionYaml(projectRoot, sessionId);
  const secondDocuments = yamlDocuments(afterSecond);
  assert.equal(secondDocuments.length, 2);
  assert.ok((secondDocuments[0] ?? "").startsWith("---"));
  assert.ok((secondDocuments[1] ?? "").startsWith("---"));
  assert.equal(secondDocuments[0], firstDocumentSnapshot);
  assert.ok(afterSecond.includes("---"));
  assert.ok((secondDocuments[1] ?? "").includes("reason"));
});
