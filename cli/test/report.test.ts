import assert from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import {
  emitSessionReport,
  parseYamlDocuments,
  writeSessionReport,
} from "../src/report.ts";
import { emitYamlDocument } from "../src/yaml.ts";

const roots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "audit-report-"));
  roots.push(root);
  return root;
}

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

function yamlDoc(
  event: string,
  now: Date,
  payload: Record<string, unknown> = {},
  harness = "cursor",
  turn = 0,
): string {
  return emitYamlDocument({
    payload,
    sessionId: "sess-1",
    harness,
    event,
    now,
    turn,
  });
}

function turnBlock(md: string, turn: number): string {
  const heading = `## Turn ${turn}`;
  const start = md.indexOf(heading);
  if (start < 0) return "";
  const from = md.slice(start);
  const next = from.slice(heading.length).search(/\n## /);
  if (next < 0) return from;
  return from.slice(0, heading.length + next);
}

function timeRows(text: string): string[] {
  return text.split("\n").filter((line) => /^\| \d{2}:/.test(line));
}

const startAt = new Date(2026, 8, 1, 15, 0, 0);
const endAt = new Date(2026, 8, 1, 15, 1, 0);

const locked = `## Overview

| Field | Value |
| --- | --- |
| session_id | sess-1 |
| source_harness | cursor |
| start | 15:00:00 |
| end | 15:01:00 |
| duration | 00:01:00 |

## Event counts

Total: 2

| source_event | count |
| --- | --- |
| sessionStart | 1 |
| sessionEnd | 1 |

## Turn 0

Duration: 00:01:00

| Time | Event | Details |
| --- | --- | --- |
| 15:00:00 | sessionStart |  |
| 15:01:00 | sessionEnd | reason: completed |
`;

describe("parseYamlDocuments + emitSessionReport", () => {
  test("sessionStart then sessionEnd matches the locked Markdown shape", () => {
    const yaml =
      yamlDoc("sessionStart", startAt) +
      yamlDoc("sessionEnd", endAt, { reason: "completed" });
    const docs = parseYamlDocuments(yaml);
    const md = emitSessionReport(docs);
    assert.equal(md, locked);
    assert.equal(md.includes("## Events"), false);
    assert.equal(md.includes("Prompt:"), false);
  });

  test("duration is last minus first; equal and inverted are 00:00:00", () => {
    const long =
      yamlDoc("sessionStart", new Date(2026, 8, 1, 15, 0, 0)) +
      yamlDoc("sessionEnd", new Date(2026, 8, 1, 16, 1, 9), { reason: "done" });
    assert.ok(
      emitSessionReport(parseYamlDocuments(long)).includes("| duration | 01:01:09 |"),
    );
    const equal =
      yamlDoc("sessionStart", startAt) +
      yamlDoc("sessionEnd", startAt, { reason: "done" });
    assert.ok(
      emitSessionReport(parseYamlDocuments(equal)).includes("| duration | 00:00:00 |"),
    );
    const inverted =
      yamlDoc("sessionStart", new Date(2026, 8, 1, 16, 0, 0)) +
      yamlDoc("sessionEnd", new Date(2026, 8, 1, 15, 0, 0), { reason: "done" });
    assert.ok(
      emitSessionReport(parseYamlDocuments(inverted)).includes("| duration | 00:00:00 |"),
    );
  });

  test("overview source_harness is the last document not a session-end walk", () => {
    const startThenPrompt =
      yamlDoc("sessionStart", startAt, {}, "cursor") +
      yamlDoc("beforeSubmitPrompt", endAt, { prompt: "hi" }, "copilot");
    const startThenPromptMd = emitSessionReport(parseYamlDocuments(startThenPrompt));
    assert.ok(startThenPromptMd.includes("| source_harness | copilot |"));
    assert.equal(startThenPromptMd.includes("| source_harness | cursor |"), false);

    const endThenStart =
      yamlDoc("sessionEnd", startAt, { reason: "completed" }, "cursor") +
      yamlDoc("sessionStart", endAt, {}, "copilot");
    const endThenStartMd = emitSessionReport(parseYamlDocuments(endThenStart));
    assert.ok(endThenStartMd.includes("| source_harness | copilot |"));
    assert.equal(endThenStartMd.includes("| source_harness | cursor |"), false);

    const onlyStart = emitSessionReport(
      parseYamlDocuments(yamlDoc("sessionStart", startAt, {}, "cursor")),
    );
    assert.ok(onlyStart.includes("| source_harness | cursor |"));
    assert.ok(onlyStart.includes("| duration | 00:00:00 |"));
    assert.equal(onlyStart.includes("sessionEnd"), false);
  });

  test("duration is first to last timestamp regardless of source_event", () => {
    const startThenStop = yamlDoc("sessionStart", startAt) + yamlDoc("stop", endAt);
    assert.ok(
      emitSessionReport(parseYamlDocuments(startThenStop)).includes("| duration | 00:01:00 |"),
    );

    const twoStarts =
      yamlDoc("subagentStart", new Date(2026, 8, 1, 15, 0, 0), {
        subagent_type: "explore",
      }) +
      yamlDoc("subagentStart", new Date(2026, 8, 1, 16, 1, 9), {
        subagent_type: "explore",
      });
    assert.ok(
      emitSessionReport(parseYamlDocuments(twoStarts)).includes("| duration | 01:01:09 |"),
    );

    const equal = yamlDoc("sessionStart", startAt) + yamlDoc("stop", startAt);
    assert.ok(
      emitSessionReport(parseYamlDocuments(equal)).includes("| duration | 00:00:00 |"),
    );

    const inverted =
      yamlDoc("sessionStart", new Date(2026, 8, 1, 16, 0, 0)) +
      yamlDoc("stop", new Date(2026, 8, 1, 15, 0, 0));
    assert.ok(
      emitSessionReport(parseYamlDocuments(inverted)).includes("| duration | 00:00:00 |"),
    );

    const withDurationMs = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionStart",
      'timestamp: "15:00:00"',
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: stop",
      'timestamp: "15:01:00"',
      "duration_ms: 999999",
      "",
    ].join("\n");
    const durationMsMd = emitSessionReport(parseYamlDocuments(withDurationMs));
    assert.ok(durationMsMd.includes("| duration | 00:01:00 |"));
    assert.equal(durationMsMd.includes("999999"), false);
  });

  test("Details task comes from handwritten YAML body", () => {
    const both = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "task: do the thing",
      "",
    ].join("\n");
    assert.ok(
      emitSessionReport(parseYamlDocuments(both)).includes(
        "| 15:00:00 | subagentStart | agent_type: explore; task: do the thing |",
      ),
    );

    const absent = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "",
    ].join("\n");
    const absentMd = emitSessionReport(parseYamlDocuments(absent));
    assert.ok(absentMd.includes("| 15:00:00 | subagentStart | agent_type: explore |"));
    assert.equal(absentMd.includes("task:"), false);

    const taskOnly = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "task: do the thing",
      "",
    ].join("\n");
    const taskOnlyMd = emitSessionReport(parseYamlDocuments(taskOnly));
    assert.ok(taskOnlyMd.includes("| 15:00:00 | subagentStart | task: do the thing |"));
    assert.equal(taskOnlyMd.includes("agent_type:"), false);

    const taskNull = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "task: null",
      "",
    ].join("\n");
    assert.ok(emitSessionReport(parseYamlDocuments(taskNull)).includes("task: null"));

    const copilot = [
      "---",
      "session_id: sess-1",
      "source_harness: copilot",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "",
    ].join("\n");
    const copilotMd = emitSessionReport(parseYamlDocuments(copilot));
    assert.ok(copilotMd.includes("| 15:00:00 | subagentStart | agent_type: explore |"));
    assert.equal(copilotMd.includes("task:"), false);
    assert.equal(copilotMd.includes("agent_display_name:"), false);

    const claude = [
      "---",
      "session_id: sess-1",
      "source_harness: claude-code",
      "source_event: SubagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "",
    ].join("\n");
    const claudeMd = emitSessionReport(parseYamlDocuments(claude));
    assert.ok(claudeMd.includes("| 15:00:00 | SubagentStart | agent_type: explore |"));
    assert.equal(claudeMd.includes("task:"), false);
    assert.equal(claudeMd.includes("agent_display_name:"), false);

    const longTask = "t".repeat(81);
    const longYaml = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      `task: ${longTask}`,
      "",
    ].join("\n");
    assert.ok(
      emitSessionReport(parseYamlDocuments(longYaml)).includes(`task: ${"t".repeat(80)}... |`),
    );

    const pipeYaml = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "task: a|b",
      "",
    ].join("\n");
    const pipeRow = emitSessionReport(parseYamlDocuments(pipeYaml))
      .split("\n")
      .find((line) => line.startsWith("| 15:00:00 | subagentStart |"));
    assert.equal(pipeRow, "| 15:00:00 | subagentStart | task: a\\|b |");
  });

  test("Details agent_display_name comes from handwritten YAML body", () => {
    const allThree = [
      "---",
      "session_id: sess-1",
      "source_harness: copilot",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "agent_display_name: Explore",
      "task: do the thing",
      "",
    ].join("\n");
    assert.ok(
      emitSessionReport(parseYamlDocuments(allThree)).includes(
        "| 15:00:00 | subagentStart | agent_type: explore; agent_display_name: Explore; task: do the thing |",
      ),
    );

    const absent = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "task: do the thing",
      "",
    ].join("\n");
    const absentMd = emitSessionReport(parseYamlDocuments(absent));
    assert.ok(
      absentMd.includes(
        "| 15:00:00 | subagentStart | agent_type: explore; task: do the thing |",
      ),
    );
    assert.equal(absentMd.includes("agent_display_name:"), false);

    const stopPresent = [
      "---",
      "session_id: sess-1",
      "source_harness: copilot",
      "source_event: subagentStop",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "agent_display_name: Explore",
      "response_text: done",
      "",
    ].join("\n");
    assert.ok(
      emitSessionReport(parseYamlDocuments(stopPresent)).includes(
        "| 15:00:00 | subagentStop | agent_type: explore; agent_display_name: Explore; response_text: done |",
      ),
    );

    const stopAbsent = [
      "---",
      "session_id: sess-1",
      "source_harness: copilot",
      "source_event: subagentStop",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "response_text: done",
      "",
    ].join("\n");
    const stopAbsentMd = emitSessionReport(parseYamlDocuments(stopAbsent));
    assert.ok(
      stopAbsentMd.includes(
        "| 15:00:00 | subagentStop | agent_type: explore; response_text: done |",
      ),
    );
    assert.equal(stopAbsentMd.includes("agent_display_name:"), false);
  });

  test("Details follow source_event fields including null and header-only", () => {
    const sessionStart = emitSessionReport(
      parseYamlDocuments(yamlDoc("sessionStart", startAt)),
    );
    assert.ok(sessionStart.includes("| 15:00:00 | sessionStart |  |"));

    const sessionEnd = emitSessionReport(
      parseYamlDocuments(yamlDoc("sessionEnd", startAt, { reason: "completed" })),
    );
    assert.ok(sessionEnd.includes("| 15:00:00 | sessionEnd | reason: completed |"));

    const subStart = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("subagentStart", startAt, {
          subagent_type: "explore",
          transcript_path: "/tmp/t",
        }),
      ),
    );
    assert.ok(subStart.includes("| 15:00:00 | subagentStart | agent_type: explore |"));
    assert.equal(subStart.includes("transcript_path"), false);
    assert.equal(subStart.includes("task:"), false);
    assert.equal(subStart.includes("agent_display_name:"), false);

    const subStartWithTask = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("subagentStart", startAt, {
          subagent_type: "explore",
          task: "do the thing",
        }),
      ),
    );
    assert.ok(
      subStartWithTask.includes(
        "| 15:00:00 | subagentStart | agent_type: explore; task: do the thing |",
      ),
    );
    assert.equal(subStartWithTask.includes("agent_display_name:"), false);

    const subStop = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("subagentStop", startAt, {
          subagent_type: "explore",
          transcript_path: "/tmp/t",
          summary: "done",
        }),
      ),
    );
    assert.ok(
      subStop.includes("| 15:00:00 | subagentStop | agent_type: explore; response_text: done |"),
    );
    assert.equal(subStop.includes("transcript_path"), false);
    assert.equal(subStop.includes("agent_display_name:"), false);

    const prompt = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, { prompt: "hello" })),
    );
    assert.ok(prompt.includes("| 15:00:00 | beforeSubmitPrompt | prompt: hello |"));

    const stop = emitSessionReport(
      parseYamlDocuments(yamlDoc("stop", startAt, { transcript_path: "/tmp/t" })),
    );
    assert.ok(stop.includes("| 15:00:00 | stop |  |"));
    assert.equal(stop.includes("transcript_path"), false);

    const unmapped = emitSessionReport(
      parseYamlDocuments(yamlDoc("workspaceOpen", startAt, { reason: "x" })),
    );
    assert.ok(unmapped.includes("| 15:00:00 | workspaceOpen |  |"));

    const absent = emitSessionReport(
      parseYamlDocuments(yamlDoc("sessionEnd", startAt, {})),
    );
    assert.ok(absent.includes("| 15:00:00 | sessionEnd |  |"));
    assert.equal(absent.includes("reason:"), false);

    const presentNull = emitSessionReport(
      parseYamlDocuments(yamlDoc("sessionEnd", startAt, { reason: null })),
    );
    assert.ok(presentNull.includes("| 15:00:00 | sessionEnd | reason: null |"));

    const agentNull = emitSessionReport(
      parseYamlDocuments(yamlDoc("subagentStart", startAt, { subagent_type: null })),
    );
    assert.ok(agentNull.includes("agent_type: null"));
    assert.equal(agentNull.includes("transcript_path"), false);

    const yamlWithTranscript = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "transcript_path: /tmp/t",
      "",
    ].join("\n");
    const ignoreTranscript = emitSessionReport(parseYamlDocuments(yamlWithTranscript));
    assert.ok(ignoreTranscript.includes("| 15:00:00 | subagentStart | agent_type: explore |"));
    assert.equal(ignoreTranscript.includes("transcript_path"), false);
    assert.equal(ignoreTranscript.includes("task:"), false);

    const yamlWithTask = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "task: do the thing",
      "",
    ].join("\n");
    const includeTask = emitSessionReport(parseYamlDocuments(yamlWithTask));
    assert.ok(
      includeTask.includes(
        "| 15:00:00 | subagentStart | agent_type: explore; task: do the thing |",
      ),
    );
    assert.equal(includeTask.includes("agent_display_name:"), false);

    const yamlWithDisplay = [
      "---",
      "session_id: sess-1",
      "source_harness: copilot",
      "source_event: subagentStart",
      'timestamp: "15:00:00"',
      "agent_type: explore",
      "agent_display_name: Explore",
      "",
    ].join("\n");
    const includeDisplay = emitSessionReport(parseYamlDocuments(yamlWithDisplay));
    assert.ok(
      includeDisplay.includes(
        "| 15:00:00 | subagentStart | agent_type: explore; agent_display_name: Explore |",
      ),
    );

    const stopYamlWithTranscript = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: stop",
      'timestamp: "15:00:00"',
      "transcript_path: /tmp/t",
      "",
    ].join("\n");
    const ignoreStopTranscript = emitSessionReport(
      parseYamlDocuments(stopYamlWithTranscript),
    );
    assert.ok(ignoreStopTranscript.includes("| 15:00:00 | stop |  |"));
    assert.equal(ignoreStopTranscript.includes("transcript_path"), false);
  });

  test("parser accepts F003 quoted timestamp, block scalar, empty harness, and YAML null", () => {
    const block = emitYamlDocument({
      payload: { prompt: "hello\nworld" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now: startAt,
      turn: 0,
    });
    const blockMd = emitSessionReport(parseYamlDocuments(block));
    assert.ok(blockMd.includes("| 15:00:00 | beforeSubmitPrompt | prompt: hello world |"));

    const emptyHarness = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "",
      event: "sessionEnd",
      now: startAt,
      turn: 0,
    });
    const docs = parseYamlDocuments(emptyHarness);
    assert.equal(docs[0]?.source_harness, "");
    assert.equal(docs[0]?.timestamp, "15:00:00");
    const emptyMd = emitSessionReport(docs);
    assert.ok(emptyMd.includes("| source_harness |  |"));

    const nullYaml = emitYamlDocument({
      payload: { subagent_type: null },
      sessionId: "sess-1",
      harness: "cursor",
      event: "subagentStart",
      now: startAt,
      turn: 0,
    });
    assert.ok(nullYaml.includes("agent_type: null"));
    const nullMd = emitSessionReport(parseYamlDocuments(nullYaml));
    assert.ok(nullMd.includes("agent_type: null"));
  });

  test("truncates Details values over 80 characters after collapsing newlines", () => {
    const eighty = "a".repeat(80);
    const eightyMd = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, { prompt: eighty })),
    );
    assert.ok(eightyMd.includes(`prompt: ${eighty} |`));
    assert.equal(eightyMd.includes(`${eighty}...`), false);

    const eightyOne = "b".repeat(81);
    const eightyOneMd = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, { prompt: eightyOne })),
    );
    assert.ok(eightyOneMd.includes(`prompt: ${"b".repeat(80)}... |`));

    const withNewline = `${"c".repeat(40)}\n${"d".repeat(50)}`;
    const newlineMd = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, { prompt: withNewline })),
    );
    const collapsed = `${"c".repeat(40)} ${"d".repeat(50)}`;
    assert.ok(newlineMd.includes(`prompt: ${collapsed.slice(0, 80)}... |`));
  });

  test("subagent start and stop are consecutive table rows without nesting", () => {
    const yaml =
      yamlDoc("sessionStart", startAt) +
      yamlDoc("subagentStart", startAt, {
        subagent_type: "explore",
        transcript_path: "/tmp/t",
      }) +
      yamlDoc("subagentStop", startAt, {
        subagent_type: "explore",
        transcript_path: "/tmp/t",
        summary: "done",
      }) +
      yamlDoc("sessionEnd", endAt, { reason: "completed" });
    const md = emitSessionReport(parseYamlDocuments(yaml));
    assert.equal(md.includes("<ul>"), false);
    assert.equal(md.includes("###"), false);
    const rows = md
      .split("\n")
      .filter((line) => line.startsWith("| 15:"));
    const startIdx = rows.findIndex((line) => line.includes("| subagentStart |"));
    const stopIdx = rows.findIndex((line) => line.includes("| subagentStop |"));
    assert.ok(startIdx >= 0);
    assert.equal(stopIdx, startIdx + 1);
  });

  test("a Details value containing | stays one cell", () => {
    const md = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, { prompt: "a|b" })),
    );
    const row = md
      .split("\n")
      .find((line) => line.startsWith("| 15:00:00 | beforeSubmitPrompt |"));
    assert.equal(row, "| 15:00:00 | beforeSubmitPrompt | prompt: a\\|b |");
  });

  test("Claude SessionEnd and Copilot sessionEnd stay distinct in counts and Event column", () => {
    const claude = emitYamlDocument({
      payload: { reason: "clear" },
      sessionId: "sess-1",
      harness: "claude-code",
      event: "SessionEnd",
      now: startAt,
      turn: 0,
    });
    const claudeMd = emitSessionReport(parseYamlDocuments(claude));
    assert.ok(claudeMd.includes("| SessionEnd | 1 |"));
    assert.ok(claudeMd.includes("| 15:00:00 | SessionEnd | reason: clear |"));
    assert.ok(claudeMd.includes("| source_harness | claude-code |"));

    const copilot = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "copilot",
      event: "sessionEnd",
      now: startAt,
      turn: 0,
    });
    const copilotMd = emitSessionReport(parseYamlDocuments(copilot));
    assert.ok(copilotMd.includes("| sessionEnd | 1 |"));
    assert.ok(copilotMd.includes("| 15:00:00 | sessionEnd | reason: completed |"));
    assert.ok(copilotMd.includes("| source_harness | copilot |"));

    const both = claude + copilot;
    const bothMd = emitSessionReport(parseYamlDocuments(both));
    assert.ok(bothMd.includes("| SessionEnd | 1 |"));
    assert.ok(bothMd.includes("| sessionEnd | 1 |"));
    assert.ok(bothMd.includes("| source_harness | copilot |"));
  });

  test("quoted scalar that JSON-decodes to a non-string keeps the raw text", (t) => {
    const original = JSON.parse;
    t.mock.method(JSON, "parse", (text: string) => {
      if (text === '"true"') return true;
      return original(text);
    });
    const yaml = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionEnd",
      'timestamp: "15:00:00"',
      'reason: "true"',
      "",
    ].join("\n");
    const docs = parseYamlDocuments(yaml);
    assert.equal(docs[0]?.body.reason, '"true"');
  });

  test("omitted header key is an empty string", () => {
    const yaml = [
      "---",
      "session_id: sess-1",
      "source_event: sessionEnd",
      'timestamp: "15:00:00"',
      "",
    ].join("\n");
    const docs = parseYamlDocuments(yaml);
    assert.equal(docs[0]?.source_harness, "");
  });

  test("parses YAML integer turn; missing empty non-integer and 1.5 become 0", () => {
    const unquoted = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionEnd",
      'timestamp: "15:00:00"',
      "turn: 3",
      "reason: completed",
      "",
    ].join("\n");
    const unquotedDocs = parseYamlDocuments(unquoted);
    assert.equal(unquotedDocs[0]?.turn, 3);
    const unquotedMd = emitSessionReport(unquotedDocs);
    assert.ok(unquotedMd.includes("## Turn 3"));
    assert.ok(unquotedMd.includes("| 15:00:00 | sessionEnd | reason: completed |"));
    assert.equal(unquotedMd.includes("turn:"), false);

    const omitted = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionStart",
      'timestamp: "15:00:00"',
      "",
    ].join("\n");
    assert.equal(parseYamlDocuments(omitted)[0]?.turn, 0);

    const quoted = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionStart",
      'timestamp: "15:00:00"',
      'turn: "x"',
      "",
    ].join("\n");
    assert.equal(parseYamlDocuments(quoted)[0]?.turn, 0);

    const fractional = [
      "---",
      "session_id: sess-1",
      "source_harness: cursor",
      "source_event: sessionStart",
      'timestamp: "15:00:00"',
      "turn: 1.5",
      "",
    ].join("\n");
    assert.equal(parseYamlDocuments(fractional)[0]?.turn, 0);
  });

  test("groups subsections by turn ascending in file order inside each table", () => {
    const yaml =
      yamlDoc("sessionStart", startAt, {}, "cursor", 0) +
      yamlDoc("stop", new Date(2026, 8, 1, 15, 0, 10), {}, "cursor", 2) +
      yamlDoc(
        "beforeSubmitPrompt",
        new Date(2026, 8, 1, 15, 0, 20),
        { prompt: "hello" },
        "cursor",
        1,
      ) +
      yamlDoc("sessionEnd", endAt, { reason: "completed" }, "cursor", 0);
    const md = emitSessionReport(parseYamlDocuments(yaml));
    const headings = md.split("\n").filter((line) => line.startsWith("## Turn "));
    assert.deepEqual(headings, ["## Turn 0", "## Turn 1", "## Turn 2"]);
    assert.equal(md.includes("## Events"), false);
    assert.equal(md.includes("## Turn 3"), false);
    const turn0Rows = timeRows(turnBlock(md, 0));
    assert.deepEqual(turn0Rows, [
      "| 15:00:00 | sessionStart |  |",
      "| 15:01:00 | sessionEnd | reason: completed |",
    ]);
    const turn1Rows = timeRows(turnBlock(md, 1));
    assert.deepEqual(turn1Rows, [
      "| 15:00:20 | beforeSubmitPrompt | prompt: hello |",
    ]);
    const turn2Rows = timeRows(turnBlock(md, 2));
    assert.deepEqual(turn2Rows, ["| 15:00:10 | stop |  |"]);
    const headers = md
      .split("\n")
      .filter((line) => line.startsWith("| Time |"));
    assert.ok(headers.length >= 1);
    for (const header of headers) {
      assert.equal(header, "| Time | Event | Details |");
    }
    for (const row of timeRows(md)) {
      assert.equal(row.split("|").length, 5);
    }

    const promptOnly = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("beforeSubmitPrompt", startAt, { prompt: "hello" }, "cursor", 1),
      ),
    );
    assert.equal(promptOnly.includes("## Turn 0"), false);
    assert.ok(promptOnly.includes("## Turn 1"));

    const skipMiddle = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("sessionStart", startAt, {}, "cursor", 0) +
          yamlDoc("stop", endAt, {}, "cursor", 2),
      ),
    );
    assert.ok(skipMiddle.includes("## Turn 0"));
    assert.equal(skipMiddle.includes("## Turn 1"), false);
    assert.ok(skipMiddle.includes("## Turn 2"));
  });

  test("turn duration uses prompt-kind start and last doc; stop does not close", () => {
    const twoStops =
      yamlDoc("beforeSubmitPrompt", startAt, { prompt: "hello" }, "cursor", 1) +
      yamlDoc("stop", new Date(2026, 8, 1, 15, 0, 10), {}, "cursor", 1) +
      yamlDoc("stop", endAt, {}, "cursor", 1);
    const twoStopsMd = emitSessionReport(parseYamlDocuments(twoStops));
    assert.ok(turnBlock(twoStopsMd, 1).includes("Duration: 00:01:00"));
    assert.equal(turnBlock(twoStopsMd, 1).includes("Duration: 00:00:10"), false);

    const turn0Span =
      yamlDoc("sessionStart", startAt, {}, "cursor", 0) +
      yamlDoc(
        "beforeSubmitPrompt",
        new Date(2026, 8, 1, 15, 0, 30),
        { prompt: "hi" },
        "cursor",
        1,
      ) +
      yamlDoc("stop", endAt, {}, "cursor", 1) +
      yamlDoc(
        "sessionEnd",
        new Date(2026, 8, 1, 15, 2, 0),
        { reason: "done" },
        "cursor",
        0,
      );
    const turn0SpanMd = emitSessionReport(parseYamlDocuments(turn0Span));
    assert.ok(turnBlock(turn0SpanMd, 0).includes("Duration: 00:02:00"));
    assert.ok(turn0SpanMd.includes("| duration | 00:02:00 |"));

    const equal =
      yamlDoc("beforeSubmitPrompt", startAt, { prompt: "x" }, "cursor", 1) +
      yamlDoc("stop", startAt, {}, "cursor", 1);
    assert.ok(
      turnBlock(emitSessionReport(parseYamlDocuments(equal)), 1).includes(
        "Duration: 00:00:00",
      ),
    );

    const inverted =
      yamlDoc(
        "beforeSubmitPrompt",
        new Date(2026, 8, 1, 16, 0, 0),
        { prompt: "x" },
        "cursor",
        1,
      ) + yamlDoc("stop", startAt, {}, "cursor", 1);
    assert.ok(
      turnBlock(emitSessionReport(parseYamlDocuments(inverted)), 1).includes(
        "Duration: 00:00:00",
      ),
    );

    const noPromptKind =
      yamlDoc("stop", startAt, {}, "cursor", 1) + yamlDoc("stop", endAt, {}, "cursor", 1);
    const noPromptKindMd = emitSessionReport(parseYamlDocuments(noPromptKind));
    assert.ok(turnBlock(noPromptKindMd, 1).includes("Duration: 00:01:00"));
    assert.equal(turnBlock(noPromptKindMd, 1).includes("Prompt:"), false);
  });

  test("turn n>=1 prompt line uses preview; turn 0 omits Prompt", () => {
    const cursor = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("beforeSubmitPrompt", startAt, { prompt: "hello" }, "cursor", 1),
      ),
    );
    assert.ok(turnBlock(cursor, 1).includes("Prompt: hello"));

    const copilot = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("userPromptSubmitted", startAt, { prompt: "hello" }, "copilot", 1),
      ),
    );
    assert.ok(turnBlock(copilot, 1).includes("Prompt: hello"));

    const claude = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("UserPromptSubmit", startAt, { prompt: "hello" }, "claude-code", 1),
      ),
    );
    assert.ok(turnBlock(claude, 1).includes("Prompt: hello"));

    const absent = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, {}, "cursor", 1)),
    );
    assert.equal(turnBlock(absent, 1).includes("Prompt:"), false);

    const presentNull = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("beforeSubmitPrompt", startAt, { prompt: null }, "cursor", 1),
      ),
    );
    assert.ok(turnBlock(presentNull, 1).includes("Prompt: null"));

    const turn0 = emitSessionReport(parseYamlDocuments(yamlDoc("sessionStart", startAt)));
    assert.equal(turnBlock(turn0, 0).includes("Prompt:"), false);

    const eightyOne = "b".repeat(81);
    const longMd = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("beforeSubmitPrompt", startAt, { prompt: eightyOne }, "cursor", 1),
      ),
    );
    const previewed = `${"b".repeat(80)}...`;
    assert.ok(turnBlock(longMd, 1).includes(`Prompt: ${previewed}`));
    assert.ok(longMd.includes(`prompt: ${previewed} |`));

    const pipeMd = emitSessionReport(
      parseYamlDocuments(
        yamlDoc("beforeSubmitPrompt", startAt, { prompt: "a|b" }, "cursor", 1),
      ),
    );
    assert.ok(turnBlock(pipeMd, 1).includes("Prompt: a\\|b"));
    const pipeRow = timeRows(pipeMd).find((line) =>
      line.includes("| beforeSubmitPrompt |"),
    );
    assert.equal(pipeRow, "| 15:00:00 | beforeSubmitPrompt | prompt: a\\|b |");
  });

  test("emitSessionReport throws on empty docs", () => {
    assert.throws(() => emitSessionReport([]), { message: "empty yaml" });
  });
});

describe("writeSessionReport", () => {
  test("throws on empty yaml text", async () => {
    const root = await makeRoot();
    const yamlPath = path.join(root, "sess.yaml");
    const mdPath = path.join(root, "sess.md");
    await writeFile(yamlPath, "");
    await assert.rejects(writeSessionReport({ yamlPath, mdPath }));
    await assert.rejects(readFile(mdPath));
  });
});
