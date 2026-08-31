import assert from "node:assert";
import path from "node:path";
import { describe, test } from "node:test";
import { resolveProjectRoot } from "../src/project.ts";

describe("resolveProjectRoot", () => {
  test("uses CURSOR_PROJECT_DIR first", () => {
    const root = resolveProjectRoot({
      env: {
        CURSOR_PROJECT_DIR: "cursor-root",
        CLAUDE_PROJECT_DIR: "claude-root",
      },
      payload: { cwd: "cwd-root", workspace_roots: ["ws-root"] },
    });
    assert.equal(root, path.normalize("cursor-root"));
  });

  test("uses CLAUDE_PROJECT_DIR when Cursor env is empty", () => {
    const root = resolveProjectRoot({
      env: { CURSOR_PROJECT_DIR: "", CLAUDE_PROJECT_DIR: "claude-root" },
      payload: { cwd: "cwd-root" },
    });
    assert.equal(root, path.normalize("claude-root"));
  });

  test("uses payload cwd when env dirs are missing", () => {
    const root = resolveProjectRoot({
      env: {},
      payload: { cwd: "cwd-root", workspace_roots: ["ws-root"] },
    });
    assert.equal(root, path.normalize("cwd-root"));
  });

  test("uses the first string in workspace_roots", () => {
    const root = resolveProjectRoot({
      env: {},
      payload: { workspace_roots: [1, "", "ws-root", "other"] },
    });
    assert.equal(root, path.normalize("ws-root"));
  });

  test("returns undefined when none is found", () => {
    const root = resolveProjectRoot({
      env: { CURSOR_PROJECT_DIR: "", CLAUDE_PROJECT_DIR: "" },
      payload: { cwd: "", workspace_roots: [null, ""] },
    });
    assert.equal(root, undefined);
  });
});
