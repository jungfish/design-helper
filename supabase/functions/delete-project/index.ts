import { corsResponse, optionsResponse } from "../_shared/_cors.ts";
import { getUserFromRequest, supabaseAdmin } from "../_shared/_supabase.ts";
import { isGodUser } from "../_shared/_god.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse();
  if (req.method !== "POST") return corsResponse(405, { error: "Méthode non supportée." });

  const { user } = await getUserFromRequest(req);
  if (!user) return corsResponse(401, { error: "Authentification requise." });
  if (!isGodUser(user.id)) return corsResponse(403, { error: "Accès refusé." });

  const { projectId } = await req.json();
  if (!projectId) return corsResponse(400, { error: "projectId requis." });

  try {
    const { data: project, error: findError } = await supabaseAdmin
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .maybeSingle();
    if (findError) throw new Error(findError.message);
    if (!project) return corsResponse(404, { error: "Appartement introuvable." });

    const { error: deleteError } = await supabaseAdmin.from("projects").delete().eq("id", projectId);
    if (deleteError) throw new Error(deleteError.message);

    return corsResponse(200, { ok: true });
  } catch (err) {
    return corsResponse(500, { error: (err as Error).message || "Erreur lors de la suppression." });
  }
});
