# Master Prompt: Build FieldShift Field + Store as a New Professional Version

You are taking over an existing project called **FieldShift NG**. Build a new, professional version called **FieldShift Field + Store** from the old repository clone. Do not destroy or silently rewrite the old version. Treat the old repository as the reference implementation and preserve it unchanged unless the owner explicitly approves a migration.

Your job is to turn the existing offline farm-planning web app into a clear hardware-software system that can be demonstrated with real sensors or a simulator.

## 1. Source project

The old repository is:

- GitHub: `https://github.com/rufatronics/fieldshift-ng`
- Existing production app: `https://fieldshift-ng.vercel.app`
- Existing project directory may be available locally as `fieldshift-ng`, `fieldshift-ng-from-github`, or another clone. Find it first.
- Existing handoff files are `AGENT.md`, `HANDOFF.md`, and `README.md`. Read all of them before changing code.
- The current project is a static HTML/CSS/JavaScript app with Vercel functions.
- The current main branch contains the deterministic planner, Lite mode, AI narration, forecast API, Lag-Llama worker scaffold, and Kano replay case study.

Create the new version in a separate directory, branch, or repository. Preferred new project name:

```text
fieldshift-field-store
```

Do not delete the original `fieldshift-ng` project. Do not force-push over the old repository unless the owner explicitly asks.

## 2. Product goal

Build a realistic offline-first farm and grain-store monitoring system for northern Nigerian smallholders, cooperatives, and extension workers.

The system should support three moments:

1. **Before planting:** use farmer inputs and climate context to recommend a three-season crop rotation.
2. **During the season:** use field sensors to replace guessed conditions with measured soil, weather, and flood inputs.
3. **After harvest:** use a store sensor to detect dangerous humidity and temperature conditions before grain spoilage becomes severe.

The product story is:

> Plan before planting, watch during the season, protect after harvest — even where the network does not.

The hardware must not become a new decision-maker. Sensors only supply measurements. The existing deterministic FieldShift rules remain the decision authority.

## 3. Non-negotiable safety and product boundaries

Preserve these boundaries throughout the implementation:

- Rules and the scoring engine decide.
- AI explains the result and answers questions about supplied context.
- Forecasts are advisory signals only.
- Sensors provide inputs; they do not make agronomic recommendations.
- A sensor reading must never silently remove a safety gate.
- A model must never override `R-WATER-01`, `R-SEASON-02`, `R-HEAT-03`, `R-FLOOD-04`, `R-STORE-05`, `R-SEQ-01`, `R-SEQ-02`, `R-SEQ-03`, or `R-GATE`.
- If sensors disconnect, the app must show stale/offline status and retain the last known reading with timestamp.
- Never present fictional farmers, fictional savings, fictional yields, or fictional impact as real evidence.
- The existing Kano scenario is an illustrative replay, not observed 2020 impact evidence.
- The existing crop values are placeholders until reviewed by an agronomist.
- Exact location must remain optional, coarse, and device-local.
- Never commit secrets, API keys, tokens, private URLs, model checkpoints, or `.env` files.

## 4. First phase: audit before implementation

Before writing code:

1. Locate the old clone and verify its Git remote, branch, commit, and working-tree state.
2. Read `AGENT.md`, `HANDOFF.md`, and `README.md` completely.
3. Inspect `public/index.html`, `public/lite.html`, `public/data.js`, `public/zones.js`, `public/sw.js`, `api/narrate.js`, `api/forecast.js`, `tools/replay-case.mjs`, and the Vercel configuration.
4. Run the existing build and syntax checks.
5. Confirm that the old app still runs before creating the new version.
6. Write an audit note describing which code can be reused and which code must stay isolated.

Do not start by replacing the old planner. First understand and preserve the existing deterministic engine.

## 5. New product architecture

Create a clean architecture with these layers:

### A. Shared decision engine

Extract or wrap the existing deterministic engine into a reusable module if practical. The browser planner, sensor ingestion layer, simulator, replay script, and tests should call the same decision functions so they cannot drift apart.

If a full extraction would risk breaking the old app, initially create an adapter with explicit tests and document the duplication. Do not silently create a second conflicting set of agronomic rules.

### B. Field device layer

Implement a device abstraction that supports:

- Simulated readings for demos and CI.
- Bluetooth Low Energy or local Wi-Fi input if hardware is available.
- A documented JSON/HTTP ingestion path for a future ESP32.
- Device identity, reading timestamp, battery state if available, and connection status.
- Local buffering when offline.
- Last-known-value display with age and quality status.

Recommended first sensors:

- Capacitive soil-moisture sensor. Prefer capacitive over resistive because resistive probes corrode.
- BME280 or equivalent for air temperature and humidity.
- Soil temperature sensor if practical.
- Tipping-bucket rain gauge if time allows.
- Water-level sensor for low-plot/flood monitoring if time allows.

The first demonstrable MVP should work without physical hardware through a simulator.

### C. Store device layer

Implement a store monitoring abstraction for:

- Temperature.
- Relative humidity.
- Optional battery and connection state.
- Local alert thresholds.
- Reading timestamps and stale-data detection.

Integrate the store readings with the existing `R-STORE-05` concept. The UI should explain the condition and suggest a practical action such as drying or ventilating grain. Do not claim that a single sensor guarantees protection from all spoilage.

### D. Field + Store dashboard

Create a new dashboard with separate views:

1. **Plan:** current three-season rotation and alternatives.
2. **Live field:** latest field readings, trend charts, sensor status, and rules affected.
3. **Store watch:** temperature, humidity, risk status, and recent alerts.
4. **Devices:** connected devices, battery/connection state, calibration status, and last seen time.
5. **Demo mode:** simulated dry season, normal season, flood, and humid-store scenarios.
6. **Technical evidence:** raw readings, transformations, rule IDs, and decision trace.

Use plain language first. Make the technical evidence expandable rather than hiding it.

## 6. Sensor-to-rule mapping

Document and implement an explicit mapping. Suggested mapping:

- Soil moisture and rainfall history contribute to water context and may inform `R-WATER-01`.
- Air and soil temperature contribute to heat context and may inform `R-HEAT-03`.
- Water-level readings and low-plot status contribute to flood risk and may inform `R-FLOOD-04`.
- Store humidity and temperature contribute to storage risk and may inform `R-STORE-05`.
- Sensor readings must not directly rewrite crop parameters.
- Every triggered or affected rule must be visible to the user with a timestamp and the measured values behind it.

If the current decision engine only accepts coarse categorical inputs, implement a transparent calibration/translation layer. For example:

```text
raw sensor reading -> calibrated local unit -> quality check -> coarse planner input -> deterministic engine
```

Document the thresholds as configuration, not magic numbers hidden in UI code.

## 7. Hardware prototype target

Create a hardware documentation folder, for example:

```text
hardware/
  README.md
  field-node/
    README.md
    firmware/        # ESP32 firmware if implemented
    wiring.md
    bill-of-materials.md
  store-node/
    README.md
    wiring.md
    bill-of-materials.md
  simulator/
    README.md
    scenarios.json
```

The field-node proposal:

- ESP32.
- Capacitive soil-moisture sensor.
- BME280 or equivalent.
- Optional soil-temperature probe.
- Optional tipping-bucket rain gauge.
- Optional water-level sensor.
- Solar panel, charge controller, Li-ion battery, and weather-resistant enclosure.

The store-node proposal:

- ESP32 or equivalent low-power board.
- Temperature/humidity sensor positioned inside the grain store.
- Battery state measurement if practical.
- Optional GSM/SMS module for basic-phone alerts.

The system should be realistic for a cooperative or extension-worker deployment. Do not assume one expensive device per farmer.

If no physical parts are available, implement a simulator with the same message format as the future device. The simulator must be good enough for a live demo:

- Normal field.
- Drying soil.
- Heavy rain/flood risk.
- Hot field.
- Safe store.
- Humid store.
- Stale/disconnected device.

## 8. Device message contract

Define and document a stable JSON message format. Example:

```json
{
  "deviceId": "field-kano-coop-01",
  "deviceType": "field",
  "observedAt": "2026-11-19T12:00:00Z",
  "batteryPct": 82,
  "connection": "local",
  "readings": {
    "soilMoisturePct": 24.5,
    "soilTemperatureC": 31.2,
    "airTemperatureC": 35.8,
    "relativeHumidityPct": 42.0,
    "rainfallMm24h": 3.2,
    "waterLevelCm": 0
  },
  "quality": {
    "calibrated": false,
    "staleAfterMinutes": 120
  }
}
```

Example store message:

```json
{
  "deviceId": "store-kano-coop-01",
  "deviceType": "store",
  "observedAt": "2026-11-19T12:00:00Z",
  "batteryPct": 91,
  "connection": "local",
  "readings": {
    "temperatureC": 29.4,
    "relativeHumidityPct": 73.5
  },
  "quality": {
    "calibrated": false,
    "staleAfterMinutes": 120
  }
}
```

Use schema validation. Reject impossible values. Keep raw readings separate from derived planner inputs.

## 9. Offline and sync behavior

The new version must remain useful without internet:

- Cache the application shell.
- Store recent sensor readings locally where browser support allows.
- Display local connection status.
- Queue readings for later synchronization only when the user explicitly enables sync.
- Never upload exact coordinates by default.
- Make the local demo and simulator work without an account.
- Show the time of the last reading and whether it is stale.

If Bluetooth APIs are not supported by the browser, provide local Wi-Fi, file import, or simulator alternatives. Do not make the whole app unusable because one browser lacks BLE.

## 10. SMS and basic-phone extension

Treat SMS as a future or optional adapter, not a hidden dependency.

Define an alert adapter interface such as:

```text
alert(event, destination, channel)
```

Start with an in-app/local alert and a fake SMS provider for tests. Document how a GSM module or external SMS provider could later send messages.

Example alert:

```text
FieldShift alert: store humidity is high at 73%. Dry or ventilate grain and check the store today. Rule: R-STORE-05.
```

Do not send real SMS or incur paid external charges without explicit approval and configured credentials.

## 11. Forecast and AI integration

Keep the existing forecast API separate from the hardware ingestion layer.

- Forecasts remain advisory.
- Lag-Llama remains an optional private worker.
- Seasonal-naive fallback remains available.
- Sensor observations may be displayed alongside the forecast, but actual readings and forecasts must be visually distinguished.
- Never imply that a forecast is an observed measurement.
- AI may explain sensor readings and rule traces but may not modify them.

The model-research conclusion from the old project is:

- IBM Granite TTM is a strong longer-term compact-worker candidate.
- Lag-Llama is the current lightweight probabilistic worker scaffold.
- Chronos-2 is a strong connected multivariate demo candidate.
- TimesFM is useful for connected zero-shot univariate forecasting.
- TimeGPT is convenient but proprietary and remote.
- Moirai Small has licensing and covariate limitations for this use case.

Do not implement or fine-tune every model. Use one simple baseline first and benchmark any model against persistence and seasonal-naive baselines.

## 12. Demo scenario

Create a polished demo called **Malam Sani: plan, watch, protect**. Mark it everywhere as a fictional example scenario.

Scenario:

- Kano.
- Low plot.
- No irrigation.
- Poor storage.
- Previous rotation: maize → maize → groundnut.
- Market preferences: cowpea, pearl millet, sesame.
- Drought-stress replay: current plan 65/100.
- Top alternative: pearl millet → cowpea → sesame at 89/100.
- Heavy flood replay: alternative is gated and falls to 6/100.

Demo sequence:

1. Enter the farmer profile.
2. Show the pre-planting plan and why the current rotation is weaker.
3. Turn on “drying soil” in the simulator.
4. Show the live field reading and the affected rule.
5. Turn on “humid store.”
6. Show `R-STORE-05` and a plain-language action.
7. Disconnect the simulated device.
8. Show stale-data status and safe offline behavior.
9. Switch to Lite mode and show the short result.

Do not present the 65/89 scores as real yield or income evidence.

## 13. Professional documentation requirements

Create a new top-level README that lets a stranger understand and run the project. It must include:

- One-paragraph product explanation.
- Screenshot or simple architecture diagram if available.
- Why rules decide and AI explains.
- Full application features.
- Field + Store hardware concept.
- Exact demo scenario.
- Hardware bill of materials.
- Wiring and enclosure notes.
- Device message schema.
- Simulator instructions.
- Local development instructions.
- Environment variable names without secret values.
- Production deployment instructions.
- Offline behavior.
- Data privacy.
- Calibration and safety limitations.
- Forecast architecture.
- Testing commands.
- Troubleshooting.
- Roadmap.
- Clear distinction between implemented, simulated, and planned features.

Also create:

- `ARCHITECTURE.md`: system diagrams and data flow.
- `HARDWARE.md`: field node and store node build plan.
- `DEMO.md`: exact live-demo steps and fallback steps.
- `API.md`: device message schema and API contracts.
- `VALIDATION.md`: test strategy, calibration plan, and agronomic evaluation plan.
- `SECURITY.md`: secret handling, privacy, device authentication, and SMS safety.
- `CHANGELOG.md`: what was inherited and what was added.
- Updated `AGENT.md`: complete continuation handoff for the new version.

Use plain language in the public README and technical detail in the supporting documents.

## 14. Testing requirements

Add automated tests for:

- Existing deterministic decision behavior.
- Sensor payload schema validation.
- Impossible/out-of-range sensor readings.
- Stale-device detection.
- Offline/local storage behavior where testable.
- Field-to-rule translation.
- Store humidity alert behavior.
- Flood safety gate behavior.
- Forecast separation from the decision engine.
- Simulator scenarios.
- Lite mode smoke behavior.

Required commands should include something like:

```bash
npm run build
npm test
node --check api/narrate.js
node --check api/forecast.js
node --check tools/replay-case.mjs
git diff --check
```

Do not report tests as passing unless they actually ran. If a hardware test cannot run without physical parts, label it clearly as a simulator or static validation.

## 15. Git and deployment workflow

Before implementation, create a new branch or separate repository. Preserve the old project.

Use commits with clear messages, for example:

```text
Create Field + Store project shell
Extract shared decision engine
Add field sensor simulator
Add store monitoring and R-STORE-05 alerts
Add hardware documentation and demo
Add professional handoff and validation plan
```

Do not commit secrets. Use environment variables or connector-managed secrets. Do not print secret values in logs.

If deploying to Vercel:

- Use the new project name or a clearly separate project.
- Confirm the deployment target before publishing.
- Run a production smoke test.
- Keep the old `fieldshift-ng.vercel.app` deployment untouched unless explicitly asked to replace it.

## 16. Success criteria

The work is complete only when:

- The old repository remains recoverable.
- The new version starts locally from a clean checkout.
- A stranger can understand the system from the README.
- A simulator can reproduce field and store scenarios without hardware.
- The deterministic engine remains the recommendation authority.
- The dashboard shows raw readings, timestamps, stale status, and affected rule IDs.
- The store scenario demonstrates a clear `R-STORE-05` alert.
- The flood scenario demonstrates a safety gate.
- Lite mode still gives a quick result.
- Forecasts and AI are visibly advisory.
- Tests and replay scripts run successfully.
- Hardware documentation is realistic and does not imply unbuilt hardware exists.
- The new handoff explains exactly what is implemented, simulated, and planned.
- GitHub contains the source, documentation, simulator scenarios, and reproducible demo data.

## 17. Final response required from the implementing agent

At the end, report:

1. Old repository path and commit used as the source.
2. New repository/path and current commit.
3. Exact files created or changed.
4. What is implemented versus simulated versus planned.
5. Hardware supported and hardware not tested.
6. Test commands and their real results.
7. Local run instructions.
8. Deployment URL, if deployed.
9. Known limitations.
10. Links to the new README, architecture, hardware guide, demo guide, validation guide, security guide, and `AGENT.md`.

Never claim that the system has real-world farmer impact unless the project contains a real, documented evaluation with verified data.
