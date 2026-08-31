import assert from "node:assert";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { eventsPath, makeFixture, parseObject, readLines, spawnIngest } from "./spawn.ts";

const badStdin = ["", "not-json", "[]", "42", "null", '"x"'];

function assertObserveOnly(result: {
  exitCode: number | null;
  stdout: string;
}): void {
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout.trim(), "");
}

async function spawnBad(
  projectRoot: string,
  stdin: string,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return spawnIngest({
    harness: "cursor",
    hint: "stop",
    stdin,
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
}

for (const stdin of badStdin) {
  const label = stdin === "" ? "empty" : stdin;
  test(`AC-F001.5 — bad stdin ${label} leaves no partial JSONL line`, async () => {
    const projectRoot = await makeFixture();
    const result = await spawnBad(projectRoot, stdin);
    assertObserveOnly(result);
    await assert.rejects(access(eventsPath(projectRoot)));
  });
}

test("AC-F001.5 — bad stdin leaves a seeded JSONL line unchanged", async () => {
  const projectRoot = await makeFixture();
  const seed = `${JSON.stringify({ keep: true })}\n`;
  await mkdir(path.dirname(eventsPath(projectRoot)), { recursive: true });
  await writeFile(eventsPath(projectRoot), seed);
  const result = await spawnBad(projectRoot, "not-json");
  assertObserveOnly(result);
  assert.equal(await readFile(eventsPath(projectRoot), "utf8"), seed);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), { keep: true });
});

test("AC-F001.5 — write failure when temp is a file leaves no JSONL", async () => {
  const projectRoot = await makeFixture();
  await writeFile(path.join(projectRoot, "temp"), "not-a-directory");
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({ hook_event_name: "sessionStart" }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assertObserveOnly(result);
  await assert.rejects(access(eventsPath(projectRoot)));
});

test("AC-F001.5 — write failure leaves a seeded JSONL line unchanged", async () => {
  const projectRoot = await makeFixture();
  const store = eventsPath(projectRoot);
  const seed = `${JSON.stringify({ keep: true })}\n`;
  await mkdir(path.dirname(store), { recursive: true });
  await writeFile(store, seed);
  await mkdir(`${store}.lock`);
  const result = await spawnIngest({
    harness: "claude",
    hint: "Stop",
    stdin: JSON.stringify({ hook_event_name: "Stop" }),
    env: { CLAUDE_PROJECT_DIR: projectRoot },
  });
  assertObserveOnly(result);
  assert.equal(await readFile(store, "utf8"), seed);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  parseObject(lines[0] ?? "");
});
