# Reset Radar 部署上线方案

> 目标：把「纯静态前端 + GitHub Actions 定时任务」的 Reset Radar 上线，**默认 0 成本**，支持少量付费升级（自定义域名 / X 实时数据）。

---

## 0. 现状与关键约束

| 现状 | 说明 |
|---|---|
| 前端 | 纯 HTML/CSS/JS，无构建、无第三方依赖，静态托管即可 |
| 数据 | `data/data.json` + `data/fallback.js`（回退副本），由定时任务生成 |
| 定时任务 | `.github/workflows/update.yml`：cron 每 30 分钟跑 `update.py` + `speaker_monitor.py`，自动 commit `data/data.json data/fallback.js` |
| 后端脚本 | Python 3.11 标准库，零 pip 依赖 |
| 可选 Secrets | `WEWORK_WEBHOOK`（企业微信告警）、`X_API_BEARER`（X 实时发言，付费） |

**⚠️ 最关键的约束**：GitHub Actions 只识别**仓库根目录**下的 `.github/workflows/`。
当前 reset-radar 位于 monorepo `oneMore`（`fancyfff/oneMore`）的子目录 `aireset/reset-radar` 中，
**该 workflow 不会被 GitHub 识别**。因此第一步必须把 reset-radar 发布为**独立 GitHub 仓库**。

---

## 1. 服务商选择（尽量免费）

| 用途 | 推荐 | 免费额度 | 说明 / 备选 |
|---|---|---|---|
| 代码托管 + 定时任务 | GitHub 新建**公共仓库** | 公共仓库 Actions **免费且分钟数无上限** | 私有仓库仅 2000 分钟/月，本项目约 1080 分钟/月，偏紧 |
| 静态托管 | **Cloudflare Pages** | 免费：无限静态请求、全球 CDN、自带 SSL | 备选：Vercel Hobby（免费，限非商用）、GitHub Pages（免费，仅静态） |
| 域名 | 不绑定（用 `*.pages.dev` 免费子域名） | 免费 | 可选升级：`.com` 约 ¥50–100/年，绑定后仍免费托管 |
| 异常通知 | 企业微信机器人 | 免费 | 可选；微信里建群 → 添加「群机器人」→ 拿 webhook |
| X 实时发言 | 不启用（默认种子数据） | 免费 | X API 付费 Bearer 约 $100/月，**不建议**；种子数据已够演示 |

**推荐组合（完全 0 成本）**：GitHub 公共仓库 + Cloudflare Pages + 企业微信通知 + 不绑定域名。

> 若在意仓库公开，可选「私有仓库 + 调低频率」：cron 改为每小时一次（720 次/月）即可稳定落在 2000 分钟免费额度内。

---

## 2. 上线步骤

### 2.1 把 reset-radar 发布为独立 GitHub 仓库

> 当前它是 `oneMore` monorepo 的子目录，必须独立出来。二选一：

**方式 A（推荐，一劳永逸）**：就地转为独立仓库
```powershell
# 在 reset-radar 目录内建立独立 git 仓库
cd d:\Learning\doit\allInOne\aireset\reset-radar
git init
git add .
git commit -m "init: Reset Radar 独立仓库"
```
> 注意：此操作使 reset-radar 成为嵌套仓库，`oneMore` 将不再跟踪其内部文件；如仍想保留在 monorepo 内开发，用方式 B。

**方式 B（最安全）**：复制到新目录独立发布，不动原工作区
```powershell
# 复制 reset-radar 到独立项目目录
Copy-Item d:\Learning\doit\allInOne\aireset\reset-radar C:\Projects\reset-radar -Recurse
cd C:\Projects\reset-radar
git init
git add .
git commit -m "init: Reset Radar"
```

先补一个 `.gitignore`（两种方式都需要）：
```gitignore
__pycache__/
*.pyc
.venv/
.DS_Store
```

### 2.2 推送到 GitHub

1. 在 GitHub 网页 **New repository** → 仓库名 `reset-radar` → 选 **Public**（免费 Actions）→ 不勾选 README（仓库为空）。
2. 本地关联并推送：
```powershell
git remote add origin git@github.com:<你的账号>/reset-radar.git
git branch -M main
git push -u origin main
```

### 2.3 连接静态托管（Cloudflare Pages 推荐）

1. 登录 [Cloudflare](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权并选择 `reset-radar` 仓库，构建配置：
   - Framework preset：**None**（或 Static）
   - Build command：留空（或填 `exit 0`）
   - Build output directory：**留空**（直接发布仓库根目录）
3. 点击 **Save and Deploy**，得到 `https://<项目名>.pages.dev` 免费地址，自带 SSL。

> 备选 Vercel：导入同一仓库 → Framework preset **Other** → Build Command 留空 → Output Directory 留空 → Deploy。

### 2.4 配置 Secrets（可选）

仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Secret | 值 | 作用 |
|---|---|---|
| `WEWORK_WEBHOOK` | 企业微信机器人 webhook URL | 定时任务异常时推送告警到微信群 |
| `X_API_BEARER` | X API 付费 Bearer Token | 启用 X 实时发言抓取（**不建议**，费用高） |

> 两个都**可留空不配置**：未配置时脚本自动跳过对应功能（种子数据 + 无通知），不影响上线。

---

## 3. 定时服务调试

### 3.1 本地先行验证
```powershell
python scripts/update.py           # 应正常生成 data.json，网络抓取失败会 warn 并回退种子
python scripts/speaker_monitor.py  # 刷新 speakers 字段
```
> 本地无外网属正常，CI 环境（GitHub 服务器）能直连 GitHub/Statuspage。

### 3.2 推送后手动触发
仓库 **Actions** 标签页 → 左侧 `数据更新` → **Run workflow** → 手动跑一次。

### 3.3 观察日志排查
- **构建成功、提交正常**：日志尾部应出现 `🤖 Auto update: 数据刷新` 的 commit。
- **网络告警**：`[warn] 抓取失败 ... timeout` → 属预期降级（回退种子），不影响主流程。
- **企业微信**：若配置了 webhook，异常时微信群会收到告警；未配置则跳过（正常）。
- **发言雷达**：默认走种子（日志无 X 相关报错）；配置了 Bearer 才会请求 X。

### 3.4 验证定时真正生效
1. 首次手动触发成功后，等待 cron 下一次计划时间（**GitHub 用 UTC**，`*/30` 即每小时的 00/30 分）。
2. 进入 **Actions** 页面确认出现了自动触发的运行记录。
3. 检查仓库 **Commits** 历史，确认出现自动 commit（非手动提交）。
4. 打开页面，确认顶部「最后更新」时间与最近一次自动运行时间一致。

> 提示：免费账号的 Actions 在仓库长期无活动时，cron 可能延迟数分钟，属正常现象。

### 3.5 数据维护（上线后日常）
重置时刻无免费公开源，需人工维护：
```powershell
python scripts/record_reset.py codex                     # 记录当前时刻的重置
python scripts/record_reset.py codex 2026-08-22T03:30:00Z "实测重置"
python scripts/record_reset.py claude ... --extra --reason "庆祝活跃用户破1500万"   # 额外重置
python scripts/record_reset.py kimi ... --no-reset                                # 候选点未重置
```
在本地运行后 `git push`，下次定时任务会自动合并 `data/resets.json` 并重新预测。

---

## 4. 验证清单

### 4.1 功能验证（手机浏览器或 DevTools 移动视图）
- [ ] 首页：平台卡片、概率动画、倒计时正向、Tab 切换
- [ ] 详情页：仪表盘、判断/摘要/信号、历史重置记录（含自动 `no_reset`）、周额度趋势、🗣️ 发言雷达
- [ ] 服务状态页、关于页正常
- [ ] 底部导航 3 项（概览/服务状态/关于），无 404 页面

### 4.2 数据与定时
- [ ] 「最后更新」时间每 30 分钟自动刷新
- [ ] Actions 连续 3 次运行均成功
- [ ] `data.json` 的 `last_updated` 与最新 commit 一致
- [ ] 手动触发 `Run workflow` 有效

### 4.3 缓存与降级
- [ ] 部署后页面能加载最新数据（前端已用 `?t=` 与 `no-store` 规避缓存）
- [ ] 断网/抓取失败时页面仍可用（fallback 逻辑）

### 4.4 通知（若配置）
- [ ] 企业微信群收到一次测试/异常告警

### 4.5 域名（可选升级）
- [ ] 自定义域名 DNS CNAME 指向 `*.pages.dev`，SSL 自动生效

---

## 5. 成本核算与风险

### 5.1 成本
| 项 | 免费路径 | 付费升级 |
|---|---|---|
| GitHub + Actions | ¥0（公共仓库） | 私有仓库也可免费（额度偏紧） |
| Cloudflare Pages | ¥0 | ¥0（域名另算） |
| 域名 | ¥0（`.pages.dev`） | 约 ¥50–100/年 |
| 企业微信 | ¥0 | ¥0 |
| X 实时 | ¥0（种子） | 约 $100/月（不建议） |

### 5.2 风险与对策
| 风险 | 对策 |
|---|---|
| 私有仓库 Actions 分钟超标 | 用公共仓库，或 cron 降为每小时 |
| 每 30 分钟一次 commit 使提交历史膨胀 | 已限定 `file_pattern` 只提交数据文件；长期可合并历史 |
| 种子/重置数据过期，预测失真 | 用 `record_reset.py` 定期维护；发言种子随 `speaker_monitor.py` 更新 |
| X 无免费源导致发言雷达无实时数据 | 文档与页面已如实标注"种子驱动"，避免误导 |

---

## 6. 上线后日常维护
- **每周**：用 `record_reset.py` 补录观察到的重置，保持预测准确。
- **每月**：检查 Actions 运行统计（仓库 → Actions → Usage），确认不超免费额度。
- **版本升级**：修改脚本/前端后 push 到 `main`，Pages 自动重新部署（前端即时生效；数据由定时任务刷新）。
- **监控**：配置了 `WEWORK_WEBHOOK` 后，异常会自动推送微信。
