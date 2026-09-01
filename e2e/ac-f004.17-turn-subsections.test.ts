import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  readSessionYaml,
  spawnIngest,
  turnSubsection,
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

function assertTurn0Table(markdown: string): string[] {
  assert.ok(markdown.includes("## Turn 0"));
  assert.equal(markdown.includes("## Events"), false);
  assert.equal(markdown.includes("## Turn 1"), false);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Details \|$/m);
  const rows = eventRows(turn0);
  for (const row of rows) {
    assert.equal(cells(row).length, 3);
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

test("AC-F004.17 — several events group into Turn 0 with no session-wide Events table", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-group";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hello" },
    },
    { extraArgv: ["cursor", "stop"], payload: { session_id: sessionId } },
  ]);

  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 3);
  const markdown = await readSessionReport(projectRoot, sessionId);
  const rows = assertTurn0Table(markdown);
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((row) => cells(row)[1]),
    ["sessionStart", "beforeSubmitPrompt", "stop"],
  );
});

test("AC-F004.17 — Details are mapped normalized body fields in the turn table", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-mapped";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        task: "look around",
      },
    },
    {
      extraArgv: ["cursor", "subagentStop"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        summary: "done",
      },
    },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hello" },
    },
    {
      extraArgv: ["cursor", "stop"],
      payload: { session_id: sessionId },
    },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed" },
    },
  ]);

  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 6);
  const markdown = await readSessionReport(projectRoot, sessionId);
  const rows = assertTurn0Table(markdown);
  assert.equal(rows.length, 6);
  const expectedDetails = [
    "",
    "agent_type: explore; task: look around",
    "agent_type: explore; response_text: done",
    "prompt: hello",
    "",
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
    assert.equal((parts[2] ?? "").includes("transcript_path"), false);
    assert.equal((parts[2] ?? "").includes("agent_display_name"), false);
  }
});

test("AC-F004.17 — Copilot subagentStart Details include agent_display_name and omit task", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-copilot";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["copilot", "subagentStart"],
      payload: {
        session_id: sessionId,
        agentName: "explore",
        agentDisplayName: "Explore",
        task: "should not map",
      },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  const rows = assertTurn0Table(markdown);
  assert.equal(rows.length, 1);
  const details = cells(rows[0] ?? "")[2] ?? "";
  assert.equal(details, "agent_type: explore; agent_display_name: Explore");
  assert.equal(details.includes("task:"), false);
});

test("AC-F004.17 — absent keys are omitted from Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-absent";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
      },
    },
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId },
    },
  ]);

  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 2);
  const start = cells(rows[0] ?? "");
  assert.equal(start[1], "subagentStart");
  assert.equal(start[2], "agent_type: explore");
  assert.equal((start[2] ?? "").includes("task:"), false);
  const end = cells(rows[1] ?? "");
  assert.equal(end[1], "sessionEnd");
  assert.equal(end[2], "");
  assert.equal((end[2] ?? "").includes("reason"), false);
});

test("AC-F004.17 — present YAML null appears in Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-null";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "subagentStart"],
      payload: {
        session_id: sessionId,
        subagent_type: "explore",
        task: null,
      },
    },
  ]);

  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  assert.equal(cells(rows[0] ?? "")[2], "agent_type: explore; task: null");
  assert.equal((cells(rows[0] ?? "")[2] ?? "").includes("transcript_path"), false);
});

test("AC-F004.17 — unrecognized header-only document has empty Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-unmapped";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["unknown-harness", "notAnEvent"],
      payload: {
        session_id: sessionId,
        reason: "leaked-reason",
        prompt: "leaked-prompt",
        task: "leaked-task",
      },
    },
  ]);

  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  const unmapped = cells(rows[0] ?? "");
  assert.equal(unmapped[1], "notAnEvent");
  assert.equal(unmapped[2], "");
  assert.equal((unmapped[2] ?? "").includes("leaked-reason"), false);
  assert.equal((unmapped[2] ?? "").includes("leaked-prompt"), false);
  assert.equal((unmapped[2] ?? "").includes("leaked-task"), false);
});

test("AC-F004.17 — pipe in a Details value stays one table cell", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-17-pipe";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed|aborted" },
    },
  ]);

  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  const parts = cells(rows[0] ?? "");
  assert.equal(parts.length, 3);
  assert.equal(parts[1], "sessionEnd");
  assert.equal(parts[2], "reason: completed\\|aborted");
  assert.ok((rows[0] ?? "").includes("completed\\|aborted"));
});
