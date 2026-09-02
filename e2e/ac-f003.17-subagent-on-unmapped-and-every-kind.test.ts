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

const fourKeyHeader = ["harness", "event", "timestamp", "turn"] as const;
const fiveKeyHeader = [
  "session_id",
  "harness",
  "event",
  "timestamp",
  "turn",
] as const;

async function spawnCase(input: {
  extraArgv?: string[];
  payload: Record<string, unknown>;
}): Promise<{
  document: string;
  keys: string[];
  values: Record<string, string | null>;
}> {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    stdin: JSON.stringify(input.payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: input.extraArgv,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, input.payload);
  assert.equal("subagent" in event, false);
  const sessionId = String(input.payload.session_id);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.equal("source_harness" in mapping.values, false);
  assert.equal("source_event" in mapping.values, false);
  assert.equal("agent_type" in mapping.values, false);
  return { document, keys: mapping.keys, values: mapping.values };
}

test("AC-F003.17 — unmapped unknown event has subagent after four-key header", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "notAnEvent"],
    payload: {
      session_id: "sess-ac-f003-17-unknown",
      subagent_type: "explore",
      reason: "completed",
      prompt: "hello",
    },
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.event, "notAnEvent");
  assert.equal("session_id" in got.values, false);
  assert.equal("reason" in got.values, false);
  assert.equal("prompt" in got.values, false);
});

test("AC-F003.17 — unmapped empty extraArgv has subagent after four-key header", async () => {
  const got = await spawnCase({
    payload: {
      session_id: "sess-ac-f003-17-empty-argv",
      subagent_type: "explore",
      reason: "completed",
      prompt: "hello",
    },
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.harness, "");
  assert.equal(got.values.event, "");
  assert.equal("session_id" in got.values, false);
  assert.equal("reason" in got.values, false);
  assert.equal("prompt" in got.values, false);
});

test("AC-F003.17 — stop has subagent after four-key header though mapping omits it", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "stop"],
    payload: {
      session_id: "sess-ac-f003-17-stop",
      subagent_type: "explore",
    },
  });
  assert.deepEqual(got.keys.slice(0, 4), [...fourKeyHeader]);
  assert.equal(got.keys[4], "subagent");
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.event, "stop");
  assert.equal("session_id" in got.values, false);
});

test("AC-F003.17 — sessionStart has subagent after five-key header though mapping omits it", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload: {
      session_id: "sess-ac-f003-17-start",
      subagent_type: "explore",
    },
  });
  assert.deepEqual(got.keys.slice(0, 5), [...fiveKeyHeader]);
  assert.equal(got.keys[5], "subagent");
  assert.deepEqual(got.keys.slice(5), ["subagent"]);
  assert.equal(got.values.session_id, "sess-ac-f003-17-start");
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.event, "sessionStart");
});

test("AC-F003.17 — omit subagent when no preferred key is present", async () => {
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload: {
      session_id: "sess-ac-f003-17-omit",
    },
  });
  assert.equal(got.document.includes("subagent"), false);
  assert.deepEqual(got.keys, [...fiveKeyHeader]);
  assert.equal("subagent" in got.values, false);
  assert.equal(got.values.session_id, "sess-ac-f003-17-omit");
});
