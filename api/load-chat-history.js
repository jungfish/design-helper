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

  const params = new URL(req.url || "/", "http://localhost").searchParams;
  const projectId = req.query?.projectId || params.get("projectId");
  const roomKey = req.query?.roomKey || params.get("roomKey");

  if (!projectId || !roomKey) {
    sendJson(res, 400, { error: "projectId et roomKey requis." });
    return;
  }

  try {
    const supabase = supabaseWithToken(token);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content, image_prompt, error, created_at")
      .eq("project_id", projectId)
      .eq("room_key", roomKey)
      .order("created_at", { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);

    const messages = (data || []).map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      imagePrompt: m.image_prompt || undefined,
      error: m.error || undefined,
    }));

    res.setHeader("Cache-Control", "no-store");
    sendJson(res, 200, { messages });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors du chargement." });
  }
}
