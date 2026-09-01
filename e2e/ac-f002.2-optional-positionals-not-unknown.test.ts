import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

const usageMessage = "usage: cli-node ingest";

async function assertPersistsNotUnknown(input: {
  extraArgv?: string[];
  sessionId: string;
}): Promise<void> {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: input.sessionId,
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: input.extraArgv,
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.includes(usageMessage), false);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
}

test("AC-F002.2 — ingest with neither positional still persists and is not unknown", async () => {
  await assertPersistsNotUnknown({ sessionId: "sess-ac-f002-2-neither" });
});

test("AC-F002.2 — ingest with only harness positional still persists and is not unknown", async () => {
  await assertPersistsNotUnknown({
    extraArgv: ["cursor"],
    sessionId: "sess-ac-f002-2-harness",
  });
});
