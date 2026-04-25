const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const ANALYSIS_MODEL = process.env.OPENAI_ANALYSIS_MODEL || "gpt-4.1-mini";

function dataUrlToBlob(dataUrl) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) throw new Error("Image invalide: data URL attendue.");
  const [, mimeType, base64] = match;
  const bytes = Buffer.from(base64, "base64");
  return new Blob([bytes], { type: mimeType });
}

export function allowCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export function sendJson(res, status, payload) {
  allowCors(res);
  res.status(status).json(payload);
}

export async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
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

export async function analyzeImage({ image, context }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY est manquante dans Vercel.");
    error.status = 500;
    throw error;
  }

  if (!image) {
    const error = new Error("Image requise.");
    error.status = 400;
    throw error;
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
    const error = new Error(payload.error?.message || "L'analyse OpenAI a échoué.");
    error.status = openaiResponse.status;
    throw error;
  }

  return payload.output_text || "";
}

export async function generateImage({ image, prompt }) {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("OPENAI_API_KEY est manquante dans Vercel.");
    error.status = 500;
    throw error;
  }

  if (!image || !prompt) {
    const error = new Error("Image et prompt sont requis.");
    error.status = 400;
    throw error;
  }

  const blob = dataUrlToBlob(image);
  const form = new FormData();
  form.append("model", IMAGE_MODEL);
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
    const error = new Error(payload.error?.message || "La génération OpenAI a échoué.");
    error.status = openaiResponse.status;
    throw error;
  }

  const imageData = payload.data?.[0];
  if (imageData?.b64_json) return `data:image/png;base64,${imageData.b64_json}`;
  if (imageData?.url) return imageData.url;

  const error = new Error("Réponse OpenAI sans image exploitable.");
  error.status = 500;
  throw error;
}
