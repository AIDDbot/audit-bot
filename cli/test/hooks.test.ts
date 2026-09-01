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
] as const;

describe("cursor hook wrappers", () => {
  for (const event of events) {
    test(`${event}.cmd bakes ingest cursor ${event}`, () => {
      const text = readFileSync(
        path.join(repoRoot, ".cursor", "hooks", `${event}.cmd`),
        "utf8",
      );
      assert.match(text, new RegExp(`ingest cursor ${event}`));
      assert.match(text, /^:; /m);
      assert.match(text, /^@echo off$/m);
    });
  }

  test("shared ingest.cmd is removed", () => {
    assert.equal(
      existsSync(path.join(repoRoot, ".cursor", "hooks", "ingest.cmd")),
      false,
    );
  });
});

describe("hooks.json", () => {
  const config = JSON.parse(
    readFileSync(path.join(repoRoot, ".cursor", "hooks.json"), "utf8"),
  ) as {
    version: number;
    failClosed?: unknown;
    hooks: Record<string, { command: string }[]>;
  };

  test("four events under hooks with path-only commands", () => {
    assert.equal(config.version, 1);
    assert.equal("failClosed" in config, false);
    assert.deepEqual(Object.keys(config.hooks), [...events]);
    for (const event of events) {
      const command = config.hooks[event][0].command;
      assert.equal(command, `.cursor/hooks/${event}.cmd`);
      assert.equal(command.includes(" "), false);
      assert.doesNotMatch(command, /\bingest\b/);
    }
    assert.doesNotMatch(JSON.stringify(config), /ingest\.cmd/);
  });
});
