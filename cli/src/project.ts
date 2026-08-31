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

export function resolveProjectRoot(input: {
  env: Record<string, string | undefined>;
  payload: Record<string, unknown>;
}): string | undefined {
  const found =
    nonEmptyString(input.env.CURSOR_PROJECT_DIR) ??
    nonEmptyString(input.env.CLAUDE_PROJECT_DIR) ??
    nonEmptyString(input.payload.cwd) ??
    firstString(input.payload.workspace_roots);
  return found === undefined ? undefined : path.normalize(found);
}
