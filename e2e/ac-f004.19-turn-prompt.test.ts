import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  spawnIngest,
  turnSubsection,
} from "./spawn.ts";

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

test("AC-F004.19 — Turn 0 subsection has no Prompt: line", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-19";
  const steps: { extraArgv: string[]; payload: Record<string, unknown> }[] = [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "turn-zero-prompt" },
    },
    { extraArgv: ["cursor", "stop"], payload: { session_id: sessionId } },
  ];

  for (const step of steps) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
  }

  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 0"));
  assert.equal(markdown.includes("## Events"), false);
  const turn0 = turnSubsection(markdown, 0);
  assert.equal(
    turn0.split(/\r?\n/).some((line) => line.startsWith("Prompt:")),
    false,
  );
  const promptRow = eventRows(turn0).find((row) =>
    row.includes("beforeSubmitPrompt"),
  );
  assert.ok(promptRow);
  assert.equal(cells(promptRow)[2], "prompt: turn-zero-prompt");
});
