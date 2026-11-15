// Reproducible FieldShift case-study replay.
// This is a scenario harness, not a claim of observed farmer impact.
// Replace the demo climate perturbation with verified year-by-year observations
// before presenting it as a historical evaluation.
import { readFileSync, writeFileSync } from "node:fs";
import vm from "node:vm";

const zoneSource = readFileSync(new URL("../public/data.js", import.meta.url), "utf8");
const context = { console };
vm.createContext(context);
vm.runInContext(zoneSource + "this.__data={ZONES,CROPS,PLACEHOLDER};", context);
const { ZONES, CROPS } = context.__data;

const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const sum = xs => xs.reduce((a, b) => a + b, 0);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const cropNames = id => CROPS[id].n;
const growingWindow = crop => [...Array(Math.ceil(crop.cyc / 30))].map((_, k) => (crop.pm - 1 + k) % 12);

function scoreCrop(id, farmer, climate) {
  const c = CROPS[id], w = growingWindow(c), rules = [];
  const rain = sum(w.map(m => climate.rain[m])) + (farmer.irr ? 150 : 0);
  const peakTemp = Math.max(...w.map(m => climate.tmax[m]));
  const peakRain = Math.max(...w.map(m => climate.rain[m]));
  const season = climate.rain.filter(r => r >= 50).length * 30 + 20;
  const add = (id, type, detail) => rules.push({ id, type, detail });
  const factors = {};
  factors.water = clamp((rain - c.w[0] * 0.8) / (c.w[1] - c.w[0] * 0.8) * 100);
  if (rain < c.w[0] * 0.8) add("R-WATER-01", "gate", `${Math.round(rain)} mm vs ${c.w[0]} mm minimum`);
  else if (factors.water < 60) add("R-WATER-01", "penalty", `${Math.round(rain)} mm vs ${c.w[0]}–${c.w[1]} mm need`);
  factors.season = clamp(140 - 100 * c.cyc / season);
  if (c.cyc > season) add("R-SEASON-02", "gate", `${c.cyc} days vs ${season}-day season`);
  const heatLimit = 27 + 2 * c.heat;
  factors.heat = clamp(100 - (peakTemp - heatLimit) * 15);
  if (factors.heat < 60) add("R-HEAT-03", "penalty", `${peakTemp.toFixed(1)}°C vs ${heatLimit}°C limit`);
  const floodRisk = (farmer.low ? 1 : 0.25) * clamp(peakRain / 3);
  factors.flood = clamp(100 - floodRisk * (5 - c.flood) / 4);
  if (farmer.low && factors.flood < 20) add("R-FLOOD-04", "gate", `peak rain ${peakRain} mm on low plot`);
  else if (factors.flood < 60) add("R-FLOOD-04", "penalty", `peak rain ${peakRain} mm`);
  const harvestMonth = (c.pm - 1 + Math.ceil(c.cyc / 30)) % 12;
  const humidity = climate.rh[harvestMonth];
  factors.store = clamp(100 - clamp((humidity - 45) * 2.5) * c.rot / 5 * ({ good: 0.4, ok: 0.8, poor: 1.3 }[farmer.store]));
  if (factors.store < 60) add("R-STORE-05", "penalty", `${months[harvestMonth]} humidity ${humidity}%`);
  factors.soil = clamp(40 + 30 * c.nfix + 6 * c.ero);
  factors.market = farmer.pref.includes(id) ? 100 : 55;
  const weights = { water: 1 + farmer.weights.water, heat: 1.5, season: 1.5, flood: 1.5, store: 1 + farmer.weights.store, soil: 1 + farmer.weights.soil, market: 0.5 + farmer.weights.cash * 0.5 };
  const gate = rules.some(r => r.type === "gate");
  const score = gate ? 0 : sum(Object.keys(weights).map(k => factors[k] * weights[k])) / sum(Object.values(weights));
  return { id, name: cropNames(id), score: Math.round(score), gate, factors: Object.fromEntries(Object.entries(factors).map(([k, v]) => [k, Math.round(v)])), rules };
}

function scoreRotation(sequence, farmer, climate) {
  const crops = sequence.map(id => scoreCrop(id, farmer, climate));
  let score = sum(crops.map(c => c.score)) / crops.length;
  const notes = [];
  if (!sequence.some(id => CROPS[id].fam === "legume")) { score -= 10; notes.push("R-SEQ-01: no legume"); }
  let repeats = 0, switches = 0;
  sequence.forEach((id, i) => { const next = sequence[(i + 1) % sequence.length]; if (id === next) repeats++; else if (CROPS[id].fam !== CROPS[next].fam) switches++; });
  if (repeats) { score -= 8 * repeats; notes.push(`R-SEQ-02: ${repeats} repeated transition(s)`); }
  if (switches) { score += 2 * switches; notes.push(`R-SEQ-03: ${switches} grain/legume or family switch(es)`); }
  if (crops.some(c => c.gate)) notes.push("R-GATE: a crop failed a gate");
  return { sequence, score: Math.round(clamp(score)), crops, notes };
}

function rankCandidates(farmer, climate) {
  const ids = Object.keys(CROPS);
  const out = [];
  for (const a of ids) for (const b of ids) for (const c of ids) {
    if (new Set([a, b, c]).size < 3) continue;
    const r = scoreRotation([a, b, c], farmer, climate);
    if (!r.crops.some(x => x.gate)) out.push(r);
  }
  const seen = new Set();
  return out.sort((a, b) => b.score - a.score).filter(r => { const k = [...r.sequence].sort().join(","); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
}

const farmer = {
  zone: "kano", low: true, irr: false, store: "poor",
  previous: ["maize", "maize", "groundnut"], pref: ["cowpea", "millet", "sesame"],
  weights: { water: 4, soil: 4, store: 4, cash: 3 },
};
const base = ZONES[farmer.zone];
const drought = { ...base, rain: base.rain.map((v, i) => Math.round(v * (i >= 5 && i <= 8 ? 0.7 : 1))) };
const flood = { ...base, rain: base.rain.map((v, i) => Math.round(v * (i >= 6 && i <= 8 ? 1.25 : 1))) };
const current = scoreRotation(farmer.previous, farmer, drought);
const alternatives = rankCandidates(farmer, drought);
const currentNormal = scoreRotation(farmer.previous, farmer, base);
const alternativesNormal = rankCandidates(farmer, base);

const report = {
  title: "Kano 2020 cutoff replay: a drought-stress rotation decision",
  status: "illustrative scenario; not observed impact evidence",
  cutoffYear: 2020,
  dataNote: "The checked-in app contains zone climatology, not annual 2020 observations. The 30% rainy-season reduction is a transparent stress-test perturbation. Replace it with verified year-by-year observations before making historical claims.",
  farmer: { ...farmer, zone: ZONES[farmer.zone].name, previous: farmer.previous.map(cropNames), preferences: farmer.pref.map(cropNames) },
  normalClimatology: { current: currentNormal, alternatives: alternativesNormal },
  droughtStress: { current, alternatives },
  floodStressTopOption: scoreRotation(alternatives[0]?.sequence || ["millet", "cowpea", "sesame"], farmer, flood),
  interpretation: [
    "At the cutoff, the farmer's current maize-heavy rotation is tested against a drier rainy season and poor storage on a low plot.",
    "A safer alternative is useful only if it avoids gates and has a better score under the same farmer constraints.",
    "This demonstrates how the app could have helped a farmer notice water and storage risk before planting; it does not prove a real-world yield or income effect.",
    "The recommendation must still be checked with local extension advice because crop parameters are placeholders.",
  ],
};

const out = process.argv[2] || "examples/2020-kano-cutoff-replay.json";
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(`Wrote ${out}`);
console.log(`Drought stress current: ${current.score}/100 (${current.sequence.map(cropNames).join(" → ")})`);
console.log(`Drought stress top option: ${alternatives[0]?.score ?? "none"}/100 (${alternatives[0]?.sequence.map(cropNames).join(" → ") ?? "none"})`);
