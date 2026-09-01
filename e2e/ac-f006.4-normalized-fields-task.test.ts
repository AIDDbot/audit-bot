import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { repoRoot } from "./spawn.ts";

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

test("AC-F006.4 — normalized-fields.md includes task for subagent start (Cursor only)", async () => {
  const text = await readFile(
    path.join(repoRoot, "docs", "normalized-fields.md"),
    "utf8",
  );

  const start = text.indexOf("## 3. Inicio de subagente");
  assert.ok(start >= 0, "subagent-start section is present");
  const next = text.indexOf("\n## ", start + 1);
  const section = text.slice(start, next === -1 ? undefined : next);
  const rows = tableRows(section);
  const taskRow = rows.find((row) => stripTicks(row[0] ?? "") === "task");
  assert.ok(taskRow, "subagent-start table has a task row");
  assert.equal(stripTicks(taskRow[2] ?? ""), "task");
  assert.ok(
    hasNoSourceKey(taskRow[3] ?? ""),
    "Copilot cell has no source key",
  );
  assert.ok(
    hasNoSourceKey(taskRow[4] ?? ""),
    "Claude Code cell has no source key",
  );
  assert.match(
    text,
    /excepci[oó]n expl[ií]cita|explicit exception/i,
  );
  assert.match(text, /`task`/);
});
