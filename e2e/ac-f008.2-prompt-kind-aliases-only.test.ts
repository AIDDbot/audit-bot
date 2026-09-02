import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-2";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function assertJsonNumberTurn(
  record: Record<string, unknown>,
  expected: number,
): void {
  assert.equal(typeof record.turn, "number");
  assert.notEqual(typeof record.turn, "string");
  assert.equal(record.turn, expected);
}

function assertPromptKindEvent(
  record: Record<string, unknown>,
  harness: string,
  event: string,
): void {
  assert.equal("session_id" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal("source_harness" in record, false);
  assert.equal(record.harness, harness);
  assert.equal(record.event, event);
  assert.ok(Object.keys(record).includes("event"));
  assert.ok(Object.keys(record).includes("harness"));
}

async function spawnStep(
  projectRoot: string,
  extraArgv: string[],
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  const latest = assertJsonObject(records[records.length - 1]);
  assertPromptKindEvent(latest, extraArgv[0] ?? "", extraArgv[1] ?? "");
  return latest;
}

test("AC-F008.2 — only three prompt-kind aliases increment turn", async (t) => {
  const projectRoot = await makeFixture();
  const base = { session_id: sessionId };

  await t.test("AC-F008.2 — cursor beforeSubmitPrompt is turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "beforeSubmitPrompt"], {
      ...base,
      prompt: "first",
    });
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "beforeSubmitPrompt");
  });

  await t.test("AC-F008.2 — positional stop with payload hook_event_name beforeSubmitPrompt stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "stop"], {
      ...base,
      hook_event_name: "beforeSubmitPrompt",
    });
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "stop");
    assert.notEqual(latest.event, "beforeSubmitPrompt");
  });

  await t.test("AC-F008.2 — cursor stop stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "stop"], base);
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "stop");
  });

  await t.test("AC-F008.2 — cursor subagentStop stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "subagentStop"], base);
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "subagentStop");
  });

  await t.test("AC-F008.2 — copilot agentStop stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["copilot", "agentStop"], base);
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "agentStop");
  });

  await t.test("AC-F008.2 — claude-code Stop stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["claude-code", "Stop"], base);
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "Stop");
  });

  await t.test("AC-F008.2 — claude-code SubagentStop stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["claude-code", "SubagentStop"], base);
    assertJsonNumberTurn(latest, 1);
    assert.equal(latest.event, "SubagentStop");
  });

  await t.test("AC-F008.2 — copilot userPromptSubmitted is turn 2", async () => {
    const latest = await spawnStep(projectRoot, ["copilot", "userPromptSubmitted"], {
      ...base,
      prompt: "second",
    });
    assertJsonNumberTurn(latest, 2);
    assert.equal(latest.event, "userPromptSubmitted");
  });

  await t.test("AC-F008.2 — claude-code UserPromptSubmit is turn 3", async () => {
    const latest = await spawnStep(projectRoot, ["claude-code", "UserPromptSubmit"], {
      ...base,
      prompt: "third",
    });
    assertJsonNumberTurn(latest, 3);
    assert.equal(latest.event, "UserPromptSubmit");
  });

  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 9);
  for (const value of records) {
    const record = assertJsonObject(value);
    assert.equal("session_id" in record, false);
    assert.equal("source_event" in record, false);
    assert.equal("source_harness" in record, false);
    assert.equal(typeof record.event, "string");
    assert.equal(typeof record.turn, "number");
  }
});
