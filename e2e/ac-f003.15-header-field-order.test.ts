import assert from "node:assert";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
  makeFixture,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

test("AC-F003.15 — initial session-start header order is session_id, harness, event, timestamp, turn", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-15-start";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.deepEqual(mapping.keys.slice(0, 5), [
    "session_id",
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assertYamlIntegerTurn(document);
});

test("AC-F003.15 — non-session-start header order is harness, event, timestamp, turn", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-15-other";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.deepEqual(mapping.keys.slice(0, 4), [
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal("session_id" in mapping.values, false);
  assertYamlIntegerTurn(document);
});
