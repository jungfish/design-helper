#!/usr/bin/env node
// One-shot script: upload design board PDFs to Vercel Blob and generate a localStorage injection snippet.
// Usage: node --env-file=.env.local scripts/upload-planches.js

import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DOWNLOADS = path.join(process.env.HOME, 'Downloads');

// label = key used when building the snippet
const FILES = [
  { file: 'Planche SANITAIRE.pdf',       label: 'toilettes' },
  { file: 'Planche SALLE DE BAIN .pdf',  label: 'sdb' },
  { file: 'Planche OFFICE.pdf',          label: 'cellier' },
  { file: 'Planche CHAMBRE PARENTS.pdf', label: 'parents' },
  { file: 'Planche CHAMBRE ENFANT.pdf',  label: 'enfant' },
  { file: 'Planche BANQUETTE.pdf',       label: 'cuisine-banquette' },
  { file: 'Planche CUISINE.pdf',         label: 'cuisine-cuisine' },
  { file: 'Planche VESTIAIRE.pdf',       label: 'entree' },
  { file: 'Planche BUREAU.pdf',          label: 'bureau' },
];

async function uploadFile(file, label) {
  const filePath = path.join(DOWNLOADS, file);
  if (!fs.existsSync(filePath)) {
    console.error(`  ✗ Not found: ${filePath}`);
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const blobName = `planches/${label}.pdf`;
  const blob = await put(blobName, buffer, { access: 'public', contentType: 'application/pdf', addRandomSuffix: false });
  console.log(`  ✓ ${file} → ${blob.url}`);
  return blob.url;
}

function generateSnippet(urls) {
  const u = urls;
  return `
// ====== Upload planches design — paste in browser console ======
(function() {
  // 1. Detect or create Toilettes room
  const customRooms = JSON.parse(localStorage.getItem('palette_custom_rooms_v1') || '[]');
  const toilettesRoom = customRooms.find(r =>
    r.label.toLowerCase().includes('toilette') || r.key.includes('toilette')
  );
  const toilettesKey = toilettesRoom ? toilettesRoom.key : (() => {
    const key = 'custom-toilettes';
    customRooms.push({
      key, label: 'Toilettes', dominant: 'creme', secondary: 'bois',
      line: 'Toilettes : base douce, nuances à ajuster.', notes: []
    });
    localStorage.setItem('palette_custom_rooms_v1', JSON.stringify(customRooms));
    const nuances = JSON.parse(localStorage.getItem('palette_room_nuances_v1') || '{}');
    nuances[key] = { dominant: 'moyen', secondary: 'moyen', accent: 'lin' };
    localStorage.setItem('palette_room_nuances_v1', JSON.stringify(nuances));
    return key;
  })();

  // 2. Extra plan images (append for all rooms, replace for cuisine)
  const extra = JSON.parse(localStorage.getItem('palette_plan_extra_images_v1') || '{}');
${u.toilettes ? `  extra[toilettesKey] = [...(extra[toilettesKey] || []), '${u.toilettes}'];` : `  // toilettes: not uploaded`}
${u.sdb ? `  extra.sdb = [...(extra.sdb || []), '${u.sdb}'];` : `  // sdb: not uploaded`}
${u.cellier ? `  extra.cellier = [...(extra.cellier || []), '${u.cellier}'];` : `  // cellier: not uploaded`}
${u.parents ? `  extra.parents = [...(extra.parents || []), '${u.parents}'];` : `  // parents: not uploaded`}
${u.enfant ? `  extra.enfant = [...(extra.enfant || []), '${u.enfant}'];` : `  // enfant: not uploaded`}
  // Cuisine: REPLACE with new planches
  extra.cuisine = [${[u['cuisine-banquette'], u['cuisine-cuisine']].filter(Boolean).map(x => `'${x}'`).join(', ')}];
${u.entree ? `  extra.entree = [...(extra.entree || []), '${u.entree}'];` : `  // entree: not uploaded`}
${u.bureau ? `  extra.bureau = [...(extra.bureau || []), '${u.bureau}'];` : `  // bureau: not uploaded`}
  localStorage.setItem('palette_plan_extra_images_v1', JSON.stringify(extra));

  // 3. Clear any cuisine planUploads overrides (from previous manual uploads)
  const plans = JSON.parse(localStorage.getItem('palette_plan_upload_images_v1') || '{}');
  Object.keys(plans).filter(k => k.startsWith('cuisine-plan-')).forEach(k => delete plans[k]);
  localStorage.setItem('palette_plan_upload_images_v1', JSON.stringify(plans));

  console.log('Planches uploaded. Reloading...');
  location.reload();
})();
// ====== END ======
`.trim();
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('BLOB_READ_WRITE_TOKEN not set. Run with: node --env-file=.env.local scripts/upload-planches.js');
    process.exit(1);
  }

  console.log('Uploading PDFs to Vercel Blob...\n');
  const urls = {};
  for (const { file, label } of FILES) {
    process.stdout.write(`${file}... `);
    process.stdout.write('\n');
    const url = await uploadFile(file, label);
    if (url) urls[label] = url;
  }

  console.log('\n\n===== BROWSER CONSOLE SNIPPET =====\n');
  console.log(generateSnippet(urls));
  console.log('\n===== END SNIPPET =====\n');
  console.log('Open the app in your browser, open DevTools (F12), paste the snippet in the Console tab, and press Enter.');
}

main().catch(err => { console.error(err); process.exit(1); });
