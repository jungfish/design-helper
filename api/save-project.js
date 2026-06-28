import { allowCors, sendJson, parseJsonBody } from "./_openai.js";

export const config = {
  api: { bodyParser: { sizeLimit: "2mb" } },
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Méthode non supportée." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(res, 500, { error: "Configuration Supabase manquante." });
    return;
  }

  const body = await parseJsonBody(req);
  const { state, id } = body;

  if (!state) {
    sendJson(res, 400, { error: "state requis." });
    return;
  }

  const projectId = id || generateId();

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
      },
      body: JSON.stringify({ id: projectId, state, updated_at: new Date().toISOString() }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(err);
    }

    sendJson(res, 200, { id: projectId });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors de la sauvegarde." });
  }
}
