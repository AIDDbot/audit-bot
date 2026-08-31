import assert from "node:assert";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { decodeHookStdin, ingestHook } from "../src/ingest.ts";

const roots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "audit-ingest-"));
  roots.push(root);
  return root;
}

function eventsPath(root: string): string {
  return path.join(root, "temp", "audit", "events.jsonl");
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
  test("appends one Event with harness, ISO receivedAt, hookEvent, and omitted payload", async () => {
    const root = await makeRoot();
    await ingestHook({
      harness: "cursor",
      hookEventHint: "sessionStart",
      stdinText: JSON.stringify({
        hook_event_name: "sessionStart",
        prompt: "hi",
        empty: "",
        nested: { gone: null },
      }),
      env: { CURSOR_PROJECT_DIR: root },
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    const event = events[0] as Record<string, unknown>;
    assert.equal(event.harness, "cursor");
    assert.equal(event.hookEvent, "sessionStart");
    assert.equal(event.prompt, "hi");
    assert.equal("empty" in event, false);
    assert.equal("nested" in event, false);
    assert.match(String(event.receivedAt), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test("uses argv hint when hook_event_name is absent", async () => {
    const root = await makeRoot();
    await ingestHook({
      harness: "copilot",
      hookEventHint: "userPromptSubmitted",
      stdinText: JSON.stringify({ prompt: "go" }),
      env: { CURSOR_PROJECT_DIR: root },
    });
    const events = await readEvents(root);
    assert.equal((events[0] as { hookEvent: string }).hookEvent, "userPromptSubmitted");
  });

  test("parses stdin with a leading UTF-8 BOM", async () => {
    const root = await makeRoot();
    await ingestHook({
      harness: "cursor",
      hookEventHint: "sessionEnd",
      stdinText: `\uFEFF${JSON.stringify({ hook_event_name: "sessionEnd" })}`,
      env: { CURSOR_PROJECT_DIR: root },
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.equal((events[0] as { hookEvent: string }).hookEvent, "sessionEnd");
  });

  test("parses UTF-16 LE stdin from Windows PowerShell pipes", async () => {
    const root = await makeRoot();
    const json = JSON.stringify({ hook_event_name: "stop" });
    const stdinText = decodeHookStdin(Buffer.from(`\uFEFF${json}`, "utf16le"));
    await ingestHook({
      harness: "cursor",
      hookEventHint: "stop",
      stdinText,
      env: { CURSOR_PROJECT_DIR: root },
    });
    const events = await readEvents(root);
    assert.equal((events[0] as { hookEvent: string }).hookEvent, "stop");
  });

  test("decodes UTF-16 LE JSON without a BOM", () => {
    const json = JSON.stringify({ hook_event_name: "stop" });
    const text = decodeHookStdin(Buffer.from(json, "utf16le"));
    assert.equal(JSON.parse(text).hook_event_name, "stop");
  });

  test("parses CRLF-wrapped and double-encoded JSON stdin", async () => {
    const root = await makeRoot();
    const inner = JSON.stringify({ hook_event_name: "sessionStart" });
    await ingestHook({
      harness: "cursor",
      hookEventHint: "sessionStart",
      stdinText: `\r\n${JSON.stringify(inner)}\r\n`,
      env: { CURSOR_PROJECT_DIR: root },
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.equal((events[0] as { hookEvent: string }).hookEvent, "sessionStart");
  });

  test("swallows non-JSON stdin and writes no file", async () => {
    const root = await makeRoot();
    await ingestHook({
      harness: "cursor",
      hookEventHint: "stop",
      stdinText: "not-json",
      env: { CURSOR_PROJECT_DIR: root },
    });
    await assert.rejects(readFile(eventsPath(root)));
  });

  test("swallows JSON array and primitive stdin", async () => {
    const root = await makeRoot();
    await ingestHook({
      harness: "cursor",
      hookEventHint: "stop",
      stdinText: "[1]",
      env: { CURSOR_PROJECT_DIR: root },
    });
    await ingestHook({
      harness: "cursor",
      hookEventHint: "stop",
      stdinText: "1",
      env: { CURSOR_PROJECT_DIR: root },
    });
    await assert.rejects(readFile(eventsPath(root)));
  });

  test("swallows missing project root and writes no file", async () => {
    const root = await makeRoot();
    await ingestHook({
      harness: "cursor",
      hookEventHint: "stop",
      stdinText: JSON.stringify({ hook_event_name: "stop" }),
      env: {},
    });
    await assert.rejects(readFile(eventsPath(root)));
  });

  test("swallows append throw and leaves existing JSONL valid", async () => {
    const root = await makeRoot();
    const auditDir = path.join(root, "temp", "audit");
    await mkdir(auditDir, { recursive: true });
    await writeFile(eventsPath(root), `${JSON.stringify({ keep: true })}\n`);
    await mkdir(path.join(auditDir, "events.jsonl.lock"));
    await ingestHook({
      harness: "claude",
      hookEventHint: "Stop",
      stdinText: JSON.stringify({ hook_event_name: "Stop" }),
      env: { CLAUDE_PROJECT_DIR: root },
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], { keep: true });
  });
});
