# -*- coding: utf-8 -*-
"""
Reset Radar 主采集与预测脚本。

实现设计文档（v2.0）的"周期基线 + 信号加权 + 重置类型分类"规则引擎：
  1) 自然周期候选点：avg_cycle（排除额外重置）/ time_since_last -> base_probability (上限 70%)
  2) 信号加权：扫描近24h信号，按类型调整概率
  3) 置信度：1 - cycle_stddev/avg_cycle，区间 [30, 99]
  4) 重置类型分类：常规重置（计入周期）/ 额外重置（不计入周期）/ 未重置（仅记录）
  5) 精确倒计时：prediction_time = last_reset + avg_cycle；countdown_seconds
  6) 生成研判日志、候选事件、重置原因、历史记录、周额度趋势、发言雷达
  7) 写入 data/data.json（同时刷新 data/fallback.js 供本地预览）

信号来源（scripts/fetchers.py，免费、免登录、真实）：
  - GitHub Releases API   -> model_release 信号（真实版本 + 发布时间）
  - Statuspage v2 Incidents -> service / 官方事件信号
  - 上述失败则回退到 config.py 中人工补充的 signals 种子

重置记录（resets）：无公开免费源发布，需人工/实测维护，见 config.PLATFORMS[pid]["resets"]
与 config.MANUAL_RESETS / data/resets.json（scripts/record_reset.py 追加）。
发言雷达（speakers）：见 scripts/speaker_monitor.py（默认种子，可选 X API）。
"""

import json
import os
import statistics
from datetime import datetime, timezone, timedelta

import config
import fetchers
import speaker_monitor

# ---------- 路径 ----------
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_DIR = os.path.join(ROOT, "data")
DATA_JSON = os.path.join(DATA_DIR, "data.json")
FALLBACK_JS = os.path.join(DATA_DIR, "fallback.js")
RESETS_JSON = os.path.join(DATA_DIR, "resets.json")

# ---------- 规则参数 ----------
BASE_WEIGHT = 0.70          # 周期基线占满额度的 70%
ADJ = {                      # 信号调整幅度（百分点）
    "official_up": 30,       # 重置 / 恢复额度 / 额度已恢复
    "official_down": -20,    # 限额延长 / 限额提高 / 延期
    "model_release": 10,     # 新版本 / CLI发布 / 模型发布
    "milestone": 10,         # 里程碑临近 / 用户量接近整数关口
    "community": 5,          # 社区额度恢复反馈（API来源）
    "service": 0,            # 服务故障已恢复，不调整额度
}

# 重置类型自动判定：原因含以下关键词 → 标记为「额外重置」（不计入平均周期）
MILESTONE_KW = ("庆祝", "里程碑", "milestone", "达到", "突破")
# 预测窗口：期望重置点前后各 2 小时（readme 5.2）
RESET_WINDOW_H = 2.0

# 公告关键词 -> 调整类型
ANNOUNCE_UP = ["重置", "恢复额度", "额度已恢复", "已重置"]
ANNOUNCE_DOWN = ["限额延长", "限额提高", "延期"]


def parse_iso(s):
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
    raise ValueError("无法解析时间: " + s)


def classify_announcement(text):
    for kw in ANNOUNCE_DOWN:
        if kw in text:
            return "official_down"
    for kw in ANNOUNCE_UP:
        if kw in text:
            return "official_up"
    return None


def signal_adjustment(sig):
    kind = sig.get("kind")
    text = sig.get("text", "")
    if kind == "announcement":
        t = classify_announcement(text)
        return ADJ.get(t, 0) if t else 0
    return ADJ.get(kind, 0)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


# ---------- 信号 / 重置记录 的真实源构建 ----------
def build_signals(pid, cfg):
    """自动抓取真实信号，并与 config 里的人工补充信号合并。"""
    sigs = []
    for s in cfg.get("signals", []):          # 人工补充（种子）
        sigs.append(dict(s))

    # 1) GitHub Releases -> model_release（真实）
    repo = cfg.get("github_repo", "")
    if repo:
        for rel in fetchers.fetch_github_releases(repo, 5):
            sigs.append({
                "kind": "model_release",
                "text": f"GitHub 发布 {rel['name']}（{rel['published_at'].strftime('%Y-%m-%d')}）",
                "source": "github",
                "url": rel["html_url"],
            })

    # 2) Statuspage Incidents -> service / 官方事件（真实）
    base = cfg.get("status_base", "")
    if base:
        for inc in fetchers.fetch_statuspage_incidents(base, 6):
            sigs.append({
                "kind": "service",
                "text": f"官方状态：{inc['name']}（{inc['status']}, {inc['updated_at'].strftime('%Y-%m-%d')}）",
                "source": "statuspage",
                "url": inc["shortlink"],
            })
    return sigs


def build_resets(pid, cfg):
    """构建规范化重置记录列表（含 type/reason/is_extra/source），按时间倒序。

    来源：config.resets（种子） + MANUAL_RESETS + data/resets.json（实测）。
    """
    resets = []

    def add(time_str, reason, is_extra, rtype, src):
        resets.append({
            "time": time_str,
            "reason": reason,
            "is_extra": bool(is_extra),
            "type": rtype,            # "reset" / "no_reset"
            "source": src,
        })

    # 1) config.resets 种子
    for r in cfg.get("resets", []) or []:
        add(r.get("time"), r.get("reason", "常规周期重置"),
            r.get("is_extra", False), r.get("type", "reset"), "seed")

    # 2) MANUAL_RESETS
    for r in getattr(config, "MANUAL_RESETS", []) or []:
        if r.get("id") == pid and r.get("time"):
            add(r["time"], r.get("reason", "实测重置"), r.get("is_extra", False),
                r.get("type", "reset"), "manual")

    # 3) data/resets.json（实测，优先）
    if os.path.exists(RESETS_JSON):
        try:
            for r in json.load(open(RESETS_JSON, encoding="utf-8")):
                if r.get("id") == pid and r.get("time"):
                    add(r["time"], r.get("reason", "实测重置"), r.get("is_extra", False),
                        r.get("type", "reset"), "observed")
        except Exception as e:
            print(f"  [warn] 读取 resets.json 失败: {e}")

    # 去重（同时间同 source 只留一条），按时间倒序
    seen = set()
    uniq = []
    for r in resets:
        k = (r["time"], r["source"])
        if k in seen:
            continue
        seen.add(k)
        uniq.append(r)
    uniq.sort(key=lambda x: parse_iso(x["time"]), reverse=True)
    return uniq


def compute_platform(pid, cfg, now, resets, signals):
    if not resets:
        raise ValueError(f"{pid}: 缺少重置记录")

    # 解析时间，升序排列
    parsed = [(parse_iso(r["time"]), r) for r in resets]
    parsed.sort(key=lambda x: x[0])

    # 重置类型自动判定（readme 5.2 第1条）：原因含「庆祝/里程碑/达到/突破」→ 额外重置
    for _, r in parsed:
        if r["type"] == "reset" and any(k in r.get("reason", "") for k in MILESTONE_KW):
            r["is_extra"] = True

    # 最近一次「重置」事件（含额外重置）→ 用于预测基准点
    reset_events = [p for p in parsed if p[1]["type"] == "reset"]
    if not reset_events:
        raise ValueError(f"{pid}: 无重置事件")
    last_dt, last_meta = reset_events[-1]

    # 平均周期：仅用「常规重置」（排除额外重置）；不足则退回全部重置
    regular = [dt for dt, r in reset_events if not r["is_extra"]]
    cycle_src = regular if len(regular) >= 2 else [dt for dt, _ in reset_events]
    cycle_src = sorted(cycle_src)
    # 最近 11 个重置点 -> 最多 10 个连续间隔
    points = cycle_src[-11:] if len(cycle_src) >= 11 else cycle_src
    intervals = [(points[i] - points[i - 1]).total_seconds() / 3600.0 for i in range(1, len(points))] if len(points) >= 2 else []
    avg_cycle = statistics.mean(intervals) if intervals else 48.0
    stddev = statistics.pstdev(intervals) if len(intervals) > 1 else 0.0

    # 重置类型自动判定（readme 5.2 第3条）：每条常规重置的预测点已过窗口(±2h)
    # 且该时间点没有任何记录 → 自动追加一条「不重置」记录（仅用于展示，不参与周期计算）。
    # 遍历全部常规重置（含最新一条），从而覆盖「上次预测已过却未重置」的情况。
    auto_no_resets = []
    for i in range(len(parsed)):
        rec = parsed[i][1]
        if rec["type"] != "reset" or rec["is_extra"]:
            continue  # 只对常规重置推导下一候选点
        expected = parsed[i][0] + timedelta(hours=avg_cycle)
        covered = any(
            abs((dt - expected).total_seconds()) <= RESET_WINDOW_H * 3600
            for dt, _ in parsed
        )
        if not covered and expected + timedelta(hours=RESET_WINDOW_H) < now:
            auto_no_resets.append({
                "time": expected.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "type": "no_reset",
                "reason": "周期候选点未发生重置（自动判定）",
                "is_extra": False,
                "source": "auto",
            })

    since_h = max(0.0, (now - last_dt).total_seconds() / 3600.0)
    base = min(since_h / avg_cycle, 1.0) * BASE_WEIGHT * 100.0

    # 信号加权
    total_adj = 0
    model_signals, community_signals = [], []
    has_model_release = False
    for sig in signals:
        adj = signal_adjustment(sig)
        total_adj += adj
        kind = sig.get("kind")
        if kind == "model_release":
            model_signals.append(sig.get("text", ""))
            has_model_release = True
        elif kind == "community":
            community_signals.append(sig.get("text", ""))
        elif kind == "announcement":
            model_signals.append(sig.get("text", ""))

    prob = clamp(round(base + total_adj), 0, 100)

    # 置信度
    if avg_cycle > 0:
        conf = (1 - stddev / avg_cycle) * 100.0
    else:
        conf = 50.0
    conf = round(clamp(conf, 30, 99))

    # 信号强度（徽章）
    if prob >= 70:
        strength = "high"
    elif prob >= 40:
        strength = "medium"
    else:
        strength = "low"
    # 信号等级（状态文字）
    signal_level = "observing" if prob >= 40 else "cooling"

    # 预测时间 + 倒计时
    prediction_time = last_dt + timedelta(hours=avg_cycle)
    countdown_seconds = max(0, int((prediction_time - now).total_seconds()))
    # 预测窗口：期望重置点前后各 6 小时
    start = (prediction_time - timedelta(hours=6)).strftime("%H:%M")
    end = (prediction_time + timedelta(hours=6)).strftime("%H:%M")

    # 上次重置（含原因 / 额外重置标记）
    last_reset = {
        "time": last_dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "reason": last_meta.get("reason", "常规周期重置"),
        "reason_type": last_meta.get("reason_type", "normal" if not last_meta["is_extra"] else "milestone"),
        "is_extra_reset": bool(last_meta["is_extra"]),
    }

    # 文案
    hours_left = round(since_h - avg_cycle, 1)
    base_pct = round(base)
    judgment = (
        f"自然周期候选点约{abs(hours_left)}小时{'后' if hours_left < 0 else '前'}；"
        f"历史24小时底座{base_pct}%。"
    )
    if last_meta["is_extra"]:
        judgment += f"上次重置为额外重置（{last_meta.get('reason','')}），不计入平均周期；"
    if has_model_release:
        judgment += "官方发布信号带动概率上调；"
    if total_adj < 0:
        judgment += "官方公告触发下调，压低短期概率；"
    judgment += "没有官方重置预告或落地确认，因此不能标记为official_confirmed。" if prob < 70 else "尚无官方确认，仅周期与信号驱动。"

    summary = (
        "未来24小时重置概率较高，但目前只有周期与信号，尚无官方确认。"
        if prob >= 70 else
        "当前处于额度冷却/观察期，未来24小时重置概率有限，建议合理安排重负载任务。"
    )
    quota_cycle = f"自然周期候选点约{round(avg_cycle,1)}小时周期（排除额外重置）；历史底座{base_pct}%；官方重置公告暂无新信号。"

    candidate_events = [{
        "type": "full_reset",
        "confidence": round(prob / 100.0, 2),
        "description": "自然周期推算的候选额度恢复时点，并非官方重置预告。",
    }]
    if has_model_release:
        candidate_events.append({
            "type": "model_release",
            "confidence": 0.98,
            "description": "官方发布信号；该发布尚未伴随额度重置确认。",
        })

    history_out = [{
        "time": r["time"],
        "type": r["type"],
        "reason": r.get("reason", "常规周期重置"),
        "is_extra": bool(r["is_extra"]),
        "source": r["source"],
    } for _, r in parsed]
    history_out.extend(auto_no_resets)          # 合并自动判定的「不重置」记录
    history_out.sort(key=lambda x: parse_iso(x["time"]), reverse=True)  # 最新在上

    return {
        "id": pid,
        "name": cfg.get("name", pid),
        "icon": cfg.get("icon", "⚡"),
        "logo": cfg.get("logo", ""),
        "probability": prob,
        "signal_strength": strength,
        "signal_level": signal_level,
        "prediction_time": prediction_time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "countdown_seconds": countdown_seconds,
        "prediction_window": {"start": start, "end": end},
        "confidence": conf,
        "status": "normal",
        "last_reset": last_reset,
        "detail": {
            "judgment": judgment,
            "summary": summary,
            "model_signals": model_signals,
            "community_signals": community_signals,
            "quota_cycle": quota_cycle,
            "candidate_events": candidate_events,
            "history": history_out,
            "weekly_quota": cfg.get("weekly_quota"),
        },
    }


def maybe_refresh_service_status():
    """尽力请求官方状态 API，失败则沿用配置种子。"""
    statuses = []
    for g in config.SERVICE_STATUS:
        item = dict(g)
        base = None
        for pid, cfg in config.PLATFORMS.items():
            if pid == g.get("platform_id") and cfg.get("status_base"):
                base = cfg.get("status_base")
                break
        if base:
            indicator = fetchers.fetch_statuspage_status(base)
            if indicator in ("none", "ok"):
                item["status"] = "operational"
            elif indicator == "minor":
                item["status"] = "degraded"
            elif indicator in ("major", "critical"):
                item["status"] = "recovered"
            elif indicator is None:
                pass  # 抓取失败，沿用种子
        statuses.append(item)
    return statuses


def main():
    now = datetime.now(timezone.utc)
    print(f"[Reset Radar] 开始计算 @ {now.isoformat()}")
    platforms = []
    for pid, cfg in config.PLATFORMS.items():
        try:
            resets = build_resets(pid, cfg)
            signals = build_signals(pid, cfg)
            p = compute_platform(pid, cfg, now, resets, signals)
            platforms.append(p)
            print(f"  - {p['name']:<12} prob={p['probability']:>3}%  conf={p['confidence']:>2}  {p['signal_strength']}  "
                  f"countdown={p['countdown_seconds']}s  signals={len(signals)}")
        except Exception as e:
            print(f"  [error] {pid}: {e}")

    service_status = maybe_refresh_service_status()
    speakers = speaker_monitor.build_speakers(now)

    out = {
        "last_updated": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "platforms": platforms,
        "service_status": service_status,
        "speakers": speakers,
    }

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"[ok] 已写入 {DATA_JSON}")

    # 同步 fallback.js 供本地 file:// 预览
    with open(FALLBACK_JS, "w", encoding="utf-8") as f:
        f.write("window.RADAR_DATA_FALLBACK=" + json.dumps(out, ensure_ascii=False) + ";")
    print(f"[ok] 已写入 {FALLBACK_JS}  ·  发言雷达账号 {len(speakers)} 个")


if __name__ == "__main__":
    main()
