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
  yamlRawScalar,
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
  keys: string[];
  values: Record<string, string | null>;
  document: string;
  yamlText: string;
  event: Record<string, unknown>;
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
  const sessionId = String(input.payload.session_id);
  const yamlText = await readSessionYaml(projectRoot, sessionId);
  const documents = yamlDocuments(yamlText);
  assert.equal(documents.length, 1);
  const document = documents[0] ?? "";
  const mapping = yamlMapping(document);
  assert.equal("source_harness" in mapping.values, false);
  assert.equal("source_event" in mapping.values, false);
  assert.equal("agent_type" in mapping.values, false);
  return {
    keys: mapping.keys,
    values: mapping.values,
    document,
    yamlText,
    event,
  };
}

function assertHeaderThenSubagent(
  keys: string[],
  values: Record<string, string | null>,
  input: { initialStart: boolean; harness: string; event: string },
): void {
  if (input.initialStart) {
    assert.deepEqual(keys.slice(0, 5), [...fiveKeyHeader]);
    assert.equal(keys[5], "subagent");
  } else {
    assert.deepEqual(keys.slice(0, 4), [...fourKeyHeader]);
    assert.equal(keys[4], "subagent");
    assert.equal("session_id" in values, false);
  }
  assert.equal(values.harness, input.harness);
  assert.equal(values.event, input.event);
}

test("AC-F009.2 — sessionStart YAML includes subagent after the five-field header", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-start",
    subagent_type: "explore",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: true,
    harness: "cursor",
    event: "sessionStart",
  });
  assert.equal(got.values.session_id, payload.session_id);
  assert.deepEqual(got.keys.slice(5), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
});

test("AC-F009.2 — sessionEnd YAML includes subagent then reason", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-end",
    subagent_type: "explore",
    reason: "completed",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionEnd"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "sessionEnd",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent", "reason"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.reason, "completed");
});

test("AC-F009.2 — beforeSubmitPrompt YAML includes subagent then prompt", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-prompt",
    subagent_type: "explore",
    prompt: "hello",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "beforeSubmitPrompt"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "beforeSubmitPrompt",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent", "prompt"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.prompt, "hello");
});

test("AC-F009.2 — stop YAML body is subagent only", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-stop",
    subagent_type: "explore",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "stop"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "stop",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
});

test("AC-F009.2 — subagentStart YAML includes subagent then task", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-sub-start",
    subagent_type: "explore",
    task: "review the diff",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStart"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "subagentStart",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent", "task"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.task, "review the diff");
});

test("AC-F009.2 — subagentStop YAML includes subagent then response_text", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-sub-stop",
    subagent_type: "explore",
    summary: "done",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStop"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "subagentStop",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent", "response_text"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal(got.values.response_text, "done");
});

test("AC-F009.2 — unmapped empty extraArgv still includes subagent and omits traps", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-empty-argv",
    subagent_type: "explore",
    reason: "completed",
    prompt: "hello",
  };
  const got = await spawnCase({ payload });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "",
    event: "",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal("reason" in got.values, false);
  assert.equal("prompt" in got.values, false);
});

test("AC-F009.2 — unmapped unknown event still includes subagent and omits traps", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-unknown",
    subagent_type: "explore",
    reason: "completed",
    prompt: "hello",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "notAnEvent"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "notAnEvent",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, "explore");
  assert.equal("reason" in got.values, false);
  assert.equal("prompt" in got.values, false);
});

test("AC-F009.2 — sessionStart omits subagent when no preferred key is present", async () => {
  const payload = { session_id: "sess-ac-f009-2-absent" };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload,
  });
  assert.equal(got.yamlText.includes("subagent"), false);
  assert.deepEqual(got.keys, [...fiveKeyHeader]);
  assert.equal("subagent" in got.values, false);
  assert.equal(got.values.session_id, payload.session_id);
  assert.equal(got.values.harness, "cursor");
  assert.equal(got.values.event, "sessionStart");
});

test("AC-F009.2 — present null subagent_type is YAML null", async () => {
  const payload = {
    session_id: "sess-ac-f009-2-null",
    subagent_type: null,
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStart"],
    payload,
  });
  assertHeaderThenSubagent(got.keys, got.values, {
    initialStart: false,
    harness: "cursor",
    event: "subagentStart",
  });
  assert.deepEqual(got.keys.slice(4), ["subagent"]);
  assert.equal(got.values.subagent, null);
  assert.equal(yamlRawScalar(got.document, "subagent"), "null");
  assert.equal(got.event.subagent_type, null);
});
