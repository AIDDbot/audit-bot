import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { makeFixture, repoRoot, spawnIngest } from "./spawn.ts";

function assertObserveOnly(result: {
  exitCode: number | null;
  stdout: string;
}): void {
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stdout.includes("continue"), false);
  assert.equal(result.stdout.includes("block"), false);
  assert.equal(result.stdout.includes("permission"), false);
  assert.equal(result.stdout.includes("followup_message"), false);
}

test("AC-F008.6 — observe-only existing Node ESM ingest; no new hook registration", async (t) => {
  await t.test("AC-F008.6 — cli/package.json is Node ≥ 24 ESM with empty dependencies", async () => {
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
  });

  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };

  await t.test("AC-F008.6 — sessionStart is observe-only", async () => {
    const result = await spawnIngest({
      stdin: JSON.stringify({
        session_id: "sess-ac-f008-6-start",
        hook_event_name: "sessionStart",
      }),
      env,
      extraArgv: ["cursor", "sessionStart"],
    });
    assertObserveOnly(result);
  });

  await t.test("AC-F008.6 — beforeSubmitPrompt is observe-only", async () => {
    const result = await spawnIngest({
      stdin: JSON.stringify({
        session_id: "sess-ac-f008-6-prompt",
        prompt: "hello",
      }),
      env,
      extraArgv: ["cursor", "beforeSubmitPrompt"],
    });
    assertObserveOnly(result);
  });

  await t.test("AC-F008.6 — stop is observe-only", async () => {
    const result = await spawnIngest({
      stdin: JSON.stringify({
        session_id: "sess-ac-f008-6-stop",
      }),
      env,
      extraArgv: ["cursor", "stop"],
    });
    assertObserveOnly(result);
  });
});
