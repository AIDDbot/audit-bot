import assert from "node:assert";
import { test } from "node:test";
import {
  iso8601Pattern,
  makeFixture,
  parseObject,
  readLines,
  spawnIngest,
} from "./spawn.ts";

test("AC-F001.6 — stored Event has harness, ISO receivedAt, hookEvent, omitted payload", async () => {
  const projectRoot = await makeFixture();
  const result = await spawnIngest({
    harness: "cursor",
    hint: "sessionStart",
    stdin: JSON.stringify({
      harness: "ignored",
      receivedAt: "nope",
      hookEvent: "nope",
      hook_event_name: "sessionStart",
      conversation_id: "conv-1",
      prompt: "hello",
      empty: "",
      gone: null,
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });
  assert.equal(result.exitCode, 0);
  const lines = await readLines(projectRoot);
  assert.equal(lines.length, 1);
  const event = parseObject(lines[0] ?? "");
  assert.equal(event.harness, "cursor");
  assert.equal(event.hookEvent, "sessionStart");
  assert.match(String(event.receivedAt), iso8601Pattern);
  assert.equal(event.conversation_id, "conv-1");
  assert.equal(event.prompt, "hello");
  assert.equal(event.hook_event_name, "sessionStart");
  assert.equal("empty" in event, false);
  assert.equal("gone" in event, false);
});
