import { allowCors, sendJson } from "./_openai.js";
import { getUserFromRequest, supabaseWithToken } from "./_supabase.js";

export default async function handler(req, res) {
  allowCors(res, req);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Méthode non supportée." });
    return;
  }

  const { user, token } = await getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentification requise." });
    return;
  }

  const projectId = req.query?.projectId || new URL(req.url || "/", "http://localhost").searchParams.get("projectId");

  if (!projectId) {
    sendJson(res, 400, { error: "projectId requis." });
    return;
  }

  try {
    const supabase = supabaseWithToken(token);

    const { data, error } = await supabase
      .from("room_items")
      .select("id, room_key, list_key, text, done, url, image, preview_title, position")
      .eq("project_id", projectId)
      .order("position");

    if (error) throw new Error(error.message);

    res.setHeader("Cache-Control", "no-store");
    sendJson(res, 200, { items: data || [] });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors du chargement." });
  }
}
