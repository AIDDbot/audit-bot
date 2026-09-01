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

function utf16BeToString(buf: Buffer): string {
  const swapped = Buffer.from(buf);
  swapped.swap16();
  return swapped.toString("utf16le");
}

/** Decode hook stdin. Windows PowerShell may pipe UTF-16 or a UTF-8 BOM. */
export function decodeHookStdin(buf: Buffer): string {
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    return utf16BeToString(buf.subarray(2));
  }
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.subarray(3).toString("utf8");
  }
  if (buf.length >= 2 && buf[0] === 0x7b && buf[1] === 0x00) {
    return buf.toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0x00 && buf[1] === 0x7b) {
    return utf16BeToString(buf);
  }
  return buf.toString("utf8");
}

function parseJsonValue(text: string): unknown {
  return JSON.parse(text.replace(/^\uFEFF/, "").trim());
}

function parsePayload(stdinText: string): JsonObject | undefined {
  try {
    let parsed: unknown = parseJsonValue(stdinText);
    if (typeof parsed === "string") parsed = parseJsonValue(parsed);
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
