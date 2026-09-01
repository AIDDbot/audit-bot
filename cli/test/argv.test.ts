import assert from "node:assert";
import { describe, test } from "node:test";
import { parseArgv } from "../src/argv.ts";

describe("parseArgv", () => {
  test("ingest cursor sessionStart is ingest with both positionals", () => {
    const parsed = parseArgv([
      "node",
      "cli-node",
      "ingest",
      "cursor",
      "sessionStart",
    ]);
    assert.equal(parsed.command, "ingest");
    if (parsed.command !== "ingest") return;
    assert.equal(parsed.harness, "cursor");
    assert.equal(parsed.event, "sessionStart");
  });

  test("ingest cursor is ingest with harness only", () => {
    const parsed = parseArgv(["node", "cli-node", "ingest", "cursor"]);
    assert.equal(parsed.command, "ingest");
    if (parsed.command !== "ingest") return;
    assert.equal(parsed.harness, "cursor");
    assert.equal(parsed.event, undefined);
  });

  test("ingest with no further argv is ingest with neither positional", () => {
    const parsed = parseArgv(["node", "cli-node", "ingest"]);
    assert.equal(parsed.command, "ingest");
    if (parsed.command !== "ingest") return;
    assert.equal(parsed.harness, undefined);
    assert.equal(parsed.event, undefined);
  });

  test("extra tokens after both positionals are still ingest", () => {
    const parsed = parseArgv([
      "node",
      "cli-node",
      "ingest",
      "cursor",
      "sessionStart",
      "extra",
    ]);
    assert.equal(parsed.command, "ingest");
    if (parsed.command !== "ingest") return;
    assert.equal(parsed.harness, "cursor");
    assert.equal(parsed.event, "sessionStart");
  });

  test("unrecognized harness and event are still ingest", () => {
    const parsed = parseArgv(["node", "cli-node", "ingest", "other", "stop"]);
    assert.equal(parsed.command, "ingest");
    if (parsed.command !== "ingest") return;
    assert.equal(parsed.harness, "other");
    assert.equal(parsed.event, "stop");
  });

  test("omitted command is unknown", () => {
    const parsed = parseArgv(["node", "cli-node"]);
    assert.equal(parsed.command, "unknown");
  });

  test("argv[2] other than ingest is unknown", () => {
    const parsed = parseArgv(["node", "cli-node", "health"]);
    assert.equal(parsed.command, "unknown");
  });
});
