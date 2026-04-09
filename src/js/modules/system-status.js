export function createSystemStatusModule() {
  return {
    systemStatus: null,
    systemStatusLoading: false,
    systemSyncing: false,
    systemSyncMessage: '',

    async loadSystemStatus() {
      this.systemStatusLoading = true;
      try {
        const res = await fetch('/api/health/details');
        if (res.ok) {
          this.systemStatus = await res.json();
          this.systemSyncMessage = '';
        }
      } catch (err) {
        console.error('System status load error:', err);
      } finally {
        this.systemStatusLoading = false;
      }
    },

    async syncReadModels(name = null) {
      this.systemSyncing = true;
      this.systemSyncMessage = '';
      try {
        const endpoint = name ? `/api/health/sync/${name}` : '/api/health/sync';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload?.error || payload?.message || 'Sync failed');
        }

        this.systemSyncMessage = name ? `${name} synced` : 'All read models synced';
        await this.loadSystemStatus();
        if (this.view === 'overview') {
          await this.loadOverview();
        }
        if (this.view === 'dashboard') {
          await this.loadDashboard(true);
        }
        if (this.view === 'actionQueue') {
          await this.loadActionQueue({ silent: true });
        }
      } catch (err) {
        console.error('Read model sync error:', err);
        this.systemSyncMessage = err.message || 'Sync failed';
      } finally {
        this.systemSyncing = false;
      }
    },

    getSystemStatusReadModels() {
      const readModels = Array.isArray(this.systemStatus?.readModels) ? this.systemStatus.readModels : [];
      const summaryByName = new Map(
        (Array.isArray(this.systemStatus?.syncSummary) ? this.systemStatus.syncSummary : []).map((item) => [item.name, item]),
      );

      return readModels.map((model) => ({
        ...model,
        syncState: summaryByName.get(model.name) || null,
      }));
    },

    getSystemStatusSources() {
      return Object.entries(this.systemStatus?.sourceHealth?.sources || {})
        .map(([name, state]) => ({
          name,
          status: state?.status || 'unknown',
          checkedAt: state?.checkedAt || null,
          readModel: state?.readModel || null,
        }))
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    },

    getSystemSyncRuns() {
      return Array.isArray(this.systemStatus?.syncRuns) ? this.systemStatus.syncRuns : [];
    },

    getSystemProjectionJobs() {
      return Array.isArray(this.systemStatus?.projectionJobs) ? this.systemStatus.projectionJobs : [];
    },

    getSystemSyncSchedule() {
      return this.systemStatus?.syncSchedule || null;
    },

    formatSystemStatusDate(value) {
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

    getSystemStatusCounts() {
      const readModels = this.getSystemStatusReadModels();
      const sources = this.getSystemStatusSources();
      const syncRuns = this.getSystemSyncRuns();
      return {
        readModels: readModels.length,
        stale: readModels.filter((item) => item?.stale).length,
        partial: readModels.filter((item) => item?.partial).length,
        degradedSources: sources.filter((item) => item?.status !== 'ok').length,
        failedSyncs: syncRuns.filter((item) => item?.ok === false).length,
        jobs: this.getSystemProjectionJobs().length,
      };
    },

    getSystemScheduleSummary() {
      const schedule = this.getSystemSyncSchedule();
      if (!schedule?.enabled) return 'Automatic sync is disabled';
      const intervalMinutes = Math.max(1, Math.round((schedule.intervalMs || 0) / 60000));
      if (schedule.running) return `Sync running now (${schedule.currentTrigger || 'scheduled'})`;
      return `Automatic sync every ${intervalMinutes}m`;
    },

    systemStatusBadgeClass(status) {
      if (status === 'ok') return 'org-status-healthy';
      if (status === 'degraded' || status === 'partial') return 'org-status-risk';
      if (status === 'fallback' || status === 'stale' || status === 'error') return 'org-status-critical';
      return 'org-status-neutral';
    },
  };
}
