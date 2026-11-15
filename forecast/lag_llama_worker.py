"""Optional Lag-Llama worker for FieldShift NG.

Run with:
  pip install -r forecast/requirements.txt
  uvicorn forecast.lag_llama_worker:app --host 0.0.0.0 --port 8000

The Vercel API proxies to this worker only when FORECAST_WORKER_URL is set.
The browser never receives model credentials or calls the worker directly.
"""
from __future__ import annotations

import os
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(title="FieldShift Lag-Llama advisory worker")
_predictor = None


class ForecastRequest(BaseModel):
    values: list[float] = Field(min_length=6, max_length=2000)
    horizon: int = Field(default=3, ge=1, le=12)
    frequency: str = "monthly"
    target: str = "rainfall"


def predictor():
    global _predictor
    if _predictor is not None:
        return _predictor
    try:
        import torch
        from lag_llama.gluon.estimator import LagLlamaEstimator
        from lag_llama.gluon_modules import LagLlama
        from gluonts.dataset.common import ListDataset
        from gluonts.dataset.field_names import FieldName
        from gluonts.model.forecast import SampleForecast
        import pandas as pd
    except ImportError as exc:
        raise RuntimeError("Install forecast/requirements.txt to enable Lag-Llama") from exc

    checkpoint = os.getenv("LAG_LLAMA_CHECKPOINT", "lag-llama.ckpt")
    if not os.path.exists(checkpoint):
        raise RuntimeError("Set LAG_LLAMA_CHECKPOINT to a downloaded Lag-Llama checkpoint")

    # Keep imports and model loading lazy so health checks and fallback operation stay cheap.
    net = LagLlama.load_from_checkpoint(checkpoint, map_location="cpu")
    estimator = LagLlamaEstimator(
        ckpt_path=checkpoint,
        prediction_length=12,
        context_length=36,
        input_size=1,
        batch_size=1,
        num_parallel_samples=100,
        device="cpu",
    )
    _predictor = (net, estimator, ListDataset, FieldName, SampleForecast, pd, torch)
    return _predictor


@app.get("/")
def health() -> dict[str, Any]:
    return {"ready": True, "model": "lag-llama", "advisoryOnly": True}


@app.post("/")
def forecast(body: ForecastRequest) -> dict[str, Any]:
    try:
        _, estimator, ListDataset, FieldName, _, pd, _ = predictor()
        horizon = body.horizon
        # Lag-Llama expects a dated target series. A synthetic monthly index is used
        # only because FieldShift currently sends climatology values without dates.
        start = pd.Timestamp("2000-01-01")
        dataset = ListDataset([{
            FieldName.START: start,
            FieldName.TARGET: body.values,
        }], freq="MS")
        pred = next(iter(estimator.predict(dataset)))
        samples = pred.samples[:, :horizon]
        quantiles = {
            "low": samples.quantile(0.1, axis=0),
            "point": samples.mean(axis=0),
            "high": samples.quantile(0.9, axis=0),
        }
        return {
            "model": "lag-llama",
            "advisoryOnly": True,
            "fallback": False,
            "forecast": [
                {"period": i + 1, "point": round(max(0, float(quantiles["point"][i])), 1),
                 "low": round(max(0, float(quantiles["low"][i])), 1),
                 "high": round(max(0, float(quantiles["high"][i])), 1)}
                for i in range(horizon)
            ],
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
