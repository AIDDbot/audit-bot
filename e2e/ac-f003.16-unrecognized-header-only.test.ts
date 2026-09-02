import assert from "node:assert";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

async function spawnUnrecognized(input: {
  extraArgv: string[];
  sessionId: string;
}): Promise<{
  document: string;
  keys: string[];
  values: Record<string, string | null>;
}> {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: input.sessionId,
    reason: "completed",
    prompt: "hello",
    subagent_type: "explore",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: input.extraArgv,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsedLine = parseObject(lines[0] ?? "");
  assert.deepEqual(parsedLine, payload);
  assert.equal("turn" in parsedLine, false);
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, input.sessionId),
  );
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  assert.ok(document.startsWith("---"));
  const mapping = yamlMapping(document);
  assert.equal("reason" in mapping.values, false);
  assert.equal("prompt" in mapping.values, false);
  assert.equal("agent_type" in mapping.values, false);
  assert.equal("subagent_type" in mapping.values, false);
  assertYamlIntegerTurn(document);
  return { document, keys: mapping.keys, values: mapping.values };
}

test("AC-F003.16 — unrecognized harness on initial sessionStart is five-field header-only", async () => {
  const got = await spawnUnrecognized({
    extraArgv: ["unknown-harness", "sessionStart"],
    sessionId: "sess-ac-f003-16-unknown-start",
  });
  assert.deepEqual(got.keys, [
    "session_id",
    "harness",
    "event",
    "timestamp",
    "turn",
  ]);
  assert.equal(got.values.session_id, "sess-ac-f003-16-unknown-start");
  assert.equal(got.values.harness, "unknown-harness");
  assert.equal(got.values.event, "sessionStart");
});

test("AC-F003.16 — unrecognized harness and event is four-field header-only", async () => {
  const got = await spawnUnrecognized({
    extraArgv: ["unknown-harness", "notAnEvent"],
    sessionId: "sess-ac-f003-16-unknown",
  });
  assert.deepEqual(got.keys, ["harness", "event", "timestamp", "turn"]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "unknown-harness");
  assert.equal(got.values.event, "notAnEvent");
});

test("AC-F003.16 — known harness with unrecognized event is four-field header-only", async () => {
  const got = await spawnUnrecognized({
    extraArgv: ["cursor", "notAnEvent"],
    sessionId: "sess-ac-f003-16-unknown-event",
  });
  assert.deepEqual(got.keys, ["harness", "event", "timestamp", "turn"]);
  assert.equal("session_id" in got.values, false);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "notAnEvent");
});
