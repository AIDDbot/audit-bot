#!/usr/bin/env node
import { getHealthMessage } from "./lib";

const command = process.argv[2] ?? "health";

if (command === "health") {
  console.log(getHealthMessage());
} else {
  console.error("usage: cli-node [health]");
  process.exitCode = 1;
}
