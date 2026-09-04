type HarnessColumn = "cursor" | "copilot" | "claude-code" | "codex";

type MappedField = {
  name: string;
  cursor: string;
  copilot: string;
  "claude-code": string;
  codex: string;
};

const codexSessionStartFields: readonly MappedField[] = [
  { name: "model", cursor: "", copilot: "", "claude-code": "", codex: "model" },
  { name: "permission_mode", cursor: "", copilot: "", "claude-code": "", codex: "permission_mode" },
  { name: "source", cursor: "", copilot: "", "claude-code": "", codex: "source" },
  { name: "cwd", cursor: "", copilot: "", "claude-code": "", codex: "cwd" },
];

const sessionEndFields: readonly MappedField[] = [
  { name: "reason", cursor: "reason", copilot: "reason", "claude-code": "reason", codex: "reason" },
  { name: "cwd", cursor: "", copilot: "", "claude-code": "", codex: "cwd" },
];

const subagentStartFields: readonly MappedField[] = [
  {
    name: "agent_display_name",
    cursor: "",
    copilot: "agentDisplayName",
    "claude-code": "",
    codex: "",
  },
  { name: "task", cursor: "task", copilot: "", "claude-code": "", codex: "" },
];

const subagentStopFields: readonly MappedField[] = [
  {
    name: "agent_display_name",
    cursor: "",
    copilot: "agentDisplayName",
    "claude-code": "",
    codex: "",
  },
  {
    name: "response_text",
    cursor: "summary",
    copilot: "response",
    "claude-code": "last_assistant_message",
    codex: "last_assistant_message",
  },
];

const subagentSourceKeys = ["subagent_type", "agent_type", "agentType", "agentName"] as const;

const promptFields: readonly MappedField[] = [
  { name: "prompt", cursor: "prompt", copilot: "prompt", "claude-code": "prompt", codex: "prompt" },
  { name: "cwd", cursor: "", copilot: "", "claude-code": "", codex: "cwd" },
];

const emptyFields: readonly MappedField[] = [];

const codexStopFields: readonly MappedField[] = [
  { name: "response_text", cursor: "", copilot: "", "claude-code": "", codex: "last_assistant_message" },
];

const bodyByEvent = new Map<string, readonly MappedField[]>([
  ["sessionStart", emptyFields],
  ["SessionStart", codexSessionStartFields],
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
  ["Stop", codexStopFields],
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

function countPromptKindEvents(records: readonly Record<string, unknown>[]): number {
  let count = 0;
  for (const record of records) {
    if (!isPromptKind(eventField(record))) continue;
    count += 1;
  }
  return count;
}

type TurnInput = {
  harness: string;
  event: string;
  payload: Record<string, unknown>;
};

function integerTurn(record: Record<string, unknown>): number | undefined {
  if (typeof record.turn !== "number") return undefined;
  if (!Number.isInteger(record.turn)) return undefined;
  return record.turn;
}

function turnForNativeId(
  records: readonly Record<string, unknown>[],
  nativeTurnId: string,
): number {
  let highest = 0;
  for (const record of records) {
    const turn = integerTurn(record);
    if (turn === undefined) continue;
    if (record.turn_id === nativeTurnId) return turn;
    highest = Math.max(highest, turn);
  }
  return highest + 1;
}

function latestPositiveTurn(records: readonly Record<string, unknown>[]): number {
  for (let index = records.length - 1; index >= 0; index -= 1) {
    const record = records[index];
    if (record === undefined) continue;
    const turn = integerTurn(record);
    if (turn !== undefined && turn > 0) return turn;
  }
  return 0;
}

function nativeCodexTurn(
  records: readonly Record<string, unknown>[],
  payload: Record<string, unknown>,
): number {
  const nativeTurnId = payload.turn_id;
  if (typeof nativeTurnId !== "string" || nativeTurnId.length === 0) {
    return latestPositiveTurn(records);
  }
  return turnForNativeId(records, nativeTurnId);
}

function conversationTurn(
  records: readonly Record<string, unknown>[],
  input: string | TurnInput,
): number {
  if (typeof input !== "string" && input.harness === "codex") {
    return nativeCodexTurn(records, input.payload);
  }
  const event = typeof input === "string" ? input : input.event;
  const already = countPromptKindEvents(records);
  if (isPromptKind(event)) return already + 1;
  return already;
}

export function nextConversationTurn(existingJsonl: string, event: string): number;
export function nextConversationTurn(existingJsonl: string, input: TurnInput): number;
export function nextConversationTurn(existingJsonl: string, input: string | TurnInput): number {
  return conversationTurn(parseJsonlRecords(existingJsonl), input);
}

export function sessionRecordPosition(
  existingJsonl: string,
  input: TurnInput,
): { turn: number; includeSessionId: boolean } {
  const records = parseJsonlRecords(existingJsonl);
  return {
    turn: conversationTurn(records, input),
    includeSessionId: isSessionStartEvent(input.event) && records.length === 0,
  };
}

function asHarness(value: string): HarnessColumn | undefined {
  if (value === "cursor") return value;
  if (value === "copilot") return value;
  if (value === "claude-code") return value;
  if (value === "codex") return value;
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
    if (payload[key] !== undefined) obj.subagent = payload[key];
    return;
  }
}

function assignCodexTurnId(
  obj: Record<string, unknown>,
  payload: Record<string, unknown>,
  harness: string,
): void {
  if (harness !== "codex") return;
  if ("turn_id" in payload && payload.turn_id !== undefined) obj.turn_id = payload.turn_id;
}

function assignCodexAgentId(
  obj: Record<string, unknown>,
  payload: Record<string, unknown>,
  harness: string,
  event: string,
): void {
  if (harness !== "codex") return;
  if (event !== "SubagentStart" && event !== "SubagentStop") return;
  if ("agent_id" in payload && payload.agent_id !== undefined) obj.agent_id = payload.agent_id;
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
  assignCodexTurnId(obj, input.payload, input.harness);
  assignSubagent(obj, input.payload);
  assignCodexAgentId(obj, input.payload, input.harness, input.event);
  assignBody(obj, input.payload, input.harness, input.event);
  return `${JSON.stringify(obj)}\n`;
}
