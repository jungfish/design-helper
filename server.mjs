import { createServer } from "node:http";

const PORT = Number(process.env.API_PORT || 5175);
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const ANALYSIS_MODEL = process.env.OPENAI_ANALYSIS_MODEL || "gpt-4.1-mini";
const MAX_BODY_BYTES = 30 * 1024 * 1024;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(payload));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Image trop lourde pour cette requête locale."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        reject(new Error("JSON invalide."));
      }
    });
    req.on("error", reject);
  });
}

function dataUrlToBlob(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Image invalide: data URL attendue.");
  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mimeType });
}

createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method !== "POST" || !["/api/generate-image", "/api/analyze-image"].includes(req.url)) {
    sendJson(res, 404, { error: "Route inconnue." });
    return;
  }

  try {
    if (!process.env.OPENAI_API_KEY) {
      sendJson(res, 500, { error: "OPENAI_API_KEY est manquante dans le serveur local." });
      return;
    }

    const { image, prompt, context } = await readJson(req);
    if (req.url === "/api/analyze-image") {
      if (!image) {
        sendJson(res, 400, { error: "Image requise." });
        return;
      }

      const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: ANALYSIS_MODEL,
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: [
                    "Analyse cette image pour nourrir un prompt de génération d'image d'intérieur.",
                    `Contexte: ${context || "image d'inspiration appartement"}.`,
                    "Réponds en français, en 2 phrases maximum.",
                    "Mentionne le style, les couleurs, les matières, les objets forts et l'ambiance. N'invente pas de marque.",
                  ].join("\n"),
                },
                { type: "input_image", image_url: image },
              ],
            },
          ],
        }),
      });

      const payload = await openaiResponse.json();
      if (!openaiResponse.ok) {
        sendJson(res, openaiResponse.status, { error: payload.error?.message || "L'analyse OpenAI a échoué." });
        return;
      }

      sendJson(res, 200, { analysis: payload.output_text || "" });
      return;
    }

    if (!image || !prompt) {
      sendJson(res, 400, { error: "Image et prompt sont requis." });
      return;
    }

    const blob = dataUrlToBlob(image);
    const form = new FormData();
    form.append("model", MODEL);
    form.append("prompt", prompt);
    form.append("size", "1024x1024");
    form.append("quality", "medium");
    form.append("image", blob, `source.${blob.type.split("/")[1] || "png"}`);

    const openaiResponse = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: form,
    });

    const payload = await openaiResponse.json();
    if (!openaiResponse.ok) {
      sendJson(res, openaiResponse.status, { error: payload.error?.message || "La génération OpenAI a échoué." });
      return;
    }

    const imageData = payload.data?.[0];
    if (imageData?.b64_json) {
      sendJson(res, 200, { image: `data:image/png;base64,${imageData.b64_json}` });
      return;
    }

    if (imageData?.url) {
      sendJson(res, 200, { image: imageData.url });
      return;
    }

    sendJson(res, 500, { error: "Réponse OpenAI sans image exploitable." });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Erreur serveur locale." });
  }
}).listen(PORT, "127.0.0.1", () => {
  console.log(`Design Helper API ready on http://127.0.0.1:${PORT}`);
});
