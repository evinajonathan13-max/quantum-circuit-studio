import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

function collectMarkdown(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(entryPath);
    return extname(entry.name).toLowerCase() === ".md" ? [entryPath] : [];
  });
}

const markdownFiles = [join(projectRoot, "README.md"), ...collectMarkdown(join(projectRoot, "docs"))];
const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
const invalid = [];
let checked = 0;

for (const markdownFile of markdownFiles) {
  const content = readFileSync(markdownFile, "utf8");
  for (const match of content.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (!rawTarget || rawTarget.startsWith("#") || /^(https?:|mailto:)/i.test(rawTarget)) continue;
    const targetPath = rawTarget.split("#")[0];
    const resolved = normalize(resolve(dirname(markdownFile), targetPath));
    checked += 1;
    if (!existsSync(resolved) || !statSync(resolved).isFile()) {
      invalid.push(`${markdownFile.replace(`${projectRoot}/`, "")} → ${rawTarget}`);
    }
  }
}

if (invalid.length) {
  console.error("Documentation link check failed:\n" + invalid.map((entry) => `- ${entry}`).join("\n"));
  process.exit(1);
}

console.log(`Documentation link check passed: ${checked} local references across ${markdownFiles.length} Markdown files.`);
