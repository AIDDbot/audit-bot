import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
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

test("AC-F004.5 — Details are mapped normalized body fields in table order", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-5-mapped";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        transcript_path: "/tmp/sub.jsonl",
      },
    },
    {
      extraArgv: ["cursor", "subagentStop"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        transcript_path: "/tmp/sub.jsonl",
        summary: "done",
      },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hello" },
    },
    {
      extraArgv: ["cursor", "stop"],
      payload: { session_id: sessionId, transcript_path: "/tmp/agent.jsonl" },
    },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed" },
    },
  ]);

  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 6);
  const markdown = await readSessionReport(projectRoot, sessionId);
  const rows = eventRows(markdown);
  assert.equal(rows.length, 6);
  const expectedDetails = [
    "",
    "agent_type: explore; transcript_path: /tmp/sub.jsonl",
    "agent_type: explore; transcript_path: /tmp/sub.jsonl; response_text: done",
    "prompt: hello",
    "transcript_path: /tmp/agent.jsonl",
    "reason: completed",
  ];
  const expectedEvents = [
    "sessionStart",
    "subagentStart",
    "subagentStop",
    "beforeSubmitPrompt",
    "stop",
    "sessionEnd",
  ];
  for (let i = 0; i < rows.length; i++) {
    const parts = cells(rows[i] ?? "");
    assert.equal(parts.length, 3);
    const mapping = yamlMapping(documents[i] ?? "");
    assert.equal(parts[0], mapping.values.timestamp);
    assert.equal(parts[1], expectedEvents[i]);
    assert.equal(parts[2], expectedDetails[i]);
    assert.equal((parts[2] ?? "").includes("session_id"), false);
  }
});

test("AC-F004.5 — absent sessionEnd reason is omitted so Details are empty", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-5-absent";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId },
    },
  ]);

  const rows = eventRows(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.endsWith("|  |"), true);
  const parts = cells(rows[0] ?? "");
  assert.equal(parts[1], "sessionEnd");
  assert.equal(parts[2], "");
  assert.equal((parts[2] ?? "").includes("reason"), false);
});

test("AC-F004.5 — present YAML null appears in Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-5-null";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        transcript_path: null,
      },
    },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed" },
    },
  ]);

  const rows = eventRows(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 2);
  assert.equal(
    cells(rows[0] ?? "")[2],
    "agent_type: explore; transcript_path: null",
  );
});

test("AC-F004.5 — unrecognized header-only document has empty Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-5-unmapped";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["unknown-harness", "notAnEvent"],
      payload: {
        session_id: sessionId,
        reason: "leaked-reason",
        prompt: "leaked-prompt",
      },
    },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed" },
    },
  ]);

  const rows = eventRows(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 2);
  const unmapped = cells(rows[0] ?? "");
  assert.equal(unmapped[1], "notAnEvent");
  assert.equal(unmapped[2], "");
  assert.equal((unmapped[2] ?? "").includes("leaked-reason"), false);
  assert.equal((unmapped[2] ?? "").includes("leaked-prompt"), false);
  assert.equal(cells(rows[1] ?? "")[2], "reason: completed");
});

test("AC-F004.5 — pipe in a Details value stays one table cell", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-5-pipe";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed|aborted" },
    },
  ]);

  const rows = eventRows(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  const parts = cells(rows[0] ?? "");
  assert.equal(parts.length, 3);
  assert.equal(parts[1], "sessionEnd");
  assert.equal(parts[2], "reason: completed\\|aborted");
  assert.ok((rows[0] ?? "").includes("completed\\|aborted"));
});
