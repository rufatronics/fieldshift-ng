# FieldShift NG

Offline-capable farm decision support for northern Nigeria. **Rules and the scoring engine decide. AI and forecasting explain or provide advisory signals only.** No model may override crop gates, scores, safety rules, or the farmer's inputs.

## What is included

FieldShift guides a farmer through zone, flooding, irrigation, storage, previous crops, and market preferences. It calculates a three-season rotation using deterministic agronomic rules, shows safe alternatives, works offline, and offers optional AI explanation and Q&A.

The app now also includes an **experimental rainfall forecast card**. It forecasts the next three periods from the current zone's monthly rainfall series. The forecast is deliberately separate from the rotation engine: it does not modify crop scores, gates, warnings, or recommendations.

## Forecast architecture

The browser calls `POST /api/forecast`. The Vercel function accepts a numeric series and returns point, low, and high values. When `FORECAST_WORKER_URL` is not configured, the endpoint uses a transparent seasonal-naive fallback. This keeps the app usable during the hackathon and when the model is offline.

For an optional Lag-Llama deployment, run the Python worker in `forecast/lag_llama_worker.py` and set `FORECAST_WORKER_URL` in Vercel to its private HTTPS URL. The worker is not bundled into the browser or exposed to farmers directly. The API proxies only the series, horizon, frequency, and target, then adds `advisoryOnly: true` to the response.

The worker is an experiment, not a validated northern-Nigeria weather model. Before using it for real decisions, run rolling-origin tests against seasonal-naive and persistence baselines, check interval calibration, test missing and sparse data, and have an agronomist review the display. The current crop parameters remain marked `PLACEHOLDER = true` in `public/data.js`.

### Run the optional worker

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r forecast/requirements.txt
# Download and approve a Lag-Llama checkpoint according to its official repository.
export LAG_LLAMA_CHECKPOINT=/path/to/lag-llama.ckpt
uvicorn forecast.lag_llama_worker:app --host 0.0.0.0 --port 8000
```

The worker's `/` endpoint is a health check. Keep it behind authentication or a private network in production. Do not put model or service credentials in frontend code.

## Local development and tests

The project is a static HTML/CSS/JavaScript app with Vercel serverless functions and Node 22.

```bash
npm run build
node --check api/narrate.js
node --check api/forecast.js
node --check tools/build-data.mjs
git diff --check
```

To test the fallback locally with a simple Node request, run a Vercel-compatible local server and post:

```json
{"values":[0,0,2,12,70,120,200,290,150,25,0,0],"horizon":3,"frequency":"monthly","target":"rainfall"}
```

The response should contain `model: "seasonal-naive"`, three forecast records, `advisoryOnly: true`, and `fallback: true` when no worker URL is configured.

## Deploy

1. Push the repository to GitHub and import it into Vercel. Framework: **Other**. The settings come from `vercel.json`.
2. Add `GEMINI_API_KEY` for optional AI explanation and Q&A. Add `HF_TOKEN` only if the Hugging Face fallback is needed.
3. Optionally add `FORECAST_WORKER_URL` to connect the private Lag-Llama worker.
4. Run the build and inspect the log for `[fieldshift] wrote N zone(s)`. If it says `using demo zones.js`, the app is using the checked-in demo climate data.
5. Open the site online once, then test airplane mode on a real phone. The rule-based plan must still run without network access. The forecast card should clearly show offline/unavailable or the local seasonal baseline.

After meaningful frontend changes, bump the cache name in `public/sw.js`.

## Data and product limits

- Every crop row in `public/data.js` is an unverified placeholder. Source values from FAO, IITA, ICRISAT, or a local agronomist, review them, and only then set `PLACEHOLDER=false`.
- The current climate data is zone-level, not field-level. Exact location is never uploaded or stored; optional geolocation only selects the nearest coarse zone on the device.
- Forecasts are not causal weather predictions and are not agronomic prescriptions. A farmer or agronomist must confirm before acting.
- Hausa, Yoruba, and Igbo UI text is draft content and needs native-speaker review before formal release.
- Never commit `.env.local`, API keys, tokens, model checkpoints, or private worker credentials.

## AI boundary

The AI receives the decision context only to explain the result or answer a question about it. It must not invent agronomic facts, change scores, remove gates, or make a recommendation that contradicts the deterministic engine. When the provider fails, FieldShift shows a local summary and keeps the plan available.

## Production smoke tests

```bash
curl -fsSL https://fieldshift-ng.vercel.app/
curl -sS https://fieldshift-ng.vercel.app/api/narrate
curl -sS -X POST https://fieldshift-ng.vercel.app/api/forecast \
  -H 'content-type: application/json' \
  -d '{"values":[0,0,2,12,70,120,200,290,150,25,0,0],"horizon":3}'
```
