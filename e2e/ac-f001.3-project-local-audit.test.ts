import assert from "node:assert";
import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  eventsPath,
  makeFixture,
  readLines,
  repoRoot,
  spawnIngest,
} from "./spawn.ts";

function globalAuditCandidates(): string[] {
  const dirs = new Set<string>([os.tmpdir(), path.join(repoRoot, "cli", "temp")]);
  for (const key of ["TEMP", "TMP", "TMPDIR"]) {
    const value = process.env[key];
    if (value) dirs.add(value);
  }
  const paths: string[] = [];
  for (const dir of dirs) {
    paths.push(path.join(dir, "events.jsonl"));
    paths.push(path.join(dir, "audit", "events.jsonl"));
  }
  return paths;
}

async function assertAbsent(filePath: string): Promise<void> {
  await assert.rejects(access(filePath));
}

test("AC-F001.3 — writes only under project-local temp/audit", async () => {
  const projectRoot = await makeFixture();
  assert.notEqual(path.resolve(projectRoot), path.resolve(os.tmpdir()));
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({ hook_event_name: "sessionStart" }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assert.equal(result.exitCode, 0);
  await access(eventsPath(projectRoot));
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
});

test("AC-F001.3 — does not use OS temp or cli/temp as audit root", async () => {
  const projectRoot = await makeFixture();
  await spawnIngest({
    harness: "claude",
    hint: "Stop",
    stdin: JSON.stringify({ hook_event_name: "Stop" }),
    env: { CLAUDE_PROJECT_DIR: projectRoot },
  });
  await access(eventsPath(projectRoot));
  for (const candidate of globalAuditCandidates()) {
    await assertAbsent(candidate);
  }
});

test("AC-F001.3 — payload cwd resolves project-local audit", async () => {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    harness: "copilot",
    hint: "sessionStart",
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      cwd: projectRoot,
    }),
  });
  assert.equal(result.exitCode, 0);
  await access(eventsPath(projectRoot));
  for (const candidate of globalAuditCandidates()) {
    await assertAbsent(candidate);
  }
});
