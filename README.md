# FieldShift NG

Offline-capable farm decision support for northern Nigeria. Rules and a rubric decide; the LLM only narrates.

## Deploy (about 5 minutes)
1. Push this folder to a GitHub repo and import it in Vercel. Framework: Other. The build settings come from `vercel.json`.
2. Project Settings, Environment Variables:
   - `HF_TOKEN` (Hugging Face read token, build time only, mark Sensitive)
   - `GEMINI_API_KEY` (Google AI Studio key, optional, enables the "Explain in plain words" button, runs Gemma 4)
   - `HF_REPO` (optional, default `rufatronics/fieldshift-ng-data`), `MODEL` (optional: `gemma-4-26b-a4b-it` default, or `gemma-4-31b-it`)
3. Deploy. Check the build log for `[fieldshift] wrote N zone(s)`. A line saying "using demo zones.js" means the data step failed and the site shows placeholder climate.
4. Open the site online once, then test airplane mode on a real phone. Bump the cache name in `public/sw.js` after each change.

## Test locally without Hugging Face
Put `dekad_harmonized.csv`, `terrain.json`, `zones.json`, `manifest.json` in `./data`, then run
`LOCAL_DIR=./data node tools/build-data.mjs` and `npx serve public`.

## Before you present
- Have a native Hausa speaker check the Hausa narration from Gemma 4 before it goes in the demo.
- Every row of `CROPS` in `public/data.js` is an unverified placeholder. Fill in sourced values (FAO, IITA, ICRISAT or an agronomist), have them reviewed, then set `PLACEHOLDER=false`.
- The season logic assumes one rainy season with planting around June (right for Kano, Katsina, Sokoto). Do not point `HF_REPO` at the 37-state dataset until that is generalised.
- Anything baked into `zones.js` is public once deployed: monthly climate averages only, never tokens.
