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

function assertUnindentedHeader(document: string): ReturnType<typeof yamlMapping> {
  assert.ok(document.startsWith("---"));
  for (const line of document.split(/\r?\n/)) {
    if (line.trim() === "" || /^---[ \t]*$/.test(line)) continue;
    assert.equal(line, line.trimStart());
  }
  const mapping = yamlMapping(document);
  assert.deepEqual(mapping.keys.slice(0, 5), [
    "session_id",
    "source_harness",
    "source_event",
    "timestamp",
    "turn",
  ]);
  assert.equal("subagent" in mapping.values, false);
  assert.equal("children" in mapping.values, false);
  assert.equal("events" in mapping.values, false);
  return mapping;
}

test("AC-F003.6 — subagent event is a sibling document, not nested", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-6";
  const firstPayload = {
    hook_event_name: "sessionStart",
    session_id: sessionId,
  };
  const secondPayload = {
    hook_event_name: "subagentStart",
    parent_conversation_id: sessionId,
    subagent_type: "explore",
  };

  const first = await spawnIngest({
    stdin: JSON.stringify(firstPayload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const second = await spawnIngest({
    stdin: JSON.stringify(secondPayload),
    env,
    extraArgv: ["cursor", "subagentStart"],
  });

  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 2);
  const firstMapping = assertUnindentedHeader(documents[0] ?? "");
  const secondMapping = assertUnindentedHeader(documents[1] ?? "");
  assert.equal(firstMapping.values.session_id, sessionId);
  assert.equal(secondMapping.values.session_id, sessionId);
  assert.equal(secondMapping.values.source_event, "subagentStart");
  assert.equal(secondMapping.values.agent_type, "explore");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 2);
  assert.deepEqual(parseObject(lines[0] ?? ""), firstPayload);
  assert.deepEqual(parseObject(lines[1] ?? ""), secondPayload);
  assert.deepEqual(await readSessions(projectRoot), [sessionId]);
});
