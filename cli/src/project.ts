import path from "node:path";

function nonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
  if (process.platform === "win32") {
    const drive = /^\/([A-Za-z]):(?:\/|\\)(.*)$/.exec(value);
    if (drive !== null) {
      return path.win32.normalize(`${drive[1]}:\\${drive[2]}`);
    }
  }
  return path.normalize(value);
}

export function resolveProjectRoot(input: {
  env: Record<string, string | undefined>;
  payload: Record<string, unknown>;
}): string | undefined {
  const found =
    nonEmptyString(input.env.CURSOR_PROJECT_DIR) ??
    nonEmptyString(input.env.CLAUDE_PROJECT_DIR) ??
    nonEmptyString(input.payload.cwd) ??
    firstString(input.payload.workspace_roots);
  return found === undefined ? undefined : nativeProjectPath(found);
}
