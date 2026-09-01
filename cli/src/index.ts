#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgv } from "./argv.ts";
import { decodeHookStdin, ingestHook } from "./ingest.ts";
import { usageMessage } from "./usage.ts";

const { command } = parseArgv(process.argv);

async function runIngest(): Promise<void> {
  try {
    const stdinText = decodeHookStdin(readFileSync(0));
    await ingestHook({
      stdinText,
      env: process.env,
      cwd: process.cwd(),
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
