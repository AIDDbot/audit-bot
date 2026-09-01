import assert from "node:assert";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { decodeHookStdin, ingestHook } from "../src/ingest.ts";
import { dayFolderName } from "../src/project.ts";

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

async function readEvents(root: string): Promise<unknown[]> {
  const text = await readFile(eventsPath(root), "utf8");
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
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
});
