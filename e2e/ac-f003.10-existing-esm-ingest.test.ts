import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  readSessions,
  readSessionYaml,
  repoRoot,
  spawnIngest,
  yamlDocuments,
} from "./spawn.ts";

test("AC-F003.10 — existing Node ESM ingest has no extra runtime dependencies", async () => {
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
    session_id: "sess-ac-f003-10",
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
  const documents = yamlDocuments(
    await readSessionYaml(projectRoot, payload.session_id),
  );
  assert.equal(documents.length, 1);
  assert.ok((documents[0] ?? "").startsWith("---"));
});
