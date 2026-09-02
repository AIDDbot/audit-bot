import assert from "node:assert";
import { appendFile, writeFile } from "node:fs/promises";
import { test } from "node:test";
import {
  eventsPath,
  makeFixture,
  readSessionReport,
  readSessionYaml,
  sessionsPath,
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

function overviewField(markdown: string, field: string): string {
  const line = markdown.split(/\r?\n/).find((row) => row.startsWith(`| ${field} |`));
  assert.ok(line);
  const parts = cells(line);
  assert.equal(parts[0], field);
  return parts[1] ?? "";
}

test("AC-F004.11 — Session report is produced from YAML, not Event log or Session index", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-11";
  const startMs = unixMsAtLocal(10, 0, 0);
  const endMs = unixMsAtLocal(11, 0, 0);

  const start = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      timestamp: startMs,
    }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  assert.equal(start.exitCode, 0);

  await appendFile(
    eventsPath(projectRoot),
    `${JSON.stringify({
      session_id: sessionId,
      prompt: "tampered-from-jsonl",
      hook_event_name: "beforeSubmitPrompt",
    })}\n`,
  );
  await writeFile(sessionsPath(projectRoot), JSON.stringify(["tampered-session"]));

  const end = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      timestamp: endMs,
      reason: "completed",
    }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(end.exitCode, 0);

  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 2);
  assert.deepEqual(
    documents.map((document) => yamlMapping(document).values.source_event),
    ["sessionStart", "sessionEnd"],
  );
  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes(TABLE_HEADER));
  const rows = eventRows(markdown);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => cells(row)[1]),
    ["sessionStart", "sessionEnd"],
  );
  assert.equal(markdown.includes("tampered-from-jsonl"), false);
  assert.equal(markdown.includes("tampered-session"), false);
  assert.match(markdown, /^Total: 2$/m);
  assert.equal(overviewField(markdown, "session_id"), sessionId);
  assert.equal(
    cells(rows[0] ?? "")[0],
    formatLocalHms(new Date(startMs)),
  );
  assert.equal(cells(rows[1] ?? "")[0], formatLocalHms(new Date(endMs)));
});
