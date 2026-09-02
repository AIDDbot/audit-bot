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

const sessionId = "sess-ac-f008-2";

function assertUnquotedTurn(document: string, expected: number): void {
  const raw = assertYamlIntegerTurn(document);
  assert.equal(raw, String(expected));
  assert.equal(yamlRawScalar(document, "turn"), String(expected));
}

async function spawnStep(
  projectRoot: string,
  extraArgv: string[],
  payload: Record<string, unknown>,
): Promise<string> {
  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  return documents[documents.length - 1] ?? "";
}

test("AC-F008.2 — only three prompt-kind aliases increment turn", async (t) => {
  const projectRoot = await makeFixture();
  const base = { session_id: sessionId };

  await t.test("AC-F008.2 — cursor beforeSubmitPrompt is unquoted turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "beforeSubmitPrompt"], {
      ...base,
      prompt: "first",
    });
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — positional stop with payload hook_event_name beforeSubmitPrompt stays turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "stop"], {
      ...base,
      hook_event_name: "beforeSubmitPrompt",
    });
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — cursor stop stays unquoted turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "stop"], base);
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — cursor subagentStop stays unquoted turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["cursor", "subagentStop"], base);
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — copilot agentStop stays unquoted turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["copilot", "agentStop"], base);
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — claude-code Stop stays unquoted turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["claude-code", "Stop"], base);
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — claude-code SubagentStop stays unquoted turn 1", async () => {
    const latest = await spawnStep(projectRoot, ["claude-code", "SubagentStop"], base);
    assertUnquotedTurn(latest, 1);
  });

  await t.test("AC-F008.2 — copilot userPromptSubmitted is unquoted turn 2", async () => {
    const latest = await spawnStep(projectRoot, ["copilot", "userPromptSubmitted"], {
      ...base,
      prompt: "second",
    });
    assertUnquotedTurn(latest, 2);
  });

  await t.test("AC-F008.2 — claude-code UserPromptSubmit is unquoted turn 3", async () => {
    const latest = await spawnStep(projectRoot, ["claude-code", "UserPromptSubmit"], {
      ...base,
      prompt: "third",
    });
    assertUnquotedTurn(latest, 3);
  });
});
