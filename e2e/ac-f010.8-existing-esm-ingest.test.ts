import assert from "node:assert";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  eventsPath,
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  readSessions,
  repoRoot,
  sessionJsonlPath,
  sessionsPath,
  spawnIngest,
} from "./spawn.ts";

test("AC-F010.8 — existing Node ESM ingest has no extra runtime dependencies", async () => {
  const pkgPath = path.join(repoRoot, "cli", "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf8")) as {
    type?: unknown;
    dependencies?: unknown;
    engines?: { node?: unknown };
  };

  assert.equal(pkg.type, "module");
  assert.deepEqual(pkg.dependencies, {});
  assert.equal(typeof pkg.engines?.node, "string");
  assert.ok(String(pkg.engines?.node).startsWith(">=24"));

  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "sessionStart",
    session_id: "sess-ac-f010-8",
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
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
  await access(eventsPath(projectRoot));
  await access(sessionsPath(projectRoot));
  await access(sessionJsonlPath(projectRoot, payload.session_id));
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
});
