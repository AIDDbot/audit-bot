import assert from "node:assert";
import path from "node:path";
import { describe, test } from "node:test";
import { dayFolderName, resolveProjectRoot } from "../src/project.ts";

describe("resolveProjectRoot", () => {
  test("uses CURSOR_PROJECT_DIR first", () => {
    const root = resolveProjectRoot({
      env: {
        CURSOR_PROJECT_DIR: "cursor-root",
        CLAUDE_PROJECT_DIR: "claude-root",
      },
      payload: { cwd: "cwd-root", workspace_roots: ["ws-root"] },
      cwd: "proc-root",
    });
    assert.equal(root, path.normalize("cursor-root"));
  });

  test("uses first workspace_roots string before payload cwd", () => {
    const root = resolveProjectRoot({
      env: {},
      payload: { cwd: "cwd-root", workspace_roots: [1, "", "ws-root", "other"] },
      cwd: "proc-root",
    });
    assert.equal(root, path.normalize("ws-root"));
  });

  test("uses payload cwd before process cwd", () => {
    const root = resolveProjectRoot({
      env: {},
      payload: { cwd: "cwd-root" },
      cwd: "proc-root",
    });
    assert.equal(root, path.normalize("cwd-root"));
  });

  test("uses process cwd last", () => {
    const root = resolveProjectRoot({
      env: { CLAUDE_PROJECT_DIR: "claude-root" },
      payload: {},
      cwd: "proc-root",
    });
    assert.equal(root, path.normalize("proc-root"));
  });

  test("does not use CLAUDE_PROJECT_DIR", () => {
    const root = resolveProjectRoot({
      env: { CURSOR_PROJECT_DIR: "", CLAUDE_PROJECT_DIR: "claude-root" },
      payload: { workspace_roots: ["ws-root"] },
      cwd: "proc-root",
    });
    assert.equal(root, path.normalize("ws-root"));
  });

  test("normalizes Windows and POSIX separators", () => {
    const root = resolveProjectRoot({
      env: { CURSOR_PROJECT_DIR: "a/b\\c" },
      payload: {},
      cwd: "x",
    });
    assert.equal(root, path.normalize("a/b\\c"));
  });

  test("maps a leading-slash Windows drive path from workspace_roots", () => {
    if (process.platform !== "win32") return;
    const root = resolveProjectRoot({
      env: {},
      payload: { workspace_roots: ["/C:/code/aidd/audit-bot"] },
      cwd: "x",
    });
    assert.equal(root, path.win32.normalize("C:\\code\\aidd\\audit-bot"));
  });

  test("non-win32 uses path.normalize for a leading-slash drive path", (t) => {
    t.mock.property(process, "platform", "linux");
    const value = "/C:/code/aidd/audit-bot";
    const root = resolveProjectRoot({
      env: { CURSOR_PROJECT_DIR: value },
      payload: {},
      cwd: "x",
    });
    assert.equal(root, path.normalize(value));
  });

  test("returns undefined when none is found", () => {
    const root = resolveProjectRoot({
      env: { CURSOR_PROJECT_DIR: "" },
      payload: { cwd: "", workspace_roots: [null, ""] },
      cwd: "",
    });
    assert.equal(root, undefined);
  });
});

describe("dayFolderName", () => {
  test("formats local YYYY-MM-DD, not UTC", () => {
    const now = new Date(2026, 8, 1, 23, 30, 0);
    assert.equal(dayFolderName(now), "2026-09-01");
    const utcMidnight = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    const local = [
      String(utcMidnight.getFullYear()),
      String(utcMidnight.getMonth() + 1).padStart(2, "0"),
      String(utcMidnight.getDate()).padStart(2, "0"),
    ].join("-");
    assert.equal(dayFolderName(utcMidnight), local);
  });
});
