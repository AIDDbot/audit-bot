import assert from "node:assert";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { decodeHookStdin, ingestHook } from "../src/ingest.ts";
import { dayFolderName } from "../src/project.ts";
import { emitSessionReport, parseYamlDocuments } from "../src/report.ts";

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

function yamlPath(root: string, sessionId: string): string {
  return path.join(dayFolder(root), `${sessionId}.yaml`);
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

  test("session id with cursor sessionStart writes jsonl index and one yaml document", async () => {
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal([...yaml.matchAll(/^---$/gm)].length, 1);
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
    assert.equal(yaml.includes("sessionEnd"), false);
  });

  test("two sequential calls to the same session append two documents", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionStart",
    });
    const first = await readFile(yamlPath(root, "sess-1"));
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1", reason: "completed" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
      harness: "cursor",
      event: "sessionEnd",
    });
    const second = await readFile(yamlPath(root, "sess-1"));
    assert.ok(second.subarray(0, first.length).equals(first));
    const yaml = second.toString("utf8");
    assert.equal([...yaml.matchAll(/^---$/gm)].length, 2);
    assert.ok(yaml.includes("reason: completed"));
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
  });

  test("AC-F003.16 unrecognized harness and event still write four-header-only yaml when no matching subagent key", async () => {
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: unknown",
        "event: nope",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(yaml.includes("reason:"), false);
  });

  test("AC-F003.16 missing positionals still write yaml with empty harness and event when no matching subagent key", async () => {
    const root = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-1" }),
      env: { CURSOR_PROJECT_DIR: root },
      cwd: root,
      now,
    });
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        'harness: ""',
        'event: ""',
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
    assert.equal(yaml.includes("sessionEnd"), false);
  });

  test("payload without timestamp uses now in yaml and jsonl stays equal", async () => {
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.ok(yaml.includes('timestamp: "15:00:00"'));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 1",
        "prompt: hello",
        "",
      ].join("\n"),
    );
    assert.equal([...yaml.matchAll(/^session_id:/gm)].length, 0);
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 1",
        "",
      ].join("\n"),
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(yaml.includes("transcript_path"), false);
    assert.ok(yaml.includes("subagent: explore"));
    assert.ok(yaml.includes("response_text: done"));
    const stopDoc = yaml.split("---\n").find((chunk) => chunk.includes("event: stop"));
    assert.ok(stopDoc !== undefined);
    assert.equal(
      stopDoc,
      [
        "harness: cursor",
        "event: stop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: stop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(yaml.includes("transcript_path"), false);
    assert.equal([...yaml.matchAll(/^session_id:/gm)].length, 0);
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        'task: "do the thing"',
        "",
      ].join("\n"),
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
    const copilotYaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.ok(copilotYaml.includes("subagent: explore"));
    assert.equal(copilotYaml.includes("task:"), false);
    assert.equal(copilotYaml.includes("agent_display_name:"), false);
    const claudeYaml = await readFile(yamlPath(root, "sess-2"), "utf8");
    assert.ok(claudeYaml.includes("subagent: explore"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: copilot",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        "agent_display_name: Explore",
        "",
      ].join("\n"),
    );
    assert.equal(yaml.includes("task:"), false);
    assert.equal(yaml.includes("subagent: Explore"), false);
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: copilot",
        "event: subagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        "agent_display_name: Explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(yaml.includes("subagent: Explore"), false);
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
    const startYaml = (await readFile(yamlPath(root, "sess-1"), "utf8"))
      .split("---\n")
      .find((chunk) => chunk.includes("event: subagentStart"));
    assert.ok(startYaml !== undefined);
    assert.equal(startYaml.includes("agent_display_name:"), false);
    assert.ok(startYaml.includes("subagent: explore"));
    const stopYaml = (await readFile(yamlPath(root, "sess-1"), "utf8"))
      .split("---\n")
      .find((chunk) => chunk.includes("event: subagentStop"));
    assert.ok(stopYaml !== undefined);
    assert.equal(stopYaml.includes("agent_display_name:"), false);
    assert.ok(stopYaml.includes("subagent: explore"));
    assert.ok(stopYaml.includes("response_text: done"));
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
    const cursorYaml = await readFile(yamlPath(root, "sess-cursor"), "utf8");
    assert.equal(cursorYaml.includes("agent_display_name:"), false);
    assert.ok(cursorYaml.includes("subagent: explore"));
    assert.ok(cursorYaml.includes('task: "do the thing"'));
    const claudeYaml = await readFile(yamlPath(root, "sess-claude"), "utf8");
    assert.equal(claudeYaml.includes("agent_display_name:"), false);
    assert.ok(claudeYaml.includes("subagent: explore"));
    assert.ok(claudeYaml.includes("response_text: done"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
    assert.ok(yaml.includes("event: sessionStart"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
    assert.ok(yaml.includes("event: SessionEnd"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
    assert.equal(md.includes("## Overview"), true);
    assert.equal(md.split("## Overview").length - 1, 1);
    assert.ok(yaml.includes("prompt: hello"));
    assert.notEqual(md, firstMd);
    const docs = parseYamlDocuments(yaml);
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const md = await readFile(mdPath(root, "sess-1"), "utf8");
    assert.equal(md, emitSessionReport(parseYamlDocuments(yaml), "sess-1"));
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.ok(yaml.includes("session_id: sess-1"));
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["sess-1"]);
    const mdInfo = await stat(path.join(folder, "sess-1.md"));
    assert.equal(mdInfo.isDirectory(), true);
  });

  test("sessionStart then prompt then two stops then second prompt numbers turns 0 1 1 1 2", async () => {
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const docs = parseYamlDocuments(yaml);
    assert.deepEqual(
      docs.map((doc) => doc.turn),
      [0, 1, 1, 1, 2],
    );
    assert.ok(yaml.includes("event: sessionStart"));
    assert.ok(yaml.includes("event: beforeSubmitPrompt"));
    assert.ok(yaml.includes("event: stop"));
    const events = await readEvents(root);
    assert.deepEqual(events, [start, firstPrompt, stopA, stopB, secondPrompt]);
    for (const row of events) {
      assert.equal("turn" in (row as Record<string, unknown>), false);
    }
  });

  test("Copilot userPromptSubmitted first prompt is turn 1 then later 2", async () => {
    const root = await makeRoot();
    const first = { session_id: "sess-1", prompt: "one" };
    const second = { session_id: "sess-1", prompt: "two" };
    await ingestNamed(root, first, "copilot", "userPromptSubmitted");
    await ingestNamed(root, second, "copilot", "userPromptSubmitted");
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const docs = parseYamlDocuments(yaml);
    assert.deepEqual(
      docs.map((doc) => doc.turn),
      [1, 2],
    );
    assert.ok(yaml.includes("event: userPromptSubmitted"));
    const events = await readEvents(root);
    assert.deepEqual(events, [first, second]);
    for (const row of events) {
      assert.equal("turn" in (row as Record<string, unknown>), false);
    }
  });

  test("Claude UserPromptSubmit first prompt is turn 1 then later 2", async () => {
    const root = await makeRoot();
    const first = { session_id: "sess-1", prompt: "one" };
    const second = { session_id: "sess-1", prompt: "two" };
    await ingestNamed(root, first, "claude-code", "UserPromptSubmit");
    await ingestNamed(root, second, "claude-code", "UserPromptSubmit");
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const docs = parseYamlDocuments(yaml);
    assert.deepEqual(
      docs.map((doc) => doc.turn),
      [1, 2],
    );
    assert.ok(yaml.includes("event: UserPromptSubmit"));
    const events = await readEvents(root);
    assert.deepEqual(events, [first, second]);
    for (const row of events) {
      assert.equal("turn" in (row as Record<string, unknown>), false);
    }
  });

  test("payload hook_event_name prompt with positional stop does not increment", async () => {
    const root = await makeRoot();
    const payload = {
      session_id: "sess-1",
      hook_event_name: "beforeSubmitPrompt",
    };
    await ingestNamed(root, payload, "cursor", "stop");
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: stop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    const events = await readEvents(root);
    assert.deepEqual(events, [payload]);
    assert.equal("turn" in (events[0] as Record<string, unknown>), false);
  });

  test("later append leaves prior document bytes including turn unchanged", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const first = await readFile(yamlPath(root, "sess-1"));
    assert.ok(first.toString("utf8").includes("turn: 0"));
    await ingestNamed(
      root,
      { session_id: "sess-1", prompt: "hello" },
      "cursor",
      "beforeSubmitPrompt",
    );
    const second = await readFile(yamlPath(root, "sess-1"));
    assert.ok(second.subarray(0, first.length).equals(first));
    assert.ok(second.toString("utf8").includes("turn: 1"));
  });

  test("missing yaml first sessionStart writes turn 0", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
  });

  test("missing yaml first stop writes turn 0", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "stop");
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: stop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
  });

  test("missing yaml first prompt writes turn 1", async () => {
    const root = await makeRoot();
    await ingestNamed(
      root,
      { session_id: "sess-1", prompt: "hello" },
      "cursor",
      "beforeSubmitPrompt",
    );
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 1",
        "prompt: hello",
        "",
      ].join("\n"),
    );
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    const docs = yaml.split("---\n").filter((chunk) => chunk.length > 0);
    assert.equal(docs.length, 2);
    assert.ok(docs[0]?.includes("session_id: sess-1"));
    assert.equal(docs[1]?.includes("session_id:"), false);
    assert.ok(docs[1]?.startsWith("harness: cursor\n"));
  });

  test("AC-F003.14 second sessionStart omits session_id", async () => {
    const root = await makeRoot();
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    await ingestNamed(root, { session_id: "sess-1" }, "cursor", "sessionStart");
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal([...yaml.matchAll(/^session_id:/gm)].length, 1);
    const docs = yaml.split("---\n").filter((chunk) => chunk.length > 0);
    assert.ok(docs[0]?.includes("session_id: sess-1"));
    assert.equal(docs[1]?.includes("session_id:"), false);
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal([...yaml.matchAll(/^session_id:/gm)].length, 0);
    assert.ok(yaml.includes("event: beforeSubmitPrompt"));
    assert.ok(yaml.includes("event: sessionStart"));
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
    const startYaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      startYaml,
      [
        "---",
        "session_id: sess-1",
        "harness: unknown",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(startYaml.includes("reason:"), false);
    const root2 = await makeRoot();
    await ingestHook({
      stdinText: JSON.stringify({ session_id: "sess-2", prompt: "hello" }),
      env: { CURSOR_PROJECT_DIR: root2 },
      cwd: root2,
      now,
      harness: "unknown",
      event: "beforeSubmitPrompt",
    });
    const promptYaml = await readFile(yamlPath(root2, "sess-2"), "utf8");
    assert.equal(
      promptYaml,
      [
        "---",
        "harness: unknown",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 1",
        "",
      ].join("\n"),
    );
    assert.equal(promptYaml.includes("prompt:"), false);
    assert.equal(promptYaml.includes("session_id:"), false);
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
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "session_id: sess-1",
        "harness: unknown",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        "",
      ].join("\n"),
    );
    assert.equal(yaml.includes("reason:"), false);
    assert.equal(yaml.includes("agent_type:"), false);
  });

  test("AC-F003.5 AC-F003.17 every Cursor event with subagent_type writes verbatim jsonl and yaml subagent after header", async () => {
    const cases: { event: string; payload: Record<string, unknown>; body: string[] }[] = [
      {
        event: "sessionStart",
        payload: { session_id: "sess-start", subagent_type: "explore" },
        body: ["session_id: sess-start", "harness: cursor", "event: sessionStart", 'timestamp: "15:00:00"', "turn: 0", "subagent: explore"],
      },
      {
        event: "sessionEnd",
        payload: { session_id: "sess-end", subagent_type: "explore", reason: "completed" },
        body: ["harness: cursor", "event: sessionEnd", 'timestamp: "15:00:00"', "turn: 0", "subagent: explore", "reason: completed"],
      },
      {
        event: "beforeSubmitPrompt",
        payload: { session_id: "sess-prompt", subagent_type: "explore", prompt: "hello" },
        body: ["harness: cursor", "event: beforeSubmitPrompt", 'timestamp: "15:00:00"', "turn: 1", "subagent: explore", "prompt: hello"],
      },
      {
        event: "stop",
        payload: { session_id: "sess-stop", subagent_type: "explore" },
        body: ["harness: cursor", "event: stop", 'timestamp: "15:00:00"', "turn: 0", "subagent: explore"],
      },
      {
        event: "subagentStart",
        payload: { session_id: "sess-sub-start", subagent_type: "explore", task: "do the thing" },
        body: ["harness: cursor", "event: subagentStart", 'timestamp: "15:00:00"', "turn: 0", "subagent: explore", 'task: "do the thing"'],
      },
      {
        event: "subagentStop",
        payload: { session_id: "sess-sub-stop", subagent_type: "explore", summary: "done" },
        body: ["harness: cursor", "event: subagentStop", 'timestamp: "15:00:00"', "turn: 0", "subagent: explore", "response_text: done"],
      },
    ];
    for (const row of cases) {
      const root = await makeRoot();
      await ingestNamed(root, row.payload, "cursor", row.event);
      const events = await readEvents(root);
      assert.deepEqual(events[0], row.payload);
      assert.equal((events[0] as Record<string, unknown>).subagent_type, "explore");
      assert.equal("subagent" in (events[0] as Record<string, unknown>), false);
      const yaml = await readFile(yamlPath(root, String(row.payload.session_id)), "utf8");
      assert.equal(yaml, ["---", ...row.body, ""].join("\n"));
      assert.equal(yaml.includes("agent_type:"), false);
    }
  });

  test("harness does not pick the subagent source key", async () => {
    const payload = { session_id: "sess-1", subagent_type: "explore" };
    const copilotRoot = await makeRoot();
    await ingestNamed(copilotRoot, payload, "copilot", "subagentStart");
    const copilotEvents = await readEvents(copilotRoot);
    assert.deepEqual(copilotEvents[0], payload);
    const copilotYaml = await readFile(yamlPath(copilotRoot, "sess-1"), "utf8");
    assert.ok(copilotYaml.includes("subagent: explore"));
    assert.equal(copilotYaml.includes("agent_type:"), false);
    const emptyRoot = await makeRoot();
    await ingestNamed(emptyRoot, payload, "", "stop");
    const emptyYaml = await readFile(yamlPath(emptyRoot, "sess-1"), "utf8");
    assert.equal(
      emptyYaml,
      [
        "---",
        'harness: ""',
        "event: stop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        "",
      ].join("\n"),
    );
  });

  test("AC-F003.16 AC-F003.17 unknown harness and unmapped event still write header plus subagent", async () => {
    const root = await makeRoot();
    const payload = { session_id: "sess-1", subagent_type: "explore", reason: "completed" };
    await ingestNamed(root, payload, "other", "workspaceOpen");
    const events = await readEvents(root);
    assert.deepEqual(events[0], payload);
    const yaml = await readFile(yamlPath(root, "sess-1"), "utf8");
    assert.equal(
      yaml,
      [
        "---",
        "harness: other",
        "event: workspaceOpen",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        "",
      ].join("\n"),
    );
    assert.equal(yaml.includes("reason:"), false);
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
    const prefYaml = await readFile(yamlPath(prefRoot, "sess-pref"), "utf8");
    assert.ok(prefYaml.includes("subagent: from-subagent-type"));
    assert.equal(prefYaml.includes("subagent: from-agent-type"), false);
    const stopRoot = await makeRoot();
    const copilotStop = {
      session_id: "sess-stop",
      agentType: "from-agentType",
      agentName: "from-agentName",
    };
    await ingestNamed(stopRoot, copilotStop, "copilot", "subagentStop");
    const stopYaml = await readFile(yamlPath(stopRoot, "sess-stop"), "utf8");
    assert.ok(stopYaml.includes("subagent: from-agentType"));
    assert.equal(stopYaml.includes("subagent: from-agentName"), false);
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
    const trapYaml = await readFile(yamlPath(trapRoot, "sess-trap"), "utf8");
    assert.equal(trapYaml.includes("subagent:"), false);
    assert.ok(trapYaml.includes('task: "do the thing"'));
    const displayRoot = await makeRoot();
    const display = {
      session_id: "sess-display",
      agentName: "explore",
      agentDisplayName: "Explore",
    };
    await ingestNamed(displayRoot, display, "copilot", "subagentStart");
    const displayYaml = await readFile(yamlPath(displayRoot, "sess-display"), "utf8");
    assert.equal(
      displayYaml,
      [
        "---",
        "harness: copilot",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "subagent: explore",
        "agent_display_name: Explore",
        "",
      ].join("\n"),
    );
    assert.equal(displayYaml.includes("subagent: Explore"), false);
  });
});
