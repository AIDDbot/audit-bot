import assert from "node:assert";
import { test } from "node:test";
import {
  assertYamlIntegerTurn,
  makeFixture,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlRawScalar,
} from "./spawn.ts";

const sessionId = "sess-ac-f008-3";

function assertUnquotedTurn(document: string, expected: number): void {
  const raw = assertYamlIntegerTurn(document);
  assert.equal(raw, String(expected));
  assert.equal(yamlRawScalar(document, "turn"), String(expected));
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
});
