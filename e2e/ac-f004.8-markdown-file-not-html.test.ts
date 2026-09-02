import assert from "node:assert";
import { access } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  dayFolder,
  eventsPath,
  makeFixture,
  readSessionReport,
  sessionReportPath,
  sessionYamlPath,
  spawnIngest,
} from "./spawn.ts";

test("AC-F004.8 — Session report is Markdown tables at {session_id}.md, not HTML", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-8";
  const payload = {
    session_id: sessionId,
    reason: "completed",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  const report = sessionReportPath(projectRoot, sessionId);
  await access(report);
  await access(eventsPath(projectRoot));
  await access(sessionYamlPath(projectRoot, sessionId));
  assert.equal(path.dirname(report), dayFolder(projectRoot));
  assert.equal(path.basename(report), `${sessionId}.md`);
  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("|"));
  assert.ok(markdown.includes("| Time | Event | Subagent | Details |"));
  assert.equal(markdown.includes("| Time | Event | Details |"), false);
  assert.ok(markdown.includes("| Field | Value |"));
  assert.equal(/<table/i.test(markdown), false);
  assert.equal(/<\/table>/i.test(markdown), false);
});
