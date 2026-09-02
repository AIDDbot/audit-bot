import assert from "node:assert";
import { test } from "node:test";
import {
  makeFixture,
  readSessionReport,
  readSessionYaml,
  spawnIngest,
  turnSubsection,
  yamlDocuments,
  yamlMapping,
} from "./spawn.ts";

const TABLE_HEADER = "| Time | Event | Subagent | Details |";

function unpad(cell: string): string {
  let value = cell;
  if (value.startsWith(" ")) value = value.slice(1);
  if (value.endsWith(" ")) value = value.slice(0, -1);
  return value;
}

function cells(row: string): string[] {
  assert.ok(row.startsWith("|") && row.endsWith("|"));
  const inner = row.slice(1, -1);
  const out: string[] = [];
  let buf = "";
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === "\\" && inner[i + 1] === "|") {
      buf += "\\|";
      i += 1;
      continue;
    }
    if (inner[i] === "|") {
      out.push(unpad(buf));
      buf = "";
      continue;
    }
    buf += inner[i];
  }
  out.push(unpad(buf));
  return out;
}

function eventRows(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const header = lines.indexOf(TABLE_HEADER);
  assert.ok(header >= 0);
  const rows: string[] = [];
  for (let i = header + 2; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!line.startsWith("|")) break;
    rows.push(line);
  }
  return rows;
}

test("AC-F004.7 — subagent start and stop are ordinary chronological table rows", async () => {
  const projectRoot = await makeFixture();
  const env = { CURSOR_PROJECT_DIR: projectRoot };
  const sessionId = "sess-ac-f004-7";
  const start = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId }),
    env,
    extraArgv: ["cursor", "sessionStart"],
  });
  const subStart = await spawnIngest({
    stdin: JSON.stringify({
      parent_conversation_id: sessionId,
      subagent_type: "explore",
      transcript_path: "/tmp/sub.jsonl",
    }),
    env,
    extraArgv: ["cursor", "subagentStart"],
  });
  const subStop = await spawnIngest({
    stdin: JSON.stringify({
      session_id: sessionId,
      subagent_type: "explore",
      transcript_path: "/tmp/sub.jsonl",
      summary: "done",
    }),
    env,
    extraArgv: ["cursor", "subagentStop"],
  });
  const end = await spawnIngest({
    stdin: JSON.stringify({ session_id: sessionId, reason: "completed" }),
    env,
    extraArgv: ["cursor", "sessionEnd"],
  });

  assert.equal(start.exitCode, 0);
  assert.equal(subStart.exitCode, 0);
  assert.equal(subStop.exitCode, 0);
  assert.equal(end.exitCode, 0);
  const documents = yamlDocuments(await readSessionYaml(projectRoot, sessionId));
  assert.equal(documents.length, 4);
  for (const document of documents) {
    assert.ok(document.startsWith("---"));
    for (const line of document.split(/\r?\n/)) {
      if (line.trim() === "" || /^---[ \t]*$/.test(line)) continue;
      assert.equal(line, line.trimStart());
    }
    const mapping = yamlMapping(document);
    assert.equal("children" in mapping.values, false);
    assert.equal("events" in mapping.values, false);
  }
  const markdown = await readSessionReport(projectRoot, sessionId);
  assert.ok(markdown.includes("## Turn 0"));
  assert.equal(markdown.includes("## Events"), false);
  const turn0 = turnSubsection(markdown, 0);
  assert.match(turn0, /^\| Time \| Event \| Subagent \| Details \|$/m);
  const rows = eventRows(turn0);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((row) => cells(row)[1]),
    ["sessionStart", "subagentStart", "subagentStop", "sessionEnd"],
  );
  for (const row of rows) {
    assert.ok(row.startsWith("|"));
    assert.equal(row, row.trimStart());
    assert.equal(cells(row).length, 4);
  }
  assert.equal(
    markdown.split(/\r?\n/).some((line) => /^[ \t]+\|/.test(line)),
    false,
  );
});
