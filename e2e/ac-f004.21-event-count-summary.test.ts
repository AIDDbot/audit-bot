import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  readSessionReport,
  spawnIngest,
} from "./spawn.ts";

function countRows(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const header = lines.indexOf("| event | count |");
  assert.ok(header >= 0);
  const rows: string[] = [];
  for (let i = header + 2; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.startsWith("|")) break;
    rows.push(line);
  }
  return rows;
}

test("AC-F004.21 — event-count summary totals JSONL records and counts each event", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-21";
  const steps: { extraArgv: string[]; payload: Record<string, unknown> }[] = [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "first" },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "second" },
    },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed" },
    },
  ];

  for (const step of steps) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
  }

  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId));
  assert.equal(records.length, 4);
  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.match(markdown, /^Total: 4$/m);
  assert.ok(markdown.includes("| event | count |"));
  assert.equal(markdown.includes("| source_event | count |"), false);
  assert.deepEqual(countRows(markdown), [
    "| sessionStart | 1 |",
    "| beforeSubmitPrompt | 2 |",
    "| sessionEnd | 1 |",
  ]);
});
