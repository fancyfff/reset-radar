"""Robust normal-quota recovery forecasting."""

from datetime import timedelta
from statistics import median


def weighted_median(values):
    """Recent intervals carry more weight without allowing one outlier to dominate."""
    if not values:
        return 48.0
    expanded = []
    for index, value in enumerate(values):
        expanded.extend([value] * (index + 1))
    return float(median(expanded))


def forecast(last_reset, intervals, now):
    cycle = weighted_median(intervals[-10:])
    deviations = [abs(item - cycle) for item in intervals]
    mad = float(median(deviations)) if deviations else cycle * 0.25
    expected = last_reset + timedelta(hours=cycle)
    while expected < now:
        expected += timedelta(hours=cycle)
    # MAD is robust to individual abnormal resets. Keep a useful minimum interval.
    spread = max(0.5, mad * 1.8)
    return {
        "cycle_hours": round(cycle, 2),
        "mad_hours": round(mad, 2),
        "expected_at": expected,
        "p50": expected,
        "p80": expected + timedelta(hours=spread),
        "p95": expected + timedelta(hours=spread * 2),
    }
