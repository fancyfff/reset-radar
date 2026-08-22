# -*- coding: utf-8 -*-
"""免费、无需登录的公开数据源抓取。

数据源（均公开、无需 token）：
  1) GitHub Releases API
        https://api.github.com/repos/{owner}/{repo}/releases
     -> 用于 model_release 信号（真实版本号 + 真实发布时间）
     限速：未认证 60 次/小时/IP，足够 30 分钟级定时任务。

  2) Statuspage v2 Incidents / Status API
        {base}/api/v2/incidents.json
        {base}/api/v2/status.json
     -> 用于 service 信号与官方服务状态（真实事件）

健壮性设计（关键）：
  每次 HTTP 请求都在「独立子进程 + 新会话」中执行。原因：
  某些网络环境会对访问特定不可达主机（如 status.x.ai）的进程
  直接发信号终止，且会连累整个进程组。把网络隔离到子进程后，
  即便子进程被环境杀掉，主引擎也安然无恙，并按「抓取失败」安全回退。
  这对生产环境同样重要：任一数据源偶发抽风都不该拖垮整次运行。

所有抓取均健壮：失败（超时 / 限流 / 网络不通 / 进程被杀）一律返回
空列表 / None，绝不中断主流程。
"""
import json
import os
import subprocess
import sys
from datetime import datetime, timezone

UA = {"User-Agent": "ResetRadar/1.0 (+scheduled quota radar)"}
HTTP_TIMEOUT = 12
RETRIES = 2

# 子进程内执行的极简抓取脚本：成功则原样打印响应体，失败则退出码非 0。
_FETCH_SCRIPT = (
    "import sys, json, urllib.request\n"
    "url = sys.argv[1]\n"
    "req = urllib.request.Request(url, headers={'User-Agent': 'ResetRadar/1.0'})\n"
    "try:\n"
    "    with urllib.request.urlopen(req, timeout=12) as r:\n"
    "        sys.stdout.write(r.read().decode('utf-8', 'replace'))\n"
    "except Exception:\n"
    "    sys.exit(3)\n"
)


def _get_json(url):
    """在独立子进程中抓取并解析 JSON；任何失败返回 None。"""
    here = os.path.dirname(os.path.abspath(__file__))
    last_err = None
    for _ in range(RETRIES + 1):
        try:
            proc = subprocess.run(
                [sys.executable, "-c", _FETCH_SCRIPT, url],
                capture_output=True, text=True,
                start_new_session=True,          # 新会话：与主进程隔离
                timeout=HTTP_TIMEOUT + 6,
                cwd=here,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                return json.loads(proc.stdout)
        except subprocess.TimeoutExpired:
            last_err = "timeout"
        except Exception as e:  # noqa: BLE001
            last_err = e
    print(f"  [warn] 抓取失败 {url}: {last_err}")
    return None


def _parse_iso(s):
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except ValueError:
        return None


def fetch_github_releases(repo, count=6):
    """repo 形如 'anthropics/claude-code'。

    返回 [{"published_at": datetime, "tag": str, "name": str, "html_url": str}]
    """
    data = _get_json(f"https://api.github.com/repos/{repo}/releases?per_page={count}")
    if not isinstance(data, list):
        return []
    out = []
    for rel in data[:count]:
        dt = _parse_iso(rel.get("published_at"))
        if not dt:
            continue
        out.append({
            "published_at": dt,
            "tag": rel.get("tag_name", "") or "",
            "name": (rel.get("name") or rel.get("tag_name") or "").strip() or rel.get("tag_name", ""),
            "html_url": rel.get("html_url", "") or "",
        })
    return out


def fetch_statuspage_incidents(base_url, limit=8):
    """base_url 形如 'https://status.openai.com'。

    返回 [{"updated_at": datetime, "name": str, "impact": str, "status": str, "shortlink": str}]
    """
    data = _get_json(f"{base_url.rstrip('/')}/api/v2/incidents.json")
    if not isinstance(data, dict):
        return []
    out = []
    for inc in data.get("incidents", [])[:limit]:
        dt = _parse_iso(inc.get("updated_at") or inc.get("created_at"))
        if not dt:
            continue
        out.append({
            "updated_at": dt,
            "name": inc.get("name", "") or "",
            "impact": inc.get("impact", "") or "",
            "status": inc.get("status", "") or "",
            "shortlink": inc.get("shortlink", "") or "",
        })
    return out


def fetch_statuspage_status(base_url):
    """返回当前状态 indicator: none/ok/minor/major/critical，或 None。"""
    data = _get_json(f"{base_url.rstrip('/')}/api/v2/status.json")
    if not isinstance(data, dict):
        return None
    return data.get("status", {}).get("indicator")
