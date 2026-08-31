import assert from "node:assert";
import { test } from "node:test";
import { makeFixture, parseObject, readLines, spawnIngest } from "./spawn.ts";

const cases: {
  harness: "cursor" | "claude" | "copilot";
  event: string;
  omitHookEventName?: boolean;
  durationMs?: number;
}[] = [
  { harness: "cursor", event: "sessionStart" },
  { harness: "cursor", event: "sessionEnd", durationMs: 1500 },
  { harness: "cursor", event: "beforeSubmitPrompt" },
  { harness: "cursor", event: "stop" },
  { harness: "claude", event: "SessionStart" },
  { harness: "claude", event: "SessionEnd" },
  { harness: "claude", event: "UserPromptSubmit" },
  { harness: "claude", event: "Stop" },
  { harness: "copilot", event: "sessionStart", omitHookEventName: true },
  { harness: "copilot", event: "sessionEnd", omitHookEventName: true },
  { harness: "copilot", event: "userPromptSubmitted", omitHookEventName: true },
  { harness: "copilot", event: "agentStop", omitHookEventName: true },
];

function envFor(
  harness: "cursor" | "claude" | "copilot",
  root: string,
): Record<string, string | undefined> {
  if (harness === "cursor") return { CURSOR_PROJECT_DIR: root };
  if (harness === "claude") return { CLAUDE_PROJECT_DIR: root };
  return {};
}

function stdinFor(
  item: (typeof cases)[number],
  root: string,
): string {
  const payload: Record<string, unknown> = { session_id: item.event };
  if (!item.omitHookEventName) payload.hook_event_name = item.event;
  if (item.durationMs !== undefined) payload.duration_ms = item.durationMs;
  if (item.harness === "copilot") payload.cwd = root;
  return JSON.stringify(payload);
}

for (const item of cases) {
  test(`AC-F001.2 — ingest ${item.harness} ${item.event}`, async () => {
    const projectRoot = await makeFixture();
    const result = await spawnIngest({
      harness: item.harness,
      hint: item.event,
      stdin: stdinFor(item, projectRoot),
      env: envFor(item.harness, projectRoot),
    });
    assert.equal(result.exitCode, 0);
    const lines = await readLines(projectRoot);
    assert.equal(lines.length, 1);
    const event = parseObject(lines[0] ?? "");
    assert.equal(event.harness, item.harness);
    assert.equal(event.hookEvent, item.event);
  });
}
