import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type SessionRecord = {
  session_id: string;
  harness: string;
  event: string;
  timestamp: string;
  turn: number;
  body: Record<string, string | null>;
};

type TurnGroup = { turn: number; docs: SessionRecord[] };

const headerKeys = new Set([
  "session_id",
  "harness",
  "event",
  "timestamp",
  "turn",
]);

const detailsByEvent = new Map<string, readonly string[]>([
  ["sessionStart", []],
  ["SessionStart", ["model", "permission_mode", "source", "cwd"]],
  ["sessionEnd", ["reason"]],
  ["SessionEnd", ["reason", "cwd"]],
  ["subagentStart", ["task"]],
  ["SubagentStart", ["agent_id", "task"]],
  ["subagentStop", ["response_text"]],
  ["SubagentStop", ["agent_id", "response_text"]],
  ["beforeSubmitPrompt", ["prompt"]],
  ["userPromptSubmitted", ["prompt"]],
  ["UserPromptSubmit", ["prompt", "cwd"]],
  ["stop", []],
  ["agentStop", []],
  ["Stop", ["response_text"]],
]);

const promptKinds = new Set([
  "beforeSubmitPrompt",
  "userPromptSubmitted",
  "UserPromptSubmit",
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (Array.isArray(value)) return false;
  return true;
}

function stringProp(obj: Record<string, unknown>, key: string): string {
  const value = obj[key];
  if (typeof value !== "string") return "";
  return value;
}

function parseTurn(value: unknown): number {
  if (typeof value !== "number") return 0;
  if (!Number.isInteger(value)) return 0;
  return value;
}

function bodyValue(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function bodyFields(obj: Record<string, unknown>): Record<string, string | null> {
  const body: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (headerKeys.has(key)) continue;
    if (value === undefined) continue;
    body[key] = bodyValue(value);
  }
  return body;
}

function parseSessionObject(obj: Record<string, unknown>): SessionRecord {
  return {
    session_id: stringProp(obj, "session_id"),
    harness: stringProp(obj, "harness"),
    event: stringProp(obj, "event"),
    timestamp: stringProp(obj, "timestamp"),
    turn: parseTurn(obj.turn),
    body: bodyFields(obj),
  };
}

export function parseSessionRecords(text: string): SessionRecord[] {
  const records: SessionRecord[] = [];
  for (const line of text.split("\n")) {
    if (line.length === 0) continue;
    const parsed: unknown = JSON.parse(line);
    if (!isPlainObject(parsed)) continue;
    records.push(parseSessionObject(parsed));
  }
  return records;
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

function eventCounts(docs: SessionRecord[]): { event: string; count: number }[] {
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

function formatFieldList(doc: SessionRecord, fields: readonly string[]): string {
  const parts: string[] = [];
  for (const name of fields) {
    if (!(name in doc.body)) continue;
    parts.push(`${name}: ${scalarText(doc.body[name] ?? null)}`);
  }
  return parts.join("; ");
}

function formatSubagent(doc: SessionRecord): string {
  if (!("subagent" in doc.body)) return "";
  return scalarText(doc.body.subagent ?? null);
}

function formatDetails(doc: SessionRecord): string {
  const fields = detailsByEvent.get(doc.event);
  if (fields === undefined) return "";
  return formatFieldList(doc, fields);
}

function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|");
}

function reportSessionId(first: SessionRecord, sessionId: string | undefined): string {
  if (sessionId === undefined) return first.session_id;
  return sessionId;
}

function overviewSection(first: SessionRecord, last: SessionRecord, sessionId: string): string[] {
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

function countSection(docs: SessionRecord[]): string[] {
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

function eventRow(doc: SessionRecord): string {
  return `| ${escapeCell(doc.timestamp)} | ${escapeCell(doc.event)} | ${escapeCell(formatSubagent(doc))} | ${escapeCell(formatDetails(doc))} |`;
}

function turnGroups(docs: SessionRecord[]): TurnGroup[] {
  const seen: number[] = [];
  const byTurn = new Map<number, SessionRecord[]>();
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

function firstPromptDoc(docs: SessionRecord[]): SessionRecord | undefined {
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

export function emitSessionReport(docs: SessionRecord[], sessionId?: string): string {
  const first = docs[0];
  if (first === undefined) throw new Error("empty jsonl");
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
  jsonlPath: string;
  mdPath: string;
}): Promise<void> {
  const text = await readFile(input.jsonlPath, "utf8");
  const docs = parseSessionRecords(text);
  await writeFile(
    input.mdPath,
    emitSessionReport(docs, path.parse(input.jsonlPath).name),
  );
}
