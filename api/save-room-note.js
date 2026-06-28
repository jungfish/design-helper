import { allowCors, sendJson, parseJsonBody } from "./_openai.js";
import { getUserFromRequest, supabaseWithToken } from "./_supabase.js";

export default async function handler(req, res) {
  allowCors(res, req);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Méthode non supportée." });
    return;
  }

  const { user, token } = await getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentification requise." });
    return;
  }

  const body = await parseJsonBody(req);
  const { projectId, roomKey, content } = body;

  if (!projectId || !roomKey || typeof content !== "string") {
    sendJson(res, 400, { error: "projectId, roomKey et content requis." });
    return;
  }

  const supabase = supabaseWithToken(token);

  try {
    const { error } = await supabase
      .from("room_notes")
      .upsert(
        { project_id: projectId, room_key: roomKey, content, updated_at: new Date().toISOString() },
        { onConflict: "project_id,room_key" }
      );

    if (error) throw new Error(error.message);

    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors de la sauvegarde." });
  }
}
