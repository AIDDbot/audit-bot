import assert from "node:assert";
import { test } from "node:test";
import { makeFixture, parseObject, readLines, spawnIngest } from "./spawn.ts";

test("AC-F001.10 — omits null and empty keys; keeps 0 and false", async () => {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      gone: null,
      blank: "",
      emptyList: [],
      emptyObj: {},
      nested: { inner: "", deeper: { none: null } },
      wrap: { child: {} },
      zero: 0,
      flag: false,
      text: "keep",
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assert.equal(result.exitCode, 0);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.equal("gone" in event, false);
  assert.equal("blank" in event, false);
  assert.equal("emptyList" in event, false);
  assert.equal("emptyObj" in event, false);
  assert.equal("nested" in event, false);
  assert.equal("wrap" in event, false);
  assert.equal(event.zero, 0);
  assert.equal(event.flag, false);
  assert.equal(event.text, "keep");
});
