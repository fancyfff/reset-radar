"""V2 normalization: Provider → Product → Window → State/Event/Observation/Forecast."""

from datetime import datetime, timezone

from models.confidence import score as confidence_score
from models.hazard import probability as hazard_probability
from models.recovery import forecast as recovery_forecast


PROVIDERS = {
    "codex": ("openai", "OpenAI", "https://openai.com/"),
    "claude": ("anthropic", "Anthropic", "https://www.anthropic.com/"),
    "grok": ("xai", "xAI", "https://x.ai/"),
    "kimi": ("moonshot", "Moonshot AI", "https://www.moonshot.cn/"),
    "minimax": ("minimax", "MiniMax", "https://www.minimax.io/"),
    "antigravity": ("google", "Google", "https://google.com/"),
    "qwen_code": ("alibaba", "Alibaba Cloud", "https://www.alibabacloud.com/"),
}


def iso(value):
    return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def source(value, url=""):
    mapping = {"manual": "observed", "github": "community", "statuspage": "official", "auto": "estimated"}
    kind = mapping.get(value or "seed", value or "seed")
    return {"type": kind, "provider": value or "seed", "url": url or None}


def signal_type(kind):
    return {
        "model_release": "official_announcement",
        "announcement": "official_announcement",
        "community": "community_report",
        "service": "service_anomaly",
    }.get(kind, "community_report")


def build(now, platform_inputs, service_status, speakers):
    """Build a self-contained V2 dataset from normalized legacy collection results."""
    providers, products, windows, states = [], [], [], []
    events, observations, signals, forecasts, anomalies = [], [], [], [], []
    seen_providers = set()

    for item in platform_inputs:
        pid, cfg, resets, raw_signals, data_source = item
        provider_id, provider_name, homepage = PROVIDERS.get(pid, (pid, cfg.get("name", pid), ""))
        if provider_id not in seen_providers:
            providers.append({
                "id": provider_id, "name": {"en": provider_name, "zh": provider_name},
                "logo": cfg.get("logo", ""), "homepage": homepage,
                "status_url": cfg.get("status_base", ""), "enabled": True,
            })
            seen_providers.add(provider_id)
        products.append({
            "id": pid, "provider_id": provider_id,
            "name": {"en": cfg.get("name", pid), "zh": cfg.get("name", pid)},
            "icon": cfg.get("icon", "⚡"), "logo": cfg.get("logo", ""), "category": "coding_agent",
            "tracking": {"global_events": True, "account_usage": True, "community_reports": True},
            "official": {"usage_url": "", "docs_url": ""}, "data_source": data_source,
        })
        primary_window = f"{pid}_primary"
        windows.append({
            "id": primary_window, "product_id": pid,
            "name": {"en": "Usage cycle", "zh": "额度周期"},
            "window_type": "scheduled", "reset_behavior": "scheduled",
            "observable": True, "prediction_enabled": True,
        })
        if cfg.get("weekly_quota"):
            windows.append({
                "id": f"{pid}_weekly", "product_id": pid,
                "name": {"en": "Weekly usage", "zh": "每周额度"},
                "window_type": "weekly", "reset_behavior": "scheduled",
                "observable": False, "prediction_enabled": False,
            })

        parsed = sorted(((parse_time(row["time"]), row) for row in resets), key=lambda item: item[0])
        reset_points = [(dt, row) for dt, row in parsed if row.get("type", "reset") == "reset"]
        regular = [(dt, row) for dt, row in reset_points if not row.get("is_extra")]
        cycle_points = regular if len(regular) >= 2 else reset_points
        intervals = [(cycle_points[i][0] - cycle_points[i - 1][0]).total_seconds() / 3600 for i in range(1, len(cycle_points))]
        last_reset = reset_points[-1][0]
        recovery = recovery_forecast(last_reset, intervals, now)
        confidence = confidence_score(intervals, recovery["mad_hours"])

        for dt, row in parsed:
            record_source = source(row.get("source"))
            if row.get("type") == "no_reset":
                observations.append({
                    "id": f"obs_{pid}_{dt.strftime('%Y%m%d%H%M')}", "product_id": pid,
                    "observed_at": iso(dt), "observation_type": "no_reset_observed",
                    "value": {"candidate_at": iso(dt), "result": "not_reset"},
                    "source": record_source, "confidence": 0.8 if record_source["type"] == "observed" else 0.4,
                })
                continue
            extra = bool(row.get("is_extra"))
            events.append({
                "id": f"evt_{pid}_{dt.strftime('%Y%m%d%H%M')}", "product_id": pid,
                "event_type": "global_reset" if extra else "regular_reset",
                "scope": {"type": "global" if extra else "account"}, "effective_at": iso(dt),
                "detected_at": iso(dt), "announced_at": None, "reset_kind": "extra" if extra else "regular",
                "status": "confirmed" if record_source["type"] == "observed" else "seed",
                "reason": row.get("reason"), "source": record_source,
                "confidence": 0.95 if record_source["type"] == "observed" else 0.45,
            })

        product_signals = []
        for index, raw in enumerate(raw_signals):
            raw_source = source(raw.get("source"), raw.get("url", ""))
            evidence = {
                "freshness": 0.95 if raw.get("source") else 0.5,
                "independence": 0.7 if raw.get("source") else 0.35,
                "strength": 0.8 if raw.get("source") else 0.35,
            }
            item_signal = {
                "id": f"sig_{pid}_{index}_{now.strftime('%Y%m%d%H%M')}", "product_id": pid,
                "type": signal_type(raw.get("kind")), "occurred_at": iso(now),
                "direction": "decrease" if raw.get("kind") == "service" else "increase",
                "features": {"reset_related": raw.get("kind") != "service", "quota_related": True,
                             "severity": 0.65 if raw.get("kind") in ("announcement", "model_release") else 0.3},
                "text": raw.get("text", ""), "source": raw_source, "evidence": evidence,
                "freshness": evidence["freshness"],
            }
            signals.append(item_signal)
            product_signals.append(item_signal)

        extra_events = [dt for dt, row in reset_points if row.get("is_extra")]
        hazard, evidence = hazard_probability(extra_events, reset_points[0][0], now, product_signals)
        expected_at = recovery["expected_at"]
        # Public sources cannot inspect a visitor's account quota. Never infer
        # availability from a release, a status page, or a seed cycle.
        states.append({
            "product_id": pid, "availability": "unknown", "overall_state": "unknown", "updated_at": iso(now),
            "windows": [{"window_id": primary_window, "state": "available", "reset_at": iso(expected_at),
                         "countdown_seconds": max(0, int((expected_at - now).total_seconds())),
                         "usage_percent": None, "confidence": confidence,
                         "source": "estimated" if data_source != "live" else "observed"}],
        })
        forecasts.extend([
            {"id": f"fc_recovery_{pid}_{now.strftime('%Y%m%d%H%M')}", "product_id": pid,
             "target": {"type": "normal_recovery", "window_id": primary_window}, "generated_at": iso(now),
             "prediction": {"expected_at": iso(expected_at), "interval": {"p50": iso(recovery["p50"]), "p80": iso(recovery["p80"]), "p95": iso(recovery["p95"])}},
             "model": {"name": "robust_recovery_v1", "version": "1.0"},
             "evidence": {"observed_cycles": len(intervals), "median_cycle_hours": recovery["cycle_hours"], "mad_hours": recovery["mad_hours"]},
             "confidence": confidence, "resolution": {"status": "pending"}},
            {"id": f"fc_hazard_{pid}_{now.strftime('%Y%m%d%H%M')}", "product_id": pid,
             "target": {"type": "global_reset", "horizon_hours": 24}, "generated_at": iso(now),
             "prediction": {"probability": hazard, "expected_at": None, "interval": {"p50": None, "p80": None, "p95": None}},
             "model": {"name": "hazard_v1", "version": "1.0"}, "evidence": evidence,
             "calibration": {"status": "experimental"}, "resolution": {"status": "pending"}},
        ])

    return {
        "schema_version": "2.0", "generated_at": iso(now),
        "data_freshness": {"status": "fresh", "max_age_seconds": 1800,
                            "sources_ok": len(platform_inputs), "sources_failed": 0},
        "providers": providers, "products": products, "windows": windows, "current_state": states,
        "events": events, "observations": observations, "signals": signals, "forecasts": forecasts,
        "anomalies": anomalies, "service_status": service_status, "speakers": speakers,
        "meta": {"migration": "v2", "legacy_schema_supported": False},
    }
