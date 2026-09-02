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

const sessionId = "sess-ac-f008-1";

function assertUnquotedTurn(document: string, expected: number): void {
  const raw = assertYamlIntegerTurn(document);
  assert.equal(raw, String(expected));
  assert.equal(yamlRawScalar(document, "turn"), String(expected));
}

function assertTurnIsFifthHeaderOnly(document: string): void {
  const { keys } = yamlMapping(document);
  assert.equal(keys[4], "turn");
  assert.equal(keys.filter((key) => key === "turn").length, 1);
}

test("AC-F008.1 — sequential sessionStart, prompt, stop numbers turn 0 then 1 then 1", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };

  const start = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      session_id: sessionId,
    }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  const afterStart = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(afterStart.length, 1);
  assertUnquotedTurn(afterStart[0] ?? "", 0);
  assertTurnIsFifthHeaderOnly(afterStart[0] ?? "");

  const prompt = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "beforeSubmitPrompt",
      session_id: sessionId,
      prompt: "hello",
    }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(prompt.exitCode, 0);
  assert.equal(prompt.stdout, "");
  const afterPrompt = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(afterPrompt.length, 2);
  assertUnquotedTurn(afterPrompt[1] ?? "", 1);
  assertTurnIsFifthHeaderOnly(afterPrompt[1] ?? "");

  const stop = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "stop",
      session_id: sessionId,
    }),
    env,
    extraArgv: ["cursor", "stop"],
  });
  assert.equal(stop.exitCode, 0);
  assert.equal(stop.stdout, "");
  const afterStop = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(afterStop.length, 3);
  assertUnquotedTurn(afterStop[2] ?? "", 1);
  assertUnquotedTurn(afterStop[0] ?? "", 0);
  assertTurnIsFifthHeaderOnly(afterStop[0] ?? "");
  assertTurnIsFifthHeaderOnly(afterStop[1] ?? "");
  assertTurnIsFifthHeaderOnly(afterStop[2] ?? "");
});
