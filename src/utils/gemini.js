import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Ordered list of free-tier models to try.
 * The system will cascade through these if one hits a quota/rate limit.
 * Models are ordered by capability (best first).
 */
const FREE_MODELS = [
  { id: "gemini-2.5-flash",    supportsJson: true  },
  { id: "gemini-2.0-flash",    supportsJson: true  },
  { id: "gemini-2.0-flash-lite", supportsJson: true },
  { id: "gemma-3-27b-it",      supportsJson: false },
  { id: "gemma-3-12b-it",      supportsJson: false },
  { id: "gemma-3-4b-it",       supportsJson: false },
  { id: "gemma-3-1b-it",       supportsJson: false },
];

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

/**
 * Check if an error is a retriable quota/rate-limit or model-not-found error.
 */
function isRetriableError(error) {
  const msg = error.message || "";
  return msg.includes("429") || msg.includes("quota") || msg.includes("404") || msg.includes("not found");
}

/**
 * Extract JSON from a text response (fallback for models that don't support JSON mode).
 */
function extractJson(text) {
  try {
    const cleaned = text.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}") + 1;
    if (start !== -1 && end > start) {
      return cleaned.slice(start, end);
    }
    // Try array format
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]") + 1;
    if (arrStart !== -1 && arrEnd > arrStart) {
      return cleaned.slice(arrStart, arrEnd);
    }
    return cleaned;
  } catch {
    return text;
  }
}

/**
 * General text generation — cascades through free models on quota errors.
 */
async function run(prompt) {
  if (!apiKey) {
    return "Error: Gemini API Key is missing. Set VITE_GOOGLE_API_KEY in your .env file.";
  }

  for (const modelInfo of FREE_MODELS) {
    try {
      console.log(`[CodePulse] Trying model: ${modelInfo.id}`);
      const model = genAI.getGenerativeModel({ model: modelInfo.id });

      const chatSession = model.startChat({
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

      const result = await chatSession.sendMessage(prompt);
      const text = result.response.text();
      if (!text) throw new Error("Empty response");

      console.log(`[CodePulse] Success with model: ${modelInfo.id}`);
      return text;

    } catch (error) {
      console.warn(`[CodePulse] Model ${modelInfo.id} failed:`, error.message);
      if (isRetriableError(error)) {
        continue; // Try next model
      }
      return `Error during API call: ${error.message}`;
    }
  }

  return "Error: All free-tier models have been exhausted. Please wait for quota to reset or generate a new API key at https://aistudio.google.com/app/apikey";
}

/**
 * Structured JSON generation — cascades through free models.
 * Uses native JSON mode for Gemini models, falls back to text+extraction for Gemma.
 */
async function runJson(prompt) {
  if (!apiKey) return null;

  for (const modelInfo of FREE_MODELS) {
    try {
      console.log(`[CodePulse JSON] Trying model: ${modelInfo.id}`);
      const model = genAI.getGenerativeModel({ model: modelInfo.id });

      const generationConfig = {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
      };

      // Use native JSON mode for models that support it
      if (modelInfo.supportsJson) {
        generationConfig.responseMimeType = "application/json";
      }

      const chatSession = model.startChat({
        generationConfig,
        safetySettings,
        history: [],
      });

      // For models without JSON mode, add extra instruction
      const finalPrompt = modelInfo.supportsJson
        ? prompt
        : prompt + "\n\nIMPORTANT: Return ONLY the raw JSON object. No markdown, no explanation, no code blocks.";

      const result = await chatSession.sendMessage(finalPrompt);
      const text = result.response.text();

      if (modelInfo.supportsJson) {
        const parsed = JSON.parse(text);
        console.log(`[CodePulse JSON] Success with model: ${modelInfo.id}`);
        return parsed;
      } else {
        const jsonStr = extractJson(text);
        const parsed = JSON.parse(jsonStr);
        console.log(`[CodePulse JSON] Success with model: ${modelInfo.id} (text extraction)`);
        return parsed;
      }

    } catch (error) {
      console.warn(`[CodePulse JSON] Model ${modelInfo.id} failed:`, error.message);
      if (isRetriableError(error)) {
        continue; // Try next model
      }
      return null;
    }
  }

  return null;
}

export default run;
export { runJson };
