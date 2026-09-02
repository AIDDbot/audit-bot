import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  makeFixture,
  readSessionYaml,
  sessionYamlPath,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

test("AC-F003.14 — initial Cursor sessionStart writes session_id equal to the filename stem", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-14-initial";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(result.exitCode, 0);
  const yamlPath = sessionYamlPath(projectRoot, sessionId);
  assert.equal(path.basename(yamlPath, ".yaml"), sessionId);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.equal(mapping.values.session_id, sessionId);
});

test("AC-F003.14 — initial Claude SessionStart alias writes session_id equal to the filename stem", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-14-alias";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["claude-code", "SessionStart"],
  });
  assert.equal(result.exitCode, 0);
  const yamlPath = sessionYamlPath(projectRoot, sessionId);
  assert.equal(path.basename(yamlPath, ".yaml"), sessionId);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  assert.equal(mapping.values.session_id, sessionId);
});

test("AC-F003.14 — later events omit session_id and do not rewrite the first document", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-14-initial";
  const first = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  const afterFirst = await readSessionYaml(projectRoot, sessionId);
  const firstDocuments = yamlDocuments(afterFirst);
  assert.equal(firstDocuments.length, 1);
  const firstDocumentSnapshot = firstDocuments[0] ?? "";
  assert.equal(yamlMapping(firstDocumentSnapshot).values.session_id, sessionId);

  const later = [
    { extraArgv: ["cursor", "sessionEnd"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hi" },
    },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
  ];
  for (const step of later) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
  }

  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 4);
  assert.equal(documents[0], firstDocumentSnapshot);
  assert.equal(yamlMapping(documents[0] ?? "").values.session_id, sessionId);
  for (const document of documents.slice(1)) {
    assert.equal("session_id" in yamlMapping(document).values, false);
  }
});

test("AC-F003.14 — second sessionStart omits session_id and leaves the first document unchanged", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-14-dup";
  const payload = { session_id: sessionId };
  const first = await spawnIngest({
    stdin: JSON.stringify(payload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  const afterFirst = await readSessionYaml(projectRoot, sessionId);
  const firstDocuments = yamlDocuments(afterFirst);
  assert.equal(firstDocuments.length, 1);
  const firstDocumentSnapshot = firstDocuments[0] ?? "";
  assert.equal(yamlMapping(firstDocumentSnapshot).values.session_id, sessionId);

  const second = await spawnIngest({
    stdin: JSON.stringify(payload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(second.exitCode, 0);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 2);
  assert.equal(documents[0], firstDocumentSnapshot);
  assert.equal(yamlMapping(documents[0] ?? "").values.session_id, sessionId);
  assert.equal("session_id" in yamlMapping(documents[1] ?? "").values, false);
});

test("AC-F003.14 — first event that is not session-start writes session_id on no document", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-14-abrupt";
  const first = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  const second = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  const yamlPath = sessionYamlPath(projectRoot, sessionId);
  assert.equal(path.basename(yamlPath, ".yaml"), "sess-ac-f003-14-abrupt");
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 2);
  assert.equal("session_id" in yamlMapping(documents[0] ?? "").values, false);
  assert.equal("session_id" in yamlMapping(documents[1] ?? "").values, false);
});
