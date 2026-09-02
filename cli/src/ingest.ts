import path from "node:path";
import { eventLogLine, sessionIdentifier } from "./event.ts";
import { dayFolderName, resolveProjectRoot } from "./project.ts";
import { writeSessionReport } from "./report.ts";
import { persistIngest } from "./store.ts";
import type { YamlEmitInput } from "./yaml.ts";

type JsonObject = Record<string, unknown>;

export type IngestInput = {
  stdinText: string;
  env: Record<string, string | undefined>;
  cwd: string;
  now?: Date;
  harness?: string;
  event?: string;
};

type HookEncoding =
  | "utf16le-bom"
  | "utf16be-bom"
  | "utf8-bom"
  | "utf16le"
  | "utf16be"
  | "utf8";

type PersistParsedInput = {
  input: IngestInput;
  payload: JsonObject;
  projectRoot: string;
};

type MaybeWriteReportInput = {
  projectRoot: string;
  sessionId: string | undefined;
  now: Date;
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

function startsWithTwo(buf: Buffer, first: number, second: number): boolean {
  if (buf.length < 2) return false;
  if (buf[0] !== first) return false;
  return buf[1] === second;
}

function hasUtf8Bom(buf: Buffer): boolean {
  if (buf.length < 3) return false;
  if (buf[0] !== 0xef) return false;
  if (buf[1] !== 0xbb) return false;
  return buf[2] === 0xbf;
}

function detectBomEncoding(buf: Buffer): HookEncoding | undefined {
  if (startsWithTwo(buf, 0xff, 0xfe)) return "utf16le-bom";
  if (startsWithTwo(buf, 0xfe, 0xff)) return "utf16be-bom";
  if (hasUtf8Bom(buf)) return "utf8-bom";
  return undefined;
}

function detectEndianEncoding(buf: Buffer): HookEncoding {
  if (startsWithTwo(buf, 0x7b, 0x00)) return "utf16le";
  if (startsWithTwo(buf, 0x00, 0x7b)) return "utf16be";
  return "utf8";
}

function detectHookEncoding(buf: Buffer): HookEncoding {
  const bom = detectBomEncoding(buf);
  if (bom !== undefined) return bom;
  return detectEndianEncoding(buf);
}

function decodeBom(buf: Buffer, encoding: HookEncoding): string | undefined {
  if (encoding === "utf16le-bom") return buf.subarray(2).toString("utf16le");
  if (encoding === "utf16be-bom") return utf16BeToString(buf.subarray(2));
  if (encoding === "utf8-bom") return buf.subarray(3).toString("utf8");
  return undefined;
}

function decodeEndian(buf: Buffer, encoding: HookEncoding): string {
  if (encoding === "utf16le") return buf.toString("utf16le");
  if (encoding === "utf16be") return utf16BeToString(buf);
  return buf.toString("utf8");
}

function decodeHookEncoding(buf: Buffer, encoding: HookEncoding): string {
  const decoded = decodeBom(buf, encoding);
  if (decoded !== undefined) return decoded;
  return decodeEndian(buf, encoding);
}

/** Decode hook stdin. Windows PowerShell may pipe UTF-16 or a UTF-8 BOM. */
export function decodeHookStdin(buf: Buffer): string {
  return decodeHookEncoding(buf, detectHookEncoding(buf));
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

function positionalOrEmpty(value: string | undefined): string {
  if (value === undefined) return "";
  return value;
}

function sessionYamlEmit(
  payload: JsonObject,
  input: IngestInput,
  sessionId: string | undefined,
  now: Date,
): YamlEmitInput | undefined {
  if (sessionId === undefined) return undefined;
  return {
    payload,
    harness: positionalOrEmpty(input.harness),
    event: positionalOrEmpty(input.event),
    now,
  };
}

async function persistParsedIngest(args: PersistParsedInput): Promise<void> {
  const sessionId = sessionIdentifier(args.payload);
  const now = args.input.now ?? new Date();
  await persistIngest({
    projectRoot: args.projectRoot,
    eventLine: eventLogLine(args.payload),
    sessionId,
    yamlEmit: sessionYamlEmit(args.payload, args.input, sessionId, now),
    now,
  });
  await maybeWriteReport({
    projectRoot: args.projectRoot,
    sessionId,
    now,
  });
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
  await persistParsedIngest({ input, payload, projectRoot });
}

async function maybeWriteReport(args: MaybeWriteReportInput): Promise<void> {
  if (args.sessionId === undefined) return;
  const folder = path.join(args.projectRoot, "temp", "audit", dayFolderName(args.now));
  try {
    await writeSessionReport({
      yamlPath: path.join(folder, `${args.sessionId}.yaml`),
      mdPath: path.join(folder, `${args.sessionId}.md`),
    });
  } catch {
    // report failure must not undo persist
  }
}

export async function ingestHook(input: IngestInput): Promise<void> {
  try {
    await ingestOrThrow(input);
  } catch {
    // observe-only: never throw to the caller
  }
}
