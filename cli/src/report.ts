import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type YamlDoc = {
  session_id: string;
  harness: string;
  event: string;
  timestamp: string;
  turn: number;
  body: Record<string, string | null>;
};

type TurnGroup = { turn: number; docs: YamlDoc[] };

const headerKeys = new Set([
  "session_id",
  "harness",
  "event",
  "timestamp",
  "turn",
]);

const detailsByEvent = new Map<string, readonly string[]>([
  ["sessionStart", []],
  ["SessionStart", []],
  ["sessionEnd", ["reason"]],
  ["SessionEnd", ["reason"]],
  ["subagentStart", ["task"]],
  ["SubagentStart", ["task"]],
  ["subagentStop", ["response_text"]],
  ["SubagentStop", ["response_text"]],
  ["beforeSubmitPrompt", ["prompt"]],
  ["userPromptSubmitted", ["prompt"]],
  ["UserPromptSubmit", ["prompt"]],
  ["stop", []],
  ["agentStop", []],
  ["Stop", []],
]);

const promptKinds = new Set([
  "beforeSubmitPrompt",
  "userPromptSubmitted",
  "UserPromptSubmit",
]);

type YamlPair = { key: string; value: string | null };

function takeChunk(chunks: string[], current: string[]): void {
  if (!current.some((line) => line.length > 0)) return;
  chunks.push(current.join("\n"));
}

function yamlChunks(text: string): string[] {
  const chunks: string[] = [];
  let current: string[] = [];
  for (const line of text.split("\n")) {
    if (line === "---") {
      takeChunk(chunks, current);
      current = [];
      continue;
    }
    current.push(line);
  }
  takeChunk(chunks, current);
  return chunks;
}

function parseScalar(raw: string): string | null {
  if (raw === "null") return null;
  if (!raw.startsWith("\"")) return raw;
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed === "string") return parsed;
  return raw;
}

function readBlock(lines: string[], start: number): { value: string; next: number } {
  const parts: string[] = [];
  let i = start;
  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) break;
    if (!line.startsWith("  ")) break;
    parts.push(line.slice(2));
    i += 1;
  }
  return { value: parts.join("\n"), next: i };
}

function parsePairAt(
  lines: string[],
  i: number,
): { pair: YamlPair; next: number } | undefined {
  const match = /^([A-Za-z_][A-Za-z0-9_]*):(?: (.*))?$/.exec(lines[i] ?? "");
  if (match === null) return undefined;
  const key = match[1];
  const rest = match[2] ?? "";
  if (rest === "|") {
    const block = readBlock(lines, i + 1);
    return { pair: { key, value: block.value }, next: block.next };
  }
  return { pair: { key, value: parseScalar(rest) }, next: i + 1 };
}

function parsePairs(lines: string[]): YamlPair[] {
  const pairs: YamlPair[] = [];
  let i = 0;
  while (i < lines.length) {
    const parsed = parsePairAt(lines, i);
    if (parsed === undefined) {
      i += 1;
      continue;
    }
    pairs.push(parsed.pair);
    i = parsed.next;
  }
  return pairs;
}

function stringField(pairs: YamlPair[], key: string): string {
  for (const pair of pairs) {
    if (pair.key !== key) continue;
    if (pair.value === null) return "";
    return pair.value;
  }
  return "";
}

function parseTurnValue(value: string | null): number {
  if (value === null) return 0;
  if (!/^\d+$/.test(value)) return 0;
  return Number(value);
}

function integerField(pairs: YamlPair[], key: string): number {
  for (const pair of pairs) {
    if (pair.key !== key) continue;
    return parseTurnValue(pair.value);
  }
  return 0;
}

function bodyFields(pairs: YamlPair[]): Record<string, string | null> {
  const body: Record<string, string | null> = {};
  for (const pair of pairs) {
    if (headerKeys.has(pair.key)) continue;
    body[pair.key] = pair.value;
  }
  return body;
}

function parseYamlChunk(chunk: string): YamlDoc {
  const pairs = parsePairs(chunk.split("\n"));
  return {
    session_id: stringField(pairs, "session_id"),
    harness: stringField(pairs, "harness"),
    event: stringField(pairs, "event"),
    timestamp: stringField(pairs, "timestamp"),
    turn: integerField(pairs, "turn"),
    body: bodyFields(pairs),
  };
}

export function parseYamlDocuments(text: string): YamlDoc[] {
  return yamlChunks(text).map(parseYamlChunk);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function secondsOfDay(hms: string): number | undefined {
  const match = /^(\d{2}):(\d{2}):(\d{2})$/.exec(hms);
  if (match === null) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatHms(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
}

function formatDuration(first: string, last: string): string {
  const start = secondsOfDay(first);
  if (start === undefined) return "00:00:00";
  const end = secondsOfDay(last);
  if (end === undefined) return "00:00:00";
  if (end <= start) return "00:00:00";
  return formatHms(end - start);
}

function eventCounts(docs: YamlDoc[]): { event: string; count: number }[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const doc of docs) {
    const seen = counts.get(doc.event);
    if (seen === undefined) order.push(doc.event);
    counts.set(doc.event, (seen ?? 0) + 1);
  }
  return order.map((event) => ({ event, count: counts.get(event) ?? 0 }));
}

function preview(value: string): string {
  const single = value.replace(/\r\n|\n|\r/g, " ");
  if (single.length <= 100) return single;
  return `${single.slice(0, 100)}...`;
}

function scalarText(value: string | null): string {
  if (value === null) return "null";
  return preview(value);
}

function formatFieldList(doc: YamlDoc, fields: readonly string[]): string {
  const parts: string[] = [];
  for (const name of fields) {
    if (!(name in doc.body)) continue;
    parts.push(`${name}: ${scalarText(doc.body[name] ?? null)}`);
  }
  return parts.join("; ");
}

function formatSubagent(doc: YamlDoc): string {
  if (!("subagent" in doc.body)) return "";
  return scalarText(doc.body.subagent ?? null);
}

function formatDetails(doc: YamlDoc): string {
  const fields = detailsByEvent.get(doc.event);
  if (fields === undefined) return "";
  return formatFieldList(doc, fields);
}

function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function reportSessionId(first: YamlDoc, sessionId: string | undefined): string {
  if (sessionId === undefined) return first.session_id;
  return sessionId;
}

function overviewSection(first: YamlDoc, last: YamlDoc, sessionId: string): string[] {
  return [
    "## Overview",
    "",
    "| Field | Value |",
    "| --- | --- |",
    `| session_id | ${escapeCell(sessionId)} |`,
    `| harness | ${escapeCell(last.harness)} |`,
    `| start | ${escapeCell(first.timestamp)} |`,
    `| end | ${escapeCell(last.timestamp)} |`,
    `| duration | ${formatDuration(first.timestamp, last.timestamp)} |`,
  ];
}

function countSection(docs: YamlDoc[]): string[] {
  const rows = eventCounts(docs).map(
    (row) => `| ${escapeCell(row.event)} | ${row.count} |`,
  );
  return [
    "## Event counts",
    "",
    `Total: ${docs.length}`,
    "",
    "| event | count |",
    "| --- | --- |",
    ...rows,
  ];
}

function eventRow(doc: YamlDoc): string {
  return `| ${escapeCell(doc.timestamp)} | ${escapeCell(doc.event)} | ${escapeCell(formatSubagent(doc))} | ${escapeCell(formatDetails(doc))} |`;
}

function turnGroups(docs: YamlDoc[]): TurnGroup[] {
  const seen: number[] = [];
  const byTurn = new Map<number, YamlDoc[]>();
  for (const doc of docs) {
    const existing = byTurn.get(doc.turn);
    if (existing === undefined) {
      seen.push(doc.turn);
      byTurn.set(doc.turn, [doc]);
    } else {
      existing.push(doc);
    }
  }
  seen.sort((a, b) => a - b);
  return seen.map((turn) => ({ turn, docs: byTurn.get(turn) ?? [] }));
}

function firstPromptDoc(docs: YamlDoc[]): YamlDoc | undefined {
  for (const doc of docs) {
    if (promptKinds.has(doc.event)) return doc;
  }
  return undefined;
}

function turnDuration(group: TurnGroup): string {
  const last = group.docs[group.docs.length - 1];
  const first = group.docs[0];
  if (last === undefined || first === undefined) return "00:00:00";
  if (group.turn < 1) return formatDuration(first.timestamp, last.timestamp);
  const prompt = firstPromptDoc(group.docs);
  const start = prompt ?? first;
  return formatDuration(start.timestamp, last.timestamp);
}

function turnPrompt(group: TurnGroup): string | undefined {
  if (group.turn < 1) return undefined;
  const promptDoc = firstPromptDoc(group.docs);
  if (promptDoc === undefined) return undefined;
  if (!("prompt" in promptDoc.body)) return undefined;
  return scalarText(promptDoc.body.prompt ?? null);
}

function turnSection(group: TurnGroup): string[] {
  const prompt = turnPrompt(group);
  const lines = [
    "",
    `## Turn ${group.turn}`,
    "",
    `Duration: ${turnDuration(group)}`,
    "",
  ];
  if (prompt !== undefined) {
    lines.push(`Prompt: ${escapeCell(prompt)}`, "");
  }
  lines.push(
    "| Time | Event | Subagent | Details |",
    "| --- | --- | --- | --- |",
    ...group.docs.map(eventRow),
  );
  return lines;
}

export function emitSessionReport(docs: YamlDoc[], sessionId?: string): string {
  const first = docs[0];
  if (first === undefined) throw new Error("empty yaml");
  const last = docs[docs.length - 1] ?? first;
  const lines = [
    ...overviewSection(first, last, reportSessionId(first, sessionId)),
    "",
    ...countSection(docs),
    ...turnGroups(docs).flatMap(turnSection),
  ];
  return `${lines.join("\n")}\n`;
}

export async function writeSessionReport(input: {
  yamlPath: string;
  mdPath: string;
}): Promise<void> {
  const text = await readFile(input.yamlPath, "utf8");
  const docs = parseYamlDocuments(text);
  await writeFile(
    input.mdPath,
    emitSessionReport(docs, path.parse(input.yamlPath).name),
  );
}
