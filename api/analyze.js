import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

/**
 * Serverless analysis endpoint.
 *
 * The Gemini API key lives ONLY in this server-side function (process.env),
 * so it is never shipped to the browser. The client posts a prompt here and
 * receives the generated result.
 */

const apiKey = process.env.GEMINI_API_KEY;

// Allow up to 60s: the model cascade may try several models on a slow request.
// (Vercel's default is 10s, which the fallback chain can exceed.)
export const config = { maxDuration: 60 };

/**
 * Same-origin guard. Legitimate browser requests carry an `Origin` (or
 * `Referer`) header whose host matches the request's own host. Bots and
 * scripts that POST directly to the endpoint typically send neither, so this
 * filters out most casual abuse without breaking real users.
 */
function isSameOrigin(req) {
  const host = req.headers.host;
  if (!host) return false;
  const source = req.headers.origin || req.headers.referer;
  if (!source) return false;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}

// Reject prompts larger than this (characters) before spending a model call.
const MAX_PROMPT_CHARS = 200_000;

/**
 * Ordered list of free-tier models to try, best first.
 * The cascade falls through to the next model on a quota/rate-limit error.
 */
const FREE_MODELS = [
  { id: "gemini-2.5-flash", supportsJson: true },
  { id: "gemini-2.0-flash", supportsJson: true },
  { id: "gemini-2.0-flash-lite", supportsJson: true },
  { id: "gemma-3-27b-it", supportsJson: false },
  { id: "gemma-3-12b-it", supportsJson: false },
  { id: "gemma-3-4b-it", supportsJson: false },
  { id: "gemma-3-1b-it", supportsJson: false },
];

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * A retriable error is one where falling through to the next model (or simply
 * trying again) is worthwhile: rate limits, model-not-found, transient server
 * overload, and network blips. Anything else is a real failure.
 */
function isRetriableError(error) {
  const msg = (error?.message || "").toLowerCase();
  return [
    "429", "quota", "rate limit",          // rate limited
    "404", "not found",                    // model unavailable
    "500", "503", "service unavailable",   // transient server errors
    "overloaded", "high demand",           // model temporarily saturated
    "fetch failed", "econnreset", "etimedout", "network", // network blips
  ].some((needle) => msg.includes(needle));
}

/** Extract a JSON substring from a text response (for models without JSON mode). */
function extractJson(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const objStart = cleaned.indexOf("{");
  const objEnd = cleaned.lastIndexOf("}") + 1;
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]") + 1;

  // Prefer whichever structure appears first in the response.
  if (arrStart !== -1 && (objStart === -1 || arrStart < objStart) && arrEnd > arrStart) {
    return cleaned.slice(arrStart, arrEnd);
  }
  if (objStart !== -1 && objEnd > objStart) {
    return cleaned.slice(objStart, objEnd);
  }
  return cleaned;
}

/** Plain-text generation, cascading through the free models. */
async function generateText(genAI, prompt) {
  for (const modelInfo of FREE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelInfo.id });
      const chat = model.startChat({
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain",
        },
        safetySettings,
        history: [],
      });

      const result = await chat.sendMessage(prompt);
      const text = result.response.text();
      if (!text) throw new Error("Empty response");
      return text;
    } catch (error) {
      console.warn(`[analyze] text model ${modelInfo.id} failed:`, error.message);
      if (isRetriableError(error)) continue;
      throw error;
    }
  }
  throw new Error("All free-tier models are currently exhausted. Please try again later.");
}

/** Structured JSON generation, cascading through the free models. */
async function generateJson(genAI, prompt) {
  for (const modelInfo of FREE_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelInfo.id });

      const generationConfig = {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      };
      if (modelInfo.supportsJson) {
        generationConfig.responseMimeType = "application/json";
      }

      const chat = model.startChat({ generationConfig, safetySettings, history: [] });

      const finalPrompt = modelInfo.supportsJson
        ? prompt
        : prompt + "\n\nIMPORTANT: Return ONLY the raw JSON. No markdown, no explanation, no code blocks.";

      const result = await chat.sendMessage(finalPrompt);
      const text = result.response.text();

      return JSON.parse(modelInfo.supportsJson ? text : extractJson(text));
    } catch (error) {
      console.warn(`[analyze] json model ${modelInfo.id} failed:`, error.message);
      if (isRetriableError(error)) continue;
      throw error;
    }
  }
  throw new Error("All free-tier models are currently exhausted. Please try again later.");
}

export default async function handler(req, res) {
  // Prevent any caching/sharing of analysis responses.
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  if (!isSameOrigin(req)) {
    return res.status(403).json({ error: "Forbidden." });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Server is not configured: GEMINI_API_KEY is missing.",
    });
  }

  // Vercel usually parses JSON bodies automatically; fall back to manual parse.
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Request body is not valid JSON." });
    }
  }

  const prompt = body?.prompt;
  const wantJson = Boolean(body?.json);

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "Missing or empty 'prompt'." });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(413).json({ error: "Prompt is too large to analyze." });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    if (wantJson) {
      const data = await generateJson(genAI, prompt);
      return res.status(200).json({ data });
    }
    const text = await generateText(genAI, prompt);
    return res.status(200).json({ text });
  } catch (error) {
    console.error("[analyze] request failed:", error);
    return res.status(502).json({ error: error.message || "AI request failed." });
  }
}
