/**
 * Client-side connector for the analysis API.
 *
 * This file intentionally contains NO API key. All Gemini calls go through the
 * `/api/analyze` serverless function, which holds the key server-side so it is
 * never shipped to the browser.
 */

const API_ENDPOINT = "/api/analyze";

/**
 * POST a prompt to the analysis endpoint.
 * @param {string} prompt
 * @param {boolean} json - request structured JSON output
 * @returns {Promise<{ text?: string, data?: any, error?: string }>}
 */
async function callApi(prompt, json) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, json }),
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    // Non-JSON response (e.g. an HTML error page).
  }

  if (!response.ok) {
    return { error: payload.error || `Request failed (HTTP ${response.status}).` };
  }
  return payload;
}

/**
 * General text generation. Always resolves to a string; failures are returned
 * as a message starting with "Error:" so callers can detect them.
 */
async function run(prompt) {
  try {
    const { text, error } = await callApi(prompt, false);
    if (error) return `Error: ${error}`;
    return text || "Error: No response received from AI.";
  } catch (err) {
    return `Error: ${err.message || "Could not reach the analysis server."}`;
  }
}

/**
 * Structured JSON generation. Resolves to the parsed value, or null on failure.
 */
async function runJson(prompt) {
  try {
    const { data, error } = await callApi(prompt, true);
    if (error || data == null) return null;
    return data;
  } catch {
    return null;
  }
}

export default run;
export { runJson };
