# -*- coding: utf-8 -*-
"""Reset Radar 自动额度重置监控：在预测窗口自动检测重置并调用 record_reset.py。

背景（诚实约束）：
  没有任何免费、公开、免登录的数据源会发布某个 AI 平台的「额度重置时刻」
  （见 record_reset.py 与 update.py 说明）。因此本脚本不「凭空猜测重置」，
  只在下列两种**可信**情形下写入实测记录，避免把推断数据当实测污染历史：

  1) 信号佐证（全自动）：
       某平台预测窗口（默认预测点 ±3h）内出现真实 GitHub Release
       （source=github，真实版本 + 发布时间）。把该 Release 发布时间视作
       重置标记，自动调用 record_reset.py 写一条 observed 记录。
       ⚠ 说明：Release 是「重置可信标记」，非严格证明；reason 会写明引用版本。

  2) 交互确认（半自动，终端）：
       窗口期内若在终端运行且可以交互（--ask / -a，或自动启用），向用户询问
       「该平台是否在预测点附近重置」，按回答记录重置(y，可给精确时间) 或
       未重置(n)。这是最可靠的路径。

  无任何佐证 → 不写入（保持诚实），由 update.py 自动补「未重置」标记即可。

用法：
    python monitor.py                 # 单次巡检（适合 cron / 定时任务）
    python monitor.py --watch         # 常驻循环监控（CTRL+C 退出）
    python monitor.py --interval 1800 # 循环间隔秒数（默认 1800）
    python monitor.py --ask           # 强制开启交互确认（非 tty 时也询问）
    python monitor.py --dry-run       # 只打印将做什么，不调用 record_reset.py
    python monitor.py codex claude    # 只监控指定平台

退出码：0 = 正常；2 = 本轮检测到重置并已记录（可用于 CI 判断）。
"""
import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone, timedelta

import config
import update
import fetchers

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RECORD_RESET = os.path.join(HERE, "record_reset.py")
STATE_PATH = os.path.join(ROOT, "data", ".monitor_state.json")

# 信号检索窗口：预测点前后各多少小时
SIGNAL_WINDOW_H = 3.0
# 交互确认窗口：预测点前 0.5h 起，到预测点后 SIGNAL_WINDOW_H 止
CONFIRM_START_H = 0.5


def now_utc():
    return datetime.now(timezone.utc)


def _parse_iso(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00"))


def load_state():
    if os.path.exists(STATE_PATH):
        try:
            return json.load(open(STATE_PATH, encoding="utf-8"))
        except Exception:
            return {}
    return {}


def save_state(state):
    os.makedirs(os.path.dirname(STATE_PATH), exist_ok=True)
    with open(STATE_PATH, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def call_record(pid, iso, reason, extra_args, dry_run):
    cmd = [sys.executable, RECORD_RESET, pid, iso] + extra_args + ["--reason", reason]
    if dry_run:
        print(f"  [preview] {' '.join(cmd)}")
        return
    subprocess.run(cmd, check=False)


def newest_release_in_window(cfg, early, late):
    """返回窗口 [early, late] 内最新一条 GitHub Release，否则 None。"""
    repo = cfg.get("github_repo", "")
    if not repo:
        return None
    releases, _ok = fetchers.fetch_github_releases(repo, 10)
    for rel in releases:
        if rel["published_at"] and early <= rel["published_at"] <= late:
            return rel
    return None


def confirm_interactive(pid, pred, ask, dry_run):
    """窗口期内交互式确认；返回 ('no'|(dt,reason)), 是否已定论。"""
    if not (ask and sys.stdin.isatty()):
        return None, False
    early = pred - timedelta(hours=CONFIRM_START_H)
    if now_utc() < early:
        return None, False
    prompt = (f"[{pid}] 预测重置点 {pred.strftime('%Y-%m-%d %H:%MZ')} 已到。"
              f"你是否观察到额度重置？(y=重置/给时间, n=未重置, Enter=跳过) ")
    try:
        ans = input(prompt).strip().lower()
    except (EOFError, KeyboardInterrupt):
        return None, False
    if ans in ("y", "yes"):
        return (pred, "实测确认重置"), True
    if ans.startswith(("y ", "y\t")) or ans[0:1] == "y" and len(ans) > 1:
        # 用户给了精确时间，如 "y 2026-08-25T03:30:00Z"
        t = ans[1:].strip()
        try:
            dt = _parse_iso(t)
        except ValueError:
            dt = pred
        return (dt, "实测确认重置"), True
    if ans in ("n", "no", "q"):
        return (pred, "实测确认未重置"), True
    return None, False


def check_platform(pid, cfg, state, ask, dry_run):
    """对单平台巡检。返回 'recorded' | 'no_record' | 'skip'。"""
    # 复用引擎，得到当前预测（含顺延逻辑）
    resets = update.build_resets(pid, cfg)
    signals, _real = update.build_signals(pid, cfg, now_utc())
    p = update.compute_platform(pid, cfg, now_utc(), resets, signals)
    pred = _parse_iso(p["prediction_time"])

    # 若预测时间已随顺延漂到未来、但某个更早的预测点已被处理过，则本次无可处理
    done = state.get(pid, [])
    key = pred.strftime("%Y-%m-%dT%H:%M:%SZ")
    if key in done:
        return "skip"

    now = now_utc()
    early = pred - timedelta(hours=SIGNAL_WINDOW_H)
    late = pred + timedelta(hours=SIGNAL_WINDOW_H)

    # 尚未进入窗口
    if now < early:
        return "skip"

    # 1) 交互确认（优先，最可信）
    result, settled = confirm_interactive(pid, pred, ask, dry_run)
    if settled and result:
        dt, reason = result
        if reason == "实测确认重置":
            call_record(pid, dt.strftime("%Y-%m-%dT%H:%M:%SZ"), reason,
                        [], dry_run)
            print(f"  [ok] {pid} 交互确认 -> 记录重置 @ {dt.isoformat()}")
            done.append(key)
            state[pid] = done
            return "recorded"
        # n -> 未重置，交回 update 自动判定，不再重复记录
        done.append(key)
        state[pid] = done
        print(f"  [~] {pid} 交互确认未重置（不写记录，update 会自动标记）")
        return "no_record"

    # 2) 信号佐证：窗口内真实 GitHub Release
    rel = newest_release_in_window(cfg, early, late)
    if rel:
        rt = rel["published_at"]
        reason = f"Observed marker: GitHub release {rel['tag']}"
        call_record(pid, rt.strftime("%Y-%m-%dT%H:%M:%SZ"), reason, [], dry_run)
        print(f"  [ok] {pid} 信号佐证(Release {rel['tag']} @ {rt.isoformat()}) -> 记录重置")
        done.append(key)
        state[pid] = done
        return "recorded"

    # 3) 无佐证：窗口已过(晚于 late)才定论跳过，避免过早放弃
    if now > late:
        done.append(key)
        state[pid] = done
        print(f"  [~] {pid} 窗口内无信号佐证，未被确认 —— 不伪造，跳过")
        return "no_record"

    return "skip"


def run_once(platform_ids, ask, dry_run):
    state = load_state()
    recorded = False
    for pid, cfg in config.PLATFORMS.items():
        if cfg.get("hidden"):
            continue
        if platform_ids and pid not in platform_ids:
            continue
        try:
            res = check_platform(pid, cfg, state, ask, dry_run)
            if res == "recorded":
                recorded = True
        except Exception as e:  # noqa: BLE001
            print(f"  [error] {pid}: {e}")
    save_state(state)
    return 2 if recorded else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__.strip().splitlines()[0])
    ap.add_argument("platforms", nargs="*", help="只监控指定平台；缺省全部")
    ap.add_argument("--watch", action="store_true", help="常驻循环监控")
    ap.add_argument("--interval", type=int, default=1800, help="循环间隔秒数(默认1800)")
    ap.add_argument("--ask", action="store_true", help="强制开启交互确认")
    ap.add_argument("--dry-run", action="store_true", help="只预览，不写入")
    args = ap.parse_args()

    # tty 下默认自动开启交互确认
    ask = args.ask or (sys.stdin.isatty() and not args.dry_run)

    print(f"[Reset Radar Monitor] {'watch' if args.watch else 'once'}  platforms={args.platforms or 'all'}  ask={ask}  dry={args.dry_run} @ {now_utc().isoformat()}")
    try:
        if not args.watch:
            sys.exit(run_once(set(args.platforms), ask, args.dry_run))
        while True:
            rc = run_once(set(args.platforms), ask, args.dry_run)
            print(f"[Monitor] 巡检完成(rc={rc})，{args.interval}s 后继续……")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[Monitor] 已停止")


if __name__ == "__main__":
    main()