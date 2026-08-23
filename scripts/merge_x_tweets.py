# -*- coding: utf-8 -*-
"""merge_x_tweets.py —— 把 x_snippet.js 抓取的单账号推文合并进 x_tweets.json / data.json / fallback.js。

用法（在能访问 X 的环境抓取某个账号后执行）：
    python scripts/merge_x_tweets.py data/x_tweets_<账号>.json

输入是 x_snippet.js 生成的「单账号」JSON：
    {
      "handle": "@thsottiaux",
      "posts": [
        {"time": "2026-08-22T13:49:00Z", "content": "...", "url": "..."},
        ...
      ]
    }

效果：把该账号推文写进统一的 data/x_tweets.json（多账号结构 posts_by_handle，覆盖该 handle），
再更新 data.json 中对应发言雷达账号的 recent_posts，并按关键词标注命中、重算字段。
之后 speaker_monitor 每次运行都会优先读取 data/x_tweets.json；多账号只需各自抓一次合并即可。
"""
import json
import os
import sys
from datetime import datetime, timezone

# 与 speaker_monitor.py 保持一致的关键词（大小写不敏感）
KEYWORDS = ["quota", "limit", "reset", "extension", "额度", "限制", "限额", "codex", "重置"]

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_JSON = os.path.join(ROOT, "data", "data.json")
FALLBACK_JS = os.path.join(ROOT, "data", "fallback.js")
X_TWEETS_JSON = os.path.join(ROOT, "data", "x_tweets.json")


def _parse_iso(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def _contains_keywords(text):
    low = (text or "").lower()
    if not low:
        return False, []
    hit = [k for k in KEYWORDS if k.lower() in low]
    return (len(hit) > 0), hit


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/merge_x_tweets.py data/x_tweets.json")
        sys.exit(1)
    tweets_path = sys.argv[1]

    with open(tweets_path, encoding="utf-8") as f:
        data = json.load(f)

    handle = (data.get("handle") or "").strip()
    posts = data.get("posts") or []
    if not handle:
        print("[error] x_tweets.json 缺少 handle")
        sys.exit(1)
    if not posts:
        print(f"[warn] {handle} 未抓到推文，跳过合并")
        sys.exit(0)

    # 规范化每条推文 + 关键词标注 + 时间排序（新→旧）
    posts = [
        {
            "time": p.get("time", ""),
            "content": (p.get("content") or "").strip(),
            "url": p.get("url", "") or "",
        }
        for p in posts
    ]
    now = datetime.now(timezone.utc)
    today = now.date()
    for p in posts:
        ok, hit = _contains_keywords(p["content"])
        p["has_keywords"] = ok
        p["keywords"] = hit
    posts.sort(key=lambda x: _parse_iso(x.get("time")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

    last = max((_parse_iso(p.get("time")) for p in posts if p.get("time")), default=None)
    recent = posts[:10]

    # 写入统一的 x_tweets.json（多账号结构）：只覆盖该 handle，保留其它账号
    store = {}
    if os.path.exists(X_TWEETS_JSON):
        try:
            with open(X_TWEETS_JSON, encoding="utf-8") as f:
                store = json.load(f)
        except (OSError, ValueError):
            store = {}
    by_handle = store.get("posts_by_handle") or {}
    by_handle[handle] = recent
    store["posts_by_handle"] = by_handle
    store.pop("handle", None)              # 移除旧式单一结构，统一为新结构
    store.pop("posts", None)
    with open(X_TWEETS_JSON, "w", encoding="utf-8") as f:
        json.dump(store, f, ensure_ascii=False, indent=2)
    print(f"[ok] 已写入 {X_TWEETS_JSON}（账号 {handle}，共 {len(recent)} 条，多账号已合并）")

    # 读 data.json
    if not os.path.exists(DATA_JSON):
        print("[error] 找不到 data/data.json，请先运行 scripts/update.py")
        sys.exit(1)
    with open(DATA_JSON, encoding="utf-8") as f:
        out = json.load(f)

    speakers = out.get("speakers") or []
    matched = False
    for sp in speakers:
        # handle 可带 @ 或不带，做兼容匹配
        if sp.get("handle", "").lstrip("@").lower() == handle.lstrip("@").lower():
            sp["recent_posts"] = recent
            sp["last_activity"] = last.strftime("%Y-%m-%dT%H:%M:%SZ") if last else ""
            sp["post_count_today"] = sum(1 for p in posts if (_parse_iso(p.get("time")) and _parse_iso(p.get("time")).date() == today))
            sp["is_active"] = sp["post_count_today"] > 0
            matched = True
            print(f"[ok] 已用 X 真实推文更新账号 {sp.get('name')} ({handle})，共 {len(recent)} 条")
            break

    if not matched:
        print(f"[warn] data.json 中无 handle={handle} 的发言雷达账号，未合并")
        sys.exit(0)

    out["speakers"] = speakers

    with open(DATA_JSON, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"[ok] 已写入 {DATA_JSON}")

    # 同步 fallback.js
    with open(FALLBACK_JS, "w", encoding="utf-8") as f:
        f.write("window.RADAR_DATA_FALLBACK=" + json.dumps(out, ensure_ascii=False) + ";")
    print(f"[ok] 已写入 {FALLBACK_JS}")


if __name__ == "__main__":
    main()