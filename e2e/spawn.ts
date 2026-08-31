import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const indexPath = path.join(repoRoot, "cli", "src", "index.ts");
const fixturesDir = path.join(repoRoot, "temp", "e2e");

export const iso8601Pattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function eventsPath(projectRoot: string): string {
  return path.join(projectRoot, "temp", "audit", "events.jsonl");
}

export async function makeFixture(): Promise<string> {
  await mkdir(fixturesDir, { recursive: true });
  return mkdtemp(path.join(fixturesDir, "ac-"));
}

export async function readLines(projectRoot: string): Promise<string[]> {
  const text = await readFile(eventsPath(projectRoot), "utf8");
  return text.split("\n").filter((line) => line.length > 0);
}

export function parseObject(line: string): Record<string, unknown> {
  const value: unknown = JSON.parse(line);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("expected a JSON object line");
  }
  return value as Record<string, unknown>;
}

function applyEnv(
  env: Record<string, string | undefined>,
  overrides: Record<string, string | undefined>,
): void {
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
}

function childEnv(
  overrides?: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const env = { ...process.env };
  delete env.CURSOR_PROJECT_DIR;
  delete env.CLAUDE_PROJECT_DIR;
  if (overrides) applyEnv(env, overrides);
  return env;
}

function extraIngestArgs(harness: string, hint?: string): string[] {
  const args = ["ingest", harness];
  if (hint !== undefined) args.push(hint);
  return args;
}

function collectUtf8(child: ChildProcess): {
  stdout: () => string;
  stderr: () => string;
} {
  let stdout = "";
  let stderr = "";
  child.stdout?.setEncoding("utf8");
  child.stderr?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    stdout += chunk;
  });
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
  });
  return {
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function writeStdin(child: ChildProcess, text: string): void {
  child.stdin?.on("error", () => {
    // child may close stdin before the write completes (EPIPE)
  });
  child.stdin?.write(text);
  child.stdin?.end();
}

function waitClose(child: ChildProcess): Promise<number | null> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      resolve(code);
    });
  });
}

async function runIndex(
  extraArgs: string[],
  stdin: string,
  env?: Record<string, string | undefined>,
): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  const child = spawn(process.execPath, [indexPath, ...extraArgs], {
    cwd: repoRoot,
    env: childEnv(env),
    shell: false,
  });
  const collected = collectUtf8(child);
  writeStdin(child, stdin);
  const exitCode = await waitClose(child);
  return { exitCode, stdout: collected.stdout(), stderr: collected.stderr() };
}

export async function spawnCli(input: {
  extraArgs?: string[];
  stdin?: string;
  env?: Record<string, string | undefined>;
}): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return runIndex(input.extraArgs ?? [], input.stdin ?? "", input.env);
}

export async function spawnIngest(input: {
  harness: string;
  hint?: string;
  stdin: string;
  env?: Record<string, string | undefined>;
}): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return runIndex(extraIngestArgs(input.harness, input.hint), input.stdin, input.env);
}
