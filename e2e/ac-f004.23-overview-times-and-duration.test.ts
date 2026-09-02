import assert from "node:assert";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  readSessionJsonl,
  readSessionReport,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

function formatLocalHms(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function unixMsAtLocal(hours: number, minutes: number, seconds: number): number {
  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date.getTime();
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

function overviewField(markdown: string, field: string): string {
  const line = markdown.split(/\r?\n/).find((row) => row.startsWith(`| ${field} |`));
  assert.ok(line);
  const parts = cells(line);
  assert.equal(parts[0], field);
  return parts[1] ?? "";
}

function assertHarnessOverview(markdown: string): void {
  assert.ok(markdown.includes("| harness |"));
  assert.equal(markdown.includes("| source_harness |"), false);
}

function assertNoSessionEnd(records: Record<string, unknown>[]): void {
  const events = records.map((record) => record.event);
  assert.equal(events.includes("sessionEnd"), false);
  assert.equal(events.includes("SessionEnd"), false);
}

async function spawnStartThenLast(input: {
  sessionId: string;
  startMs: number;
  lastMs: number;
  lastArgv: string[];
  lastPayload?: Record<string, unknown>;
}): Promise<{
  markdown: string;
  firstTimestamp: string;
  lastTimestamp: string;
  lastHarness: string;
  firstHasSessionId: boolean;
  lastHasSessionId: boolean;
}> {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const start = await spawnIngest({
    stdin: JSON.stringify({
      session_id: input.sessionId,
      timestamp: input.startMs,
    }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const last = await spawnIngest({
    stdin: JSON.stringify({
      session_id: input.sessionId,
      timestamp: input.lastMs,
      ...input.lastPayload,
    }),
    env,
    extraArgv: input.lastArgv,
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  assert.equal(last.exitCode, 0);
  assert.equal(last.stdout, "");
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, input.sessionId),
  ).map(assertJsonObject);
  assert.equal(records.length, 2);
  assertNoSessionEnd(records);
  const first = records[0] ?? {};
  const lastRecord = records[1] ?? {};
  return {
    markdown: await readSessionReport(projectRoot, input.sessionId),
    firstTimestamp: String(first.timestamp ?? ""),
    lastTimestamp: String(lastRecord.timestamp ?? ""),
    lastHarness: String(lastRecord.harness ?? ""),
    firstHasSessionId: "session_id" in first,
    lastHasSessionId: "session_id" in lastRecord,
  };
}

test("AC-F004.23 — overview uses last-record harness and elapsed duration without sessionEnd", async () => {
  const sessionId = "sess-ac-f004-23-elapsed";
  const startMs = unixMsAtLocal(10, 0, 0);
  const lastMs = unixMsAtLocal(11, 1, 2);
  const got = await spawnStartThenLast({
    sessionId,
    startMs,
    lastMs,
    lastArgv: ["copilot", "stop"],
    lastPayload: { duration_ms: 9999999 },
  });

  assert.equal(got.firstTimestamp, formatLocalHms(new Date(startMs)));
  assert.equal(got.lastTimestamp, formatLocalHms(new Date(lastMs)));
  assert.equal(got.lastHarness, "copilot");
  assert.equal(got.firstHasSessionId, true);
  assert.equal(got.lastHasSessionId, false);
  assert.equal(overviewField(got.markdown, "session_id"), sessionId);
  assertHarnessOverview(got.markdown);
  assert.equal(overviewField(got.markdown, "harness"), "copilot");
  assert.equal(overviewField(got.markdown, "start"), got.firstTimestamp);
  assert.equal(overviewField(got.markdown, "end"), got.lastTimestamp);
  assert.equal(overviewField(got.markdown, "duration"), "01:01:02");
  assert.equal(got.markdown.includes("9999999"), false);
});

test("AC-F004.23 — last timestamp before first yields duration 00:00:00 without sessionEnd", async () => {
  const sessionId = "sess-ac-f004-23-before";
  const startMs = unixMsAtLocal(14, 0, 0);
  const lastMs = unixMsAtLocal(10, 0, 0);
  const got = await spawnStartThenLast({
    sessionId,
    startMs,
    lastMs,
    lastArgv: ["cursor", "beforeSubmitPrompt"],
    lastPayload: { prompt: "earlier-clock" },
  });

  assert.equal(got.firstTimestamp, formatLocalHms(new Date(startMs)));
  assert.equal(got.lastTimestamp, formatLocalHms(new Date(lastMs)));
  assert.equal(overviewField(got.markdown, "session_id"), sessionId);
  assertHarnessOverview(got.markdown);
  assert.equal(overviewField(got.markdown, "harness"), "cursor");
  assert.equal(overviewField(got.markdown, "start"), got.firstTimestamp);
  assert.equal(overviewField(got.markdown, "end"), got.lastTimestamp);
  assert.equal(overviewField(got.markdown, "duration"), "00:00:00");
});

test("AC-F004.23 — equal timestamps yield duration 00:00:00 without sessionEnd", async () => {
  const sessionId = "sess-ac-f004-23-equal";
  const stampMs = unixMsAtLocal(15, 0, 0);
  const got = await spawnStartThenLast({
    sessionId,
    startMs: stampMs,
    lastMs: stampMs,
    lastArgv: ["cursor", "stop"],
  });

  const expected = formatLocalHms(new Date(stampMs));
  assert.equal(got.firstTimestamp, expected);
  assert.equal(got.lastTimestamp, expected);
  assert.equal(overviewField(got.markdown, "session_id"), sessionId);
  assertHarnessOverview(got.markdown);
  assert.equal(overviewField(got.markdown, "start"), expected);
  assert.equal(overviewField(got.markdown, "end"), expected);
  assert.equal(overviewField(got.markdown, "duration"), "00:00:00");
});

test("AC-F004.23 — prompt-only JSONL omits session_id; overview session_id is F001 filename stem", async () => {
  const projectRoot = await makeFixture();
  const sessionId = "sess-ac-f004-23-prompt";
  const stampMs = unixMsAtLocal(10, 0, 0);
  const result = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      timestamp: stampMs,
      prompt: "only-prompt",
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "beforeSubmitPrompt"],
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const records = jsonlRecords(await readSessionJsonl(projectRoot, sessionId)).map(
    assertJsonObject,
  );
  assert.equal(records.length, 1);
  assertNoSessionEnd(records);
  const record = records[0] ?? {};
  assert.equal("session_id" in record, false);
  assert.equal(record.harness, "cursor");
  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.equal(overviewField(markdown, "session_id"), sessionId);
  assertHarnessOverview(markdown);
  assert.equal(overviewField(markdown, "harness"), "cursor");
  const expected = formatLocalHms(new Date(stampMs));
  assert.equal(overviewField(markdown, "start"), expected);
  assert.equal(overviewField(markdown, "end"), expected);
  assert.equal(overviewField(markdown, "duration"), "00:00:00");
});
