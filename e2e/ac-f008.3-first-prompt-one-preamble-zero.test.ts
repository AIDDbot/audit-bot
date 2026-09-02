import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  spawnIngest,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-3";

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

function assertNoLegacySourceKeys(record: Record<string, unknown>): void {
  assert.equal("source_event" in record, false);
  assert.equal("source_harness" in record, false);
}

test("AC-F008.3 — first prompt is turn 1; later prompts 2; preamble is 0", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const steps: { extraArgv: string[]; payload: Record<string, unknown> }[] = [
    {
      extraArgv: ["cursor", "sessionStart"],
      payload: { hook_event_name: "sessionStart", session_id: sessionId },
    },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        hook_event_name: "subagentStart",
        session_id: sessionId,
        subagent_type: "explore",
      },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: {
        hook_event_name: "beforeSubmitPrompt",
        session_id: sessionId,
        prompt: "first",
      },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: {
        hook_event_name: "beforeSubmitPrompt",
        session_id: sessionId,
        prompt: "second",
      },
    },
  ];

  for (const step of steps) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
  }

  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId)).map(
    assertJsonObject,
  );
  assert.equal(records.length, 4);
  assertJsonNumberTurn(records[0] ?? {}, 0);
  assertJsonNumberTurn(records[1] ?? {}, 0);
  assertJsonNumberTurn(records[2] ?? {}, 1);
  assertJsonNumberTurn(records[3] ?? {}, 2);

  const first = records[0] ?? {};
  assert.equal(first.session_id, sessionId);
  assert.equal(first.event, "sessionStart");
  assert.equal(first.harness, "cursor");
  assertNoLegacySourceKeys(first);

  const laterEvents = ["subagentStart", "beforeSubmitPrompt", "beforeSubmitPrompt"];
  for (const [index, expectedEvent] of laterEvents.entries()) {
    const record = records[index + 1] ?? {};
    assert.equal("session_id" in record, false);
    assert.equal(record.event, expectedEvent);
    assert.equal(record.harness, "cursor");
    assertNoLegacySourceKeys(record);
  }
});
