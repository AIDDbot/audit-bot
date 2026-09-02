import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  listMdFiles,
  makeFixture,
  readSessionJsonl,
  readSessionReport,
  spawnIngest,
  turnSubsection,
} from "./spawn.ts";

const TABLE_HEADER = "| Time | Event | Subagent | Details |";

function eventRows(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const header = lines.indexOf(TABLE_HEADER);
  assert.ok(header >= 0);
  const rows: string[] = [];
  for (let i = header + 2; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.startsWith("|")) break;
    rows.push(line);
  }
  return rows;
}

function overviewCount(markdown: string): number {
  return (markdown.match(/## Overview/g) ?? []).length;
}

async function jsonlCount(projectRoot: string, sessionId: string): Promise<number> {
  return jsonlRecords(await readSessionJsonl(projectRoot, sessionId)).length;
}

test("AC-F004.16 — later same-day Session JSONL append overwrites {session_id}.md", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-16";

  const start = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  assert.equal(await jsonlCount(projectRoot, sessionId), 1);
  const firstReport = await readSessionReport(projectRoot, sessionId);
  assert.ok(firstReport.includes(TABLE_HEADER));
  assert.equal(eventRows(turnSubsection(firstReport, 0)).length, 1);
  assert.equal(overviewCount(firstReport), 1);
  assert.deepEqual(await listMdFiles(projectRoot), [`${sessionId}.md`]);

  const prompt = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, prompt: "second-event" }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(prompt.exitCode, 0);
  assert.equal(prompt.stdout, "");
  assert.equal(await jsonlCount(projectRoot, sessionId), 2);
  const secondReport = await readSessionReport(projectRoot, sessionId);
  assert.equal(secondReport.startsWith(firstReport), false);
  assert.equal(overviewCount(secondReport), 1);
  const secondTurn0 = eventRows(turnSubsection(secondReport, 0));
  const secondTurn1 = eventRows(turnSubsection(secondReport, 1));
  assert.equal(secondTurn0.length, 1);
  assert.ok(secondTurn0[0]?.includes("sessionStart"));
  assert.equal(secondTurn1.length, 1);
  assert.ok(secondTurn1[0]?.includes("beforeSubmitPrompt"));
  assert.ok(secondTurn1[0]?.includes("second-event"));
  assert.deepEqual(await listMdFiles(projectRoot), [`${sessionId}.md`]);

  const stop = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      transcript_path: "jsonl-only-stop",
    }),
    env,
    extraArgv: ["cursor", "stop"],
  });
  assert.equal(stop.exitCode, 0);
  assert.equal(stop.stdout, "");
  assert.equal(await jsonlCount(projectRoot, sessionId), 3);
  const thirdReport = await readSessionReport(projectRoot, sessionId);
  assert.ok(thirdReport.includes(TABLE_HEADER));
  assert.equal(overviewCount(thirdReport), 1);
  const thirdTurn0 = eventRows(turnSubsection(thirdReport, 0));
  const thirdTurn1 = eventRows(turnSubsection(thirdReport, 1));
  assert.equal(thirdTurn0.length, 1);
  assert.ok(thirdTurn0[0]?.includes("sessionStart"));
  assert.equal(thirdTurn1.length, 2);
  assert.ok(thirdTurn1[0]?.includes("beforeSubmitPrompt"));
  assert.ok(thirdTurn1[0]?.includes("second-event"));
  assert.ok(thirdTurn1[1]?.includes("stop"));
  assert.equal(thirdReport.includes("jsonl-only-stop"), false);
  assert.deepEqual(await listMdFiles(projectRoot), [`${sessionId}.md`]);
});
