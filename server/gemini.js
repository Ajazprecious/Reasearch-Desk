import { GEMINI_MODEL } from "../src/lib/ai-model.js";

export { GEMINI_MODEL };

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export async function generateGeminiText({ system, prompt, temperature = 0.3, maxOutputTokens = 1200, json = false }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("Gemini is not configured. Set GEMINI_API_KEY on the API server and restart it."), {
      status: 503,
      code: "GEMINI_NOT_CONFIGURED",
    });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    if (error?.name === "TimeoutError" || error?.name === "AbortError") {
      throw new Error("Gemini did not respond within 45 seconds. Please try again.");
    }
    throw new Error("Could not reach the Gemini API. Check the API server's network connection and try again.");
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = typeof body?.error?.message === "string" ? body.error.message.replaceAll(apiKey, "[redacted]").slice(0, 240) : "";
    } catch {
      detail = "";
    }
    throw new Error(`Gemini API request failed (${response.status})${detail ? `: ${detail}` : "."}`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("Gemini returned an unreadable response.");
  }

  const text = body?.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini returned no text. Please try again.");
  return text;
}

export async function generateGeminiJson(options) {
  const text = await generateGeminiText({ ...options, json: true });
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid structured data. Please try again.");
  }
}
