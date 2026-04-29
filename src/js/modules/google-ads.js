export function createGoogleAdsModule() {
  return {
    googleAds: null,
    googleAdsLoading: false,
    googleAdsError: null,
    googleAdsFilterPeriod: 'all',

    async loadGoogleAds() {
      if (this.googleAdsLoading) return;
      this.googleAdsLoading = true;
      this.googleAdsError = null;
      try {
        const res = await fetch('/api/google-ads', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.googleAds = await res.json();
      } catch (err) {
        console.error('[google-ads] load error:', err);
        this.googleAdsError = 'Failed to load Google Ads data.';
      } finally {
        this.googleAdsLoading = false;
      }
    },

    gaFormatINR(amount) {
      if (amount == null || isNaN(amount)) return '₹0';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0,
      }).format(amount);
    },

    gaFormatNum(n) {
      if (n == null || isNaN(n)) return '0';
      if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(1)}Cr`;
      if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
      if (n >= 1000) return new Intl.NumberFormat('en-IN').format(Math.round(n));
      return String(Math.round(n));
    },

    gaFormatPct(pct) {
      if (pct == null || isNaN(pct)) return '—';
      return `${pct.toFixed(2)}x`;
    },

    gaFormatCPC(cpc) {
      if (cpc == null || isNaN(cpc)) return '—';
      return `₹${cpc.toFixed(2)}`;
    },

    setGaFilterPeriod(period) {
      this.googleAdsFilterPeriod = period;
    },

    gaFilteredCampaigns() {
      if (!this.googleAds?.campaigns) return [];
      return this.googleAds.campaigns;
    },

    gaVisibleSearchTerms() {
      if (!this.googleAds?.searchTerms) return [];
      return this.googleAds.searchTerms.slice(0, 20);
    },

    gaDailyTrend() {
      if (!this.googleAds?.dailyTrend) return [];
      const trend = this.googleAds.dailyTrend;
      return trend.slice(-14);
    },
  };
}