import { allowCors, sendJson } from "./_openai.js";

export default async function handler(req, res) {
  allowCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Méthode non supportée." });
    return;
  }

  const id = req.query?.id || new URL(req.url || "/", "http://localhost").searchParams.get("id");

  if (!id || !/^[a-z0-9]{6,16}$/.test(id)) {
    sendJson(res, 400, { error: "ID invalide." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    sendJson(res, 500, { error: "Configuration Supabase manquante." });
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(id)}&select=state`,
      {
        headers: {
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    if (!response.ok) {
      sendJson(res, 404, { error: "Projet introuvable." });
      return;
    }

    const rows = await response.json();
    if (!rows.length) {
      sendJson(res, 404, { error: "Projet introuvable." });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    sendJson(res, 200, { state: rows[0].state });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors du chargement." });
  }
}
