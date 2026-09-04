export type HarnessColumn = "cursor" | "copilot" | "claude-code" | "codex";

export type MappedField = {
  name: string;
  cursor: string;
  copilot: string;
  "claude-code": string;
  codex: string;
};

type EventSchema = {
  mappedFields: readonly MappedField[];
  reportFields: readonly string[];
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

const promptFields: readonly MappedField[] = [
  { name: "prompt", cursor: "prompt", copilot: "prompt", "claude-code": "prompt", codex: "prompt" },
  { name: "cwd", cursor: "", copilot: "", "claude-code": "", codex: "cwd" },
];

const emptyFields: readonly MappedField[] = [];

const codexStopFields: readonly MappedField[] = [
  { name: "response_text", cursor: "", copilot: "", "claude-code": "", codex: "last_assistant_message" },
];

const eventSchemas = new Map<string, EventSchema>([
  ["sessionStart", { mappedFields: emptyFields, reportFields: [] }],
  ["SessionStart", { mappedFields: codexSessionStartFields, reportFields: ["model", "permission_mode", "source", "cwd"] }],
  ["sessionEnd", { mappedFields: sessionEndFields, reportFields: ["reason"] }],
  ["SessionEnd", { mappedFields: sessionEndFields, reportFields: ["reason", "cwd"] }],
  ["subagentStart", { mappedFields: subagentStartFields, reportFields: ["task"] }],
  ["SubagentStart", { mappedFields: subagentStartFields, reportFields: ["agent_id", "task"] }],
  ["subagentStop", { mappedFields: subagentStopFields, reportFields: ["response_text"] }],
  ["SubagentStop", { mappedFields: subagentStopFields, reportFields: ["agent_id", "response_text"] }],
  ["beforeSubmitPrompt", { mappedFields: promptFields, reportFields: ["prompt"] }],
  ["userPromptSubmitted", { mappedFields: promptFields, reportFields: ["prompt"] }],
  ["UserPromptSubmit", { mappedFields: promptFields, reportFields: ["prompt", "cwd"] }],
  ["stop", { mappedFields: emptyFields, reportFields: [] }],
  ["agentStop", { mappedFields: emptyFields, reportFields: [] }],
  ["Stop", { mappedFields: codexStopFields, reportFields: ["response_text"] }],
]);

export const promptKindEvents = new Set([
  "beforeSubmitPrompt",
  "userPromptSubmitted",
  "UserPromptSubmit",
]);

export function mappedFieldsForEvent(event: string): readonly MappedField[] | undefined {
  return eventSchemas.get(event)?.mappedFields;
}

export function reportFieldsForEvent(event: string): readonly string[] | undefined {
  return eventSchemas.get(event)?.reportFields;
}
