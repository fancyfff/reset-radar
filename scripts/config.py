# -*- coding: utf-8 -*-
"""平台配置：重置记录（含原因/额外重置）、信号、周额度趋势、发言雷达账号。

真实部署说明：
  * resets           —— 真实「额度重置记录」（取代旧版纯时间戳 history）。
                       每条记录含 time / reason / is_extra：
                         - is_extra=True 表示「额外重置」（里程碑/庆祝等），不计入平均周期；
                         - type="no_reset" 表示「候选点未发生重置」，仅作记录。
                       注意：没有任何免费、免登录的公开源会发布重置时刻与原因，
                       因此这里需要人工/实测维护（见底部 MANUAL_RESETS 与
                       data/resets.json，可由 scripts/record_reset.py 追加）。
  * signals          —— 可选的「人工补充信号」，会与自动抓取的真实信号合并。
  * github_repo      —— 用于自动抓取 model_release 信号（真实版本+发布时间），
                       公开免费，无需登录。留空则不抓取。
  * status_base      —— 官方状态页基地址，用于自动抓取 service 信号与服务状态，
                       公开免费，无需登录。留空则不抓取。
  * weekly_quota     —— 周额度趋势种子（pro_20x / pro_5x / plus / trend / labels）。
                       无免费公开源，需人工维护；留空则详情页显示「暂无数据」。

自动抓取的真实源见 scripts/fetchers.py：
  - GitHub Releases API（model_release 信号）
  - Statuspage v2 Incidents（service / 官方事件信号）

发言雷达账号见底部 SPEAKERS。
"""


def bi(en, zh):
    """双语文本：前端根据当前语言取 en / zh。"""
    return {"en": en, "zh": zh}


PLATFORMS = {
    "codex": {
        "name": "Codex",
        "icon": "🖥️",
        "logo": "assets/openai.svg",
        "github_repo": "openai/codex",
        "status_base": "https://status.openai.com",
        "status_api": "https://status.openai.com/api/v2/status.json",
        # 重置记录：最近在前。reason_type 仅作展示用（normal/milestone/...）
        "resets": [
            {"time": "2026-08-21T03:30:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-19T03:30:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-17T03:30:00Z", "reason": bi("Celebrating 15M active Codex users", "庆祝 Codex 活跃用户达到 1500 万"), "reason_type": "milestone", "is_extra": True},
            {"time": "2026-08-15T03:30:00Z", "type": "no_reset", "reason": bi("No reset at cycle candidate point", "周期候选点未发生重置")},
        ],
        "weekly_quota": {
            "pro_20x": 1291.37,
            "pro_5x": 322.84,
            "plus": 64.57,
            "trend": [2191, 1830, 1693, 1520, 1291.34],
            "labels": ["8.14", "8.17", "8.20", "8.21", bi("Today", "今日")],
        },
        "signals": [
            {
                "kind": "community",
                "text": bi("Independent recovery & quota pressure feedback in the last 24h (small sample).",
                          "近24小时有独立恢复反馈与额度压力反馈，样本很小。"),
            },
        ],
    },
    "claude": {
        "name": "Claude Code",
        "icon": "🤖",
        "logo": "assets/anthropic.svg",
        "github_repo": "anthropics/claude-code",
        "status_base": "https://status.anthropic.com",
        "status_api": "https://status.anthropic.com/api/v2/status.json",
        "resets": [
            {"time": "2026-08-22T03:00:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-20T03:05:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-18T02:58:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
        ],
        "weekly_quota": None,
        "signals": [
            {
                "kind": "service",
                "text": bi("Multiple models degraded in the last 24h (service incident, not a quota signal).",
                          "近24小时 multiple models 性能下降，属服务故障，不计入额度信号。"),
            },
        ],
    },
    "grok": {
        "name": "Grok Build",
        "icon": "⚡",
        "logo": "assets/grok.svg",
        "github_repo": "",
        "status_base": "https://status.x.ai",
        "status_api": "https://status.x.ai/",
        "resets": [
            {"time": "2026-08-21T09:00:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-19T08:30:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-17T09:15:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
        ],
        "weekly_quota": None,
        "signals": [
            {
                "kind": "community",
                "text": bi("Limited community feedback; cannot confirm a reset.", "社区反馈样本有限，无法确认落地。"),
            },
        ],
    },
    "kimi": {
        "name": "Kimi",
        "icon": "🌊",
        "logo": "assets/kimi.svg",
        "github_repo": "MoonshotAI/kimi-code",
        "status_base": "https://status.moonshot.cn",
        "status_api": "https://status.moonshot.cn/api/v2/status.json",
        "resets": [
            {"time": "2026-08-22T00:00:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-21T00:10:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-20T00:05:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
        ],
        "weekly_quota": None,
        "signals": [
            {
                "kind": "announcement",
                "text": bi("Official: limit increase, more headroom in the short term.", "官方公告：限额提高，短期额度更宽裕。"),
            },
        ],
    },
    "minimax": {
        "name": "MiniMax",
        "icon": "🎯",
        "logo": "assets/minimax.svg",
        "github_repo": "MiniMax-AI/cli",
        "status_base": "https://status.minimax.io",
        "status_api": "https://status.minimax.io/api/v2/status.json",
        "resets": [
            {"time": "2026-08-22T05:00:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-20T04:50:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
            {"time": "2026-08-18T05:10:00Z", "reason": bi("Regular cycle reset", "常规周期重置"), "is_extra": False},
        ],
        "weekly_quota": None,
        "signals": [],
    },
}

# 用户实测记录的真实重置时刻（与上面 resets 合并）。
# 也可改用 data/resets.json（由 scripts/record_reset.py 维护，更方便）。
# 格式：{"id": "codex", "time": "2026-08-20T03:30:00Z", "note": "实测重置", "is_extra": false}
MANUAL_RESETS = []


# 服务状态种子（可选实时刷新，失败不影响主流程）
SERVICE_STATUS = [
    {
        "platform_id": "codex",
        "platform_name": "Codex / ChatGPT Work",
        "source": bi("OpenAI official status", "OpenAI 官方状态"),
        "status": "recovered",
        "summary": bi("Chat service incident, now recovered", "对话服务出现服务异常，已恢复"),
        "events": [
            {"time": "2026-08-13T23:19Z", "duration": bi("8h 39m", "8小时39分钟"), "status": bi("Recovered", "已恢复")},
            {"time": "2026-08-12T05:35Z", "duration": bi("1h 07m", "1小时07分钟"), "status": bi("Recovered", "已恢复")},
        ],
    },
    {
        "platform_id": "claude",
        "platform_name": "Claude Code",
        "source": bi("Anthropic official status", "Anthropic 官方状态"),
        "status": "recovered",
        "summary": bi("Multiple models degraded, now recovered", "multiple models 性能下降，已恢复"),
        "events": [
            {"time": "2026-08-17T21:56Z", "duration": bi("1h 33m", "1小时33分钟"), "status": bi("Recovered", "已恢复")},
        ],
    },
    {
        "platform_id": "grok",
        "platform_name": "Grok Build",
        "source": bi("xAI official status", "xAI 官方状态"),
        "status": "operational",
        "summary": bi("All systems operational", "全部系统运行正常"),
        "events": [],
    },
    {
        "platform_id": "kimi",
        "platform_name": "Kimi",
        "source": bi("Moonshot official status", "Moonshot 官方状态"),
        "status": "operational",
        "summary": bi("All systems operational", "全部系统运行正常"),
        "events": [],
    },
    {
        "platform_id": "minimax",
        "platform_name": "MiniMax",
        "source": bi("MiniMax official status", "MiniMax 官方状态"),
        "status": "operational",
        "summary": bi("All systems operational", "全部系统运行正常"),
        "events": [],
    },
]


# ---------- 发言雷达：追踪的账号 ----------
# handle 用于未来接入 X API（需付费 Bearer Token）；seed_posts 为离线种子数据，
# 未配置 API 时直接驱动页面展示。recent_posts 中 has_keywords 由引擎计算。
SPEAKERS = [
    {
        "id": "tibo",
        "name": "Tibo",
        "handle": "@thsottiaux",
        "avatar": "",
        "platform": "codex",
        "seed_posts": [
            {"time": "2026-08-22T13:49:00Z", "content": bi("Replying to Tammie · @tammiesiew where's Claude?", "回复的原帖 Tammie · @tammiesiew 呢，Claude？"), "url": ""},
            {"time": "2026-08-22T13:48:00Z", "content": bi("@tammiesiew Codex has nothing to hide", "@tammiesiew Codex 没有什么可隐瞒的"), "url": ""},
            {"time": "2026-08-22T11:20:00Z", "content": bi("We just shipped a quota increase for Codex users.", "我们刚为 Codex 用户提升了额度。"), "url": ""},
        ],
    },
]
