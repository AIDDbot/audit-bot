#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgv } from "./argv.ts";
import { decodeHookStdin, ingestHook } from "./ingest.ts";
import { usageMessage } from "./usage.ts";

const parsed = parseArgv(process.argv);

async function runIngest(): Promise<void> {
  if (parsed.command !== "ingest") return;
  try {
    const stdinText = decodeHookStdin(readFileSync(0));
    await ingestHook({
      stdinText,
      env: process.env,
      cwd: process.cwd(),
      harness: parsed.harness,
      event: parsed.event,
    });
  } finally {
    process.exitCode = 0;
  }
}

if (parsed.command === "ingest") {
  await runIngest();
} else {
  console.error(usageMessage);
  process.exitCode = 1;
}
