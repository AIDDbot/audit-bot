import assert from "node:assert";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { decodeHookStdin, ingestHook } from "../src/ingest.ts";
import { dayFolderName } from "../src/project.ts";
import { emitSessionReport, parseSessionRecords } from "../src/report.ts";

const roots: string[] = [];
const now = new Date(2026, 8, 1, 15, 0, 0);

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "audit-ingest-"));
  roots.push(root);
  return root;
}

function dayFolder(root: string): string {
  return path.join(root, "temp", "audit", dayFolderName(now));
}

function eventsPath(root: string): string {
  return path.join(dayFolder(root), "events.jsonl");
}

function sessionsPath(root: string): string {
  return path.join(dayFolder(root), "sessions.json");
}

function jsonlPath(root: string, sessionId: string): string {
  return path.join(dayFolder(root), `${sessionId}.jsonl`);
}

function jsonlRecords(text: string): Record<string, unknown>[] {
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function assertJsonNumberTurns(text: string, expected: number[]): Record<string, unknown>[] {
  const records = jsonlRecords(text);
  assert.deepEqual(
    records.map((row) => row.turn),
    expected,
  );
  for (const row of records) {
    assert.equal(typeof row.turn, "number");
  }
  return records;
}

function mdPath(root: string, sessionId: string): string {
  return path.join(dayFolder(root), `${sessionId}.md`);
}

async function readEvents(root: string): Promise<unknown[]> {
  const text = await readFile(eventsPath(root), "utf8");
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

async function ingestNamed(
  root: string,
  payload: Record<string, unknown>,
  harness: string,
  event: string,
): Promise<void> {
  await ingestHook({
    stdinText: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: root },
    cwd: root,
    now,
    harness,
    event,
  });
}

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

describe("ingestHook", () => {
  test("object stdin with CURSOR_PROJECT_DIR writes a verbatim jsonl line and new session id", async () => {
    const root = await makeRoot();
    const payload = {
      hook_event_name: "sessionStart",
      session_id: "sess-1",
      prompt: "",
      items: [],
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: "/unused",
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const line = events[0] as Record<string, unknown>;
    assert.equal("harness" in line, false);
    assert.equal("hookEvent" in line, false);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
  });

  test("no session id writes the jsonl line and leaves sessions.json as []", async () => {
    const root = await makeRoot();
    const payload = {
      hook_event_name: "sessionStart",
      sessionId: "copilot-ignored",
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(root));
    assert.equal(
      names.filter((name) => name.endsWith(".yaml")).length,
      0,
    );
    assert.equal(names.filter((name) => name.endsWith(".md")).length, 0);
  });

  test("unknown event name is still persisted", async () => {
    const root = await makeRoot();
    const payload = {
      hook_event_name: "beforeSubmitPrompt",
      session_id: "s",
      prompt: "x",
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
  });

  test("decodes UTF-8 BOM bytes before JSON", () => {
    const payload = { hook_event_name: "sessionStart" };
    const buf = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(JSON.stringify(payload)),
    ]);
    assert.deepEqual(JSON.parse(decodeHookStdin(buf)), payload);
  });

  test("parses stdin with a leading UTF-8 BOM", async () => {
    const root = await makeRoot();
    const payload = { hook_event_name: "sessionEnd", session_id: "bom" };
    await ingestHook({
      stdinText: `\uFEFF${JSON.stringify(payload)}`,
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
  });

  test("parses UTF-16 LE stdin from Windows PowerShell pipes", async () => {
    const root = await makeRoot();
    const payload = { hook_event_name: "stop", session_id: "utf16" };
    const stdinText = decodeHookStdin(
      Buffer.from(`\uFEFF${JSON.stringify(payload)}`, "utf16le"),
    );
    await ingestHook({
      stdinText,
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
  });

  test("decodes UTF-16 LE JSON without a BOM", () => {
    const payload = { hook_event_name: "stop" };
    const text = decodeHookStdin(Buffer.from(JSON.stringify(payload), "utf16le"));
    assert.deepEqual(JSON.parse(text), payload);
  });

  test("decodes UTF-16 BE JSON with a BOM", () => {
    const payload = { hook_event_name: "stop" };
    const body = Buffer.from(JSON.stringify(payload), "utf16le");
    body.swap16();
    const buf = Buffer.concat([Buffer.from([0xfe, 0xff]), body]);
    assert.deepEqual(JSON.parse(decodeHookStdin(buf)), payload);
  });

  test("decodes UTF-16 BE JSON starting with brace and no BOM", () => {
    const payload = { hook_event_name: "stop" };
    const buf = Buffer.from(JSON.stringify(payload), "utf16le");
    buf.swap16();
    assert.deepEqual(JSON.parse(decodeHookStdin(buf)), payload);
  });

  test("decodes plain UTF-8 JSON", () => {
    const payload = { hook_event_name: "sessionStart" };
    const buf = Buffer.from(JSON.stringify(payload), "utf8");
    assert.deepEqual(JSON.parse(decodeHookStdin(buf)), payload);
  });

  test("parses CRLF-wrapped and double-encoded JSON stdin", async () => {
    const root = await makeRoot();
    const payload = { hook_event_name: "sessionStart", session_id: "dbl" };
    await ingestHook({
      stdinText: `\r\n${JSON.stringify(JSON.stringify(payload))}\r\n`,
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
  });

  test("swallows non-JSON stdin and writes no file", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: "not-json",
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    await assert.rejects(readFile(eventsPath(root)));
  });

  test("swallows JSON array and primitive stdin", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: "[1]",
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    await ingestHook({
      stdinText: "1",
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    await assert.rejects(readFile(eventsPath(root)));
  });

  test("swallows persist throw and leaves existing JSONL valid", async () => {
    const root = await makeRoot();
    const folder = dayFolder(root);
    await mkdir(folder, { recursive: true });
    await writeFile(eventsPath(root), `${JSON.stringify({ keep: true })}\n`);
    await mkdir(path.join(folder, "ingest.lock"));
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "new" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { keep: true });
  });

  test("session id with cursor sessionStart writes jsonl index and one Session JSONL object", async () => {
    const root = await makeRoot();
    const payload = {
      hook_event_name: "sessionStart",
      session_id: "sess-1",
      prompt: "",
      items: [],
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: "/unused",
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const line = events[0] as Record<string, unknown>;
    assert.equal("timestamp" in line, false);
    assert.equal("harness" in line, false);
    assert.equal("hookEvent" in line, false);
    assert.equal("turn" in line, false);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      jsonl,
      "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal(jsonlRecords(jsonl).length, 1);
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(jsonl), "sess-1"));
    assert.equal(jsonl.includes("sessionEnd"), false);
  });

  test("AC-F003.6 sequential sessionStart then subagentStart yields two independent JSON objects with no nesting", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const first = await readFile(jsonlPath(root, "sess-1"));
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", subagent_type: "explore" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    const second = await readFile(jsonlPath(root, "sess-1"));
    assert.ok(second.subarray(0, first.length).equals(first));
    const jsonl = second.toString("utf8");
    const records = jsonlRecords(jsonl);
    assert.equal(records.length, 2);
    assert.equal(records[0]?.event, "sessionStart");
    assert.equal(records[1]?.event, "subagentStart");
    assert.equal(records[1]?.subagent, "explore");
    assert.equal("subagent" in (records[0] ?? {}), false);
    for (const row of records) {
      for (const value of Object.values(row)) {
        if (value === null) continue;
        assert.notEqual(typeof value, "object");
      }
    }
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(jsonl), "sess-1"));
  });

  test("AC-F003.16 unrecognized harness and event still write four-header-only JSON object when no matching subagent key", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", reason: "completed" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "unknown",
      event: "nope",
    });
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const row = jsonlRecords(jsonl)[0] ?? {};
    assert.deepEqual(Object.keys(row), ["harness", "event", "timestamp", "turn"]);
    assert.equal("reason" in row, false);
  });

  test("AC-F003.16 missing positionals still write a Session JSONL log object with empty harness and event when no matching subagent key", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const row = jsonlRecords(jsonl)[0] ?? {};
    assert.deepEqual(Object.keys(row), ["harness", "event", "timestamp", "turn"]);
    assert.equal(row.harness, "");
    assert.equal(row.event, "");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(jsonl), "sess-1"));
    assert.equal(jsonl.includes("sessionEnd"), false);
  });

  test("AC-F003.4 payload without timestamp uses now in the Session JSONL object and Event log stays equal", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", prompt: "hi" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "beforeSubmitPrompt",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.ok(jsonl.includes('"timestamp":"15:00:00"'));
    assert.equal("timestamp" in (events[0] as Record<string, unknown>), false);
  });

  test("AC-F005.6 cursor beforeSubmitPrompt with prompt writes jsonl index yaml and md", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", prompt: "hello" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "beforeSubmitPrompt",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":1,\"prompt\":\"hello\"}\n",
    );
    assert.equal("session_id" in jsonlRecords(yaml)[0]!, false);
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
  });

  test("AC-F005.6 cursor beforeSubmitPrompt without prompt writes yaml header only", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "beforeSubmitPrompt",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":1}\n",
    );
    assert.equal(yaml.includes("prompt:"), false);
  });

  test("beforeSubmitPrompt with only Copilot sessionId writes jsonl and no yaml or md", async () => {
    const root = await makeRoot();
    const payload = { sessionId: "copilot-ignored" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "beforeSubmitPrompt",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(root));
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
    assert.equal(names.filter((name) => name.endsWith(".md")).length, 0);
  });

  test("AC-F006.8 subagentStart subagentStop and stop keep transcript_path on jsonl not yaml", async () => {
    const root = await makeRoot();
    const startPayload = {
      session_id: "sess-1",
      subagent_type: "explore",
      transcript_path: "/tmp/t",
    };
    await ingestHook({
      stdinText: JSON.stringify(startPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    const stopPayload = {
      session_id: "sess-1",
      subagent_type: "explore",
      transcript_path: "/tmp/t",
      summary: "done",
    };
    await ingestHook({
      stdinText: JSON.stringify(stopPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStop",
    });
    const agentStopPayload = { session_id: "sess-1", transcript_path: "/tmp/t" };
    await ingestHook({
      stdinText: JSON.stringify(agentStopPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "stop",
    });
    const events = await readEvents(root);
    assert.deepEqual(events, [startPayload, stopPayload, agentStopPayload]);
    assert.equal((events[0] as Record<string, unknown>).transcript_path, "/tmp/t");
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(yaml.includes("transcript_path"), false);
    assert.ok(yaml.includes('"subagent":"explore"'));
    assert.ok(yaml.includes('"response_text":"done"'));
    const stopDoc = jsonlRecords(yaml).find((row) => row.event === "stop");
    assert.ok(stopDoc !== undefined);
    assert.deepEqual(stopDoc, {
      harness: "cursor",
      event: "stop",
      timestamp: "15:00:00",
      turn: 0,
    });
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
  });

  test("AC-F006.8 cursor stop with session id writes jsonl index and header-only yaml", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", transcript_path: "/tmp/t" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: "/unused",
      now,
      harness: "cursor",
      event: "stop",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      "{\"harness\":\"cursor\",\"event\":\"stop\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal(yaml.includes("transcript_path"), false);
    assert.equal("session_id" in jsonlRecords(yaml)[0]!, false);
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
    assert.equal(yaml.includes("sessionEnd"), false);
  });

  test("stop with only Copilot sessionId writes jsonl and no yaml", async () => {
    const root = await makeRoot();
    const payload = { sessionId: "copilot-ignored" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "stop",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(root));
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
    assert.equal(names.filter((name) => name.endsWith(".md")).length, 0);
  });

  test("AC-F006.5 cursor subagentStart keeps task on jsonl and yaml after subagent", async () => {
    const root = await makeRoot();
    const payload = {
      session_id: "sess-1",
      subagent_type: "explore",
      task: "do the thing",
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    assert.equal((events[0] as Record<string, unknown>).task, "do the thing");
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"task\":\"do the thing\"}\n",
    );
  });

  test("copilot and claude-code subagentStart omit task from yaml", async () => {
    const root = await makeRoot();
    const copilotPayload = {
      session_id: "sess-1",
      agentName: "explore",
      task: "do the thing",
    };
    await ingestHook({
      stdinText: JSON.stringify(copilotPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    const claudePayload = {
      session_id: "sess-2",
      agent_type: "explore",
      task: "do the thing",
    };
    await ingestHook({
      stdinText: JSON.stringify(claudePayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "claude-code",
      event: "SubagentStart",
    });
    const copilotYaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.ok(copilotYaml.includes('"subagent":"explore"'));
    assert.equal(copilotYaml.includes("task:"), false);
    assert.equal(copilotYaml.includes("agent_display_name:"), false);
    const claudeYaml = await readFile(jsonlPath(root, "sess-2"), "utf8");
    assert.ok(claudeYaml.includes('"subagent":"explore"'));
    assert.equal(claudeYaml.includes("task:"), false);
    assert.equal(claudeYaml.includes("agent_display_name:"), false);
  });

  test("AC-F007.2 AC-F007.6 copilot subagentStart maps agentDisplayName after subagent and keeps jsonl verbatim", async () => {
    const root = await makeRoot();
    const payload = {
      session_id: "sess-1",
      agentName: "explore",
      agentDisplayName: "Explore",
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    assert.equal((events[0] as Record<string, unknown>).agentDisplayName, "Explore");
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      "{\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"agent_display_name\":\"Explore\"}\n",
    );
    assert.equal(yaml.includes("task:"), false);
    assert.equal(yaml.includes('"subagent":"Explore"'), false);
    assert.equal(yaml.includes("agent_type:"), false);
  });

  test("AC-F007.3 AC-F007.6 copilot subagentStop maps agentDisplayName after subagent then response_text", async () => {
    const root = await makeRoot();
    const payload = {
      session_id: "sess-1",
      agentType: "explore",
      agentDisplayName: "Explore",
      response: "done",
    };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStop",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    assert.equal((events[0] as Record<string, unknown>).agentDisplayName, "Explore");
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      "{\"harness\":\"copilot\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"agent_display_name\":\"Explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal(yaml.includes('"subagent":"Explore"'), false);
    assert.equal(yaml.includes("agent_type:"), false);
  });

  test("copilot start and stop omit agent_display_name when agentDisplayName is absent", async () => {
    const root = await makeRoot();
    const startPayload = {
      session_id: "sess-1",
      agentName: "explore",
      agentDescription: "Explore",
      task: "do the thing",
    };
    await ingestHook({
      stdinText: JSON.stringify(startPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    const stopPayload = {
      session_id: "sess-1",
      agentType: "explore",
      agentDescription: "Explore",
      task: "do the thing",
      response: "done",
    };
    await ingestHook({
      stdinText: JSON.stringify(stopPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStop",
    });
    const startYaml = jsonlRecords(await readFile(jsonlPath(root, "sess-1"), "utf8")).find(
      (row) => row.event === "subagentStart",
    );
    assert.ok(startYaml !== undefined);
    assert.equal("agent_display_name" in startYaml, false);
    assert.equal(startYaml.subagent, "explore");
    const stopYaml = jsonlRecords(await readFile(jsonlPath(root, "sess-1"), "utf8")).find(
      (row) => row.event === "subagentStop",
    );
    assert.ok(stopYaml !== undefined);
    assert.equal("agent_display_name" in stopYaml, false);
    assert.equal(stopYaml.subagent, "explore");
    assert.equal(stopYaml.response_text, "done");
  });

  test("cursor and claude-code subagent start and stop omit agent_display_name with trap agentDisplayName", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-cursor",
        subagent_type: "explore",
        agentDisplayName: "Explore",
        task: "do the thing",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-cursor",
        subagent_type: "explore",
        agentDisplayName: "Explore",
        summary: "done",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStop",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-claude",
        agent_type: "explore",
        agentDisplayName: "Explore",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "claude-code",
      event: "SubagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-claude",
        agent_type: "explore",
        agentDisplayName: "Explore",
        last_assistant_message: "done",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "claude-code",
      event: "SubagentStop",
    });
    const cursorYaml = await readFile(jsonlPath(root, "sess-cursor"), "utf8");
    assert.equal(cursorYaml.includes("agent_display_name:"), false);
    assert.ok(cursorYaml.includes('"subagent":"explore"'));
    assert.ok(cursorYaml.includes('"task":"do the thing"'));
    const claudeYaml = await readFile(jsonlPath(root, "sess-claude"), "utf8");
    assert.equal(claudeYaml.includes("agent_display_name:"), false);
    assert.ok(claudeYaml.includes('"subagent":"explore"'));
    assert.ok(claudeYaml.includes('"response_text":"done"'));
  });

  test("copilot sessionId alone on subagent start and stop writes jsonl and no yaml", async () => {
    const root = await makeRoot();
    const startPayload = {
      sessionId: "copilot-ignored",
      agentName: "explore",
      agentDisplayName: "Explore",
    };
    await ingestHook({
      stdinText: JSON.stringify(startPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    const stopPayload = {
      sessionId: "copilot-ignored",
      agentType: "explore",
      agentDisplayName: "Explore",
      response: "done",
    };
    await ingestHook({
      stdinText: JSON.stringify(stopPayload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStop",
    });
    const events = await readEvents(root);
    assert.deepEqual(events, [startPayload, stopPayload]);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(root));
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
  });

  test("ingestHook resolves for beforeSubmitPrompt and transcript_path payloads", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", prompt: "hello" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "beforeSubmitPrompt",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        subagent_type: "explore",
        transcript_path: "/tmp/t",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        subagent_type: "explore",
        transcript_path: "/tmp/t",
        summary: "done",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStop",
    });
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", transcript_path: "/tmp/t" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "stop",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        subagent_type: "explore",
        task: "do the thing",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", subagent_type: "explore" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        agentName: "explore",
        task: "do the thing",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        agent_type: "explore",
        task: "do the thing",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "claude-code",
      event: "SubagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        agentName: "explore",
        agentDisplayName: "Explore",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        agentType: "explore",
        agentDisplayName: "Explore",
        response: "done",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStop",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        agentName: "explore",
        agentDescription: "Explore",
        task: "do the thing",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        subagent_type: "explore",
        agentDisplayName: "Explore",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "subagentStart",
    });
    await ingestHook({
      stdinText: JSON.stringify({
        session_id: "sess-1",
        agent_type: "explore",
        agentDisplayName: "Explore",
        last_assistant_message: "done",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "claude-code",
      event: "SubagentStop",
    });
  });

  test("cursor sessionEnd writes md matching emitSessionReport of the yaml", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", reason: "completed" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: "/unused",
      now,
      harness: "cursor",
      event: "sessionEnd",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
  });

  test("sessionStart with a session id writes yaml and md", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
    assert.equal(yaml.includes("sessionEnd"), false);
  });

  test("sessionStart writes md even when payload hook_event_name is sessionEnd", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({
        hook_event_name: "sessionEnd",
        session_id: "sess-1",
        reason: "completed",
      }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
    assert.ok(yaml.includes('"event":"sessionStart"'));
  });

  test("Claude SessionEnd positional writes md", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", reason: "clear" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "claude-code",
      event: "SessionEnd",
    });
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
    assert.ok(yaml.includes('"event":"SessionEnd"'));
  });

  test("Copilot sessionId only with sessionEnd writes jsonl and no yaml or md", async () => {
    const root = await makeRoot();
    const payload = { sessionId: "copilot-ignored" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "sessionEnd",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(root));
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
    assert.equal(names.filter((name) => name.endsWith(".md")).length, 0);
  });

  test("Copilot sessionId only with sessionStart writes jsonl and no yaml or md", async () => {
    const root = await makeRoot();
    const payload = { sessionId: "copilot-ignored" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "copilot",
      event: "sessionStart",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(root));
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
    assert.equal(names.filter((name) => name.endsWith(".md")).length, 0);
  });

  test("later YAML append the same day overwrites md from the yaml", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const firstMd = await readFile(mdPath(root, "sess-1"), "utf8");
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", prompt: "hello" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "beforeSubmitPrompt",
    });
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
    assert.equal(md.includes("## Overview"), true);
    assert.equal(md.split("## Overview").length - 1, 1);
    assert.ok(yaml.includes('"prompt":"hello"'));
    assert.notEqual(md, firstMd);
    const docs = parseSessionRecords(yaml);
    const eventRows = md.split("\n").filter((line) => /^\| \d{2}:/.test(line));
    assert.equal(eventRows.length, docs.length);
    assert.ok(md.includes("| Time | Event | Subagent | Details |"));
    assert.ok(md.includes("| event | count |"));
    assert.ok(md.includes("| harness |"));
    assert.equal(md.includes("| Time | Event | Details |"), false);
  });

  test("md is derived from yaml without consulting jsonl", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseSessionRecords(yaml), "sess-1"));
  });

  test("report write failure still persists jsonl yaml and index", async () => {
    const root = await makeRoot();
    const folder = dayFolder(root);
    await mkdir(folder, { recursive: true });
    await mkdir(path.join(folder, "sess-1.md"));
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    const yaml = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.ok(yaml.includes('"session_id":"sess-1"'));
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
    const mdInfo = await stat(path.join(folder, "sess-1.md"));
    assert.equal(mdInfo.isDirectory(), true);
  });

  test("AC-F008.1 AC-F008.2 AC-F008.3 AC-F008.5 sessionStart then prompt then two stops then second prompt numbers turns 0 1 1 1 2", async () => {
    const root = await makeRoot();
    const start = { session_id: "sess-1" };
    const firstPrompt = { session_id: "sess-1", prompt: "one" };
    const stopA = { session_id: "sess-1", transcript_path: "/tmp/a" };
    const stopB = { session_id: "sess-1", transcript_path: "/tmp/b" };
    const secondPrompt = { session_id: "sess-1", prompt: "two" };
    await ingestNamed(root, start, "cursor", "sessionStart");
    await ingestNamed(root, firstPrompt, "cursor", "beforeSubmitPrompt");
    await ingestNamed(root, stopA, "cursor", "stop");
    await ingestNamed(root, stopB, "cursor", "stop");
    await ingestNamed(root, secondPrompt, "cursor", "beforeSubmitPrompt");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const docs = assertJsonNumberTurns(jsonl, [0, 1, 1, 1, 2]);
    assert.equal(docs[0]?.event, "sessionStart");
    assert.equal(docs[1]?.event, "beforeSubmitPrompt");
    assert.equal(docs[2]?.event, "stop");
    assert.equal(docs[3]?.event, "stop");
    assert.equal(docs[4]?.event, "beforeSubmitPrompt");
    const events = await readEvents(root);
    assert.deepEqual(events, [start, firstPrompt, stopA, stopB, secondPrompt]);
    for (const row of events) {
      assert.equal("turn" in (row as Record<string, unknown>), false);
    }
  });

  test("AC-F008.2 AC-F008.3 Copilot userPromptSubmitted first prompt is turn 1 then later 2", async () => {
    const root = await makeRoot();
    const first = { session_id: "sess-1", prompt: "one" };
    const second = { session_id: "sess-1", prompt: "two" };
    await ingestNamed(root, first, "copilot", "userPromptSubmitted");
    await ingestNamed(root, second, "copilot", "userPromptSubmitted");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assertJsonNumberTurns(jsonl, [1, 2]);
    assert.ok(jsonl.includes('"event":"userPromptSubmitted"'));
    const events = await readEvents(root);
    assert.deepEqual(events, [first, second]);
    for (const row of events) {
      assert.equal("turn" in (row as Record<string, unknown>), false);
    }
  });

  test("AC-F008.2 AC-F008.3 Claude UserPromptSubmit first prompt is turn 1 then later 2", async () => {
    const root = await makeRoot();
    const first = { session_id: "sess-1", prompt: "one" };
    const second = { session_id: "sess-1", prompt: "two" };
    await ingestNamed(root, first, "claude-code", "UserPromptSubmit");
    await ingestNamed(root, second, "claude-code", "UserPromptSubmit");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assertJsonNumberTurns(jsonl, [1, 2]);
    assert.ok(jsonl.includes('"event":"UserPromptSubmit"'));
    const events = await readEvents(root);
    assert.deepEqual(events, [first, second]);
    for (const row of events) {
      assert.equal("turn" in (row as Record<string, unknown>), false);
    }
  });

  test("AC-F008.2 payload hook_event_name prompt with positional stop does not increment", async () => {
    const root = await makeRoot();
    const payload = {
      session_id: "sess-1",
      hook_event_name: "beforeSubmitPrompt",
    };
    await ingestNamed(root, payload, "cursor", "stop");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      jsonl,
      "{\"harness\":\"cursor\",\"event\":\"stop\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    const row = assertJsonNumberTurns(jsonl, [0])[0] ?? {};
    assert.equal(row.event, "stop");
    assert.equal("session_id" in row, false);
    const events = await readEvents(root);
    assert.deepEqual(events, [payload]);
    assert.equal("turn" in (events[0] as Record<string, unknown>), false);
  });

  test("AC-F008.4 later append leaves prior JSONL object bytes including turn unchanged", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const first = await readFile(jsonlPath(root, "sess-1"));
    const firstText = first.toString("utf8");
    assertJsonNumberTurns(firstText, [0]);
    assert.ok(firstText.includes('"turn":0'));
    await ingestNamed(
      root,
      { session_id: "sess-1", prompt: "hello" },
      "cursor",
      "beforeSubmitPrompt",
    );
    const second = await readFile(jsonlPath(root, "sess-1"));
    assert.ok(second.subarray(0, first.length).equals(first));
    assertJsonNumberTurns(second.toString("utf8"), [0, 1]);
    assert.ok(second.toString("utf8").includes('"turn":1'));
  });

  test("AC-F008.1 AC-F008.3 AC-F008.5 missing Session JSONL first sessionStart writes turn 0", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      jsonl,
      "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assertJsonNumberTurns(jsonl, [0]);
  });

  test("AC-F008.1 AC-F008.3 AC-F008.5 missing Session JSONL first stop writes turn 0", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "stop");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      jsonl,
      "{\"harness\":\"cursor\",\"event\":\"stop\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assertJsonNumberTurns(jsonl, [0]);
  });

  test("AC-F008.1 AC-F008.3 AC-F008.5 missing Session JSONL first prompt writes turn 1", async () => {
    const root = await makeRoot();
    await ingestNamed(
      root,
      { session_id: "sess-1", prompt: "hello" },
      "cursor",
      "beforeSubmitPrompt",
    );
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      jsonl,
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":1,\"prompt\":\"hello\"}\n",
    );
    assertJsonNumberTurns(jsonl, [1]);
  });

  test("AC-F003.14 prompt after sessionStart omits session_id", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    await ingestNamed(
      root,
      { session_id: "sess-1", prompt: "hello" },
      "cursor",
      "beforeSubmitPrompt",
    );
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const docs = jsonlRecords(jsonl);
    assert.equal(docs.length, 2);
    assert.equal(docs[0]?.session_id, "sess-1");
    assert.equal("session_id" in (docs[1] ?? {}), false);
    assert.equal(Object.keys(docs[1] ?? {})[0], "harness");
  });

  test("AC-F003.14 second sessionStart omits session_id", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const docs = jsonlRecords(jsonl);
    assert.equal(docs.filter((row) => "session_id" in row).length, 1);
    assert.equal(docs[0]?.session_id, "sess-1");
    assert.equal("session_id" in (docs[1] ?? {}), false);
  });

  test("AC-F003.14 first prompt then sessionStart never writes session_id", async () => {
    const root = await makeRoot();
    await ingestNamed(
      root,
      { session_id: "sess-1", prompt: "hello" },
      "cursor",
      "beforeSubmitPrompt",
    );
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(
      jsonlRecords(jsonl).every((row) => !("session_id" in row)),
      true,
    );
    assert.ok(jsonl.includes('"event":"sessionStart"'));
  });

  test("AC-F003.16 unmapped sessionStart is five header-only when no matching subagent key; unmapped prompt is four", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", reason: "completed" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "unknown",
      event: "sessionStart",
    });
    const startJsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const startRow = jsonlRecords(startJsonl)[0] ?? {};
    assert.deepEqual(Object.keys(startRow), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    assert.equal("reason" in startRow, false);
    const root2 = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-2", prompt: "hello" }),
      env: { CURSOR_PROJECT_DIR: root2 },
      cwd: root2,
      now,
      harness: "unknown",
      event: "beforeSubmitPrompt",
    });
    const promptJsonl = await readFile(jsonlPath(root2, "sess-2"), "utf8");
    const promptRow = jsonlRecords(promptJsonl)[0] ?? {};
    assert.deepEqual(Object.keys(promptRow), ["harness", "event", "timestamp", "turn"]);
    assert.equal("prompt" in promptRow, false);
    assert.equal("session_id" in promptRow, false);
  });

  test("AC-F003.16 AC-F003.17 unmapped initial sessionStart with subagent_type writes five headers then subagent", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", subagent_type: "explore", reason: "completed" };
    await ingestHook({
      stdinText: JSON.stringify(payload),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "unknown",
      event: "sessionStart",
    });
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const row = jsonlRecords(jsonl)[0] ?? {};
    assert.deepEqual(Object.keys(row), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
      "subagent",
    ]);
    assert.equal(row.subagent, "explore");
    assert.equal("reason" in row, false);
    assert.equal("agent_type" in row, false);
  });

  test("AC-F003.5 AC-F003.17 every Cursor event with subagent_type writes verbatim Event log and Session JSONL subagent after header", async () => {
    const cases: { event: string; payload: Record<string, unknown>; expected: Record<string, unknown> }[] = [
      {
        event: "sessionStart",
        payload: { session_id: "sess-start", subagent_type: "explore" },
        expected: {
          session_id: "sess-start",
          harness: "cursor",
          event: "sessionStart",
          timestamp: "15:00:00",
          turn: 0,
          subagent: "explore",
        },
      },
      {
        event: "sessionEnd",
        payload: { session_id: "sess-end", subagent_type: "explore", reason: "completed" },
        expected: {
          harness: "cursor",
          event: "sessionEnd",
          timestamp: "15:00:00",
          turn: 0,
          subagent: "explore",
          reason: "completed",
        },
      },
      {
        event: "beforeSubmitPrompt",
        payload: { session_id: "sess-prompt", subagent_type: "explore", prompt: "hello" },
        expected: {
          harness: "cursor",
          event: "beforeSubmitPrompt",
          timestamp: "15:00:00",
          turn: 1,
          subagent: "explore",
          prompt: "hello",
        },
      },
      {
        event: "stop",
        payload: { session_id: "sess-stop", subagent_type: "explore" },
        expected: {
          harness: "cursor",
          event: "stop",
          timestamp: "15:00:00",
          turn: 0,
          subagent: "explore",
        },
      },
      {
        event: "subagentStart",
        payload: { session_id: "sess-sub-start", subagent_type: "explore", task: "do the thing" },
        expected: {
          harness: "cursor",
          event: "subagentStart",
          timestamp: "15:00:00",
          turn: 0,
          subagent: "explore",
          task: "do the thing",
        },
      },
      {
        event: "subagentStop",
        payload: { session_id: "sess-sub-stop", subagent_type: "explore", summary: "done" },
        expected: {
          harness: "cursor",
          event: "subagentStop",
          timestamp: "15:00:00",
          turn: 0,
          subagent: "explore",
          response_text: "done",
        },
      },
    ];
    for (const row of cases) {
      const root = await makeRoot();
      await ingestNamed(root, row.payload, "cursor", row.event);
      const events = await readEvents(root);
      assert.deepEqual(events[0], row.payload);
      assert.equal((events[0] as Record<string, unknown>).subagent_type, "explore");
      assert.equal("subagent" in (events[0] as Record<string, unknown>), false);
      const jsonl = await readFile(jsonlPath(root, String(row.payload.session_id)), "utf8");
      const parsed = jsonlRecords(jsonl)[0] ?? {};
      assert.deepEqual(parsed, row.expected);
      assert.equal("agent_type" in parsed, false);
      const keys = Object.keys(parsed);
      const turnAt = keys.indexOf("turn");
      const subagentAt = keys.indexOf("subagent");
      assert.ok(turnAt >= 0);
      assert.equal(subagentAt, turnAt + 1);
    }
  });

  test("harness does not pick the subagent source key", async () => {
    const payload = { session_id: "sess-1", subagent_type: "explore" };
    const copilotRoot = await makeRoot();
    await ingestNamed(copilotRoot, payload, "copilot", "subagentStart");
    const copilotEvents = await readEvents(copilotRoot);
    assert.deepEqual(copilotEvents[0], payload);
    const copilotJsonl = await readFile(jsonlPath(copilotRoot, "sess-1"), "utf8");
    const copilotRow = jsonlRecords(copilotJsonl)[0] ?? {};
    assert.equal(copilotRow.subagent, "explore");
    assert.equal("agent_type" in copilotRow, false);
    const emptyRoot = await makeRoot();
    await ingestNamed(emptyRoot, payload, "", "stop");
    const emptyJsonl = await readFile(jsonlPath(emptyRoot, "sess-1"), "utf8");
    assert.equal(
      emptyJsonl,
      "{\"harness\":\"\",\"event\":\"stop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
  });

  test("AC-F003.16 AC-F003.17 unknown harness and unmapped event still write header plus subagent", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", subagent_type: "explore", reason: "completed" };
    await ingestNamed(root, payload, "other", "workspaceOpen");
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const jsonl = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const row = jsonlRecords(jsonl)[0] ?? {};
    assert.deepEqual(Object.keys(row), ["harness", "event", "timestamp", "turn", "subagent"]);
    assert.equal(row.subagent, "explore");
    assert.equal("reason" in row, false);
    const copilotRoot = await makeRoot();
    const copilotOnly = { sessionId: "copilot-ignored", subagent_type: "explore" };
    await ingestNamed(copilotRoot, copilotOnly, "copilot", "subagentStart");
    const copilotEvents = await readEvents(copilotRoot);
    assert.deepEqual(copilotEvents[0], copilotOnly);
    const sessions = JSON.parse(await readFile(sessionsPath(copilotRoot), "utf8"));
    assert.deepEqual(sessions, []);
    const names = await readdir(dayFolder(copilotRoot));
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
  });

  test("AC-F003.17 ingestHook subagent preference order and trap-only omit", async () => {
    const prefRoot = await makeRoot();
    const allFour = {
      session_id: "sess-pref",
      subagent_type: "from-subagent-type",
      agent_type: "from-agent-type",
      agentType: "from-agentType",
      agentName: "from-agentName",
    };
    await ingestNamed(prefRoot, allFour, "cursor", "stop");
    const prefEvents = await readEvents(prefRoot);
    assert.deepEqual(prefEvents[0], allFour);
    const prefJsonl = await readFile(jsonlPath(prefRoot, "sess-pref"), "utf8");
    assert.equal(jsonlRecords(prefJsonl)[0]?.subagent, "from-subagent-type");
    assert.equal(prefJsonl.includes('"subagent":"from-agent-type"'), false);
    const stopRoot = await makeRoot();
    const copilotStop = {
      session_id: "sess-stop",
      agentType: "from-agentType",
      agentName: "from-agentName",
    };
    await ingestNamed(stopRoot, copilotStop, "copilot", "subagentStop");
    const stopJsonl = await readFile(jsonlPath(stopRoot, "sess-stop"), "utf8");
    assert.equal(jsonlRecords(stopJsonl)[0]?.subagent, "from-agentType");
    assert.equal(stopJsonl.includes('"subagent":"from-agentName"'), false);
    const trapRoot = await makeRoot();
    const traps = {
      session_id: "sess-trap",
      agentDisplayName: "Explore",
      agentDescription: "Explore",
      agentId: "id-1",
      subagent_id: "sub-1",
      task: "do the thing",
    };
    await ingestNamed(trapRoot, traps, "cursor", "subagentStart");
    const trapEvents = await readEvents(trapRoot);
    assert.deepEqual(trapEvents[0], traps);
    const trapRow = jsonlRecords(await readFile(jsonlPath(trapRoot, "sess-trap"), "utf8"))[0] ?? {};
    assert.equal("subagent" in trapRow, false);
    assert.equal(trapRow.task, "do the thing");
    const displayRoot = await makeRoot();
    const display = {
      session_id: "sess-display",
      agentName: "explore",
      agentDisplayName: "Explore",
    };
    await ingestNamed(displayRoot, display, "copilot", "subagentStart");
    const displayJsonl = await readFile(jsonlPath(displayRoot, "sess-display"), "utf8");
    assert.equal(
      displayJsonl,
      "{\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"agent_display_name\":\"Explore\"}\n",
    );
    assert.equal(displayJsonl.includes('"subagent":"Explore"'), false);
  });

  test("AC-F003.18 mapped session record is one JSON object not a YAML document", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1", reason: "completed" }, "cursor", "sessionEnd");
    const text = await readFile(jsonlPath(root, "sess-1"), "utf8");
    assert.equal(text.includes("---"), false);
    const records = jsonlRecords(text);
    assert.equal(records.length, 1);
    const row = records[0] ?? {};
    assert.deepEqual(Object.keys(row).slice(0, 4), ["harness", "event", "timestamp", "turn"]);
    assert.equal(row.harness, "cursor");
    assert.equal(row.event, "sessionEnd");
    assert.equal(row.reason, "completed");
    await assert.rejects(stat(path.join(dayFolder(root), "sess-1.yaml")));
  });

  test("AC-F010.1 AC-F010.2 session log is jsonl one object per line", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    await ingestNamed(root, { session_id: "sess-1", prompt: "hi" }, "cursor", "beforeSubmitPrompt");
    const text = await readFile(jsonlPath(root, "sess-1"), "utf8");
    const records = jsonlRecords(text);
    assert.equal(records.length, 2);
    assert.ok(text.endsWith("\n"));
    assert.equal(typeof records[0]?.turn, "number");
    await assert.rejects(stat(path.join(dayFolder(root), "sess-1.yaml")));
  });

  test("AC-F010.4 events.jsonl deep-equals payload with no overlay", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", prompt: "hello" };
    await ingestNamed(root, payload, "cursor", "beforeSubmitPrompt");
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const line = events[0] as Record<string, unknown>;
    assert.equal("harness" in line, false);
    assert.equal("event" in line, false);
    assert.equal("turn" in line, false);
    assert.equal("timestamp" in line, false);
  });

  test("AC-F010.3 planted yaml is unread", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const planted = path.join(dayFolder(root), "sess-1.yaml");
    const plantedBytes = "---\nevent: beforeSubmitPrompt\n";
    await writeFile(planted, plantedBytes);
    await ingestNamed(root, { session_id: "sess-1", prompt: "hi" }, "cursor", "beforeSubmitPrompt");
    assert.equal(await readFile(planted, "utf8"), plantedBytes);
    const records = jsonlRecords(await readFile(jsonlPath(root, "sess-1"), "utf8"));
    assert.equal(records.length, 2);
    assert.equal(records[1]?.turn, 1);
  });

  test("AC-F010.5 Copilot sessionId only writes events.jsonl and no session jsonl", async () => {
    const root = await makeRoot();
    const payload = { sessionId: "copilot-ignored" };
    await ingestNamed(root, payload, "cursor", "sessionStart");
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const names = await readdir(dayFolder(root));
    assert.equal(
      names.filter((name) => name.endsWith(".jsonl") && name !== "events.jsonl").length,
      0,
    );
    assert.equal(names.filter((name) => name.endsWith(".yaml")).length, 0);
    assert.equal(names.filter((name) => name.endsWith(".md")).length, 0);
  });
});
