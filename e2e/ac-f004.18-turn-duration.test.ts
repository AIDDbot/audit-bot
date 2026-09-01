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

function overviewField(markdown: string, field: string): string {
  const line = markdown.split(/\r?\n/).find((row) => row.startsWith(`| ${field} |`));
  assert.ok(line);
  const parts = cells(line);
  assert.equal(parts[0], field);
  return parts[1] ?? "";
}

function turnDuration(subsection: string): string {
  const line = subsection.split(/\r?\n/).find((row) => row.startsWith("Duration: "));
  assert.ok(line);
  return line.slice("Duration: ".length);
}

async function spawnStartThenStop(input: {
  sessionId: string;
  startMs: number;
  stopMs: number;
}): Promise<{ markdown: string; firstTimestamp: string; lastTimestamp: string }> {
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
  const stop = await spawnIngest({
    stdin: JSON.stringify({
      session_id: input.sessionId,
      timestamp: input.stopMs,
    }),
    env,
    extraArgv: ["cursor", "stop"],
  });
  assert.equal(start.exitCode, 0);
  assert.equal(start.stdout, "");
  assert.equal(stop.exitCode, 0);
  assert.equal(stop.stdout, "");
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, input.sessionId),
  );
  assert.equal(documents.length, 2);
  return {
    markdown: await readSessionReport(projectRoot, input.sessionId),
    firstTimestamp: yamlMapping(documents[0] ?? "").values.timestamp ?? "",
    lastTimestamp: yamlMapping(documents[1] ?? "").values.timestamp ?? "",
  };
}

test("AC-F004.18 — Turn 0 duration is first turn-0 timestamp to last, including stop", async () => {
  const sessionId = "sess-ac-f004-18-elapsed";
  const startMs = unixMsAtLocal(10, 0, 0);
  const stopMs = unixMsAtLocal(11, 1, 2);
  const got = await spawnStartThenStop({ sessionId, startMs, stopMs });

  assert.equal(got.firstTimestamp, formatLocalHms(new Date(startMs)));
  assert.equal(got.lastTimestamp, formatLocalHms(new Date(stopMs)));
  assert.ok(got.markdown.includes("## Turn 0"));
  assert.equal(got.markdown.includes("## Events"), false);
  assert.equal(got.markdown.includes("## Turn 1"), false);
  const turn0 = turnSubsection(got.markdown, 0);
  assert.equal(turnDuration(turn0), "01:01:02");
  assert.equal(overviewField(got.markdown, "duration"), "01:01:02");
  const rows = eventRows(turn0);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => cells(row)[1]),
    ["sessionStart", "stop"],
  );
});

test("AC-F004.18 — equal turn-0 timestamps yield Duration 00:00:00", async () => {
  const sessionId = "sess-ac-f004-18-equal";
  const stampMs = unixMsAtLocal(15, 0, 0);
  const got = await spawnStartThenStop({
    sessionId,
    startMs: stampMs,
    stopMs: stampMs,
  });

  const expected = formatLocalHms(new Date(stampMs));
  assert.equal(got.firstTimestamp, expected);
  assert.equal(got.lastTimestamp, expected);
  assert.ok(got.markdown.includes("## Turn 0"));
  assert.equal(got.markdown.includes("## Events"), false);
  const turn0 = turnSubsection(got.markdown, 0);
  assert.equal(turnDuration(turn0), "00:00:00");
  assert.equal(overviewField(got.markdown, "duration"), "00:00:00");
});
