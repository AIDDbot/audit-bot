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
): string {
  return emitYamlDocument({
    payload,
    sessionId: "sess-1",
    harness,
    event,
    now,
  });
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

## Events

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
    assert.equal(emitSessionReport(docs), locked);
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
    assert.ok(
      subStart.includes(
        "| 15:00:00 | subagentStart | agent_type: explore; transcript_path: /tmp/t |",
      ),
    );

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
      subStop.includes(
        "| 15:00:00 | subagentStop | agent_type: explore; transcript_path: /tmp/t; response_text: done |",
      ),
    );

    const prompt = emitSessionReport(
      parseYamlDocuments(yamlDoc("beforeSubmitPrompt", startAt, { prompt: "hello" })),
    );
    assert.ok(prompt.includes("| 15:00:00 | beforeSubmitPrompt | prompt: hello |"));

    const stop = emitSessionReport(
      parseYamlDocuments(yamlDoc("stop", startAt, { transcript_path: "/tmp/t" })),
    );
    assert.ok(stop.includes("| 15:00:00 | stop | transcript_path: /tmp/t |"));

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
  });

  test("parser accepts F003 quoted timestamp, block scalar, empty harness, and YAML null", () => {
    const block = emitYamlDocument({
      payload: { prompt: "hello\nworld" },
      sessionId: "sess-1",
      harness: "cursor",
      event: "beforeSubmitPrompt",
      now: startAt,
    });
    const blockMd = emitSessionReport(parseYamlDocuments(block));
    assert.ok(blockMd.includes("| 15:00:00 | beforeSubmitPrompt | prompt: hello world |"));

    const emptyHarness = emitYamlDocument({
      payload: { reason: "completed" },
      sessionId: "sess-1",
      harness: "",
      event: "sessionEnd",
      now: startAt,
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

  test("subagent start and stop are consecutive Events rows without nesting", () => {
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
