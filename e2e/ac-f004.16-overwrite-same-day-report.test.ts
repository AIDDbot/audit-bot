import assert from "node:assert";
import { test } from "node:test";
import {
  listMdFiles,
  makeFixture,
  readSessionReport,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
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

function overviewCount(markdown: string): number {
  return (markdown.match(/## Overview/g) ?? []).length;
}

test("AC-F004.16 — later same-day YAML append overwrites {session_id}.md", async () => {
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
  assert.equal(
    yamlDocuments(await readSessionYaml(projectRoot, sessionId)).length,
    1,
  );
  const firstReport = await readSessionReport(projectRoot, sessionId);
  assert.equal(eventRows(firstReport).length, 1);
  assert.equal(overviewCount(firstReport), 1);
  assert.deepEqual(await listMdFiles(projectRoot), [`${sessionId}.md`]);

  const prompt = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, prompt: "second-event" }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(prompt.exitCode, 0);
  assert.equal(prompt.stdout, "");
  assert.equal(
    yamlDocuments(await readSessionYaml(projectRoot, sessionId)).length,
    2,
  );
  const secondReport = await readSessionReport(projectRoot, sessionId);
  assert.equal(secondReport.startsWith(firstReport), false);
  assert.equal(overviewCount(secondReport), 1);
  const secondRows = eventRows(secondReport);
  assert.equal(secondRows.length, 2);
  assert.ok(secondRows[0]?.includes("sessionStart"));
  assert.ok(secondRows[1]?.includes("beforeSubmitPrompt"));
  assert.ok(secondRows[1]?.includes("second-event"));
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
  assert.equal(
    yamlDocuments(await readSessionYaml(projectRoot, sessionId)).length,
    3,
  );
  const thirdReport = await readSessionReport(projectRoot, sessionId);
  assert.equal(overviewCount(thirdReport), 1);
  const thirdRows = eventRows(thirdReport);
  assert.equal(thirdRows.length, 3);
  assert.ok(thirdRows[0]?.includes("sessionStart"));
  assert.ok(thirdRows[1]?.includes("beforeSubmitPrompt"));
  assert.ok(thirdRows[1]?.includes("second-event"));
  assert.ok(thirdRows[2]?.includes("stop"));
  assert.equal(thirdReport.includes("jsonl-only-stop"), false);
  assert.deepEqual(await listMdFiles(projectRoot), [`${sessionId}.md`]);
});
