import { allowCors, analyzeImage, parseJsonBody, sendJson } from "./_openai.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    allowCors(res);
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Méthode non autorisée." });
    return;
  }

  try {
    const body = await parseJsonBody(req);
    const analysis = await analyzeImage(body);
    sendJson(res, 200, { analysis });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Erreur serveur." });
  }
}
