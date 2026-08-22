// 数据加载与状态管理：优先 fetch data/data.json，失败回退到内嵌 fallback

const API = {
  _cache: null,

  async load() {
    if (this._cache) return this._cache;
    try {
      const res = await fetch("data/data.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      this._cache = data;
      return data;
    } catch (e) {
      if (window.RADAR_DATA_FALLBACK) {
        console.warn("data.json 加载失败，使用内嵌回退数据：", e.message);
        return window.RADAR_DATA_FALLBACK;
      }
      throw e;
    }
  },

  async getPlatforms() {
    const d = await this.load();
    return d.platforms || [];
  },

  async getPlatform(id) {
    const list = await this.getPlatforms();
    return list.find((p) => p.id === id) || null;
  },

  async getServiceStatus() {
    const d = await this.load();
    return d.service_status || [];
  },

  async getSpeakers() {
    const d = await this.load();
    return d.speakers || [];
  },
};
