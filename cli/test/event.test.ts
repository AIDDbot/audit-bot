import assert from "node:assert";
import { describe, test } from "node:test";
import { eventLogLine, sessionIdentifier } from "../src/event.ts";

describe("sessionIdentifier", () => {
  test("session_id wins over conversation_id and parent_conversation_id", () => {
    const id = sessionIdentifier({
      session_id: "sess",
      conversation_id: "conv",
      parent_conversation_id: "parent",
    });
    assert.equal(id, "sess");
  });

  test("conversation_id is used when session_id is absent", () => {
    const id = sessionIdentifier({
      conversation_id: "conv",
      parent_conversation_id: "parent",
    });
    assert.equal(id, "conv");
  });

  test("parent_conversation_id is used only when both others are absent", () => {
    const id = sessionIdentifier({ parent_conversation_id: "parent" });
    assert.equal(id, "parent");
  });

  test("empty string, missing, and non-string yield undefined", () => {
    assert.equal(sessionIdentifier({ session_id: "" }), undefined);
    assert.equal(sessionIdentifier({ conversation_id: "" }), undefined);
    assert.equal(sessionIdentifier({ parent_conversation_id: "" }), undefined);
    assert.equal(sessionIdentifier({}), undefined);
    assert.equal(sessionIdentifier({ session_id: 1 }), undefined);
    assert.equal(sessionIdentifier({ sessionId: "copilot" }), undefined);
  });
});

describe("eventLogLine", () => {
  test("parsed line deep-equals the payload and keeps empty values", () => {
    const payload = {
      session_id: "s",
      prompt: "",
      items: [],
      meta: {},
      nested: { inner: "" },
    };
    const parsed = JSON.parse(eventLogLine(payload)) as unknown;
    assert.deepEqual(parsed, payload);
  });

  test("does not add overlay keys", () => {
    const parsed = JSON.parse(eventLogLine({ session_id: "s" })) as Record<
      string,
      unknown
    >;
    assert.equal("receivedAt" in parsed, false);
    assert.equal("harness" in parsed, false);
    assert.equal("hookEvent" in parsed, false);
  });

  test("preserves overlay keys when they were already on the payload", () => {
    const payload = {
      receivedAt: "keep",
      harness: "keep",
      hookEvent: "keep",
    };
    assert.deepEqual(JSON.parse(eventLogLine(payload)), payload);
  });
});
