import { GEMINI_MODEL, GEMINI_FALLBACK_MODEL } from "../src/lib/ai-model.js";

export { GEMINI_MODEL, GEMINI_FALLBACK_MODEL };

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function isGeminiTransientError(error) {
  return ["GEMINI_OVERLOADED","GEMINI_RATE_LIMITED","GEMINI_MODEL_UNAVAILABLE","GEMINI_TIMEOUT","GEMINI_ALL_MODELS_UNAVAILABLE"].includes(error?.code);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const jitteredDelay = (attempt) => Math.round(Math.min(8000, 1000 * (2 ** attempt)) * (0.75 + Math.random() * 0.5));

async function requestModel({ model, apiKey, system, prompt, temperature, maxOutputTokens, json, attempts }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
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
      const timedOut = error?.name === "TimeoutError" || error?.name === "AbortError";
      lastError = Object.assign(new Error(timedOut
        ? `Gemini model ${model} did not respond within 45 seconds.`
        : "Could not reach the Gemini API. Check the API server's network connection and try again."), {
        status: 503, code: "GEMINI_TIMEOUT",
      });
      if (attempt + 1 < attempts) { await sleep(jitteredDelay(attempt)); continue; }
      throw lastError;
    }

    if (response.ok) {
      let body;
      try { body = await response.json(); }
      catch { throw new Error("Gemini returned an unreadable response."); }
      const text = body?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
      if (!text) throw new Error("Gemini returned no text. Please try again.");
      return { text, model };
    }

    let detail = "";
    try {
      const body = await response.json();
      detail = typeof body?.error?.message === "string"
        ? body.error.message.replaceAll(apiKey, "[redacted]").slice(0, 240) : "";
    } catch { /* The status code is sufficient when the body is not JSON. */ }

    const retryable = [404, 429, 500, 502, 503, 504].includes(response.status);
    const code = response.status === 404 ? "GEMINI_MODEL_UNAVAILABLE"
      : response.status === 429 ? "GEMINI_RATE_LIMITED"
      : [500, 502, 503, 504].includes(response.status) ? "GEMINI_OVERLOADED"
      : "GEMINI_REQUEST_FAILED";
    lastError = Object.assign(new Error(`Gemini API request failed (${response.status})${detail ? `: ${detail}` : "."}`), {
      status: response.status, code,
    });
    if (retryable && attempt + 1 < attempts) { await sleep(jitteredDelay(attempt)); continue; }
    throw lastError;
  }
  throw lastError || new Error("Gemini request failed.");
}

export async function generateGeminiTextWithModel({
  system, prompt, temperature = 0.3, maxOutputTokens = 1200, json = false,
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error("Gemini is not configured. Set GEMINI_API_KEY on the API server and restart it."), {
      status: 503, code: "GEMINI_NOT_CONFIGURED",
    });
  }

  try {
    return await requestModel({
      model: GEMINI_MODEL, apiKey, system, prompt, temperature, maxOutputTokens, json, attempts: 3,
    });
  } catch (primaryError) {
    if (!isGeminiTransientError(primaryError) || !GEMINI_FALLBACK_MODEL || GEMINI_FALLBACK_MODEL === GEMINI_MODEL) {
      throw primaryError;
    }
    try {
      return await requestModel({
        model: GEMINI_FALLBACK_MODEL, apiKey, system, prompt, temperature, maxOutputTokens, json, attempts: 2,
      });
    } catch (fallbackError) {
      throw Object.assign(new Error(
        `Gemini is temporarily unavailable on both configured models. Primary: ${primaryError.message} Fallback: ${fallbackError.message}`
      ), { status: 503, code: "GEMINI_ALL_MODELS_UNAVAILABLE", cause: fallbackError });
    }
  }
}

export async function generateGeminiText(options) {
  const result = await generateGeminiTextWithModel(options);
  return result.text;
}

export async function generateGeminiJsonWithModel(options) {
  const result = await generateGeminiTextWithModel({ ...options, json: true });
  try { return { data: JSON.parse(result.text), model: result.model }; }
  catch { throw new Error("Gemini returned invalid structured data. Please try again."); }
}

export async function generateGeminiJson(options) {
  const result = await generateGeminiJsonWithModel(options);
  return result.data;
}
