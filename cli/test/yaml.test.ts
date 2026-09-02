import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";
import {
  emitSessionRecord,
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

function emitDoc(
  payload: Record<string, unknown>,
  event: string,
  harness = "cursor",
  includeSessionId = false,
): string {
  return emitSessionRecord({
    payload,
    sessionId: "sess-1",
    harness,
    event,
    now,
    turn: 0,
    includeSessionId,
  });
}

function parseRecord(text: string): Record<string, unknown> {
  return JSON.parse(text) as Record<string, unknown>;
}

function jsonRecord(
  harness: string,
  event: string,
  body: Record<string, unknown> = {},
  sessionId?: string,
): string {
  const obj: Record<string, unknown> = {};
  if (sessionId !== undefined) obj.session_id = sessionId;
  obj.harness = harness;
  obj.event = event;
  obj.timestamp = "15:00:00";
  obj.turn = 0;
  for (const key of Object.keys(body)) {
    obj[key] = body[key];
  }
  return `${JSON.stringify(obj)}\n`;
}

describe("emitSessionRecord", () => {
  test("Cursor sessionStart is header-only", () => {
    const got = emitSessionRecord({
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
      "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
  });

  test("AC-F003.5 Cursor sessionEnd body reason from reason with extras omitted", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"sessionEnd\",\"timestamp\":\"15:00:00\",\"turn\":0,\"reason\":\"completed\"}\n",
    );
  });

  test("AC-F006.5 Cursor subagentStart body is subagent only", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("task" in parseRecord(got), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F006.5 Cursor subagentStart body is task after subagent", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"task\":\"do the thing\"}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
    assert.equal("session_id" in parseRecord(got), false);
  });

  test("AC-F006.5 Cursor subagentStart task null emits null after subagent", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"task\":null}\n",
    );
  });

  test("AC-F006.6 Copilot subagentStart omits task even when payload has task", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal("task" in parseRecord(got), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F007.2 AC-F007.6 Copilot subagentStart body is agent_display_name after subagent", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"agent_display_name\":\"Explore\"}\n",
    );
    assert.equal("task" in parseRecord(got), false);
    assert.equal(got.includes('"subagent":"Explore"'), false);
    assert.equal("agent_type" in parseRecord(got), false);
  });

  test("AC-F007.2 Copilot subagentStart agentDisplayName null emits null after subagent", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"agent_display_name\":null}\n",
    );
  });

  test("AC-F007.4 Copilot subagentStart omits agent_display_name even with trap fields", () => {
    const got = emitSessionRecord({
      payload: {
        agentName: "explore",
        agentDescription: "Explore",
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal("agent_display_name" in parseRecord(got), false);
    assert.equal("task" in parseRecord(got), false);
  });

  test("AC-F006.6 Claude SubagentStart omits task even when payload has task", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"claude-code\",\"event\":\"SubagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal("task" in parseRecord(got), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F007.5 Cursor subagentStart omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F007.5 Claude SubagentStart omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"claude-code\",\"event\":\"SubagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("Cursor subagentStop maps summary to response_text", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F007.5 Cursor subagentStop omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F005.6 Cursor prompt maps prompt", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":0,\"prompt\":\"hello\"}\n",
    );
  });

  test("AC-F005.6 Cursor prompt absent is header only", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal("prompt" in parseRecord(got), false);
  });

  test("AC-F005.6 Cursor prompt present null emits null and body has no session_id", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":0,\"prompt\":null}\n",
    );
    assert.equal("session_id" in parseRecord(got), false);
  });

  test("AC-F006.8 Cursor stop is header-only even when payload has transcript_path", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"stop\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("task" in parseRecord(got), false);
  });

  test("AC-F006.8 Copilot agentStop is header-only even when payload has task", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"copilot\",\"event\":\"agentStop\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("task" in parseRecord(got), false);
  });

  test("AC-F006.8 Claude Stop is header-only even when payload has task", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"claude-code\",\"event\":\"Stop\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("task" in parseRecord(got), false);
  });

  test("Copilot subagentStop uses agentType and response without transcript_path", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("transcriptPath"), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F007.3 AC-F007.6 Copilot subagentStop body is agent_display_name after subagent then response_text", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"agent_display_name\":\"Explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal(got.includes('"subagent":"Explore"'), false);
    assert.equal("agent_type" in parseRecord(got), false);
  });

  test("AC-F007.4 Copilot subagentStop omits agent_display_name even with trap fields", () => {
    const got = emitSessionRecord({
      payload: {
        agentType: "explore",
        agentDescription: "Explore",
        task: "do the thing",
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
      "{\"harness\":\"copilot\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F007.5 Claude SubagentStop omits agent_display_name even with trap agentDisplayName", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"claude-code\",\"event\":\"SubagentStop\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\",\"response_text\":\"done\"}\n",
    );
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("Claude SessionEnd uses reason", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"claude-code\",\"event\":\"SessionEnd\",\"timestamp\":\"15:00:00\",\"turn\":0,\"reason\":\"clear\"}\n",
    );
  });

  test("AC-F003.16 omitted harness and event is four header-only when no matching subagent key", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"\",\"event\":\"\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
  });

  test("AC-F003.16 unrecognized harness is four header-only when no matching subagent key", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"other\",\"event\":\"sessionEnd\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
  });

  test("AC-F003.16 unrecognized event is four header-only when no matching subagent key", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"workspaceOpen\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
  });

  test("passed turn 3 is a JSON number", () => {
    const got = emitSessionRecord({
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
      "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":3}\n",
    );
    assert.equal(typeof parseRecord(got).turn, "number");
    assert.equal(got.includes('"turn":"3"'), false);
  });

  test("AC-F009.2 AC-F003.5 AC-F003.17 present null emits JSON null after header", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":null}\n",
    );
    assert.equal(parseRecord(got).subagent, null);
    assert.equal(got.includes("transcript_path"), false);
    assert.equal("task" in parseRecord(got), false);
    assert.equal("agent_display_name" in parseRecord(got), false);
  });

  test("AC-F003.5 body has no session_id and keys stay flat", () => {
    const got = emitSessionRecord({
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
    const parsed = parseRecord(got);
    assert.equal(
      got,
      "{\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"subagent\":\"explore\"}\n",
    );
    assert.equal("session_id" in parsed, false);
    assert.equal(got.includes("transcript_path"), false);
    assert.equal(got.includes("nested"), false);
    assert.deepEqual(Object.keys(parsed), ["harness", "event", "timestamp", "turn", "subagent"]);
    assert.equal("agent_type" in parsed, false);
    assert.equal("task" in parsed, false);
    assert.equal("agent_display_name" in parsed, false);
  });

  test("AC-F003.4 payload number timestamp formats that instant local HH:MM:SS", () => {
    const ms = Date.UTC(2026, 8, 1, 13, 5, 9);
    const got = emitSessionRecord({
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
      `{"session_id":"sess-1","harness":"cursor","event":"sessionStart","timestamp":"${localHms(new Date(ms))}","turn":0}\n`,
    );
  });

  test("AC-F003.4 payload ISO timestamp formats that instant local HH:MM:SS", () => {
    const iso = "2026-09-01T13:05:09.000Z";
    const got = emitSessionRecord({
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
      `{"session_id":"sess-1","harness":"cursor","event":"sessionStart","timestamp":"${localHms(new Date(iso))}","turn":0}\n`,
    );
  });

  test("AC-F003.4 missing and invalid timestamp use now", () => {
    const expected = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":0}\n";
    assert.equal(
      emitSessionRecord({
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
      emitSessionRecord({
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
      emitSessionRecord({
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

  test("finite number body field is a JSON number; NaN and Infinity become JSON null", () => {
    const finite = emitSessionRecord({
      payload: { reason: 42 },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(parseRecord(finite).reason, 42);
    const nan = emitSessionRecord({
      payload: { reason: Number.NaN },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(parseRecord(nan).reason, null);
    const inf = emitSessionRecord({
      payload: { reason: Number.POSITIVE_INFINITY },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(parseRecord(inf).reason, null);
  });


  test("AC-F003.13 compact keys write empty-string harness and event; omit source_* and session_id", () => {
    const got = emitSessionRecord({
      payload: { session_id: "sess-1" },
      sessionId: "sess-1",
      harness: "",
      event: "",
      now,
      turn: 0,
      includeSessionId: false,
    });
    const parsed = parseRecord(got);
    assert.equal(
      got,
      "{\"harness\":\"\",\"event\":\"\",\"timestamp\":\"15:00:00\",\"turn\":0}\n",
    );
    assert.equal(parsed.harness, "");
    assert.equal(parsed.event, "");
    assert.equal("source_harness" in parsed, false);
    assert.equal("source_event" in parsed, false);
    assert.equal("session_id" in parsed, false);
  });

  test("AC-F003.15 initial session-start JSON key order is five fields; other objects start with four", () => {
    const start = emitSessionRecord({
      payload: { session_id: "sess-1" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    assert.deepEqual(Object.keys(parseRecord(start)), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    const prompt = emitSessionRecord({
      payload: { prompt: "hello" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 1,
      includeSessionId: false,
    });
    assert.deepEqual(Object.keys(parseRecord(prompt)).slice(0, 4), [
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    assert.equal("session_id" in parseRecord(prompt), false);
  });

  test("AC-F003.16 unmapped sessionStart is five header-only when no matching subagent key; unmapped prompt is four", () => {
    const start = emitSessionRecord({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "other",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    const startRow = parseRecord(start);
    assert.deepEqual(Object.keys(startRow), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    assert.equal("reason" in startRow, false);
    const prompt = emitSessionRecord({
      payload: { prompt: "hello" },
      sessionId: "sess-1",
      harness: "other",
      event: "beforeSubmitPrompt",
      now,
      turn: 1,
      includeSessionId: false,
    });
    const promptRow = parseRecord(prompt);
    assert.deepEqual(Object.keys(promptRow), ["harness", "event", "timestamp", "turn"]);
    assert.equal("prompt" in promptRow, false);
  });

  test("AC-F009.2 AC-F003.16 AC-F003.17 unmapped initial sessionStart with subagent_type is five headers then subagent", () => {
    const got = emitSessionRecord({
      payload: { session_id: "sess-1", subagent_type: "explore", reason: "completed" },
      sessionId: "sess-1",
      harness: "other",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    const parsed = parseRecord(got);
    assert.deepEqual(Object.keys(parsed), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
      "subagent",
    ]);
    assert.equal(parsed.subagent, "explore");
    assert.equal("reason" in parsed, false);
    assert.equal("agent_type" in parsed, false);
  });

  test("AC-F003.18 emitSessionRecord is one JSON.parse-able object not a YAML document", () => {
    const got = emitSessionRecord({
      payload: { session_id: "sess-1", reason: "completed" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    assert.equal(got.startsWith("---"), false);
    assert.equal(got.includes("source_harness"), false);
    assert.equal(got.includes("source_event"), false);
    const parsed = parseRecord(got);
    assert.deepEqual(Object.keys(parsed).slice(0, 4), ["harness", "event", "timestamp", "turn"]);
    assert.equal(parsed.harness, "cursor");
    assert.equal(parsed.event, "sessionEnd");
    assert.equal(parsed.reason, "completed");
    assert.equal("session_id" in parsed, false);
  });

  test("newline in string is a JSON escape", () => {
    const got = emitSessionRecord({
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
      "{\"harness\":\"cursor\",\"event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":0,\"prompt\":\"hello\\nworld\"}\n",
    );
  });

  test("AC-F009.1 AC-F009.2 AC-F003.5 AC-F003.17 subagent follows header on every mapped event when subagent_type is present", () => {
    const start = emitDoc({ session_id: "sess-1", subagent_type: "explore" }, "sessionStart", "cursor", true);
    assert.equal(start, jsonRecord("cursor", "sessionStart", { subagent: "explore" }, "sess-1"));
    assert.equal("agent_type" in parseRecord(start), false);
    assert.deepEqual(Object.keys(parseRecord(start)).slice(0, 6), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
      "subagent",
    ]);
    const end = emitDoc({ subagent_type: "explore", reason: "completed" }, "sessionEnd");
    assert.equal(end, jsonRecord("cursor", "sessionEnd", { subagent: "explore", reason: "completed" }));
    const prompt = emitDoc({ subagent_type: "explore", prompt: "hello" }, "beforeSubmitPrompt");
    assert.equal(prompt, jsonRecord("cursor", "beforeSubmitPrompt", { subagent: "explore", prompt: "hello" }));
    const stop = emitDoc({ subagent_type: "explore" }, "stop");
    assert.equal(stop, jsonRecord("cursor", "stop", { subagent: "explore" }));
    const subStart = emitDoc({ subagent_type: "explore" }, "subagentStart");
    assert.equal(subStart, jsonRecord("cursor", "subagentStart", { subagent: "explore" }));
    const subStop = emitDoc({ subagent_type: "explore", summary: "done" }, "subagentStop");
    assert.equal(
      subStop,
      jsonRecord("cursor", "subagentStop", { subagent: "explore", response_text: "done" }),
    );
  });

  test("AC-F009.2 AC-F003.16 AC-F003.17 unknown empty and unmapped events still emit subagent from subagent_type", () => {
    const other = emitDoc({ subagent_type: "explore", reason: "completed" }, "sessionEnd", "other");
    assert.equal(other, jsonRecord("other", "sessionEnd", { subagent: "explore" }));
    assert.equal("reason" in parseRecord(other), false);
    const emptyHarness = emitDoc({ subagent_type: "explore", reason: "completed" }, "sessionEnd", "");
    assert.equal(emptyHarness, jsonRecord("", "sessionEnd", { subagent: "explore" }));
    assert.equal("reason" in parseRecord(emptyHarness), false);
    const unmapped = emitDoc({ subagent_type: "explore", reason: "completed" }, "workspaceOpen");
    assert.equal(unmapped, jsonRecord("cursor", "workspaceOpen", { subagent: "explore" }));
    assert.equal("reason" in parseRecord(unmapped), false);
    assert.equal("agent_type" in parseRecord(unmapped), false);
  });

  test("AC-F009.3 subagent prefers subagent_type then agent_type then agentType then agentName", () => {
    const allFour = emitDoc(
      {
        subagent_type: "from-subagent-type",
        agent_type: "from-agent-type",
        agentType: "from-agentType",
        agentName: "from-agentName",
      },
      "stop",
    );
    assert.equal(allFour, jsonRecord("cursor", "stop", { subagent: "from-subagent-type" }));
    const copilotStop = emitDoc(
      { agentType: "from-agentType", agentName: "from-agentName" },
      "subagentStop",
      "copilot",
    );
    assert.equal(copilotStop, jsonRecord("copilot", "subagentStop", { subagent: "from-agentType" }));
    const copilotStart = emitDoc({ agentName: "from-agentName" }, "subagentStart", "copilot");
    assert.equal(copilotStart, jsonRecord("copilot", "subagentStart", { subagent: "from-agentName" }));
    const claude = emitDoc({ agent_type: "from-agent-type" }, "SubagentStart", "claude-code");
    assert.equal(claude, jsonRecord("claude-code", "SubagentStart", { subagent: "from-agent-type" }));
    const copilotPref = emitDoc(
      { subagent_type: "from-subagent-type", agentName: "from-agentName" },
      "subagentStart",
      "copilot",
    );
    assert.equal(copilotPref, jsonRecord("copilot", "subagentStart", { subagent: "from-subagent-type" }));
  });

  test("AC-F009.4 AC-F003.17 subagent is omitted for display-name description id and task traps", () => {
    const traps = emitDoc(
      {
        agentDisplayName: "Explore",
        agent_display_name: "Explore",
        agentDescription: "Explore",
        agentId: "id-1",
        subagent_id: "sub-1",
        task: "do the thing",
      },
      "subagentStart",
    );
    assert.equal(traps, jsonRecord("cursor", "subagentStart", { task: "do the thing" }));
    assert.equal("subagent" in parseRecord(traps), false);
    const taskOnly = emitDoc({ task: "do the thing" }, "subagentStart");
    assert.equal(taskOnly, jsonRecord("cursor", "subagentStart", { task: "do the thing" }));
    assert.equal("subagent" in parseRecord(taskOnly), false);
    const promptTraps = emitDoc(
      {
        agentDisplayName: "Explore",
        agentDescription: "Explore",
        agentId: "id-1",
        subagent_id: "sub-1",
        task: "do the thing",
        prompt: "hello",
      },
      "beforeSubmitPrompt",
    );
    assert.equal(promptTraps, jsonRecord("cursor", "beforeSubmitPrompt", { prompt: "hello" }));
    assert.equal("subagent" in parseRecord(promptTraps), false);
  });
});

function headerDoc(event: string): string {
  return `${JSON.stringify({ harness: "cursor", event, timestamp: "15:00:00", turn: 0 })}\n`;
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
  test("AC-F008.1 AC-F008.3 empty JSONL is 0 for sessionStart stop empty and unrecognized", () => {
    assert.equal(nextConversationTurn("", "sessionStart"), 0);
    assert.equal(nextConversationTurn("", "stop"), 0);
    assert.equal(nextConversationTurn("", ""), 0);
    assert.equal(nextConversationTurn("", "workspaceOpen"), 0);
  });

  test("AC-F008.1 AC-F008.3 empty JSONL is 1 for beforeSubmitPrompt", () => {
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

  test("source_event trap line does not count as prompt-kind", () => {
    const existing = "{\"harness\":\"cursor\",\"source_event\":\"beforeSubmitPrompt\",\"timestamp\":\"15:00:00\",\"turn\":0}\n";
    assert.equal(nextConversationTurn(existing, "sessionStart"), 0);
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 1);
  });

  test("hook_event_name trap line does not count as prompt-kind", () => {
    const existing = "{\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":0,\"hook_event_name\":\"beforeSubmitPrompt\"}\n";
    assert.equal(nextConversationTurn(existing, "sessionStart"), 0);
    assert.equal(nextConversationTurn(existing, "beforeSubmitPrompt"), 1);
  });

  test("AC-F010.2 source_event or hook_event_name without prompt-kind event does not count", () => {
    const sourceOnly = `${JSON.stringify({ harness: "cursor", source_event: "beforeSubmitPrompt", timestamp: "15:00:00", turn: 0 })}\n`;
    assert.equal(nextConversationTurn(sourceOnly, "sessionStart"), 0);
    const hookOnly = `${JSON.stringify({ harness: "cursor", event: "sessionStart", hook_event_name: "beforeSubmitPrompt", timestamp: "15:00:00", turn: 0 })}\n`;
    assert.equal(nextConversationTurn(hookOnly, "stop"), 0);
  });
});

describe("AC-F010 session JSONL record", () => {
  test("AC-F010.6 compact snake_case header key order", () => {
    const withId = emitSessionRecord({
      payload: { session_id: "sess-1" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      now,
      turn: 0,
      includeSessionId: true,
    });
    assert.deepEqual(Object.keys(JSON.parse(withId)), [
      "session_id",
      "harness",
      "event",
      "timestamp",
      "turn",
    ]);
    const withoutId = emitSessionRecord({
      payload: { prompt: "hello" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 1,
      includeSessionId: false,
    });
    assert.deepEqual(Object.keys(JSON.parse(withoutId)), [
      "harness",
      "event",
      "timestamp",
      "turn",
      "prompt",
    ]);
  });

  test("AC-F010.6 session_id only when includeSessionId", () => {
    const included = JSON.parse(
      emitSessionRecord({
        payload: {},
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now,
        turn: 0,
        includeSessionId: true,
      }),
    );
    assert.equal(included.session_id, "sess-1");
    const omitted = JSON.parse(
      emitSessionRecord({
        payload: {},
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now,
        turn: 0,
        includeSessionId: false,
      }),
    );
    assert.equal("session_id" in omitted, false);
  });

  test("AC-F010.6 turn is a JSON number and present-null is JSON null", () => {
    const got = emitSessionRecord({
      payload: { prompt: null },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now,
      turn: 2,
      includeSessionId: false,
    });
    const parsed = JSON.parse(got);
    assert.equal(typeof parsed.turn, "number");
    assert.equal(parsed.turn, 2);
    assert.equal(parsed.prompt, null);
  });

  test("AC-F010.2 one object per line and stringify parse round-trip", () => {
    const got = emitSessionRecord({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      now,
      turn: 0,
      includeSessionId: false,
    });
    const lines = got.split("\n").filter((line) => line.length > 0);
    assert.equal(lines.length, 1);
    assert.ok(got.endsWith("\n"));
    const parsed = JSON.parse(lines[0] ?? "");
    assert.deepEqual(parsed, JSON.parse(JSON.stringify(parsed)));
  });

  test("AC-F010.6 blank-line-only JSONL is initial session-start", () => {
    assert.equal(isInitialSessionStart("\n\n", "sessionStart"), true);
    assert.equal(isInitialSessionStart("\n\n", "SessionStart"), true);
  });

  test("AC-F010.8 package has no YAML or JSON library", async () => {
    const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
    assert.deepEqual(pkg.dependencies, {});
    assert.equal(pkg.name, "cli-node");
    assert.equal(pkg.bin["cli-node"], "src/index.ts");
  });
});
