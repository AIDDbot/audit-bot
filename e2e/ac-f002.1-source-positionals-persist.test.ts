import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  spawnIngest,
} from "./spawn.ts";

test("AC-F002.1 — ingest cursor sessionStart persists verbatim with no overlay", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f002-1",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal(JSON.stringify(parsed), JSON.stringify(payload));
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
});
