import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outfile = path.join(cliRoot, "..", ".agents", "hooks", "index.mjs");
const entry = path.join(cliRoot, "src", "index.ts");
const pkg = JSON.parse(readFileSync(path.join(cliRoot, "package.json"), "utf8")) as {
  version: string;
};

const banner = `// v${pkg.version} ${new Date().toISOString()}`;
const shebang = "#!/usr/bin/env node\n";

mkdirSync(path.dirname(outfile), { recursive: true });

const result = spawnSync(
  "bun",
  ["build", entry, "--target=node", "--format=esm", "--outfile", outfile],
  { cwd: cliRoot, stdio: "inherit" },
);
if (result.status !== 0) process.exit(result.status ?? 1);

const body = readFileSync(outfile, "utf8");
const rest = body.startsWith(shebang) ? body.slice(shebang.length) : body;
const prefix = body.startsWith(shebang) ? shebang : "";
writeFileSync(outfile, `${prefix}${banner}\n${rest}`);
