import assert from "node:assert";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import { appendEvent } from "../src/store.ts";

const roots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "audit-store-"));
  roots.push(root);
  return root;
}

function eventsPath(root: string): string {
  return path.join(root, "temp", "audit", "events.jsonl");
}

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

describe("appendEvent", () => {
  test("creates temp/audit/events.jsonl with one parseable JSON object line", async () => {
    const root = await makeRoot();
    await appendEvent(root, { n: 1, harness: "cursor" });
    const text = await readFile(eventsPath(root), "utf8");
    const lines = text.split("\n").filter((line) => line.length > 0);
    assert.equal(lines.length, 1);
    assert.deepEqual(JSON.parse(lines[0] ?? ""), { n: 1, harness: "cursor" });
    assert.ok(text.endsWith("\n"));
  });

  test("two overlapping appends yield two complete JSONL lines", async () => {
    const root = await makeRoot();
    await Promise.all([
      appendEvent(root, { id: "a" }),
      appendEvent(root, { id: "b" }),
    ]);
    const text = await readFile(eventsPath(root), "utf8");
    const lines = text.split("\n").filter((line) => line.length > 0);
    assert.equal(lines.length, 2);
    const parsed = lines.map((line) => JSON.parse(line) as { id: string });
    const ids = parsed.map((row) => row.id).sort();
    assert.deepEqual(ids, ["a", "b"]);
  });
});
