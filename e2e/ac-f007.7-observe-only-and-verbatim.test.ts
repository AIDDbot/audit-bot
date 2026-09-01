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

test("AC-F007.7 — Copilot subagentStart with agentDisplayName stays observe-only and JSONL verbatim", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f007-7-start",
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
  assert.equal(event.agentDisplayName, "Explore");
});

test("AC-F007.7 — Copilot subagentStop with agentDisplayName stays observe-only and JSONL verbatim", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f007-7-stop",
    agentType: "explore",
    agentDisplayName: "Explore",
    response: "done",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "subagentStop"],
  });

  assertObserveOnly(result);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.agentDisplayName, "Explore");
});
