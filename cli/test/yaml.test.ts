import assert from "node:assert";
import { describe, test } from "node:test";
import {
  emitYamlDocument,
  isInitialSessionStart,
  nextConversationTurn,
} from "../src/yaml.ts";

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
      turn: 0,
      includeSessionId: true,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: sessionEnd",
        'timestamp: "15:00:00"',
        "turn: 0",
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
    assert.equal(got.includes("agent_display_name:"), false);
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        'task: "do the thing"',
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("agent_display_name:"), false);
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 0);
  });

  test("Cursor subagentStart task null emits null after agent_type", () => {
    const got = emitYamlDocument({
      payload: { subagent_type: "explore", task: null },
      sessionId: "parent-1",
      harness: "cursor",
      event: "subagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("task:"), false);
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Copilot subagentStart body is agent_type then agent_display_name", () => {
    const got = emitYamlDocument({
      payload: {
        agentName: "explore",
        agentDisplayName: "Explore",
        task: "do the thing",
      },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "agent_display_name: Explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("task:"), false);
    assert.equal(got.includes("agent_type: Explore"), false);
  });

  test("Copilot subagentStart agentDisplayName null emits null after agent_type", () => {
    const got = emitYamlDocument({
      payload: { agentName: "explore", agentDisplayName: null },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "agent_display_name: null",
        "",
      ].join("\n"),
    );
  });

  test("Copilot subagentStart omits agent_display_name even with trap fields", () => {
    const got = emitYamlDocument({
      payload: {
        agentName: "explore",
        agentDescription: "Explore",
        task: "do the thing",
        subagent_type: "Explore",
      },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_display_name:"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("Claude SubagentStart omits task even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { agent_type: "explore", task: "do the thing" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SubagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: claude-code",
        "event: SubagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("task:"), false);
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Cursor subagentStart omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitYamlDocument({
      payload: {
        subagent_type: "explore",
        agentDisplayName: "Explore",
        agentDescription: "Explore",
      },
      sessionId: "parent-1",
      harness: "cursor",
      event: "subagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Claude SubagentStart omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitYamlDocument({
      payload: {
        agent_type: "explore",
        agentDisplayName: "Explore",
        agentDescription: "Explore",
      },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SubagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: claude-code",
        "event: SubagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_display_name:"), false);
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Cursor subagentStop omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitYamlDocument({
      payload: {
        subagent_type: "explore",
        summary: "done",
        agentDisplayName: "Explore",
        agentDescription: "Explore",
      },
      sessionId: "sess-1",
      harness: "cursor",
      event: "subagentStop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("AC-F005.6 Cursor prompt maps prompt", () => {
    const got = emitYamlDocument({
      payload: { prompt: "hello", extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 0",
        "prompt: hello",
        "",
      ].join("\n"),
    );
  });

  test("AC-F005.6 Cursor prompt absent is header only", () => {
    const got = emitYamlDocument({
      payload: { extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("prompt:"), false);
  });

  test("AC-F005.6 Cursor prompt present null emits null and body has no session_id", () => {
    const got = emitYamlDocument({
      payload: { session_id: "payload-id", prompt: null },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 0",
        "prompt: null",
        "",
      ].join("\n"),
    );
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 0);
  });

  test("AC-F006.8 Cursor stop is header-only even when payload has transcript_path", () => {
    const got = emitYamlDocument({
      payload: { transcript_path: "/tmp/t", extra: "omit" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "stop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: stop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("AC-F006.8 Copilot agentStop is header-only even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { transcript_path: "/tmp/t", task: "do the thing" },
      sessionId: "sess-1",
      harness: "copilot",
      event: "agentStop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: agentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
  });

  test("AC-F006.8 Claude Stop is header-only even when payload has task", () => {
    const got = emitYamlDocument({
      payload: { transcript_path: "/tmp/t", task: "do the thing" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "Stop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: claude-code",
        "event: Stop",
        'timestamp: "15:00:00"',
        "turn: 0",
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("transcriptPath"), false);
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Copilot subagentStop body is agent_type then agent_display_name then response_text", () => {
    const got = emitYamlDocument({
      payload: {
        agentType: "explore",
        agentDisplayName: "Explore",
        response: "done",
      },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "agent_display_name: Explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_type: Explore"), false);
  });

  test("Copilot subagentStop omits agent_display_name even with trap fields", () => {
    const got = emitYamlDocument({
      payload: {
        agentType: "explore",
        agentDescription: "Explore",
        task: "do the thing",
        subagent_type: "Explore",
        response: "done",
      },
      sessionId: "sess-1",
      harness: "copilot",
      event: "subagentStop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: copilot",
        "event: subagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Claude SubagentStop omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitYamlDocument({
      payload: {
        agent_type: "explore",
        last_assistant_message: "done",
        agentDisplayName: "Explore",
        agentDescription: "Explore",
      },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SubagentStop",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: claude-code",
        "event: SubagentStop",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "response_text: done",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("Claude SessionEnd uses reason", () => {
    const got = emitYamlDocument({
      payload: { reason: "clear" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: claude-code",
        "event: SessionEnd",
        'timestamp: "15:00:00"',
        "turn: 0",
        "reason: clear",
        "",
      ].join("\n"),
    );
  });

  test("AC-F003.16 omitted harness and event is four header fields only", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "",
      event: "",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        'harness: ""',
        'event: ""',
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
  });

  test("AC-F003.16 unrecognized harness is four header fields only", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "other",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: other",
        "event: sessionEnd",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
  });

  test("AC-F003.16 unrecognized event is four header fields only", () => {
    const got = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "workspaceOpen",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: workspaceOpen",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
  });

  test("passed turn 3 emits unquoted integer", () => {
    const got = emitYamlDocument({
      payload: { session_id: "sess-1" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
      turn: 3,
      includeSessionId: true,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 3",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes('turn: "3"'), false);
  });

  test("absent body key is omitted and present null emits null", () => {
    const got = emitYamlDocument({
      payload: { subagent_type: null },
      sessionId: "sess-1",
      harness: "cursor",
      event: "subagentStart",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: null",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("task:"), false);
    assert.equal(got.includes("agent_display_name:"), false);
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
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: subagentStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "agent_type: explore",
        "",
      ].join("\n"),
    );
    assert.equal([...got.matchAll(/^session_id:/gm)].length, 0);
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("nested"), false);
    assert.equal(got.includes("  agent_type"), false);
    assert.equal(got.includes("task:"), false);
    assert.equal(got.includes("agent_display_name:"), false);
  });

  test("payload number timestamp formats that instant local HH:MM:SS", () => {
    const ms = Date.UTC(2026, 8, 1, 13, 5, 9);
    const got = emitYamlDocument({
      payload: { timestamp: ms },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        `timestamp: "${localHms(new Date(ms))}"`,
        "turn: 0",
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
      turn: 0,
      includeSessionId: true,
    });
    assert.equal(
      got,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        `timestamp: "${localHms(new Date(iso))}"`,
        "turn: 0",
        "",
      ].join("\n"),
    );
  });

  test("missing and invalid timestamp use now", () => {
    const expected = [
      "---",
      "session_id: sess-1",
      "harness: cursor",
      "event: sessionStart",
      'timestamp: "15:00:00"',
        "turn: 0",
      "",
    ].join("\n");
    assert.equal(
      emitYamlDocument({
        payload: {},
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now,
      turn: 0,
      includeSessionId: true,
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
      turn: 0,
      includeSessionId: true,
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
      turn: 0,
      includeSessionId: true,
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
      turn: 0,
      includeSessionId: false,
    });
    assert.ok(finite.includes("reason: 42"));
    const nan = emitYamlDocument({
      payload: { reason: Number.NaN },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.ok(nan.includes('reason: "NaN"'));
    const inf = emitYamlDocument({
      payload: { reason: Number.POSITIVE_INFINITY },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.ok(inf.includes('reason: "Infinity"'));
  });


  test("AC-F003.13 compact keys omit empty quoted harness and event", () => {
    const got = emitYamlDocument({
      payload: { session_id: "sess-1" },
      sessionId: "sess-1",
      harness: "",
      event: "",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        'harness: ""',
        'event: ""',
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(got.includes("source_harness"), false);
    assert.equal(got.includes("source_event"), false);
    assert.equal(got.includes("session_id:"), false);
  });

  test("AC-F003.15 initial session-start is five fields; prompt is four starting with harness", () => {
    const start = emitYamlDocument({
      payload: { session_id: "sess-1" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    assert.equal(
      start,
      [
        "---",
        "session_id: sess-1",
        "harness: cursor",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    const prompt = emitYamlDocument({
      payload: { prompt: "hello" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 1,
      includeSessionId: false,
    });
    assert.equal(
      prompt,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 1",
        "prompt: hello",
        "",
      ].join("\n"),
    );
  });

  test("AC-F003.16 unmapped sessionStart is five header-only; unmapped prompt is four", () => {
    const start = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "other",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    assert.equal(
      start,
      [
        "---",
        "session_id: sess-1",
        "harness: other",
        "event: sessionStart",
        'timestamp: "15:00:00"',
        "turn: 0",
        "",
      ].join("\n"),
    );
    assert.equal(start.includes("reason:"), false);
    const prompt = emitYamlDocument({
      payload: { prompt: "hello" },
      sessionId: "sess-1",
      harness: "other",
      event: "beforeSubmitPrompt",
      now,
      turn: 1,
      includeSessionId: false,
    });
    assert.equal(
      prompt,
      [
        "---",
        "harness: other",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 1",
        "",
      ].join("\n"),
    );
    assert.equal(prompt.includes("prompt:"), false);
  });

  test("newline in string uses a block scalar", () => {
    const got = emitYamlDocument({
      payload: { prompt: "hello\nworld" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(
      got,
      [
        "---",
        "harness: cursor",
        "event: beforeSubmitPrompt",
        'timestamp: "15:00:00"',
        "turn: 0",
        "prompt: |",
        "  hello",
        "  world",
        "",
      ].join("\n"),
    );
  });
});

function headerDoc(event: string, quoted = false): string {
  const value = quoted ? JSON.stringify(event) : event;
  return [
    "---",
    "harness: cursor",
    `event: ${value}`,
    'timestamp: "15:00:00"',
    "turn: 0",
    "",
  ].join("\n");
}


describe("isInitialSessionStart", () => {
  test("empty plus sessionStart or SessionStart is true", () => {
    assert.equal(isInitialSessionStart("", "sessionStart"), true);
    assert.equal(isInitialSessionStart("", "SessionStart"), true);
  });

  test("empty plus prompt is false", () => {
    assert.equal(isInitialSessionStart("", "beforeSubmitPrompt"), false);
  });

  test("existing document plus sessionStart is false", () => {
    const existing = headerDoc("beforeSubmitPrompt");
    assert.equal(isInitialSessionStart(existing, "sessionStart"), false);
    assert.equal(isInitialSessionStart(existing, "SessionStart"), false);
    assert.equal(isInitialSessionStart(headerDoc("sessionStart"), "sessionStart"), false);
  });
});

describe("nextConversationTurn", () => {
  test("empty yaml is 0 for sessionStart stop empty and unrecognized", () => {
    assert.equal(nextConversationTurn("", "sessionStart"), 0);
    assert.equal(nextConversationTurn("", "stop"), 0);
    assert.equal(nextConversationTurn("", ""), 0);
    assert.equal(nextConversationTurn("", "workspaceOpen"), 0);
  });

  test("empty yaml is 1 for beforeSubmitPrompt", () => {
    assert.equal(nextConversationTurn("", "beforeSubmitPrompt"), 1);
  });

  test("sessionStart fixture stays 0 for non-prompt and 1 for beforeSubmitPrompt", () => {
    const existing = headerDoc("sessionStart");
    assert.equal(nextConversationTurn(existing, "sessionStart"), 0);
    assert.equal(nextConversationTurn(existing, "stop"), 0);
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 1);
  });

  test("stops after one prompt stay at 1", () => {
    const existing = headerDoc("beforeSubmitPrompt");
    assert.equal(nextConversationTurn(existing, "stop"), 1);
    assert.equal(nextConversationTurn(existing, "agentStop"), 1);
    assert.equal(nextConversationTurn(existing, "Stop"), 1);
    assert.equal(nextConversationTurn(existing, "subagentStop"), 1);
    assert.equal(nextConversationTurn(existing, "SubagentStop"), 1);
  });

  test("second beforeSubmitPrompt against one prompt-kind document is 2", () => {
    const existing = headerDoc("beforeSubmitPrompt");
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 2);
  });

  test("Copilot userPromptSubmitted is prompt-kind", () => {
    assert.equal(nextConversationTurn("", "userPromptSubmitted"), 1);
    const existing = headerDoc("userPromptSubmitted");
    assert.equal(nextConversationTurn(existing, "userPromptSubmitted"), 2);
  });

  test("Claude UserPromptSubmit is prompt-kind", () => {
    assert.equal(nextConversationTurn("", "UserPromptSubmit"), 1);
    const existing = headerDoc("UserPromptSubmit");
    assert.equal(nextConversationTurn(existing, "UserPromptSubmit"), 2);
  });

  test("mix of Cursor then Copilot or Claude aliases still increments", () => {
    const cursorThenCopilot = `${headerDoc("beforeSubmitPrompt")}${headerDoc("userPromptSubmitted")}`;
    assert.equal(nextConversationTurn(cursorThenCopilot, "UserPromptSubmit"), 3);
    const cursorThenClaude = `${headerDoc("beforeSubmitPrompt")}${headerDoc("UserPromptSubmit")}`;
    assert.equal(nextConversationTurn(cursorThenClaude, "userPromptSubmitted"), 3);
  });

  test("quoted event scalars that equal a prompt-kind alias count", () => {
    const existing = headerDoc("beforeSubmitPrompt", true);
    assert.equal(nextConversationTurn(existing, "stop"), 1);
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 2);
  });


  test("source_event trap line does not count as prompt-kind", () => {
    const existing = [
      "---",
      "harness: cursor",
      "source_event: beforeSubmitPrompt",
      'timestamp: "15:00:00"',
      "turn: 0",
      "",
    ].join("\n");
    assert.equal(nextConversationTurn(existing, "sessionStart"), 0);
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 1);
  });

  test("hook_event_name trap line does not count as prompt-kind", () => {
    const existing = [
      "---",
      "harness: cursor",
      "event: sessionStart",
      'timestamp: "15:00:00"',
      "turn: 0",
      "hook_event_name: beforeSubmitPrompt",
      "",
    ].join("\n");
    assert.equal(nextConversationTurn(existing, "sessionStart"), 0);
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 1);
  });
});
