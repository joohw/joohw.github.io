import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const root = fileURLToPath(new URL("../", import.meta.url));
const sourceTypes = new Set([".tsx", ".ts", ".jsx", ".js", ".md", ".mdx", ".json", ".css"]);
const characters = new Set(Array.from({ length: 95 }, (_, i) => String.fromCodePoint(32 + i)));

// Include text from every section, even if a reader only sees it after a click.
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(path);
    } else if (entry.isFile() && sourceTypes.has(extname(entry.name))) {
      for (const character of await readFile(path, "utf8")) {
        if (character.codePointAt(0) > 126) characters.add(character);
      }
    }
  }
}

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isDirectory() && ["app", "lib", "content"].includes(entry.name)) {
    await collect(join(root, entry.name));
  }
}

const master = await readFile(join(root, "fonts", "portfolio-serif.woff2"));
const subset = await subsetFont(master, [...characters].sort().join(""), {
  targetFormat: "woff2",
  preserveNameIds: [0, 13, 14],
});
const directory = join(root, ".font-build");
await mkdir(directory, { recursive: true });
const temporary = join(directory, randomUUID() + ".woff2");
await writeFile(temporary, subset);
await rename(temporary, join(directory, "portfolio.woff2"));
console.log(`Compiled Portfolio Serif: ${characters.size} requested characters, ${subset.length} bytes.`);
