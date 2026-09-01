import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

async function assertHeaderOnly(input: {
  extraArgv: string[];
  sessionId: string;
  sourceHarness: string;
  sourceEvent: string;
}): Promise<void> {
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
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, input.sessionId),
  );
  assert.equal(documents.length, 1);
  assert.ok((documents[0] ?? "").startsWith("---"));
  const mapping = yamlMapping(documents[0] ?? "");
  assert.deepEqual(mapping.keys, [
    "session_id",
    "source_harness",
    "source_event",
    "timestamp",
  ]);
  assert.equal(mapping.values.session_id, input.sessionId);
  assert.equal(mapping.values.source_harness, input.sourceHarness);
  assert.equal(mapping.values.source_event, input.sourceEvent);
  assert.equal("reason" in mapping.values, false);
  assert.equal("prompt" in mapping.values, false);
  assert.equal("agent_type" in mapping.values, false);
  assert.equal("subagent_type" in mapping.values, false);
}

test("AC-F003.8 — unrecognized harness and event yield a header-only YAML document", async () => {
  await assertHeaderOnly({
    extraArgv: ["unknown-harness", "notAnEvent"],
    sessionId: "sess-ac-f003-8-unknown",
    sourceHarness: "unknown-harness",
    sourceEvent: "notAnEvent",
  });
});

test("AC-F003.8 — known harness with unrecognized event is still header-only", async () => {
  await assertHeaderOnly({
    extraArgv: ["cursor", "notAnEvent"],
    sessionId: "sess-ac-f003-8-unknown-event",
    sourceHarness: "cursor",
    sourceEvent: "notAnEvent",
  });
});
