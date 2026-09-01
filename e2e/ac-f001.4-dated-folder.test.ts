import assert from "node:assert";
import { access, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  dayFolder,
  dayFolderName,
  eventsPath,
  makeFixture,
  repoRoot,
  sessionsPath,
  spawnIngest,
} from "./spawn.ts";

function utcFolderName(now: Date): string {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isInside(parent: string, child: string): boolean {
  const relative = path.relative(path.resolve(parent), path.resolve(child));
  if (relative === "") return true;
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

test("AC-F001.4 — dated folder is created and holds both artifacts", async () => {
  const projectRoot = await makeFixture();
  const now = new Date();
  const localDay = dayFolderName(now);
  const utcDay = utcFolderName(now);
  const folder = dayFolder(projectRoot, localDay);
  await assert.rejects(access(path.join(projectRoot, "temp")));

  const result = await spawnIngest({
    stdin: JSON.stringify({
      hook_event_name: "sessionStart",
      session_id: "sess-ac-f001-4",
    }),
    env: { CURSOR_PROJECT_DIR: projectRoot },
  });

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "");
  const info = await stat(folder);
  assert.equal(info.isDirectory(), true);
  await access(eventsPath(projectRoot, localDay));
  await access(sessionsPath(projectRoot, localDay));
  await assert.rejects(
    access(path.join(projectRoot, "temp", "audit", "events.jsonl")),
  );
  if (localDay !== utcDay) {
    await assert.rejects(access(dayFolder(projectRoot, utcDay)));
  }
  assert.equal(isInside(projectRoot, folder), true);
  assert.equal(isInside(os.tmpdir(), folder), false);
  const windirTemp = process.env.TEMP ?? process.env.TMP;
  if (windirTemp !== undefined) {
    assert.equal(isInside(windirTemp, folder), false);
  }
  assert.equal(isInside("/tmp", folder), false);
  assert.equal(isInside(path.join(repoRoot, "cli", "temp"), folder), false);
});
