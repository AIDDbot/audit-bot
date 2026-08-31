import assert from "node:assert";
import { describe, test } from "node:test";
import { buildEvent, omitEmpty } from "../src/event.ts";

describe("omitEmpty", () => {
  test("drops nested empty objects, arrays, and strings, and omits empty parents", () => {
    const cleaned = omitEmpty({
      gone: null,
      blank: "",
      emptyList: [],
      emptyObj: {},
      nested: { inner: "", deeper: { none: null } },
      keep: "ok",
      items: [{ skip: "" }, { n: 1 }],
    });
    assert.deepEqual(cleaned, {
      keep: "ok",
      items: [{}, { n: 1 }],
    });
  });

  test("keeps 0, false, and non-empty strings", () => {
    const cleaned = omitEmpty({
      zero: 0,
      flag: false,
      text: "hello",
    });
    assert.deepEqual(cleaned, { zero: 0, flag: false, text: "hello" });
  });
});

describe("buildEvent", () => {
  test("overlays harness, receivedAt, and hookEvent over payload keys of the same name", () => {
    const event = buildEvent({
      harness: "cursor",
      receivedAt: "2026-08-31T18:00:00.000Z",
      hookEvent: "sessionStart",
      payload: {
        harness: "ignored",
        receivedAt: "nope",
        hookEvent: "nope",
        prompt: "hi",
        empty: "",
      },
    });
    assert.deepEqual(event, {
      prompt: "hi",
      harness: "cursor",
      receivedAt: "2026-08-31T18:00:00.000Z",
      hookEvent: "sessionStart",
    });
  });

  test("keeps remaining payload keys after omit", () => {
    const event = buildEvent({
      harness: "claude",
      receivedAt: "2026-08-31T18:00:00.000Z",
      hookEvent: "Stop",
      payload: { session_id: "abc", duration_ms: 0, extra: {} },
    });
    assert.equal(event.session_id, "abc");
    assert.equal(event.duration_ms, 0);
    assert.equal("extra" in event, false);
  });
});
