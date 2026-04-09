import {
  fetchReadModel,
  formatReadModelFreshness,
  getReadModelSummary,
  getReadModelTone,
} from './read-models.js';

export function createDashboardModule() {
  return {
    // Dashboard
    dashboard: null,
    dashboardMeta: null,
    dashboardLoading: false,
    actionQueueMeta: null,
    upcomingCommitments: [],
    expandedDecision: null,
    expandedCommitmentRow: null,
    showCompletedThisWeek: false,
    lastRefresh: null,
    refreshIntervalId: null,

    // New zone state
    teamWorkload: [],
    recentActivity: null,
    collapsedOverdueGroups: {},
    dashboardSavedView: 'today',

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

    // Dashboard auto-refresh interval handle
    _dashboardRefreshInterval: null,

    startDashboardAutoRefresh() {
      this.stopDashboardAutoRefresh();
      this._dashboardRefreshInterval = setInterval(() => {
        if (this.view === 'dashboard' && !this.dashboardLoading) {
          this.loadDashboard(true); // silent — no loading skeleton
        }
      }, 5 * 60 * 1000);
    },

    stopDashboardAutoRefresh() {
      if (this._dashboardRefreshInterval) {
        clearInterval(this._dashboardRefreshInterval);
        this._dashboardRefreshInterval = null;
      }
    },

    async loadDashboard(silent = false) {
      const signal = this.beginRequest('dashboard');
      this.expandedDecision = null;
      this.expandedCommitmentRow = null;
      this.selectedOverdue = [];
      if (!silent) {
        this.dashboardLoading = true;
        this.briefLoading = true;
      }
      try {
        const [dashboardRes, pipelineRes, actionQueueRes] = await Promise.allSettled([
          fetchReadModel('dashboard', { signal }),
          fetch('/api/sheets/pipeline', { signal }),
          fetchReadModel('action-queue', { signal }),
        ]);

        if (dashboardRes.status === 'fulfilled' && dashboardRes.value.response.ok && dashboardRes.value.payload) {
          this.dashboard = dashboardRes.value.payload.data;
          this.dashboardMeta = dashboardRes.value.payload.meta;
          this.upcomingCommitments = this.dashboard.upcoming || [];
          this.morningBrief = this.dashboard.morningBrief || null;
          this.lastRefresh = new Date();
          this.teamWorkload = this.dashboard.teamWorkload || [];
          this.recentActivity = this.dashboard.recentActivity || null;
          this.runNotificationChecks?.('dashboard');
        }

        if (pipelineRes.status === 'fulfilled' && pipelineRes.value.ok) {
          this.pipeline = await pipelineRes.value.json();
        } else if (pipelineRes.status === 'rejected' && !this.isAbortError(pipelineRes.reason)) {
          console.warn('Pipeline load failed:', pipelineRes.reason?.message || pipelineRes.reason);
        }

        if (actionQueueRes.status === 'fulfilled' && actionQueueRes.value.response.ok && actionQueueRes.value.payload) {
          this.actionQueue = actionQueueRes.value.payload.data;
          this.actionQueueMeta = actionQueueRes.value.payload.meta;
          this.runNotificationChecks?.('action-queue');
        } else if (actionQueueRes.status === 'rejected' && !this.isAbortError(actionQueueRes.reason)) {
          console.error('Action queue failed:', actionQueueRes.reason);
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
        const { response, payload } = await fetchReadModel('action-queue', { signal });
        if (response.ok && payload) {
          this.actionQueue = payload.data;
          this.actionQueueMeta = payload.meta;
          this.runNotificationChecks?.('action-queue');
        }
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

    getDashboardMetaTone() {
      return getReadModelTone(this.dashboardMeta);
    },

    getDashboardMetaSummary() {
      return getReadModelSummary(this.dashboardMeta, 'All primary dashboard sources loaded');
    },

    getDashboardFreshnessLabel() {
      return formatReadModelFreshness(this.dashboardMeta);
    },

    getActionQueueMetaTone() {
      return getReadModelTone(this.actionQueueMeta);
    },

    getActionQueueMetaSummary() {
      return getReadModelSummary(this.actionQueueMeta, 'All primary action queue sources loaded');
    },

    getActionQueueFreshnessLabel() {
      return formatReadModelFreshness(this.actionQueueMeta);
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

    // Generate SVG sparkline path from an array of numbers
    generateSparkline(data, width = 80, height = 20) {
      if (!data || data.length < 2) return '';
      const max = Math.max(...data);
      const min = Math.min(...data);
      const range = max - min || 1;
      const step = width / (data.length - 1);
      const points = data.map((val, i) => {
        const x = i * step;
        const y = height - ((val - min) / range) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      return `<svg class="data-card-sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><polyline fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}" /></svg>`;
    },

    // --- New helpers for 3-zone dashboard ---

    // Groups dashboard.overdue by focusAreaNames[0]
    // Returns [{area: 'Name', items: [...]}]
    getOverdueByFocusArea() {
      const overdue = this.dashboard?.overdue || [];
      const groups = {};
      const order = [];
      for (const item of overdue) {
        const area = (item.focusAreaNames && item.focusAreaNames[0]) || 'Uncategorised';
        if (!groups[area]) {
          groups[area] = [];
          order.push(area);
        }
        groups[area].push(item);
      }
      return order.map(area => ({ area, items: groups[area] }));
    },

    // Returns relative time string from ISO date string
    getRelativeTime(isoString) {
      if (!isoString) return '';
      const then = new Date(isoString);
      const now = new Date();
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;
      return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    },

    getDashboardRefreshLabel() {
      if (!this.lastRefresh) return '';
      return `Updated ${this.formatRelativeTime(this.lastRefresh)}`;
    },

    getDashboardAreaStatus() {
      const overdueCount = (this.dashboard?.overdue || []).length;
      const queueCount = (this.actionQueue?.dansQueueCount || 0) + (this.actionQueue?.runnersQueueCount || 0);
      const flagCount = (this.morningBrief?.flags || []).length;
      if (overdueCount >= 5 || queueCount >= 10 || flagCount >= 3) {
        return { tone: 'critical', label: 'Command Pressure High' };
      }
      if (overdueCount > 0 || queueCount > 0 || flagCount > 0) {
        return { tone: 'warning', label: 'Needs Attention' };
      }
      return { tone: 'healthy', label: 'In Control' };
    },

    getDashboardHeroMetrics() {
      const metrics = this.getGlobalMetrics() || {};
      const queueCount = (this.actionQueue?.dansQueueCount || 0) + (this.actionQueue?.runnersQueueCount || 0);
      const decisions = (this.dashboard?.recentDecisions || []).length;
      return [
        {
          id: 'open',
          label: 'Open Commitments',
          value: String(metrics.openCommitments || 0),
          note: `${metrics.overdueCount || 0} overdue right now`,
        },
        {
          id: 'queue',
          label: 'Action Queue',
          value: String(queueCount),
          note: `${this.actionQueue?.dansQueueCount || 0} for Dan, ${this.actionQueue?.runnersQueueCount || 0} for runners`,
        },
        {
          id: 'projects',
          label: 'Active Projects',
          value: String(metrics.activeProjects || 0),
          note: 'Cross-functional work in motion',
        },
        {
          id: 'decisions',
          label: 'Recent Decisions',
          value: String(decisions),
          note: `${metrics.decisionsThisMonth || 0} taken this month`,
        },
      ];
    },

    getDashboardMetricAction(metricId) {
      const actions = {
        open: () => this.openNavigationTarget('commitments'),
        queue: () => this.openNavigationTarget('actionQueue'),
        projects: () => this.openNavigationTarget('projects'),
        decisions: () => this.openNavigationTarget('decisions'),
      };
      return actions[metricId] || (() => {});
    },

    getDashboardPriorityCards() {
      const overdueItems = (this.dashboard?.overdue || []).slice(0, 3).map((item) => ({
        name: item.name,
        meta: this.formatRelativeDate(item['Due Date']) || `${item.daysOverdue || 0}d overdue`,
      }));
      const overloadedPeople = (this.teamWorkload || [])
        .filter((person) => (person.metrics?.activeCount || 0) >= 5)
        .sort((a, b) => (b.metrics?.activeCount || 0) - (a.metrics?.activeCount || 0))
        .slice(0, 3)
        .map((person) => ({
          name: person.name,
          meta: `${person.metrics?.activeCount || 0} active`,
        }));
      const activityItems = this.getActivityFeedItems().slice(0, 3).map((item) => ({
        name: item.name,
        meta: this.getRelativeTime(item.time),
      }));

      return [
        {
          id: 'overdue',
          title: 'Overdue Pressure',
          label: 'The commitments most likely to create drag today.',
          value: String((this.dashboard?.overdue || []).length),
          tone: (this.dashboard?.overdue || []).length > 0 ? 'critical' : 'healthy',
          items: overdueItems.length ? overdueItems : [{ name: 'No overdue commitments', meta: 'The queue is currently clear.' }],
        },
        {
          id: 'workload',
          title: 'Workload Risk',
          label: 'People carrying the heaviest active load.',
          value: String(overloadedPeople.length),
          tone: overloadedPeople.length >= 2 ? 'warning' : 'healthy',
          items: overloadedPeople.length ? overloadedPeople : [{ name: 'No overloaded teammates', meta: 'Capacity looks balanced.' }],
        },
        {
          id: 'movement',
          title: 'Recent Movement',
          label: 'What changed recently across the operating system.',
          value: String(activityItems.length),
          tone: 'healthy',
          items: activityItems.length ? activityItems : [{ name: 'No recent activity captured', meta: 'Refresh to pull the latest movement.' }],
        },
      ];
    },

    getDashboardFocusList() {
      const list = [];
      for (const item of (this.morningBrief?.topThree || []).slice(0, 2)) {
        list.push({
          title: item.name,
          detail: 'Top 3 priority for today',
          action: () => this.openNavigationTarget('commitments'),
          tone: 'healthy',
        });
      }
      for (const flag of (this.morningBrief?.flags || []).slice(0, 2)) {
        list.push({
          title: flag.message,
          detail: flag.type === 'overload' ? 'Check team capacity and overdue work.' : 'Review the related commitment or owner.',
          action: () => this.openNavigationTarget(flag.type === 'overload' ? 'team' : 'actionQueue'),
          tone: flag.type === 'overload' ? 'critical' : 'warning',
        });
      }
      return list.slice(0, 4);
    },

    getDashboardSavedViews() {
      return [
        { id: 'today', label: 'Top 3 Today' },
        { id: 'overdue', label: 'Overdue' },
        { id: 'waiting', label: 'Waiting On' },
        { id: 'overloaded', label: 'Overloaded' },
      ];
    },

    applyDashboardSavedView(viewId) {
      this.dashboardSavedView = viewId;
    },

    getDashboardSavedViewItems() {
      if (this.dashboardSavedView === 'overdue') {
        return (this.dashboard?.overdue || []).slice(0, 6).map((item) => ({
          title: item.name,
          detail: this.formatRelativeDate(item['Due Date']) || `${item.daysOverdue || 0}d overdue`,
          action: () => this.openNavigationTarget('actionQueue'),
        }));
      }
      if (this.dashboardSavedView === 'waiting') {
        return (this.morningBrief?.waitingOn || []).slice(0, 6).map((item) => ({
          title: item.name,
          detail: item.blockerDetail || 'Waiting on a blocker to clear',
          action: () => this.openNavigationTarget('actionQueue'),
        }));
      }
      if (this.dashboardSavedView === 'overloaded') {
        return (this.teamWorkload || [])
          .filter((person) => person.capacity === 'overloaded' || person.capacity === 'moderate')
          .sort((a, b) => b.activeCount - a.activeCount)
          .slice(0, 6)
          .map((person) => ({
            title: person.name,
            detail: `${person.activeCount} active, ${person.overdueCount} overdue`,
            action: () => this.openPersonView(person),
          }));
      }
      return (this.morningBrief?.topThree || []).slice(0, 6).map((item) => ({
        title: item.name,
        detail: 'Top priority for today',
        action: () => this.openNavigationTarget('commitments'),
      }));
    },

    getDashboardSavedViewEmptyState() {
      const labels = {
        today: 'No top priorities captured right now.',
        overdue: 'No overdue items right now.',
        waiting: 'Nothing is currently waiting on someone else.',
        overloaded: 'No overloaded teammates right now.',
      };
      return labels[this.dashboardSavedView] || 'No items available.';
    },

    // Toggle collapse state for an overdue focus-area group
    toggleOverdueGroup(area) {
      this.collapsedOverdueGroups = {
        ...this.collapsedOverdueGroups,
        [area]: !this.collapsedOverdueGroups[area],
      };
    },

    isOverdueGroupCollapsed(area) {
      return !!this.collapsedOverdueGroups[area];
    },

    // Returns merged activity feed items from recentActivity, sorted recent-first
    getActivityFeedItems() {
      const activity = this.recentActivity;
      if (!activity) return [];
      const items = [];
      for (const c of (activity.completions || []).slice(0, 5)) {
        items.push({ type: 'success', name: c.name, time: c.lastEdited, id: c.id });
      }
      for (const b of (activity.newBlockers || []).slice(0, 3)) {
        items.push({ type: 'alert', name: b.name, time: b.lastEdited, id: b.id });
      }
      for (const d of (activity.recentDecisions || []).slice(0, 3)) {
        items.push({ type: 'decision', name: d.name, time: d.date, id: d.id });
      }
      // Sort by time, recent first
      items.sort((a, b) => new Date(b.time) - new Date(a.time));
      return items.slice(0, 10);
    },

    // Pipeline donut data from pipeline state
    getPipelineDonutData() {
      const breakdown = this.pipeline?.statusBreakdown || [];
      const colors = {
        'Active': 'var(--green)',
        'Qualified': 'var(--accent)',
        'Stalled': 'var(--amber)',
        'New': 'var(--text-secondary)',
      };
      return breakdown.map(s => ({
        label: s.name,
        value: s.count,
        color: colors[s.name] || 'var(--purple)',
      }));
    },
  };
}
