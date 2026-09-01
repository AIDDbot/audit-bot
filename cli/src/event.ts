function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;
  return value;
}

export function sessionIdentifier(
  payload: Record<string, unknown>,
): string | undefined {
  const sessionId = nonEmptyString(payload.session_id);
  if (sessionId !== undefined) return sessionId;
  const conversationId = nonEmptyString(payload.conversation_id);
  if (conversationId !== undefined) return conversationId;
  return nonEmptyString(payload.parent_conversation_id);
}

export function eventLogLine(payload: Record<string, unknown>): string {
  return JSON.stringify(payload);
}
