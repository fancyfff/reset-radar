# Reset Radar 待办事项

> 扩线当前站点优化清单，按优先级排列。完成一项勾选一项。

## ☑️ 一、Logo 提示词（AI 出图用）
> 已提供我推荐：**没有勾选即未用，任选其一**

- [ ] **主推（扁平矢量雷达）**
      `Flat vector minimalist logo for "Reset Radar", a circular radar sweep with an arc and a glowing cyan dot, gradient from sky-blue (#00D4FF) to light blue-purple (#7C3AED), on a transparent dark navy (#0A0E17) rounded background, clean geometric lines, thick consistent strokes, no text, centered, modern SaaS app icon style.`
- [ ] **备选（含文字保险）**
      `Modern SaaS logo, wordmark "RESET RADAR" in bold white geometric sans-serif next to a small glowing radar antenna icon in cyan-blue gradient, dark navy background, clean minimal tech aesthetic, high contrast, app icon.`

## ☑️ 二、写一篇 X 推文推荐该网站
> 已起草 3 版（版 A 推荐），选一版发布

- [ ] **版 A · 简洁推荐**
      ```
      Running out of AI quota again? Want to know the exact second your Codex, Claude Code, Grok or Kimi resets?

      I built Reset Radar — live countdowns + reset probability for your AI coding tool limits, updated every 30 min.

      → limitreset.dev

      Stop guessing. Start planning. ⚡
      ```
- [ ] **版 B · 痛点型**
      ```
      "When does my AI quota reset?" — you've asked this 100 times.

      Reset Radar answers it for you: real countdowns + reset probability for Claude Code, Codex, Grok, Kimi, MiniMax. Data updates automatically twice an hour.

      Try it: limitreset.dev
      ```
- [ ] **版 C · 简短**
      ```
      Curious when your AI coding quota resets?

      Reset Radar shows countdowns & probability for all your favorite AI tools.

      → limitreset.dev #AI #Codex #ClaudeCode
      ```

## ☑️ 三、优化页面布局，替换 emoji → icon 图片
- [x] 盘点现有 emoji 使用位置（品牌/各平台图标/导航/详情页）
- [x] 选定图标方案：favicon/og 已用 AI 生成；页面内 icon 用「SVG 图标库」
- [x] 生成/收集各平台与通用 icon 图片，替换对应 emoji
- [x] 校验替换后布局不塌、可访问性（alt）
- [x] 局部 GIF：图标库保持现有蓝紫风格

## ☑️ 四、查看访问情况（日活 / 页面数）
- [x] 接入统计平台（Cloudflare Web Analytics，走后台自动注入，零代码）
- [x] 支撑数据展示：定义日活、独立访客、页面浏览口径
- [ ] 观察优化前后页面的访问变化（接入后至少积累几天，按周/月环比观察）

> **接入教程（你只需在 CF 后台操作，无需改代码）**：
> 1. 登录 https://dash.cloudflare.com → 左侧 **Analytics & Logs → Web Analytics**
> 2. 选 **Add a site** → 下拉选 `limitreset.dev` → **Done**
> 3. 自动注入默认开启，无需额外配置；页面 JS 由 CF 边缘自动插入
> 4. （Pages 专属备选）**Workers & Pages → 项目 reset-radar → Metrics → Enable**，下次部署生效
> 5. 无需改动本仓库任何文件

> **统计口径（Cloudflare Web Analytics 的定义）**：
> - **日活 DAU** = 单日 **独立访客数**（Visitors）＝当天至少访问一次的去重浏览器数
> - **独立访客 UV** = 统计周期内去重访客数（无 cookie，用本地存储生成访客 ID 分组；EU 流量默认不计入）
> - **页面浏览 PV**（Page views）＝页面成功加载次数（多页站每页一次；SPA 路由切换也算）
> - 附带可看：平均访问时长、人均访问数、来源 Referrer、设备/浏览器、国家（IP 匿名化）

> **观察优化前后**：
> - 自动注入可能在代理域名默认已收集——先看配置当天是否已有数据即「基线起点」
> - 上线后按 **周/月环比**看：
>   - 首页 index 是入口，看 PV/UV 变化；
>   - 用 Web Analytics 按 URL 过滤拆分 status/about/detail 各页曝光，评估 SEO（关键词 `AI usage limit reset`）带来源的占比；
>   - 结合你 SEO 提交时间（`8bde5bb`）确认 Google 收录后自然流量是否上升。
> - 注意：emoji→icon 改动本身不影响统计口径，对比时认准同一个时间段口径即可。