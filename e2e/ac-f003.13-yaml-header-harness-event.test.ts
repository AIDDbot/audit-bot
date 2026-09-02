import assert from "node:assert";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  sessionJsonlPath,
  spawnIngest,
} from "./spawn.ts";

function assertJsonObject(value: unknown): Record<string, unknown> {
  assert.equal(typeof value, "object");
  assert.notEqual(value, null);
  assert.equal(Array.isArray(value), false);
  return value as Record<string, unknown>;
}

test("AC-F003.13 — header keys from both positionals match argv", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionEnd",
    session_id: "sess-ac-f003-13-both",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionStart"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const parsedLine = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsedLine, payload);
  assert.equal("harness" in parsedLine, false);
  assert.equal("hookEvent" in parsedLine, false);
  assert.equal("turn" in parsedLine, false);
  const jsonlPath = sessionJsonlPath(projectRoot, payload.session_id);
  assert.equal(path.basename(jsonlPath, ".jsonl"), "sess-ac-f003-13-both");
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal(record.harness, "cursor");
  assert.equal(record.event, "sessionStart");
  assert.notEqual(record.event, payload.hook_event_name);
});

test("AC-F003.13 — omitted positionals are empty strings and are not inferred", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f003-13-neither",
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const parsedLine = parseObject((await readLines(projectRoot))[0] ?? "");
  assert.deepEqual(parsedLine, payload);
  assert.equal("harness" in parsedLine, false);
  assert.equal("hookEvent" in parsedLine, false);
  assert.equal("turn" in parsedLine, false);
  const jsonlPath = sessionJsonlPath(projectRoot, payload.session_id);
  assert.equal(path.basename(jsonlPath, ".jsonl"), "sess-ac-f003-13-neither");
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
  const record = assertJsonObject(records[0]);
  assert.equal("source_harness" in record, false);
  assert.equal("source_event" in record, false);
  assert.equal(record.harness, "");
  assert.equal(record.event, "");
  assert.notEqual(record.event, payload.hook_event_name);
});
