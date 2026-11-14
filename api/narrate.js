// Vercel serverless function. The rule engine decides; Gemma 4 (via the Google AI Studio / Gemini API)
// only restates the engine's output in plain words. Set GEMINI_API_KEY in Vercel (never in client code).
// Optional MODEL: gemma-4-26b-a4b-it (default, faster) or gemma-4-31b-it (larger).
const INSTR =
  "You explain crop-rotation results to smallholder farmers in northern Nigeria. Use ONLY the facts in the JSON below. " +
  "Do not add agronomic claims, numbers or advice that are not in it. Mention rule IDs in brackets. " +
  "State the information gaps. End by saying a farmer or agronomist must confirm before acting. Use short, plain sentences.";

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(503).json({ error: "narration not configured" });
  const { lang = "en", baseline, options } = req.body || {};
  if (!baseline || !Array.isArray(options) || JSON.stringify(req.body).length > 8000)
    return res.status(400).json({ error: "bad request" });
  // Instructions go in the user turn: Gemma models may not accept a separate system instruction.
  const prompt = `${INSTR}\nWrite in ${lang === "ha" ? "Hausa" : "English"}.\n\nRESULT JSON:\n${JSON.stringify({ baseline, options })}`;
  const model = process.env.MODEL || "gemma-4-26b-a4b-it";
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: "upstream error" });
    const j = await r.json();
    const parts = j.candidates?.[0]?.content?.parts || [];
    const text = parts.filter(p => !p.thought).map(p => p.text || "").join("").trim();   // skip thinking parts
    if (!text) return res.status(502).json({ error: "empty response" });
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(502).json({ error: "upstream unreachable" });
  }
};
