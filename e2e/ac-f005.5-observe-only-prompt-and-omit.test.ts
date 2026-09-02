import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

function assertObserveOnly(result: { exitCode: number | null; stdout: string }): void {
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stdout.includes("continue"), false);
  assert.equal(result.stdout.includes("permission"), false);
  assert.equal(result.stdout.includes("followup_message"), false);
}

test("AC-F005.5 — beforeSubmitPrompt ingest stays observe-only", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f005-5-prompt",
    prompt: "hello from f005",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });

  assertObserveOnly(result);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
  await access(sessionJsonlPath(projectRoot, payload.session_id));
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
});

test("AC-F005.5 — transcript-omit session log stays observe-only", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f005-5-omit",
    subagent_type: "explore",
    transcript_path: "/tmp/sub-start.jsonl",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });

  assertObserveOnly(result);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const line = lines[0] ?? "";
  assert.deepEqual(parseObject(line), payload);
  assert.ok(line.includes("transcript_path"));
  const jsonlText = await readSessionJsonl(projectRoot, payload.session_id);
  assert.equal(jsonlText.includes("transcript_path"), false);
  const records = jsonlRecords(jsonlText);
  assert.equal(records.length, 1);
});
