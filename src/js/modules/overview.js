import {
  formatReadModelFreshness,
  getReadModelSummary,
  getReadModelTone,
  unwrapReadModelResponse,
} from './read-models.js';

export function createOverviewModule() {
  return {
    overview: null,
    overviewMeta: null,
    overviewLoading: false,
    systemHealth: null,
    systemHealthLoading: false,

    async loadOverview() {
      this.overviewLoading = true;
      try {
        const [overviewRes, healthRes] = await Promise.all([
          fetch('/api/overview'),
          fetch('/api/health/details'),
        ]);

        if (overviewRes.ok) {
          const payload = unwrapReadModelResponse(await overviewRes.json());
          this.overview = payload.data;
          this.overviewMeta = payload.meta;
          this.runNotificationChecks?.('overview');
        }

        if (healthRes.ok) {
          this.systemHealth = await healthRes.json();
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

    getOverviewMetaTone() {
      return getReadModelTone(this.overviewMeta);
    },

    getOverviewMetaSummary() {
      return getReadModelSummary(this.overviewMeta, 'Overview sources are healthy');
    },

    getOverviewFreshness() {
      return formatReadModelFreshness(this.overviewMeta);
    },

    formatOverviewDateTime(value) {
      if (!value) return 'Not available';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return value;
      return parsed.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    },

    getSystemHealthReadModels() {
      return Array.isArray(this.systemHealth?.readModels) ? this.systemHealth.readModels : [];
    },

    getSystemHealthSources() {
      const entries = Object.entries(this.systemHealth?.sourceHealth?.sources || {});
      return entries
        .map(([name, details]) => ({
          name,
          status: details?.status || 'unknown',
          checkedAt: details?.checkedAt || null,
          readModel: details?.readModel || null,
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    },

    getSystemHealthCounts() {
      const readModels = this.getSystemHealthReadModels();
      const sources = this.getSystemHealthSources();
      return {
        readModels: readModels.length,
        staleReadModels: readModels.filter((item) => item?.stale).length,
        partialReadModels: readModels.filter((item) => item?.partial).length,
        degradedSources: sources.filter((item) => item?.status !== 'ok').length,
      };
    },

    systemHealthStatusClass(status) {
      if (status === 'ok') return 'org-status-healthy';
      if (status === 'degraded') return 'org-status-risk';
      if (status === 'fallback') return 'org-status-critical';
      return 'org-status-neutral';
    },

    getOverviewKpiDisplayValue(kpi) {
      if (!kpi) return '—';
      const suffix = kpi.valueSuffix || '';
      return `${kpi.value ?? '—'}${suffix}`;
    },
  };
}
