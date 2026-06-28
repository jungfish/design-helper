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
  const { projectId, roomKey, listKey, items } = body;

  if (!projectId || !roomKey || !listKey || !Array.isArray(items)) {
    sendJson(res, 400, { error: "projectId, roomKey, listKey et items requis." });
    return;
  }

  if (!["todos", "shopping"].includes(listKey)) {
    sendJson(res, 400, { error: "listKey doit être 'todos' ou 'shopping'." });
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

    if (items.length > 0) {
      // Upsert tous les items (insert ou update)
      const rows = items.map((item, idx) => ({
        id: item.id,
        project_id: projectId,
        room_key: roomKey,
        list_key: listKey,
        text: item.text || "",
        done: item.done || false,
        url: item.url || null,
        image: item.image && item.image.startsWith("data:") ? null : (item.image || null),
        preview_title: item.previewTitle || null,
        position: idx,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabase
        .from("room_items")
        .upsert(rows, { onConflict: "id" });

      if (upsertError) throw new Error(upsertError.message);

      // Supprime les items qui ne sont plus dans la liste
      const { error: deleteError } = await supabase
        .from("room_items")
        .delete()
        .eq("project_id", projectId)
        .eq("room_key", roomKey)
        .eq("list_key", listKey)
        .not("id", "in", `(${items.map((i) => `'${i.id}'`).join(",")})`);

      if (deleteError) throw new Error(deleteError.message);
    } else {
      // Liste vide : supprime tout
      const { error: deleteError } = await supabase
        .from("room_items")
        .delete()
        .eq("project_id", projectId)
        .eq("room_key", roomKey)
        .eq("list_key", listKey);

      if (deleteError) throw new Error(deleteError.message);
    }

    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors de la sauvegarde." });
  }
}
