// V2 data access. The UI consumes a product view derived from the flat ledger.
const API = {
  _cache: null,
  async load() {
    if (this._cache) return this._cache;
    try {
      const res = await fetch("data/data.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      this._cache = await res.json();
    } catch (error) {
      if (!window.RADAR_DATA_FALLBACK) throw error;
      this._cache = window.RADAR_DATA_FALLBACK;
    }
    return this._cache;
  },
  async getProducts() {
    const data = await this.load();
    if (data.schema_version !== "2.0") return data.platforms || [];
    return data.products.map((product) => this.productView(data, product));
  },
  productView(data, product) {
    const state = data.current_state.find((item) => item.product_id === product.id) || { windows: [] };
    const productWindows = data.windows.filter((item) => item.product_id === product.id);
    const recovery = data.forecasts.find((item) => item.product_id === product.id && item.target.type === "normal_recovery");
    const hazard = data.forecasts.find((item) => item.product_id === product.id && item.target.type === "global_reset");
    return {
      ...product, state, windows: productWindows, recovery, hazard,
      events: data.events.filter((item) => item.product_id === product.id).sort((a, b) => b.effective_at.localeCompare(a.effective_at)),
      signals: data.signals.filter((item) => item.product_id === product.id),
      observations: data.observations.filter((item) => item.product_id === product.id),
    };
  },
  async getProduct(id) { return (await this.getProducts()).find((item) => item.id === id) || null; },
  async getServiceStatus() { return (await this.load()).service_status || []; },
};
