/**
 * Client-side helpers aligned with backend v2 enrichment: any numeric telemetry keys,
 * not a fixed sensor list. Authoritative analytics stay on the server.
 */

export function isNumericSample(v) {
  if (v === null || v === undefined || typeof v === "boolean") return false;
  const n = Number(v);
  return !Number.isNaN(n);
}

/** Extract numeric fields from a flat reading (skips keys starting with _). */
export function perKeyNumericSnapshot(reading = {}) {
  const out = {};
  for (const [k, v] of Object.entries(reading)) {
    if (k.startsWith("_")) continue;
    if (isNumericSample(v)) out[k] = Number(v);
  }
  return out;
}

export function exponentialMovingAverage(series, alpha = 0.35) {
  if (!Array.isArray(series) || series.length === 0) return [];
  const out = [];
  let ema = Number(series[0]);
  out.push(ema);
  for (let i = 1; i < series.length; i++) {
    const x = Number(series[i]);
    ema = alpha * x + (1 - alpha) * ema;
    out.push(ema);
  }
  return out;
}

export function simpleMovingAverage(series, window) {
  if (!Array.isArray(series) || window < 1) return [];
  const out = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1).map(Number);
    out.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return out;
}

export function rateOfChangeSeries(series) {
  if (!Array.isArray(series) || series.length < 2) return [];
  const out = [0];
  for (let i = 1; i < series.length; i++) {
    out.push(Number(series[i]) - Number(series[i - 1]));
  }
  return out;
}

/** Build threshold-style flags from per-key z-scores (matches backend `thresholds`). */
export function zscoreAlertFlags(zByKey, thresholdAbs = 3) {
  const flags = {};
  if (!zByKey || typeof zByKey !== "object") return flags;
  for (const [k, z] of Object.entries(zByKey)) {
    const zz = Number(z);
    if (!Number.isNaN(zz) && Math.abs(zz) >= thresholdAbs) {
      flags[`${k}_statistical_spike`] = zz;
    }
  }
  return flags;
}
