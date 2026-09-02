import assert from "node:assert";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { eventLogLine } from "../src/event.ts";
import { dayFolderName } from "../src/project.ts";
import { persistIngest } from "../src/store.ts";
import type { SessionEmitInput } from "../src/yaml.ts";

const roots: string[] = [];
const now = new Date(2026, 8, 1, 15, 0, 0);

function sessionStartEmit(sessionId: string): SessionEmitInput {
  return {
    payload: { session_id: sessionId },
    harness: "cursor",
    event: "sessionStart",
    now,
  };
}

async function readSessionJsonl(root: string, sessionId: string): Promise<unknown[]> {
  const text = await readFile(path.join(dayFolder(root), `${sessionId}.jsonl`), "utf8");
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));
}

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "audit-store-"));
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

describe("persistIngest", () => {
  test("creates dated events.jsonl and sessions.json under the fixture root", async () => {
    const root = await makeRoot();
    const payload = { session_id: "a", prompt: "hi" };
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine(payload),
      sessionId: "a",
      now,
    });
    const folder = await stat(dayFolder(root));
    assert.equal(folder.isDirectory(), true);
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    assert.deepEqual(events[0], payload);
    const text = await readFile(eventsPath(root), "utf8");
    assert.ok(text.endsWith("\n"));
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["a"]);
  });

  test("appends a new id and does not duplicate an existing id", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "a" }),
      sessionId: "a",
      now,
    });
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "a", n: 2 }),
      sessionId: "a",
      now,
    });
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ conversation_id: "b" }),
      sessionId: "b",
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 3);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, ["a", "b"]);
  });

  test("missing session id leaves sessions.json as []", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ hook_event_name: "sessionStart" }),
      sessionId: undefined,
      now,
    });
    const events = await readEvents(root);
    assert.equal(events.length, 1);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8"));
    assert.deepEqual(sessions, []);
  });

  test("two overlapping calls yield two complete JSONL lines and unique ids", async () => {
    const root = await makeRoot();
    await Promise.all([
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "a" }),
        sessionId: "a",
        now,
      }),
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "b" }),
        sessionId: "b",
        now,
      }),
    ]);
    const events = await readEvents(root);
    assert.equal(events.length, 2);
    const parsed = events as { session_id: string }[];
    const ids = parsed.map((row) => row.session_id).sort();
    assert.deepEqual(ids, ["a", "b"]);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8")) as string[];
    assert.equal(sessions.length, 2);
    assert.deepEqual([...sessions].sort(), ["a", "b"]);
  });

  test("does not write an undated events.jsonl under temp/audit", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "a" }),
      sessionId: "a",
      now,
    });
    await assert.rejects(stat(path.join(root, "temp", "audit", "events.jsonl")));
  });

  test("AC-F003.9 overlapping calls yield complete mapped JSON objects plus valid jsonl", async () => {
    const root = await makeRoot();
    await Promise.all([
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "a" }),
        sessionId: "a",
        sessionEmit: sessionStartEmit("a"),
        now,
      }),
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "b" }),
        sessionId: "b",
        sessionEmit: sessionStartEmit("b"),
        now,
      }),
    ]);
    const events = await readEvents(root);
    assert.equal(events.length, 2);
    const parsed = events as { session_id: string }[];
    const ids = parsed.map((row) => row.session_id).sort();
    assert.deepEqual(ids, ["a", "b"]);
    const sessions = JSON.parse(await readFile(sessionsPath(root), "utf8")) as string[];
    assert.equal(sessions.length, 2);
    assert.deepEqual([...sessions].sort(), ["a", "b"]);
    const jsonlA = await readSessionJsonl(root, "a");
    const jsonlB = await readSessionJsonl(root, "b");
    assert.equal(jsonlA.length, 1);
    assert.equal(jsonlB.length, 1);
    const rowA = jsonlA[0] as Record<string, unknown>;
    const rowB = jsonlB[0] as Record<string, unknown>;
    assert.equal(rowA.event, "sessionStart");
    assert.equal(rowB.event, "sessionStart");
    assert.deepEqual(Object.keys(rowA).slice(0, 5), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    assert.equal(typeof rowA.turn, "number");
    assert.equal(typeof rowB.turn, "number");
    await assert.rejects(stat(path.join(dayFolder(root), "a.yaml")));
    await assert.rejects(stat(path.join(dayFolder(root), "b.yaml")));
  });

  test("non-array sessions.json causes persist to reject", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "a" }),
      sessionId: "a",
      now,
    });
    await writeFile(sessionsPath(root), "{}");
    await assert.rejects(
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "b" }),
        sessionId: "b",
        now,
      }),
    );
  });

  test("does not create a yaml file when sessionId is undefined", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ hook_event_name: "sessionStart" }),
      sessionId: undefined,
      sessionEmit: sessionStartEmit("leaked"),
      now,
    });
    await assert.rejects(stat(path.join(dayFolder(root), "leaked.yaml")));
    await assert.rejects(stat(path.join(dayFolder(root), "leaked.jsonl")));
  });

  test("AC-F010.1 AC-F010.3 session file is jsonl and never yaml", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "sess-1" }),
      sessionId: "sess-1",
      sessionEmit: sessionStartEmit("sess-1"),
      now,
    });
    const records = await readSessionJsonl(root, "sess-1");
    assert.equal(records.length, 1);
    assert.equal(typeof (records[0] as { turn: unknown }).turn, "number");
    await assert.rejects(stat(path.join(dayFolder(root), "sess-1.yaml")));
  });

  test("AC-F010.3 planted yaml is unread and does not affect turn or session_id", async () => {
    const root = await makeRoot();
    const folder = dayFolder(root);
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "sess-1", prompt: "hi" }),
      sessionId: "sess-1",
      sessionEmit: {
        payload: { session_id: "sess-1", prompt: "hi" },
        harness: "cursor",
        event: "beforeSubmitPrompt",
        now,
      },
      now,
    });
    const planted = path.join(folder, "sess-1.yaml");
    const plantedBytes = "---\nevent: beforeSubmitPrompt\nturn: 9\n";
    await writeFile(planted, plantedBytes);
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "sess-1" }),
      sessionId: "sess-1",
      sessionEmit: sessionStartEmit("sess-1"),
      now,
    });
    assert.equal(await readFile(planted, "utf8"), plantedBytes);
    const records = await readSessionJsonl(root, "sess-1");
    assert.equal(records.length, 2);
    assert.equal((records[1] as { turn: number }).turn, 1);
    assert.equal("session_id" in (records[1] as object), false);
  });

  test("AC-F010.5 AC-F010.7 omitting sessionEmit skips the session file", async () => {
    const root = await makeRoot();
    await persistIngest({
      projectRoot: root,
      eventLine: eventLogLine({ session_id: "a" }),
      sessionId: "a",
      now,
    });
    await assert.rejects(stat(path.join(dayFolder(root), "a.jsonl")));
    await assert.rejects(stat(path.join(dayFolder(root), "a.yaml")));
    const events = await readEvents(root);
    assert.equal(events.length, 1);
  });
});
