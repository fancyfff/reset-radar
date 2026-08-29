"""Confidence components for recovery estimates."""

def score(intervals, mad_hours, calibration=0.65):
    if not intervals:
        return 0.2
    cycle = sum(intervals) / len(intervals)
    stability = max(0.15, min(1.0, 1 - mad_hours / max(cycle, 1)))
    sample = min(1.0, len(intervals) / 8)
    # Historical config points are not as strong as repeated observed records.
    source_quality = 0.55
    return round(stability * sample * source_quality * calibration, 2)
