import assert from "node:assert";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
  makeFixture,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
  yamlRawScalar,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-3";

function assertUnquotedTurn(document: string, expected: number): void {
  const raw = assertYamlIntegerTurn(document);
  assert.equal(raw, String(expected));
  assert.equal(yamlRawScalar(document, "turn"), String(expected));
}

function assertNoLegacySourceKeys(document: string): void {
  const { keys } = yamlMapping(document);
  assert.equal(keys.includes("source_event"), false);
  assert.equal(keys.includes("source_harness"), false);
  assert.equal(document.includes("source_event:"), false);
  assert.equal(document.includes("source_harness:"), false);
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

  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 4);
  assertUnquotedTurn(documents[0] ?? "", 0);
  assertUnquotedTurn(documents[1] ?? "", 0);
  assertUnquotedTurn(documents[2] ?? "", 1);
  assertUnquotedTurn(documents[3] ?? "", 2);

  const first = yamlMapping(documents[0] ?? "");
  assert.equal(first.values.session_id, sessionId);
  assert.equal(first.values.event, "sessionStart");
  assert.equal(first.values.harness, "cursor");
  assert.equal(yamlRawScalar(documents[0] ?? "", "event"), "sessionStart");
  assertNoLegacySourceKeys(documents[0] ?? "");

  const laterEvents = ["subagentStart", "beforeSubmitPrompt", "beforeSubmitPrompt"];
  for (const [index, expectedEvent] of laterEvents.entries()) {
    const document = documents[index + 1] ?? "";
    const mapping = yamlMapping(document);
    assert.equal("session_id" in mapping.values, false);
    assert.equal(mapping.values.event, expectedEvent);
    assert.equal(mapping.values.harness, "cursor");
    assert.equal(yamlRawScalar(document, "event"), expectedEvent);
    assertNoLegacySourceKeys(document);
  }
});
