#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { decodeHookStdin, ingestHook } from "./ingest.ts";
import { usageMessage } from "./usage.ts";

const command = process.argv[2];

async function runIngest(): Promise<void> {
  try {
    const stdinText = decodeHookStdin(readFileSync(0));
    await ingestHook({
      harness: process.argv[3],
      hookEventHint: process.argv[4],
      stdinText,
      env: process.env,
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
