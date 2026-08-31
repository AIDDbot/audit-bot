import { buildEvent } from "./event.ts";
import { resolveProjectRoot } from "./project.ts";
import { appendEvent } from "./store.ts";

type JsonObject = Record<string, unknown>;

type Harness = "cursor" | "claude" | "copilot";

export type IngestInput = {
  harness: string | undefined;
  hookEventHint: string | undefined;
  stdinText: string;
  env: Record<string, string | undefined>;
};

function isRecord(value: unknown): value is JsonObject {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (Array.isArray(value)) return false;
  return true;
}

function parsePayload(input: IngestInput): JsonObject | undefined {
  try {
    const parsed: unknown = JSON.parse(input.stdinText);
    if (!isRecord(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;
  return value;
}

function resolveHookEvent(
  input: IngestInput,
  payload: JsonObject,
): string | undefined {
  const fromPayload = asNonEmptyString(payload.hook_event_name);
  if (fromPayload !== undefined) return fromPayload;
  const fromHint = asNonEmptyString(input.hookEventHint);
  if (fromHint !== undefined) return fromHint;
  return undefined;
}

function resolveHarness(input: IngestInput): Harness | undefined {
  const harness = input.harness;
  if (harness === "cursor") return harness;
  if (harness === "claude") return harness;
  if (harness === "copilot") return harness;
  return undefined;
}

async function ingestOrThrow(input: IngestInput): Promise<void> {
  const payload = parsePayload(input);
  if (!payload) return;
  const hookEvent = resolveHookEvent(input, payload);
  if (!hookEvent) return;
  const harness = resolveHarness(input);
  if (!harness) return;
  const projectRoot = resolveProjectRoot({ env: input.env, payload });
  if (!projectRoot) return;
  const event = buildEvent({
    harness,
    receivedAt: new Date().toISOString(),
    hookEvent,
    payload,
  });
  await appendEvent(projectRoot, event);
}

export async function ingestHook(input: IngestInput): Promise<void> {
  try {
    await ingestOrThrow(input);
  } catch {
    // observe-only: never throw to the caller
  }
}
