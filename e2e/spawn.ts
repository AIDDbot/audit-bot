import assert from "node:assert";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const indexPath = path.join(repoRoot, "cli", "src", "index.ts");
const fixturesDir = path.join(repoRoot, "temp", "e2e");

export function dayFolderName(now: Date = new Date()): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dayFolder(projectRoot: string, day = dayFolderName()): string {
  return path.join(projectRoot, "temp", "audit", day);
}

export function eventsPath(projectRoot: string, day = dayFolderName()): string {
  return path.join(dayFolder(projectRoot, day), "events.jsonl");
}

export function sessionsPath(
  projectRoot: string,
  day = dayFolderName(),
): string {
  return path.join(dayFolder(projectRoot, day), "sessions.json");
}

export async function makeFixture(): Promise<string> {
  await mkdir(fixturesDir, { recursive: true });
  return mkdtemp(path.join(fixturesDir, "ac-"));
}

export async function readLines(
  projectRoot: string,
  day = dayFolderName(),
): Promise<string[]> {
  const text = await readFile(eventsPath(projectRoot, day), "utf8");
  return text.split("\n").filter((line) => line.length > 0);
}

export function parseObject(line: string): Record<string, unknown> {
  const value: unknown = JSON.parse(line);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("expected a JSON object line");
  }
  return value as Record<string, unknown>;
}

export async function readSessions(
  projectRoot: string,
  day = dayFolderName(),
): Promise<unknown> {
  return JSON.parse(await readFile(sessionsPath(projectRoot, day), "utf8"));
}

export function sessionYamlPath(
  projectRoot: string,
  sessionId: string,
  day = dayFolderName(),
): string {
  return path.join(dayFolder(projectRoot, day), `${sessionId}.yaml`);
}

export async function readSessionYaml(
  projectRoot: string,
  sessionId: string,
  day = dayFolderName(),
): Promise<string> {
  return readFile(sessionYamlPath(projectRoot, sessionId, day), "utf8");
}

export async function listYamlFiles(
  projectRoot: string,
  day = dayFolderName(),
): Promise<string[]> {
  try {
    const names = await readdir(dayFolder(projectRoot, day));
    return names.filter((name) => name.endsWith(".yaml"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function sessionJsonlPath(
  projectRoot: string,
  sessionId: string,
  day = dayFolderName(),
): string {
  return path.join(dayFolder(projectRoot, day), `${sessionId}.jsonl`);
}

export async function readSessionJsonl(
  projectRoot: string,
  sessionId: string,
  day = dayFolderName(),
): Promise<string> {
  return readFile(sessionJsonlPath(projectRoot, sessionId, day), "utf8");
}

export function jsonlRecords(text: string): unknown[] {
  return text
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as unknown);
}

export async function listJsonlSessionFiles(
  projectRoot: string,
  day = dayFolderName(),
): Promise<string[]> {
  try {
    const names = await readdir(dayFolder(projectRoot, day));
    return names.filter(
      (name) => name.endsWith(".jsonl") && name !== "events.jsonl",
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function sessionReportPath(
  projectRoot: string,
  sessionId: string,
  day = dayFolderName(),
): string {
  return path.join(dayFolder(projectRoot, day), `${sessionId}.md`);
}

export async function readSessionReport(
  projectRoot: string,
  sessionId: string,
  day = dayFolderName(),
): Promise<string> {
  return readFile(sessionReportPath(projectRoot, sessionId, day), "utf8");
}

export function turnSubsection(markdown: string, turn: number): string {
  const heading = `## Turn ${turn}`;
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line === heading || line.startsWith(`${heading} `),
  );
  assert.ok(start >= 0, `missing ${heading}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i] ?? "")) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

export async function listMdFiles(
  projectRoot: string,
  day = dayFolderName(),
): Promise<string[]> {
  try {
    const names = await readdir(dayFolder(projectRoot, day));
    return names.filter((name) => name.endsWith(".md"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export function yamlDocuments(text: string): string[] {
  const starts: number[] = [];
  const pattern = /^---(?:[ \t]*(?:\r?\n|$))/gm;
  for (const match of text.matchAll(pattern)) {
    if (match.index !== undefined) starts.push(match.index);
  }
  if (starts.length === 0) return [];
  return starts.map((start, index) =>
    text.slice(start, starts[index + 1] ?? text.length),
  );
}

function stripYamlQuotes(raw: string): string {
  if (raw.length >= 2) {
    const first = raw[0];
    const last = raw[raw.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return raw.slice(1, -1);
    }
  }
  return raw;
}

const yamlInteger = /^-?\d+$/;

export function yamlRawScalar(document: string, key: string): string | undefined {
  let seenSeparator = false;
  for (const line of document.split(/\r?\n/)) {
    if (!seenSeparator) {
      if (/^---[ \t]*$/.test(line)) {
        seenSeparator = true;
        continue;
      }
      if (line === "") continue;
      seenSeparator = true;
    }
    if (/^---[ \t]*$/.test(line) || line.trim() === "") continue;
    const mapping = /^([A-Za-z_][\w]*):\s*(.*?)\s*$/.exec(line);
    if (mapping === null) continue;
    if ((mapping[1] ?? "") === key) return mapping[2] ?? "";
  }
  return undefined;
}

export function assertYamlIntegerTurn(document: string): string {
  const raw = yamlRawScalar(document, "turn");
  assert.notEqual(raw, undefined, "YAML document has no turn scalar");
  assert.match(raw ?? "", yamlInteger);
  return raw ?? "";
}

export function yamlMapping(document: string): {
  keys: string[];
  values: Record<string, string | null>;
} {
  const keys: string[] = [];
  const values: Record<string, string | null> = {};
  let seenSeparator = false;
  for (const line of document.split(/\r?\n/)) {
    if (!seenSeparator) {
      if (/^---[ \t]*$/.test(line)) {
        seenSeparator = true;
        continue;
      }
      if (line === "") continue;
      seenSeparator = true;
    }
    if (/^---[ \t]*$/.test(line) || line.trim() === "") continue;
    const mapping = /^([A-Za-z_][\w]*):\s*(.*?)\s*$/.exec(line);
    if (mapping === null) continue;
    const key = mapping[1] ?? "";
    const raw = mapping[2] ?? "";
    keys.push(key);
    values[key] = raw === "null" || raw === "~" ? null : stripYamlQuotes(raw);
  }
  return { keys, values };
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

export type SpawnResult = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
};

export async function spawnIngest(input: {
  stdin: string;
  env?: Record<string, string | undefined>;
  extraArgv?: string[];
}): Promise<SpawnResult> {
  const child = spawn(
    process.execPath,
    [indexPath, "ingest", ...(input.extraArgv ?? [])],
    {
      cwd: repoRoot,
      env: childEnv(input.env),
      shell: false,
    },
  );
  const collected = collectUtf8(child);
  writeStdin(child, input.stdin);
  const exitCode = await waitClose(child);
  return { exitCode, stdout: collected.stdout(), stderr: collected.stderr() };
}
