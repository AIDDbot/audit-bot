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

function sectionByHeading(text: string, heading: string): string {
  const start = text.indexOf(heading);
  assert.ok(start >= 0, `${heading} is present`);
  const next = text.indexOf("\n## ", start + 1);
  return text.slice(start, next === -1 ? undefined : next);
}

function assertAgentDisplayNameRow(section: string, label: string): void {
  const rows = tableRows(section);
  const displayRow = rows.find(
    (row) => stripTicks(row[0] ?? "") === "agent_display_name",
  );
  assert.ok(displayRow, `${label} table has an agent_display_name row`);
  assert.ok(
    hasNoSourceKey(displayRow[2] ?? ""),
    `${label} Cursor cell has no source key`,
  );
  assert.equal(stripTicks(displayRow[3] ?? ""), "agentDisplayName");
  assert.ok(
    hasNoSourceKey(displayRow[4] ?? ""),
    `${label} Claude Code cell has no source key`,
  );
}

test("AC-F007.1 — normalized-fields.md includes agent_display_name for subagent start and stop (Copilot only)", async () => {
  const text = await readFile(
    path.join(repoRoot, "docs", "normalized-fields.md"),
    "utf8",
  );

  const introEnd = text.indexOf("\n## ");
  assert.ok(introEnd >= 0, "intro precedes the first section");
  const intro = text.slice(0, introEnd);
  assert.match(intro, /excepci[oó]n expl[ií]cita|explicit exception/i);
  assert.match(intro, /`task`/);
  assert.match(intro, /`agent_display_name`/);

  const startSection = sectionByHeading(text, "## 3. Inicio de subagente");
  const stopSection = sectionByHeading(text, "## 4. Fin de subagente");
  assertAgentDisplayNameRow(startSection, "subagent-start");
  assertAgentDisplayNameRow(stopSection, "subagent-stop");
  for (const [section, label] of [
    [startSection, "subagent-start"],
    [stopSection, "subagent-stop"],
  ] as const) {
    const names = tableRows(section).map((row) => stripTicks(row[0] ?? ""));
    assert.ok(names.includes("subagent"), `${label} identity row is subagent`);
    assert.equal(
      names.includes("agent_type"),
      false,
      `${label} has no agent_type row`,
    );
  }
});
