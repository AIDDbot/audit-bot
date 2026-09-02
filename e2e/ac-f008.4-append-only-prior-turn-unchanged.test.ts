import assert from "node:assert";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
  makeFixture,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlRawScalar,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-4";

test("AC-F008.4 — append-only: prior documents' turn is not rewritten", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };

  const start = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      session_id: sessionId,
    }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  const afterStart = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(afterStart.length, 1);
  const firstDocumentSnapshot = afterStart[0] ?? "";
  assert.ok(firstDocumentSnapshot.startsWith("---"));
  assert.equal(assertYamlIntegerTurn(firstDocumentSnapshot), "0");
  assert.equal(yamlRawScalar(firstDocumentSnapshot, "turn"), "0");

  const prompt = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "beforeSubmitPrompt",
      session_id: sessionId,
      prompt: "hello",
    }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(prompt.exitCode, 0);
  assert.equal(prompt.stdout, "");

  const stop = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "stop",
      session_id: sessionId,
    }),
    env,
    extraArgv: ["cursor", "stop"],
  });
  assert.equal(stop.exitCode, 0);
  assert.equal(stop.stdout, "");

  const afterAll = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(afterAll.length, 3);
  assert.ok((afterAll[0] ?? "").startsWith("---"));
  assert.ok((afterAll[1] ?? "").startsWith("---"));
  assert.ok((afterAll[2] ?? "").startsWith("---"));
  assert.equal(afterAll[0], firstDocumentSnapshot);
  assert.equal(yamlRawScalar(afterAll[0] ?? "", "turn"), "0");
  assert.equal(assertYamlIntegerTurn(afterAll[0] ?? ""), "0");
});
