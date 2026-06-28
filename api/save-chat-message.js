import { allowCors, sendJson, parseJsonBody } from "./_openai.js";
import { getUserFromRequest, supabaseWithToken } from "./_supabase.js";

const CHAT_HISTORY_MAX = 50;

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
  const { projectId, roomKey, message } = body;

  if (!projectId || !roomKey || !message?.id || !message?.role || !message?.content) {
    sendJson(res, 400, { error: "projectId, roomKey et message (id, role, content) requis." });
    return;
  }

  if (!["user", "assistant"].includes(message.role)) {
    sendJson(res, 400, { error: "role doit être 'user' ou 'assistant'." });
    return;
  }

  const supabase = supabaseWithToken(token);

  try {
    // Vérifie l'accès au projet via RLS
    const { data: member } = await supabase
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!member) {
      sendJson(res, 403, { error: "Accès refusé." });
      return;
    }

    // Upsert du message
    const { error: upsertError } = await supabase
      .from("chat_messages")
      .upsert({
        id: message.id,
        project_id: projectId,
        room_key: roomKey,
        role: message.role,
        content: message.content || "",
        image_prompt: message.imagePrompt || null,
        error: message.error || false,
      }, { onConflict: "id" });

    if (upsertError) throw new Error(upsertError.message);

    // Supprime les messages au-delà du maximum (garde les plus récents)
    const { data: oldest } = await supabase
      .from("chat_messages")
      .select("id, created_at")
      .eq("project_id", projectId)
      .eq("room_key", roomKey)
      .order("created_at", { ascending: true });

    if (oldest && oldest.length > CHAT_HISTORY_MAX) {
      const toDelete = oldest.slice(0, oldest.length - CHAT_HISTORY_MAX).map((m) => m.id);
      await supabase.from("chat_messages").delete().in("id", toDelete);
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors de la sauvegarde." });
  }
}
