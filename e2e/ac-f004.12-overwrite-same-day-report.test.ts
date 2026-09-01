import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  spawnIngest,
} from "./spawn.ts";

function eventRows(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const header = lines.indexOf("| Time | Event | Details |");
  assert.ok(header >= 0);
  const rows: string[] = [];
  for (let i = header + 2; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.startsWith("|")) break;
    rows.push(line);
  }
  return rows;
}

test("AC-F004.12 — later same-day sessionEnd overwrites {session_id}.md", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-12";

  const start = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const firstEnd = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, reason: "first-end" }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(start.exitCode, 0);
  assert.equal(firstEnd.exitCode, 0);
  const firstReport = await readSessionReport(projectRoot, sessionId);
  const firstRows = eventRows(firstReport);
  assert.equal(firstRows.length, 2);
  assert.ok(firstReport.includes("first-end"));

  const prompt = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, prompt: "after-first-end" }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  const secondEnd = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, reason: "second-end" }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(prompt.exitCode, 0);
  assert.equal(secondEnd.exitCode, 0);

  const secondReport = await readSessionReport(projectRoot, sessionId);
  assert.equal(secondReport.startsWith(firstReport), false);
  assert.equal((secondReport.match(/## Overview/g) ?? []).length, 1);
  const secondRows = eventRows(secondReport);
  assert.equal(secondRows.length, 4);
  assert.ok(secondRows[0]?.includes("sessionStart"));
  assert.ok(secondRows[1]?.includes("sessionEnd"));
  assert.ok(secondRows[1]?.includes("first-end"));
  assert.ok(secondRows[2]?.includes("beforeSubmitPrompt"));
  assert.ok(secondRows[2]?.includes("after-first-end"));
  assert.ok(secondRows[3]?.includes("sessionEnd"));
  assert.ok(secondRows[3]?.includes("second-end"));
});
