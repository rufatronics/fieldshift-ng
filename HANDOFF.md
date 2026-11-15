# FieldShift NG — Complete Project Handoff

Updated: 2026-11-15

## 1. Product identity and purpose

**Project name:** FieldShift NG. Do not rename it without the owner's explicit request.

FieldShift NG is an offline-capable farm decision-support web app for smallholder farmers in northern Nigeria. It helps a farmer compare three-season crop rotations using coarse climate-zone inputs, flood exposure, irrigation, storage conditions, previous crops, market preferences, and deterministic agronomic rules.

The central product boundary is:

> Rules and the scoring engine decide. AI and forecasting explain or provide advisory signals only.

No AI or time-series model may change a score, remove a gate, invent an agronomic fact, override a safety rule, or silently collect location data.

## 2. Repository and production state

- GitHub repository: `rufatronics/fieldshift-ng`
- Branch: `main`
- Latest commit: `46f865a` (`Add reproducible Kano cutoff case study`)
- Previous implementation commit: `ca65f83` (`Add advisory time-series forecast MVP`)
- Production URL: `https://fieldshift-ng.vercel.app`
- Deployment platform: Vercel
- Latest case-study deployment: `https://vercel.com/rufatronics-projects/fieldshift-ng/6oaqSsXp92WPXAA997Bes3UQ3Lb2`
- Framework: static/vanilla HTML, CSS, and JavaScript with Vercel serverless functions
- Node runtime: `22.x`
- Build command: `node tools/build-data.mjs`
- Static output: `public`
- Vercel configuration: `vercel.json`

The working tree was clean and synchronized with `origin/main` after the latest push. No credentials are stored in the repository.

## 3. Repository map

- `public/index.html`: main farmer advisor, deterministic engine, plan view, technical view, AI calls, forecast card, and multilingual UI wiring.
- `public/lite.html`: ultra-lite low-resource planner for small screens and slow connections.
- `public/data.js`: demo zones and crop catalog. `PLACEHOLDER = true`; crop values are not validated agronomic recommendations.
- `public/zones.js`: generated or checked-in zone climate data.
- `public/i18n.js`: English, Hausa, Yoruba, and Igbo UI strings. Non-English text is draft content and needs native-speaker review.
- `public/sw.js`: service worker with static cache `fsng-v6`; network-first with cache fallback.
- `api/narrate.js`: provider-backed explanation and Q&A API. Google Gemini is tried first, then Hugging Face.
- `api/forecast.js`: optional forecast proxy with deterministic seasonal-naive fallback.
- `forecast/lag_llama_worker.py`: optional Python Lag-Llama-compatible advisory worker.
- `forecast/requirements.txt`: worker dependencies.
- `tools/build-data.mjs`: private-data build pipeline; public output contains climate averages only.
- `tools/replay-case.mjs`: reproducible Kano cutoff/stress replay harness.
- `examples/2020-kano-cutoff-paper.md`: hackathon case-study paper and judge/demo script.
- `examples/2020-kano-cutoff-replay.json`: complete machine-readable scenario inputs, outputs, rules, and interpretation.
- `README.md`: setup, forecast integration, limitations, testing, deployment, and case-study links.
- `AGENT.md`: original broad product handoff context.
- `agents.md`: repository's lowercase handoff copy.
- `.gitignore`: ignores environment files and other local-only values.

## 4. Farmer experience

The main guided flow is:

1. Select a language.
2. Select Kano, Katsina, or Sokoto, manually or through opt-in coarse geolocation.
3. Answer flood exposure, irrigation, and storage questions.
4. Select the previous three crops.
5. Select crops that sell easily.
6. View the current rotation, score, warnings, alternatives, climate chart, and what-if controls.
7. Use in-plan AI Q&A or the top navigation Ask FieldShift panel.
8. View the experimental rainfall forecast card.

The plan remains usable offline. AI requires connectivity. Forecasting remains useful without a worker because the API returns a transparent local seasonal-naive baseline; if the API itself is unreachable, the rule-based plan remains available.

Lite mode is available at `/lite.html` and is intended for low-resource browsers. It uses a short form, no charts, no images, no external fonts, and a smaller text-only AI request when online.

## 5. Deterministic decision engine

The decision engine is embedded in `public/index.html` and uses `public/data.js` and `public/zones.js`.

Important functions:

- `X(p)`: applies what-if rainfall and temperature changes to the selected zone.
- `crop(id, p, x)`: scores a crop across water, heat, season, flood, storage, soil, and market factors.
- `rot(seq, p, x)`: scores a three-crop rotation and applies sequence rules.
- `cands(p, x)`: generates and ranks safe candidate rotations.
- `calc()`: calculates the current plan and alternatives.
- `screen()`: builds the full context sent to the AI narrator.

Rules:

- `R-WATER-01`: seasonal water requirement gate or penalty.
- `R-SEASON-02`: crop cycle versus rainy-season length.
- `R-HEAT-03`: heat-tolerance penalty.
- `R-FLOOD-04`: low-plot flooding gate or penalty.
- `R-STORE-05`: harvest humidity, storage quality, and rot sensitivity.
- `R-SEQ-01`: no-legume penalty.
- `R-SEQ-02`: repeated-crop penalty.
- `R-SEQ-03`: grain/legume or family-switch bonus.
- `R-GATE`: rotation contains a crop that failed a gate.

The engine is the sole source of truth for recommendations.

## 6. AI explanation boundary

`api/narrate.js` supports:

- `GET /api/narrate`: readiness and provider status.
- `POST /api/narrate`: explanation or one short farmer question.
- Best-effort rate limiting of eight requests per minute per IP.
- Input-size and question-length validation.
- Google provider followed by Hugging Face fallback.
- Safe provider errors without returning secrets.

The payload includes language, baseline, options, and the complete `screen` object. The prompt requires the model to use only supplied JSON, compare concrete factors, cite rules when present, mention information gaps, and tell the farmer to confirm with an agronomist.

When AI fails, the UI shows a local summary instead of breaking the plan.

## 7. Forecast integration

The forecast is an **advisory signal only**. It does not enter the crop score or modify any deterministic gate.

### API behavior

`POST /api/forecast` accepts:

```json
{
  "values": [0, 0, 2, 12, 70, 120, 200, 290, 150, 25, 0, 0],
  "horizon": 3,
  "frequency": "monthly",
  "target": "rainfall"
}
```

It returns point, low, and high values. If `FORECAST_WORKER_URL` is set and the worker responds with a valid forecast, the response identifies the configured worker model. Otherwise it returns:

- `model: "seasonal-naive"`
- `advisoryOnly: true`
- `fallback: true`
- a clear note that deterministic rules remain authoritative

The endpoint validates numeric series length and request size. The browser displays the forecast card with uncertainty bands, model/fallback status, and an advisory-only message.

### Optional Lag-Llama worker

The worker is in `forecast/lag_llama_worker.py`. It is intentionally not bundled into the browser or Vercel function. Run it as a private Python service, set `LAG_LLAMA_CHECKPOINT`, and configure Vercel's `FORECAST_WORKER_URL`.

The current worker is an integration scaffold. It requires a downloaded checkpoint and a deployment-specific Lag-Llama installation. It must be benchmarked and authenticated before production use. Do not expose it publicly without access control.

## 8. Reproducible Kano 2020 case study

The scenario is saved in GitHub in both human-readable and machine-readable form.

### Farmer profile

- Cutoff: 2020 planting decision.
- Zone: Kano.
- Low plot: yes.
- Irrigation: no.
- Storage: poor.
- Existing rotation: maize → maize → groundnut.
- Preferred market crops: cowpea, pearl millet, sesame.
- Weights: water 4, soil 4, storage 4, cash 3.

### Stress replay

The repository currently contains zone climatology, not annual 2020 observations. The replay therefore applies a transparent 30% reduction to June–September rainfall. It is labeled as illustrative and must not be described as observed 2020 impact evidence.

Results:

- Existing rotation under drought stress: **65/100**.
- Top alternative: **Pearl millet → Cowpea → Sesame — 89/100**.
- Difference: **24 points**.
- Current plan receives water penalties under `R-WATER-01` and flood penalties under `R-FLOOD-04`.
- The alternative receives a storage penalty for pearl millet but avoids gates, uses lower-water crops, includes a legume, and matches market preferences.
- A heavier flood replay drops the tested alternative to **6/100** and triggers `R-GATE`, demonstrating that the app does not blindly keep recommending it when hazard conditions change.

Run the replay with:

```bash
node tools/replay-case.mjs
```

The script regenerates `examples/2020-kano-cutoff-replay.json`.

### Safe hackathon wording

> “If this farmer had entered these conditions before planting, FieldShift would have flagged the maize-heavy plan and offered a safer candidate under the tested drought stress.”

Do not claim that a real farmer gained yield, income, or resilience until verified annual observations and outcomes support that statement.

## 9. Climate and crop data

`tools/build-data.mjs` can pull private harmonized data at build time using `HF_TOKEN`; the token is never written to public files. If the private data build is unavailable, the checked-in demo `public/zones.js` remains in place.

The build currently reports one of:

- `[fieldshift] wrote N zone(s) ...`
- `[fieldshift] using demo zones.js ...`

The checked-in crop parameters are placeholders. They need sourcing from appropriate institutions such as FAO, IITA, ICRISAT, or local agricultural experts. Do not set `PLACEHOLDER=false` until values are reviewed.

Zone climate data is public by design. Never put tokens or credentials in `public/zones.js` or any generated frontend asset.

## 10. Tests and validation already completed

The following checks passed after the forecast and case-study changes:

```bash
npm run build
node --check api/forecast.js
node --check api/narrate.js
node --check tools/build-data.mjs
node --check tools/replay-case.mjs
git diff --check
```

A direct fallback API smoke test returned three forecast records with `model: "seasonal-naive"`, `advisoryOnly: true`, and `fallback: true`.

The case-study replay generated the expected 65/100 current plan and 89/100 top alternative.

Production deployment succeeded after the commit author was changed to the owner's GitHub-associated email. The current code is pushed to `main`.

## 11. Deployment instructions

```bash
npm run build
git diff --check
git add <changed-files>
git commit -m "Describe the change"
git push origin main
npx vercel@latest --prod --yes --token "$VERCEL_TOKEN"
```

Do not commit `.env.local`, API keys, Vercel tokens, GitHub tokens, Hugging Face tokens, model checkpoints, or private worker credentials.

After meaningful frontend changes, bump the cache constant in `public/sw.js`.

Production smoke tests:

```bash
curl -fsSL https://fieldshift-ng.vercel.app/
curl -sS https://fieldshift-ng.vercel.app/api/narrate
curl -sS -X POST https://fieldshift-ng.vercel.app/api/forecast \
  -H 'content-type: application/json' \
  -d '{"values":[0,0,2,12,70,120,200,290,150,25,0,0],"horizon":3}'
```

## 12. Security and credential hygiene

Several credentials were pasted into chat during setup. They must be revoked and regenerated when practical:

- GitHub token.
- Vercel token.
- Hugging Face token.
- Any Google AI key that was exposed during setup.

The values are not included in this handoff, source files, generated assets, or commits. The Vercel CLI temporarily downloaded `.env.local` during deployment; it was removed and is ignored by Git.

Use connector-managed credentials or Vercel/GitHub settings for replacement values. Do not paste replacement secrets into chat.

## 13. Known limitations and next best work

1. Replace the illustrative 2020 perturbation with verified year-by-year Kano, Katsina, and Sokoto observations.
2. Add a proper rolling-origin evaluation harness with seasonal-naive and persistence baselines.
3. Validate forecast interval coverage and useful horizon on local weather data.
4. Source and review all crop parameters with an agronomist or agricultural institution.
5. Add real farmer outcome fields only with consent and privacy safeguards.
6. Benchmark the optional worker on target hardware before claiming local or offline inference.
7. Add worker authentication, request limits, and monitoring before connecting it to production.
8. Consider moving the decision engine into a shared module so browser replay and evaluation code cannot drift from the production formulas.
9. Have native Hausa, Yoruba, and Igbo speakers review draft translations.
10. Test the full app and Lite mode on actual low-end Android and KaiOS-style browsers.

## 14. Handoff checklist for the next agent

- Preserve the name FieldShift NG.
- Keep deterministic rules authoritative.
- Keep geolocation opt-in and coarse.
- Keep offline planning functional without AI or forecasting.
- Treat all current crop parameters as placeholders.
- Do not claim the Kano scenario is real observed impact.
- Do not commit secrets.
- Run build, syntax, diff, replay, and smoke tests after changes.
- Bump the service-worker cache after frontend changes.
- Review this file and `README.md` before making architectural changes.
