可以。基于你现在的工程实现，我建议 **V2 不做“推翻重写”，而是把现有 `data.json + resets.json + signals` 重新抽象成“状态 → 事件 → 观测 → 预测”四层数据模型**。

你现在的 `update.py` 已经具备几个很好的基础：周期计算、信号抓取、observed/manual/seed 来源区分、预测时间自动顺延，以及 GitHub Actions 静态生成链路。
但当前 schema 把“正常周期恢复”“额外重置”“未重置”“模型发布信号”都塞在同一套 `probability` 逻辑里，这会让后续算法越来越难维护。当前首页也仍是“加载预测数据 → 平台卡片”的结构。

下面我给你一套可以直接落到代码里的 V2。

---

# 一、V2 的核心思想

把现在：

```text
platform
 ├─ probability
 ├─ prediction_time
 ├─ signals
 ├─ history
 └─ weekly_quota
```

改成：

```text
Provider
 └─ Product
     ├─ Usage Windows
     ├─ Current State
     ├─ Reset Events
     ├─ Observations
     ├─ Signals
     └─ Forecasts
```

也就是：

> **平台是什么**
>
> **现在是什么状态**
>
> **最近发生了什么**
>
> **我们看到了什么证据**
>
> **未来可能发生什么**

这样算法和前端都自然很多。

---

# 二、V2 顶层 `data.json`

建议最终输出：

```json
{
  "schema_version": "2.0",
  "generated_at": "2026-08-29T09:30:00Z",
  "data_freshness": {
    "status": "fresh",
    "max_age_seconds": 3600,
    "sources_ok": 12,
    "sources_failed": 1
  },

  "providers": [],
  "products": [],
  "windows": [],
  "current_state": [],
  "events": [],
  "observations": [],
  "signals": [],
  "forecasts": [],
  "anomalies": [],
  "service_status": [],
  "meta": {}
}
```

这里最重要的是：

### 不再把所有内容嵌在 platform 对象里。

---

# 三、Provider Schema

例如：

```json
{
  "id": "openai",
  "name": {
    "en": "OpenAI",
    "zh": "OpenAI"
  },
  "logo": "/assets/openai.svg",
  "status_url": "https://status.openai.com/",
  "homepage": "https://openai.com/",
  "enabled": true
}
```

注意：

**Provider ≠ Product。**

因为：

```text
OpenAI
 ├─ Codex
 ├─ ChatGPT
 └─ ...
```

未来：

```text
Anthropic
 └─ Claude Code

Google
 └─ Gemini CLI
```

这样以后不会被当前“一个平台 = 一个 AI 工具”的假设绑死。

---

# 四、Product Schema

例如 Codex：

```json
{
  "id": "codex",
  "provider_id": "openai",

  "name": {
    "en": "Codex",
    "zh": "Codex"
  },

  "category": "coding_agent",

  "tracking": {
    "global_events": true,
    "account_usage": true,
    "community_reports": true
  },

  "official": {
    "usage_url": "https://chatgpt.com/codex",
    "docs_url": "https://help.openai.com/"
  }
}
```

这个层以后可以支持：

```text
coding_agent
chat
cli
ide
api
```

---

# 五、最关键的新 Schema：Usage Window

这是 V2 最应该增加的东西。

因为现在你实际上默认：

> 一个 product = 一个 reset cycle

这并不成立。

例如 OpenAI 当前官方文档已经明确涉及 **5-hour usage window + weekly usage window**，并且完整的 banked reset 会同时刷新这两个窗口。([OpenAI Help Center][1])

Cursor 当前官方文档也存在两个 usage pools，并且按 monthly cycle reset。([Cursor][2])

因此：

```json
{
  "id": "codex_5h",
  "product_id": "codex",

  "name": {
    "en": "5-hour window",
    "zh": "5小时额度窗口"
  },

  "window_type": "rolling",

  "duration_seconds": 18000,

  "reset_behavior": "rolling",

  "observable": true,

  "prediction_enabled": false
}
```

另一个：

```json
{
  "id": "codex_weekly",
  "product_id": "codex",

  "name": {
    "en": "Weekly limit",
    "zh": "每周额度"
  },

  "window_type": "weekly",

  "reset_behavior": "scheduled",

  "prediction_enabled": true
}
```

Cursor：

```json
{
  "id": "cursor_monthly",
  "product_id": "cursor",

  "window_type": "billing_cycle",

  "reset_behavior": "scheduled",

  "prediction_enabled": true
}
```

---

# 六、Current State：用户真正应该看的数据

这个对象就是首页的核心。

```json
{
  "product_id": "codex",

  "availability": "limited",

  "overall_state": "cooling",

  "updated_at": "2026-08-29T09:30:00Z",

  "windows": [
    {
      "window_id": "codex_5h",
      "state": "limited",

      "reset_at": "2026-08-29T12:12:00Z",

      "countdown_seconds": 9720,

      "usage_percent": null,

      "confidence": 0.91,

      "source": "observed"
    },

    {
      "window_id": "codex_weekly",
      "state": "available",

      "reset_at": "2026-09-02T14:00:00Z",

      "countdown_seconds": 331200,

      "confidence": 0.78,

      "source": "estimated"
    }
  ]
}
```

这里非常重要：

### `source`

建议 V2 标准化成：

```text
official
observed
community
estimated
seed
```

而不是目前的：

```text
seed
manual
observed
auto
```

因为 `auto` 不是数据来源。

它其实是：

> inference method

---

# 七、把 Source 和 Evidence 分开

这是当前 schema 很值得改的地方。

当前代码直接：

```text
source = observed/manual/seed/auto
```

这种写法把很多概念混在一起。现在的代码中也确实是在依靠 source 来控制“历史是否真实展示”。

V2 改成：

```json
{
  "source": {
    "type": "community",
    "provider": "github",
    "url": "https://github.com/..."
  },

  "evidence": {
    "strength": 0.61,
    "independence": 0.8,
    "freshness": 0.94
  }
}
```

这样以后才能真正做证据融合。

---

# 八、Event Schema：真正的 Reset Ledger

这是整个 V2 的“黄金数据”。

```json
{
  "id": "evt_20260827_openai_codex_001",

  "product_id": "codex",

  "event_type": "global_reset",

  "scope": {
    "type": "global",
    "plan": ["plus", "pro"]
  },

  "detected_at": "2026-08-27T16:35:00Z",

  "effective_at": "2026-08-27T16:30:00Z",

  "announced_at": null,

  "reset_kind": "extra",

  "status": "confirmed",

  "source": {
    "type": "official",
    "url": "...",
    "title": "..."
  },

  "confidence": 0.98
}
```

---

# 九、Event Type 建议固定成 6 类

```text
regular_reset
global_reset
account_reset
quota_change
reset_delay
reset_anomaly
```

其中：

### regular_reset

正常周期恢复。

### global_reset

平台对大量用户/全部用户进行额外 reset。

### account_reset

单账户 observed reset。

### quota_change

提高 / 降低 quota。

### reset_delay

到了预计时间，但没有恢复。

### reset_anomaly

提前恢复、延后恢复、周期异常。

---

# 十、你现在的 `no_reset` 不应该再被当成 Reset History Event

目前 `update.py` 会自动生成：

```text
type = no_reset
source = auto
```

作为历史的一部分。

V2 建议改成：

```json
{
  "observation_type": "no_reset_observed",

  "candidate_at": "2026-08-29T10:00:00Z",

  "observed_until": "2026-08-29T12:00:00Z",

  "result": "not_reset",

  "source": "automated"
}
```

它属于：

# Observation

不是：

# Event

区别非常重要。

---

# 十一、Observation Schema

这是 V2 的第二个核心数据资产。

```json
{
  "id": "obs_...",
  "product_id": "claude",

  "observed_at": "2026-08-29T09:22:00Z",

  "observation_type": "reset_state",

  "value": {
    "state": "available"
  },

  "source": {
    "type": "community",
    "provider": "github",
    "url": "..."
  },

  "confidence": 0.82
}
```

未来用户提交：

> “Claude 刚刚 reset”

也只是产生一条 observation。

系统经过：

```text
多个 observation
       ↓
correlation
       ↓
event
```

最终才升级成为：

> confirmed_reset_event

这就很专业了。

---

# 十二、Signal V2

当前 signal 太偏：

```text
model_release +10
community +5
```

现在 `update.py` 的确就是直接把不同 kind 转成百分点调整。

V2 不要存：

```json
"adjustment": 10
```

改成：

```json
{
  "id": "sig_...",
  "product_id": "codex",

  "type": "official_announcement",

  "occurred_at": "2026-08-29T08:00:00Z",

  "direction": "increase",

  "features": {
    "reset_related": true,
    "quota_related": true,
    "severity": 0.7
  },

  "source": {
    "type": "official",
    "url": "..."
  },

  "freshness": 0.91
}
```

**算法负责把 signal 转成概率。**

数据层不应该把：

> “这个 signal = +10”

写死。

否则以后换模型很麻烦。

---

# 十三、预测结果 Forecast Schema

推荐：

```json
{
  "id": "fc_...",
  "product_id": "codex",

  "target": {
    "type": "global_reset",
    "horizon_hours": 24
  },

  "generated_at": "2026-08-29T09:30:00Z",

  "prediction": {
    "probability": 0.34,

    "expected_at": null,

    "interval": {
      "p50": null,
      "p80": null,
      "p95": null
    }
  },

  "model": {
    "name": "hazard_v1",
    "version": "1.0"
  },

  "evidence": {
    "historical_events": 18,
    "recent_signals": 4,
    "community_observations": 7
  },

  "calibration": {
    "status": "experimental"
  }
}
```

---

# 十四、预测算法 V2：我建议完全换成“两套模型”

这是最核心的算法调整。

---

## Model A：Expected Recovery

目标：

> 下一次正常 quota window 什么时候恢复？

**不用概率优先。**

计算：

```text
observed intervals
        ↓
remove anomalies
        ↓
weighted median
        ↓
expected reset time
        ↓
prediction interval
```

推荐：

```python
median_cycle
MAD
recent_weight = 0.7
historical_weight = 0.3
```

而不是你现在：

```python
avg_cycle = mean(intervals)
stddev = pstdev(intervals)
```

你现在的实现确实是最近最多 11 个点、最多 10 个间隔做 arithmetic mean。

V2：

```python
robust_cycle = weighted_median(intervals)
mad = median(abs(x - median))
```

这样一个异常周期不会把下一个预测点拖得很远。

---

# 十五、Recovery Model 输出不要是一个时间

而应该是：

```json
{
  "p50": "2026-08-29T12:30:00Z",
  "p80": "2026-08-29T13:10:00Z",
  "p95": "2026-08-29T14:00:00Z"
}
```

前端：

> **Expected in 2h 31m**

点击后：

> Most likely 12:30
> 80% likely before 13:10
> 95% likely before 14:00

比“73% probability”更符合时间预测。

---

# 十六、Model B：Extra Reset Hazard

这个才用概率。

目标：

> **未来 24 小时是否出现 global extra reset？**

最开始不要 ML。

采用：

## Bayesian / Hazard Score

基础：

```text
λ = historical extra-reset rate
```

然后：

```text
log_hazard =
    intercept

  + time_since_last_global_reset

  + weekday_effect

  + recent_reset_frequency

  + official_signal

  + model_release_signal

  + community_burst

  + service_anomaly
```

最后：

```text
P(event within 24h)
= 1 - exp(-λ * 24h)
```

这样才是“概率”。

---

# 十七、Signal 权重也不要再写死成 +30 / -20

当前：

```text
official_up +30
official_down -20
model_release +10
community +5
```

来自当前规则引擎。

V2 做：

```python
signal_score = (
    reliability
    * freshness
    * independence
    * impact
)
```

例如：

```text
official announcement
reliability = 0.98
freshness = 0.95
impact = 1.0

=> 0.93
```

GitHub issue：

```text
reliability = 0.55
freshness = 0.90
independence = 0.60

=> 0.30
```

这样：

**同一种 signal，不再永远固定 +10。**

---

# 十八、非常重要：增加“证据独立性”

假设：

```text
50 个 GitHub issues
```

其实可能全部来自：

> 一个人发帖后被 49 个人重复引用。

不能算：

> 50 independent signals

因此：

```json
{
  "evidence": {
    "reports": 50,
    "independent_sources": 3,
    "independence": 0.18
  }
}
```

这会极大改善预测质量。

---

# 十九、加入“预测生命周期”

每一个 Forecast 创建以后：

```text
PENDING
   ↓
HIT
   ↓
MISS
   ↓
EXPIRED
```

比如：

```json
{
  "forecast_id": "fc_001",

  "created_at": "...",

  "prediction": {
    "probability": 0.72
  },

  "resolution": {
    "status": "hit",
    "resolved_at": "...",
    "actual_event_id": "evt_..."
  }
}
```

有了这个，你才能开始真正评估模型。

---

# 二十、V2 必须增加 Model Evaluation

新增：

```text
data/evaluations.json
```

或者更好：

```text
data/forecasts.json
```

每次预测都永久保存。

然后每周计算：

```text
Brier score
Log loss
Calibration
Precision
Recall
MAE
```

其中：

### 时间预测

用：

```text
MAE
Median Absolute Error
80% interval coverage
```

### 事件预测

用：

```text
Brier score
Calibration
Precision / Recall
```

---

# 二十一、Confidence 也重新设计

你现在：

```text
confidence =
1 - stddev / avg_cycle
```

并最终 clamp 到 30~99。

V2 建议：

```text
confidence =
cycle_stability
× sample_confidence
× source_confidence
× model_calibration
```

例如：

```text
cycle stability   0.91
sample count      0.62
source quality    0.88
calibration       0.76

=> confidence = 0.38
=> 38%
```

这种 confidence 才真正表达“不确定性”。

---

# 二十二、V2 Homepage 我建议直接改掉现在的 Tabs-first

现在首页的核心结构是：

```text
topbar
tabs
cards
bottomnav
```

源码也能看出，tabs 是数据加载后承接平台卡片的核心入口。

V2 应该改成：

# 首页 = Answer Dashboard

---

## 第一屏

```text
RESET RADAR

What can I use right now?

────────────────────

Claude Code      Available
5h window        2h 31m

Codex            Limited
next recovery    42m

Gemini CLI       Available
daily reset      5h 12m

Cursor           Available
monthly reset    Sep 3
```

---

# 二十三、第一屏下面：Now / Next / Events

### Now

```text
AVAILABLE NOW
4 / 7 providers
```

### Next

```text
NEXT RECOVERIES

Codex          42m
Claude         2h31m
Gemini         5h12m
```

### Events

```text
RECENT GLOBAL RESETS

⚡ Codex
Aug 27 · Confirmed

⚡ Claude
Aug 18 · Confirmed
```

---

# 二十四、最后才放 Radar

```text
RESET RADAR

Codex
Extra reset probability
34%

Claude
Extra reset probability
18%

Gemini
Extra reset probability
7%
```

这里才出现“概率”。

这样用户会自然理解：

> “这是额外 reset 的预测，不是正常 quota recovery 时间。”

---

# 二十五、首页卡片 V2

我建议统一成：

```text
┌──────────────────────────┐
│ ⚡ Codex             ●    │
│                          │
│ LIMITED                  │
│                          │
│ Recovery                 │
│ 42m                      │
│                          │
│ 5h window                │
│ ███████░░░               │
│                          │
│ Weekly                   │
│ Sep 2 · 14:00            │
│                          │
│ ⚡ Extra reset 34%        │
│                          │
│ Observed 9 cycles        │
└──────────────────────────┘
```

没有必要一上来放：

> probability 73%

---

# 二十六、Detail Page 也要改

你现在 detail page 只是：

> Details → JS 动态 render

而且当前 SEO 明确 `noindex`。

我建议 Detail V2：

```text
Claude Code

AVAILABLE
Next recovery · 2h 31m

────────────────

USAGE WINDOWS

5-hour
██████░░░
Recovery 2h31m

Weekly
████░░░░░
Recovery Sep 2

────────────────

RESET HISTORY

Aug 27   ● regular
Aug 18   ⚡ extra
Aug 11   ● regular
Aug 04   ● regular

────────────────

RADAR

Extra reset probability
18%

Why?

Official signals      none
Community reports     low
Historical frequency  low

────────────────

ANOMALIES

No abnormality detected
```

---

# 二十七、Detail 页应该新增一个“Why this estimate?”

这个是你产品建立信任的关键。

例如：

> **Why 2h 31m?**

```text
6 recent cycles observed
Median interval     118h
Cycle variation      low
Last actual reset    Aug 25
Current age          115h
```

然后：

> Expected recovery: 12:31
> Confidence: 84%

这个比一个 gauge 强太多。

---

# 二十八、Status Page 继续保留，但降为三级导航

底部导航建议：

```text
Overview
History
Status
About
```

不要：

```text
Overview
Service Status
About
```

因为未来真正重要的数据资产是：

> History

而不是：

> Status

---

# 二十九、History 页应该成为 SEO 页面

这个其实非常有价值。

例如：

```text
/reset-history/codex
/reset-history/claude
/reset-history/gemini
```

页面：

```text
Codex Reset History

Confirmed global resets
────────────────────

Aug 27   Global reset
Aug 18   Regular recovery
Aug 11   Global reset
...
```

再显示：

```text
Average extra reset interval
7.2 days

Median
6.8 days

Longest gap
19.4 days
```

这会比现在把 history 藏在 detail JS 里更有搜索价值。

---

# 三十、About 页面也需要随模型一起升级

你现在 About 明确写的是：

> “cycle baseline + signal weighting”
>
> “baseline + signal adjustment”
>
> “confidence = historical cycle stability”

这些说明都对应旧模型。

V2 About 应该改成：

```text
Reset Radar separates three different things:

1. Recovery
When a normal quota window is expected to refresh.

2. Reset Events
Unexpected or global quota resets observed across users.

3. Anomalies
Cases where actual behavior differs materially from the expected cycle.
```

然后：

> Predictions are estimates, not official quota guarantees.

这个表述也继续保留你现在的 disclaimer 思路。

---

# 三十一、V2 文件结构，我建议直接这样调整

```text
data/
├── data.json
├── fallback.js
├── events.json
├── observations.json
├── forecasts.json
└── evaluation.json
```

---

## scripts/

```text
scripts/
├── config.py
│
├── collectors/
│   ├── github.py
│   ├── statuspage.py
│   ├── official.py
│   └── community.py
│
├── normalize.py
├── event_engine.py
├── observation_engine.py
│
├── models/
│   ├── recovery.py
│   ├── hazard.py
│   ├── confidence.py
│   └── calibration.py
│
├── pipeline.py
├── verify.py
└── record_observation.py
```

这样以后你不会再出现：

> `update.py` 700~1000 行全塞在一起。

---

# 三十二、GitHub Actions V2

你现在：

```text
monitor.py
↓
update.py
↓
speaker_monitor
↓
commit
```

V2：

```text
collect
   ↓
normalize
   ↓
observation engine
   ↓
event correlation
   ↓
recovery model
   ↓
hazard model
   ↓
forecast resolution
   ↓
evaluation
   ↓
generate data.json
   ↓
commit
```

---

# 三十三、我建议 GitHub Actions 也分频率

现在全部 30 分钟执行。

V2：

### 每 10 分钟

```text
official status
quota event sources
event detection
```

### 每 30 分钟

```text
community
forecast
```

### 每 6 小时

```text
model evaluation
history statistics
```

### 每天

```text
speaker
SEO snapshot
```

这样可以降低 GitHub API 压力。

---

# 三十四、第一版迁移方式

千万不要一次重构全部。

建议：

### Step 1

当前：

```text
data.json
```

继续存在。

新增：

```text
data/v2.json
```

---

### Step 2

把现有：

```text
config.resets
MANUAL_RESETS
resets.json
```

统一转换成：

```text
events.json
```

---

### Step 3

把：

```text
GitHub issue
Statuspage
Release
manual observation
```

统一生成：

```text
observations.json
signals.json
```

---

### Step 4

新的：

```text
recovery.py
```

只负责正常周期。

---

### Step 5

新的：

```text
hazard.py
```

只负责：

> extra reset probability

---

### Step 6

前端先兼容：

```text
data.json v1
data.json v2
```

等 v2 稳定再删 v1。

---

# 三十五、最小可执行 V2 Schema

如果你现在马上开工，我甚至建议第一版先只实现这 7 个实体：

```text
Provider
Product
Window
Event
Observation
Signal
Forecast
```

关系：

```text
Provider
   │
   └── Product
          │
          ├── Window
          │     └── Forecast
          │
          ├── Event
          │
          ├── Observation
          │
          └── Signal
```

这是整个系统最重要的骨架。

---

# 三十六、最后给你一版“真正可以落代码”的数据流

```text
                ┌──────────────┐
                │ Official API │
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │ GitHub       │
                │ Issues       │
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │ Statuspage   │
                └──────┬───────┘
                       │
                ┌──────▼───────┐
                │ User reports │
                └──────┬───────┘
                       │
                       ▼
              ┌─────────────────┐
              │ Normalize       │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ Observations    │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ Event Correlation│
              └───────┬─────────┘
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
 ┌─────────────────┐      ┌─────────────────┐
 │ Recovery Model  │      │ Hazard Model    │
 │ “什么时候恢复” │      │ “额外reset概率” │
 └────────┬────────┘      └────────┬────────┘
          │                        │
          └───────────┬────────────┘
                      ▼
               ┌──────────────┐
               │ Forecasts    │
               └──────┬───────┘
                      ▼
               ┌──────────────┐
               │ Calibration  │
               └──────┬───────┘
                      ▼
               ┌──────────────┐
               │ Static JSON   │
               └──────┬───────┘
                      ▼
              ┌──────────────────┐
              │ Reset Radar H5   │
              └──────────────────┘
```

---

# 三十七、我认为 V2 最关键的 5 个产品决策

**第一：** 不再把“正常 reset”当概率事件。

**第二：** “预计恢复时间”和“额外 reset probability”彻底分离。

**第三：** `events`、`observations`、`signals` 三种东西分开。

**第四：** 每一次预测都保存结果，开始建立 calibration dataset。

**第五：** 首页不再以“平台/概率”为主，而是：

> **现在能不能用 → 什么时候恢复 → 最近有没有异常 reset → 额外 reset 可能性**

这样一改，整个项目会从一个“有很多指标的 quota dashboard”，变成一个真正有数据模型、有历史资产、有预测闭环的 **AI Usage Intelligence 产品**。

而且这个设计与当前实际平台的额度机制更加匹配：例如 Codex 已经存在 5 小时和 weekly usage windows、banked reset 会改变周期；Cursor 则存在多个 usage pools 和 billing-cycle reset。([OpenAI Help Center][1])

**我最建议的下一步，不是再讨论设计，而是直接把你现有 `update.py` 改成 V2 的第一版：`schema v2 + event ledger + recovery model + hazard model + 向下兼容 v1 data.json`。**这样可以在不破坏现在网站的情况下开始积累真正有价值的数据。

[1]: https://help.openai.com/en/articles/11369540/?utm_source=chatgpt.com "Using Codex with your ChatGPT plan | OpenAI Help Center"
[2]: https://cursor.com/blog/increased-agent-usage?utm_source=chatgpt.com "Increased usage for agents · Cursor"
