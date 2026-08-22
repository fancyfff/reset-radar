# -*- coding: utf-8 -*-
"""发言雷达：追踪关键人物的社交动态（默认离线种子，可选 X API 实时抓取）。

设计要点：
  * 默认不需要任何登录 / API Key：直接用 config.SPEAKERS 里的 seed_posts 驱动页面。
  * 若设置了环境变量 X_API_BEARER（X 官方 API 付费 Bearer Token），则尝试实时抓取
    最近推文。实时抓取失败时回退到 seed_posts。
  * 关键词检测用于高亮「与额度/限制/重置相关」的发言。

本脚本既提供 build_speakers() 供 update.py 调用（一次生成完整 data.json），
也可独立运行：读取现有 data.json，只刷新 speakers 字段后写回（不破坏其它数据）。

X API 现状提醒（诚实）：X 的官方 API 自 2023 年起对抓取/搜索收取费用，
免费免登录方案（如公开 RSS、nitter 镜像）大多已不稳定或被限流。因此默认走种子数据，
避免引入付费依赖。如需真·实时，请在仓库 Secrets 配置 X_API_BEARER 并自行评估费用。
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

import config

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JSON = os.path.join(ROOT, "data", "data.json")

# 发言雷达关键词（大小写不敏感匹配）
KEYWORDS = ["quota", "limit", "reset", "extension", "额度", "限制", "限额", "codex", "重置"]

X_API_BEARER = os.environ.get("X_API_BEARER", "").strip()


def _text(v):
    """把字符串或双语对象 {en, zh} 统一转成用于匹配的文本。"""
    if isinstance(v, dict):
        return ((v.get("en") or "") + " " + (v.get("zh") or "")).strip()
    return str(v or "")


def contains_keywords(text):
    low = _text(text).lower()
    if not low:
        return False, []
    hit = [k for k in KEYWORDS if k.lower() in low]
    return (len(hit) > 0), hit


def _parse_iso(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def is_today(dt, now):
    return dt and dt.date() == now.date()


def _fetch_x_posts(handle, limit=20):
    """可选：用 X API v2 最近推文搜索。需 X_API_BEARER。失败返回 []。"""
    if not X_API_BEARER:
        return []
    username = handle.lstrip("@")
    url = (
        "https://api.twitter.com/2/tweets/search/recent"
        f"?query=from:{username}&max_results={limit}"
        "&tweet.fields=created_at,text"
    )
    script = (
        "import sys, json, urllib.request\n"
        "url = sys.argv[1]\n"
        "token = sys.argv[2]\n"
        "req = urllib.request.Request(url, headers={'Authorization': 'Bearer ' + token})\n"
        "try:\n"
        "    with urllib.request.urlopen(req, timeout=12) as r:\n"
        "        sys.stdout.write(r.read().decode('utf-8', 'replace'))\n"
        "except Exception:\n"
        "    sys.exit(3)\n"
    )
    try:
        proc = subprocess.run(
            [sys.executable, "-c", script, url, X_API_BEARER],
            capture_output=True, text=True, start_new_session=True, timeout=20, cwd=HERE,
        )
        if proc.returncode == 0 and proc.stdout.strip():
            data = json.loads(proc.stdout)
            out = []
            for t in data.get("data", [])[:limit]:
                out.append({
                    "time": t.get("created_at", ""),
                    "content": t.get("text", ""),
                    "url": f"https://x.com/{username}/status/{t.get('id','')}",
                })
            return out
    except Exception as e:
        print(f"  [warn] X 实时抓取失败 {handle}: {e}")
    return []


def build_speakers(now=None):
    """根据 config.SPEAKERS 构建 speakers 列表。"""
    now = now or datetime.now(timezone.utc)
    out = []
    for sp in config.SPEAKERS:
        handle = sp.get("handle", "")
        # 实时优先，失败回退种子
        posts = _fetch_x_posts(handle, 20) if X_API_BEARER else []
        if not posts:
            posts = [dict(p) for p in sp.get("seed_posts", [])]

        # 关键词标记 + 时间排序
        for p in posts:
            ok, hit = contains_keywords(p.get("content", ""))
            p["has_keywords"] = ok
            p["keywords"] = hit
        posts.sort(key=lambda x: _parse_iso(x.get("time")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

        today = [p for p in posts if is_today(_parse_iso(p.get("time")), now)]
        last = max((_parse_iso(p.get("time")) for p in posts if p.get("time")), default=None)
        recent = posts[:10]

        out.append({
            "id": sp.get("id", handle),
            "name": sp.get("name", handle),
            "handle": handle,
            "avatar": sp.get("avatar", ""),
            "platform": sp.get("platform", ""),
            "last_activity": last.strftime("%Y-%m-%dT%H:%M:%SZ") if last else "",
            "post_count_today": len(today),
            "is_active": len(today) > 0,
            "recent_posts": recent,
        })
    return out


def main():
    speakers = build_speakers()
    data = {}
    if os.path.exists(DATA_JSON):
        try:
            data = json.load(open(DATA_JSON, encoding="utf-8"))
        except Exception:
            data = {}
    data["speakers"] = speakers
    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[ok] 发言雷达已刷新：{len(speakers)} 个账号")


if __name__ == "__main__":
    main()
