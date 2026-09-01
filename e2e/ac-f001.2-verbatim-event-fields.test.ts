import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

test("AC-F001.2 — Event log line keeps every received field with no overlay", async () => {
  const projectRoot = await makeFixture();
  const payload = {
    hook_event_name: "beforeSubmitPrompt",
    session_id: "sess-ac-f001-2",
    prompt: "",
    items: [],
    model_params: {},
    extra_flag: true,
    nested: { inner: "", count: 0, child: { empty: {} } },
  };

  const result = await spawnIngest({
    stdin: JSON.stringify(payload),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const parsed = parseObject(lines[0] ?? "");
  assert.deepEqual(parsed, payload);
  assert.equal(parsed.prompt, "");
  assert.deepEqual(parsed.items, []);
  assert.deepEqual(parsed.model_params, {});
  assert.equal("receivedAt" in parsed, false);
  assert.equal("harness" in parsed, false);
  assert.equal("hookEvent" in parsed, false);
  assert.equal(parsed.hook_event_name, "beforeSubmitPrompt");
});
