// Optional advisory forecasting endpoint for FieldShift NG.
// The deterministic agronomy engine remains authoritative. When FORECAST_WORKER_URL
// is configured, this proxies to a Lag-Llama-compatible worker; otherwise it returns
// a transparent seasonal-naive baseline so the app never depends on the model.
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const finiteSeries = (v) => Array.isArray(v) && v.length >= 6 && v.length <= 2000 && v.every(n => Number.isFinite(Number(n)));

function seasonalNaive(values, horizon) {
  const xs = values.map(Number);
  const season = xs.length >= 12 ? 12 : Math.max(1, Math.floor(xs.length / 2));
  const recent = xs.slice(-season);
  const residuals = [];
  for (let i = season; i < xs.length; i++) residuals.push(xs[i] - xs[i - season]);
  const mean = residuals.length ? residuals.reduce((a, b) => a + b, 0) / residuals.length : 0;
  const variance = residuals.length > 1
    ? residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / (residuals.length - 1)
    : 0;
  const spread = Math.max(1, Math.sqrt(variance) * 1.96);
  return recent.slice(0, horizon).map((value, i) => {
    const point = Math.max(0, value + mean);
    return { period: i + 1, point: Number(point.toFixed(1)), low: Number(Math.max(0, point - spread).toFixed(1)), high: Number((point + spread).toFixed(1)) };
  });
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(req.method === "GET" ? 200 : 405).json({ ready: true, method: "POST" });
  const body = req.body || {};
  const values = body.values;
  const horizon = clamp(Number(body.horizon) || 3, 1, 12);
  if (!finiteSeries(values)) return res.status(400).json({ error: "Send at least six numeric observations." });
  if (JSON.stringify(body).length > 12000) return res.status(400).json({ error: "Forecast input is too large." });

  if (process.env.FORECAST_WORKER_URL) {
    try {
      const upstream = await fetch(process.env.FORECAST_WORKER_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: values.map(Number), horizon, frequency: body.frequency || "monthly", target: body.target || "rainfall" }),
      });
      if (upstream.ok) {
        const result = await upstream.json();
        if (Array.isArray(result.forecast) && result.forecast.length) {
          return res.status(200).json({ ...result, model: result.model || "lag-llama", advisoryOnly: true, fallback: false });
        }
      }
    } catch (_) { /* use the local fallback */ }
  }

  return res.status(200).json({
    model: "seasonal-naive",
    forecast: seasonalNaive(values, horizon),
    advisoryOnly: true,
    fallback: true,
    note: "Experimental forecast only. Deterministic FieldShift rules remain authoritative.",
  });
};
