import assert from "node:assert";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  jsonlRecords,
  makeFixture,
  parseObject,
  readLines,
  readSessionJsonl,
  readSessions,
  repoRoot,
  sessionJsonlPath,
  sessionReportPath,
  spawnIngest,
} from "./spawn.ts";

test("AC-F004.10 — existing Node ESM ingest writes the Session report with no extra runtime dependencies", async () => {
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
    session_id: "sess-ac-f004-10",
    reason: "completed",
  };
  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  assert.deepEqual(parseObject(lines[0] ?? ""), payload);
  const sessions = await readSessions(projectRoot);
  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.includes(payload.session_id));
  await access(sessionJsonlPath(projectRoot, payload.session_id));
  const records = jsonlRecords(
    await readSessionJsonl(projectRoot, payload.session_id),
  );
  assert.equal(records.length, 1);
  await access(sessionReportPath(projectRoot, payload.session_id));
});
