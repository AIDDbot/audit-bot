import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

function assertCompleteDocuments(text: string, expectedCount: number): void {
  const documents = yamlDocuments(text);
  assert.equal(documents.length, expectedCount);
  for (const document of documents) {
    assert.ok(document.startsWith("---"));
    const mapping = yamlMapping(document);
    assert.deepEqual(mapping.keys.slice(0, 4), [
      "session_id",
      "source_harness",
      "source_event",
      "timestamp",
    ]);
  }
}

test("AC-F003.9 — concurrent and repeated ingest persist complete YAML documents", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const payloadA = {
    hook_event_name: "sessionStart",
    session_id: "concurrent-a",
  };
  const payloadB = {
    hook_event_name: "sessionEnd",
    session_id: "concurrent-b",
  };

  const first = spawnIngest({
    stdin: JSON.stringify(payloadA),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const second = spawnIngest({
    stdin: JSON.stringify(payloadB),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  const concurrent = await Promise.all([first, second]);
  assert.equal(concurrent[0]?.exitCode, 0);
  assert.equal(concurrent[1]?.exitCode, 0);
  assert.equal(concurrent[0]?.stdout, "");
  assert.equal(concurrent[1]?.stdout, "");

  const repeat = await spawnIngest({
    stdin: JSON.stringify(payloadA),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(repeat.exitCode, 0);
  assert.equal(repeat.stdout, "");

  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 3);
  const events = lines.map((line) => {
    assert.equal(line, JSON.stringify(JSON.parse(line)));
    return parseObject(line);
  });
  const ids = events.map((event) => event.session_id);
  assert.equal(ids.filter((id) => id === "concurrent-a").length, 2);
  assert.equal(ids.filter((id) => id === "concurrent-b").length, 1);

  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  const sessionIds = sessions as unknown[];
  assert.equal(sessionIds.length, 2);
  assert.equal(new Set(sessionIds).size, 2);
  assert.ok(sessionIds.includes("concurrent-a"));
  assert.ok(sessionIds.includes("concurrent-b"));

  assertCompleteDocuments(await readSessionYaml(projectRoot, "concurrent-a"), 2);
  assertCompleteDocuments(await readSessionYaml(projectRoot, "concurrent-b"), 1);
});
