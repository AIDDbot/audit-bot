import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDir = path.join(cliRoot, "..", "dist");
const entry = path.join(cliRoot, "src", "index.ts");

type CompileTarget = {
  target?: string;
  outfile: string;
};

const currentPlatform: CompileTarget = {
  outfile: path.join(distDir, "audit-bot"),
};

const distTargets: CompileTarget[] = [
  { target: "bun-windows-x64", outfile: path.join(distDir, "audit-bot-windows-x64") },
  { target: "bun-linux-x64", outfile: path.join(distDir, "audit-bot-linux-x64") },
  { target: "bun-linux-arm64", outfile: path.join(distDir, "audit-bot-linux-arm64") },
  { target: "bun-darwin-x64", outfile: path.join(distDir, "audit-bot-darwin-x64") },
  { target: "bun-darwin-arm64", outfile: path.join(distDir, "audit-bot-darwin-arm64") },
];

function bunArgs(spec: CompileTarget): string[] {
  const args = ["build", entry, "--compile", "--outfile", spec.outfile];
  if (spec.target === undefined) return args;
  args.push("--target", spec.target);
  return args;
}

function compileOne(spec: CompileTarget): void {
  const result = spawnSync("bun", bunArgs(spec), {
    cwd: cliRoot,
    stdio: "inherit",
  });
  if (result.status === 0) return;
  process.exit(result.status ?? 1);
}

mkdirSync(distDir, { recursive: true });
const specs = process.argv.includes("--all") ? distTargets : [currentPlatform];
for (const spec of specs) compileOne(spec);
