import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

function assertObserveOnly(result: {
  exitCode: number | null;
  stdout: string;
}): void {
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stdout.includes("continue"), false);
  assert.equal(result.stdout.includes("permission"), false);
  assert.equal(result.stdout.includes("followup_message"), false);
}

test("AC-F009.5 — Cursor subagentStart stays observe-only and JSONL verbatim", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f009-5-cursor",
    subagent_type: "explore",
    agentDisplayName: "Explore",
    agentDescription: "do not map",
    agentId: "id-1",
    subagent_id: "sub-1",
    task: "review the diff",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });

  assertObserveOnly(result);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.subagent_type, "explore");
  assert.equal(event.agentDisplayName, "Explore");
  assert.equal(event.agentDescription, "do not map");
  assert.equal(event.agentId, "id-1");
  assert.equal(event.subagent_id, "sub-1");
  assert.equal(event.task, "review the diff");
  assert.equal("subagent" in event, false);
});

test("AC-F009.5 — Copilot subagentStart stays observe-only and JSONL verbatim", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f009-5-copilot",
    agentName: "explore",
    agentDisplayName: "Explore",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "subagentStart"],
  });

  assertObserveOnly(result);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.agentName, "explore");
  assert.equal(event.agentDisplayName, "Explore");
  assert.equal("subagent" in event, false);
});
