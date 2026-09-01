import assert from "node:assert";
import { describe, test } from "node:test";
import { emitYamlDocument } from "../src/yaml.ts";

const now = new Date(2026, 8, 1, 15, 0, 0);

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function localHms(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

describe("emitYamlDocument", () => {
  test("Cursor sessionStart is header-only", () => {
    const got = emitYamlDocument({
      payload: { session_id: "sess-1", extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: sessionStart",
        'timestamp: "15:00:00"',
        "",
      ].join("\n"),
    );
  });

  test("Cursor sessionEnd body reason from reason", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed", extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: sessionEnd",
        'timestamp: "15:00:00"',
        "reason: completed",
        "",
      ].join("\n"),
    );
  });

  test("Cursor subagentStart maps subagent_type and transcript_path", () => {
    const got = emitYamlDocument({
      payload: {
        subagent_type: "explore",
        transcript_path: "/tmp/t",
        extra: "omit",
      },
      sessionId: "parent-1",
      harness: "cursor",
      event: "subagentStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: parent-1",
        "source_harness: cursor",
        "source_event: subagentStart",
        'timestamp: "15:00:00"',
        "agent_type: explore",
        "transcript_path: /tmp/t",
        "",
      ].join("\n"),
    );
  });

  test("Cursor subagentStop maps summary to response_text", () => {
    const got = emitYamlDocument({
      payload: {
        subagent_type: "explore",
        transcript_path: "/tmp/t",
        summary: "done",
      },
      sessionId: "sess-1",
      harness: "cursor",
      event: "subagentStop",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: subagentStop",
        'timestamp: "15:00:00"',
        "agent_type: explore",
        "transcript_path: /tmp/t",
        "response_text: done",
        "",
      ].join("\n"),
    );
  });

  test("Cursor prompt maps prompt", () => {
    const got = emitYamlDocument({
      payload: { prompt: "hello", extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "prompt: hello",
        "",
      ].join("\n"),
    );
  });

  test("Cursor stop maps transcript_path", () => {
    const got = emitYamlDocument({
      payload: { transcript_path: "/tmp/t", extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "stop",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: stop",
        'timestamp: "15:00:00"',
        "transcript_path: /tmp/t",
        "",
      ].join("\n"),
    );
  });

  test("Copilot subagentStop uses agentType transcriptPath response", () => {
    const got = emitYamlDocument({
      payload: {
        agentType: "explore",
        transcriptPath: "/tmp/t",
        response: "done",
      },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStop",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: copilot",
        "source_event: subagentStop",
        'timestamp: "15:00:00"',
        "agent_type: explore",
        "transcript_path: /tmp/t",
        "response_text: done",
        "",
      ].join("\n"),
    );
  });

  test("Claude SessionEnd uses reason", () => {
    const got = emitYamlDocument({
      payload: { reason: "clear" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SessionEnd",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: claude-code",
        "source_event: SessionEnd",
        'timestamp: "15:00:00"',
        "reason: clear",
        "",
      ].join("\n"),
    );
  });

  test("omitted harness and event yield empty header strings", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "",
      event: "",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        'source_harness: ""',
        'source_event: ""',
        'timestamp: "15:00:00"',
        "",
      ].join("\n"),
    );
  });

  test("unrecognized harness is header only", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "other",
      event: "sessionEnd",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: other",
        "source_event: sessionEnd",
        'timestamp: "15:00:00"',
        "",
      ].join("\n"),
    );
  });

  test("unrecognized event is header only", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "workspaceOpen",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: workspaceOpen",
        'timestamp: "15:00:00"',
        "",
      ].join("\n"),
    );
  });

  test("absent body key is omitted and present null emits null", () => {
    const got = emitYamlDocument({
      payload: { subagent_type: null },
      sessionId: "sess-1",
      harness: "cursor",
      event: "subagentStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: subagentStart",
        'timestamp: "15:00:00"',
        "agent_type: null",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
  });

  test("body has no session_id and keys stay flat", () => {
    const got = emitYamlDocument({
      payload: {
        session_id: "payload-id",
        subagent_type: "explore",
        transcript_path: "/tmp/t",
        nested: { child: true },
      },
      sessionId: "parent-1",
      harness: "cursor",
      event: "subagentStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: parent-1",
        "source_harness: cursor",
        "source_event: subagentStart",
        'timestamp: "15:00:00"',
        "agent_type: explore",
        "transcript_path: /tmp/t",
        "",
      ].join("\n"),
    );
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 1);
    assert.equal(got.includes("nested"), false);
    assert.equal(got.includes("  agent_type"), false);
  });

  test("payload number timestamp formats that instant local HH:MM:SS", () => {
    const ms = Date.UTC(2026, 8, 1, 13, 5, 9);
    const got = emitYamlDocument({
      payload: { timestamp: ms },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: sessionStart",
        `timestamp: "${localHms(new Date(ms))}"`,
        "",
      ].join("\n"),
    );
  });

  test("payload ISO timestamp formats that instant local HH:MM:SS", () => {
    const iso = "2026-09-01T13:05:09.000Z";
    const got = emitYamlDocument({
      payload: { timestamp: iso },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: sessionStart",
        `timestamp: "${localHms(new Date(iso))}"`,
        "",
      ].join("\n"),
    );
  });

  test("missing and invalid timestamp use now", () => {
    const expected = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionStart",
      'timestamp: "15:00:00"',
      "",
    ].join("\n");
    assert.equal(
      emitYamlDocument({
        payload: {},
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now,
      }),
      expected,
    );
    assert.equal(
      emitYamlDocument({
        payload: { timestamp: "not-a-date" },
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now,
      }),
      expected,
    );
    assert.equal(
      emitYamlDocument({
        payload: { timestamp: Number.NaN },
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now,
      }),
      expected,
    );
  });

  test("newline in string uses a block scalar", () => {
    const got = emitYamlDocument({
      payload: { prompt: "hello\nworld" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: cursor",
        "source_event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "prompt: |",
        "  hello",
        "  world",
        "",
      ].join("\n"),
    );
  });
});
