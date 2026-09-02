import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  sessionYamlPath,
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
  extraArgv: string[];
  payload: Record<string, unknown>;
}): Promise<{
  projectRoot: string;
  keys: string[];
  values: Record<string, string | null>;
  line: string;
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
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  const isInitialSessionStart =
    input.extraArgv[1] === "sessionStart" ||
    input.extraArgv[1] === "SessionStart";
  if (isInitialSessionStart) {
    assert.deepEqual(mapping.keys.slice(0, 5), [...fiveKeyHeader]);
  } else {
    assert.deepEqual(mapping.keys.slice(0, 4), [...fourKeyHeader]);
  }
  assert.equal("source_harness" in mapping.values, false);
  assert.equal("source_event" in mapping.values, false);
  return {
    projectRoot,
    keys: mapping.keys,
    values: mapping.values,
    line: lines[0] ?? "",
    event,
  };
}

function bodyKeys(keys: string[]): string[] {
  return keys[0] === "session_id" ? keys.slice(5) : keys.slice(4);
}

test("AC-F003.5 — Cursor sessionEnd body is reason only", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-session-end",
    reason: "completed",
    duration_ms: 1234,
    hook_event_name: "sessionEnd",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionEnd"],
    payload,
  });
  assert.deepEqual(bodyKeys(got.keys), ["reason"]);
  assert.equal(got.values.reason, "completed");
  assert.equal("duration_ms" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
  assert.equal("session_id" in got.values, false);
});

test("AC-F003.5 — Cursor subagentStart body keys are agent_type then task", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-subagent-start",
    subagent_type: "explore",
    transcript_path: "/tmp/transcript.jsonl",
    task: "do stuff",
    subagent_id: "sa-1",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStart"],
    payload,
  });
  assert.deepEqual(bodyKeys(got.keys), ["agent_type", "task"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal(got.values.task, "do stuff");
  assert.equal("task" in got.values, true);
  assert.equal("transcript_path" in got.values, false);
  assert.equal("subagent_id" in got.values, false);
  assert.equal("subagent_type" in got.values, false);
  assert.ok(got.line.includes("transcript_path"));
  assert.equal(got.event.transcript_path, "/tmp/transcript.jsonl");
});

test("AC-F003.5 — absent sessionEnd reason is omitted from the body", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-absent-reason",
    hook_event_name: "sessionEnd",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionEnd"],
    payload,
  });
  assert.deepEqual(bodyKeys(got.keys), []);
  assert.equal("reason" in got.values, false);
});

test("AC-F003.5 — present null transcript_path is omitted from YAML", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-null-transcript",
    subagent_type: "explore",
    transcript_path: null,
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "subagentStart"],
    payload,
  });
  assert.deepEqual(bodyKeys(got.keys), ["agent_type"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal("transcript_path" in got.values, false);
  assert.ok(got.line.includes("transcript_path"));
  assert.equal(got.event.transcript_path, null);
});

test("AC-F003.5 — Cursor beforeSubmitPrompt body is prompt only", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-prompt",
    prompt: "hello world",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "beforeSubmitPrompt"],
    payload,
  });
  assert.deepEqual(bodyKeys(got.keys), ["prompt"]);
  assert.equal(got.values.prompt, "hello world");
});

test("AC-F003.5 — Copilot subagentStop maps argv fields and ignores sessionId", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-copilot-stop",
    sessionId: "copilot-wrong-id",
    agentType: "explore",
    transcriptPath: "/tmp/t.jsonl",
    response: "done",
  };
  const got = await spawnCase({
    extraArgv: ["copilot", "subagentStop"],
    payload,
  });
  assert.equal(
    path.basename(
      sessionYamlPath(got.projectRoot, String(payload.session_id)),
      ".yaml",
    ),
    "sess-ac-f003-5-copilot-stop",
  );
  assert.deepEqual(bodyKeys(got.keys), ["agent_type", "response_text"]);
  assert.equal(got.values.agent_type, "explore");
  assert.equal("transcript_path" in got.values, false);
  assert.equal(got.values.response_text, "done");
  assert.ok(got.line.includes("transcriptPath"));
  assert.equal(got.event.transcriptPath, "/tmp/t.jsonl");
  assert.equal("sessionId" in got.values, false);
  assert.equal("session_id" in got.values, false);
});

test("AC-F003.5 — Cursor sessionStart is header-only with extras omitted", async () => {
  const payload = {
    session_id: "sess-ac-f003-5-session-start",
    composer_mode: "agent",
    hook_event_name: "sessionStart",
  };
  const got = await spawnCase({
    extraArgv: ["cursor", "sessionStart"],
    payload,
  });
  assert.deepEqual(bodyKeys(got.keys), []);
  assert.equal(got.values.session_id, "sess-ac-f003-5-session-start");
  assert.equal("composer_mode" in got.values, false);
  assert.equal("hook_event_name" in got.values, false);
});
