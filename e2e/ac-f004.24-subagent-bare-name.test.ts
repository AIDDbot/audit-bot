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

function assertBareName(cell: string, name: string): void {
  assert.equal(cell, name);
  assert.notEqual(cell, `agent_type: ${name}`);
  assert.notEqual(cell, `subagent: ${name}`);
  assert.equal(cell.includes("agent_type:"), false);
  assert.equal(cell.includes("subagent:"), false);
  assert.equal(cell.includes("agent_display_name:"), false);
}

function assertNoNestedRows(markdown: string): void {
  assert.equal(
    markdown.split(/\r?\n/).some((line) => /^[ \t]+\|/.test(line)),
    false,
  );
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

test("AC-F004.24 — subagentStart and subagentStop Subagent is the bare name", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-24-start-stop";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        parent_conversation_id: sessionId,
        subagent_type: "explore",
      },
    },
    {
      extraArgv: ["cursor", "subagentStop"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(turn0);
  assert.deepEqual(
    rows.map((row) => cells(row)[1]),
    ["sessionStart", "subagentStart", "subagentStop"],
  );
  assert.equal(subagentOf(rows[0] ?? ""), "");
  assertBareName(subagentOf(rows[1] ?? ""), "explore");
  assertBareName(subagentOf(rows[2] ?? ""), "explore");
  assertNoNestedRows(markdown);
});

test("AC-F004.24 — sessionStart, prompt, and stop fill Subagent when identity is present", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-24-any-kind";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "sessionStart"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: {
        session_id: sessionId,
        prompt: "hello",
        subagent_type: "explore",
      },
    },
    {
      extraArgv: ["cursor", "stop"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0 = turnSubsection(markdown, 0);
  const turn1 = turnSubsection(markdown, 1);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  assert.match(turn1, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const turn0Rows = eventRows(turn0);
  const turn1Rows = eventRows(turn1);
  assert.deepEqual(
    turn0Rows.map((row) => cells(row)[1]),
    ["sessionStart"],
  );
  assert.deepEqual(
    turn1Rows.map((row) => cells(row)[1]),
    ["beforeSubmitPrompt", "stop"],
  );
  assertBareName(subagentOf(turn0Rows[0] ?? ""), "explore");
  assertBareName(subagentOf(turn1Rows[0] ?? ""), "explore");
  assertBareName(subagentOf(turn1Rows[1] ?? ""), "explore");
});

test("AC-F004.24 — later row without identity does not inherit Subagent", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-24-no-inherit";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "sessionStart"],
      payload: { session_id: sessionId, subagent_type: "explore" },
    },
    { extraArgv: ["cursor", "stop"], payload: { session_id: sessionId } },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(turn0);
  assert.deepEqual(
    rows.map((row) => cells(row)[1]),
    ["sessionStart", "stop"],
  );
  assertBareName(subagentOf(rows[0] ?? ""), "explore");
  assert.equal(subagentOf(rows[1] ?? ""), "");
});

test("AC-F004.24 — Copilot Subagent is the slug not the display name", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-24-copilot";
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
  const cell = subagentOf(rows[0] ?? "");
  assert.equal(cell, "explore");
  assert.notEqual(cell, "Explore");
  assert.notEqual(cell, "agent_display_name: Explore");
  assert.notEqual(cell, "agent_type: explore; agent_display_name: Explore");
  assert.equal(cell.includes("agent_display_name"), false);
  assert.equal(cell.includes("agent_type:"), false);
});

test("AC-F004.24 — Subagent is empty when identity is absent", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-24-absent";
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
