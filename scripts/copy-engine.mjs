import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = resolve(root, "node_modules/stockfish");
const targetDir = resolve(root, "public/engine");

const FILES = ["stockfish-19-lite-single.js", "stockfish-19-lite-single.wasm"];

async function findFile(dir, name) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFile(full, name);
      if (nested) return nested;
    } else if (entry.name === name) {
      return full;
    }
  }
  return null;
}

if (!existsSync(packageDir)) {
  console.error("[copy-engine] node_modules/stockfish is missing. Run `npm install` first.");
  process.exit(1);
}

await mkdir(targetDir, { recursive: true });

for (const name of FILES) {
  const binPath = join(packageDir, "bin", name);
  const source = existsSync(binPath) ? binPath : await findFile(packageDir, name);
  if (!source) {
    console.error(`[copy-engine] Could not locate ${name} inside the stockfish package.`);
    process.exit(1);
  }
  await stat(source);
  await copyFile(source, join(targetDir, name));
}

console.log(`[copy-engine] Copied ${FILES.length} engine assets into public/engine/.`);
