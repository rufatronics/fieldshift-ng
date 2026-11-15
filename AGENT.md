# FieldShift NG — Agent Handoff Context

## Purpose

FieldShift NG is an offline-capable farm decision-support web app for smallholder farmers in northern Nigeria. The app helps a farmer compare three-season crop rotations using climate-zone inputs, crop constraints, storage conditions, irrigation, flooding risk, preferences, and deterministic agronomic rules.

The core product principle is:

> Rules and the scoring engine decide. AI explains the result and answers questions about the supplied result; AI must not override gates, scores, or safety rules.

The original project name is **FieldShift NG** and should not be renamed.

## Repository and production

- GitHub repository: `rufatronics/fieldshift-ng`
- Main branch: `main`
- Production URL: `https://fieldshift-ng.vercel.app`
- Deployment platform: Vercel
- Framework: static/vanilla HTML, CSS, and JavaScript with one Vercel serverless API function
- Node runtime: `22.x`
- Build command: `node tools/build-data.mjs`
- Output directory: `public`
- API function: `api/narrate.js`
- Vercel project files: `vercel.json`, `.vercel/project.json`

The current repository is clean after deployment. Do not commit `.env.local`, Vercel tokens, Google keys, Hugging Face tokens, GitHub tokens, or other credentials.

## Current feature set

### Farmer experience

The current page has a guided advisor flow:

1. The farmer selects a language.
2. The advisor asks for a coarse zone, flood exposure, irrigation, storage quality, previous crops, and crops that sell easily.
3. The deterministic engine calculates the current rotation and safe alternatives.
4. The plan view shows scores, warnings, climate chart, options, and what-if controls.
5. The farmer can ask questions through the in-plan Q&A chat.
6. The farmer can open the **Ask FieldShift** button in the top navigation and use the top AI chat panel.

The top AI panel now contains a visible input, a Send button, and an answer area. It uses the same full plan context as the in-plan chat after the farmer completes the guided plan. If no plan exists, it clearly tells the farmer to start the season plan first.

### Languages

The UI supports English, Hausa, Yoruba, and Igbo. The Hausa, Yoruba, and Igbo text is draft content and should be reviewed by native speakers before formal release.

### Crops

The crop catalog currently includes:

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

Crop parameters are still marked as placeholders with `PLACEHOLDER = true` in `public/data.js`. Do not present the values as validated agronomic recommendations until they are sourced and reviewed by an agronomist or appropriate agricultural institution.

### Optional location

The landing flow includes an opt-in approximate-location button. It uses browser geolocation only to select the nearest coarse zone among Kano, Katsina, and Sokoto. Exact coordinates are not uploaded or stored. If permission is denied, the farmer can select a zone manually.

## Decision engine

The engine is in `public/index.html` and uses data from `public/data.js` and generated zone data in `public/zones.js`.

Important functions:

- `X(p)`: applies what-if rain and temperature changes to zone climate.
- `crop(id, p, x)`: scores one crop across water, heat, season, flood, storage, soil, and market factors; it applies gate and penalty rules.
- `rot(seq, p, x)`: scores a three-crop rotation and applies sequence bonuses/penalties.
- `cands(p, x)`: generates and ranks safe candidate rotations.
- `calc()`: calculates the current plan and top alternatives.
- `screen()`: builds the complete AI context payload.

Rules currently include:

- `R-WATER-01`: seasonal water requirement gate/penalty
- `R-SEASON-02`: cycle length versus rainy season
- `R-HEAT-03`: heat tolerance penalty
- `R-FLOOD-04`: low-plot flooding gate/penalty
- `R-STORE-05`: harvest humidity, storage quality, and rot sensitivity
- `R-SEQ-01`: no legume penalty
- `R-SEQ-02`: repeated crop penalty
- `R-SEQ-03`: grain/legume switch bonus
- `R-GATE`: rotation contains a crop that failed a gate

The engine must remain the source of truth. Any future AI prompt must preserve that boundary.

## Full AI context pipeline

The AI request is sent from `callAI(q)` in `public/index.html` to `/api/narrate`.

The payload includes:

- `lang`
- `q`, the farmer’s question
- `baseline`, a brief current-rotation summary
- `options`, brief alternative summaries
- `screen`, the full decision context

The `screen` object now includes:

- Farmer inputs: zone, low plot, irrigation, storage, previous rotation, preferences, weights, and what-if changes
- Climate: season length, monthly rainfall, monthly temperatures, and monthly humidity
- Current rotation: sequence, score, and rotation rule evidence
- Explicit `comparison.current` and `comparison.options` objects
- For every crop: total score, all factor scores, factor weights, requirements/tolerances, observed metrics, rule evidence, and removed gate IDs

The explicit comparison object was added because summary-only prompts caused answers like “Option 1 scores higher, but the JSON does not explain why.” The prompt now requires at least two concrete factor differences whenever the context contains them.

## AI backend

The backend is `api/narrate.js`.

Provider order:

1. Google AI Studio / Gemini via `GEMINI_API_KEY`
2. Hugging Face router via `HF_TOKEN`

Gemini model fallback order:

1. `MODEL`, if configured
2. `gemini-2.5-flash`
3. `gemini-2.0-flash`
4. `gemini-1.5-flash`

The backend supports:

- `GET /api/narrate`: readiness and configured-provider status
- `POST /api/narrate`: explanation or farmer Q&A
- Rate limiting: best-effort eight requests per minute per IP
- Input size and question-length validation
- Provider fallback
- Safe errors without returning secret values

The AI prompt says to use only the JSON decision context, compare factors, cite rule IDs when present, mention information gaps, and tell the farmer to confirm with an agronomist before acting.

## Production AI configuration

Production environment variable names are:

- `GEMINI_API_KEY`: Google AI Studio key
- `HF_TOKEN`: Hugging Face token
- Optional `MODEL`: Gemini model override
- Optional `HF_MODEL`: Hugging Face model override
- Optional `HF_REPO`: data repository used by the build step

Never put values for these variables in this file, GitHub, frontend JavaScript, or chat replies.

A replacement Google key was installed during the latest repair and tested successfully. A real farmer question returned HTTP 200 through Google. If chat breaks again, check `/api/narrate` and then test a short POST request. Google API keys must belong to a project where the Generative Language API is enabled.

The Hugging Face fallback is configured but may require a provider/model with available credits. Do not assume every Hugging Face model is available through the router.

## Generated climate data

`tools/build-data.mjs` builds `public/zones.js` from the configured data repository when available. The latest build generated three zones using POWER climate data for 2005–2025.

If the build cannot access the data repository, it falls back to the demo data already in `public/data.js`/`public/zones.js`. The build output reports either:

- `[fieldshift] wrote 3 zone(s) ...`
- `[fieldshift] using demo zones.js ...`

Never include tokens in generated public files. Zone climate averages are public by design; secrets are not.

## Service worker and offline behavior

The service worker is `public/sw.js`. It caches the static application so the deterministic plan can run offline. AI chat requires network access. When AI is unavailable, the UI must retain a local summary and explain the provider failure clearly.

After meaningful frontend changes, consider bumping the service-worker cache name in `public/sw.js` so phones do not keep stale assets.

## Deployment workflow

From the project directory:

```bash
npm run build
git diff --check
git add <changed-files>
git commit -m "Describe the change"
git push origin main
npx vercel@latest --prod --yes --token "$VERCEL_TOKEN"
```

Smoke tests:

```bash
curl -fsSL https://fieldshift-ng.vercel.app/
curl -sS https://fieldshift-ng.vercel.app/api/narrate
```

A minimal real-Q&A test should include `lang`, `q`, `baseline`, `options`, and `screen`, and must be checked for HTTP 200 and a non-empty `text` field.

For local syntax checks:

```bash
node --check api/narrate.js
node --check tools/build-data.mjs
npm run build
git diff --check
```

To check inline browser JavaScript, extract `<script>...</script>` from `public/index.html` to a temporary file and run `node --check` on it.

## Change history

The project evolved through these major updates:

1. Initial repository creation, private GitHub repository, Vercel project, environment variables, and production deployment.
2. Runtime compatibility pinning for Vercel Node.
3. Multilingual guided planning experience and farmer flow.
4. Technical decision view and AI explanation helper.
5. v4 full code refresh with advisor chat, Q&A, climate chart, and richer plan UI.
6. Premium visual pass with thinner borders and cleaner controls.
7. Expanded crop catalog with sesame, soybean, onion, and tomato.
8. Opt-in approximate location selector with device-only coarse zone selection.
9. Google AI provider fallback plus Hugging Face provider fallback.
10. Clear provider error messages after diagnosing disabled Google API and unavailable Hugging Face provider routes.
11. Full decision-engine context sent to AI, including factor scores, weights, crop requirements, observations, rules, and explicit comparisons.
12. Top navigation **Ask FieldShift** real-AI chat panel.
13. Latest input-visibility fix for the top chat box and this handoff document.

## Security and credential hygiene

Credentials were supplied during setup and used only for authorized repository/deployment operations. They must not be copied into source files or this handoff document. Because credentials were pasted into chat during setup, rotate the GitHub token, Google AI key, Hugging Face token, and Vercel token when practical, then update only the corresponding production secret values.

If a credential is accidentally committed:

1. Revoke it immediately.
2. Replace the production secret.
3. Remove the value from tracked files.
4. Check Git history and rotate again if necessary.

## Product guardrails for future agents

- Do not let AI modify scores, remove gates, or invent agronomic facts.
- Do not silently collect location or device data.
- Keep location opt-in and coarse.
- Preserve offline deterministic planning.
- Keep question and provider errors visible to the farmer.
- Do not claim crop parameters are validated while `PLACEHOLDER` is true.
- Keep the original project and feature names unless the owner explicitly requests a rename.
- Test both a normal plan run and a real AI question after every AI-context change.
