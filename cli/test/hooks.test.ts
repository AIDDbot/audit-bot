import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const events = [
  "sessionStart",
  "sessionEnd",
  "subagentStart",
  "subagentStop",
  "beforeSubmitPrompt",
  "stop",
] as const;

const config = JSON.parse(
  readFileSync(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
) as {
  version: number;
  failClosed?: unknown;
  hooks: Record<string, { command: string }[]>;
};

describe("hooks.json command identifies ingest cursor event", () => {
  for (const event of events) {
    test(`${event} command includes ingest cursor ${event}`, () => {
      const command = config.hooks[event][0].command;
      assert.match(command, new RegExp(`ingest cursor ${event}`));
    });
  }
});

describe("hooks.json registers shell commands not wrappers", () => {
  test("version 1, six events, failClosed unset", () => {
    assert.equal(config.version, 1);
    assert.equal("failClosed" in config, false);
    assert.deepEqual(Object.keys(config.hooks), [...events]);
  });

  for (const event of events) {
    test(`${event} command is node ingest cursor ${event}`, () => {
      assert.equal(
        config.hooks[event][0].command,
        `node .agents/hooks/index.mjs ingest cursor ${event}`,
      );
      assert.equal(
        existsSync(path.join(repoRoot, ".cursor", "hooks", `${event}.cmd`)),
        false,
      );
    });
  }

  test("shared ingest.cmd is absent", () => {
    assert.equal(
      existsSync(path.join(repoRoot, ".cursor", "hooks", "ingest.cmd")),
      false,
    );
  });
});

describe("Codex hooks", () => {
  const codexEvents = ["SessionStart", "SessionEnd", "SubagentStart", "SubagentStop", "UserPromptSubmit", "Stop"] as const;
  const codex = JSON.parse(readFileSync(path.join(repoRoot, ".codex", "hooks.json"), "utf8")) as {
    hooks: Record<string, { hooks: { command: string }[] }[]>;
  };

  for (const event of codexEvents) {
    test(`${event} invokes observe-only Codex ingest`, () => {
      assert.equal(codex.hooks[event]?.[0]?.hooks[0]?.command, `node .agents/hooks/index.mjs ingest codex ${event}`);
    });
  }
});
