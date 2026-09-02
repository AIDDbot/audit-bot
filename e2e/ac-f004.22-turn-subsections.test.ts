import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  readSessionReport,
  spawnIngest,
  turnSubsection,
} from "./spawn.ts";

const TABLE_HEADER = "| Time | Event | Subagent | Details |";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

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

function detailsOf(row: string): string {
  return cells(row)[3] ?? "";
}

function jsonlEvent(record: Record<string, unknown>): string {
  return typeof record.event === "string" ? record.event : "";
}

function assertTurnTable(markdown: string, turn: number): string[] {
  assert.ok(markdown.includes(`## Turn ${turn}`));
  assert.equal(markdown.includes("## Events"), false);
  const subsection = turnSubsection(markdown, turn);
  assert.match(subsection, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(subsection);
  for (const row of rows) {
    assert.equal(cells(row).length, 4);
  }
  return rows;
}

function assertTurn0Table(markdown: string): string[] {
  assert.equal(markdown.includes("## Turn 1"), false);
  return assertTurnTable(markdown, 0);
}

function assertMappedRows(
  rows: string[],
  records: Record<string, unknown>[],
  indexes: number[],
  expectedEvents: string[],
  expectedDetails: string[],
): void {
  assert.equal(rows.length, indexes.length);
  for (let r = 0; r < rows.length; r++) {
    const i = indexes[r] ?? 0;
    const parts = cells(rows[r] ?? "");
    assert.equal(parts.length, 4);
    const record = records[i] ?? {};
    assert.equal(parts[0], record.timestamp);
    assert.equal(parts[1], record.event);
    assert.equal(parts[1], expectedEvents[i]);
    assert.equal(parts[3], expectedDetails[i]);
    const details = parts[3] ?? "";
    assert.equal(details.includes("session_id"), false);
    assert.equal(details.includes("transcript_path"), false);
    assert.equal(details.includes("subagent"), false);
    assert.equal(details.includes("agent_display_name"), false);
  }
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

async function sessionRecords(
  projectRoot: string,
  sessionId: string,
): Promise<Record<string, unknown>[]> {
  return jsonlRecords(await readSessionJsonl(projectRoot, sessionId)).map(
    assertJsonObject,
  );
}

test("AC-F004.22 — several events group into Turn 0 then Turn 1 with four-column tables and no Events heading", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-group";
  await ingestSequence(projectRoot, [
    { extraArgv: ["cursor", "sessionStart"], payload: { session_id: sessionId } },
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "hello" },
    },
    { extraArgv: ["cursor", "stop"], payload: { session_id: sessionId } },
  ]);

  const records = await sessionRecords(projectRoot, sessionId);
  assert.equal(records.length, 3);
  const markdown = await readSessionReport(projectRoot, sessionId);
  const turn0Rows = assertTurnTable(markdown, 0);
  const turn1Rows = assertTurnTable(markdown, 1);
  assert.ok(markdown.indexOf("## Turn 0") < markdown.indexOf("## Turn 1"));
  assert.deepEqual(
    turn0Rows.map((row) => cells(row)[1]),
    [jsonlEvent(records[0] ?? {})],
  );
  assert.deepEqual(
    turn1Rows.map((row) => cells(row)[1]),
    [jsonlEvent(records[1] ?? {}), jsonlEvent(records[2] ?? {})],
  );
  assert.deepEqual(records.map((record) => jsonlEvent(record)), [
    "sessionStart",
    "beforeSubmitPrompt",
    "stop",
  ]);
});

test("AC-F004.22 — Details are mapped normalized body fields in the turn table", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-mapped";
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

  const records = await sessionRecords(projectRoot, sessionId);
  assert.equal(records.length, 6);
  const markdown = await readSessionReport(projectRoot, sessionId);
  const expectedDetails = [
    "",
    "task: look around",
    "response_text: done",
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
  assertMappedRows(
    assertTurnTable(markdown, 0),
    records,
    [0, 1, 2],
    expectedEvents,
    expectedDetails,
  );
  assertMappedRows(
    assertTurnTable(markdown, 1),
    records,
    [3, 4, 5],
    expectedEvents,
    expectedDetails,
  );
  assert.ok(markdown.indexOf("## Turn 0") < markdown.indexOf("## Turn 1"));
});

test("AC-F004.22 — Copilot subagentStart Details omit identity and task", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-copilot";
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
  const details = detailsOf(rows[0] ?? "");
  assert.equal(details, "");
  assert.equal(details.includes("task:"), false);
  assert.equal(details.includes("subagent"), false);
  assert.equal(details.includes("agent_display_name"), false);
});

test("AC-F004.22 — absent keys are omitted from Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-absent";
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

  const records = await sessionRecords(projectRoot, sessionId);
  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 2);
  const start = cells(rows[0] ?? "");
  assert.equal(start[1], jsonlEvent(records[0] ?? {}));
  assert.equal(start[1], "subagentStart");
  assert.equal(start[3], "");
  assert.equal((start[3] ?? "").includes("task:"), false);
  assert.equal((start[3] ?? "").includes("subagent"), false);
  assert.equal((start[3] ?? "").includes("agent_display_name"), false);
  const end = cells(rows[1] ?? "");
  assert.equal(end[1], jsonlEvent(records[1] ?? {}));
  assert.equal(end[1], "sessionEnd");
  assert.equal(end[3], "");
  assert.equal((end[3] ?? "").includes("reason"), false);
});

test("AC-F004.22 — present JSON null appears in Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-null";
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
  const details = detailsOf(rows[0] ?? "");
  assert.equal(details, "task: null");
  assert.equal(details.includes("subagent"), false);
  assert.equal(details.includes("agent_display_name"), false);
  assert.equal(details.includes("transcript_path"), false);
});

test("AC-F004.22 — unrecognized header-only record has empty Details", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-unmapped";
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

  const records = await sessionRecords(projectRoot, sessionId);
  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  const unmapped = cells(rows[0] ?? "");
  assert.equal(unmapped[1], jsonlEvent(records[0] ?? {}));
  assert.equal(unmapped[1], "notAnEvent");
  assert.equal(unmapped[3], "");
  assert.equal((unmapped[3] ?? "").includes("leaked-reason"), false);
  assert.equal((unmapped[3] ?? "").includes("leaked-prompt"), false);
  assert.equal((unmapped[3] ?? "").includes("leaked-task"), false);
});

test("AC-F004.22 — pipe in a Details value stays one table cell", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-pipe";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "sessionEnd"],
      payload: { session_id: sessionId, reason: "completed|aborted" },
    },
  ]);

  const rows = assertTurn0Table(await readSessionReport(projectRoot, sessionId));
  assert.equal(rows.length, 1);
  const parts = cells(rows[0] ?? "");
  assert.equal(parts.length, 4);
  assert.equal(parts[1], "sessionEnd");
  assert.equal(parts[3], "reason: completed\\|aborted");
  assert.ok((rows[0] ?? "").includes("completed\\|aborted"));
});

test("AC-F004.22 — prompt-only session omits empty Turn 0", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-22-no-t0";
  await ingestSequence(projectRoot, [
    {
      extraArgv: ["cursor", "beforeSubmitPrompt"],
      payload: { session_id: sessionId, prompt: "only-prompt" },
    },
  ]);

  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 1"));
  assert.equal(markdown.includes("## Turn 0"), false);
  assert.equal(markdown.includes("## Events"), false);
  const rows = assertTurnTable(markdown, 1);
  assert.equal(rows.length, 1);
  assert.equal(cells(rows[0] ?? "")[1], "beforeSubmitPrompt");
});
