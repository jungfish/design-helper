import { readFileSync } from "fs";
import { list } from "@vercel/blob";

// Load .env.local
const envFile = readFileSync(".env.local", "utf-8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("❌ SUPABASE_URL ou SUPABASE_ANON_KEY manquant dans .env.local");
  process.exit(1);
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("❌ BLOB_READ_WRITE_TOKEN manquant dans .env.local");
  process.exit(1);
}

console.log("📦 Récupération des projets depuis Vercel Blob...");

let blobs = [];
let cursor;
do {
  const result = await list({ prefix: "projects/", cursor });
  blobs = blobs.concat(result.blobs);
  cursor = result.cursor;
} while (cursor);

console.log(`📁 ${blobs.length} projet(s) trouvé(s)`);

let migrated = 0;
let failed = 0;

for (const blob of blobs) {
  const match = blob.pathname.match(/projects\/([a-z0-9]+)\.json$/);
  if (!match) continue;
  const projectId = match[1];

  try {
    const dataRes = await fetch(blob.url);
    if (!dataRes.ok) throw new Error(`HTTP ${dataRes.status}`);
    const state = await dataRes.json();

    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: projectId, state, updated_at: new Date().toISOString() }),
    });

    if (!sbRes.ok) throw new Error(await sbRes.text());

    console.log(`  ✅ ${projectId}`);
    migrated++;
  } catch (err) {
    console.error(`  ❌ ${projectId}: ${err.message}`);
    failed++;
  }
}

console.log(`\n✅ Migration terminée : ${migrated} migré(s), ${failed} échoué(s)`);
