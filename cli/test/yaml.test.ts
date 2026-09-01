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

  test("Cursor subagentStart body is agent_type only", () => {
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
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("Cursor subagentStart body is agent_type then task", () => {
    const got = emitYamlDocument({
      payload: {
        subagent_type: "explore",
        task: "do the thing",
        transcript_path: "/tmp/t",
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
        'task: "do the thing"',
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 1);
  });

  test("Cursor subagentStart task null emits null after agent_type", () => {
    const got = emitYamlDocument({
      payload: { subagent_type: "explore", task: null },
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
        "task: null",
        "",
      ].join("\n"),
    );
  });

  test("Copilot subagentStart omits task even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { agentName: "explore", task: "do the thing", prompt: "hello" },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: copilot",
        "source_event: subagentStart",
        'timestamp: "15:00:00"',
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("task:"), false);
  });

  test("Claude SubagentStart omits task even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { agent_type: "explore", task: "do the thing" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SubagentStart",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: claude-code",
        "source_event: SubagentStart",
        'timestamp: "15:00:00"',
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("task:"), false);
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
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
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

  test("Cursor prompt absent is header only", () => {
    const got = emitYamlDocument({
      payload: { extra: "omit" },
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
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("prompt:"), false);
  });

  test("Cursor prompt present null emits null and body has no session_id", () => {
    const got = emitYamlDocument({
      payload: { session_id: "payload-id", prompt: null },
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
        "prompt: null",
        "",
      ].join("\n"),
    );
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 1);
  });

  test("Cursor stop is header-only even when payload has transcript_path", () => {
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
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("Copilot agentStop is header-only even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { transcript_path: "/tmp/t", task: "do the thing" },
      sessionId: "sess-1",
      harness: "copilot",
      event: "agentStop",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: copilot",
        "source_event: agentStop",
        'timestamp: "15:00:00"',
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("Claude Stop is header-only even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { transcript_path: "/tmp/t", task: "do the thing" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "Stop",
      now,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "source_harness: claude-code",
        "source_event: Stop",
        'timestamp: "15:00:00"',
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("Copilot subagentStop uses agentType and response without transcript_path", () => {
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
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("transcriptPath"), false);
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
    assert.equal(got.includes("task:"), false);
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
        "",
      ].join("\n"),
    );
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 1);
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("nested"), false);
    assert.equal(got.includes("  agent_type"), false);
    assert.equal(got.includes("task:"), false);
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

  test("finite number body field is unquoted; NaN and Infinity are quoted", () => {
    const finite = emitYamlDocument({
      payload: { reason: 42 },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
    });
    assert.ok(finite.includes("reason: 42"));
    const nan = emitYamlDocument({
      payload: { reason: Number.NaN },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
    });
    assert.ok(nan.includes('reason: "NaN"'));
    const inf = emitYamlDocument({
      payload: { reason: Number.POSITIVE_INFINITY },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
    });
    assert.ok(inf.includes('reason: "Infinity"'));
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
