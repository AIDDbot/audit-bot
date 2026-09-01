import { eventLogLine, sessionIdentifier } from "./event.ts";
import { resolveProjectRoot } from "./project.ts";
import { persistIngest } from "./store.ts";

type JsonObject = Record<string, unknown>;

export type IngestInput = {
  stdinText: string;
  env: Record<string, string | undefined>;
  cwd: string;
  now?: Date;
};

function isRecord(value: unknown): value is JsonObject {
  if (typeof value !== "object") return false;
  if (value === null) return false;
  if (Array.isArray(value)) return false;
  return true;
}

function parsePayload(stdinText: string): JsonObject | undefined {
  try {
    const parsed: unknown = JSON.parse(stdinText);
    if (!isRecord(parsed)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

async function ingestOrThrow(input: IngestInput): Promise<void> {
  const payload = parsePayload(input.stdinText);
  if (payload === undefined) return;
  const projectRoot = resolveProjectRoot({
    env: input.env,
    payload,
    cwd: input.cwd,
  });
  if (projectRoot === undefined) return;
  await persistIngest({
    projectRoot,
    eventLine: eventLogLine(payload),
    sessionId: sessionIdentifier(payload),
    now: input.now ?? new Date(),
  });
}

export async function ingestHook(input: IngestInput): Promise<void> {
  try {
    await ingestOrThrow(input);
  } catch {
    // observe-only: never throw to the caller
  }
}
