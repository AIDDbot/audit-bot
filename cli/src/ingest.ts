import { buildEvent } from "./event.ts";
import { resolveProjectRoot } from "./project.ts";
import { appendEvent } from "./store.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePayload(stdinText: string): Record<string, unknown> | undefined {
  try {
    const parsed: unknown = JSON.parse(stdinText);
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function resolveHookEvent(
  payload: Record<string, unknown>,
  hint: string | undefined,
): string | undefined {
  const fromPayload = payload.hook_event_name;
  if (typeof fromPayload === "string" && fromPayload.length > 0) return fromPayload;
  if (typeof hint === "string" && hint.length > 0) return hint;
  return undefined;
}

function resolveHarness(
  harness: string | undefined,
): "cursor" | "claude" | "copilot" | undefined {
  if (harness === "cursor" || harness === "claude" || harness === "copilot") {
    return harness;
  }
  return undefined;
}

async function ingestOrThrow(input: {
  harness: string | undefined;
  hookEventHint: string | undefined;
  stdinText: string;
  env: Record<string, string | undefined>;
}): Promise<void> {
  const payload = parsePayload(input.stdinText);
  if (!payload) return;
  const hookEvent = resolveHookEvent(payload, input.hookEventHint);
  if (!hookEvent) return;
  const harness = resolveHarness(input.harness);
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

export async function ingestHook(input: {
  harness: string | undefined;
  hookEventHint: string | undefined;
  stdinText: string;
  env: Record<string, string | undefined>;
}): Promise<void> {
  try {
    await ingestOrThrow(input);
  } catch {
    // observe-only: never throw to the caller
  }
}
