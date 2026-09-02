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

function subagentOf(row: string): string {
  const parts = cells(row);
  assert.equal(parts.length, 4);
  return parts[2] ?? "";
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

test("AC-F004.20 — Subagent is filled only on subagent rows and is not inherited", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-20-mixed";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
    {
      extraArgv: ["cursor", "subagentStop"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hello" },
    },
    { extraArgv: ["cursor", "stop"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed" },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.equal(markdown.includes("## Events"), false);
  const turn0 = turnSubsection(markdown, 0);
  const turn1 = turnSubsection(markdown, 1);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  assert.match(turn1, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const turn0Rows = eventRows(turn0);
  const turn1Rows = eventRows(turn1);
  assert.deepEqual(
    turn0Rows.map((row) => cells(row)[1]),
    ["sessionStart", "subagentStart", "subagentStop"],
  );
  assert.deepEqual(
    turn1Rows.map((row) => cells(row)[1]),
    ["beforeSubmitPrompt", "stop", "sessionEnd"],
  );
  assert.equal(subagentOf(turn0Rows[0] ?? ""), "");
  assert.equal(subagentOf(turn0Rows[1] ?? ""), "agent_type: explore");
  assert.equal(subagentOf(turn0Rows[2] ?? ""), "agent_type: explore");
  assert.equal(subagentOf(turn1Rows[0] ?? ""), "");
  assert.equal(subagentOf(turn1Rows[1] ?? ""), "");
  assert.equal(subagentOf(turn1Rows[2] ?? ""), "");
  for (const row of turn1Rows) {
    assert.equal((subagentOf(row) ?? "").includes("agent_type"), false);
  }
  assert.equal(
    markdown.split(/\r?\n/).some((line) => /^[ \t]+\|/.test(line)),
    false,
  );
});

test("AC-F004.20 — Copilot subagentStart Subagent lists agent_type then agent_display_name", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-20-copilot";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["copilot", "subagentStart"],
      payload: {
        session_id: sessionId,
        agentName: "explore",
        agentDisplayName: "Explore",
      },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(turn0);
  assert.equal(rows.length, 1);
  assert.equal(
    subagentOf(rows[0] ?? ""),
    "agent_type: explore; agent_display_name: Explore",
  );
});

test("AC-F004.20 — Subagent is empty when both identity fields are absent", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-20-absent";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: { session_id: sessionId },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(turn0);
  assert.equal(rows.length, 1);
  assert.equal(cells(rows[0] ?? "")[1], "subagentStart");
  assert.equal(subagentOf(rows[0] ?? ""), "");
});

test("AC-F004.20 — non-subagent kinds leave Subagent empty", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-20-header";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["unknown-harness", "notAnEvent"],
      payload: { session_id: sessionId },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(turn0);
  assert.equal(rows.length, 1);
  assert.equal(cells(rows[0] ?? "")[1], "notAnEvent");
  assert.equal(subagentOf(rows[0] ?? ""), "");
});
