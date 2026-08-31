import assert from "node:assert";
import { describe, test } from "node:test";
import { usageMessage } from "../src/usage.ts";

describe("usageMessage", () => {
  test("names ingest and does not name health as a command", () => {
    assert.match(usageMessage, /ingest/);
    assert.doesNotMatch(usageMessage, /\bhealth\b/i);
    assert.doesNotMatch(usageMessage, /up and running/i);
  });
});
