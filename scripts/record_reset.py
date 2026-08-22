# -*- coding: utf-8 -*-
"""记录一次实测到的额度重置（写入 data/resets.json，越用越真）。

用法：
    python record_reset.py codex
    python record_reset.py codex 2026-08-20T03:30:00Z "实测重置"
    python record_reset.py claude 2026-08-18T03:05:00Z --extra --reason "庆祝活跃用户破1500万"
    python record_reset.py kimi 2026-08-19T00:00:00Z --no-reset

说明：
  * 没有任何免费公开源发布"重置时刻"，因此重置记录需要实测维护。
  * 每次你观察到某平台重置，跑一下本脚本即可，引擎会自动合并进 history。
  * --extra   标记为「额外重置」（里程碑/庆祝等，不计入平均周期）
  * --no-reset  标记该候选点「未发生重置」（仅作记录）
  * data/resets.json 会被 git 跟踪（也可加进 .gitignore 自己留着）。
"""
import json
import os
import sys
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
RESETS_JSON = os.path.join(os.path.dirname(HERE), "data", "resets.json")


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_args(argv):
    pid = None
    iso = None
    reason = "实测重置"
    is_extra = False
    no_reset = False
    i = 1
    while i < len(argv):
        a = argv[i]
        if a in ("--extra",):
            is_extra = True
        elif a in ("--no-reset",):
            no_reset = True
        elif a in ("--reason",) and i + 1 < len(argv):
            reason = argv[i + 1]
            i += 1
        elif a.startswith("--"):
            print(f"[warn] 未知参数: {a}")
        elif pid is None:
            pid = a
        elif iso is None:
            iso = a
        else:
            reason = a
        i += 1
    return pid, iso, reason, is_extra, no_reset


def main():
    pid, iso, reason, is_extra, no_reset = parse_args(sys.argv)
    if not pid:
        print(__doc__)
        sys.exit(1)
    iso = iso or now_iso()

    try:
        datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        print(f"[error] 时间格式不正确: {iso}（示例 2026-08-20T03:30:00Z）")
        sys.exit(1)

    records = []
    if os.path.exists(RESETS_JSON):
        try:
            records = json.load(open(RESETS_JSON, encoding="utf-8"))
        except Exception:
            records = []

    if any(r.get("id") == pid and r.get("time") == iso for r in records):
        print(f"[skip] 已存在相同记录: {pid} @ {iso}")
        return

    rec = {"id": pid, "time": iso, "reason": reason, "is_extra": bool(is_extra),
           "type": "no_reset" if no_reset else "reset", "recorded_at": now_iso()}
    records.append(rec)
    with open(RESETS_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    tag = "额外重置" if (is_extra and not no_reset) else ("未重置" if no_reset else "常规重置")
    print(f"[ok] 已记录 {pid} @ {iso} [{tag}] -> {RESETS_JSON}")


if __name__ == "__main__":
    main()
