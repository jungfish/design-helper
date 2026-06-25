import { put } from "@vercel/blob";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_IMAGES_DIR = join(ROOT, "public", "images");

const MIME_TYPES = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".avif": "image/avif",
};

function walkDir(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry !== ".gitkeep" && MIME_TYPES[extname(entry).toLowerCase()]) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = walkDir(PUBLIC_IMAGES_DIR);

if (files.length === 0) {
  console.error("Aucun fichier image trouvé dans public/images/");
  process.exit(1);
}

console.error(`Migration de ${files.length} fichiers vers Vercel Blob...\n`);

const mapping = {};

for (const filePath of files) {
  const relativePath = "/" + relative(join(ROOT, "public"), filePath).replace(/\\/g, "/");
  const filename = relative(join(ROOT, "public", "images"), filePath).replace(/\\/g, "/");
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext];
  const buffer = readFileSync(filePath);

  try {
    const blob = await put(filename, buffer, { access: "public", contentType });
    mapping[relativePath] = blob.url;
    console.error(`✓ ${relativePath}`);
    console.error(`  → ${blob.url}`);
  } catch (err) {
    console.error(`✗ ${relativePath} : ${err.message}`);
  }
}

console.error("\n--- Mapping JSON (copiez-collez dans App.jsx) ---\n");
console.log(JSON.stringify(mapping, null, 2));
