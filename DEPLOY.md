# Reset Radar 部署上线方案

> 目标：把「纯静态前端 + GitHub Actions 定时任务」的 Reset Radar 上线。默认 **0 成本**，支持少量付费升级（自定义域名 / X 实时数据）。
>
> **本文档基于当前工程的真实情况编写**，可直接照做。命令均为 Windows PowerShell（项目根目录 `d:\Learning\doit\cursor-ws\reset-radar`）。

---

## 0. 工程现状与目录

### 0.1 关键事实

| 项 | 说明 |
|---|---|
| 所在位置 | `d:\Learning\doit\cursor-ws\reset-radar` |
| Git | **已是独立仓库**（分支 `master`，首个 commit `71bcf67`）；`scripts/update.py` 等脚本与数据已入库 |
| 前端 | 纯 HTML/CSS/JS，无构建、无框架、无第三方依赖，静态托管即可 |
| 数据 | `data/data.json`（主）+ `data/fallback.js`（离线回退副本），由定时任务生成 |
| 定时任务 | `.github/workflows/update.yml`：cron 每 30 分钟跑 `update.py` + `speaker_monitor.py`，自动 commit 数据文件 |
| 后端脚本 | Python 3.11 标准库，**零 pip 依赖**（`requirements.txt` 为空，供 Actions `pip install` 空跑） |
| 可选 Secrets | `WEWORK_WEBHOOK`（企业微信告警）、`X_API_BEARER`（X 实时发言，付费） |

> **关键约束已满足**：GitHub Actions 只识别仓库**根目录**下 `.github/workflows/`。本仓库 workflow 就在根目录，**可直接被识别**，无需再做 monorepo 拆分。

### 0.2 目录结构

```
reset-radar/
├── index.html            # 首页（概览）
├── detail.html           # 详情页（?id=codex 进入）
├── status.html           # 服务状态页
├── about.html            # 关于页
├── css/
│   └── style.css         # 全部样式（含渐变主色、卡片、仪表盘、流体条）
├── js/
│   ├── app.js            # 首页渲染
│   ├── detail.js         # 详情页渲染（仪表盘/信号/历史/发言雷达）
│   ├── status.js         # 服务状态页
│   ├── utils.js          # 公共工具（格式化/转义）
│   ├── api.js            # 数据加载（fetch data.json → 回退 fallback.js）
│   ├── i18n.js           # 国际化（默认英文，中文可切换，页面刷新持久化）
├── data/
│   ├── data.json         # 主数据（页面实际读取）
│   └── fallback.js       # 内嵌数据的离线回退副本（file:// 直开也能用）
├── scripts/
│   ├── update.py         # 主引擎：抓取→预测→写 data.json / fallback.js
│   ├── speaker_monitor.py# 发言雷达：构建 speakers（默认种子）
│   ├── record_reset.py   # 记录一次实测重置（写入 data/resets.json，日常维护用）
│   ├── fetchers.py       # GitHub Release / Statuspage 抓取（标准库）
│   ├── config.py         # 平台配置：重置记录/信号/额度趋势/SPEAKERS
│   └── requirements.txt  # 空（零依赖占位）
├── assets/               # 平台 logo（openai.svg 等）
├── .github/workflows/update.yml
└── DEPLOY.md             # 本文件
```

### 0.3 当前工作区状态（提交前请以此为准）

执行下面命令可实时查看：

```powershell
cd d:\Learning\doit\cursor-ws\reset-radar
git status
```

> 截至本文编写时，工作区存在**尚未提交的改动**，上线前必须先提交（见第 3 步）：
> - 修改：`index.html` `detail.html` `status.html` `about.html` `css/style.css` 及 `js/*`（含本次「i18n 国际化」全部改动）
> - 修改：`js/utils.js` `js/status.js` `js/app.js` `js/detail.js` —— 首页/详情/状态页逻辑
> - 修改：`data/data.json` `data/fallback.js` —— 最新生成的数据
> - 修改：`scripts/config.py` `scripts/update.py` `scripts/speaker_monitor.py` —— 含「模型发布信号 24h 过滤 + 去重」修复
> - **未跟踪**：`js/i18n.js`（新文件，需 `git add` 纳入版本控制）

---

## 1. 服务商选择（尽量免费）

| 用途 | 推荐 | 免费额度 | 说明 / 备选 |
|---|---|---|---|
| 代码托管 + 定时任务 | GitHub 新建**公共仓库** | 公共仓库 Actions **免费且分钟数无上限** | 私有仓库仅 2000 分钟/月，本项目约 1080 分钟/月，偏紧 |
| 静态托管 | **Cloudflare Pages** | 免费：无限静态请求、全球 CDN、自带 SSL | 备选：Vercel Hobby（免费）、GitHub Pages（免费，仅静态） |
| 域名 | 不绑定（用 `*.pages.dev` 免费子域名） | 免费 | 可选升级：`.com` 约 ¥50–100/年 |
| 异常通知 | 企业微信机器人 | 免费 | 可选；微信群 → 添加「群机器人」→ 拿 webhook |
| X 实时发言 | 不启用（默认种子数据） | 免费 | X API 付费 Bearer 约 $100/月，**不建议** |

**推荐组合（完全 0 成本）**：GitHub 公共仓库 + Cloudflare Pages + 企业微信通知 + 不绑定域名。

> 若要在意仓库公开，可选「私有仓库 + 调低频率」：cron 改为每小时一次（720 次/月）即可落在私有仓库 2000 分钟免费额度内。

---

## 2. 本地先行验证（上线前必须做）

```powershell
cd d:\Learning\doit\cursor-ws\reset-radar

# 1) 本地起静态服务器（最接近线上，走 fetch data.json 分支）
python -m http.server 8000
# 浏览器打开 http://localhost:8000/
#    详情页：http://localhost:8000/detail.html?id=codex
#    服务状态：http://localhost:8000/status.html
#    关于页：http://localhost:8000/about.html

# 2) 生成最新数据（验证引擎可运行；本机无外网时 GitHub/Status 抓取会 warn 并回退种子，属正常）
python scripts/update.py          # 应正常写 data/data.json 与 data/fallback.js
python scripts/speaker_monitor.py # 刷新 speakers 字段
```

要点：
- 页面数据加载顺序为 `fetch data.json` → 失败回退内嵌 `fallback.js`（js/i18n.js → utils.js → api.js → app.js 顺序已保证）。
- `data.json` 用 `?t=` 时间戳 + `no-store` 规避缓存，部署后能拿到最新数据。
- 无外网环境下 update.py 自动降级为种子数据，**不影响本地预览与上线**；CI（GitHub 服务器）能直连 GitHub/Statuspage。

---

## 3. 代码提交（第一步，必须做）

> 当前仓库无 remote、有未提交改动。按下面步骤提交并推送到 GitHub。

### 3.1 查看改动
```powershell
cd d:\Learning\doit\cursor-ws\reset-radar
git status
git diff --stat          # 看改动规模
```

### 3.2 暂存并提交
```powershell
# 新增文件（i18n.js 是未跟踪新文件，必须显式纳入）：
git add js/i18n.js

# 修改过的文件：
git add index.html detail.html status.html about.html css/style.css
git add js/app.js js/detail.js js/status.js js/utils.js
git add data/data.json data/fallback.js
git add scripts/config.py scripts/update.py scripts/speaker_monitor.py

# 确认无遗漏（should 不再显示未跟踪/未暂存）：
git status

# 提交（提交信息按实际改动自行调整）
git commit -m "feat: 新增 i18n 国际化；fix: 模型发布信号24h过滤与去重、避免概率虚高"
```

> 注意：`data/data.json` 与 `data/fallback.js` 是生成文件，但**必须提交**——首次部署 Pages 时页面需要有初始数据可供加载。

---

## 4. 推送到 GitHub （第二步）

### 4.1 新建公共仓库
1. 打开 [GitHub](https://github.com) → **New repository**。
2. 仓库名填 `reset-radar`，选 **Public**（公共仓库 Actions 免费、分钟数无上限）。
3. **不要**勾选 "Add a README"（让仓库为空，避免合并冲突）。

### 4.2 关联并推送
```powershell
cd d:\Learning\doit\cursor-ws\reset-radar

# 分支统一为 main（GitHub 默认；本地当前是 master，重命名）
git branch -M main

# 关联远程仓库（把 <你的账号> 换成你的 GitHub 用户名）
git remote add origin git@github.com:<你的账号>/reset-radar.git

# 推送并设置上游（首次需认证，见 4.3）
git push -u origin main

# 确认远程分支与状态
git remote -v
git status
```

### 4.3 认证方式（二选一）
- **HTTPS + Token（推荐，无需配置 ssh）**：推送前先 `git remote set-url origin https://github.com/<你的账号>/reset-radar.git`；首次 push 会提示用户名 + 密码，密码处粘贴 Personal Access Token（GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)** → Generate new token，勾选 `repo` 权限）。
- **SSH**：需本地已生成并绑定公钥（`ssh-keygen` + GitHub → Settings → SSH and GPG keys）。

> 推送后可到 GitHub 仓库 **Actions** 标签页确认 `.github/workflows/update.yml` 已被识别（会出现在左侧列表）。

---

## 5. 连接静态托管（第三步，Cloudflare Pages 推荐）

1. 登录 [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权 GitHub，选择仓库 `reset-radar`，分支选 `main`，构建配置：
   - Framework preset：**None**（或 Static）
   - Build command：**留空**（或填 `exit 0`）
   - Build output directory：**留空**（直接发布仓库根目录）
3. 点 **Save and Deploy**，得到 `https://<项目名>.pages.dev` 免费地址，自带 SSL。

> 备选 Vercel：导入同一仓库 → Framework preset **Other** → Build Command 留空 → Output Directory 留空 → Deploy。

---

## 6. 配置 Secrets（第四步，可选）

仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Secret | 值 | 作用 |
|---|---|---|
| `WEWORK_WEBHOOK` | 企业微信机器人 webhook URL | 定时任务异常时推送告警到微信群 |
| `X_API_BEARER` | X API 付费 Bearer Token | 启用 X 实时发言抓取（**不建议**，费用高） |

> 两者**都可留空不配置**：未配置时脚本自动跳过对应功能（种子数据 + 无通知），不影响上线。

---

## 7. 定时服务与生效验证

### 7.1 定时机制
- workflow `cron: '* /30 * * * *'`（每 30 分钟一次，即每小时 00 / 30 分），GitHub 内部用 **UTC** 时间。
- 每次运行：`update.py` → `speaker_monitor.py` → `git-auto-commit` 提交 `data/data.json data/fallback.js`，commit 信息为 `🤖 Auto update: 数据刷新`。

### 7.2 推送后手动触发一次
仓库 **Actions** 标签页 → 左侧 `数据更新` → **Run workflow** → 手动跑一次。

### 7.3 观察日志排查
- **成功**：日志尾部出现 `🤖 Auto update: 数据刷新` 的自动 commit。
- **网络告警**：`[warn] 抓取失败 ... timeout` 属预期降级（回退种子），不影响主流程。
- **发言雷达**：默认走种子（日志无 X 相关报错）；配置了 Bearer 才会请求 X。

### 7.4 验证定时真正生效
1. 首次手动触发成功后，等待 cron 下一次计划时间。
2. **Actions** 页面确认出现自动触发的运行记录（非手动）。
3. **Commits** 历史确认出现自动 commit。
4. 打开页面，顶部「最后更新」与最近一次自动运行时间一致。

> 免费账号在仓库长期无活动时，cron 可能延迟数分钟，属正常现象。

---

## 8. 上线后日常维护

重置时刻无免费公开源，需人工维护（写入 `data/resets.json`，`update.py` 每次会自动合并并重新预测）：

```powershell
cd d:\Learning\doit\cursor-ws\reset-radar

python scripts/record_reset.py codex                        # 记录当前时刻的重置（参数即前几秒内发生）
python scripts/record_reset.py codex 2026-08-22T03:30:00Z "实测重置"      # 指定时刻+原因
python scripts/record_reset.py codex 2026-08-22T03:30:00Z --extra --reason "庆祝活跃用户破1500万"  # 额外重置（不计入周期）
python scripts/record_reset.py kimi  2026-08-22T03:30:00Z --no-reset     # 候选点未发生重置（记录）
```

提交 & 推送（下次定时任务自动合并）：

```powershell
git add data/resets.json
git commit -m "记录: codex 重置"
git push
```

> `data/resets.json` 会被 git 跟踪（也可按需加入 `.gitignore` 只本地维护）。demo 用的 seed 重置写死在 `scripts/config.py` 的 `resets` 与 `MANUAL_RESETS` 中。

---

## 9. 验证清单

### 9.1 功能（手机浏览器或 DevTools 移动视图）
- [ ] 首页：平台卡片、概率动画、倒计时正向、Tab 切换
- [ ] 详情页：仪表盘、判断/摘要/信号、历史重置记录（含自动 `no_reset`）、周额度趋势、🗣️ 发言雷达
- [ ] 服务状态页、关于页正常
- [ ] 底部导航 3 项（概览/服务状态/关于），无 404
- [ ] 语言切换（中/英）可用

### 9.2 数据与定时
- [ ] 「最后更新」每 30 分钟自动刷新
- [ ] Actions 连续 3 次运行成功
- [ ] `data.json` 的 `last_updated` 与最新 commit 一致
- [ ] 手动触发 `Run workflow` 有效

### 9.3 缓存与降级
- [ ] 部署后页面能加载最新数据（前端已用 `?t=` 与 `no-store`）
- [ ] 断网/抓取失败时页面仍可用（fallback 逻辑）

### 9.4 通知（若配置）
- [ ] 企业微信群收到一次测试/异常告警

### 9.5 域名（可选升级）
- [ ] 自定义域名 DNS CNAME 指向 `*.pages.dev`，SSL 自动生效

---

## 10. 成本核算与风险

### 10.1 成本
| 项 | 免费路径 | 付费升级 |
|---|---|---|
| GitHub + Actions | ¥0（公共仓库） | 私有仓库也可免费（额度偏紧） |
| Cloudflare Pages | ¥0 | ¥0（域名另算） |
| 域名 | ¥0（`.pages.dev`） | 约 ¥50–100/年 |
| 企业微信 | ¥0 | ¥0 |
| X 实时 | ¥0（种子） | 约 $100/月（不建议） |

### 10.2 风险与对策
| 风险 | 对策 |
|---|---|
| 私有仓库 Actions 分钟超标 | 用公共仓库，或 cron 降为每小时 |
| 每 30 分钟一次 commit 使提交历史膨胀 | 已限定 `file_pattern` 只提交数据文件；长期可合并历史 |
| 种子/重置数据过期，预测失真 | 用 `record_reset.py` 定期维护；发言种子随 `speaker_monitor.py` 更新 |
| X 无免费源导致发言雷达无实时数据 | 文档与页面已如实标注「种子驱动」，避免误导 |

---

## 11. 上线后例行

- **每周**：用 `record_reset.py` 补录观察到的重置，保持预测准确。
- **每月**：检查 Actions 运行统计（仓库 → Actions → Usage），确认不超免费额度。
- **版本升级**：改脚本/前端后 push 到 `main`，Pages 自动重新部署（前端即时生效；数据由定时任务刷新）。
- **监控**：配置 `WEWORK_WEBHOOK` 后，异常会自动推送微信。