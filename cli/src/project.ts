import path from "node:path";

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (value.length === 0) return undefined;
  return value;
}

function firstString(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const item of value) {
    const found = nonEmptyString(item);
    if (found !== undefined) return found;
  }
  return undefined;
}

function nativeProjectPath(value: string): string {
  if (process.platform !== "win32") return path.normalize(value);
  const drive = /^\/([A-Za-z]):(?:\/|\\)(.*)$/.exec(value);
  if (drive === null) return path.normalize(value);
  return path.win32.normalize(`${drive[1]}:\\${drive[2]}`);
}

export function resolveProjectRoot(input: {
  env: Record<string, string | undefined>;
  payload: Record<string, unknown>;
  cwd: string;
}): string | undefined {
  const fromEnv = nonEmptyString(input.env.CURSOR_PROJECT_DIR);
  if (fromEnv !== undefined) return nativeProjectPath(fromEnv);
  const fromWorkspace = firstString(input.payload.workspace_roots);
  if (fromWorkspace !== undefined) return nativeProjectPath(fromWorkspace);
  const fromPayloadCwd = nonEmptyString(input.payload.cwd);
  if (fromPayloadCwd !== undefined) return nativeProjectPath(fromPayloadCwd);
  const fromCwd = nonEmptyString(input.cwd);
  if (fromCwd !== undefined) return nativeProjectPath(fromCwd);
  return undefined;
}

export function dayFolderName(now: Date): string {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
