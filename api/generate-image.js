import { allowCors, generateImage, parseJsonBody, sendJson } from "./_openai.js";

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
    const image = await generateImage(body);
    sendJson(res, 200, { image });
  } catch (error) {
    sendJson(res, error.status || 500, { error: error.message || "Erreur serveur." });
  }
}
