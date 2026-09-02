import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  spawnIngest,
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

function promptDetails(markdown: string): string {
  const row = eventRows(markdown).find((line) => line.includes("beforeSubmitPrompt"));
  assert.ok(row);
  const parts = cells(row);
  assert.equal(parts.length, 4);
  return parts[3] ?? "";
}

async function reportForPrompt(prompt: string): Promise<string> {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-6";
  const promptResult = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, prompt }),
    env,
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  const endResult = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, reason: "completed" }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });
  assert.equal(promptResult.exitCode, 0);
  assert.equal(endResult.exitCode, 0);
  return readSessionReport(projectRoot, sessionId);
}

test("AC-F004.6 — Details value longer than 100 characters is truncated with ellipsis", async () => {
  const markdown = await reportForPrompt("a".repeat(101));
  const details = promptDetails(markdown);
  assert.equal(details, `prompt: ${"a".repeat(100)}...`);
  assert.equal(details.includes("a".repeat(101)), false);
  assert.equal(details.endsWith("...."), false);
});

test("AC-F004.6 — Details value of 100 characters does not get an ellipsis", async () => {
  const markdown = await reportForPrompt("a".repeat(100));
  const details = promptDetails(markdown);
  assert.equal(details, `prompt: ${"a".repeat(100)}`);
  assert.equal(details.includes("..."), false);
});

test("AC-F004.6 — newlines become spaces before the 100-character limit", async () => {
  const prompt = `${"a".repeat(50)}\n${"b".repeat(51)}`;
  const markdown = await reportForPrompt(prompt);
  const details = promptDetails(markdown);
  const collapsed = `${"a".repeat(50)} ${"b".repeat(51)}`;
  assert.equal(collapsed.length > 100, true);
  assert.equal(details, `prompt: ${collapsed.slice(0, 100)}...`);
  assert.equal(details.includes("\n"), false);
  assert.equal(details.includes("\r"), false);
});

test("AC-F004.6 — Subagent identity longer than 100 characters is truncated with ellipsis", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-6-subagent";
  const result = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      agentName: "explore",
      agentDisplayName: "b".repeat(101),
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["copilot", "subagentStart"],
  });
  assert.equal(result.exitCode, 0);
  const markdown = await readSessionReport(projectRoot, sessionId);
  const rows = eventRows(markdown);
  assert.equal(rows.length, 1);
  const parts = cells(rows[0] ?? "");
  assert.equal(parts.length, 4);
  const subagent = parts[2] ?? "";
  assert.equal(subagent, "explore");
  assert.equal(subagent.includes("b".repeat(101)), false);
  assert.equal(subagent.endsWith("...."), false);
});
