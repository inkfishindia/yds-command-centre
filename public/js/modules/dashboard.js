export function createDashboardModule() {
  return {
    // Dashboard
    dashboard: null,
    dashboardLoading: false,
    upcomingCommitments: [],
    expandedDecision: null,
    expandedCommitmentRow: null,
    showCompletedThisWeek: false,
    lastRefresh: null,
    refreshIntervalId: null,

    // Morning Brief
    morningBrief: null,
    briefLoading: false,

    // Focus Area view state
    activeFocusArea: null,
    focusAreaDetail: null,
    focusAreaLoading: false,

    // Person view state
    personDetail: null,
    personLoading: false,

    async loadDashboard() {
      const signal = this.beginRequest('dashboard');
      this.expandedDecision = null;
      this.expandedCommitmentRow = null;
      this.selectedOverdue = [];
      this.dashboardLoading = true;
      this.briefLoading = true;
      // Fire pipeline and action queue in parallel — morning brief is bundled with dashboard
      this.loadPipeline();
      this.loadActionQueue();
      try {
        const res = await fetch('/api/notion/dashboard', { signal });
        if (res.ok) {
          this.dashboard = await res.json();
          this.upcomingCommitments = this.dashboard.upcoming || [];
          this.morningBrief = this.dashboard.morningBrief || null;
          this.lastRefresh = new Date();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Dashboard error:', err);
      } finally {
        this.endRequest('dashboard', signal);
        this.dashboardLoading = false;
        this.briefLoading = false;
      }
    },

    async loadActionQueue({ silent = false } = {}) {
      const signal = this.beginRequest('actionQueue');
      if (!silent) this.actionQueueLoading = true;
      try {
        const res = await fetch('/api/notion/action-queue', { signal });
        if (res.ok) this.actionQueue = await res.json();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.error('Action queue failed:', e);
      } finally {
        this.endRequest('actionQueue', signal);
        if (!silent) this.actionQueueLoading = false;
      }
    },

    async loadPipeline() {
      const signal = this.beginRequest('pipeline');
      this.pipelineLoading = true;
      try {
        const res = await fetch('/api/sheets/pipeline', { signal });
        if (res.ok) this.pipeline = await res.json();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.warn('Pipeline load failed:', e.message);
      } finally {
        this.endRequest('pipeline', signal);
        this.pipelineLoading = false;
      }
    },

    getMaxStageCount(stages) {
      if (!stages || !stages.length) return 1;
      return Math.max(...stages.map(s => s.count), 1);
    },

    async loadMorningBrief() {
      if (this.dashboard?.morningBrief) {
        this.morningBrief = this.dashboard.morningBrief;
        this.briefLoading = false;
        return;
      }
      const signal = this.beginRequest('morningBrief');
      this.briefLoading = true;
      try {
        const res = await fetch('/api/notion/morning-brief', { signal });
        if (res.ok) {
          this.morningBrief = await res.json();
        }
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.warn('Morning brief failed:', e.message);
      } finally {
        this.endRequest('morningBrief', signal);
        this.briefLoading = false;
      }
    },

    openFocusAreaView(area) {
      this.view = 'focusArea';
      this.activeFocusArea = area;
      this.loadFocusArea(area.id);
    },

    async loadFocusArea(id) {
      const signal = this.beginRequest('focusAreaDetail');
      this.focusAreaLoading = true;
      this.focusAreaDetail = null;
      try {
        const res = await fetch(`/api/notion/focus-areas/${id}/detail`, { signal });
        if (res.ok) this.focusAreaDetail = await res.json();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.error('Focus area load failed:', e);
      } finally {
        this.endRequest('focusAreaDetail', signal);
        this.focusAreaLoading = false;
      }
    },

    openPersonView(person) {
      this.view = 'personView';
      this.personDetail = null;
      this.loadPersonView(person.id);
    },

    async loadPersonView(personId) {
      const signal = this.beginRequest('personDetail');
      this.personLoading = true;
      this.personDetail = null;
      try {
        const res = await fetch(`/api/notion/people/${personId}/detail`, { signal });
        if (res.ok) this.personDetail = await res.json();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.error('Person detail load failed:', e);
      } finally {
        this.endRequest('personDetail', signal);
        this.personLoading = false;
      }
    },

    getCapacityLabel(metrics) {
      if (!metrics) return 'light';
      const active = metrics.activeCount || 0;
      if (active >= 8) return 'overloaded';
      if (active >= 5) return 'moderate';
      return 'light';
    },

    getSortedPersonCommitments(commitments) {
      if (!commitments) return [];
      const order = { overdue: 0, blocked: 1, 'in progress': 2, 'not started': 3, done: 4 };
      return [...commitments].sort((a, b) => {
        const aKey = a.isOverdue ? 'overdue' : (a.Status || '').toLowerCase();
        const bKey = b.isOverdue ? 'overdue' : (b.Status || '').toLowerCase();
        const aOrd = order[aKey] !== undefined ? order[aKey] : 3;
        const bOrd = order[bKey] !== undefined ? order[bKey] : 3;
        return aOrd - bOrd;
      });
    },
  };
}
