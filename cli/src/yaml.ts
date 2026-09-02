type HarnessColumn = "cursor" | "copilot" | "claude-code";

type MappedField = {
  name: string;
  cursor: string;
  copilot: string;
  "claude-code": string;
};

const sessionEndFields: readonly MappedField[] = [
  { name: "reason", cursor: "reason", copilot: "reason", "claude-code": "reason" },
];

const subagentStartFields: readonly MappedField[] = [
  {
    name: "agent_display_name",
    cursor: "",
    copilot: "agentDisplayName",
    "claude-code": "",
  },
  { name: "task", cursor: "task", copilot: "", "claude-code": "" },
];

const subagentStopFields: readonly MappedField[] = [
  {
    name: "agent_display_name",
    cursor: "",
    copilot: "agentDisplayName",
    "claude-code": "",
  },
  {
    name: "response_text",
    cursor: "summary",
    copilot: "response",
    "claude-code": "last_assistant_message",
  },
];

const subagentSourceKeys = ["subagent_type", "agent_type", "agentType", "agentName"] as const;

const promptFields: readonly MappedField[] = [
  { name: "prompt", cursor: "prompt", copilot: "prompt", "claude-code": "prompt" },
];

const emptyFields: readonly MappedField[] = [];

const bodyByEvent = new Map<string, readonly MappedField[]>([
  ["sessionStart", emptyFields],
  ["SessionStart", emptyFields],
  ["sessionEnd", sessionEndFields],
  ["SessionEnd", sessionEndFields],
  ["subagentStart", subagentStartFields],
  ["SubagentStart", subagentStartFields],
  ["subagentStop", subagentStopFields],
  ["SubagentStop", subagentStopFields],
  ["beforeSubmitPrompt", promptFields],
  ["userPromptSubmitted", promptFields],
  ["UserPromptSubmit", promptFields],
  ["stop", emptyFields],
  ["agentStop", emptyFields],
  ["Stop", emptyFields],
]);

export type SessionRecordInput = {
  payload: Record<string, unknown>;
  sessionId: string;
  harness: string;
  event: string;
  now: Date;
  turn: number;
  includeSessionId: boolean;
};

export type SessionEmitInput = Omit<
  SessionRecordInput,
  "turn" | "sessionId" | "includeSessionId"
>;

const promptKindEvents = new Set([
  "beforeSubmitPrompt",
  "userPromptSubmitted",
  "UserPromptSubmit",
]);

function isPromptKind(event: string): boolean {
  return promptKindEvents.has(event);
}

function isSessionStartEvent(event: string): boolean {
  if (event === "sessionStart") return true;
  if (event === "SessionStart") return true;
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (Array.isArray(value)) return false;
  return true;
}

function parseJsonlRecords(text: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  for (const line of text.split("\n")) {
    if (line.length === 0) continue;
    const parsed: unknown = JSON.parse(line);
    if (!isPlainObject(parsed)) continue;
    records.push(parsed);
  }
  return records;
}

export function isInitialSessionStart(existingJsonl: string, event: string): boolean {
  if (!isSessionStartEvent(event)) return false;
  if (parseJsonlRecords(existingJsonl).length > 0) return false;
  return true;
}

function eventField(record: Record<string, unknown>): string {
  if (typeof record.event !== "string") return "";
  return record.event;
}

function countPromptKindEvents(existingJsonl: string): number {
  let count = 0;
  for (const record of parseJsonlRecords(existingJsonl)) {
    if (!isPromptKind(eventField(record))) continue;
    count += 1;
  }
  return count;
}

export function nextConversationTurn(existingJsonl: string, event: string): number {
  const already = countPromptKindEvents(existingJsonl);
  if (isPromptKind(event)) return already + 1;
  return already;
}

function asHarness(value: string): HarnessColumn | undefined {
  if (value === "cursor") return value;
  if (value === "copilot") return value;
  if (value === "claude-code") return value;
  return undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatLocalHms(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function sourceInstant(payload: Record<string, unknown>, now: Date): Date {
  const raw = payload.timestamp;
  if (typeof raw === "number") {
    if (Number.isFinite(raw)) return new Date(raw);
    return now;
  }
  if (typeof raw !== "string") return now;
  if (raw.length === 0) return now;
  const ms = Date.parse(raw);
  if (Number.isFinite(ms)) return new Date(ms);
  return now;
}

function subagentValue(payload: Record<string, unknown>): unknown {
  for (const key of subagentSourceKeys) {
    if (key in payload) return payload[key];
  }
  return undefined;
}

function assignHeader(
  obj: Record<string, unknown>,
  input: SessionRecordInput,
  timestamp: string,
): void {
  if (input.includeSessionId) obj.session_id = input.sessionId;
  obj.harness = input.harness;
  obj.event = input.event;
  obj.timestamp = timestamp;
  obj.turn = input.turn;
}

function assignSubagent(obj: Record<string, unknown>, payload: Record<string, unknown>): void {
  for (const key of subagentSourceKeys) {
    if (!(key in payload)) continue;
    const value = subagentValue(payload);
    if (value === undefined) return;
    obj.subagent = value;
    return;
  }
}

function assignBody(
  obj: Record<string, unknown>,
  payload: Record<string, unknown>,
  harness: string,
  event: string,
): void {
  const column = asHarness(harness);
  if (column === undefined) return;
  const fields = bodyByEvent.get(event);
  if (fields === undefined) return;
  for (const field of fields) {
    const sourceKey = field[column];
    if (sourceKey.length === 0) continue;
    if (!(sourceKey in payload)) continue;
    const value = payload[sourceKey];
    if (value === undefined) continue;
    obj[field.name] = value;
  }
}

export function emitSessionRecord(input: SessionRecordInput): string {
  const obj: Record<string, unknown> = {};
  const timestamp = formatLocalHms(sourceInstant(input.payload, input.now));
  assignHeader(obj, input, timestamp);
  assignSubagent(obj, input.payload);
  assignBody(obj, input.payload, input.harness, input.event);
  return `${JSON.stringify(obj)}\n`;
}
