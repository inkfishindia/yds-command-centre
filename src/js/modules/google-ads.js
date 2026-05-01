export function createGoogleAdsModule() {
  return {
    googleAds: null,
    googleAdsLoading: false,
    googleAdsError: null,
    googleAdsPeriod: 'all',
    googleAdsActiveTab: 'overview',
    gaExpandedInsights: false,

    async loadGoogleAds(period = 'all') {
      if (this.googleAdsLoading) return;
      this.googleAdsLoading = true;
      this.googleAdsError = null;
      this.googleAdsPeriod = period;
      try {
        const res = await fetch(`/api/google-ads?period=${period}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.googleAds = await res.json();
      } catch (err) {
        console.error('[google-ads] load error:', err);
        this.googleAdsError = 'Failed to load Google Ads data.';
      } finally {
        this.googleAdsLoading = false;
      }
    },

    setGaPeriod(period) {
      this.googleAdsPeriod = period;
      this.loadGoogleAds(period);
    },

    setGaTab(tab) {
      this.googleAdsActiveTab = tab;
    },

    gaFormatINR(amount) {
      if (amount == null || isNaN(amount)) return '₹0';
      if (amount >= 10000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
      }
      return new Intl.NumberFormat('en-IN', {
        style: 'currency', currency: 'INR', maximumFractionDigits: 0,
      }).format(amount);
    },

    gaFormatNum(n) {
      if (n == null || isNaN(n)) return '0';
      if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
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

    gaFormatCTR(ctr) {
      if (ctr == null || isNaN(ctr)) return '—';
      return `${ctr.toFixed(2)}%`;
    },

    gaFormatDropOff(pct) {
      if (pct == null || isNaN(pct)) return '';
      return `${pct}%`;
    },

    gaGetGradeColor(grade) {
      if (grade === 'A+' || grade === 'A') return 'green';
      if (grade === 'B') return 'amber';
      if (grade === 'C') return 'orange';
      return 'red';
    },

    gaGetStatusColor(status) {
      if (status === 'REAL' && status !== 'BROKEN') return 'green';
      if (status === 'JUNK') return 'red';
      if (status === 'BROKEN') return 'red';
      if (status === 'SIGNAL') return 'green';
      return 'gray';
    },

    gaGetTermTypeColor(type) {
      if (type === 'BRAND') return 'green';
      if (type === 'COMPETITOR') return 'red';
      return 'gray';
    },

    gaToggleInsights() {
      this.gaExpandedInsights = !this.gaExpandedInsights;
    },

    gaCampaigns() {
      if (!this.googleAds?.campaigns) return [];
      return this.googleAds.campaigns;
    },

    gaSearchTerms() {
      if (!this.googleAds?.searchTerms) return [];
      return this.googleAds.searchTerms.slice(0, 20);
    },

    gaDailyTrend() {
      if (!this.googleAds?.dailyTrend) return [];
      return this.googleAds.dailyTrend.slice(-14);
    },

    gaDeviceBreakdown() {
      if (!this.googleAds?.insights?.byDevice) return [];
      return this.googleAds.insights.byDevice;
    },

    gaStatusTable() {
      return this.googleAds?.statusTable || [];
    },

    gaFunnel() {
      return this.googleAds?.funnel || [];
    },

    gaAdvisoryCards() {
      return this.googleAds?.advisoryCards || [];
    },

    gaActionQueue() {
      return this.googleAds?.actionQueue || [];
    },

    gaConversionBreakdown() {
      return this.googleAds?.conversionBreakdown || [];
    },

    gaMeta() {
      return this.googleAds?.meta || {};
    },
  };
}