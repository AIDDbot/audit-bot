import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessionYaml,
  spawnIngest,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

const hhmmss = /^\d{2}:\d{2}:\d{2}$/;

function formatLocalHms(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function clockSeconds(date: Date): number {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
}

function parseHms(value: string): number {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  assert.ok(match);
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
}

function inClockWindow(
  got: string,
  start: Date,
  end: Date,
  slackSec = 2,
): boolean {
  const value = parseHms(got);
  const lo = (clockSeconds(start) - slackSec + 86400) % 86400;
  const hi = (clockSeconds(end) + slackSec) % 86400;
  if (lo <= hi) return value >= lo && value <= hi;
  return value >= lo || value <= hi;
}

async function readYamlTimestamp(
  projectRoot: string,
  sessionId: string,
): Promise<string> {
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 1);
  const mapping = yamlMapping(documents[0] ?? "");
  const timestamp = mapping.values.timestamp ?? "";
  assert.match(timestamp, hhmmss);
  return timestamp;
}

test("AC-F003.4 — payload Unix-ms timestamp formats as local HH:MM:SS", async () => {
  const projectRoot = await makeFixture();
  const unixMs = Date.UTC(2026, 0, 15, 13, 5, 9);
  const expected = formatLocalHms(new Date(unixMs));
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f003-4-ms",
    timestamp: unixMs,
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  const yamlTimestamp = await readYamlTimestamp(projectRoot, payload.session_id);
  assert.equal(yamlTimestamp, expected);
  const parsed = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal(parsed.timestamp, unixMs);
});

test("AC-F003.4 — payload ISO date-time string formats as local HH:MM:SS", async () => {
  const projectRoot = await makeFixture();
  const iso = "2026-03-20T08:07:06.000Z";
  const expected = formatLocalHms(new Date(iso));
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f003-4-iso",
    timestamp: iso,
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  const yamlTimestamp = await readYamlTimestamp(projectRoot, payload.session_id);
  assert.equal(yamlTimestamp, expected);
  const parsed = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal(parsed.timestamp, iso);
});

test("AC-F003.4 — generated timestamp is local HH:MM:SS and is not on the Event log", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f003-4-generated",
  };
  const before = new Date();

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });
  const after = new Date();

  assert.equal(result.exitCode, 0);
  const yamlTimestamp = await readYamlTimestamp(projectRoot, payload.session_id);
  assert.equal(inClockWindow(yamlTimestamp, before, after), true);
  const parsed = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal("timestamp" in parsed, false);
});
