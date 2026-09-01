#!/usr/bin/env node

// src/index.ts
import { readFileSync } from "node:fs";

// src/event.ts
function nonEmptyString(value) {
  if (typeof value !== "string")
    return;
  if (value.length === 0)
    return;
  return value;
}
function sessionIdentifier(payload) {
  const sessionId = nonEmptyString(payload.session_id);
  if (sessionId !== undefined)
    return sessionId;
  const conversationId = nonEmptyString(payload.conversation_id);
  if (conversationId !== undefined)
    return conversationId;
  return nonEmptyString(payload.parent_conversation_id);
}
function eventLogLine(payload) {
  return JSON.stringify(payload);
}

// src/project.ts
import path from "node:path";
function nonEmptyString2(value) {
  if (typeof value !== "string")
    return;
  if (value.length === 0)
    return;
  return value;
}
function firstString(value) {
  if (!Array.isArray(value))
    return;
  for (const item of value) {
    const found = nonEmptyString2(item);
    if (found !== undefined)
      return found;
  }
  return;
}
function nativeProjectPath(value) {
  if (process.platform !== "win32")
    return path.normalize(value);
  const drive = /^\/([A-Za-z]):(?:\/|\\)(.*)$/.exec(value);
  if (drive === null)
    return path.normalize(value);
  return path.win32.normalize(`${drive[1]}:\\${drive[2]}`);
}
function resolveProjectRoot(input) {
  const fromEnv = nonEmptyString2(input.env.CURSOR_PROJECT_DIR);
  if (fromEnv !== undefined)
    return nativeProjectPath(fromEnv);
  const fromWorkspace = firstString(input.payload.workspace_roots);
  if (fromWorkspace !== undefined)
    return nativeProjectPath(fromWorkspace);
  const fromPayloadCwd = nonEmptyString2(input.payload.cwd);
  if (fromPayloadCwd !== undefined)
    return nativeProjectPath(fromPayloadCwd);
  const fromCwd = nonEmptyString2(input.cwd);
  if (fromCwd !== undefined)
    return nativeProjectPath(fromCwd);
  return;
}
function dayFolderName(now) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// src/store.ts
import {
  appendFile,
  mkdir,
  open,
  readFile,
  stat,
  unlink,
  writeFile
} from "node:fs/promises";
import path2 from "node:path";
var lockWaitMs = 400;
var lockRetryMs = 10;
var lockStaleMs = 2000;
function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
function errorCode(error) {
  if (typeof error !== "object")
    return;
  if (error === null)
    return;
  if (!("code" in error))
    return;
  if (typeof error.code !== "string")
    return;
  return error.code;
}
async function unlinkQuiet(lockPath) {
  try {
    await unlink(lockPath);
  } catch {}
}
async function unlinkIfStale(lockPath) {
  try {
    const info = await stat(lockPath);
    if (Date.now() - info.mtimeMs > lockStaleMs)
      await unlink(lockPath);
  } catch {}
}
async function acquireLock(lockPath) {
  const deadline = Date.now() + lockWaitMs;
  for (;; ) {
    try {
      return await open(lockPath, "wx");
    } catch (error) {
      if (errorCode(error) !== "EEXIST")
        throw error;
      if (Date.now() >= deadline)
        throw new Error("lock not acquired");
      await unlinkIfStale(lockPath);
      await delay(lockRetryMs);
    }
  }
}
async function releaseLock(lock, lockPath) {
  try {
    await lock.close();
  } finally {
    await unlinkQuiet(lockPath);
  }
}
function stringIds(parsed) {
  const ids = [];
  for (const item of parsed) {
    if (typeof item === "string")
      ids.push(item);
  }
  return ids;
}
async function loadSessionIndex(sessionsPath) {
  try {
    const parsed = JSON.parse(await readFile(sessionsPath, "utf8"));
    if (!Array.isArray(parsed))
      throw new Error("sessions.json is not a JSON array");
    return { ids: stringIds(parsed), exists: true };
  } catch (error) {
    if (errorCode(error) === "ENOENT")
      return { ids: [], exists: false };
    throw error;
  }
}
function nextSessionIds(ids, sessionId) {
  if (sessionId === undefined)
    return;
  if (ids.includes(sessionId))
    return;
  return [...ids, sessionId];
}
async function persistSessionIndex(sessionsPath, sessionId) {
  const loaded = await loadSessionIndex(sessionsPath);
  const updated = nextSessionIds(loaded.ids, sessionId);
  if (updated !== undefined) {
    await writeFile(sessionsPath, JSON.stringify(updated));
    return;
  }
  if (loaded.exists)
    return;
  await writeFile(sessionsPath, "[]");
}
async function writeUnderLock(dayFolder, eventLine, sessionId) {
  const eventsPath = path2.join(dayFolder, "events.jsonl");
  const sessionsPath = path2.join(dayFolder, "sessions.json");
  await appendFile(eventsPath, `${eventLine}
`);
  await persistSessionIndex(sessionsPath, sessionId);
}
async function persistIngest(input) {
  const dayFolder = path2.join(input.projectRoot, "temp", "audit", dayFolderName(input.now));
  await mkdir(dayFolder, { recursive: true });
  const lockPath = path2.join(dayFolder, "ingest.lock");
  const lock = await acquireLock(lockPath);
  try {
    await writeUnderLock(dayFolder, input.eventLine, input.sessionId);
  } finally {
    await releaseLock(lock, lockPath);
  }
}

// src/ingest.ts
function isRecord(value) {
  if (typeof value !== "object")
    return false;
  if (value === null)
    return false;
  if (Array.isArray(value))
    return false;
  return true;
}
function utf16BeToString(buf) {
  const swapped = Buffer.from(buf);
  swapped.swap16();
  return swapped.toString("utf16le");
}
function decodeHookStdin(buf) {
  if (buf.length >= 2 && buf[0] === 255 && buf[1] === 254) {
    return buf.subarray(2).toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 254 && buf[1] === 255) {
    return utf16BeToString(buf.subarray(2));
  }
  if (buf.length >= 3 && buf[0] === 239 && buf[1] === 187 && buf[2] === 191) {
    return buf.subarray(3).toString("utf8");
  }
  if (buf.length >= 2 && buf[0] === 123 && buf[1] === 0) {
    return buf.toString("utf16le");
  }
  if (buf.length >= 2 && buf[0] === 0 && buf[1] === 123) {
    return utf16BeToString(buf);
  }
  return buf.toString("utf8");
}
function parseJsonValue(text) {
  return JSON.parse(text.replace(/^\uFEFF/, "").trim());
}
function parsePayload(stdinText) {
  try {
    let parsed = parseJsonValue(stdinText);
    if (typeof parsed === "string")
      parsed = parseJsonValue(parsed);
    if (!isRecord(parsed))
      return;
    return parsed;
  } catch {
    return;
  }
}
async function ingestOrThrow(input) {
  const payload = parsePayload(input.stdinText);
  if (payload === undefined)
    return;
  const projectRoot = resolveProjectRoot({
    env: input.env,
    payload,
    cwd: input.cwd
  });
  if (projectRoot === undefined)
    return;
  await persistIngest({
    projectRoot,
    eventLine: eventLogLine(payload),
    sessionId: sessionIdentifier(payload),
    now: input.now ?? new Date
  });
}
async function ingestHook(input) {
  try {
    await ingestOrThrow(input);
  } catch {}
}

// src/usage.ts
var usageMessage = "usage: cli-node ingest";

// src/index.ts
var command = process.argv[2];
async function runIngest() {
  try {
    const stdinText = decodeHookStdin(readFileSync(0));
    await ingestHook({
      stdinText,
      env: process.env,
      cwd: process.cwd()
    });
  } finally {
    process.exitCode = 0;
  }
}
if (command === "ingest") {
  await runIngest();
} else {
  console.error(usageMessage);
  process.exitCode = 1;
}
