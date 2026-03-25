export function createOverviewModule() {
  return {
    overview: null,
    overviewLoading: false,

    async loadOverview() {
      this.overviewLoading = true;
      try {
        const res = await fetch('/api/overview');
        if (res.ok) {
          this.overview = await res.json();
          this.runNotificationChecks?.('overview');
        }
      } catch (err) {
        console.error('Overview load error:', err);
      } finally {
        this.overviewLoading = false;
      }
    },

    getOverviewKpis() {
      return Array.isArray(this.overview?.executiveKpis) ? this.overview.executiveKpis : [];
    },

    getOverviewAreaCards() {
      return Array.isArray(this.overview?.areaCards) ? this.overview.areaCards : [];
    },

    getOverviewActivityFeed() {
      return Array.isArray(this.overview?.activityFeed) ? this.overview.activityFeed : [];
    },

    getOverviewQuickLinks() {
      return Array.isArray(this.overview?.quickLinks) ? this.overview.quickLinks : [];
    },

    openOverviewTarget(targetView) {
      if (!targetView) return;
      this.openNavigationTarget(targetView);
    },

    overviewToneClass(tone) {
      if (tone === 'critical') return 'overview-feed-item--critical';
      if (tone === 'warning') return 'overview-feed-item--warning';
      if (tone === 'healthy') return 'overview-feed-item--healthy';
      return 'overview-feed-item--neutral';
    },

    overviewStatusClass(status) {
      if (status === 'critical') return 'org-status-critical';
      if (status === 'at-risk') return 'org-status-risk';
      if (status === 'healthy') return 'org-status-healthy';
      return 'org-status-neutral';
    },

    formatOverviewTimestamp(value) {
      if (!value) return 'No date';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },

    getOverviewKpiDisplayValue(kpi) {
      if (!kpi) return '—';
      const suffix = kpi.valueSuffix || '';
      return `${kpi.value ?? '—'}${suffix}`;
    },
  };
}
