import assert from "node:assert";
import { access } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  eventsPath,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

test("AC-F010.4 — Event log line deep-equals stdin; Session JSONL is a third artifact", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f010-4",
    extra_flag: true,
    nested: { inner: "", count: 0, child: { empty: {} } },
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
  assert.equal("harness" in parsed, false);
  assert.equal("event" in parsed, false);
  assert.equal("turn" in parsed, false);
  assert.equal("timestamp" in parsed, false);
  const jsonlPath = sessionJsonlPath(projectRoot, payload.session_id);
  await access(jsonlPath);
  assert.notEqual(
    path.resolve(jsonlPath),
    path.resolve(eventsPath(projectRoot)),
  );
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
});
