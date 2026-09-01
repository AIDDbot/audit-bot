import assert from "node:assert";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { repoRoot } from "./spawn.ts";

const requiredEvents = [
  "sessionStart",
  "sessionEnd",
  "subagentStart",
  "subagentStop",
] as const;

test("AC-F002.3 — each Cursor event has a distinct wrapper invoking ingest cursor {event}", async () => {
  for (const event of requiredEvents) {
    const text = await readFile(
      path.join(repoRoot, ".cursor", "hooks", `${event}.cmd`),
      "utf8",
    );
    assert.ok(text.includes(`ingest cursor ${event}`));
  }
  await assert.rejects(
    access(path.join(repoRoot, ".cursor", "hooks", "ingest.cmd")),
  );
});
