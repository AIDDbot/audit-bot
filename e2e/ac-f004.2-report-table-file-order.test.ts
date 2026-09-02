import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  readSessionReport,
  spawnIngest,
  turnSubsection,
} from "./spawn.ts";

const TABLE_HEADER = "| Time | Event | Subagent | Details |";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

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

function unpad(cell: string): string {
  let value = cell;
  if (value.startsWith(" ")) value = value.slice(1);
  if (value.endsWith(" ")) value = value.slice(0, -1);
  return value;
}

function cells(row: string): string[] {
  assert.ok(row.startsWith("|") && row.endsWith("|"));
  const inner = row.slice(1, -1);
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\" && inner[i + 1] === "|") {
      buf += "\\|";
      i += 1;
      continue;
    }
    if (inner[i] === "|") {
      out.push(unpad(buf));
      buf = "";
      continue;
    }
    buf += inner[i];
  }
  out.push(unpad(buf));
  return out;
}

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

test("AC-F004.2 — report table rows follow Session JSONL file order, not timestamp sort", async () => {
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
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId)).map(
    assertJsonObject,
  );
  assert.equal(records.length, 3);
  assert.deepEqual(
    records.map((record) => record.event),
    ["sessionStart", "beforeSubmitPrompt", "sessionEnd"],
  );
  assert.deepEqual(
    records.map((record) => record.timestamp),
    [startTime, promptTime, endTime],
  );
  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 0"));
  assert.ok(markdown.includes("## Turn 1"));
  assert.equal(markdown.includes("## Events"), false);
  const turn0 = turnSubsection(markdown, 0);
  const turn1 = turnSubsection(markdown, 1);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  assert.match(turn1, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const turn0Rows = eventRows(turn0);
  const turn1Rows = eventRows(turn1);
  assert.equal(turn0Rows.length, 1);
  assert.equal(turn0Rows[0], `| ${startTime} | sessionStart |  |  |`);
  assert.equal(turn1Rows.length, 2);
  assert.equal(
    turn1Rows[0],
    `| ${promptTime} | beforeSubmitPrompt |  | prompt: order-probe |`,
  );
  assert.equal(
    turn1Rows[1],
    `| ${endTime} | sessionEnd |  | reason: completed |`,
  );
  for (const row of [...turn0Rows, ...turn1Rows]) {
    const parts = cells(row);
    assert.equal(parts.length, 4);
    assert.equal(parts[2], "");
  }
});
