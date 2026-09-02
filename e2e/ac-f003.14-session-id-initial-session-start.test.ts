import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function firstLine(text: string): string {
  return text.split("\n").filter((line) => line.length > 0)[0] ?? "";
}

test("AC-F003.14 — initial Cursor sessionStart writes session_id equal to the filename stem", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-14-initial";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(result.exitCode, 0);
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  assert.equal(path.basename(jsonlPath, ".jsonl"), sessionId);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.equal(record.session_id, sessionId);
});

test("AC-F003.14 — initial Claude SessionStart alias writes session_id equal to the filename stem", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f003-14-alias";
  const result = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["claude-code", "SessionStart"],
  });
  assert.equal(result.exitCode, 0);
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  assert.equal(path.basename(jsonlPath, ".jsonl"), sessionId);
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.equal(record.session_id, sessionId);
});

test("AC-F003.14 — later events omit session_id and do not rewrite the first document", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-14-initial";
  const first = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  const afterFirst = await readSessionJsonl(projectRoot, sessionId);
  const firstRecords = jsonlRecords(afterFirst);
  assert.equal(firstRecords.length, 1);
  const firstLineSnapshot = firstLine(afterFirst);
  assert.equal(assertJsonObject(firstRecords[0]).session_id, sessionId);

  const later = [
    { extraArgv: ["cursor", "sessionEnd"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hi" },
    },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
  ];
  for (const step of later) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
  }

  const text = await readSessionJsonl(projectRoot, sessionId);
  const records = jsonlRecords(text);
  assert.equal(records.length, 4);
  assert.equal(firstLine(text), firstLineSnapshot);
  assert.equal(assertJsonObject(records[0]).session_id, sessionId);
  for (const record of records.slice(1)) {
    assert.equal("session_id" in assertJsonObject(record), false);
  }
});

test("AC-F003.14 — second sessionStart omits session_id and leaves the first document unchanged", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-14-dup";
  const payload = { session_id: sessionId };
  const first = await spawnIngest({
    stdin: JSON.stringify(payload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  const afterFirst = await readSessionJsonl(projectRoot, sessionId);
  const firstRecords = jsonlRecords(afterFirst);
  assert.equal(firstRecords.length, 1);
  const firstLineSnapshot = firstLine(afterFirst);
  assert.equal(assertJsonObject(firstRecords[0]).session_id, sessionId);

  const second = await spawnIngest({
    stdin: JSON.stringify(payload),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(second.exitCode, 0);
  const text = await readSessionJsonl(projectRoot, sessionId);
  const records = jsonlRecords(text);
  assert.equal(records.length, 2);
  assert.equal(firstLine(text), firstLineSnapshot);
  assert.equal(assertJsonObject(records[0]).session_id, sessionId);
  assert.equal("session_id" in assertJsonObject(records[1]), false);
});

test("AC-F003.14 — first event that is not session-start writes session_id on no document", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f003-14-abrupt";
  const first = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  const second = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(first.exitCode, 0);
  assert.equal(second.exitCode, 0);
  const jsonlPath = sessionJsonlPath(projectRoot, sessionId);
  assert.equal(path.basename(jsonlPath, ".jsonl"), "sess-ac-f003-14-abrupt");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 2);
  assert.equal("session_id" in assertJsonObject(records[0]), false);
  assert.equal("session_id" in assertJsonObject(records[1]), false);
});
