# ⚡ Reset Radar · AI 额度重置雷达

面向 AI 开发者的情报聚合与预测 H5 工具：实时预测各 AI 编码平台（Codex、Claude Code、Grok Build 等）的额度重置时间，把"额度焦虑"变成可量化的概率。

> 架构：**纯静态前端 + 定时任务后端**，无需购买服务器，成本几乎为零。

---

## 一、目录结构

```
reset-radar/
├── index.html              # 首页（平台概览卡片：概率/预计重置/倒计时/状态）
├── detail.html             # 详情页（研判日志 + 发言雷达，?id=codex）
├── status.html             # 服务状态页
├── about.html              # 关于页（预测方法 / 百分比与置信度区别 / 免责）
├── css/style.css           # 深色科技感主题（响应式：移动/平板/桌面）
├── js/
│   ├── utils.js            # 工具函数（时间/信号映射/倒计时/周额度图）
│   ├── api.js              # 数据加载（fetch data.json，失败回退 fallback.js）
│   ├── app.js              # 首页逻辑
│   ├── detail.js           # 详情页逻辑（重置原因/历史标记/周额度趋势/发言雷达）
│   └── status.js           # 状态页逻辑
├── data/
│   ├── data.json           # 所有数据（平台 + 服务状态 + speakers，定时任务生成）
│   └── fallback.js         # 内嵌回退数据（file:// 直接打开可用）
├── scripts/
│   ├── config.py           # 平台配置（resets/信号/weekly_quota/SPEAKERS）
│   ├── update.py           # 主采集 + 预测引擎
│   ├── fetchers.py         # 公开数据源抓取（GitHub Releases / Statuspage，子进程隔离）
│   ├── speaker_monitor.py  # 【v2.0】发言雷达（种子驱动，可选 X API 实时抓取）
│   ├── record_reset.py     # 记录一次实测重置（写入 data/resets.json）
│   └── requirements.txt
└── .github/workflows/update.yml   # 每30分钟定时刷新
```

## 二、预测算法（规则引擎，无机器学习）

1. **周期基线**：`base = min(距上次重置小时 / 平均周期, 1) × 70%`
2. **信号加权**：扫描近 24h 信号
   | 信号 | 幅度 |
   |---|---|
   | 官方公告（重置/恢复额度） | +30 |
   | 官方公告（限额延长/提高/延期） | −20 |
   | 模型发布（CLI/新版本） | +10 |
   | 社区恢复反馈（API来源） | +5 |
   | 服务故障已恢复 | 0 |
3. **置信度**：`clamp(1 − 周期标准差/平均周期, 30, 99) × 100`
4. **信号强度**：`≥70% 高 · 40–69% 中 · <40% 冷却`

> 详见 `scripts/update.py`，与 `readme2.md`（v2.0 设计文档）一致。

## 二·五·一、v2.0 新增能力

| 能力 | 说明 | 数据来源 |
|---|---|---|
| **重置原因标注** | 每次重置标注原因（如"庆祝活跃用户破 1500 万"） | `config.resets[].reason`（人工维护） |
| **额外重置标记** | 里程碑/庆祝类重置 `is_extra=true`，**不计入平均周期** | `config.resets[].is_extra` |
| **精确倒计时** | `prediction_time = 上次重置 + 平均周期`；`countdown_seconds` | 引擎计算 |
| **未重置记录** | 候选点未发生重置也记录（`type=no_reset`），划线展示 | `config.resets[].type` |
| **周额度趋势** | Pro·20× / 5× / Plus 当前值与近几日趋势迷你图 | `config.weekly_quota`（人工维护） |
| **发言雷达** | 追踪关键人物 X 账号发言，关键词高亮 | `config.SPEAKERS`（种子/可选 X API） |

> `data.json` 顶层新增 `speakers` 数组；每个平台新增 `last_reset` / `prediction_time` /
> `countdown_seconds` / `signal_level`，`detail.history` 升级为带 `type` / `reason` / `is_extra`。

## 二·五、数据来源（真实公开源，免费免登录）

`signals` 由脚本自动从以下**公开、无需 token** 的源抓取（`scripts/fetchers.py`）：

| 数据源 | 类型 | 用途 | 配置字段 |
|---|---|---|---|
| GitHub Releases API | 公开 JSON | `model_release` 信号（真实版本号 + 发布时间） | `github_repo` |
| Statuspage v2 Incidents | 公开 JSON | `service` / 官方事件信号 | `status_base` |
| Statuspage v2 Status | 公开 JSON | 官方服务状态 | `status_base` |

已接入的真实源示例：
- **Claude Code** ← `github_repo: anthropics/claude-code`（实测可抓到 v2.1.237 等真实发布）
- **Codex** ← `github_repo: openai/codex` + `status_base: status.openai.com`
- **OpenAI / Anthropic / xAI** 服务状态 ← 各自 `status_base`

> 抓取健壮性：每次 HTTP 请求都在**独立子进程（新会话）**中执行。任一源不可达 / 超时 / 被网络策略阻断，主引擎都安然无恙并按"抓取失败"安全回退，**绝不会因单点故障拖垮整次运行**。
> 失败的信号源会自动回退到 `config.py` 中人工补充的 `signals` 种子。

### ⚠️ 关于「重置时刻 resets」的诚实说明

**没有任何免费、免登录的公开源会发布"额度重置的具体时刻"。** 因此 `resets` 无法自动抓取，需要人工 / 实测维护。本项目提供三种维护方式（越用越真）：

1. **`scripts/record_reset.py`**（推荐）：每次你观察到某平台重置，跑一下即可。
   ```bash
   python scripts/record_reset.py codex                 # 用当前 UTC 时间
   python scripts/record_reset.py codex 2026-08-20T03:30:00Z "实测重置"
   python scripts/record_reset.py claude 2026-08-18T03:05:00Z --extra --reason "庆祝活跃用户破1500万"
   python scripts/record_reset.py kimi 2026-08-19T00:00:00Z --no-reset   # 标记候选点未重置
   ```
   记录写入 `data/resets.json`，引擎下次运行自动并入 `resets`（`--extra` 不计入周期，`--no-reset` 作划线展示）。
2. **`config.py` 的 `MANUAL_RESETS`**：直接写在配置里的真实重置记录。
3. **`config.py` 各平台的 `resets` 种子**：初始占位，建议逐步替换为真实观察值。

### 🗣️ 发言雷达（speaker）

追踪关键人物的社交动态，提供早期预警。`config.SPEAKERS` 配置账号（如 `@thsottiaux`），
每个账号通过 `platform` 字段关联到具体平台，**在对应平台的详情页内展示**（`detail.html` 底部「🗣️ 发言雷达」区块），不再占用底部导航。
默认用 `seed_posts` **离线种子**驱动，**无需任何登录 / API Key**。

- **可选实时**：在仓库 Secrets 配置 `X_API_BEARER`（X 官方 API 付费 Bearer Token），
  `speaker_monitor.py` 会尝试实时抓取最近推文；失败自动回退种子。
- **诚实提醒**：X 的官方 API 自 2023 年起对抓取/搜索收费，免费免登录方案大多已不稳定。
  默认走种子数据，避免引入付费依赖；如需真·实时请自行评估费用。
- 关键词检测（quota / limit / reset / 额度 / 限制 / Codex 等）用于高亮相关发言。

## 三、本地预览

```bash
cd reset-radar
python -m http.server 8765
# 浏览器打开 http://127.0.0.1:8765/
```

也可以直接双击 `index.html` 打开（会自动使用 `data/fallback.js` 内嵌数据）。

手动重新生成数据（跑一遍预测引擎）：

```bash
python scripts/update.py        # 需 Python 3.11+，仅需标准库，零第三方依赖
```

## 四、部署（Vercel 推荐）

1. 把 `reset-radar/` 推送到 GitHub 仓库。
2. 登录 [Vercel](https://vercel.com) → **Add New → Project** → 导入仓库。
3. 设置：
   - Framework Preset：**Other**
   - Build Command：留空
   - Output Directory：留空（即根目录）
4. 点击 **Deploy**，获得 `*.vercel.app` 地址。
5. Settings → Domains 绑定自定义域名（可选）。

> 备选：[Cloudflare Pages](https://pages.cloudflare.com) 连接仓库，Build 命令填 `exit 0`。

## 五、开启自动刷新（GitHub Actions）

仓库已含 `.github/workflows/update.yml`：

- 默认 **每 30 分钟**运行一次 `scripts/update.py` 并自动提交 `data/data.json`。
- 在仓库 **Settings → Secrets** 可添加 `WEWORK_WEBHOOK`（企业微信机器人，用于异常通知，可选）。
- 进入仓库 **Actions** 标签页确认工作流已启用；也可 **Run workflow** 手动触发一次验证。

> 注意：GitHub Actions 默认的 `cron` 使用 UTC。免费账号若长时间无提交，调度可能延迟，属正常现象。

## 六、上线前检查清单

- [ ] 代码已推送到 GitHub 仓库
- [ ] Vercel/Cloudflare Pages 已连接仓库并自动部署
- [ ] GitHub Actions 已启用，定时任务正常运行（手动触发验证一次）
- [ ] 移动端各页面显示正常
- [ ] 数据刷新后页面自动更新（已用 `?t=` 与 `no-store` 规避缓存）
- [ ] 自定义域名已绑定（可选）

## 七、扩展新平台

编辑 `scripts/config.py` 的 `PLATFORMS`，加入：

```python
"myai": {
    "name": "MyAI", "icon": "🚀", "logo": "assets/myai.svg",
    "github_repo": "owner/repo",            # 可选：自动抓 model_release 信号
    "status_base": "https://status.example.com",  # 可选：自动抓服务状态/事件
    "status_api": "https://status.example.com/api/v2/status.json",
    "resets": [                             # 真实重置记录（含原因/额外重置）
        {"time": "2026-08-20T03:00:00Z", "reason": "常规周期重置", "is_extra": False},
        {"time": "2026-08-18T03:00:00Z", "reason": "常规周期重置", "is_extra": False},
    ],
    "weekly_quota": None,                   # 可选：{"pro_20x":..,"pro_5x":..,"plus":..,"trend":[..],"labels":[..]}
    "signals": [{"kind": "model_release", "text": "发布 v1.2"}],  # 人工补充信号
}
```

下次定时任务运行即自动出现在首页。若某平台有官方 GitHub 仓库（CLI/SDK 类），
填 `github_repo` 即可自动获得真实发布信号；有 Statuspage 状态页则填 `status_base`。

> 重置记录 `resets` 仍需实测维护：用 `python scripts/record_reset.py myai` 记录，
> 或写入底部 `MANUAL_RESETS`。要追踪关键人物发言，在 `SPEAKERS` 里加账号即可。
