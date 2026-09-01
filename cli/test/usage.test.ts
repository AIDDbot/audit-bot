import assert from "node:assert";
import { describe, test } from "node:test";
import { usageMessage } from "../src/usage.ts";

describe("usageMessage", () => {
  test("names ingest and does not name health", () => {
    assert.match(usageMessage, /ingest/);
    assert.doesNotMatch(usageMessage, /\bhealth\b/i);
    assert.equal(usageMessage, "usage: cli-node ingest");
  });
});
