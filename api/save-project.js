import { put } from "@vercel/blob";
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

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    sendJson(res, 500, { error: "BLOB_READ_WRITE_TOKEN manquant." });
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
    await put(`projects/${projectId}.json`, JSON.stringify(state), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    sendJson(res, 200, { id: projectId });
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Erreur lors de la sauvegarde." });
  }
}
