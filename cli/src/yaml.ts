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
    name: "agent_type",
    cursor: "subagent_type",
    copilot: "agentName",
    "claude-code": "agent_type",
  },
];

const subagentStopFields: readonly MappedField[] = [
  {
    name: "agent_type",
    cursor: "subagent_type",
    copilot: "agentType",
    "claude-code": "agent_type",
  },
  {
    name: "response_text",
    cursor: "summary",
    copilot: "response",
    "claude-code": "last_assistant_message",
  },
];

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

export type YamlDocumentInput = {
  payload: Record<string, unknown>;
  sessionId: string;
  harness: string;
  event: string;
  now: Date;
};

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

function needsQuote(value: string): boolean {
  if (value.length === 0) return true;
  if (/^(true|false|yes|no|on|off|null|~)$/i.test(value)) return true;
  return !/^[A-Za-z_/][A-Za-z0-9_./+-]*$/.test(value);
}

function emitScalar(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (Number.isFinite(value)) return String(value);
    return JSON.stringify(String(value));
  }
  if (typeof value !== "string") return JSON.stringify(value);
  if (needsQuote(value)) return JSON.stringify(value);
  return value;
}

function blockLines(value: string): string {
  return value
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function emitPair(key: string, value: unknown): string {
  if (typeof value !== "string") return `${key}: ${emitScalar(value)}`;
  if (!value.includes("\n")) return `${key}: ${emitScalar(value)}`;
  return `${key}: |\n${blockLines(value)}`;
}

function bodyLines(
  payload: Record<string, unknown>,
  harness: string,
  event: string,
): string[] {
  const column = asHarness(harness);
  if (column === undefined) return [];
  const fields = bodyByEvent.get(event);
  if (fields === undefined) return [];
  const lines: string[] = [];
  for (const field of fields) {
    const sourceKey = field[column];
    if (!(sourceKey in payload)) continue;
    lines.push(emitPair(field.name, payload[sourceKey]));
  }
  return lines;
}

export function emitYamlDocument(input: YamlDocumentInput): string {
  const timestamp = formatLocalHms(sourceInstant(input.payload, input.now));
  const lines = [
    "---",
    emitPair("session_id", input.sessionId),
    emitPair("source_harness", input.harness),
    emitPair("source_event", input.event),
    emitPair("timestamp", timestamp),
    ...bodyLines(input.payload, input.harness, input.event),
  ];
  return `${lines.join("\n")}\n`;
}
