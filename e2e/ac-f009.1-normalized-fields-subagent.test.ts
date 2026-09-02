import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  repoRoot,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

function stripTicks(cell: string): string {
  return cell.replace(/`/g, "").trim();
}

function tableRows(section: string): string[][] {
  const rows: string[][] = [];
  for (const line of section.split(/\r?\n/)) {
    if (!line.startsWith("|")) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.every((cell) => /^[-:]+$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
}

function hasNoSourceKey(cell: string): boolean {
  const value = stripTicks(cell);
  if (value === "") return true;
  if (value === "—" || value === "–" || value === "-") return true;
  if (value === "*(none)*" || value.toLowerCase() === "none") return true;
  return false;
}

function sectionByHeading(text: string, heading: string): string {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `${heading} is present`);
  const next = text.indexOf("\n## ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function assertSubagentRow(
  section: string,
  label: string,
  copilotSource: string,
): void {
  const rows = tableRows(section);
  const fieldNames = rows
    .slice(1)
    .map((row) => stripTicks(row[0] ?? ""));
  assert.equal(fieldNames.includes("agent_type"), false);
  const subagentRow = rows.find(
    (row) => stripTicks(row[0] ?? "") === "subagent",
  );
  assert.ok(subagentRow, `${label} table has a subagent row`);
  assert.equal(stripTicks(subagentRow[2] ?? ""), "subagent_type");
  assert.equal(stripTicks(subagentRow[3] ?? ""), copilotSource);
  assert.equal(stripTicks(subagentRow[4] ?? ""), "agent_type");
  assert.equal(hasNoSourceKey(subagentRow[2] ?? ""), false);
}

test("AC-F009.1 — normalized-fields.md identity row is subagent not agent_type", async () => {
  const text = await readFile(
    path.join(repoRoot, "docs", "normalized-fields.md"),
    "utf8",
  );

  assertSubagentRow(
    sectionByHeading(text, "## 3. Inicio de subagente"),
    "subagent-start",
    "agentName",
  );
  assertSubagentRow(
    sectionByHeading(text, "## 4. Fin de subagente"),
    "subagent-stop",
    "agentType",
  );
});

test("AC-F009.1 — Cursor subagentStart JSON object writes subagent not agent_type", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f009-1",
    subagent_type: "explore",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "subagentStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.deepEqual(event, payload);
  assert.equal(event.subagent_type, "explore");

  const jsonlPath = sessionJsonlPath(projectRoot, payload.session_id);
  assert.equal(path.basename(jsonlPath, ".jsonl"), payload.session_id);
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.deepEqual(Object.keys(record), [
    "harness",
    "event",
    "timestamp",
    "turn",
    "subagent",
  ]);
  assert.equal("session_id" in record, false);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal("agent_type" in record, false);
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, "subagentStart");
  assert.equal(record.subagent, "explore");
});
