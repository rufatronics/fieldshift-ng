# Kano 2020 Cutoff Replay: How FieldShift Could Have Helped Before Planting

**Status:** illustrative stress-test scenario, not observed impact evidence.

## The farmer and the decision moment

Imagine a smallholder farmer near Kano planning the 2020 rainy season. The farm includes a low plot with flood exposure. There is no irrigation and storage is poor. The farmer's recent rotation is maize → maize → groundnut. The crops that sell most easily for this farmer are pearl millet, cowpea, and sesame.

The farmer wants a plan that gives more weight to water security, soil improvement, and storage risk. FieldShift receives these inputs before planting. It does not use an AI model to decide. The deterministic rotation engine calculates crop factors, applies gates, and ranks safe three-crop rotations.

## Cutoff and stress replay

The cutoff is set to **2020** to represent the information available when the farmer makes the decision. The repository currently contains zone climatology for Kano, not annual 2020 observations. To keep the demonstration reproducible, the replay applies a transparent **30% reduction to June–September rainfall** as a drought-stress perturbation. This is not a claim that Kano experienced exactly this reduction in 2020.

The replay command is:

```bash
node tools/replay-case.mjs
```

It writes the machine-readable result to `examples/2020-kano-cutoff-replay.json`.

## What FieldShift says in the replay

Under the drought-stress scenario, the farmer's current maize-heavy rotation scores **65/100**. Both maize entries receive a water penalty under `R-WATER-01`, and the rotation also receives a flood penalty under `R-FLOOD-04` because the farm is on a low plot.

The top safe alternative is:

> **Pearl millet → Cowpea → Sesame — 89/100**

The alternative scores better because it uses less water-sensitive crops, includes a legume, matches the farmer's market preferences, and avoids a repeated crop transition. The engine records the grain/legume family switches under `R-SEQ-03`. Pearl millet still receives a storage penalty in the replay because storage is poor, so the app does not present the result as risk-free.

The difference is **24 score points** in this illustrative scenario. That is a useful decision-support signal: before planting, the farmer can see that the existing maize-heavy plan is less robust under a drier season and can discuss a lower-water alternative with an extension worker.

## Why this could have helped someone

The value is not that FieldShift predicts the future perfectly. The value is that it makes a difficult trade-off visible before money and seed are committed:

1. The current plan exposes repeated maize and water sensitivity.
2. The low-plot input keeps flood risk visible instead of hiding it in a generic crop list.
3. Poor storage affects the ranking, rather than being treated as an afterthought.
4. The farmer receives an alternative that is connected to selling preferences and rotation diversity.
5. The app still tells the farmer that the result needs local confirmation.

A hackathon presenter can describe this as: “If this farmer had entered these conditions before planting, the app would have flagged the maize-heavy plan and offered a safer candidate under the tested drought stress.” Do **not** say that a real farmer gained yield or income unless a real retrospective dataset and outcome study support that claim.

## Robustness check: heavier flood stress

The same top alternative is then tested with a 25% increase in June–September rainfall. Because the farm is classified as a low plot, the flood rule gates all three crops in this extreme stress test. The result drops to **6/100** and carries `R-GATE`.

This is a useful safety demonstration. The app does not blindly keep recommending the same rotation when the hazard changes. It shows that the farmer needs a different plot, drainage, flood-tolerant crop evidence, or local extension advice. The model cannot override that gate.

## What is and is not proven

This replay demonstrates the product behavior and the safety boundary. It does not prove forecast accuracy, yield improvement, income improvement, or historical 2020 impact. The crop parameters are still placeholders, and the zone data is climatological rather than field-level annual observations.

For a real evaluation, add verified yearly data with a clear cutoff. For each year, train or calculate only from data available before planting, replay the decision, and compare it with the farmer's recorded plan and outcome. Report crop survival, yield, gross margin, water use, and false-safe or false-gate cases. Compare FieldShift with a farmer baseline, seasonal-naive rainfall information, and a no-information control where ethically and practically appropriate.

## Judge/demo script

> “This is a Kano farmer at the 2020 planting cutoff. The farm is low-lying, rainfed, and has poor storage. The current rotation is maize, maize, groundnut. Under a transparent drought-stress replay, FieldShift scores it 65. It ranks pearl millet, cowpea, sesame at 89 because the plan is less water-sensitive, includes a legume, and matches what sells locally. The forecast card is advisory only. The rules still decide. When I switch to a flood stress case, the safety gate blocks the same plan rather than pretending the model knows what to do.”

That wording is strong for a hackathon because it demonstrates usefulness without inventing a real farmer success story.
