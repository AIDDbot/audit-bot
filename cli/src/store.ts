import { appendFile, mkdir, open, stat, unlink } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import path from "node:path";

const lockWaitMs = 400;
const lockRetryMs = 10;
const lockStaleMs = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if (!("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
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
      if (Date.now() >= deadline) throw new Error("lock not acquired");
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

export async function appendEvent(
  projectRoot: string,
  event: unknown,
): Promise<void> {
  const auditDir = path.join(projectRoot, "temp", "audit");
  const eventsPath = path.join(auditDir, "events.jsonl");
  const lockPath = path.join(auditDir, "events.jsonl.lock");
  await mkdir(auditDir, { recursive: true });
  const lock = await acquireLock(lockPath);
  try {
    await appendFile(eventsPath, `${JSON.stringify(event)}\n`);
  } finally {
    await releaseLock(lock, lockPath);
  }
}
