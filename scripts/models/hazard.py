"""Extra/global reset hazard model; separate from normal recovery forecasting."""

import math


RELIABILITY = {"official": 0.98, "observed": 0.9, "community": 0.55, "seed": 0.35}


def probability(extra_events, first_event, now, signals):
    """Return P(global extra reset in 24h) and transparent evidence metrics."""
    span_hours = max(24.0, (now - first_event).total_seconds() / 3600.0)
    base_lambda = len(extra_events) / span_hours
    signal_score = 0.0
    independent = set()
    for signal in signals:
        source = signal.get("source", {})
        source_type = source.get("type", "seed") if isinstance(source, dict) else "seed"
        evidence = signal.get("evidence", {})
        reliability = RELIABILITY.get(source_type, 0.35)
        freshness = float(evidence.get("freshness", 0.5))
        independence = float(evidence.get("independence", 0.5))
        impact = float(signal.get("features", {}).get("severity", 0.35))
        direction = 1 if signal.get("direction") == "increase" else -0.45
        signal_score += direction * reliability * freshness * independence * impact
        independent.add(source.get("url") or source.get("provider") or source_type)
    # Signals modulate the base hazard, rather than adding fixed percentage points.
    rate = max(0.0001, base_lambda * math.exp(max(-1.0, min(1.0, signal_score))))
    value = 1 - math.exp(-rate * 24)
    return round(min(0.95, value), 4), {
        "historical_events": len(extra_events),
        "recent_signals": len(signals),
        "independent_sources": len(independent),
        "signal_score": round(signal_score, 3),
    }
