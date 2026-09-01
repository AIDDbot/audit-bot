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

async function spawnStartThenEnd(input: {
  sessionId: string;
  startMs: number;
  endMs: number;
  endArgv: string[];
  endPayload?: Record<string, unknown>;
}): Promise<{
  projectRoot: string;
  markdown: string;
  firstTimestamp: string;
  lastTimestamp: string;
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
  const end = await spawnIngest({
    stdin: JSON.stringify({
      session_id: input.sessionId,
      timestamp: input.endMs,
      reason: "completed",
      ...input.endPayload,
    }),
    env,
    extraArgv: input.endArgv,
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  assert.equal(end.exitCode, 0);
  assert.equal(end.stdout, "");
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, input.sessionId),
  );
  assert.equal(documents.length, 2);
  const firstTimestamp = yamlMapping(documents[0] ?? "").values.timestamp ?? "";
  const lastTimestamp = yamlMapping(documents[1] ?? "").values.timestamp ?? "";
  return {
    projectRoot,
    markdown: await readSessionReport(projectRoot, input.sessionId),
    firstTimestamp,
    lastTimestamp,
  };
}

test("AC-F004.3 — overview uses triggering session-end source_harness and elapsed duration", async () => {
  const sessionId = "sess-ac-f004-3-elapsed";
  const startMs = unixMsAtLocal(10, 0, 0);
  const endMs = unixMsAtLocal(11, 1, 2);
  const got = await spawnStartThenEnd({
    sessionId,
    startMs,
    endMs,
    endArgv: ["copilot", "sessionEnd"],
    endPayload: { reason: "complete" },
  });

  assert.equal(got.firstTimestamp, formatLocalHms(new Date(startMs)));
  assert.equal(got.lastTimestamp, formatLocalHms(new Date(endMs)));
  assert.equal(overviewField(got.markdown, "session_id"), sessionId);
  assert.equal(overviewField(got.markdown, "source_harness"), "copilot");
  assert.equal(overviewField(got.markdown, "start"), got.firstTimestamp);
  assert.equal(overviewField(got.markdown, "end"), got.lastTimestamp);
  assert.equal(overviewField(got.markdown, "duration"), "01:01:02");
});

test("AC-F004.3 — last timestamp before first yields duration 00:00:00", async () => {
  const sessionId = "sess-ac-f004-3-before";
  const startMs = unixMsAtLocal(14, 0, 0);
  const endMs = unixMsAtLocal(10, 0, 0);
  const got = await spawnStartThenEnd({
    sessionId,
    startMs,
    endMs,
    endArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(got.firstTimestamp, formatLocalHms(new Date(startMs)));
  assert.equal(got.lastTimestamp, formatLocalHms(new Date(endMs)));
  assert.equal(overviewField(got.markdown, "session_id"), sessionId);
  assert.equal(overviewField(got.markdown, "start"), got.firstTimestamp);
  assert.equal(overviewField(got.markdown, "end"), got.lastTimestamp);
  assert.equal(overviewField(got.markdown, "duration"), "00:00:00");
});

test("AC-F004.3 — equal timestamps yield duration 00:00:00", async () => {
  const sessionId = "sess-ac-f004-3-equal";
  const stampMs = unixMsAtLocal(15, 0, 0);
  const got = await spawnStartThenEnd({
    sessionId,
    startMs: stampMs,
    endMs: stampMs,
    endArgv: ["cursor", "sessionEnd"],
  });

  const expected = formatLocalHms(new Date(stampMs));
  assert.equal(got.firstTimestamp, expected);
  assert.equal(got.lastTimestamp, expected);
  assert.equal(overviewField(got.markdown, "session_id"), sessionId);
  assert.equal(overviewField(got.markdown, "start"), expected);
  assert.equal(overviewField(got.markdown, "end"), expected);
  assert.equal(overviewField(got.markdown, "duration"), "00:00:00");
});
