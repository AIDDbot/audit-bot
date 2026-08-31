#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { ingestHook } from "./ingest.ts";
import { getHealthMessage } from "./lib.ts";

const command = process.argv[2] ?? "health";

async function runIngest(): Promise<void> {
  try {
    const stdinText = readFileSync(0, "utf8");
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

if (command === "health") {
  console.log(getHealthMessage());
} else if (command === "ingest") {
  await runIngest();
} else {
  console.error("usage: cli-node [health]");
  process.exitCode = 1;
}
