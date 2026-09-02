import assert from "node:assert";
import { access } from "node:fs/promises";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

test("AC-F006.2 — ingest cursor stop persists Event log, Session index, and Session JSONL", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    session_id: "sess-ac-f006-2",
    transcript_path: "/tmp/agent-stop.jsonl",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "stop"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
  await access(sessionJsonlPath(projectRoot, payload.session_id));
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
});
