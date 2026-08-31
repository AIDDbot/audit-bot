import assert from "node:assert";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { repoRoot } from "./spawn.ts";

const cursorEvents = [
  "sessionStart",
  "sessionEnd",
  "beforeSubmitPrompt",
  "stop",
];
const claudeEvents = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "Stop",
];
const copilotEvents = [
  "sessionStart",
  "sessionEnd",
  "userPromptSubmitted",
  "agentStop",
];

async function loadJson(rel: string): Promise<unknown> {
  const text = await readFile(path.join(repoRoot, rel), "utf8");
  return JSON.parse(text);
}

function cursorCommand(config: unknown, event: string): string {
  const hooks = (config as { hooks: Record<string, { command: string }[]> }).hooks;
  const list = hooks[event];
  assert.ok(Array.isArray(list) && list.length > 0);
  return list[0]?.command ?? "";
}

function claudeHook(
  config: unknown,
  event: string,
): { command: string; args: string[] } {
  const root = config as {
    hooks: Record<string, { hooks: { command: string; args: string[] }[] }[]>;
  };
  const hook = root.hooks[event]?.[0]?.hooks[0];
  assert.ok(hook);
  assert.ok(Array.isArray(hook.args));
  return hook;
}

function copilotCommand(config: unknown, event: string): string {
  const hooks = (config as { hooks: Record<string, { command: string }[]> }).hooks;
  const list = hooks[event];
  assert.ok(Array.isArray(list) && list.length > 0);
  return list[0]?.command ?? "";
}

function assertNodeScript(command: string, harness: string, event: string): void {
  assert.equal(command, `node cli/src/index.ts ingest ${harness} ${event}`);
  assert.equal(command.endsWith(".sh"), false);
}

test("AC-F001.8 — Cursor hooks.json subscribes ingest for required events", async () => {
  const config = await loadJson(".cursor/hooks.json");
  assert.ok(config);
  for (const event of cursorEvents) {
    assertNodeScript(cursorCommand(config, event), "cursor", event);
  }
});

test("AC-F001.8 — Claude settings.json uses node exec form", async () => {
  const config = await loadJson(".claude/settings.json");
  assert.ok(config);
  for (const event of claudeEvents) {
    const hook = claudeHook(config, event);
    assert.equal(hook.command, "node");
    assert.ok(Array.isArray(hook.args));
    assert.ok(hook.args.some((arg) => arg.includes("cli/src/index.ts")));
    assert.ok(hook.args.includes("ingest"));
    assert.ok(hook.args.includes("claude"));
    assert.equal(hook.command.endsWith(".sh"), false);
    assert.equal(
      hook.args.some((arg) => arg.endsWith(".sh") && hook.args.length === 1),
      false,
    );
  }
});

test("AC-F001.8 — Copilot audit-ingest.json subscribes ingest for required events", async () => {
  const config = await loadJson(".github/hooks/audit-ingest.json");
  assert.ok(config);
  for (const event of copilotEvents) {
    assertNodeScript(copilotCommand(config, event), "copilot", event);
  }
});
