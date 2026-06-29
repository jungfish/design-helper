import { allowCors, sendJson, parseJsonBody } from "./_openai.js";
import { getUserFromRequest, supabaseAdmin, writeChangeLog } from "./_supabase.js";

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

  const { user } = await getUserFromRequest(req);
  if (!user) {
    sendJson(res, 401, { error: "Authentification requise." });
    return;
  }

  const { projectId, userId } = await parseJsonBody(req);

  if (!projectId || !userId) {
    sendJson(res, 400, { error: "projectId et userId sont requis." });
    return;
  }

  // On ne peut pas se supprimer soi-même
  if (userId === user.id) {
    sendJson(res, 400, { error: "Vous ne pouvez pas vous supprimer vous-même." });
    return;
  }

  try {
    // Vérifier que l'appelant est owner du projet
    const { data: callerMembership, error: callerError } = await supabaseAdmin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (callerError) throw new Error(callerError.message);
    if (!callerMembership || callerMembership.role !== "owner") {
      sendJson(res, 403, { error: "Seul l'owner peut supprimer des membres." });
      return;
    }

    // Vérifier que la cible est bien membre
    const { data: targetMembership, error: targetError } = await supabaseAdmin
      .from("project_members")
      .select("role")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .maybeSingle();

    if (targetError) throw new Error(targetError.message);
    if (!targetMembership) {
      sendJson(res, 404, { error: "Ce membre n'existe pas dans ce projet." });
      return;
    }

    // Empêcher la suppression d'un autre owner
    if (targetMembership.role === "owner") {
      sendJson(res, 400, { error: "Impossible de supprimer un owner." });
      return;
    }

    // Supprimer le membre
    const { error: deleteError } = await supabaseAdmin
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);

    if (deleteError) throw new Error(deleteError.message);

    await writeChangeLog(projectId, user.id, "remove_member", { removed_user_id: userId });

    sendJson(res, 200, { success: true });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors de la suppression." });
  }
}
