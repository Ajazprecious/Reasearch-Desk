import { GEMINI_MODEL } from "../src/lib/ai-model.js";

export { GEMINI_MODEL };

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function isGeminiTransientError(error) {
  return error?.code === "GEMINI_OVERLOADED" ||
    error?.code === "GEMINI_RATE_LIMITED" ||
    error?.code === "GEMINI_TIMEOUT";
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
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
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw Object.assign(new Error("Gemini did not respond within 45 seconds. Please try again."), {
          status: 503,
          code: "GEMINI_TIMEOUT",
        });
      }
      throw Object.assign(new Error("Could not reach the Gemini API. Check the API server's network connection and try again."), {
        status: 503,
        code: "GEMINI_TIMEOUT",
      });
    }

    if (response.ok) break;

    let detail = "";
    try {
      const body = await response.json();
      detail = typeof body?.error?.message === "string" ? body.error.message.replaceAll(apiKey, "[redacted]").slice(0, 240) : "";
    } catch {
      detail = "";
    }
    if ([429, 503].includes(response.status) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    const transient = response.status === 503;
    throw Object.assign(new Error(`Gemini API request failed (${response.status})${detail ? `: ${detail}` : "."}`), {
      status: response.status,
      code: transient ? "GEMINI_OVERLOADED" : response.status === 429 ? "GEMINI_RATE_LIMITED" : "GEMINI_REQUEST_FAILED",
    });
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
