function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOmitted(value: unknown): boolean {
  if (value === null || value === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return isRecord(value) && Object.keys(value).length === 0;
}

function omitRecord(value: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const cleaned = omitEmpty(nested);
    if (!isOmitted(cleaned)) result[key] = cleaned;
  }
  return result;
}

function omitArray(value: unknown[]): unknown[] {
  return value.map((item) => (isRecord(item) ? omitEmpty(item) : item));
}

export function omitEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return omitArray(value);
  if (isRecord(value)) return omitRecord(value);
  return value;
}

export function buildEvent(input: {
  harness: "cursor" | "claude" | "copilot";
  receivedAt: string;
  hookEvent: string;
  payload: Record<string, unknown>;
}): Record<string, unknown> {
  return {
    ...omitRecord(input.payload),
    harness: input.harness,
    receivedAt: input.receivedAt,
    hookEvent: input.hookEvent,
  };
}
