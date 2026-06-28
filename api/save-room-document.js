import { allowCors, sendJson, parseJsonBody } from "./_openai.js";
import { getUserFromRequest, supabaseWithToken } from "./_supabase.js";

export default async function handler(req, res) {
  allowCors(res, req);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const { user, token } = await getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentification requise." });
    return;
  }

  const supabase = supabaseWithToken(token);

  if (req.method === "POST") {
    const body = await parseJsonBody(req);
    const { projectId, roomKey, document: doc } = body;

    if (!projectId || !roomKey || !doc?.id || !doc?.url || !doc?.name) {
      sendJson(res, 400, { error: "projectId, roomKey et document (id, url, name) requis." });
      return;
    }

    try {
      const { error } = await supabase
        .from("room_documents")
        .upsert({
          id: doc.id,
          project_id: projectId,
          room_key: roomKey,
          name: doc.name,
          url: doc.url,
          type: doc.type || null,
          size: doc.size || null,
          uploaded_at: doc.uploadedAt || new Date().toISOString(),
        }, { onConflict: "id" });

      if (error) throw new Error(error.message);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message || "Erreur lors de la sauvegarde." });
    }
    return;
  }

  if (req.method === "DELETE") {
    const body = await parseJsonBody(req);
    const { projectId, documentId } = body;

    if (!projectId || !documentId) {
      sendJson(res, 400, { error: "projectId et documentId requis." });
      return;
    }

    try {
      const { error } = await supabase
        .from("room_documents")
        .delete()
        .eq("id", documentId)
        .eq("project_id", projectId);

      if (error) throw new Error(error.message);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      sendJson(res, 500, { error: err.message || "Erreur lors de la suppression." });
    }
    return;
  }

  sendJson(res, 405, { error: "Méthode non supportée." });
}
