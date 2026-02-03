// ====== CONFIG (edit these) ======
let AI_KEY;
const AI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
// =================================

// Load API key immediately and wait for it
let keyLoadPromise = fetch("./api_key.json")
  .then((response) => response.json())
  .then((api_key) => {
    AI_KEY = api_key.GEMINI_API_KEY;
    console.log("Gemini API key loaded successfully");
    return AI_KEY;
  })
  .catch((err) => {
    console.error("Error loading API key:", err);
    throw err;
  });

console.log("AI Worker background loaded");

async function postJSON(url, body, headers = {}) {
  console.log("About to fetch:", url);
  
  // Add API key to URL for Gemini
  const urlWithKey = `${url}?key=${AI_KEY}`;
  
  const res = await fetch(urlWithKey, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  
  const text = await res.text().catch(() => "");
  
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text);
      if (j?.error?.message) msg += `: ${j.error.message}`;
    } catch {}
    throw new Error(msg);
  }
  
  return text ? JSON.parse(text) : {};
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    console.log("Received message:", msg);
    if (msg?.type !== "AI_EXPLAIN") return;

    // Wait for key to load before proceeding
    try {
      await keyLoadPromise;
    } catch (err) {
      sendResponse({ ok: false, error: "Failed to load API key. Check console." });
      return;
    }

    if (!AI_KEY) {
      sendResponse({ ok: false, error: "API key not loaded. Please check api_key.json file exists." });
      return;
    }

    const it = msg.item || {};
    
    // Construct the prompt for Gemini
    const prompt = `You are a senior accessibility engineer. Explain how to fix this accessibility issue.
Return a short markdown list (3-4 bullets) with concrete steps. Keep it concise and actionable.

Issue Details:
Type: ${it.type || "Unknown"}
Severity: ${it.severity || "Unknown"}
Message: ${it.message || "No message"}
Code Snippet: ${(it.snippet || "").slice(0, 300)}
Fix Hint: ${(it.tip || "").slice(0, 240)}

Write only the markdown bullet list with actionable fixes.`;

    try {
      const data = await postJSON(
        AI_ENDPOINT,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 900,
          }
        },
        {}
      );

      // Check if response was filtered
      if (data.promptFeedback?.blockReason) {
        console.warn("Response blocked:", data.promptFeedback.blockReason);
        sendResponse({
          ok: false,
          error: `Content filtered: ${data.promptFeedback.blockReason}`
        });
        return;
      }

      // Extract text from Gemini's response format
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      if (!text) {
        throw new Error("No response from AI");
      }

      sendResponse({
        ok: true,
        details: text.trim(),
      });
    } catch (e) {
      console.error("AI request error:", e);
      sendResponse({ ok: false, error: `AI request failed: ${e.message}` });
    }
  })();
  return true; // Keep channel open for async response
});