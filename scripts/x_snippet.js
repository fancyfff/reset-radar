/*
 * x_snippet.js —— 「只抓一次」发言雷达抓取片段
 *
 * 用途：在已登录 X 的浏览器里，从当前页面 DOM 直接提取指定账号的最近推文，
 *       替代官方付费 API。全程不导出 cookie / 密码，凭据不离开浏览器。
 *
 * 使用方法：
 *   1) 在「能访问 X」的网络环境中，用浏览器登录 x.com 并打开目标账号主页，例如：
 *        https://x.com/thsottiaux
 *   2) 按 F12 → Console，粘贴本文件全部代码后回车。
 *   3) 控制台会输出 JSON（含 handle + posts），并自动 copy 到剪贴板。
 *   4) 把该 JSON 保存为 data/x_tweets.json，再运行：
 *        python scripts/merge_x_tweets.py data/x_tweets.json
 *
 * 说明：
 *   - 只读取页面已渲染的推文（文本、时间、链接），不调用任何 X API、不上传任何数据。
 *   - 抓取的是当前页面可见的推文；如需更多可先滚动页面再运行。
 *   - 关键词命中（quota/limit/reset 等）由 merge 脚本统一标注。
 */
(() => {
  // 从当前 URL 推断 handle（字段形如 /thsottiaux）
  const m = (location.pathname || "").match(/^\/([^/?#]+)/);
  const handle = m ? m[1] : "";

  const posts = [];
  const nodes = document.querySelectorAll('article[data-testid="tweet"]');

  nodes.forEach((a) => {
    const textEl = a.querySelector('[data-testid="tweetText"]');
    const timeEl = a.querySelector("time");
    const linkEl = timeEl && timeEl.closest("a");
    const dt = timeEl ? (timeEl.getAttribute("datetime") || "") : "";
    posts.push({
      time: dt,
      content: textEl ? textEl.innerText.trim() : "",
      url: linkEl ? location.origin + linkEl.getAttribute("href") : "",
    });
  });

  // 去重：同一推文可能被展开/折叠重复渲染
  const seen = new Set();
  const unique = posts.filter((p) => {
    const k = p.time + "|" + p.content;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const result = { handle, posts: unique };
  const json = JSON.stringify(result, null, 2);

  console.log(json);
  if (typeof copy === "function") {
    try { copy(json); console.log("(已复制到剪贴板)"); } catch (e) { console.log("(复制失败，请手动复制上方 JSON)"); }
  }
  console.log(`共抓取 ${unique.length} 条推文`);
  return json;
})();