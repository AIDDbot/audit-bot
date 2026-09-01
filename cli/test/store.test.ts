import assert from "node:assert";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { eventLogLine } from "../src/event.ts";
import { dayFolderName } from "../src/project.ts";
import { persistIngest } from "../src/store.ts";

const roots: string[] = [];
const now = new Date(2026, 8, 1, 15, 0, 0);

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

  test("overlapping calls yield complete yaml documents plus valid jsonl", async () => {
    const root = await makeRoot();
    const docA = "---\nsession_id: a\nsource_harness: cursor\nsource_event: sessionStart\ntimestamp: \"15:00:00\"\n";
    const docB = "---\nsession_id: b\nsource_harness: cursor\nsource_event: sessionStart\ntimestamp: \"15:00:00\"\n";
    await Promise.all([
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "a" }),
        sessionId: "a",
        yamlDocument: docA,
        now,
      }),
      persistIngest({
        projectRoot: root,
        eventLine: eventLogLine({ session_id: "b" }),
        sessionId: "b",
        yamlDocument: docB,
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
    const yamlA = await readFile(path.join(dayFolder(root), "a.yaml"), "utf8");
    const yamlB = await readFile(path.join(dayFolder(root), "b.yaml"), "utf8");
    assert.ok(yamlA.startsWith("---"));
    assert.ok(yamlB.startsWith("---"));
    assert.equal(yamlA, docA);
    assert.equal(yamlB, docB);
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
      yamlDocument: "---\nsession_id: leaked\n",
      now,
    });
    await assert.rejects(stat(path.join(dayFolder(root), "leaked.yaml")));
  });
});
