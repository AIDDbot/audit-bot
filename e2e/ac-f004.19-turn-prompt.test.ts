import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  spawnIngest,
  turnSubsection,
} from "./spawn.ts";

const TABLE_HEADER = "| Time | Event | Subagent | Details |";

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

function hasPromptLine(subsection: string): boolean {
  return subsection.split(/\r?\n/).some((line) => line.startsWith("Prompt:"));
}

async function ingestSequence(
  projectRoot: string,
  steps: { extraArgv: string[]; payload: Record<string, unknown> }[],
): Promise<void> {
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  for (const step of steps) {
    const result = await spawnIngest({
      stdin: JSON.stringify(step.payload),
      env,
      extraArgv: step.extraArgv,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout, "");
  }
}

test("AC-F004.19 — Turn 0 subsection has no Prompt: line", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-19-t0";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 0"));
  assert.equal(markdown.includes("## Events"), false);
  const turn0 = turnSubsection(markdown, 0);
  assert.equal(hasPromptLine(turn0), false);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  assert.equal(eventRows(turn0).length, 1);
});

test("AC-F004.19 — Turn ≥ 1 Prompt line uses the 100-character preview", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-19";
  const prompt = "a".repeat(101);
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 0"));
  assert.ok(markdown.includes("## Turn 1"));
  const turn0 = turnSubsection(markdown, 0);
  assert.equal(hasPromptLine(turn0), false);
  const turn1 = turnSubsection(markdown, 1);
  assert.match(turn1, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const promptLine = turn1.split(/\r?\n/).find((line) => line.startsWith("Prompt:"));
  assert.equal(promptLine, `Prompt: ${"a".repeat(100)}...`);
  assert.equal((promptLine ?? "").includes("a".repeat(101)), false);
  assert.equal((promptLine ?? "").endsWith("...."), false);
  const promptRow = eventRows(turn1).find((row) =>
    row.includes("beforeSubmitPrompt"),
  );
  assert.ok(promptRow);
  assert.equal(cells(promptRow).length, 4);
});

test("AC-F004.19 — Turn ≥ 1 omits Prompt: when prompt is absent", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-19-absent";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 1"));
  const turn1 = turnSubsection(markdown, 1);
  assert.equal(hasPromptLine(turn1), false);
  assert.match(turn1, /^\| Time \| Event \| Subagent \| Details \|$/m);
});
