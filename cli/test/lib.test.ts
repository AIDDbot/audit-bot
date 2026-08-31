import assert from "node:assert";
import { describe, test } from "node:test";
import { getHealthMessage } from "../src/lib.ts";

describe("getHealthMessage", () => {
  test("returns the example health line with the current date time", async () => {
    const message = getHealthMessage();
    assert.ok(message.startsWith("the app is up and running ("));
    assert.match(
      message,
      /the app is up and running \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\)$/,
    );
  });
});
