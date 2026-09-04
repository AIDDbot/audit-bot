import assert from "node:assert";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, test } from "node:test";
import {
  emitSessionReport,
  parseSessionRecords,
  writeSessionReport,
} from "../src/report.ts";
import { emitSessionRecord } from "../src/yaml.ts";

const roots: string[] = [];

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "audit-report-"));
  roots.push(root);
  return root;
}

after(async () => {
  await Promise.all(roots.map((root) => rm(root, { recursive: true, force: true })));
});

function jsonlRecord(
  event: string,
  now: Date,
  payload: Record<string, unknown> = {},
  harness = "cursor",
  turn = 0,
): string {
  return emitSessionRecord({
    payload,
    sessionId: "sess-1",
    harness,
    event,
    now,
    turn,
    includeSessionId: true,
  });
}

function jsonlLine(fields: Record<string, unknown>): string {
  return `${JSON.stringify(fields)}\n`;
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

test("AC-F004.25 renders mapped Codex details but not turn_id", () => {
  const records = parseSessionRecords([
    jsonlLine({ session_id: "codex-1", harness: "codex", event: "SessionStart", timestamp: "10:00:00", turn: 0, model: "gpt-5.6", permission_mode: "workspace-write", source: "resume", cwd: "C:/work" }),
    jsonlLine({ harness: "codex", event: "SubagentStop", timestamp: "10:00:01", turn: 1, turn_id: "turn-a", subagent: "builder", agent_id: "agent-a", response_text: "done" }),
  ].join(""));
  const markdown = emitSessionReport(records, "codex-1");
  assert.match(markdown, /model: gpt-5\.6; permission_mode: workspace-write; source: resume; cwd: C:\/work/);
  assert.match(markdown, /\| 10:00:01 \| SubagentStop \| builder \| agent_id: agent-a; response_text: done \|/);
  assert.doesNotMatch(markdown, /turn_id:/);
});

function rowCells(row: string): {
  time: string;
  event: string;
  subagent: string;
  details: string;
} {
  const parts = row.split("|");
  assert.equal(parts.length, 6);
  return {
    time: (parts[1] ?? "").trim(),
    event: (parts[2] ?? "").trim(),
    subagent: (parts[3] ?? "").trim(),
    details: (parts[4] ?? "").trim(),
  };
}

function rowFor(md: string, event: string): string {
  const row = timeRows(md).find((line) => line.includes(`| ${event} |`));
  assert.ok(row !== undefined, `missing row for ${event}`);
  return row ?? "";
}

const startAt = new Date(2026, 8, 1, 15, 0, 0);
const endAt = new Date(2026, 8, 1, 15, 1, 0);

const locked = `## Overview

| Field | Value |
| --- | --- |
| session_id | sess-1 |
| harness | cursor |
| start | 15:00:00 |
| end | 15:01:00 |
| duration | 00:01:00 |

## Event counts

Total: 2

| event | count |
| --- | --- |
| sessionStart | 1 |
| sessionEnd | 1 |

## Turn 0

Duration: 00:01:00

| Time | Event | Subagent | Details |
| --- | --- | --- | --- |
| 15:00:00 | sessionStart |  |  |
| 15:01:00 | sessionEnd |  | reason: completed |
`;

describe("parseSessionRecords + emitSessionReport", () => {
  test("sessionStart then sessionEnd matches the locked Markdown shape", () => {
    const jsonl =
      jsonlRecord("sessionStart", startAt) +
      jsonlRecord("sessionEnd", endAt, { reason: "completed" });
    const docs = parseSessionRecords(jsonl);
    const md = emitSessionReport(docs);
    assert.equal(md, locked);
    assert.equal(md.includes("## Events"), false);
    assert.equal(md.includes("source_harness"), false);
    assert.equal(md.includes("source_event"), false);
    assert.equal(md.includes("Prompt:"), false);
  });

  test("duration is last minus first; equal and inverted are 00:00:00", () => {
    const long =
      jsonlRecord("sessionStart", new Date(2026, 8, 1, 15, 0, 0)) +
      jsonlRecord("sessionEnd", new Date(2026, 8, 1, 16, 1, 9), { reason: "done" });
    assert.ok(
      emitSessionReport(parseSessionRecords(long)).includes("| duration | 01:01:09 |"),
    );
    const equal =
      jsonlRecord("sessionStart", startAt) +
      jsonlRecord("sessionEnd", startAt, { reason: "done" });
    assert.ok(
      emitSessionReport(parseSessionRecords(equal)).includes("| duration | 00:00:00 |"),
    );
    const inverted =
      jsonlRecord("sessionStart", new Date(2026, 8, 1, 16, 0, 0)) +
      jsonlRecord("sessionEnd", new Date(2026, 8, 1, 15, 0, 0), { reason: "done" });
    assert.ok(
      emitSessionReport(parseSessionRecords(inverted)).includes("| duration | 00:00:00 |"),
    );
  });

  test("overview harness is the last document not a session-end walk", () => {
    const startThenPrompt =
      jsonlRecord("sessionStart", startAt, {}, "cursor") +
      jsonlRecord("beforeSubmitPrompt", endAt, { prompt: "hi" }, "copilot");
    const startThenPromptMd = emitSessionReport(parseSessionRecords(startThenPrompt));
    assert.ok(startThenPromptMd.includes("| harness | copilot |"));
    assert.equal(startThenPromptMd.includes("| harness | cursor |"), false);

    const endThenStart =
      jsonlRecord("sessionEnd", startAt, { reason: "completed" }, "cursor") +
      jsonlRecord("sessionStart", endAt, {}, "copilot");
    const endThenStartMd = emitSessionReport(parseSessionRecords(endThenStart));
    assert.ok(endThenStartMd.includes("| harness | copilot |"));
    assert.equal(endThenStartMd.includes("| harness | cursor |"), false);

    const onlyStart = emitSessionReport(
      parseSessionRecords(jsonlRecord("sessionStart", startAt, {}, "cursor")),
    );
    assert.ok(onlyStart.includes("| harness | cursor |"));
    assert.ok(onlyStart.includes("| duration | 00:00:00 |"));
    assert.equal(onlyStart.includes("sessionEnd"), false);
  });

  test("duration is first to last timestamp regardless of event", () => {
    const startThenStop = jsonlRecord("sessionStart", startAt) + jsonlRecord("stop", endAt);
    assert.ok(
      emitSessionReport(parseSessionRecords(startThenStop)).includes("| duration | 00:01:00 |"),
    );

    const twoStarts =
      jsonlRecord("subagentStart", new Date(2026, 8, 1, 15, 0, 0), {
        subagent_type: "explore",
      }) +
      jsonlRecord("subagentStart", new Date(2026, 8, 1, 16, 1, 9), {
        subagent_type: "explore",
      });
    assert.ok(
      emitSessionReport(parseSessionRecords(twoStarts)).includes("| duration | 01:01:09 |"),
    );

    const equal = jsonlRecord("sessionStart", startAt) + jsonlRecord("stop", startAt);
    assert.ok(
      emitSessionReport(parseSessionRecords(equal)).includes("| duration | 00:00:00 |"),
    );

    const inverted =
      jsonlRecord("sessionStart", new Date(2026, 8, 1, 16, 0, 0)) +
      jsonlRecord("stop", new Date(2026, 8, 1, 15, 0, 0));
    assert.ok(
      emitSessionReport(parseSessionRecords(inverted)).includes("| duration | 00:00:00 |"),
    );

    const withDurationMs =
      jsonlLine({
        session_id: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        timestamp: "15:00:00",
      }) +
      jsonlLine({
        session_id: "sess-1",
        harness: "cursor",
        event: "stop",
        timestamp: "15:01:00",
        duration_ms: 999999,
      });
    const durationMsMd = emitSessionReport(parseSessionRecords(withDurationMs));
    assert.ok(durationMsMd.includes("| duration | 00:01:00 |"));
    assert.equal(durationMsMd.includes("999999"), false);
  });

  test("AC-F004.22 Details keep task without identity; empty Subagent when identity absent", () => {
    const both = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\",\"task\":\"do the thing\"}\n";
    const bothCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(both)), "subagentStart"),
    );
    assert.equal(bothCells.subagent, "explore");
    assert.equal(bothCells.details, "task: do the thing");
    assert.equal(bothCells.details.includes("subagent"), false);
    assert.equal(bothCells.details.includes("agent_display_name"), false);
    assert.equal(bothCells.details.includes("agent_type"), false);

    const absent = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\"}\n";
    const absentCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(absent)), "subagentStart"),
    );
    assert.equal(absentCells.subagent, "explore");
    assert.equal(absentCells.details, "");
    assert.equal(absentCells.details.includes("task:"), false);

    const taskOnly = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"task\":\"do the thing\"}\n";
    const taskOnlyCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(taskOnly)), "subagentStart"),
    );
    assert.equal(taskOnlyCells.subagent, "");
    assert.equal(taskOnlyCells.details, "task: do the thing");
    assert.equal(taskOnlyCells.details.includes("subagent"), false);
    assert.equal(taskOnlyCells.details.includes("agent_type"), false);

    const taskNull = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"task\":null}\n";
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(taskNull)), "subagentStart"))
        .details,
      "task: null",
    );

    const copilot = "{\"session_id\":\"sess-1\",\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\"}\n";
    const copilotCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(copilot)), "subagentStart"),
    );
    assert.equal(copilotCells.subagent, "explore");
    assert.equal(copilotCells.details, "");
    assert.equal(copilotCells.details.includes("subagent"), false);
    assert.equal(copilotCells.details.includes("agent_display_name"), false);
    assert.equal(copilotCells.subagent.includes("agent_display_name:"), false);

    const claude = "{\"session_id\":\"sess-1\",\"harness\":\"claude-code\",\"event\":\"SubagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\"}\n";
    const claudeCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(claude)), "SubagentStart"),
    );
    assert.equal(claudeCells.subagent, "explore");
    assert.equal(claudeCells.details, "");
    assert.equal(claudeCells.subagent.includes("agent_display_name:"), false);

    const pipeJsonl = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"task\":\"a|b\"}\n";
    const pipeRow = rowFor(emitSessionReport(parseSessionRecords(pipeJsonl)), "subagentStart");
    assert.equal(pipeRow, "| 15:00:00 | subagentStart |  | task: a\\|b |");
  });

  test("AC-F004.24 Copilot start/stop Subagent is the bare name; omitted later rows stay empty", () => {
    const copilotStart = "{\"session_id\":\"sess-1\",\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\",\"agent_display_name\":\"Explore\",\"task\":\"do the thing\"}\n";
    const copilotStartCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(copilotStart)), "subagentStart"),
    );
    assert.equal(copilotStartCells.subagent, "explore");
    assert.equal(copilotStartCells.subagent.includes("subagent:"), false);
    assert.equal(copilotStartCells.subagent.includes("agent_type:"), false);
    assert.equal(copilotStartCells.subagent.includes("agent_display_name"), false);
    assert.equal(copilotStartCells.details, "task: do the thing");
    assert.equal(copilotStartCells.details.includes("subagent"), false);
    assert.equal(copilotStartCells.details.includes("agent_display_name"), false);
    assert.equal(copilotStartCells.details.includes("agent_type"), false);

    const copilotStop = "{\"session_id\":\"sess-1\",\"harness\":\"copilot\",\"event\":\"subagentStop\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\",\"agent_display_name\":\"Explore\",\"response_text\":\"done\"}\n";
    const copilotStopCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(copilotStop)), "subagentStop"),
    );
    assert.equal(copilotStopCells.subagent, "explore");
    assert.equal(copilotStopCells.subagent.includes("subagent:"), false);
    assert.equal(copilotStopCells.subagent.includes("agent_type:"), false);
    assert.equal(copilotStopCells.subagent.includes("agent_display_name"), false);
    assert.equal(copilotStopCells.details, "response_text: done");
    assert.equal(copilotStopCells.details.includes("subagent"), false);
    assert.equal(copilotStopCells.details.includes("agent_display_name"), false);
    assert.equal(copilotStopCells.details.includes("agent_type"), false);

    const cursorStart = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("subagentStart", startAt, { subagent_type: "explore" }),
      ),
    );
    assert.equal(rowCells(rowFor(cursorStart, "subagentStart")).subagent, "explore");
    assert.equal(cursorStart.includes("agent_display_name:"), false);

    const cursorStop = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("subagentStop", startAt, {
          subagent_type: "explore",
          summary: "done",
        }),
      ),
    );
    const cursorStopCells = rowCells(rowFor(cursorStop, "subagentStop"));
    assert.equal(cursorStopCells.subagent, "explore");
    assert.equal(cursorStopCells.details, "response_text: done");
    assert.equal(cursorStop.includes("agent_display_name:"), false);

    const claudeStart = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("SubagentStart", startAt, { agent_type: "explore" }, "claude-code"),
      ),
    );
    assert.equal(rowCells(rowFor(claudeStart, "SubagentStart")).subagent, "explore");
    assert.equal(claudeStart.includes("agent_display_name:"), false);

    const claudeStop = emitSessionReport(
      parseSessionRecords(
        jsonlRecord(
          "SubagentStop",
          startAt,
          { agent_type: "explore", last_assistant_message: "done" },
          "claude-code",
        ),
      ),
    );
    const claudeStopCells = rowCells(rowFor(claudeStop, "SubagentStop"));
    assert.equal(claudeStopCells.subagent, "explore");
    assert.equal(claudeStopCells.details, "response_text: done");
    assert.equal(claudeStop.includes("agent_display_name:"), false);

    const bothAbsent = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"task\":\"do the thing\"}\n";
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(bothAbsent)), "subagentStart"))
        .subagent,
      "",
    );

    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(jsonlRecord("sessionStart", startAt))), "sessionStart"))
        .subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(
            parseSessionRecords(jsonlRecord("sessionEnd", startAt, { reason: "completed" })),
          ),
          "sessionEnd",
        ),
      ).subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(
            parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "hi" })),
          ),
          "beforeSubmitPrompt",
        ),
      ).subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(
            parseSessionRecords(
              jsonlRecord("userPromptSubmitted", startAt, { prompt: "hi" }, "copilot"),
            ),
          ),
          "userPromptSubmitted",
        ),
      ).subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(
            parseSessionRecords(
              jsonlRecord("UserPromptSubmit", startAt, { prompt: "hi" }, "claude-code"),
            ),
          ),
          "UserPromptSubmit",
        ),
      ).subagent,
      "",
    );
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(jsonlRecord("stop", startAt))), "stop"))
        .subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(parseSessionRecords(jsonlRecord("agentStop", startAt, {}, "copilot"))),
          "agentStop",
        ),
      ).subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(parseSessionRecords(jsonlRecord("Stop", startAt, {}, "claude-code"))),
          "Stop",
        ),
      ).subagent,
      "",
    );
    assert.equal(
      rowCells(
        rowFor(
          emitSessionReport(parseSessionRecords(jsonlRecord("workspaceOpen", startAt))),
          "workspaceOpen",
        ),
      ).subagent,
      "",
    );

    const laterRows =
      jsonlRecord(
        "subagentStart",
        startAt,
        { subagent_type: "explore" },
        "cursor",
        1,
      ) +
      jsonlRecord("stop", new Date(2026, 8, 1, 15, 0, 10), {}, "cursor", 1) +
      jsonlRecord(
        "beforeSubmitPrompt",
        endAt,
        { prompt: "later" },
        "cursor",
        1,
      );
    const laterMd = emitSessionReport(parseSessionRecords(laterRows));
    assert.equal(rowCells(rowFor(laterMd, "subagentStart")).subagent, "explore");
    assert.equal(rowCells(rowFor(laterMd, "stop")).subagent, "");
    assert.equal(rowCells(rowFor(laterMd, "beforeSubmitPrompt")).subagent, "");
  });

  test("AC-F004.22 Details follow event fields including null and header-only", () => {
    const sessionStart = emitSessionReport(
      parseSessionRecords(jsonlRecord("sessionStart", startAt)),
    );
    const sessionStartCells = rowCells(rowFor(sessionStart, "sessionStart"));
    assert.equal(sessionStartCells.subagent, "");
    assert.equal(sessionStartCells.details, "");

    const sessionEnd = emitSessionReport(
      parseSessionRecords(jsonlRecord("sessionEnd", startAt, { reason: "completed" })),
    );
    const sessionEndCells = rowCells(rowFor(sessionEnd, "sessionEnd"));
    assert.equal(sessionEndCells.subagent, "");
    assert.equal(sessionEndCells.details, "reason: completed");
    assert.equal(sessionEndCells.details.includes("subagent"), false);

    const subStart = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("subagentStart", startAt, {
          subagent_type: "explore",
          transcript_path: "/tmp/t",
        }),
      ),
    );
    const subStartCells = rowCells(rowFor(subStart, "subagentStart"));
    assert.equal(subStartCells.subagent, "explore");
    assert.equal(subStartCells.details, "");
    assert.equal(subStart.includes("transcript_path"), false);
    assert.equal(subStartCells.details.includes("task:"), false);
    assert.equal(subStart.includes("agent_display_name:"), false);

    const subStartWithTask = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("subagentStart", startAt, {
          subagent_type: "explore",
          task: "do the thing",
        }),
      ),
    );
    const subStartWithTaskCells = rowCells(rowFor(subStartWithTask, "subagentStart"));
    assert.equal(subStartWithTaskCells.subagent, "explore");
    assert.equal(subStartWithTaskCells.details, "task: do the thing");
    assert.equal(subStartWithTask.includes("agent_display_name:"), false);
    assert.equal(subStartWithTaskCells.details.includes("subagent"), false);
    assert.equal(subStartWithTaskCells.details.includes("agent_display_name"), false);
    assert.equal(subStartWithTaskCells.details.includes("agent_type"), false);

    const subStop = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("subagentStop", startAt, {
          subagent_type: "explore",
          transcript_path: "/tmp/t",
          summary: "done",
        }),
      ),
    );
    const subStopCells = rowCells(rowFor(subStop, "subagentStop"));
    assert.equal(subStopCells.subagent, "explore");
    assert.equal(subStopCells.details, "response_text: done");
    assert.equal(subStop.includes("transcript_path"), false);
    assert.equal(subStop.includes("agent_display_name:"), false);
    assert.equal(subStopCells.details.includes("subagent"), false);
    assert.equal(subStopCells.details.includes("agent_display_name"), false);
    assert.equal(subStopCells.details.includes("agent_type"), false);

    const prompt = emitSessionReport(
      parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "hello" })),
    );
    const promptCells = rowCells(rowFor(prompt, "beforeSubmitPrompt"));
    assert.equal(promptCells.subagent, "");
    assert.equal(promptCells.details, "prompt: hello");
    assert.equal(promptCells.details.includes("subagent"), false);

    const stop = emitSessionReport(
      parseSessionRecords(jsonlRecord("stop", startAt, { transcript_path: "/tmp/t" })),
    );
    const stopCells = rowCells(rowFor(stop, "stop"));
    assert.equal(stopCells.subagent, "");
    assert.equal(stopCells.details, "");
    assert.equal(stop.includes("transcript_path"), false);

    const unmapped = emitSessionReport(
      parseSessionRecords(jsonlRecord("workspaceOpen", startAt, { reason: "x" })),
    );
    const unmappedCells = rowCells(rowFor(unmapped, "workspaceOpen"));
    assert.equal(unmappedCells.subagent, "");
    assert.equal(unmappedCells.details, "");

    const absent = emitSessionReport(
      parseSessionRecords(jsonlRecord("sessionEnd", startAt, {})),
    );
    const absentCells = rowCells(rowFor(absent, "sessionEnd"));
    assert.equal(absentCells.subagent, "");
    assert.equal(absentCells.details, "");
    assert.equal(absent.includes("reason:"), false);

    const presentNull = emitSessionReport(
      parseSessionRecords(jsonlRecord("sessionEnd", startAt, { reason: null })),
    );
    assert.equal(rowCells(rowFor(presentNull, "sessionEnd")).details, "reason: null");

    const agentNull = emitSessionReport(
      parseSessionRecords(jsonlRecord("subagentStart", startAt, { subagent_type: null })),
    );
    const agentNullCells = rowCells(rowFor(agentNull, "subagentStart"));
    assert.equal(agentNullCells.subagent, "null");
    assert.equal(agentNull.includes("transcript_path"), false);

    const jsonlWithTranscript = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\",\"transcript_path\":\"/tmp/t\"}\n";
    const ignoreTranscript = emitSessionReport(parseSessionRecords(jsonlWithTranscript));
    const ignoreTranscriptCells = rowCells(rowFor(ignoreTranscript, "subagentStart"));
    assert.equal(ignoreTranscriptCells.subagent, "explore");
    assert.equal(ignoreTranscriptCells.details, "");
    assert.equal(ignoreTranscript.includes("transcript_path"), false);
    assert.equal(ignoreTranscript.includes("task:"), false);

    const jsonlWithTask = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\",\"task\":\"do the thing\"}\n";
    const includeTask = emitSessionReport(parseSessionRecords(jsonlWithTask));
    const includeTaskCells = rowCells(rowFor(includeTask, "subagentStart"));
    assert.equal(includeTaskCells.subagent, "explore");
    assert.equal(includeTaskCells.details, "task: do the thing");
    assert.equal(includeTaskCells.details.includes("subagent"), false);
    assert.equal(includeTask.includes("agent_display_name:"), false);

    const jsonlWithDisplay = "{\"session_id\":\"sess-1\",\"harness\":\"copilot\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"explore\",\"agent_display_name\":\"Explore\"}\n";
    const includeDisplay = emitSessionReport(parseSessionRecords(jsonlWithDisplay));
    const includeDisplayCells = rowCells(rowFor(includeDisplay, "subagentStart"));
    assert.equal(includeDisplayCells.subagent, "explore");
    assert.equal(includeDisplayCells.details, "");
    assert.equal(includeDisplayCells.details.includes("agent_type"), false);
    assert.equal(includeDisplayCells.details.includes("subagent"), false);
    assert.equal(includeDisplayCells.details.includes("agent_display_name"), false);

    const stopJsonlWithTranscript = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"stop\",\"timestamp\":\"15:00:00\",\"transcript_path\":\"/tmp/t\"}\n";
    const ignoreStopTranscript = emitSessionReport(
      parseSessionRecords(stopJsonlWithTranscript),
    );
    const ignoreStopCells = rowCells(rowFor(ignoreStopTranscript, "stop"));
    assert.equal(ignoreStopCells.subagent, "");
    assert.equal(ignoreStopCells.details, "");
    assert.equal(ignoreStopTranscript.includes("transcript_path"), false);

    const historicalType = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"agent_type\":\"explore\",\"task\":\"do the thing\"}\n";
    const historicalCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(historicalType)), "subagentStart"),
    );
    assert.equal(historicalCells.subagent, "");
    assert.equal(historicalCells.details, "task: do the thing");
    assert.equal(historicalCells.details.includes("subagent"), false);
    assert.equal(historicalCells.details.includes("agent_type"), false);
  });

  test("parser accepts F003 timestamp, JSON strings, empty harness, and JSON null", () => {
    const block = jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "hello\nworld" });
    const blockMd = emitSessionReport(parseSessionRecords(block));
    assert.equal(
      rowCells(rowFor(blockMd, "beforeSubmitPrompt")).details,
      "prompt: hello world",
    );

    const emptyHarness = jsonlRecord("sessionEnd", startAt, { reason: "completed" }, "");
    const docs = parseSessionRecords(emptyHarness);
    assert.equal(docs[0]?.harness, "");
    assert.equal(docs[0]?.timestamp, "15:00:00");
    const emptyMd = emitSessionReport(docs);
    assert.ok(emptyMd.includes("| harness |  |"));

    const nullJsonl = jsonlRecord("subagentStart", startAt, { subagent_type: null });
    assert.ok(nullJsonl.includes('"subagent":null'));
    const nullMd = emitSessionReport(parseSessionRecords(nullJsonl));
    assert.equal(rowCells(rowFor(nullMd, "subagentStart")).subagent, "null");
    assert.equal(rowCells(rowFor(nullMd, "subagentStart")).details, "");
  });

  test("AC-F004.6 AC-F004.24 truncates Details Subagent and Prompt values over 100 characters after collapsing newlines", () => {
    const hundred = "a".repeat(100);
    const hundredMd = emitSessionReport(
      parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, { prompt: hundred })),
    );
    assert.equal(rowCells(rowFor(hundredMd, "beforeSubmitPrompt")).details, `prompt: ${hundred}`);
    assert.equal(hundredMd.includes(`${hundred}...`), false);

    const hundredOne = "b".repeat(101);
    const hundredOneMd = emitSessionReport(
      parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, { prompt: hundredOne })),
    );
    assert.equal(
      rowCells(rowFor(hundredOneMd, "beforeSubmitPrompt")).details,
      `prompt: ${"b".repeat(100)}...`,
    );

    const withNewline = `${"c".repeat(50)}\n${"d".repeat(60)}`;
    const newlineMd = emitSessionReport(
      parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, { prompt: withNewline })),
    );
    const collapsed = `${"c".repeat(50)} ${"d".repeat(60)}`;
    assert.equal(
      rowCells(rowFor(newlineMd, "beforeSubmitPrompt")).details,
      `prompt: ${collapsed.slice(0, 100)}...`,
    );

    const longTask = "t".repeat(101);
    const longTaskJsonl = jsonlLine({
      session_id: "sess-1",
      harness: "cursor",
      event: "subagentStart",
      timestamp: "15:00:00",
      task: longTask,
    });
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(longTaskJsonl)), "subagentStart"))
        .details,
      `task: ${"t".repeat(100)}...`,
    );

    const longResponse = "r".repeat(101);
    const longResponseJsonl = jsonlLine({
      session_id: "sess-1",
      harness: "cursor",
      event: "subagentStop",
      timestamp: "15:00:00",
      response_text: longResponse,
    });
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(longResponseJsonl)), "subagentStop"))
        .details,
      `response_text: ${"r".repeat(100)}...`,
    );

    const longType = "e".repeat(101);
    const longTypeJsonl = jsonlLine({
      session_id: "sess-1",
      harness: "cursor",
      event: "subagentStart",
      timestamp: "15:00:00",
      subagent: longType,
    });
    const longTypeCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(longTypeJsonl)), "subagentStart"),
    );
    assert.equal(longTypeCells.subagent, `${"e".repeat(100)}...`);
    assert.equal(longTypeCells.details, "");

    const hundredType = "e".repeat(100);
    const hundredTypeJsonl = jsonlLine({
      session_id: "sess-1",
      harness: "cursor",
      event: "subagentStart",
      timestamp: "15:00:00",
      subagent: hundredType,
    });
    const hundredTypeCells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(hundredTypeJsonl)), "subagentStart"),
    );
    assert.equal(hundredTypeCells.subagent, hundredType);
    assert.equal(hundredTypeCells.subagent.includes("..."), false);

    const longName = "n".repeat(101);
    const longNameJsonl = jsonlLine({
      session_id: "sess-1",
      harness: "copilot",
      event: "subagentStart",
      timestamp: "15:00:00",
      subagent: "explore",
      agent_display_name: longName,
    });
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(longNameJsonl)), "subagentStart"))
        .subagent,
      "explore",
    );
    assert.equal(
      rowCells(rowFor(emitSessionReport(parseSessionRecords(longNameJsonl)), "subagentStart"))
        .subagent.includes("agent_display_name"),
      false,
    );
  });

  test("AC-F004.24 Subagent cell is the bare subagent value on any event kind", () => {
    const kinds = [
      "sessionStart",
      "sessionEnd",
      "beforeSubmitPrompt",
      "stop",
      "agentStop",
      "Stop",
      "subagentStart",
      "SubagentStart",
      "workspaceOpen",
    ] as const;
    for (const event of kinds) {
      const withField = jsonlLine({
        session_id: "sess-1",
        harness: "cursor",
        event,
        timestamp: "15:00:00",
        subagent: "builder",
      });
      const withCells = rowCells(
        rowFor(emitSessionReport(parseSessionRecords(withField)), event),
      );
      assert.equal(withCells.subagent, "builder");
      assert.equal(withCells.subagent.includes("subagent:"), false);
      const withoutField = jsonlLine({
        session_id: "sess-1",
        harness: "cursor",
        event,
        timestamp: "15:00:00",
      });
      assert.equal(
        rowCells(rowFor(emitSessionReport(parseSessionRecords(withoutField)), event)).subagent,
        "",
      );
    }
    const mixed =
      "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"subagent\":\"builder\"}\n" +
      "{\"harness\":\"cursor\",\"event\":\"stop\",\"timestamp\":\"15:00:10\"}\n";
    const mixedMd = emitSessionReport(parseSessionRecords(mixed));
    assert.equal(rowCells(rowFor(mixedMd, "sessionStart")).subagent, "builder");
    assert.equal(rowCells(rowFor(mixedMd, "stop")).subagent, "");
  });

  test("AC-F004.24 historical agent_type without subagent leaves the Subagent cell empty", () => {
    const jsonl = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"subagentStart\",\"timestamp\":\"15:00:00\",\"agent_type\":\"explore\"}\n";
    const cells = rowCells(
      rowFor(emitSessionReport(parseSessionRecords(jsonl)), "subagentStart"),
    );
    assert.equal(cells.subagent, "");
    assert.equal(cells.details, "");
  });

  test("subagent start and stop are consecutive table rows without nesting", () => {
    const jsonl =
      jsonlRecord("sessionStart", startAt) +
      jsonlRecord("subagentStart", startAt, {
        subagent_type: "explore",
        transcript_path: "/tmp/t",
      }) +
      jsonlRecord("subagentStop", startAt, {
        subagent_type: "explore",
        transcript_path: "/tmp/t",
        summary: "done",
      }) +
      jsonlRecord("sessionEnd", endAt, { reason: "completed" });
    const md = emitSessionReport(parseSessionRecords(jsonl));
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
      parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "a|b" })),
    );
    const row = md
      .split("\n")
      .find((line) => line.startsWith("| 15:00:00 | beforeSubmitPrompt |"));
    assert.equal(row, "| 15:00:00 | beforeSubmitPrompt |  | prompt: a\\|b |");
  });

  test("Claude SessionEnd and Copilot sessionEnd stay distinct in counts and Event column", () => {
    const claude = jsonlRecord("SessionEnd", startAt, { reason: "clear" }, "claude-code");
    const claudeMd = emitSessionReport(parseSessionRecords(claude));
    assert.ok(claudeMd.includes("| SessionEnd | 1 |"));
    assert.equal(rowCells(rowFor(claudeMd, "SessionEnd")).details, "reason: clear");
    assert.equal(rowCells(rowFor(claudeMd, "SessionEnd")).subagent, "");
    assert.ok(claudeMd.includes("| harness | claude-code |"));

    const copilot = jsonlRecord("sessionEnd", startAt, { reason: "completed" }, "copilot");
    const copilotMd = emitSessionReport(parseSessionRecords(copilot));
    assert.ok(copilotMd.includes("| sessionEnd | 1 |"));
    assert.equal(rowCells(rowFor(copilotMd, "sessionEnd")).details, "reason: completed");
    assert.equal(rowCells(rowFor(copilotMd, "sessionEnd")).subagent, "");
    assert.ok(copilotMd.includes("| harness | copilot |"));

    const both = claude + copilot;
    const bothMd = emitSessionReport(parseSessionRecords(both));
    assert.ok(bothMd.includes("| SessionEnd | 1 |"));
    assert.ok(bothMd.includes("| sessionEnd | 1 |"));
    assert.ok(bothMd.includes("| harness | copilot |"));
  });

  test("quoted scalar that JSON-decodes to a non-string keeps the raw text", () => {
    const jsonl = jsonlLine({
      session_id: "sess-1",
      harness: "cursor",
      event: "sessionEnd",
      timestamp: "15:00:00",
      reason: "true",
    });
    const docs = parseSessionRecords(jsonl);
    assert.equal(docs[0]?.body.reason, "true");
  });

  test("omitted header key is an empty string", () => {
    const jsonl = "{\"session_id\":\"sess-1\",\"event\":\"sessionEnd\",\"timestamp\":\"15:00:00\"}\n";
    const docs = parseSessionRecords(jsonl);
    assert.equal(docs[0]?.harness, "");
  });

  test("parses JSON-number turn; missing empty non-integer and 1.5 become 0", () => {
    const unquoted = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionEnd\",\"timestamp\":\"15:00:00\",\"turn\":3,\"reason\":\"completed\"}\n";
    const unquotedDocs = parseSessionRecords(unquoted);
    assert.equal(typeof unquotedDocs[0]?.turn, "number");
    assert.equal(unquotedDocs[0]?.turn, 3);
    const unquotedMd = emitSessionReport(unquotedDocs);
    assert.ok(unquotedMd.includes("## Turn 3"));
    assert.equal(rowCells(rowFor(unquotedMd, "sessionEnd")).details, "reason: completed");
    assert.equal(rowCells(rowFor(unquotedMd, "sessionEnd")).subagent, "");
    assert.equal(unquotedMd.includes("turn:"), false);

    const omitted = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\"}\n";
    assert.equal(parseSessionRecords(omitted)[0]?.turn, 0);

    const quoted = "{\"session_id\":\"sess-1\",\"harness\":\"cursor\",\"event\":\"sessionStart\",\"timestamp\":\"15:00:00\",\"turn\":\"x\"}\n";
    assert.equal(parseSessionRecords(quoted)[0]?.turn, 0);

    const fractional = jsonlLine({
      session_id: "sess-1",
      harness: "cursor",
      event: "sessionStart",
      timestamp: "15:00:00",
      turn: 1.5,
    });
    assert.equal(parseSessionRecords(fractional)[0]?.turn, 0);
  });

  test("AC-F004.22 groups subsections by turn ascending in file order inside each table", () => {
    const jsonl =
      jsonlRecord("sessionStart", startAt, {}, "cursor", 0) +
      jsonlRecord("stop", new Date(2026, 8, 1, 15, 0, 10), {}, "cursor", 2) +
      jsonlRecord(
        "beforeSubmitPrompt",
        new Date(2026, 8, 1, 15, 0, 20),
        { prompt: "hello" },
        "cursor",
        1,
      ) +
      jsonlRecord("sessionEnd", endAt, { reason: "completed" }, "cursor", 0);
    const md = emitSessionReport(parseSessionRecords(jsonl));
    const headings = md.split("\n").filter((line) => line.startsWith("## Turn "));
    assert.deepEqual(headings, ["## Turn 0", "## Turn 1", "## Turn 2"]);
    assert.equal(md.includes("## Events"), false);
    assert.equal(md.includes("## Turn 3"), false);
    const turn0Rows = timeRows(turnBlock(md, 0));
    assert.deepEqual(turn0Rows, [
      "| 15:00:00 | sessionStart |  |  |",
      "| 15:01:00 | sessionEnd |  | reason: completed |",
    ]);
    const turn1Rows = timeRows(turnBlock(md, 1));
    assert.deepEqual(turn1Rows, [
      "| 15:00:20 | beforeSubmitPrompt |  | prompt: hello |",
    ]);
    const turn2Rows = timeRows(turnBlock(md, 2));
    assert.deepEqual(turn2Rows, ["| 15:00:10 | stop |  |  |"]);
    const headers = md
      .split("\n")
      .filter((line) => line.startsWith("| Time |"));
    assert.ok(headers.length >= 1);
    for (const header of headers) {
      assert.equal(header, "| Time | Event | Subagent | Details |");
    }
    for (const row of timeRows(md)) {
      assert.equal(row.split("|").length, 6);
    }

    const promptOnly = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "hello" }, "cursor", 1),
      ),
    );
    assert.equal(promptOnly.includes("## Turn 0"), false);
    assert.ok(promptOnly.includes("## Turn 1"));

    const skipMiddle = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("sessionStart", startAt, {}, "cursor", 0) +
          jsonlRecord("stop", endAt, {}, "cursor", 2),
      ),
    );
    assert.ok(skipMiddle.includes("## Turn 0"));
    assert.equal(skipMiddle.includes("## Turn 1"), false);
    assert.ok(skipMiddle.includes("## Turn 2"));
  });

  test("turn duration uses prompt-kind start and last doc; stop does not close", () => {
    const twoStops =
      jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "hello" }, "cursor", 1) +
      jsonlRecord("stop", new Date(2026, 8, 1, 15, 0, 10), {}, "cursor", 1) +
      jsonlRecord("stop", endAt, {}, "cursor", 1);
    const twoStopsMd = emitSessionReport(parseSessionRecords(twoStops));
    assert.ok(turnBlock(twoStopsMd, 1).includes("Duration: 00:01:00"));
    assert.equal(turnBlock(twoStopsMd, 1).includes("Duration: 00:00:10"), false);

    const turn0Span =
      jsonlRecord("sessionStart", startAt, {}, "cursor", 0) +
      jsonlRecord(
        "beforeSubmitPrompt",
        new Date(2026, 8, 1, 15, 0, 30),
        { prompt: "hi" },
        "cursor",
        1,
      ) +
      jsonlRecord("stop", endAt, {}, "cursor", 1) +
      jsonlRecord(
        "sessionEnd",
        new Date(2026, 8, 1, 15, 2, 0),
        { reason: "done" },
        "cursor",
        0,
      );
    const turn0SpanMd = emitSessionReport(parseSessionRecords(turn0Span));
    assert.ok(turnBlock(turn0SpanMd, 0).includes("Duration: 00:02:00"));
    assert.ok(turn0SpanMd.includes("| duration | 00:02:00 |"));

    const equal =
      jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "x" }, "cursor", 1) +
      jsonlRecord("stop", startAt, {}, "cursor", 1);
    assert.ok(
      turnBlock(emitSessionReport(parseSessionRecords(equal)), 1).includes(
        "Duration: 00:00:00",
      ),
    );

    const inverted =
      jsonlRecord(
        "beforeSubmitPrompt",
        new Date(2026, 8, 1, 16, 0, 0),
        { prompt: "x" },
        "cursor",
        1,
      ) + jsonlRecord("stop", startAt, {}, "cursor", 1);
    assert.ok(
      turnBlock(emitSessionReport(parseSessionRecords(inverted)), 1).includes(
        "Duration: 00:00:00",
      ),
    );

    const noPromptKind =
      jsonlRecord("stop", startAt, {}, "cursor", 1) + jsonlRecord("stop", endAt, {}, "cursor", 1);
    const noPromptKindMd = emitSessionReport(parseSessionRecords(noPromptKind));
    assert.ok(turnBlock(noPromptKindMd, 1).includes("Duration: 00:01:00"));
    assert.equal(turnBlock(noPromptKindMd, 1).includes("Prompt:"), false);
  });

  test("turn n>=1 prompt line uses preview; turn 0 omits Prompt", () => {
    const cursor = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "hello" }, "cursor", 1),
      ),
    );
    assert.ok(turnBlock(cursor, 1).includes("Prompt: hello"));

    const copilot = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("userPromptSubmitted", startAt, { prompt: "hello" }, "copilot", 1),
      ),
    );
    assert.ok(turnBlock(copilot, 1).includes("Prompt: hello"));

    const claude = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("UserPromptSubmit", startAt, { prompt: "hello" }, "claude-code", 1),
      ),
    );
    assert.ok(turnBlock(claude, 1).includes("Prompt: hello"));

    const absent = emitSessionReport(
      parseSessionRecords(jsonlRecord("beforeSubmitPrompt", startAt, {}, "cursor", 1)),
    );
    assert.equal(turnBlock(absent, 1).includes("Prompt:"), false);

    const presentNull = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("beforeSubmitPrompt", startAt, { prompt: null }, "cursor", 1),
      ),
    );
    assert.ok(turnBlock(presentNull, 1).includes("Prompt: null"));

    const turn0 = emitSessionReport(parseSessionRecords(jsonlRecord("sessionStart", startAt)));
    assert.equal(turnBlock(turn0, 0).includes("Prompt:"), false);

    const hundredOne = "b".repeat(101);
    const longMd = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("beforeSubmitPrompt", startAt, { prompt: hundredOne }, "cursor", 1),
      ),
    );
    const previewed = `${"b".repeat(100)}...`;
    assert.ok(turnBlock(longMd, 1).includes(`Prompt: ${previewed}`));
    assert.equal(rowCells(rowFor(longMd, "beforeSubmitPrompt")).details, `prompt: ${previewed}`);

    const pipeMd = emitSessionReport(
      parseSessionRecords(
        jsonlRecord("beforeSubmitPrompt", startAt, { prompt: "a|b" }, "cursor", 1),
      ),
    );
    assert.ok(turnBlock(pipeMd, 1).includes("Prompt: a\\|b"));
    const pipeRow = timeRows(pipeMd).find((line) =>
      line.includes("| beforeSubmitPrompt |"),
    );
    assert.equal(pipeRow, "| 15:00:00 | beforeSubmitPrompt |  | prompt: a\\|b |");
  });

  test("emitSessionReport throws on empty docs", () => {
    assert.throws(() => emitSessionReport([]), { message: "empty jsonl" });
  });
});

describe("writeSessionReport", () => {
  test("throws on empty jsonl text", async () => {
    const root = await makeRoot();
    const jsonlPath = path.join(root, "sess.jsonl");
    const mdPath = path.join(root, "sess.md");
    await writeFile(jsonlPath, "");
    await assert.rejects(writeSessionReport({ jsonlPath, mdPath }), {
      message: "empty jsonl",
    });
    await assert.rejects(readFile(mdPath));
  });

  test("AC-F004.23 overview session_id is filename stem when JSONL omits session_id", async () => {
    const root = await makeRoot();
    const jsonlPath = path.join(root, "f001-id.jsonl");
    const mdPath = path.join(root, "f001-id.md");
    await writeFile(
      jsonlPath,
      emitSessionRecord({
        payload: { prompt: "hello" },
        sessionId: "f001-id",
        harness: "cursor",
        event: "beforeSubmitPrompt",
        now: startAt,
        turn: 1,
        includeSessionId: false,
      }),
    );
    await writeSessionReport({ jsonlPath, mdPath });
    const md = await readFile(mdPath, "utf8");
    assert.ok(md.includes("| session_id | f001-id |"));
    assert.ok(md.includes("| harness | cursor |"));
    assert.equal(md.includes("source_harness"), false);
    assert.equal(md.includes("source_event"), false);
  });

  test("AC-F004.23 sessionStart then prompt still uses stem and last harness", async () => {
    const root = await makeRoot();
    const jsonlPath = path.join(root, "sess-1.jsonl");
    const mdPath = path.join(root, "sess-1.md");
    const jsonl =
      emitSessionRecord({
        payload: {},
        sessionId: "sess-1",
        harness: "cursor",
        event: "sessionStart",
        now: startAt,
        turn: 0,
        includeSessionId: true,
      }) +
      emitSessionRecord({
        payload: { prompt: "hi" },
        sessionId: "sess-1",
        harness: "copilot",
        event: "beforeSubmitPrompt",
        now: endAt,
        turn: 1,
        includeSessionId: false,
      });
    await writeFile(jsonlPath, jsonl);
    await writeSessionReport({ jsonlPath, mdPath });
    const md = await readFile(mdPath, "utf8");
    assert.ok(md.includes("| session_id | sess-1 |"));
    assert.ok(md.includes("| harness | copilot |"));
    assert.equal(md.includes("| harness | cursor |"), false);
  });
});
