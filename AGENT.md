# FieldShift NG — Complete Agent Handoff

**Purpose:** Give any future coding agent enough context to continue FieldShift NG safely without reconstructing the project history.

**Last updated:** 2026-11-15

## Read this first

FieldShift NG is an offline-capable farm decision-support web app for smallholder farmers in northern Nigeria. It helps a farmer compare three-season crop rotations using climate-zone inputs, crop constraints, storage conditions, irrigation, flooding risk, preferences, and deterministic agronomic rules.

The non-negotiable product principle is:

> Rules and the scoring engine decide. AI and forecasting explain or provide advisory signals only.

Do not let any AI, time-series model, or hosted provider modify scores, remove gates, invent agronomic facts, override safety rules, or silently collect location data.

The original project name is **FieldShift NG**. Do not rename it unless the owner explicitly asks.

## Repository and production

- GitHub: `rufatronics/fieldshift-ng`
- Branch: `main`
- Current latest commit: `312e20b` (`Add complete project handoff`)
- Production: `https://fieldshift-ng.vercel.app`
- Vercel project: `rufatronics-projects/fieldshift-ng`
- Framework: static/vanilla HTML, CSS, and JavaScript plus Vercel serverless functions
- Node runtime: `22.x`
- Build command: `node tools/build-data.mjs`
- Output directory: `public`
- Vercel config: `vercel.json`
- Current repository is expected to be clean after checkout.

Never commit `.env.local`, API keys, GitHub tokens, Vercel tokens, Hugging Face tokens, Google keys, model checkpoints, or private worker credentials.

## Current file map

- `public/index.html`: main planner, deterministic engine, technical view, multilingual UI, AI calls, forecast card, and browser wiring.
- `public/lite.html`: ultra-lite Nokia/KaiOS-style planner for slow connections and small screens.
- `public/data.js`: demo zones and crop catalog; currently `PLACEHOLDER = true`.
- `public/zones.js`: generated or checked-in zone climate data.
- `public/i18n.js`: English, Hausa, Yoruba, and Igbo draft UI strings.
- `public/sw.js`: service worker; current cache is `fsng-v6`.
- `api/narrate.js`: Gemini/Hugging Face explanation and farmer Q&A API.
- `api/forecast.js`: forecast API with optional worker proxy and local seasonal-naive fallback.
- `forecast/lag_llama_worker.py`: optional Python Lag-Llama-compatible advisory worker scaffold.
- `forecast/requirements.txt`: Python worker dependencies.
- `tools/build-data.mjs`: private data build step; public output contains climate averages only.
- `tools/replay-case.mjs`: reproducible Kano cutoff/stress replay harness.
- `examples/2020-kano-cutoff-paper.md`: case-study paper and judge/demo script.
- `examples/2020-kano-cutoff-replay.json`: complete machine-readable scenario.
- `README.md`: user/developer setup, forecast docs, deployment, tests, and limitations.
- `HANDOFF.md`: broad project handoff.
- `AGENT.md`: this agent-specific continuation handoff.
- `.gitignore`: ignores environment files and local secrets.

## Farmer experience

The main flow is:

1. Farmer selects English, Hausa, Yoruba, or Igbo.
2. Farmer selects a coarse zone: Kano, Katsina, or Sokoto. Optional device geolocation only chooses the nearest coarse zone; exact coordinates are not uploaded or stored.
3. Advisor asks flood exposure, irrigation, and storage questions.
4. Farmer selects three previous crops.
5. Farmer selects crops that sell easily.
6. Deterministic engine calculates the current rotation and safe alternatives.
7. Plan view shows scores, warnings, climate chart, alternatives, and what-if controls.
8. Farmer can ask in-plan questions or use the top Ask FieldShift panel.
9. Experimental rainfall forecast card displays point/uncertainty values as advisory context only.

Offline behavior:

- Deterministic planning works offline after static assets are cached.
- AI chat requires network access.
- Forecast API uses a fallback when the optional model worker is not configured.
- If the network fails, the plan remains available and the UI should explain the limitation.

Lite mode is at `/lite.html`. It has fewer rules, no charts/images/external fonts/framework, and can send a small text-only AI question through `XMLHttpRequest` when online. The full app remains authoritative.

## Deterministic decision engine

The engine is embedded in `public/index.html` and reads `public/data.js` and `public/zones.js`.

Core functions:

- `X(p)`: applies what-if rainfall and temperature changes to the selected zone.
- `crop(id, p, x)`: scores a crop across water, heat, season, flood, storage, soil, and market factors.
- `rot(seq, p, x)`: scores a three-crop rotation and applies sequence bonuses/penalties.
- `cands(p, x)`: creates and ranks safe candidate rotations.
- `calc()`: calculates the current plan and top alternatives.
- `screen()`: constructs the full AI context.

Rules:

- `R-WATER-01`: seasonal water requirement gate/penalty.
- `R-SEASON-02`: cycle length versus rainy-season length.
- `R-HEAT-03`: heat tolerance penalty.
- `R-FLOOD-04`: low-plot flooding gate/penalty.
- `R-STORE-05`: harvest humidity, storage quality, and rot sensitivity.
- `R-SEQ-01`: no-legume penalty.
- `R-SEQ-02`: repeated-crop penalty.
- `R-SEQ-03`: grain/legume or family-switch bonus.
- `R-GATE`: rotation contains a crop that failed a gate.

The engine is the source of truth. Any future model integration must consume its results, not replace them.

## Current crop catalog

- Pearl millet
- Sorghum
- Maize
- Cowpea
- Groundnut
- Rainfed rice
- Sesame
- Soybean
- Onion
- Tomato

All crop parameters are placeholders until sourced and reviewed by an agronomist or appropriate agricultural institution. Never present them as validated recommendations while `PLACEHOLDER = true`.

## AI backend

`api/narrate.js` supports:

- `GET /api/narrate`: readiness and configured-provider status.
- `POST /api/narrate`: explanation or one short farmer question.
- Best-effort eight-request-per-minute rate limiting per IP.
- Input size and question length validation.
- Google Gemini first, Hugging Face fallback.
- Safe errors without returning secret values.

Environment names used by production:

- `GEMINI_API_KEY`
- `HF_TOKEN`
- Optional `MODEL`
- Optional `HF_MODEL`
- Optional `HF_REPO`

The prompt instructs AI to use only the supplied decision JSON, compare concrete factors, cite rule IDs when present, mention information gaps, and tell the farmer to confirm with an agronomist. Do not weaken this boundary.

## Forecast MVP

The forecast is intentionally separate from crop scoring.

### API

`POST /api/forecast` accepts a numeric series and returns point, low, and high forecast values:

```json
{
  "values": [0, 0, 2, 12, 70, 120, 200, 290, 150, 25, 0, 0],
  "horizon": 3,
  "frequency": "monthly",
  "target": "rainfall"
}
```

When `FORECAST_WORKER_URL` is absent or unavailable, it returns:

- `model: "seasonal-naive"`
- `advisoryOnly: true`
- `fallback: true`
- forecast records with `period`, `point`, `low`, and `high`
- a note that deterministic FieldShift rules remain authoritative

The browser forecast card is labeled experimental and advisory. It must not change plan scores or gates.

### Optional Lag-Llama worker

`forecast/lag_llama_worker.py` is a Python/FastAPI worker scaffold. It loads a Lag-Llama checkpoint lazily and returns probabilistic forecast bands. It is not bundled into the browser and should be private/authenticated.

Typical setup:

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r forecast/requirements.txt
export LAG_LLAMA_CHECKPOINT=/path/to/lag-llama.ckpt
uvicorn forecast.lag_llama_worker:app --host 0.0.0.0 --port 8000
```

Then configure Vercel `FORECAST_WORKER_URL` to a private HTTPS worker endpoint. Do not expose credentials in frontend code.

The worker is not yet a validated northern-Nigeria weather model. It requires rolling-origin evaluation, uncertainty calibration, data-quality checks, and device/latency testing before any production claim.

## Time-series model research learned from the comparison

The model comparison examined Google TimesFM 2.5, Amazon Chronos-2, Salesforce Moirai 2.0, IBM Granite TTM/TinyTimeMixer, Lag-Llama, and Nixtla TimeGPT.

### Ranked recommendation for FieldShift

1. **IBM Granite TTM** — strongest longer-term local-worker architecture. Compact family, CPU/laptop-oriented path, zero-shot support, multivariate capability, and Apache licensing. Main caveats: history requirements, checkpoint/frequency/horizon matching, and no proof of zero-shot exogenous-weather support for this use case.
2. **Lag-Llama** — best lightweight local fallback for one carefully defined target series. Approximately 2.45M parameters and a roughly 29.5 MB checkpoint according to its official materials; probabilistic output and Apache licensing. It is univariate and autoregressive, not a general multivariate weather model.
3. **Amazon Chronos-2** — strongest connected demo candidate because it supports multivariate series and past/known-future covariates with quantiles. It is a Python/cloud dependency and has no official low-end browser/offline path.
4. **Google TimesFM 2.5** — strong zero-shot univariate/online option with quantiles, long context, and an official managed BigQuery route. Through 2.5 it is fundamentally univariate; XReg is not native joint multivariate forecasting. Not suitable for a low-end browser bundle without proof.
5. **Nixtla TimeGPT** — convenient connected API with intervals, exogenous variables, and current multivariate claims. Proprietary, remote, key-protected, and not an offline-first path.
6. **Salesforce Moirai 2.0 Small** — small and probabilistic but lacks covariates/cross-variate forecasting, uses a research-oriented CC BY-NC-4.0 checkpoint, and is less suitable for commercial/offline FieldShift.

### Architecture conclusion

Use a two-layer system:

- Layer 1: deterministic FieldShift rules remain the only decision authority.
- Layer 2: an optional replaceable worker provides climate/sensor forecasts, quantiles, freshness, provenance, and quality status.

For a one- or two-day hackathon, do not attempt fine-tuning, causal weather modeling, full offline browser inference, or production accuracy claims. Use one target series, a short horizon, a simple baseline, cached results, uncertainty display, and a clear offline fallback.

### Common research warnings

- No candidate has authoritative validation on northern Nigerian farms or stations.
- Generic foundation-model benchmarks are not local agronomic evidence.
- Zero-shot does not remove the need for backtesting and calibration.
- Browser/WebAssembly/offline support must never be assumed from parameter count.
- Forecasts do not supply causal agronomic advice.
- Future covariates must actually be available for covariate-aware forecasting.
- A plausible forecast must not override water, flood, heat, storage, or safety gates.

## Reproducible Kano 2020 scenario

The scenario is deliberately honest and is saved in GitHub.

Farmer profile:

- Cutoff: 2020 planting decision.
- Zone: Kano.
- Low plot: yes.
- Irrigation: no.
- Storage: poor.
- Previous rotation: maize → maize → groundnut.
- Market preferences: cowpea, pearl millet, sesame.
- Weights: water 4, soil 4, storage 4, cash 3.

The repository has zone climatology, not annual 2020 observations. Therefore `tools/replay-case.mjs` applies a transparent 30% reduction to June–September rainfall as a drought-stress perturbation. It is not proof of exactly what happened in 2020.

Replay result:

- Current drought-stress plan: **65/100**.
- Top alternative: **Pearl millet → Cowpea → Sesame — 89/100**.
- Difference: **24 points**.
- Current plan receives `R-WATER-01` and `R-FLOOD-04` penalties.
- Alternative uses lower-water crops, includes a legume, matches preferences, and avoids gates; pearl millet still receives a storage penalty.
- A heavier flood perturbation drops the tested alternative to **6/100** and triggers `R-GATE`.

Run:

```bash
node tools/replay-case.mjs
```

Outputs:

- `examples/2020-kano-cutoff-replay.json`
- console summary of current and top alternative scores

Safe hackathon wording:

> “If this farmer had entered these conditions before planting, FieldShift would have flagged the maize-heavy plan and offered a safer candidate under the tested drought stress.”

Never claim actual yield, income, or farmer impact without verified annual data and outcomes.

## Data pipeline

`tools/build-data.mjs` pulls private harmonized climate data when `HF_TOKEN` and the configured repository are available. It writes public zone averages to `public/zones.js`. If access fails, it keeps the checked-in demo zone data.

Expected build messages:

- `[fieldshift] wrote N zone(s) ...`
- `[fieldshift] using demo zones.js ...`

Never put tokens in generated public files. Zone climate averages are public by design.

## Service worker and offline behavior

`public/sw.js` currently uses cache name `fsng-v6` and caches the static application. Bump this cache name after meaningful frontend asset changes so phones do not retain stale files.

AI is network-only. The deterministic plan is offline. Forecast display must remain advisory and must degrade gracefully.

## Tests already run

These checks passed after the latest changes:

```bash
npm run build
node --check api/forecast.js
node --check api/narrate.js
node --check tools/build-data.mjs
node --check tools/replay-case.mjs
git diff --check
```

A direct forecast fallback smoke test returned three records with `model: "seasonal-naive"`, `advisoryOnly: true`, and `fallback: true`.

The replay generated:

```text
Drought stress current: 65/100 (Maize → Maize → Groundnut)
Drought stress top option: 89/100 (Pearl millet → Cowpea → Sesame)
```

## Development and deployment commands

```bash
npm run build
node --check api/narrate.js
node --check api/forecast.js
node --check tools/build-data.mjs
node --check tools/replay-case.mjs
git diff --check
```

Deployment:

```bash
git add <changed-files>
git commit -m "Describe the change"
git push origin main
npx vercel@latest --prod --yes --token "$VERCEL_TOKEN"
```

Production smoke tests:

```bash
curl -fsSL https://fieldshift-ng.vercel.app/
curl -sS https://fieldshift-ng.vercel.app/api/narrate
curl -sS -X POST https://fieldshift-ng.vercel.app/api/forecast \
  -H 'content-type: application/json' \
  -d '{"values":[0,0,2,12,70,120,200,290,150,25,0,0],"horizon":3}'
```

## Security status

Credentials were exposed during setup and should be revoked and regenerated:

- GitHub token
- Vercel token
- Hugging Face token
- Any Google AI key pasted during setup

Do not include replacement values in this file or chat. Use connector-managed secrets, GitHub settings, or Vercel environment settings.

The Vercel CLI temporarily downloaded `.env.local` during deployment. It was removed and is ignored by Git. No secret values are in this handoff or the repository.

## Next-agent priorities

1. Preserve all deterministic rules and safety boundaries.
2. Replace the illustrative rainfall perturbation with verified annual observations.
3. Add rolling-origin evaluation against persistence and seasonal-naive baselines.
4. Source and review crop parameters with an agronomist or agricultural institution.
5. Validate forecast intervals, missing-data behavior, and useful horizon locally.
6. Add authentication and monitoring to any Lag-Llama worker.
7. Consider moving the rule engine into a shared module so browser and replay implementations cannot drift.
8. Have native Hausa, Yoruba, and Igbo speakers review translations.
9. Test main and Lite modes on real low-end Android/KaiOS-style devices.
10. Do not claim farmer outcomes until a real retrospective or prospective evaluation supports them.
