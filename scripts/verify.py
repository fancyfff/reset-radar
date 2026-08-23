# -*- coding: utf-8 -*-
"""概率 / 预测时间正确性校验脚本。

原理：直接复用 update.py 的 compute_platform（同一套公式，零逻辑重复），
把「抓真实信号」这一步换成从已生成的 data/data.json + config.py 确定性重建：
  - config 里人工补充的信号（无 source）按种子保留；真实 GitHub model_release
    信号根据 data.json 里是否出现「GitHub release」文案补一条（source=github）。
    其余真实源（Statuspage service，权重 0）不影响概率，无需重建。
然后用 data.json 的 last_updated 作为计算时间重跑 compute_platform，
与 data.json 中已存的 prediction_time / prediction_window / countdown /
confidence / probability 逐项对比，输出不一致项。

不联网、不写盘，可本地随时跑，也可挂 CI 做回归。

运行：python scripts/verify.py
"""

import json
import os
import sys

# 保证能 import 同目录的 update.py（及其依赖 config / fetchers / speaker_monitor）
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.dirname(HERE)

import update  # noqa: E402

DATA_JSON = os.path.join(ROOT, "data", "data.json")

# 参与严格比对的字段
STRICT_FIELDS = ["probability", "confidence", "prediction_time", "prediction_window"]
# 倒计时每秒在递减，且生成时用带毫秒的 now 向下取整，重算用整秒 last_updated
# 会在秒边界差 1，故做软校验（容差，不判失败）
COUNTDOWN_TOL = 3


def reconstruct_signals(cfg, stored):
    """重建生成 data.json 时所用的信号列表（确定性，不联网）。

    - config 种子信号原样保留（无 source，compute_platform 内会按种子降权）
    - 若 data.json 存流了真实 GitHub release 信号，补一条 model_release（source=github）
    - Statuspage service 信号权重 0，不影响概率，省略
    """
    sigs = [dict(s) for s in cfg.get("signals", [])]

    gh_texts = [
        m.get("en", "") for m in stored.get("detail", {}).get("model_signals", [])
        if isinstance(m, dict)
    ]
    hit = next((t for t in gh_texts if t.startswith("GitHub")), None)
    if hit:
        zh = next(
            (m.get("zh", "") for m in stored.get("detail", {}).get("model_signals", [])
             if isinstance(m, dict) and (m.get("en", "") or "").startswith("GitHub")),
            "",
        )
        sigs.append({"kind": "model_release", "text": {"en": hit, "zh": zh}, "source": "github"})
    return sigs


def main():
    with open(DATA_JSON, encoding="utf-8") as f:
        data = json.load(f)

    now = update.parse_iso(data["last_updated"])
    failures = 0
    total = len(data.get("platforms", []))
    print(f"[verify] 以 last_updated={data['last_updated']} 为计算基准，共 {total} 个平台")

    for p in data.get("platforms", []):
        pid = p["id"]
        cfg = update.config.PLATFORMS.get(pid)
        if not cfg:
            print(f"  ! {pid:<12} data.json 中有平台，但 config.py 无定义")
            failures += 1
            continue

        try:
            resets = update.build_resets(pid, cfg)
            sigs = reconstruct_signals(cfg, p)
            got = update.compute_platform(pid, cfg, now, resets, sigs)
        except Exception as e:
            print(f"  ! {pid:<12} 重算失败: {e}")
            failures += 1
            continue

        bad = []
        for f in STRICT_FIELDS:
            a = p.get(f)
            b = got.get(f)
            if a != b:
                bad.append(f"{f}: 存={a!r} vs 重算={b!r}")

        # 软校验：倒计时允许秒级漂移
        cd_ok = (
            p.get("countdown_seconds") is None
            or abs((p.get("countdown_seconds") or 0) - (got.get("countdown_seconds") or 0)) <= COUNTDOWN_TOL
        )
        if bad or not cd_ok:
            failures += 1
            print(f"  ✗ {pid:<12} 不一致:")
            for line in bad:
                print(f"      {line}")
            if not cd_ok:
                print(f"      countdown_seconds: 存={p.get('countdown_seconds')} vs 重算={got.get('countdown_seconds')} (容差{COUNTDOWN_TOL}s)")
        else:
            print(f"  ✓ {pid:<12} prob={got['probability']}  conf={got['confidence']}  "
                  f"pred={got['prediction_time']}  一致")

    print(f"\n[verify] 完成：{total - failures}/{total} 一致" + ("" if failures else "，全部通过 ✔"))


if __name__ == "__main__":
    main()