import {
  appendFile,
  mkdir,
  open,
  readFile,
  stat,
  unlink,
  writeFile,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { dayFolderName } from "./project.ts";
import {
  emitYamlDocument,
  nextConversationTurn,
  type YamlEmitInput,
} from "./yaml.ts";

const lockWaitMs = 400;
const lockRetryMs = 10;
const lockStaleMs = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object") return undefined;
  if (error === null) return undefined;
  if (!("code" in error)) return undefined;
  if (typeof error.code !== "string") return undefined;
  return error.code;
}

async function unlinkQuiet(lockPath: string): Promise<void> {
  try {
    await unlink(lockPath);
  } catch {
    // already gone
  }
}

async function unlinkIfStale(lockPath: string): Promise<void> {
  try {
    const info = await stat(lockPath);
    if (Date.now() - info.mtimeMs > lockStaleMs) await unlink(lockPath);
  } catch {
    // missing lock is fine
  }
}

async function acquireLock(lockPath: string): Promise<FileHandle> {
  const deadline = Date.now() + lockWaitMs;
  for (;;) {
    try {
      return await open(lockPath, "wx");
    } catch (error) {
      if (errorCode(error) !== "EEXIST") throw error;
      if (Date.now() >= deadline) throw new Error("lock not acquired", { cause: error });
      await unlinkIfStale(lockPath);
      await delay(lockRetryMs);
    }
  }
}

async function releaseLock(lock: FileHandle, lockPath: string): Promise<void> {
  try {
    await lock.close();
  } finally {
    await unlinkQuiet(lockPath);
  }
}

function stringIds(parsed: unknown[]): string[] {
  const ids: string[] = [];
  for (const item of parsed) {
    if (typeof item === "string") ids.push(item);
  }
  return ids;
}

async function loadSessionIndex(
  sessionsPath: string,
): Promise<{ ids: string[]; exists: boolean }> {
  try {
    const parsed: unknown = JSON.parse(await readFile(sessionsPath, "utf8"));
    if (!Array.isArray(parsed)) throw new Error("sessions.json is not a JSON array");
    return { ids: stringIds(parsed), exists: true };
  } catch (error) {
    if (errorCode(error) === "ENOENT") return { ids: [], exists: false };
    throw error;
  }
}

function nextSessionIds(
  ids: string[],
  sessionId: string | undefined,
): string[] | undefined {
  if (sessionId === undefined) return undefined;
  if (ids.includes(sessionId)) return undefined;
  return [...ids, sessionId];
}

async function persistSessionIndex(
  sessionsPath: string,
  sessionId: string | undefined,
): Promise<void> {
  const loaded = await loadSessionIndex(sessionsPath);
  const updated = nextSessionIds(loaded.ids, sessionId);
  if (updated !== undefined) {
    await writeFile(sessionsPath, JSON.stringify(updated));
    return;
  }
  if (loaded.exists) return;
  await writeFile(sessionsPath, "[]");
}

async function readExistingYaml(yamlPath: string): Promise<string> {
  try {
    return await readFile(yamlPath, "utf8");
  } catch (error) {
    if (errorCode(error) === "ENOENT") return "";
    throw error;
  }
}

function countedYamlDocument(
  existing: string,
  sessionId: string,
  emit: YamlEmitInput,
): string {
  return emitYamlDocument({
    payload: emit.payload,
    sessionId,
    harness: emit.harness,
    event: emit.event,
    now: emit.now,
    turn: nextConversationTurn(existing, emit.event),
  });
}

async function appendCountedYaml(
  yamlPath: string,
  sessionId: string,
  emit: YamlEmitInput,
): Promise<void> {
  const existing = await readExistingYaml(yamlPath);
  await appendFile(yamlPath, countedYamlDocument(existing, sessionId, emit));
}

async function appendSessionYaml(input: {
  dayFolder: string;
  sessionId: string | undefined;
  yamlDocument: string | undefined;
  yamlEmit: YamlEmitInput | undefined;
}): Promise<void> {
  if (input.sessionId === undefined) return;
  const yamlPath = path.join(input.dayFolder, `${input.sessionId}.yaml`);
  if (input.yamlDocument !== undefined) {
    await appendFile(yamlPath, input.yamlDocument);
    return;
  }
  if (input.yamlEmit === undefined) return;
  await appendCountedYaml(yamlPath, input.sessionId, input.yamlEmit);
}

async function writeUnderLock(input: {
  dayFolder: string;
  eventLine: string;
  sessionId: string | undefined;
  yamlDocument: string | undefined;
  yamlEmit: YamlEmitInput | undefined;
}): Promise<void> {
  const eventsPath = path.join(input.dayFolder, "events.jsonl");
  const sessionsPath = path.join(input.dayFolder, "sessions.json");
  await appendFile(eventsPath, `${input.eventLine}\n`);
  await persistSessionIndex(sessionsPath, input.sessionId);
  await appendSessionYaml({
    dayFolder: input.dayFolder,
    sessionId: input.sessionId,
    yamlDocument: input.yamlDocument,
    yamlEmit: input.yamlEmit,
  });
}

export async function persistIngest(input: {
  projectRoot: string;
  eventLine: string;
  sessionId: string | undefined;
  yamlDocument?: string;
  yamlEmit?: YamlEmitInput;
  now: Date;
}): Promise<void> {
  const dayFolder = path.join(
    input.projectRoot,
    "temp",
    "audit",
    dayFolderName(input.now),
  );
  await mkdir(dayFolder, { recursive: true });
  const lockPath = path.join(dayFolder, "ingest.lock");
  const lock = await acquireLock(lockPath);
  try {
    await writeUnderLock({
      dayFolder,
      eventLine: input.eventLine,
      sessionId: input.sessionId,
      yamlDocument: input.yamlDocument,
      yamlEmit: input.yamlEmit,
    });
  } finally {
    await releaseLock(lock, lockPath);
  }
}
