import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

function formatLocalHms(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function unixMsAtLocal(hours: number, minutes: number, seconds: number): number {
  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date.getTime();
}

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

test("AC-F004.2 — report table rows follow YAML file order, not timestamp sort", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-2";
  const startMs = unixMsAtLocal(12, 0, 0);
  const promptMs = unixMsAtLocal(10, 0, 0);
  const endMs = unixMsAtLocal(11, 0, 0);
  const startTime = formatLocalHms(new Date(startMs));
  const promptTime = formatLocalHms(new Date(promptMs));
  const endTime = formatLocalHms(new Date(endMs));

  const start = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      timestamp: startMs,
    }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const prompt = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      timestamp: promptMs,
      prompt: "order-probe",
    }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  const end = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      timestamp: endMs,
      reason: "completed",
    }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(start.exitCode, 0);
  assert.equal(prompt.exitCode, 0);
  assert.equal(end.exitCode, 0);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 3);
  const mappings = documents.map((document) => yamlMapping(document));
  assert.deepEqual(
    mappings.map((mapping) => mapping.values.source_event),
    ["sessionStart", "beforeSubmitPrompt", "sessionEnd"],
  );
  assert.deepEqual(
    mappings.map((mapping) => mapping.values.timestamp),
    [startTime, promptTime, endTime],
  );
  const markdown = await readSessionReport(projectRoot, sessionId);
  const rows = eventRows(markdown);
  assert.equal(rows.length, 3);
  assert.equal(rows[0], `| ${startTime} | sessionStart |  |`);
  assert.equal(rows[1], `| ${promptTime} | beforeSubmitPrompt | prompt: order-probe |`);
  assert.equal(rows[2], `| ${endTime} | sessionEnd | reason: completed |`);
});
