// YDS Command Centre — Bundled build
// Generated 2026-03-25T21:52:08.245Z
(function() {
"use strict";
// ── ./modules/markdown.js ──
function configureMarkdown() {
  marked.setOptions({
    breaks: true,
    gfm: true,
  });
}


// ── ./modules/dashboard.js ──
function createDashboardModule() {
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
          fetch('/api/notion/dashboard', { signal }),
          fetch('/api/sheets/pipeline', { signal }),
          fetch('/api/notion/action-queue', { signal }),
        ]);

        if (dashboardRes.status === 'fulfilled' && dashboardRes.value.ok) {
          this.dashboard = await dashboardRes.value.json();
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

        if (actionQueueRes.status === 'fulfilled' && actionQueueRes.value.ok) {
          this.actionQueue = await actionQueueRes.value.json();
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
        const res = await fetch('/api/notion/action-queue', { signal });
        if (res.ok) {
          this.actionQueue = await res.json();
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


// ── ./modules/bmc.js ──
function createBmcModule() {
  return {
    // BMC (Business Model Canvas)
    bmc: null,
    bmcLoading: false,
    bmcDetailItem: null,
    bmcDetailKey: '',
    bmcSearch: '',
    bmcFilter: 'highlights',
    bmcFocus: '',
    bmcLastRefresh: null,

    async loadBmc() {
      const signal = this.beginRequest('bmc');
      this.bmcLoading = true;
      try {
        const res = await fetch('/api/bmc', { signal });
        if (res.ok) {
          this.bmc = await res.json();
          this.bmcLastRefresh = new Date();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('BMC load error:', err);
      } finally {
        this.endRequest('bmc', signal);
        this.bmcLoading = false;
      }
    },

    getBmcBlockItems(blockKey) {
      if (!this.bmc || !this.bmc.canvas) return [];
      return this.bmc.canvas[blockKey] || [];
    },

    getBmcFilteredItems(blockKey) {
      let items = this.getBmcBlockItems(blockKey);

      if (this.bmcFocus && this.bmcFocus !== blockKey) {
        return [];
      }

      if (this.bmcFilter !== 'all') {
        items = items.filter((item) => this.matchesBmcFilter(blockKey, item));
      }

      if (this.bmcSearch) {
        const query = this.bmcSearch.toLowerCase();
        items = items.filter((item) =>
          Object.values(item || {}).some((value) => String(value || '').toLowerCase().includes(query))
        );
      }

      return items;
    },

    openBmcDetail(blockKey, item) {
      this.bmcDetailKey = blockKey;
      this.bmcDetailItem = item;
    },

    openBmcRelatedItem(related) {
      if (!related) return;
      this.bmcFocus = related.blockKey;
      this.openBmcDetail(related.blockKey, related.item);
    },

    getBmcTopItems(blockKey, limit = null) {
      const defaultLimits = {
        partners: this.bmcFilter === 'highlights' ? 3 : 5,
        hubs: this.bmcFilter === 'highlights' ? 3 : 4,
        flywheels: this.bmcFilter === 'highlights' ? 2 : 3,
        channels: this.bmcFilter === 'highlights' ? 3 : 5,
        segments: this.bmcFilter === 'highlights' ? 3 : 5,
        team: this.bmcFilter === 'highlights' ? 3 : 5,
        business_units: this.bmcFilter === 'highlights' ? 3 : 4,
        cost_structure: this.bmcFilter === 'highlights' ? 4 : 6,
        revenue_streams: this.bmcFilter === 'highlights' ? 4 : 6,
        metrics: this.bmcFilter === 'highlights' ? 4 : 6,
        platforms: this.bmcFilter === 'highlights' ? 4 : 6,
      };
      const itemLimit = limit ?? defaultLimits[blockKey] ?? 4;
      return this.getBmcFilteredItems(blockKey).slice(0, itemLimit);
    },

    matchesBmcFilter(blockKey, item) {
      const status = this.getBmcStatus(blockKey, item).toLowerCase();
      const preview = this.getBmcItemPreview(blockKey, item).toLowerCase();
      const label = this.getBmcItemLabel(blockKey, item).toLowerCase();
      const haystack = `${status} ${preview} ${label}`;

      if (this.bmcFilter === 'risk') {
        return haystack.includes('risk') || haystack.includes('critical') || haystack.includes('kill') || haystack.includes('at risk') || haystack.includes('p0');
      }
      if (this.bmcFilter === 'highlights') {
        return true;
      }
      if (this.bmcFilter === 'validated') {
        return haystack.includes('valid') || haystack.includes('active') || haystack.includes('ready') || haystack.includes('track');
      }
      if (this.bmcFilter === 'owners') {
        return Object.keys(item || {}).some((key) => key.toLowerCase().includes('owner') && item[key]);
      }
      if (this.bmcFilter === 'money') {
        return ['revenue_streams', 'cost_structure', 'metrics', 'business_units'].includes(blockKey);
      }
      return true;
    },

    clearBmcFocus() {
      this.bmcFocus = '';
    },

    getBmcFocusLabel() {
      const map = {
        partners: 'Partners',
        hubs: 'Activities',
        flywheels: 'Value Props',
        channels: 'Channels',
        segments: 'Segments',
        team: 'Resources',
        business_units: 'Business Units',
        cost_structure: 'Costs',
        revenue_streams: 'Revenue',
        metrics: 'Metrics',
        platforms: 'Platforms',
      };
      return map[this.bmcFocus] || '';
    },

    getBmcItemLabel(blockKey, item) {
      const nameFields = {
        partners: ['name', 'partnerName'],
        hubs: ['name', 'hubName'],
        flywheels: ['name', 'flywheelName'],
        channels: ['name', 'channelName'],
        segments: ['name', 'segmentName'],
        team: ['full_name', 'fullName', 'name'],
        business_units: ['name', 'businessUnitName'],
        cost_structure: ['category', 'name'],
        revenue_streams: ['businessUnitId_resolved', 'businessUnitId', 'name'],
        metrics: ['name', 'metricName'],
        platforms: ['name', 'platformName'],
      };
      const fields = nameFields[blockKey] || ['name'];
      for (const field of fields) {
        if (item[field]) return item[field];
      }
      for (const value of Object.values(item)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 60) return value;
      }
      return '(unnamed)';
    },

    getBmcItemPreview(blockKey, item) {
      const previewFields = {
        partners: ['role', 'partnerType', 'status', 'notes'],
        hubs: ['coreCapabilities', 'hubType', 'status', 'primaryBottleneck'],
        flywheels: ['valueProposition', 'customerStruggle', 'customerStruggleSolved', 'motionSequence'],
        channels: ['channelType', 'platformName', 'motionType', 'status'],
        segments: ['behavioralTruth', 'customerProfile', 'validationStatus', 'status'],
        team: ['role', 'ownerRole', 'status'],
        business_units: ['coreOffering', 'offeringDescription', 'status'],
        cost_structure: ['costType', 'currentCostMonthly', 'status'],
        revenue_streams: ['revenueModel', 'currentRevenueAnnual', 'targetRevenueMar2026', 'status'],
        metrics: ['currentValue', 'targetValue', 'status'],
        platforms: ['platformType', 'category', 'status'],
      };

      const fields = previewFields[blockKey] || [];
      for (const field of fields) {
        if (item[field]) return String(item[field]);
      }

      for (const [key, value] of Object.entries(item || {})) {
        if (key === 'rowIndex') continue;
        if (typeof value === 'string' && value && value !== this.getBmcItemLabel(blockKey, item)) {
          return value;
        }
      }

      return '';
    },

    getBmcStatus(blockKey, item) {
      const fields = ['status', 'validationStatus', 'riskLevel', 'criticalityLevel', 'priority', 'category'];
      for (const field of fields) {
        if (item[field]) return String(item[field]);
      }
      if (blockKey === 'revenue_streams' && item.currentRevenueAnnual) return 'Revenue';
      if (blockKey === 'cost_structure' && item.currentCostMonthly) return 'Cost';
      return '';
    },

    getBmcStatusClass(value = '') {
      const text = String(value).toLowerCase();
      if (!text) return '';
      if (text.includes('risk') || text.includes('critical') || text.includes('kill') || text.includes('high') || text.includes('p0')) {
        return 'danger';
      }
      if (text.includes('valid') || text.includes('active') || text.includes('ready') || text.includes('track')) {
        return 'success';
      }
      if (text.includes('emerging') || text.includes('warning') || text.includes('medium') || text.includes('at risk')) {
        return 'warning';
      }
      return 'neutral';
    },

    getBmcSectionSummary(blockKey) {
      const items = this.getBmcBlockItems(blockKey);
      if (!items.length) return 'No connected records yet.';

      const summaries = {
        partners: 'External leverage, distribution, and operational dependencies.',
        hubs: 'The operating capabilities that make delivery possible.',
        flywheels: 'The compounding motions that turn demand into durable advantage.',
        channels: 'How the business reaches customers and drives activation.',
        segments: 'Who the business serves and what each segment needs.',
        team: 'The people and roles that currently carry the model.',
        business_units: 'Commercial engines that package the offer into revenue.',
        cost_structure: 'The major cost centres and operating commitments.',
        revenue_streams: 'Where money comes from and what growth depends on.',
        metrics: 'The measures that tell you whether the model is working.',
        platforms: 'Owned and external surfaces that power experience and distribution.',
      };

      return summaries[blockKey] || `${items.length} connected items in this section.`;
    },

    getBmcHeroMetrics() {
      const stats = this.bmc?.stats || {};
      const totalSegments = stats.totalSegments ?? this.getBmcBlockItems('segments').length;
      const totalBus = stats.totalBusinessUnits ?? this.getBmcBlockItems('business_units').length;
      const totalRev = stats.totalRevenueStreams ?? this.getBmcBlockItems('revenue_streams').length;
      const totalPartners = stats.totalPartners ?? this.getBmcBlockItems('partners').length;

      return [
        { label: 'Segments', value: totalSegments, note: 'active market frames' },
        { label: 'Business Units', value: totalBus, note: 'commercial engines' },
        { label: 'Revenue Streams', value: totalRev, note: 'ways the model earns' },
        { label: 'Partners', value: totalPartners, note: 'external dependencies' },
      ];
    },

    getBmcRefreshLabel() {
      if (!this.bmcLastRefresh) return '';
      return `Updated ${this.formatRelativeTime(this.bmcLastRefresh)}`;
    },

    getBmcAreaStatus() {
      const blocks = ['segments', 'flywheels', 'revenue_streams', 'cost_structure', 'partners', 'business_units'];
      const riskyCount = blocks.reduce((count, blockKey) => {
        return count + this.getBmcBlockItems(blockKey).filter((item) => this.getBmcStatusClass(this.getBmcStatus(blockKey, item)) === 'danger').length;
      }, 0);

      if (riskyCount >= 4) return { tone: 'critical', label: 'Needs Strategic Attention' };
      if (riskyCount >= 1) return { tone: 'warning', label: 'Mixed Signals' };
      return { tone: 'healthy', label: 'Strategically Coherent' };
    },

    getBmcPriorityCards() {
      const riskySegments = this.getBmcBlockItems('segments')
        .filter((item) => this.getBmcStatusClass(this.getBmcStatus('segments', item)) === 'danger')
        .slice(0, 3)
        .map((item) => ({
          name: this.getBmcItemLabel('segments', item),
          meta: this.getBmcStatus('segments', item) || this.getBmcItemPreview('segments', item),
        }));

      const riskyRevenue = this.getBmcBlockItems('revenue_streams')
        .filter((item) => this.getBmcStatusClass(this.getBmcStatus('revenue_streams', item)) !== 'success')
        .slice(0, 3)
        .map((item) => ({
          name: this.getBmcItemLabel('revenue_streams', item),
          meta: this.getBmcStatus('revenue_streams', item) || this.getBmcItemPreview('revenue_streams', item),
        }));

      const coreFlywheels = this.getBmcTopItems('flywheels', 3).map((item) => ({
        name: this.getBmcItemLabel('flywheels', item),
        meta: this.getBmcItemPreview('flywheels', item) || this.getBmcStatus('flywheels', item),
      }));

      return [
        {
          id: 'segments',
          title: 'Segment Risk',
          label: 'Customer segments showing validation or positioning risk.',
          value: String(riskySegments.length),
          tone: riskySegments.length >= 2 ? 'critical' : riskySegments.length === 1 ? 'warning' : 'healthy',
          items: riskySegments.length ? riskySegments : [{ name: 'No critical segment signals', meta: 'Current segment set looks stable.' }],
        },
        {
          id: 'revenue',
          title: 'Revenue Pressure',
          label: 'Revenue streams that need review or clearer validation.',
          value: String(riskyRevenue.length),
          tone: riskyRevenue.length >= 2 ? 'warning' : 'healthy',
          items: riskyRevenue.length ? riskyRevenue : [{ name: 'Revenue model signals healthy', meta: 'No major stream flagged right now.' }],
        },
        {
          id: 'flywheels',
          title: 'Core Flywheels',
          label: 'The motions currently anchoring the business model.',
          value: String(coreFlywheels.length),
          tone: 'healthy',
          items: coreFlywheels.length ? coreFlywheels : [{ name: 'No flywheels loaded', meta: 'Connect the BMC source to populate this view.' }],
        },
      ];
    },

    getBmcFocusList() {
      const primaryFlywheel = this.getBmcSpotlight('flywheels');
      const leadSegment = this.getBmcSpotlight('segments');
      const revenueItem = this.getBmcBlockItems('revenue_streams')[0];

      return [
        primaryFlywheel && {
          title: `Refine ${primaryFlywheel.title}`,
          detail: primaryFlywheel.status || primaryFlywheel.preview || 'Review the primary value proposition motion.',
          action: () => { this.bmcFocus = 'flywheels'; },
          tone: this.getBmcStatusClass(primaryFlywheel.status) === 'danger' ? 'critical' : 'healthy',
        },
        leadSegment && {
          title: `Validate ${leadSegment.title}`,
          detail: leadSegment.status || leadSegment.preview || 'Check segment truth, validation, and messaging fit.',
          action: () => { this.bmcFocus = 'segments'; },
          tone: this.getBmcStatusClass(leadSegment.status) === 'danger' ? 'warning' : 'healthy',
        },
        revenueItem && {
          title: `Inspect ${this.getBmcItemLabel('revenue_streams', revenueItem)}`,
          detail: this.getBmcStatus('revenue_streams', revenueItem) || this.getBmcItemPreview('revenue_streams', revenueItem),
          action: () => { this.bmcFocus = 'revenue_streams'; },
          tone: this.getBmcStatusClass(this.getBmcStatus('revenue_streams', revenueItem)) === 'danger' ? 'critical' : 'warning',
        },
      ].filter(Boolean);
    },

    getBmcSpotlight(blockKey) {
      const item = this.getBmcBlockItems(blockKey)[0];
      if (!item) return null;
      return {
        title: this.getBmcItemLabel(blockKey, item),
        preview: this.getBmcItemPreview(blockKey, item),
        status: this.getBmcStatus(blockKey, item),
      };
    },

    getBmcDetailTitle() {
      if (!this.bmcDetailItem) return '';
      return this.getBmcItemLabel(this.bmcDetailKey, this.bmcDetailItem);
    },

    getBmcMetaLines(blockKey, item) {
      const pairsByBlock = {
        partners: [
          ['Type', item.partnerType],
          ['Role', item.role],
          ['Risk', item.riskLevel],
        ],
        hubs: [
          ['Type', item.hubType],
          ['Owner', item.ownerPersonName || item.ownerPerson || item.owner_hub_id],
          ['Bottleneck', item.primaryBottleneck],
        ],
        flywheels: [
          ['Motion', item.motionSequence || item.motion],
          ['Owner', item.ownerPersonName || item.ownerPerson],
          ['Metric', item.efficiencyMetrics || item.conversionRatePct],
        ],
        channels: [
          ['Type', item.channelType],
          ['Platform', item.platformName],
          ['Motion', item.motionType],
        ],
        segments: [
          ['Owner', item.ownerPersonName || item.owner_person_name],
          ['Business Unit', item.businessUnitId_resolved || item.bu_name],
          ['Flywheel', item.servesFlywheels || item.served_by_flywheels_ids],
        ],
        team: [
          ['Role', item.role],
          ['Hub', item.hubId_resolved || item.owner_hub_id],
          ['Business Unit', item.businessUnitId_resolved || item.business_unit_id],
        ],
        business_units: [
          ['Owner', item.ownerPersonName || item.owner_rollup_name],
          ['Flywheel', item.primaryFlywheelId_resolved || item.primaryFlywheelName || item.primary_flywheel_name],
          ['AOV', item.validatedAov || item.avgOrderValue],
        ],
        cost_structure: [
          ['Type', item.costType],
          ['Monthly', item.currentCostMonthly || item.monthlyAmount],
          ['Owner', item.ownerPersonId_resolved || item.ownerPerson],
        ],
        revenue_streams: [
          ['Model', item.revenueModel],
          ['Current', item.currentRevenueAnnual || item.nineMonthRevenue],
          ['Target', item.targetRevenueMar2026],
        ],
        metrics: [
          ['Current', item.currentValue],
          ['Target', item.targetValue || item.target],
          ['Owner', item.ownerPersonId_resolved || item.ownerPerson],
        ],
        platforms: [
          ['Type', item.platformType],
          ['Category', item.category],
          ['Owner', item.ownerUserId_resolved || item.owner_User_id || item.ownerPerson],
        ],
      };

      return (pairsByBlock[blockKey] || [])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .slice(0, 3)
        .map(([label, value]) => ({ label, value: String(value) }));
    },

    getBmcSectionName(blockKey) {
      const map = {
        partners: 'Partners',
        hubs: 'Activities',
        flywheels: 'Value Propositions',
        channels: 'Channels',
        segments: 'Customer Segments',
        team: 'Resources',
        business_units: 'Business Units',
        cost_structure: 'Cost Structure',
        revenue_streams: 'Revenue Streams',
        metrics: 'Key Metrics',
        platforms: 'Platforms',
      };
      return map[blockKey] || blockKey;
    },

    normalizeBmcToken(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^\w\s/&]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    splitBmcReferenceValues(value) {
      if (value === undefined || value === null || value === '') return [];
      const raw = Array.isArray(value) ? value : [value];
      return raw
        .flatMap((entry) => String(entry).split(/[|,;/]+/))
        .map((entry) => entry.trim())
        .filter(Boolean);
    },

    findBmcRelatedByNames(blockKey, names = []) {
      if (!blockKey || !names.length) return [];
      const needles = names.map((name) => this.normalizeBmcToken(name)).filter(Boolean);
      if (!needles.length) return [];

      return this.getBmcBlockItems(blockKey).filter((candidate) => {
        const label = this.normalizeBmcToken(this.getBmcItemLabel(blockKey, candidate));
        return needles.some((needle) => label === needle || label.includes(needle) || needle.includes(label));
      });
    },

    getBmcRelatedItems() {
      if (!this.bmcDetailItem || !this.bmcDetailKey) return [];

      const item = this.bmcDetailItem;
      const relationConfig = {
        partners: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name, item.business_unit_id]],
          ['channels', [item.channelName, item.channel_name]],
        ],
        hubs: [
          ['team', [item.ownerPersonName, item.ownerPerson]],
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
        ],
        flywheels: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
          ['segments', [item.segmentName, item.customerSegmentName, item.servedSegments]],
          ['team', [item.ownerPersonName, item.ownerPerson]],
        ],
        channels: [
          ['platforms', [item.platformName, item.platform_name]],
          ['segments', [item.segmentName, item.customerSegmentName]],
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
        ],
        segments: [
          ['business_units', [item.businessUnitId_resolved, item.bu_name]],
          ['flywheels', [item.servesFlywheels, item.served_by_flywheels_ids, item.primaryFlywheelId_resolved]],
          ['team', [item.ownerPersonName, item.owner_person_name]],
        ],
        team: [
          ['hubs', [item.hubId_resolved, item.owner_hub_id]],
          ['business_units', [item.businessUnitId_resolved, item.business_unit_id]],
        ],
        business_units: [
          ['flywheels', [item.primaryFlywheelId_resolved, item.primaryFlywheelName, item.primary_flywheel_name]],
          ['segments', [item.primarySegmentName, item.segmentName]],
          ['team', [item.ownerPersonName, item.owner_rollup_name]],
          ['revenue_streams', [item.name, item.businessUnitName]],
        ],
        cost_structure: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
          ['team', [item.ownerPersonId_resolved, item.ownerPerson]],
        ],
        revenue_streams: [
          ['business_units', [item.businessUnitId_resolved, item.businessUnitId]],
          ['platforms', [item.platformName]],
          ['team', [item.ownerPersonId_resolved, item.ownerPerson]],
        ],
        metrics: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
          ['flywheels', [item.flywheelName, item.flywheel_id_resolved]],
          ['team', [item.ownerPersonId_resolved, item.ownerPerson]],
        ],
        platforms: [
          ['channels', [item.name, item.platformName]],
          ['team', [item.ownerUserId_resolved, item.owner_User_id, item.ownerPerson]],
        ],
      };

      const seen = new Set();
      const related = [];

      for (const [blockKey, rawNames] of relationConfig[this.bmcDetailKey] || []) {
        const names = rawNames.flatMap((value) => this.splitBmcReferenceValues(value));
        for (const candidate of this.findBmcRelatedByNames(blockKey, names)) {
          if (candidate === item && blockKey === this.bmcDetailKey) continue;
          const name = this.getBmcItemLabel(blockKey, candidate);
          const key = `${blockKey}:${this.normalizeBmcToken(name)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          related.push({
            blockKey,
            section: this.getBmcSectionName(blockKey),
            name,
            status: this.getBmcStatus(blockKey, candidate),
            item: candidate,
          });
        }
      }

      return related.slice(0, 8);
    },
  };
}


// ── ./modules/crm.js ──
function createCrmModule() {
  return {
    // CRM
    crmSection: 'overview',
    crm: null,
    crmLoading: false,
    crmSavedView: 'newest-leads',

    // Leads
    crmLeads: [],
    crmLeadsTotal: 0,
    crmLeadsPage: 1,
    crmLeadsLoading: false,
    crmLeadFilters: { status: '', category: '', search: '' },

    // Flows
    crmFlows: [],
    crmFlowsLoading: false,
    crmFlowFilters: { status: '', stage: '', owner: '' },

    // Detail
    crmDetail: null,
    crmDetailType: null, // 'lead' | 'flow'
    crmDetailLoading: false,

    // Team
    crmTeam: null,

    // Config
    crmConfig: null,

    async loadCrm() {
      const signal = this.beginRequest('crm');
      this.crmLoading = true;
      try {
        const res = await fetch('/api/crm', { signal });
        if (res.ok) {
          this.crm = await res.json();
          this.runNotificationChecks?.('crm');
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM load error:', err);
      } finally {
        this.endRequest('crm', signal);
        this.crmLoading = false;
      }
    },

    async crmSwitchSection(section) {
      this.crmSection = section;
      if (section === 'overview') {
        if (!this.crm) await this.loadCrm();
      } else if (section === 'leads') {
        await this.loadCrmLeads();
      } else if (section === 'flows') {
        await this.loadCrmFlows();
      } else if (section === 'team') {
        await this.loadCrmTeam();
      } else if (section === 'config') {
        await this.loadCrmConfig();
      }
    },

    async loadCrmLeads() {
      const signal = this.beginRequest('crmLeads');
      this.crmLeadsLoading = true;
      const { status, category, search } = this.crmLeadFilters;
      const params = new URLSearchParams({ page: this.crmLeadsPage, limit: 50 });
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/crm/leads?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmLeads = data.rows || [];
          this.crmLeadsTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM leads error:', err);
      } finally {
        this.endRequest('crmLeads', signal);
        this.crmLeadsLoading = false;
      }
    },

    async loadCrmFlows() {
      const signal = this.beginRequest('crmFlows');
      this.crmFlowsLoading = true;
      const { status, stage, owner } = this.crmFlowFilters;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (stage) params.set('stage', stage);
      if (owner) params.set('owner', owner);
      try {
        const res = await fetch(`/api/crm/flows?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmFlows = data.rows || [];
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM flows error:', err);
      } finally {
        this.endRequest('crmFlows', signal);
        this.crmFlowsLoading = false;
      }
    },

    async openCrmLead(leadId) {
      this.crmDetailType = 'lead';
      this.crmDetailLoading = true;
      this.crmDetail = null;
      const signal = this.beginRequest('crmDetail');
      try {
        const res = await fetch(`/api/crm/leads/${leadId}`, { signal });
        if (res.ok) this.crmDetail = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM lead detail error:', err);
      } finally {
        this.endRequest('crmDetail', signal);
        this.crmDetailLoading = false;
      }
    },

    async openCrmFlow(flowId) {
      this.crmDetailType = 'flow';
      this.crmDetailLoading = true;
      this.crmDetail = null;
      const signal = this.beginRequest('crmDetail');
      try {
        const res = await fetch(`/api/crm/flows/${flowId}`, { signal });
        if (res.ok) this.crmDetail = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM flow detail error:', err);
      } finally {
        this.endRequest('crmDetail', signal);
        this.crmDetailLoading = false;
      }
    },

    closeCrmDetail() {
      this.crmDetail = null;
      this.crmDetailType = null;
    },

    async loadCrmTeam() {
      if (this.crmTeam) return;
      const signal = this.beginRequest('crmTeam');
      try {
        const res = await fetch('/api/crm/team', { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmTeam = data;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM team error:', err);
      } finally {
        this.endRequest('crmTeam', signal);
      }
    },

    async loadCrmConfig() {
      if (this.crmConfig) return;
      const signal = this.beginRequest('crmConfig');
      try {
        const res = await fetch('/api/crm/config', { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmConfig = data;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM config error:', err);
      } finally {
        this.endRequest('crmConfig', signal);
      }
    },

    crmApplyFilter(key, value) {
      this.crmLeadFilters[key] = value;
      this.crmLeadsPage = 1;
      this.loadCrmLeads();
    },

    crmApplyFlowFilter(key, value) {
      this.crmFlowFilters[key] = value;
      this.loadCrmFlows();
    },

    async crmApplySavedView(viewId) {
      this.crmSavedView = viewId;
      if (viewId === 'newest-leads') {
        this.crmLeadFilters = { status: '', category: '', search: '' };
        this.crmLeadsPage = 1;
        this.crmSection = 'leads';
        await this.loadCrmLeads();
        return;
      }
      if (viewId === 'qualified') {
        this.crmFlowFilters = { ...this.crmFlowFilters, status: 'Qualified', stage: '', owner: '' };
        this.crmSection = 'flows';
        await this.loadCrmFlows();
        return;
      }
      if (viewId === 'won') {
        this.crmFlowFilters = { ...this.crmFlowFilters, status: 'Won', stage: '', owner: '' };
        this.crmSection = 'flows';
        await this.loadCrmFlows();
        return;
      }
      if (viewId === 'owner-load') {
        this.crmSection = 'team';
        await this.loadCrmTeam();
        return;
      }
      this.crmFlowFilters = { ...this.crmFlowFilters, status: 'Stalled', stage: '', owner: '' };
      this.crmSection = 'flows';
      await this.loadCrmFlows();
    },

    crmNextPage() {
      const totalPages = Math.ceil(this.crmLeadsTotal / 50);
      if (this.crmLeadsPage < totalPages) {
        this.crmLeadsPage++;
        this.loadCrmLeads();
      }
    },

    crmPrevPage() {
      if (this.crmLeadsPage > 1) {
        this.crmLeadsPage--;
        this.loadCrmLeads();
      }
    },

    crmTotalPages() {
      return Math.ceil(this.crmLeadsTotal / 50) || 1;
    },

    getCrmStatusColor(status) {
      if (!status) return 'crm-status-unknown';
      const s = String(status).toLowerCase();
      if (s === 'active') return 'crm-status-active';
      if (s === 'stalled') return 'crm-status-stalled';
      if (s === 'won') return 'crm-status-won';
      if (s === 'qualified') return 'crm-status-qualified';
      if (s === 'lost' || s === 'unknown') return 'crm-status-lost';
      if (s === 'new') return 'crm-status-new';
      return 'crm-status-unknown';
    },

    getCrmFlowStatusCount(status) {
      if (!this.crm || !this.crm.flowStats) return 0;
      const item = (this.crm.flowStats.byStatus || []).find(
        (s) => s.name.toLowerCase() === status.toLowerCase()
      );
      return item ? item.count : 0;
    },

    getCrmOverviewKpi(name) {
      if (!this.crm || !this.crm.flowStats) return 0;
      return this.getCrmFlowStatusCount(name);
    },

    getCrmAreaStatus() {
      const stalled = this.getCrmFlowStatusCount('Stalled');
      const lost = this.getCrmFlowStatusCount('Lost');
      const qualified = this.getCrmFlowStatusCount('Qualified');
      if (stalled >= 10 || lost >= qualified) return { tone: 'critical', label: 'Needs Intervention' };
      if (stalled > 0) return { tone: 'warning', label: 'Needs Attention' };
      if (!this.crm) return { tone: 'neutral', label: 'Loading' };
      return { tone: 'healthy', label: 'Healthy' };
    },

    getCrmHeroMetrics() {
      return [
        {
          id: 'total-leads',
          label: 'Total Leads',
          value: this.crm?.leadStats?.total || 0,
          note: `${this.getCrmFlowStatusCount('New')} new`,
        },
        {
          id: 'active-flows',
          label: 'Active Flows',
          value: this.getCrmFlowStatusCount('Active'),
          note: `${this.getCrmFlowStatusCount('Qualified')} qualified`,
        },
        {
          id: 'stalled',
          label: 'Stalled',
          value: this.getCrmFlowStatusCount('Stalled'),
          note: `${this.getCrmFlowStatusCount('Lost')} lost`,
        },
        {
          id: 'team',
          label: 'CRM Team',
          value: this.crm?.team?.count || 0,
          note: `${this.crm?.flowStats?.total || 0} total flows`,
        },
      ];
    },

    getCrmPriorityCards() {
      const topOwners = (this.crm?.flowStats?.byOwner || []).slice(0, 3);
      const topStatuses = (this.crm?.flowStats?.byStatus || []).slice(0, 4);
      const recentLeads = (this.crm?.leadStats?.recentLeads || []).slice(0, 3);
      return [
        {
          id: 'pipeline-health',
          title: 'Pipeline Health',
          tone: this.getCrmFlowStatusCount('Stalled') > 0 ? 'warning' : 'healthy',
          value: this.getCrmFlowStatusCount('Active'),
          label: 'active flows in motion',
          items: topStatuses.map(item => ({
            name: item.name,
            meta: String(item.count),
          })),
        },
        {
          id: 'owner-workload',
          title: 'Owner Workload',
          tone: 'neutral',
          value: this.crm?.flowStats?.total || 0,
          label: 'flows distributed across the CRM team',
          items: topOwners.map(item => ({
            name: item.name,
            meta: `${item.count} flows`,
          })),
        },
        {
          id: 'newest-leads',
          title: 'Newest Leads',
          tone: 'neutral',
          value: this.crm?.leadStats?.recentLeads?.length || 0,
          label: 'most recent leads entering the system',
          items: recentLeads.map(item => ({
            name: item.name || item.company || 'Untitled',
            meta: item.Status || item.Category || '',
          })),
        },
      ];
    },

    getCrmFocusList() {
      const stalled = (this.crm?.flowStats?.byStatus || []).find(item => String(item.name || '').toLowerCase() === 'stalled');
      const recentLead = this.crm?.leadStats?.recentLeads?.[0];
      const items = [];
      if (stalled && stalled.count > 0) {
        items.push({
          title: `${stalled.count} stalled flows need review`,
          detail: 'Jump into flows to unblock or requalify stuck pipeline',
          target: 'flows',
        });
      }
      if (recentLead) {
        items.push({
          title: `Newest lead: ${recentLead.name || recentLead.company || 'Untitled'}`,
          detail: recentLead.Status || recentLead.Category || 'New lead',
          target: 'leads',
        });
      }
      if (items.length === 0) {
        items.push({
          title: 'Pipeline is clear',
          detail: 'No immediate CRM bottlenecks detected',
          target: 'overview',
        });
      }
      return items;
    },

    getCrmMetricAction(metricId) {
      const actions = {
        'total-leads': () => this.crmApplySavedView('newest-leads'),
        'active-flows': () => this.crmApplySavedView('qualified'),
        stalled: () => this.crmApplySavedView('stalled'),
        team: () => this.crmApplySavedView('owner-load'),
      };
      return actions[metricId] || (() => {});
    },

    getCrmSavedViews() {
      return [
        { id: 'stalled', label: 'Stalled Flows' },
        { id: 'qualified', label: 'Qualified' },
        { id: 'newest-leads', label: 'Newest Leads' },
        { id: 'owner-load', label: 'Owner Load' },
        { id: 'won', label: 'Won' },
      ];
    },

    getCrmSavedViewItems() {
      if (this.crmSavedView === 'newest-leads') {
        return (this.crm?.leadStats?.recentLeads || []).slice(0, 5).map((lead) => ({
          title: lead.name || lead.company || 'Untitled lead',
          detail: lead.Status || lead.Category || 'Recent lead',
          action: () => this.openCrmLead(lead.lead_id),
        }));
      }
      if (this.crmSavedView === 'owner-load') {
        return (this.crm?.flowStats?.byOwner || []).slice(0, 5).map((owner) => ({
          title: owner.name,
          detail: `${owner.count} flows owned`,
          action: () => {
            this.crmFlowFilters = { ...this.crmFlowFilters, owner: owner.name, status: '', stage: '' };
            this.crmSwitchSection('flows');
          },
        }));
      }
      const statusName = this.crmSavedView === 'qualified'
        ? 'Qualified'
        : this.crmSavedView === 'won'
          ? 'Won'
          : 'Stalled';
      return (this.crm?.flows?.rows || this.crmFlows || [])
        .filter((flow) => String(flow.status || '').toLowerCase() === statusName.toLowerCase())
        .slice(0, 5)
        .map((flow) => ({
          title: flow.leadName || 'Untitled flow',
          detail: `${flow.owner || 'Unassigned'} · ${flow.stage || flow.status || 'Flow'}`,
          action: () => this.openCrmFlow(flow.flow_id),
        }));
    },

    getCrmSavedViewEmptyState() {
      const labels = {
        stalled: 'No stalled flows right now.',
        qualified: 'No qualified flows right now.',
        'newest-leads': 'No recent leads available.',
        'owner-load': 'No owner workload data available.',
        won: 'No won flows right now.',
      };
      return labels[this.crmSavedView] || 'No items available.';
    },

    async openCrmOwnerContext(ownerName) {
      if (!ownerName) return;
      if (Array.isArray(this.teamData) && this.teamData.length === 0) {
        await this.loadTeam();
      }
      const normalized = String(ownerName).trim().toLowerCase();
      const person = (this.teamData || []).find((entry) => String(entry.Name || '').trim().toLowerCase() === normalized);
      if (person?.id) {
        this.openPersonView(person);
        return;
      }
      await this.openNavigationTarget('team');
      this.showInfo(`Opened Team for ${ownerName}`);
    },
  };
}


// ── ./modules/marketing-ops.js ──
function createMarketingOpsModule() {
  return {
    // Marketing Ops
    mktops: null,
    mktopsLoading: false,
    mktopsSection: 'overview',
    mktopsLastRefresh: null,
    mktopsCampaignSearch: '',
    mktopsStatusFilter: '',
    mktopsSavedView: 'blockers',
    mktopsSequenceView: 'table',
    mktopsJourneyFilter: '',
    mktopsActionLoading: null,

    // Marketing AI Tools inputs
    mktopsAiInputs: { segment: '', context: '', competitor: '', focus: '', topic: '', audience: '', goal: '', product: '', budget: '' },

    // Marketing Tasks
    mktopsTasks: null,
    mktopsTasksLoading: false,
    mktopsTasksSummary: null,
    mktopsTasksFilter: { priority: 'all', channel: 'all', type: 'all' },

    // ── Content Calendar ─────────────────────────────────────
    calendarMonth: (() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    })(),
    calendarData: null,
    calendarLoading: false,
    calendarFilters: {
      contentTypes: ['Carousel', 'Reel', 'Feed Post', 'Story', 'Email', 'WhatsApp', 'Blog'],
      status: 'all',
      pillar: 'all',
    },

    // Content create/edit modal
    contentModalOpen: false,
    contentModalMode: 'create',
    contentForm: {
      id: null,
      name: '',
      status: 'Idea',
      contentType: 'Feed Post',
      contentPillar: '',
      publishDate: '',
      owner: '',
      hook: '',
      audienceSegment: [],
      productFocus: [],
      caption: '',
      visualBrief: '',
      campaignId: '',
      notes: '',
    },
    contentSaving: false,
    contentPendingApproval: false,
    contentSaveError: null,

    // Calendar view mode: 'month' | 'week'
    calendarViewMode: 'month',

    // Calendar memoization
    _calendarDaysKey: null,
    _calendarDaysCached: null,

    // Month-level fetch cache
    _calendarMonthCache: {},

    // Pre-computed rendered arrays for Alpine x-for (avoids method calls in templates)
    _renderedCalendarDays: [],
    _renderedWeekDays: [],

    // Lazily-built icon lookup map
    _contentTypeIcons: null,

    runMarketingAiTool(toolName) {
      const inputs = this.mktopsAiInputs;
      let prompt = '';
      switch (toolName) {
        case 'customer_psychology_generator':
          prompt = `Use the customer_psychology_generator tool to analyze the segment "${inputs.segment}"${inputs.context ? '. Context: ' + inputs.context : ''}`;
          break;
        case 'competitor_analysis':
          prompt = `Use the competitor_analysis tool to analyze "${inputs.competitor}"${inputs.focus ? '. Focus on: ' + inputs.focus : ''}`;
          break;
        case 'content_strategy_generator':
          prompt = `Use the content_strategy_generator tool for topic "${inputs.topic}"${inputs.audience ? '. Audience: ' + inputs.audience : ''}${inputs.goal ? '. Goal: ' + inputs.goal : ''}`;
          break;
        case 'campaign_ideator':
          prompt = `Use the campaign_ideator tool for product "${inputs.product}"${inputs.goal ? '. Goal: ' + inputs.goal : ''}${inputs.budget ? '. Budget: ' + inputs.budget : ''}`;
          break;
      }
      if (prompt) {
        this.inputText = prompt;
        this.view = 'chat';
        this.$nextTick(() => this.sendMessage());
      }
    },

    async loadMarketingOps() {
      const signal = this.beginRequest('marketingOps');
      this.mktopsLoading = true;
      try {
        const [summaryRes, taskSummaryRes] = await Promise.all([
          fetch('/api/marketing-ops', { signal }),
          fetch('/api/marketing-ops/tasks/summary').catch(() => null),
        ]);
        if (summaryRes.ok) {
          this.mktops = await summaryRes.json();
          this.mktopsLastRefresh = new Date();
          this.runNotificationChecks?.('marketing');
        }
        if (taskSummaryRes && taskSummaryRes.ok) {
          this.mktopsTasksSummary = await taskSummaryRes.json();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Marketing Ops load error:', err);
      } finally {
        this.endRequest('marketingOps', signal);
        this.mktopsLoading = false;
      }
    },

    getMktopsRefreshLabel() {
      if (!this.mktopsLastRefresh) return 'Never refreshed';
      const diff = Math.round((Date.now() - this.mktopsLastRefresh.getTime()) / 1000);
      if (diff < 60) return `Refreshed ${diff}s ago`;
      if (diff < 3600) return `Refreshed ${Math.round(diff / 60)}m ago`;
      return `Refreshed ${Math.round(diff / 3600)}h ago`;
    },

    getMarketingAreaStatus() {
      const blocked = this.mktops?.stats?.blockedCampaigns?.length || 0;
      const review = this.mktops?.stats?.needsReviewContent?.length || 0;
      const overdue = this.mktopsTasksSummary?.overdue || 0;
      if (blocked > 0) return { tone: 'critical', label: 'Needs Intervention' };
      if (review > 0 || overdue > 0) return { tone: 'warning', label: 'Needs Attention' };
      if (!this.mktops) return { tone: 'neutral', label: 'Loading' };
      return { tone: 'healthy', label: 'Healthy' };
    },

    getMarketingHeroMetrics() {
      return [
        {
          id: 'campaigns',
          label: 'Active Campaigns',
          value: this.mktops?.stats?.activeCampaigns || 0,
          note: `${this.mktops?.stats?.blockedCampaigns?.length || 0} blocked`,
        },
        {
          id: 'pipeline',
          label: 'Content Pipeline',
          value: this.mktops?.stats?.contentInPipeline || 0,
          note: `${this.mktops?.stats?.needsReviewContent?.length || 0} in brand review`,
        },
        {
          id: 'sequences',
          label: 'Live Sequences',
          value: this.mktops?.stats?.liveSequences || 0,
          note: `${this.mktops?.stats?.unhealthySequences?.length || 0} unhealthy`,
        },
        {
          id: 'sessions',
          label: 'Sessions This Week',
          value: this.mktops?.stats?.sessionsThisWeek || 0,
          note: `${this.mktopsTasksSummary?.inProgress || 0} tasks in progress`,
        },
      ];
    },

    getMarketingMetricAction(metricId) {
      const actions = {
        campaigns: () => this.applyMarketingSavedView('blockers'),
        pipeline: () => this.applyMarketingSavedView('review'),
        sequences: () => this.applyMarketingSavedView('sequences'),
        sessions: () => this.applyMarketingSavedView('sessions'),
      };
      return actions[metricId] || (() => {});
    },

    getMarketingPriorityCards() {
      return [
        {
          id: 'blockers',
          title: 'Blockers',
          tone: (this.mktops?.stats?.blockedCampaigns?.length || 0) > 0 ? 'critical' : 'healthy',
          value: this.mktops?.stats?.blockedCampaigns?.length || 0,
          label: 'campaigns blocked or waiting on Dan',
          items: (this.mktops?.stats?.blockedCampaigns || []).slice(0, 4).map(item => ({
            name: item.Name,
            meta: item.Status || item.Stage || '',
          })),
        },
        {
          id: 'throughput',
          title: 'Throughput',
          tone: 'neutral',
          value: this.mktops?.stats?.contentInPipeline || 0,
          label: 'content items moving through the system',
          items: [
            { name: 'Live campaigns', meta: String(this.mktops?.stats?.activeCampaigns || 0) },
            { name: 'Live sequences', meta: String(this.mktops?.stats?.liveSequences || 0) },
            { name: 'Sessions this week', meta: String(this.mktops?.stats?.sessionsThisWeek || 0) },
          ],
        },
        {
          id: 'workload',
          title: 'Workload',
          tone: (this.mktopsTasksSummary?.overdue || 0) > 0 ? 'warning' : 'healthy',
          value: this.mktopsTasksSummary?.total || 0,
          label: 'marketing tasks tracked',
          items: [
            { name: 'Overdue', meta: String(this.mktopsTasksSummary?.overdue || 0) },
            { name: 'Blocked', meta: String(this.mktopsTasksSummary?.blocked || 0) },
            { name: 'Urgent', meta: String(this.mktopsTasksSummary?.urgent || 0) },
          ],
        },
      ];
    },

    getMarketingFocusList() {
      const blocked = (this.mktops?.stats?.blockedCampaigns || []).slice(0, 2).map(item => ({
        title: item.Name,
        detail: item.Status || 'Blocked',
        target: 'campaigns',
      }));
      const review = (this.mktops?.stats?.needsReviewContent || []).slice(0, 2).map(item => ({
        title: item.Name,
        detail: item.Status || 'Brand Review',
        target: 'content',
      }));
      const issues = [...blocked, ...review];
      if (issues.length > 0) return issues;
      return [
        {
          title: 'Campaign system is clear',
          detail: 'No blocked campaigns or review pileup right now',
          target: 'campaigns',
        },
      ];
    },

    getMarketingSavedViews() {
      return [
        { id: 'blockers', label: 'Blocked Campaigns' },
        { id: 'review', label: 'Needs Review' },
        { id: 'sequences', label: 'Unhealthy Sequences' },
        { id: 'sessions', label: 'Sessions This Week' },
      ];
    },

    applyMarketingSavedView(viewId) {
      this.mktopsSavedView = viewId;
      if (viewId === 'review') {
        this.openMarketingSection('content');
        return;
      }
      if (viewId === 'sequences') {
        this.openMarketingSection('sequences');
        return;
      }
      if (viewId === 'sessions') {
        this.openMarketingSection('sessions');
        return;
      }
      this.mktopsStatusFilter = 'Blocked';
      this.openMarketingSection('campaigns');
    },

    getMarketingSavedViewItems() {
      if (this.mktopsSavedView === 'review') {
        return (this.mktops?.stats?.needsReviewContent || []).slice(0, 5).map((item) => ({
          title: item.Name,
          detail: item.Status || item.Platform || 'Needs review',
          action: () => {
            this.openMarketingSection('content');
            this.openDetailPanel(item.id, item.Name);
          },
        }));
      }
      if (this.mktopsSavedView === 'sequences') {
        return (this.mktops?.stats?.unhealthySequences || []).slice(0, 5).map((item) => ({
          title: item.Name,
          detail: item.Status || item['Journey Stage'] || 'Sequence issue',
          action: () => {
            this.openMarketingSection('sequences');
            this.openDetailPanel(item.id, item.Name);
          },
        }));
      }
      if (this.mktopsSavedView === 'sessions') {
        return (this.mktops?.sessions || []).slice(0, 5).map((item) => ({
          title: item.Name,
          detail: this.formatMktDate(item.Date || item['Session Date'] || item['Publish Date']),
          action: () => {
            this.openMarketingSection('sessions');
            this.openDetailPanel(item.id, item.Name);
          },
        }));
      }
      return (this.mktops?.stats?.blockedCampaigns || []).slice(0, 5).map((item) => ({
        title: item.Name,
        detail: item.Status || item.Stage || 'Blocked campaign',
        action: () => {
          this.mktopsStatusFilter = item.Status || 'Blocked';
          this.openMarketingSection('campaigns');
          this.openDetailPanel(item.id, item.Name);
          this.loadCampaignCommitments(item.id);
        },
      }));
    },

    getMarketingSavedViewEmptyState() {
      const labels = {
        blockers: 'No blocked campaigns right now.',
        review: 'Nothing is waiting on content review.',
        sequences: 'No unhealthy sequences right now.',
        sessions: 'No sessions found this week.',
      };
      return labels[this.mktopsSavedView] || 'No items available.';
    },

    async openMarketingOwnerContext(ownerName) {
      if (!ownerName) return;
      if (Array.isArray(this.teamData) && this.teamData.length === 0) {
        await this.loadTeam();
      }
      const normalized = String(ownerName).trim().toLowerCase();
      const person = (this.teamData || []).find((entry) => String(entry.Name || '').trim().toLowerCase() === normalized);
      if (person?.id) {
        this.openPersonView(person);
        return;
      }
      await this.openNavigationTarget('team');
      this.showInfo(`Opened Team for ${ownerName}`);
    },

    formatMktDate(value) {
      if (!value) return '—';
      const raw = typeof value === 'object' && value !== null && value.start ? value.start : String(value);
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) return raw;
      return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    },

    getCampaignsByStage(stage) {
      const campaigns = Array.isArray(this.mktops?.campaigns) ? this.mktops.campaigns : [];
      const query = this.mktopsCampaignSearch.trim().toLowerCase();
      return campaigns.filter(campaign => {
        if ((campaign.Stage || '') !== stage) return false;
        if (this.mktopsStatusFilter && (campaign.Status || '') !== this.mktopsStatusFilter) return false;
        if (!query) return true;
        const name = String(campaign.Name || '').toLowerCase();
        const owner = Array.isArray(campaign.ownerNames) ? campaign.ownerNames.join(' ').toLowerCase() : '';
        return name.includes(query) || owner.includes(query);
      });
    },

    getContentByStatus(status) {
      const content = Array.isArray(this.mktops?.content) ? this.mktops.content : [];
      return content.filter(item => (item.Status || '') === status);
    },

    getFilteredSequences() {
      const sequences = Array.isArray(this.mktops?.sequences) ? this.mktops.sequences : [];
      if (!this.mktopsJourneyFilter) return sequences;
      return sequences.filter(sequence => (sequence['Journey Stage'] || '') === this.mktopsJourneyFilter);
    },

    getSequencesByJourneyStage(stage) {
      return this.getFilteredSequences().filter(sequence => (sequence['Journey Stage'] || '') === stage);
    },

    getSequenceHealth(sequence) {
      const status = String(sequence?.Status || '').toLowerCase();
      if (status.includes('paused') || status.includes('stopped') || status.includes('unhealthy')) return 'critical';
      const openRate = Number(sequence?.['Open Rate'] || 0);
      const clickRate = Number(sequence?.['Click Rate'] || 0);
      const unsubRate = Number(sequence?.['Unsubscribe Rate'] || 0);
      if (unsubRate >= 3 || (openRate > 0 && openRate < 15)) return 'critical';
      if (clickRate > 0 && clickRate < 1) return 'warning';
      return 'healthy';
    },

    async loadCampaignCommitments(campaignId) {
      if (!campaignId) return;
      try {
        const res = await fetch(`/api/marketing-ops/campaigns/${campaignId}/commitments`);
        if (!res.ok) return;
        const data = await res.json();
        const count = Array.isArray(data?.commitments) ? data.commitments.length : 0;
        if (count > 0) {
          this.showInfo(`${count} linked commitments found for this campaign`);
        }
      } catch (err) {
        console.warn('Campaign commitments load error:', err);
      }
    },

    async campaignAction(campaignId, property, value) {
      if (!campaignId || !property) return;
      this.mktopsActionLoading = campaignId;
      try {
        const result = await this.changeStatus('/api/marketing-ops/campaigns/:id', campaignId, property, value);
        if (result) {
          await this.loadMarketingOps();
        }
      } finally {
        this.mktopsActionLoading = null;
      }
    },

    openMarketingSection(section) {
      this.mktopsSection = section;
      if (section === 'calendar' && !this.calendarData && !this.calendarLoading) {
        this.loadCalendar();
      }
      if (section === 'tasks' && !this.mktopsTasks && !this.mktopsTasksLoading) {
        this.loadMarketingTasks();
      }
      if (section === 'competitors' && !this.ciData) {
        this.loadCompetitorIntel();
      }
    },

    // ── Content Calendar Methods ──────────────────────────────

    async loadCalendar() {
      const month = this.calendarMonth;

      // Serve from cache immediately if available
      if (this._calendarMonthCache[month]) {
        this.calendarData = this._calendarMonthCache[month];
        this._calendarDaysKey = null;
        this.calendarLoading = false;
        this._rebuildCalendarView();
        this._prefetchAdjacentMonths(month);
        return;
      }

      this.calendarLoading = true;
      this.calendarData = null;
      try {
        const res = await fetch(`/api/marketing-ops/content/calendar?month=${month}`);
        if (res.ok) {
          const data = await res.json();
          this._calendarMonthCache[month] = data;
          this.calendarData = data;
        } else {
          this.calendarData = { items: [] };
        }
      } catch (err) {
        console.error('Calendar load error:', err);
        this.calendarData = { items: [] };
      } finally {
        this._calendarDaysKey = null;
        this.calendarLoading = false;
        this._rebuildCalendarView();
        this._prefetchAdjacentMonths(month);
      }
    },

    _prefetchAdjacentMonths(month) {
      const [y, m] = month.split('-').map(Number);
      const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      [prev, next].forEach(mo => {
        if (!this._calendarMonthCache[mo]) {
          fetch(`/api/marketing-ops/content/calendar?month=${mo}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) this._calendarMonthCache[mo] = data; })
            .catch(() => {});
        }
      });
    },

    navigateMonth(direction) {
      const [year, month] = this.calendarMonth.split('-').map(Number);
      const d = new Date(year, month - 1 + direction, 1);
      this.calendarMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      this.loadCalendar();
    },

    goToToday() {
      const d = new Date();
      this.calendarMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      this.loadCalendar();
    },

    getCalendarMonthLabel() {
      const [year, month] = this.calendarMonth.split('-').map(Number);
      return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    },

    isCurrentCalendarMonth() {
      const d = new Date();
      const current = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return this.calendarMonth === current;
    },

    getCalendarDays() {
      // Memoize: rebuild only when month or data length changes
      const cacheKey = this.calendarMonth + '_' + (this.calendarData && this.calendarData.items ? this.calendarData.items.length : 0);
      if (cacheKey === this._calendarDaysKey && this._calendarDaysCached) {
        return this._calendarDaysCached;
      }

      const [year, month] = this.calendarMonth.split('-').map(Number);
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      // Start grid on Monday (ISO week). getDay() → 0=Sun, 1=Mon...
      const startDow = firstDay.getDay(); // 0=Sun
      const startOffset = (startDow === 0) ? 6 : startDow - 1; // days before month start (Mon-based)

      // Use byDate map from API if available, else fall back to filtering items array
      const byDate = (this.calendarData && this.calendarData.byDate) || null;
      const allItems = (this.calendarData && this.calendarData.items) ? this.calendarData.items : [];

      const days = [];
      // Fill leading days from prev month
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, -i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ date: dateStr, dayNum: d.getDate(), isToday: false, isCurrentMonth: false, items: [] });
      }

      // Fill current month
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const items = byDate
          ? ((byDate[dateStr]) || [])
          : allItems.filter(item => item.publishDate && item.publishDate.startsWith(dateStr));
        days.push({ date: dateStr, dayNum: day, isToday: dateStr === todayStr, isCurrentMonth: true, items });
      }

      // Fill trailing days to complete 6-row grid (42 cells)
      const total = 42;
      let nextDay = 1;
      while (days.length < total) {
        const d = new Date(year, month, nextDay++);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ date: dateStr, dayNum: d.getDate(), isToday: false, isCurrentMonth: false, items: [] });
      }

      this._calendarDaysKey = cacheKey;
      this._calendarDaysCached = days;
      return days;
    },

    getFilteredCalendarItems(items) {
      return items.filter(item => {
        // Content type filter chips
        const activeTypes = this.calendarFilters.contentTypes;
        if (activeTypes.length > 0 && item.contentType) {
          if (!activeTypes.includes(item.contentType)) return false;
        }
        // Status filter
        if (this.calendarFilters.status !== 'all' && item.status !== this.calendarFilters.status) return false;
        // Pillar filter
        if (this.calendarFilters.pillar !== 'all' && item.contentPillar !== this.calendarFilters.pillar) return false;
        return true;
      });
    },

    toggleContentTypeFilter(type) {
      const idx = this.calendarFilters.contentTypes.indexOf(type);
      if (idx >= 0) {
        this.calendarFilters.contentTypes = this.calendarFilters.contentTypes.filter(t => t !== type);
      } else {
        this.calendarFilters.contentTypes = [...this.calendarFilters.contentTypes, type];
      }
      this._rebuildCalendarView();
    },

    getUpcomingThisWeek() {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      // End of current week (Sunday)
      const dayOfWeek = today.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + daysToSunday);
      const endStr = endOfWeek.toISOString().slice(0, 10);

      const allItems = (this.calendarData && this.calendarData.items) ? this.calendarData.items : [];
      return allItems
        .filter(item => item.publishDate && item.publishDate >= todayStr && item.publishDate <= endStr)
        .sort((a, b) => a.publishDate.localeCompare(b.publishDate));
    },

    getUnscheduledItems() {
      // Prefer the dedicated unscheduled array from the API if present
      const unscheduled = (this.calendarData && this.calendarData.unscheduled)
        ? this.calendarData.unscheduled
        : (this.calendarData && this.calendarData.items ? this.calendarData.items.filter(item => !item.publishDate) : []);
      return this.getFilteredCalendarItems(unscheduled);
    },

    openContentModal(mode, date, item) {
      this.contentModalMode = mode;
      this.contentPendingApproval = false;
      this.contentSaveError = null;
      if (mode === 'create') {
        this.contentForm = {
          id: null,
          name: '',
          status: 'Briefed',
          contentType: 'Carousel',
          contentPillar: '',
          publishDate: date || '',
          owner: '',
          hook: '',
          audienceSegment: [],
          productFocus: [],
          caption: '',
          visualBrief: '',
          campaignId: '',
          notes: '',
        };
      } else if (mode === 'edit' && item) {
        this.contentForm = {
          id: item.id || null,
          name: item.name || '',
          status: item.status || 'Idea',
          contentType: item.contentType || 'Feed Post',
          contentPillar: item.contentPillar || '',
          publishDate: item.publishDate || '',
          owner: item.owner || '',
          hook: item.hook || '',
          audienceSegment: Array.isArray(item.audienceSegment) ? [...item.audienceSegment] : [],
          productFocus: Array.isArray(item.productFocus) ? [...item.productFocus] : [],
          caption: item.caption || '',
          visualBrief: item.visualBrief || '',
          campaignId: item.campaignId || '',
          notes: item.notes || '',
        };
      }
      this.contentModalOpen = true;
    },

    closeContentModal() {
      this.contentModalOpen = false;
      this.contentSaving = false;
      this.contentPendingApproval = false;
      this.contentSaveError = null;
      this.contentForm = {
        id: null,
        name: '',
        status: 'Briefed',
        contentType: 'Carousel',
        contentPillar: '',
        publishDate: '',
        owner: '',
        hook: '',
        audienceSegment: [],
        productFocus: [],
        caption: '',
        visualBrief: '',
        campaignId: '',
        notes: '',
      };
    },

    async saveContent() {
      if (!this.contentForm.name.trim()) return;
      this.contentSaving = true;
      this.contentSaveError = null;
      try {
        const isEdit = this.contentModalMode === 'edit' && this.contentForm.id;
        const url = isEdit
          ? `/api/marketing-ops/content/${this.contentForm.id}`
          : '/api/marketing-ops/content';
        const method = isEdit ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.contentForm),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (data.pendingApproval || data.status === 'pending') {
            // Approval gate triggered
            this.contentPendingApproval = true;
            this.contentSaving = false;
            // Don't close modal — show pending state
          } else {
            this.closeContentModal();
            // Invalidate month cache so next load fetches fresh data
            delete this._calendarMonthCache[this.calendarMonth];
            await this.loadCalendar();
          }
        } else {
          this.contentSaveError = data.error || 'Failed to save. Please try again.';
          this.contentSaving = false;
        }
      } catch (err) {
        console.error('Save content error:', err);
        this.contentSaveError = 'Network error. Please try again.';
        this.contentSaving = false;
      }
    },

    getContentTypeIcon(type) {
      switch (type) {
        case 'Carousel':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="4" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="2" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
        case 'Reel':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 5l4 2-4 2V5z" fill="currentColor"/></svg>';
        case 'Feed Post':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 9l3-3 3 3 2-2 4 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        case 'Story':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="3" y="1" width="8" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="4" x2="9" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="5" y1="6.5" x2="9" y2="6.5" stroke="currentColor" stroke-width="1.2"/></svg>';
        case 'WhatsApp':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5A5.5 5.5 0 0 0 2.09 9.8L1.5 12.5l2.76-.58A5.5 5.5 0 1 0 7 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 5.5c0 2.485 1.515 4 4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
        case 'Blog':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="4.5" x2="10" y2="4.5" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="9.5" x2="7.5" y2="9.5" stroke="currentColor" stroke-width="1.2"/></svg>';
        case 'Email':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 4l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        default:
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>';
      }
    },

    _getIconMap() {
      if (this._contentTypeIcons) return this._contentTypeIcons;
      this._contentTypeIcons = {};
      for (const type of ['Carousel', 'Reel', 'Feed Post', 'Story', 'Email', 'WhatsApp', 'Blog']) {
        this._contentTypeIcons[type] = this.getContentTypeIcon(type);
      }
      this._contentTypeIcons['_default'] = this.getContentTypeIcon('Other');
      return this._contentTypeIcons;
    },

    _rebuildCalendarView() {
      const iconMap = this._getIconMap();
      const activeTypes = this.calendarFilters.contentTypes;
      const filterStatus = this.calendarFilters.status;
      const filterPillar = this.calendarFilters.pillar;

      const filterFn = (items) => {
        return items.filter(item => {
          if (activeTypes.length > 0 && item.contentType && !activeTypes.includes(item.contentType)) return false;
          if (filterStatus !== 'all' && item.status !== filterStatus) return false;
          if (filterPillar !== 'all' && item.contentPillar !== filterPillar) return false;
          return true;
        });
      };

      // Month view
      const rawDays = this.getCalendarDays();
      this._renderedCalendarDays = rawDays.map(cell => ({
        ...cell,
        filtered: filterFn(cell.items),
      }));

      // Week view — always compute so toggling is instant
      const rawWeek = this.getWeekDays();
      this._renderedWeekDays = rawWeek.map(day => ({
        ...day,
        filtered: filterFn(day.items),
      }));

      // Suppress unused-variable lint warning — iconMap is available for future chip pre-baking
      void iconMap;
    },

    getChipType(item) {
      return (item && item.contentType) || 'Other';
    },

    formatCalDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    },

    // ── Marketing Tasks ──────────────────────────────────

    async loadMarketingTasks() {
      this.mktopsTasksLoading = true;
      try {
        const [tasksRes, summaryRes] = await Promise.all([
          fetch('/api/marketing-ops/tasks'),
          fetch('/api/marketing-ops/tasks/summary'),
        ]);
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          this.mktopsTasks = data.tasks || [];
        }
        if (summaryRes.ok) {
          this.mktopsTasksSummary = await summaryRes.json();
        }
      } catch (err) {
        console.error('Marketing Tasks load error:', err);
        this.mktopsTasks = [];
      } finally {
        this.mktopsTasksLoading = false;
      }
    },

    getTasksByStatus(status) {
      if (!this.mktopsTasks) return [];
      return this.mktopsTasks.filter(task => {
        if (task.status !== status) return false;
        const f = this.mktopsTasksFilter;
        if (f.priority !== 'all' && task.priority !== f.priority) return false;
        if (f.channel !== 'all' && task.channel !== f.channel) return false;
        if (f.type !== 'all' && task.type !== f.type) return false;
        return true;
      });
    },

    getTaskPriorityClass(priority) {
      switch ((priority || '').toLowerCase()) {
        case 'urgent': return 'task-priority-urgent';
        case 'high':   return 'task-priority-high';
        case 'medium': return 'task-priority-medium';
        case 'low':    return 'task-priority-low';
        default:       return 'task-priority-default';
      }
    },

    isTaskOverdue(task) {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate + 'T23:59:59');
      return due < new Date();
    },

    formatTaskDue(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    },

    // ── Drag-and-Drop Rescheduling ────────────────────────────

    async handleCalendarDrop(event, targetDate) {
      event.currentTarget.classList.remove('drag-over');
      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
      } catch {
        return;
      }
      if (!data.id || data.fromDate === targetDate) return;

      // Optimistic: move item in live calendarData immediately, no server wait
      const items = this.calendarData && this.calendarData.items;
      if (!items) return;

      const item = items.find(i => i.id === data.id);
      if (!item) return;

      const oldDate = item.publishDate;
      item.publishDate = targetDate;

      // Update byDate map in place
      const byDate = this.calendarData.byDate || {};
      if (byDate[oldDate]) {
        byDate[oldDate] = byDate[oldDate].filter(i => i.id !== data.id);
      }
      if (!byDate[targetDate]) byDate[targetDate] = [];
      byDate[targetDate].push(item);
      this.calendarData.byDate = byDate;

      // Rebuild rendered arrays immediately — no loading state, no flash
      this._calendarDaysKey = null;
      this._rebuildCalendarView();

      // Fire PATCH in background
      try {
        const res = await fetch(`/api/marketing-ops/content/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publishDate: targetDate }),
        });
        if (!res.ok) throw new Error('PATCH failed');
        // Invalidate month cache so next explicit reload fetches fresh data
        delete this._calendarMonthCache[this.calendarMonth];
      } catch (err) {
        console.error('Reschedule error — reverting:', err);
        // Revert optimistic move
        item.publishDate = oldDate;
        if (byDate[targetDate]) {
          byDate[targetDate] = byDate[targetDate].filter(i => i.id !== data.id);
        }
        if (!byDate[oldDate]) byDate[oldDate] = [];
        byDate[oldDate].push(item);
        this.calendarData.byDate = { ...byDate };
        this._calendarDaysKey = null;
        this._rebuildCalendarView();
      }
    },

    // ── Week View ─────────────────────────────────────────────

    getWeekDays() {
      const [year, month] = this.calendarMonth.split('-').map(Number);
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      // Use today if in current displayed month, otherwise 1st of month
      const referenceDate = (today.getFullYear() === year && today.getMonth() + 1 === month)
        ? today
        : new Date(year, month - 1, 1);

      const dayOfWeek = referenceDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(referenceDate);
      monday.setDate(referenceDate.getDate() + mondayOffset);

      const days = [];
      const byDate = (this.calendarData && this.calendarData.byDate) || {};
      const allItems = (this.calendarData && this.calendarData.items) || [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const items = byDate[dateStr] !== undefined
          ? byDate[dateStr]
          : allItems.filter(item => item.publishDate === dateStr);
        days.push({
          date: dateStr,
          dayNum: d.getDate(),
          dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          isToday: dateStr === todayStr,
          isCurrentMonth: d.getMonth() + 1 === month,
          items,
        });
      }
      return days;
    },

    navigateWeek(direction) {
      // Shift the reference month by 7 days from the first of the current display month
      const [year, month] = this.calendarMonth.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      d.setDate(d.getDate() + direction * 7);
      this.calendarMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      this._calendarDaysKey = null;
      this.loadCalendar();
    },
  };
}


// ── ./modules/tech-team.js ──
function createTechTeamModule() {
  return {
    // Tech Team
    techTeam: null,
    techTeamLoading: false,
    techTeamSection: 'command',
    techTeamLastRefresh: null,
    techGithub: null,
    techAgents: null,
    techStrategy: null,
    techExpandedItem: null,
    techActionLoading: null,
    techSystemFilter: '',
    techPriorityFilter: '',
    techTypeFilter: '',
    techSprintSearch: '',
    techSavedView: 'blocked',

    async loadTechTeam() {
      const signal = this.beginRequest('techTeam');
      this.techTeamLoading = true;
      try {
        const [summaryRes, githubRes, agentsRes, strategyRes] = await Promise.all([
          fetch('/api/tech-team', { signal }),
          fetch('/api/tech-team/github').catch(() => null),
          fetch('/api/tech-team/agents').catch(() => null),
          fetch('/api/tech-team/strategy').catch(() => null),
        ]);
        if (summaryRes.ok) {
          this.techTeam = await summaryRes.json();
          this.techTeamLastRefresh = new Date();
          this.runNotificationChecks?.('tech');
        }
        if (githubRes && githubRes.ok) this.techGithub = await githubRes.json();
        if (agentsRes && agentsRes.ok) this.techAgents = await agentsRes.json();
        if (strategyRes && strategyRes.ok) this.techStrategy = await strategyRes.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Tech Team load error:', err);
      } finally {
        this.endRequest('techTeam', signal);
        this.techTeamLoading = false;
      }
    },

    getTechRefreshLabel() {
      if (!this.techTeamLastRefresh) return 'Never refreshed';
      const diff = Math.round((Date.now() - this.techTeamLastRefresh.getTime()) / 1000);
      if (diff < 60) return `Refreshed ${diff}s ago`;
      if (diff < 3600) return `Refreshed ${Math.round(diff / 60)}m ago`;
      return `Refreshed ${Math.round(diff / 3600)}h ago`;
    },

    getTechAreaStatus() {
      const blocked = this.techTeam?.stats?.blocked || 0;
      const p0 = this.techTeam?.stats?.p0Bugs || 0;
      const review = this.techTeam?.stats?.specsInReview || 0;
      if (blocked > 0 || p0 > 0) return { tone: 'critical', label: 'Needs Intervention' };
      if (review > 0) return { tone: 'warning', label: 'Needs Attention' };
      if (!this.techTeam) return { tone: 'neutral', label: 'Loading' };
      return { tone: 'healthy', label: 'Healthy' };
    },

    getTechHeroMetrics() {
      return [
        {
          id: 'in-progress',
          label: 'In Progress',
          value: this.techTeam?.stats?.inProgress || 0,
          note: `${this.techTeam?.stats?.doneItems || 0} done`,
        },
        {
          id: 'blocked',
          label: 'Blocked',
          value: this.techTeam?.stats?.blocked || 0,
          note: `${this.techTeam?.stats?.waitingOnDan?.length || 0} waiting on Dan`,
        },
        {
          id: 'open-bugs',
          label: 'Open Bugs',
          value: this.techTeam?.stats?.openBugs || 0,
          note: `${this.techTeam?.stats?.p0Bugs || 0} P0`,
        },
        {
          id: 'specs',
          label: 'Specs In Review',
          value: this.techTeam?.stats?.specsInReview || 0,
          note: `${this.techTeam?.stats?.recentDecisions?.length || 0} recent decisions`,
        },
      ];
    },

    getTechMetricAction(metricId) {
      const actions = {
        'in-progress': () => this.applyTechSavedView('in-progress'),
        blocked: () => this.applyTechSavedView('blocked'),
        'open-bugs': () => this.applyTechSavedView('bugs'),
        specs: () => this.applyTechSavedView('specs'),
      };
      return actions[metricId] || (() => {});
    },

    getTechPriorityCards() {
      return [
        {
          id: 'sprint-health',
          title: 'Sprint Health',
          tone: (this.techTeam?.stats?.blocked || 0) > 0 ? 'critical' : 'healthy',
          value: this.techTeam?.stats?.totalItems || 0,
          label: 'items in the current sprint system',
          items: [
            { name: 'Done', meta: String(this.techTeam?.stats?.doneItems || 0) },
            { name: 'In progress', meta: String(this.techTeam?.stats?.inProgress || 0) },
            { name: 'Blocked', meta: String(this.techTeam?.stats?.blocked || 0) },
          ],
        },
        {
          id: 'delivery-risk',
          title: 'Delivery Risk',
          tone: (this.techTeam?.stats?.openBugs || 0) > 0 ? 'warning' : 'healthy',
          value: this.techTeam?.stats?.openBugs || 0,
          label: 'bugs currently open across the sprint board',
          items: [
            { name: 'P0 bugs', meta: String(this.techTeam?.stats?.p0Bugs || 0) },
            { name: 'Specs in review', meta: String(this.techTeam?.stats?.specsInReview || 0) },
            { name: 'Waiting on Dan', meta: String(this.techTeam?.stats?.waitingOnDan?.length || 0) },
          ],
        },
        {
          id: 'recent-decisions',
          title: 'Recent Decisions',
          tone: 'neutral',
          value: this.techTeam?.stats?.recentDecisions?.length || 0,
          label: 'decisions logged in the last 7 days',
          items: (this.techTeam?.stats?.recentDecisions || []).slice(0, 3).map(item => ({
            name: item.Decision || item.Name || 'Decision',
            meta: item.Date?.start || item.Date || '',
          })),
        },
      ];
    },

    getTechFocusList() {
      const items = [];
      const blocked = this.getSprintItemsByStatus('Blocked').slice(0, 2);
      for (const item of blocked) {
        items.push({
          title: item.Name,
          detail: item.System || item['Blocked By'] || 'Blocked sprint item',
          target: 'sprint',
        });
      }
      const specs = this.getSpecsByStatus('In Review').slice(0, 1);
      for (const item of specs) {
        items.push({
          title: item.Name,
          detail: 'Spec in review',
          target: 'specs',
        });
      }
      if (!items.length) {
        items.push({
          title: 'Tech execution looks clear',
          detail: 'No top-level blockers are dominating the sprint board',
          target: 'command',
        });
      }
      return items;
    },

    getTechSavedViews() {
      return [
        { id: 'blocked', label: 'Blocked Sprint' },
        { id: 'bugs', label: 'Critical Bugs' },
        { id: 'specs', label: 'Specs In Review' },
        { id: 'waiting', label: 'Waiting On Dan' },
        { id: 'in-progress', label: 'In Progress' },
      ];
    },

    applyTechSavedView(viewId) {
      this.techSavedView = viewId;
      this.techSystemFilter = '';
      this.techPriorityFilter = '';
      this.techTypeFilter = '';
      this.techSprintSearch = '';

      if (viewId === 'bugs') {
        this.techTypeFilter = 'Bug';
        this.techTeamSection = 'bugs';
        return;
      }
      if (viewId === 'specs') {
        this.techTeamSection = 'specs';
        return;
      }
      this.techTeamSection = 'sprint';
      if (viewId === 'blocked') {
        this.techSprintSearch = '';
        return;
      }
      if (viewId === 'in-progress') {
        this.techSprintSearch = '';
        return;
      }
    },

    getTechSavedViewItems() {
      if (this.techSavedView === 'bugs') {
        return this.getTechBugs()
          .filter((bug) => bug.Priority && (bug.Priority.startsWith('P0') || bug.Priority.startsWith('P1')) && bug.Status !== 'Done')
          .slice(0, 5)
          .map((bug) => ({
            title: bug.Name,
            detail: `${bug.Priority || 'Bug'}${bug.System ? ' · ' + bug.System : ''}`,
            action: () => {
              this.techTeamSection = 'bugs';
              this.techTypeFilter = 'Bug';
            },
          }));
      }
      if (this.techSavedView === 'specs') {
        return this.getSpecsByStatus('In Review').slice(0, 5).map((spec) => ({
          title: spec.Name,
          detail: spec.System || spec.Author || 'Spec in review',
          action: () => { this.techTeamSection = 'specs'; },
        }));
      }
      if (this.techSavedView === 'waiting') {
        return (this.techTeam?.stats?.waitingOnDan || []).slice(0, 5).map((item) => ({
          title: item.Name || item,
          detail: 'Waiting on Dan',
          action: () => { this.techTeamSection = 'command'; },
        }));
      }
      if (this.techSavedView === 'in-progress') {
        return this.getSprintItemsByStatus('In Progress').slice(0, 5).map((item) => ({
          title: item.Name,
          detail: item.System || item.Priority || 'In progress',
          action: () => { this.techTeamSection = 'sprint'; },
        }));
      }
      return this.getSprintItemsByStatus('Blocked').slice(0, 5).map((item) => ({
        title: item.Name,
        detail: item.System || item['Blocked By'] || 'Blocked sprint item',
        action: () => { this.techTeamSection = 'sprint'; },
      }));
    },

    getTechSavedViewEmptyState() {
      const labels = {
        blocked: 'No blocked sprint work right now.',
        bugs: 'No critical bugs right now.',
        specs: 'No specs in review right now.',
        waiting: 'Nothing is waiting on Dan right now.',
        'in-progress': 'No in-progress sprint items right now.',
      };
      return labels[this.techSavedView] || 'No items available.';
    },

    async openTechSystemContext(systemName) {
      const normalized = String(systemName || '').trim().toLowerCase();
      if (!normalized) {
        this.techTeamSection = 'sprint';
        return;
      }
      if (normalized.includes('crm') || normalized.includes('lead') || normalized.includes('pipeline')) {
        await this.openNavigationTarget('crm');
        this.showInfo(`Opened CRM for ${systemName}`);
        return;
      }
      if (normalized.includes('marketing') || normalized.includes('campaign') || normalized.includes('content')) {
        await this.openNavigationTarget('marketingOps');
        this.showInfo(`Opened Marketing Ops for ${systemName}`);
        return;
      }
      if (normalized.includes('ops') || normalized.includes('inventory') || normalized.includes('sales')) {
        await this.openNavigationTarget('ops');
        this.showInfo(`Opened Inventory & Sales for ${systemName}`);
        return;
      }
      if (normalized.includes('factory') || normalized.includes('production')) {
        await this.openNavigationTarget('factory');
        this.showInfo(`Opened Factory for ${systemName}`);
        return;
      }
      this.techTeamSection = 'sprint';
      this.techSystemFilter = systemName;
      this.showInfo(`Filtered sprint work to ${systemName}`);
    },

    async openTechDecisionContext() {
      await this.openNavigationTarget('decisions');
      this.showInfo('Opened recent decisions');
    },

    async openTechWaitingContext() {
      await this.openNavigationTarget('actionQueue');
      this.showInfo('Opened Action Queue for waiting items');
    },

    getFilteredSprintItems() {
      let items = Array.isArray(this.techTeam?.sprintItems) ? [...this.techTeam.sprintItems] : [];
      if (this.techSystemFilter) {
        items = items.filter(item => (item.System || '') === this.techSystemFilter);
      }
      if (this.techPriorityFilter) {
        items = items.filter(item => (item.Priority || '') === this.techPriorityFilter);
      }
      if (this.techTypeFilter) {
        items = items.filter(item => (item.Type || '') === this.techTypeFilter);
      }
      const query = this.techSprintSearch.trim().toLowerCase();
      if (query) {
        items = items.filter(item =>
          String(item.Name || '').toLowerCase().includes(query) ||
          String(item.System || '').toLowerCase().includes(query)
        );
      }
      return items;
    },

    getSprintItemsByStatus(status) {
      return this.getFilteredSprintItems().filter(item => (item.Status || '') === status);
    },

    getTechBugs() {
      return this.getFilteredSprintItems().filter(item => item.Type === 'Bug' && item.Status !== 'Cancelled');
    },

    getTechBugStats() {
      const bugs = this.getTechBugs().filter(item => item.Status !== 'Done');
      const byPriority = {};
      const bySystem = {};
      for (const bug of bugs) {
        const priority = bug.Priority || 'Unset';
        const system = bug.System || 'Unset';
        byPriority[priority] = (byPriority[priority] || 0) + 1;
        bySystem[system] = (bySystem[system] || 0) + 1;
      }
      return { total: bugs.length, byPriority, bySystem };
    },

    getSpecsByStatus(status) {
      const specs = Array.isArray(this.techTeam?.specs) ? this.techTeam.specs : [];
      return specs.filter(item => (item.Status || '') === status);
    },

    getVelocityData() {
      const sprints = Array.isArray(this.techTeam?.sprintArchive) ? this.techTeam.sprintArchive : [];
      return sprints.slice(0, 8).map(item => {
        const planned = Number(item['Planned Points'] || item['Planned'] || item['Planned Items'] || item['Committed'] || 0);
        const completed = Number(item['Completed Points'] || item['Completed'] || item['Done Items'] || item['Delivered'] || 0);
        const pct = planned > 0 ? Math.round((completed / planned) * 100) : 0;
        return {
          name: item.Name || `Sprint ${item['Sprint Number'] || ''}`.trim(),
          planned,
          completed,
          pct,
        };
      }).filter(item => item.name);
    },

    getRoadmapByHorizon(horizon) {
      return this.getFilteredSprintItems().filter(item => (item.Horizon || item.Roadmap || '') === horizon);
    },

    getTechSystems() {
      return [...new Set(this.getFilteredSprintItems().map(item => item.System).filter(Boolean))].sort();
    },

    getTechPriorityClass(priority) {
      const p = String(priority || '').toLowerCase();
      if (p.startsWith('p0')) return 'tech-priority-critical';
      if (p.startsWith('p1')) return 'tech-priority-high';
      if (p.startsWith('p2')) return 'tech-priority-medium';
      return 'tech-priority-low';
    },

    getTechTypeClass(type) {
      const t = String(type || '').toLowerCase();
      if (t === 'bug') return 'tech-type-bug';
      if (t === 'feature') return 'tech-type-feature';
      if (t === 'task') return 'tech-type-task';
      if (t === 'spike') return 'tech-type-spike';
      return 'tech-type-chore';
    },

    async techSprintAction(itemId, property, value) {
      if (!itemId || !property) return;
      this.techActionLoading = itemId;
      try {
        const result = await this.changeStatus('/api/tech-team/sprint/:id', itemId, property, value);
        if (result) {
          await this.loadTechTeam();
        }
      } finally {
        this.techActionLoading = null;
      }
    },
  };
}


// ── ./modules/registry.js ──
function createRegistryModule() {
  return {
    // Registry
    registry: null,
    registryLoading: false,
    registryFilter: '',
    registryTypeFilter: '',
    registryExpanded: null,

    async loadRegistry() {
      const signal = this.beginRequest('registry');
      this.registryLoading = true;
      try {
        const res = await fetch('/api/registry', { signal });
        if (res.ok) this.registry = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Registry load error:', err);
      } finally {
        this.endRequest('registry', signal);
        this.registryLoading = false;
      }
    },

    getFilteredRegistry() {
      if (!this.registry) return [];
      let projects = this.registry.projects;
      if (this.registryFilter) projects = projects.filter((project) => project.status === this.registryFilter);
      if (this.registryTypeFilter) projects = projects.filter((project) => project.type === this.registryTypeFilter);
      return projects;
    },

    getRegistryStatusClass(status) {
      const map = { active: 'reg-active', 'in-progress': 'reg-building', 'back-burner': 'reg-paused', 'not-started': 'reg-planned' };
      return map[status] || '';
    },

    getRegistryTypeLabel(type) {
      const map = { 'agent-system': 'AI Team', app: 'App', backend: 'Backend', 'knowledge-base': 'Knowledge', integration: 'Integration' };
      return map[type] || type;
    },

    getRegistryTypeClass(type) {
      const map = { 'agent-system': 'reg-type-agent', app: 'reg-type-app', backend: 'reg-type-backend', 'knowledge-base': 'reg-type-knowledge', integration: 'reg-type-integration' };
      return map[type] || '';
    },
  };
}


// ── ./modules/projects.js ──
function createProjectsModule() {
  return {
    // Projects
    projects: [],
    projectsLoading: false,
    projectsFilter: 'Active',
    projectsTypeFilter: '',
    expandedProject: null,

    async loadProjects() {
      const signal = this.beginRequest('projects');
      this.projectsLoading = true;
      try {
        const res = await fetch('/api/notion/projects', { signal });
        const data = await res.json();
        this.projects = data.projects || [];
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Projects load error:', err);
      } finally {
        this.endRequest('projects', signal);
        this.projectsLoading = false;
      }
    },

    getFilteredProjects() {
      let filtered = this.projects;
      if (this.projectsFilter) {
        filtered = filtered.filter((project) => project.Status === this.projectsFilter);
      }
      if (this.projectsTypeFilter) {
        filtered = filtered.filter((project) => project.Type === this.projectsTypeFilter);
      }
      return filtered;
    },

    toggleProject(projectId) {
      this.expandedProject = this.expandedProject === projectId ? null : projectId;
    },

    viewProjectInNotion(projectId, projectName) {
      this.expandedProject = null;
      this.view = 'notion';
      this.openNotionPage(projectId, projectName);
    },

    getFocusHealthClass(area) {
      const health = (area.Health || area.Status || '').toLowerCase();
      if (health.includes('attention')) return 'focus-attention';
      if (health.includes('paused') || health.includes('hold')) return 'focus-paused';
      if (health.includes('needs improvement')) return 'focus-needs-improvement';
      return '';
    },

    getComputedHealth(area) {
      const overdue = area.overdueCount || 0;
      const blocked = area.blockedCount || 0;
      const open = area.commitmentCount || 0;
      const lastActivity = area.lastActivityDate || null;

      if (open === 0) return { color: 'grey', label: 'Dormant' };

      let daysSinceActivity = null;
      if (lastActivity) {
        const actDate = new Date(lastActivity + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        daysSinceActivity = Math.floor((today.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      if (overdue >= 3 || blocked >= 2 || (daysSinceActivity !== null && daysSinceActivity >= 14)) {
        return { color: 'red', label: 'Off Track' };
      }
      if (overdue >= 1 || blocked >= 1 || (daysSinceActivity !== null && daysSinceActivity >= 7)) {
        return { color: 'amber', label: 'At Risk' };
      }
      return { color: 'green', label: 'On Track' };
    },

    getSortedFocusAreas() {
      if (!this.dashboard || !this.dashboard.focusAreas) return [];
      const colorOrder = { red: 0, amber: 1, green: 2, grey: 3 };
      return [...this.dashboard.focusAreas].sort((a, b) => {
        const healthA = this.getComputedHealth(a);
        const healthB = this.getComputedHealth(b);
        const orderA = colorOrder[healthA.color] ?? 4;
        const orderB = colorOrder[healthB.color] ?? 4;
        if (orderA !== orderB) return orderA - orderB;
        return (b.overdueCount || 0) - (a.overdueCount || 0);
      });
    },

    formatDaysAgo(dateStr) {
      if (!dateStr) return '—';
      const raw = typeof dateStr === 'object' && dateStr.start ? dateStr.start : String(dateStr);
      const dateOnly = raw.split('T')[0];
      const date = new Date(dateOnly + 'T00:00:00');
      if (isNaN(date)) return '—';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays > 0) return `${diffDays} days ago`;
      if (diffDays === -1) return 'tomorrow';
      return `${Math.abs(diffDays)} days from now`;
    },
  };
}


// ── ./modules/team.js ──
function createTeamModule() {
  return {
    // Team
    teamData: [],
    teamLoading: false,
    expandedTeamMember: null,

    async loadTeam() {
      const signal = this.beginRequest('team');
      this.expandedTeamMember = null;
      this.teamLoading = true;
      try {
        if (this.dashboard && this.dashboard.people && this.dashboard.people.length) {
          this.teamData = this.dashboard.people;
        } else {
          const res = await fetch('/api/notion/people', { signal });
          const data = await res.json();
          this.teamData = data.people;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Team error:', err);
      } finally {
        this.endRequest('team', signal);
        this.teamLoading = false;
      }
    },

    askColinAbout(personName) {
      this.view = 'chat';
      this.inputText = `What is ${personName}'s current workload and commitments?`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    getOverloadedCount() {
      if (!this.teamData || this.teamData.length === 0) return 0;
      return this.teamData.filter((person) => (person.overdueCount || 0) >= 3 || (person.activeCommitmentCount || 0) >= 8).length;
    },

    getMaxWorkload() {
      if (!this.teamData || this.teamData.length === 0) return 1;
      return Math.max(...this.teamData.map((person) => person.activeCommitmentCount || 0), 1);
    },

    getWorkloadPercent(count) {
      const max = this.getMaxWorkload();
      return max === 0 ? 0 : Math.round((count / max) * 100);
    },

    getPersonHealthClass(person) {
      const overdue = person.overdueCount || 0;
      const blocked = person.blockedCount || 0;
      if (overdue >= 3 || blocked >= 2) return 'health-red';
      if (overdue >= 1 || blocked >= 1) return 'health-amber';
      return 'health-green';
    },

    getSortedTeamByWorkload() {
      return [...this.teamData].sort((a, b) => {
        const overdueA = a.overdueCount || 0;
        const overdueB = b.overdueCount || 0;
        if (overdueB !== overdueA) return overdueB - overdueA;
        const blockedA = a.blockedCount || 0;
        const blockedB = b.blockedCount || 0;
        if (blockedB !== blockedA) return blockedB - blockedA;
        return (b.activeCommitmentCount || 0) - (a.activeCommitmentCount || 0);
      });
    },

    getTeamMetrics() {
      if (!this.teamData || this.teamData.length === 0) {
        return { totalOpen: 0, totalOverdue: 0, mostLoaded: '—', unassigned: 0 };
      }
      const totalOpen = this.teamData.reduce((sum, person) => sum + (person.activeCommitmentCount || 0), 0);
      const totalOverdue = this.teamData.reduce((sum, person) => sum + (person.overdueCount || 0), 0);
      const mostLoaded = this.teamData.reduce((best, person) =>
        (person.activeCommitmentCount || 0) > (best.activeCommitmentCount || 0) ? person : best,
      this.teamData[0]);
      const unassigned = (this.dashboard && this.dashboard.unassignedCount != null) ? this.dashboard.unassignedCount : 0;
      return {
        totalOpen,
        totalOverdue,
        mostLoaded: mostLoaded ? (mostLoaded.Name || '—') : '—',
        unassigned,
      };
    },
  };
}


// ── ./modules/documents.js ──
function createDocumentsModule() {
  return {
    // Documents
    documents: { briefings: [], decisions: [], 'weekly-reviews': [] },
    docsTab: 'briefings',
    docsLoading: false,
    activeDoc: null,

    async loadDocuments() {
      const signal = this.beginRequest('documents');
      this.docsLoading = true;
      try {
        const res = await fetch('/api/documents', { signal });
        this.documents = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Documents error:', err);
      } finally {
        this.endRequest('documents', signal);
        this.docsLoading = false;
      }
    },

    async openDocument(category, filename) {
      const signal = this.beginRequest('activeDocument');
      try {
        const res = await fetch(`/api/documents/${category}/${encodeURIComponent(filename)}`, { signal });
        this.activeDoc = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Document open error:', err);
      } finally {
        this.endRequest('activeDocument', signal);
      }
    },

    discussDocument(doc) {
      if (this.streaming) return;
      this.view = 'chat';
      this.inputText = `I'd like to discuss this document: ${doc.filename}\n\n---\n${doc.content.slice(0, 500)}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },
  };
}


// ── ./modules/notion-browser.js ──
function createNotionBrowserModule() {
  return {
    // Notion browser
    notionDatabases: [],
    notionEntries: [],
    notionLoading: false,
    notionActiveDb: null,
    notionActivePage: null,
    notionPageContent: '',
    notionKeyPages: [],
    notionHasMore: false,
    notionNextCursor: null,
    notionRelated: {},
    notionRelatedLoading: false,
    notionSearchQuery: '',
    notionFilterStatus: '',

    // Detail panel
    detailPanel: null,

    async loadNotion() {
      const signal = this.beginRequest('notionHome');
      this.notionLoading = true;
      this.notionActiveDb = null;
      this.notionActivePage = null;
      this.notionPageContent = '';
      try {
        const [dbRes, kpRes] = await Promise.all([
          fetch('/api/notion/databases', { signal }),
          fetch('/api/notion/key-pages', { signal }),
        ]);
        const dbData = await dbRes.json();
        const kpData = await kpRes.json();
        this.notionDatabases = dbData.databases;
        this.notionKeyPages = kpData.pages;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Notion load error:', err);
      } finally {
        this.endRequest('notionHome', signal);
        this.notionLoading = false;
      }
    },

    async openNotionDb(db) {
      const signal = this.beginRequest('notionDb');
      this.notionLoading = true;
      this.notionActiveDb = db;
      this.notionActivePage = null;
      this.notionPageContent = '';
      this.notionEntries = [];
      this.notionSearchQuery = '';
      this.notionFilterStatus = '';
      try {
        const res = await fetch(`/api/notion/databases/${db.id}`, { signal });
        const data = await res.json();
        this.notionEntries = data.results;
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Database query error:', err);
      } finally {
        this.endRequest('notionDb', signal);
        this.notionLoading = false;
      }
    },

    getFilteredEntries() {
      let entries = this.notionEntries;
      if (this.notionSearchQuery.trim()) {
        const query = this.notionSearchQuery.toLowerCase().trim();
        entries = entries.filter((entry) => {
          const name = this.getEntryName(entry).toLowerCase();
          const meta = this.getEntryMeta(entry).toLowerCase();
          return name.includes(query) || meta.includes(query);
        });
      }
      if (this.notionFilterStatus) {
        entries = entries.filter((entry) => {
          const status = (entry.Status || entry.Health || '').toLowerCase();
          return status === this.notionFilterStatus.toLowerCase();
        });
      }
      return entries;
    },

    getAvailableStatuses() {
      const statuses = new Set();
      for (const entry of this.notionEntries) {
        if (entry.Status) statuses.add(entry.Status);
        if (entry.Health) statuses.add(entry.Health);
      }
      return [...statuses].sort();
    },

    async loadMoreEntries() {
      if (!this.notionHasMore || !this.notionNextCursor || !this.notionActiveDb) return;
      const signal = this.beginRequest('notionMoreEntries');
      this.notionLoading = true;
      try {
        const res = await fetch(`/api/notion/databases/${this.notionActiveDb.id}?cursor=${this.notionNextCursor}`, { signal });
        const data = await res.json();
        this.notionEntries = [...this.notionEntries, ...data.results];
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Load more error:', err);
      } finally {
        this.endRequest('notionMoreEntries', signal);
        this.notionLoading = false;
      }
    },

    async openNotionPage(pageId, pageName) {
      const pageSignal = this.beginRequest('notionPage');
      const relatedSignal = this.beginRequest('notionRelated');
      this.notionLoading = true;
      this.notionActivePage = { id: pageId, name: pageName || 'Loading...' };
      this.notionPageContent = '';
      this.notionRelated = {};
      this.notionRelatedLoading = true;
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`, { signal: pageSignal }),
          fetch(`/api/notion/pages/${pageId}/content`, { signal: pageSignal }),
        ]);
        const page = await pageRes.json();
        const content = await contentRes.json();
        this.notionActivePage = {
          id: pageId,
          name: pageName || page.properties?.Name || 'Untitled',
          url: page.url,
          created: page.created,
          updated: page.updated,
          properties: page.properties,
        };
        this.notionPageContent = content.markdown || '*No content*';

        fetch(`/api/notion/pages/${pageId}/related`, { signal: relatedSignal })
          .then((response) => response.json())
          .then((data) => { this.notionRelated = data.related || {}; })
          .catch((err) => {
            if (!this.isAbortError(err)) this.notionRelated = {};
          })
          .finally(() => {
            this.endRequest('notionRelated', relatedSignal);
            this.notionRelatedLoading = false;
          });
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Page load error:', err);
        this.notionPageContent = '*Failed to load page content*';
        this.notionRelatedLoading = false;
      } finally {
        this.endRequest('notionPage', pageSignal);
        this.notionLoading = false;
      }
    },

    notionBack() {
      if (this._requestControllers.notionPage) this._requestControllers.notionPage.abort();
      if (this._requestControllers.notionRelated) this._requestControllers.notionRelated.abort();
      if (this._requestControllers.notionDb) this._requestControllers.notionDb.abort();
      if (this._requestControllers.notionMoreEntries) this._requestControllers.notionMoreEntries.abort();
      if (this.notionActivePage) {
        this.notionActivePage = null;
        this.notionPageContent = '';
        this.notionRelated = {};
        this.notionRelatedLoading = false;
      } else if (this.notionActiveDb) {
        this.notionActiveDb = null;
        this.notionEntries = [];
      }
    },

    getEntryName(entry) {
      return entry.Name || entry.Title || entry.name || entry.title || 'Untitled';
    },

    getEntryMeta(entry) {
      const parts = [];
      if (entry.Function) parts.push(entry.Function);
      if (entry.Role) parts.push(entry.Role);
      if (entry.Type) parts.push(entry.Type);
      if (entry['Due Date']) {
        const dueDate = entry['Due Date'];
        parts.push(`Due: ${typeof dueDate === 'object' && dueDate !== null && dueDate.start ? dueDate.start : dueDate}`);
      }
      if (entry.Date) parts.push(entry.Date);
      if (entry.Owner) parts.push(`Owner: ${entry.Owner}`);
      return parts.slice(0, 3).join(' · ');
    },

    badgeAttr(value) {
      return (value || '').toLowerCase().trim();
    },

    hasRelated() {
      return Object.keys(this.notionRelated).length > 0;
    },

    getRelatedEntries() {
      return Object.entries(this.notionRelated).filter(([, pages]) => pages.length > 0);
    },

    getPropertyEntries(props) {
      if (!props) return [];
      return Object.entries(props).filter(([, value]) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0));
    },

    getDetailSections() {
      if (!this.detailPanel?.properties) return { header: [], dates: [], meta: [], content: [], relations: [] };
      const props = this.detailPanel.properties;
      const entries = this.getPropertyEntries(props);

      const headerFields = ['Status', 'Stage', 'Priority', 'Health', 'Type'];
      const metaFields = ['Owner', 'Assigned To', 'Assigned', 'Created', 'Last edited time', 'Created time'];
      const dateFields = ['Due Date', 'Due', 'Start Date', 'End Date', 'Date'];

      const header = [];
      const dates = [];
      const meta = [];
      const content = [];
      const relations = [];

      for (const [key, val] of entries) {
        const formatted = this.formatPropertyValue(val);
        if (formatted === null || formatted === undefined || formatted === '' || formatted === '—') continue;

        const item = { key, value: formatted, raw: val };

        if (headerFields.some(f => key.includes(f))) header.push(item);
        else if (dateFields.some(f => key.includes(f))) dates.push(item);
        else if (metaFields.some(f => key.includes(f))) meta.push(item);
        else if (val && val.type === 'relation') relations.push(item);
        else if (typeof formatted === 'string' && formatted.length > 100) content.push(item);
        else meta.push(item);
      }

      return { header, dates, meta, content, relations };
    },

    formatDate(val) {
      if (!val) return '—';
      const raw = typeof val === 'object' && val.start ? val.start : String(val);
      const dateOnly = raw.split('T')[0];
      const date = new Date(dateOnly + 'T00:00:00');
      if (isNaN(date)) return raw;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatPropertyValue(value) {
      if (Array.isArray(value)) {
        if (value.length === 0) return '—';
        if (typeof value[0] === 'object' && value[0] !== null && value[0].name) {
          return value.map((relation) => relation.name).join(', ');
        }
        if (typeof value[0] === 'string' && /^[0-9a-f-]{32,36}$/.test(value[0])) {
          return `${value.length} linked`;
        }
        return value.join(', ');
      }
      if (value && typeof value === 'object' && value.start) {
        const formatted = this.formatDate(value);
        if (value.end) return `${formatted} → ${this.formatDate({ start: value.end })}`;
        return formatted;
      }
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    },

    askColinAboutPage(page) {
      this.view = 'chat';
      const context = this.notionPageContent.slice(0, 500);
      this.inputText = `Tell me about this Notion page: "${page.name}"\n\nContent preview:\n${context}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    async openDetailPanel(pageId, pageName) {
      const signal = this.beginRequest('detailPanel');
      this.detailPanel = { id: pageId, name: pageName || 'Loading...', loading: true, properties: null, content: null, url: null };
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`, { signal }),
          fetch(`/api/notion/pages/${pageId}/content`, { signal }),
        ]);
        const page = await pageRes.json();
        const content = await contentRes.json();
        this.detailPanel = {
          id: pageId,
          name: pageName || page.properties?.Name || 'Untitled',
          url: page.url,
          properties: page.properties,
          content: content.markdown || '',
          loading: false,
        };
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Detail panel error:', err);
        if (this.detailPanel) {
          this.detailPanel.loading = false;
          this.detailPanel.content = '*Failed to load*';
        }
      } finally {
        this.endRequest('detailPanel', signal);
      }
    },

    closeDetailPanel() {
      if (this._requestControllers.detailPanel) this._requestControllers.detailPanel.abort();
      this.detailPanel = null;
    },

    askColinAboutDetail() {
      if (!this.detailPanel) return;
      this.view = 'chat';
      const context = (this.detailPanel.content || '').slice(0, 500);
      this.inputText = `Tell me about "${this.detailPanel.name}"\n\nContext:\n${context}...`;
      this.closeDetailPanel();
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },
  };
}


// ── ./modules/commitments.js ──
function createCommitmentsModule() {
  return {
    // Commitments kanban
    commitments: [],
    commitmentsLoading: false,
    commitmentsView: 'kanban',
    commitmentFilters: { focusArea: '', person: '', priority: '', status: '' },
    commitmentsDisplayLimit: 30,

    // Write-back state
    editDropdown: null,
    undoToast: null,
    quickNoteText: '',
    quickNoteSaving: false,
    writeErrors: {},
    peopleList: [],

    // Quick-create modals
    showCreateCommitment: false,
    showCreateDecision: false,
    submittingCommitment: false,
    submittingDecision: false,
    newCommitment: { name: '', assigneeId: '', dueDate: '', focusAreaId: '', priority: 'Medium', notes: '' },
    newDecision: { name: '', decision: '', rationale: '', context: '', focusAreaId: '', owner: 'Dan' },

    // Inline action state
    showSnoozeFor: null,
    showReassignFor: null,
    actionFeedback: null,

    // Bulk overdue selection
    selectedOverdue: [],

    handleCommitmentDocumentClick(event) {
      if (this.editDropdown && !event.target.closest('.edit-dropdown') && !event.target.closest('.editable-badge')) {
        this.editDropdown = null;
      }
    },

    async loadCommitments() {
      const signal = this.beginRequest('commitments');
      this.commitmentsLoading = true;
      try {
        const res = await fetch('/api/notion/commitments/all', { signal });
        const data = await res.json();
        this.commitments = data.commitments || [];
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Commitments load error:', err);
      } finally {
        this.endRequest('commitments', signal);
        this.commitmentsLoading = false;
      }
    },

    getCommitmentsByStatus(status) {
      return this.getAllFilteredCommitments().filter(c => (c.Status || 'Not Started') === status);
    },

    getAllFilteredCommitments() {
      let filtered = this.commitments;
      if (this.commitmentFilters.focusArea) {
        const focusArea = this.commitmentFilters.focusArea;
        filtered = filtered.filter(c => Array.isArray(c.focusAreaNames) && c.focusAreaNames.includes(focusArea));
      }
      if (this.commitmentFilters.person) {
        const person = this.commitmentFilters.person;
        filtered = filtered.filter(c => Array.isArray(c.assignedNames) && c.assignedNames.includes(person));
      }
      if (this.commitmentFilters.priority) {
        filtered = filtered.filter(c => c.Priority === this.commitmentFilters.priority);
      }
      if (this.commitmentFilters.status) {
        filtered = filtered.filter(c => (c.Status || 'Not Started') === this.commitmentFilters.status);
      }
      return filtered;
    },

    getFilteredCommitments() {
      return this.getAllFilteredCommitments().slice(0, this.commitmentsDisplayLimit);
    },

    getFilteredCommitmentsTotal() {
      return this.getAllFilteredCommitments().length;
    },

    loadMoreCommitments() {
      this.commitmentsDisplayLimit += 30;
    },

    resetCommitmentsLimit() {
      this.commitmentsDisplayLimit = 30;
    },

    isCommitmentOverdue(commitment) {
      if (!commitment['Due Date']) return false;
      const raw = typeof commitment['Due Date'] === 'object' ? commitment['Due Date'].start : commitment['Due Date'];
      if (!raw) return false;
      const due = new Date(raw + 'T00:00:00');
      return due < new Date() && commitment.Status !== 'Done';
    },

    getCommitmentFilterOptions() {
      const focusAreas = new Set();
      const people = new Set();
      const priorities = new Set();

      for (const commitment of this.commitments) {
        if (commitment.focusAreaNames) commitment.focusAreaNames.forEach(name => name && focusAreas.add(name));
        if (commitment.assignedNames) commitment.assignedNames.forEach(name => name && people.add(name));
        if (commitment.Priority) priorities.add(commitment.Priority);
      }

      return {
        focusAreas: [...focusAreas].sort(),
        people: [...people].sort(),
        priorities: [...priorities].sort(),
      };
    },

    async updateCommitmentField(commitmentId, field, newValue, apiPath) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldValue = commitment[field];
      commitment[field] = newValue;
      this.editDropdown = null;

      if (field === 'Status' || field === 'Priority') {
        this.showUndoToast(commitmentId, field, oldValue, newValue);
      }

      delete this.writeErrors[commitmentId + field];

      try {
        const body = {};
        body[apiPath === 'status' ? 'status' : 'priority'] = newValue;
        const res = await fetch(`/api/commitments/${commitmentId}/${apiPath}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          let msg = 'Update failed';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
      } catch (err) {
        commitment[field] = oldValue;
        this.writeErrors[commitmentId + field] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + field]; }, 4000);
        this.dismissUndoToast();
      }
    },

    updateStatus(commitmentId, newStatus) {
      this.updateCommitmentField(commitmentId, 'Status', newStatus, 'status');
    },

    updatePriority(commitmentId, newPriority) {
      this.updateCommitmentField(commitmentId, 'Priority', newPriority, 'priority');
    },

    async updateDueDate(commitmentId, newDate) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldValue = commitment['Due Date'];
      commitment['Due Date'] = { start: newDate, end: null };
      this.editDropdown = null;
      delete this.writeErrors[commitmentId + 'dueDate'];

      try {
        const res = await fetch(`/api/commitments/${commitmentId}/due-date`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: newDate }),
        });
        if (!res.ok) {
          let msg = 'Update failed';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
      } catch (err) {
        commitment['Due Date'] = oldValue;
        this.writeErrors[commitmentId + 'dueDate'] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + 'dueDate']; }, 4000);
      }
    },

    async updateAssignee(commitmentId, personId, personName) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldAssignedTo = [...(commitment['Assigned To'] || [])];
      const oldAssignedNames = [...(commitment.assignedNames || [])];

      commitment['Assigned To'] = [personId];
      commitment.assignedNames = [personName];
      this.editDropdown = null;
      delete this.writeErrors[commitmentId + 'assignee'];

      try {
        const res = await fetch(`/api/commitments/${commitmentId}/assignee`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: personId.replace(/-/g, '') }),
        });
        if (!res.ok) {
          let msg = 'Update failed';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
      } catch (err) {
        commitment['Assigned To'] = oldAssignedTo;
        commitment.assignedNames = oldAssignedNames;
        this.writeErrors[commitmentId + 'assignee'] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + 'assignee']; }, 4000);
      }
    },

    async submitQuickNote(commitmentId) {
      const note = this.quickNoteText.trim();
      if (!note || this.quickNoteSaving) return;

      this.quickNoteSaving = true;
      delete this.writeErrors[commitmentId + 'notes'];

      try {
        const res = await fetch(`/api/commitments/${commitmentId}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        });
        if (!res.ok) {
          let msg = 'Failed to save note';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
        const result = await res.json();
        const commitment = this.commitments.find(c => c.id === commitmentId);
        if (commitment) commitment.Notes = result.notes;
        if (this.detailPanel && this.detailPanel.id === commitmentId && this.detailPanel.properties) {
          this.detailPanel.properties.Notes = result.notes;
        }
        this.quickNoteText = '';
      } catch (err) {
        this.writeErrors[commitmentId + 'notes'] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + 'notes']; }, 4000);
      } finally {
        this.quickNoteSaving = false;
      }
    },

    async quickMarkDone(item) {
      try {
        const res = await fetch(`/api/commitments/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Done' }),
        });
        if (res.ok) {
          this.actionFeedback = { type: 'success', message: `"${item.Name || 'Commitment'}" marked done` };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          this.actionFeedback = { type: 'error', message: 'Failed to update status' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to update' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      }
    },

    async quickSnooze(itemId, newDate) {
      try {
        const res = await fetch(`/api/commitments/${itemId}/due-date`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: newDate }),
        });
        if (res.ok) {
          this.showSnoozeFor = null;
          this.actionFeedback = { type: 'success', message: 'Due date updated' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          this.actionFeedback = { type: 'error', message: 'Failed to snooze' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to snooze' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      }
    },

    async quickReassign(itemId, personId, personName) {
      try {
        const res = await fetch(`/api/commitments/${itemId}/assignee`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId }),
        });
        if (res.ok) {
          this.showReassignFor = null;
          this.actionFeedback = { type: 'success', message: `Reassigned to ${personName}` };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          this.actionFeedback = { type: 'error', message: 'Failed to reassign' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to reassign' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      }
    },

    getSnoozeDate(preset) {
      const d = new Date();
      if (preset === 'tomorrow') d.setDate(d.getDate() + 1);
      else if (preset === '+3') d.setDate(d.getDate() + 3);
      else if (preset === '+7') d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    },

    toggleOverdueSelect(id) {
      const idx = this.selectedOverdue.indexOf(id);
      if (idx === -1) this.selectedOverdue.push(id);
      else this.selectedOverdue.splice(idx, 1);
    },

    isOverdueSelected(id) {
      return this.selectedOverdue.includes(id);
    },

    selectAllOverdue() {
      if (!this.dashboard || !this.dashboard.overdue) return;
      if (this.selectedOverdue.length === this.dashboard.overdue.length) {
        this.selectedOverdue = [];
      } else {
        this.selectedOverdue = this.dashboard.overdue.map(c => c.id);
      }
    },

    async bulkMarkDone() {
      if (this.selectedOverdue.length === 0) return;
      const count = this.selectedOverdue.length;
      for (const id of this.selectedOverdue) {
        try {
          await fetch(`/api/commitments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Done' }),
          });
        } catch {}
      }
      this.selectedOverdue = [];
      this.actionFeedback = { type: 'success', message: `${count} items marked done` };
      setTimeout(() => { this.actionFeedback = null; }, 3000);
      this.loadDashboard();
    },

    async bulkSnooze(days) {
      if (this.selectedOverdue.length === 0) return;
      const count = this.selectedOverdue.length;
      const d = new Date();
      d.setDate(d.getDate() + days);
      const newDate = d.toISOString().split('T')[0];
      for (const id of this.selectedOverdue) {
        try {
          await fetch(`/api/commitments/${id}/due-date`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dueDate: newDate }),
          });
        } catch {}
      }
      this.selectedOverdue = [];
      this.actionFeedback = { type: 'success', message: `${count} items snoozed +${days}d` };
      setTimeout(() => { this.actionFeedback = null; }, 3000);
      this.loadDashboard();
    },

    async submitCommitment() {
      this.submittingCommitment = true;
      try {
        const res = await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newCommitment),
        });
        if (res.ok) {
          this.showCreateCommitment = false;
          this.newCommitment = { name: '', assigneeId: '', dueDate: '', focusAreaId: '', priority: 'Medium', notes: '' };
          this.actionFeedback = { type: 'success', message: 'Commitment created' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          let msg = 'Failed to create';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          this.actionFeedback = { type: 'error', message: msg };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to create commitment' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      } finally {
        this.submittingCommitment = false;
      }
    },

    async submitDecision() {
      this.submittingDecision = true;
      try {
        const res = await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newDecision),
        });
        if (res.ok) {
          this.showCreateDecision = false;
          this.newDecision = { name: '', decision: '', rationale: '', context: '', focusAreaId: '', owner: 'Dan' };
          this.actionFeedback = { type: 'success', message: 'Decision recorded' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          let msg = 'Failed to create';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          this.actionFeedback = { type: 'error', message: msg };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to create decision' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      } finally {
        this.submittingDecision = false;
      }
    },

    openEditDropdown(commitmentId, field, event) {
      event.stopPropagation();
      const rect = event.target.getBoundingClientRect();
      const options = field === 'Status'
        ? ['Not Started', 'In Progress', 'Blocked', 'Done', 'Cancelled']
        : field === 'Priority'
          ? ['Urgent', 'High', 'Medium', 'Low']
          : [];
      this.editDropdown = {
        commitmentId,
        field,
        options,
        position: { top: rect.bottom + 4, left: rect.left },
      };
    },

    openDatePicker(commitmentId, event) {
      event.stopPropagation();
      const rect = event.target.getBoundingClientRect();
      const today = new Date();
      const fmt = d => d.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      this.editDropdown = {
        commitmentId,
        field: 'dueDate',
        shortcuts: [
          { label: 'Today', value: fmt(today) },
          { label: 'Tomorrow', value: fmt(tomorrow) },
          { label: 'Next Friday', value: fmt(nextFriday) },
          { label: 'Next week', value: fmt(nextWeek) },
          { label: 'Next month', value: fmt(nextMonth) },
        ],
        position: { top: rect.bottom + 4, left: rect.left },
      };
    },

    async openPersonPicker(commitmentId, event) {
      event.stopPropagation();
      const rect = event.target.getBoundingClientRect();

      if (this.peopleList.length === 0) {
        try {
          const res = await fetch('/api/notion/people');
          const data = await res.json();
          this.peopleList = data.people || [];
        } catch (err) {
          console.error('Failed to load people:', err);
          return;
        }
      }

      this.editDropdown = {
        commitmentId,
        field: 'assignee',
        people: this.peopleList,
        position: { top: rect.bottom + 4, left: rect.left },
      };
    },

    closeEditDropdown() {
      this.editDropdown = null;
    },

    showUndoToast(commitmentId, field, oldValue, newValue) {
      if (this.undoToast?.timeoutId) clearTimeout(this.undoToast.timeoutId);
      const timeoutId = setTimeout(() => { this.undoToast = null; }, 5000);
      this.undoToast = { commitmentId, field, oldValue, newValue, timeoutId };
    },

    undoLastChange() {
      if (!this.undoToast) return;
      const { commitmentId, field, oldValue } = this.undoToast;
      clearTimeout(this.undoToast.timeoutId);
      this.undoToast = null;
      if (field === 'Status') this.updateCommitmentField(commitmentId, 'Status', oldValue, 'status');
      else if (field === 'Priority') this.updateCommitmentField(commitmentId, 'Priority', oldValue, 'priority');
    },

    dismissUndoToast() {
      if (this.undoToast?.timeoutId) clearTimeout(this.undoToast.timeoutId);
      this.undoToast = null;
    },
  };
}


// ── ./modules/factory.js ──
const FALLBACK_FACTORY_DATA = {
  machines: [
    { id: 'DTG-B1', name: 'Brother DTG #1', type: 'DTG', zone: 'DTG', brand: 'Brother', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-B2', name: 'Brother DTG #2', type: 'DTG', zone: 'DTG', brand: 'Brother', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-B3', name: 'Brother DTG #3', type: 'DTG', zone: 'DTG', brand: 'Brother', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-E1', name: 'Epson DTG #1', type: 'DTG', zone: 'DTG', brand: 'Epson', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 55, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-E2', name: 'Epson DTG #2', type: 'DTG', zone: 'DTG', brand: 'Epson', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 55, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'CURER-01', name: 'MAX Curer', type: 'CURER', zone: 'DTG', brand: 'MAX', theoretical_pcs_per_hour: 20, cycle_time_minutes: 3, mandatory_maintenance_min: 0, avg_changeover_min: 0, is_shared: false, is_sub_bottleneck: true, status: 'ACTIVE' },
    { id: 'PRETREAT-01', name: 'Pretreatment Machine', type: 'PRETREAT', zone: 'DTG', brand: 'Unknown', theoretical_pcs_per_hour: 30, cycle_time_minutes: 2, mandatory_maintenance_min: 10, avg_changeover_min: 0, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTF-01', name: 'Custom DTF Printer', type: 'DTF', zone: 'DTF', brand: 'Custom', theoretical_pcs_per_hour: 10, cycle_time_minutes: 6, mandatory_maintenance_min: 30, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SUB-E1', name: 'Epson Sublimation Printer', type: 'SUBLIMATION', zone: 'SUB', brand: 'Epson', theoretical_pcs_per_hour: 8, cycle_time_minutes: 8, mandatory_maintenance_min: 15, avg_changeover_min: 15, is_shared: false, is_sub_bottleneck: true, status: 'ACTIVE' },
    { id: 'SUB-MUG12', name: '12-Mug Vacuum Press', type: 'HEAT_PRESS', zone: 'SUB', brand: 'Unknown', theoretical_pcs_per_hour: 72, cycle_time_minutes: 10, mandatory_maintenance_min: 5, avg_changeover_min: 5, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'VNL-01', name: 'Roland Print-and-Cut', type: 'VINYL', zone: 'VNL', brand: 'Roland', theoretical_pcs_per_hour: 6, cycle_time_minutes: 10, mandatory_maintenance_min: 10, avg_changeover_min: 15, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'EMB-T1', name: 'Tajima Embroidery #1', type: 'EMBROIDERY', zone: 'EMB', brand: 'Tajima', theoretical_pcs_per_hour: 4, cycle_time_minutes: 15, mandatory_maintenance_min: 15, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'EMB-T2', name: 'Tajima Embroidery #2', type: 'EMBROIDERY', zone: 'EMB', brand: 'Tajima', theoretical_pcs_per_hour: 4, cycle_time_minutes: 15, mandatory_maintenance_min: 15, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-01', name: 'Single-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 20, cycle_time_minutes: 3, mandatory_maintenance_min: 0, avg_changeover_min: 60, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-06', name: '6-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 50, cycle_time_minutes: 1.2, mandatory_maintenance_min: 0, avg_changeover_min: 45, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-08', name: '8-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 75, cycle_time_minutes: 0.8, mandatory_maintenance_min: 0, avg_changeover_min: 45, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-12', name: '12-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 100, cycle_time_minutes: 0.6, mandatory_maintenance_min: 0, avg_changeover_min: 60, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'LASER-01', name: 'Laser Engraver', type: 'LASER', zone: 'LASER', brand: 'Unknown', theoretical_pcs_per_hour: 12, cycle_time_minutes: 5, mandatory_maintenance_min: 10, avg_changeover_min: 10, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'FUSE-01', name: 'Flat Fusing Press #1', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
    { id: 'FUSE-02', name: 'Flat Fusing Press #2', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
    { id: 'FUSE-03', name: 'Flat Fusing Press #3', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
    { id: 'FUSE-04', name: 'Flat Fusing Press #4', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
  ],
  zones: [
    { id: 'DTG', name: 'DTG Bay', method: 'Direct-to-Garment', operators: 2 },
    { id: 'DTF', name: 'DTF Bay', method: 'Direct-to-Film', operators: 1 },
    { id: 'SUB', name: 'Sublimation Bay', method: 'Sublimation', operators: 1 },
    { id: 'VNL', name: 'Vinyl Bay', method: 'Vinyl Print & Cut', operators: 1 },
    { id: 'EMB', name: 'Embroidery Bay', method: 'Embroidery', operators: 1 },
    { id: 'SCR', name: 'Screen Print Bay', method: 'Screen Printing', operators: 2 },
    { id: 'LASER', name: 'Laser Bay', method: 'Laser Engraving', operators: 1 },
    { id: 'QC_PACK', name: 'QC + Packing', method: 'Quality Control & Packing', operators: 2 },
  ],
  orderMix: { DTG: 0.55, DTF: 0.15, SUB: 0.10, EMB: 0.10, VNL: 0.05, SCR: 0.05 },
  assumptions: {
    shift_hours: 8,
    orders_per_day: 40,
    avg_pieces_per_order: 3.5,
    efficiency_factor: 0.70,
    qc_combined_minutes_per_piece: 7,
    qc_efficiency: 0.74,
    qc_separated: false,
  },
};

function createFactoryModule() {
  return {
    // Factory capacity
    factoryZoneDetail: null,
    factorySimOpen: false,
    factorySimConfig: null,
    factorySimPreset: 'current',
    _factoryBaseCache: null,
    factoryConfig: null,
    factoryConfigLoading: false,
    factoryEditingMachine: null,
    factoryEditingZone: null,
    factoryShowFormulas: false,
    factoryMachineEdits: {},
    factoryZoneEdits: {},
    factoryOperatingEdits: {},
    factoryEditingOperating: false,
    factoryError: null,
    factoryLastRefresh: null,
    factorySavedView: 'constraints',

    getFactoryData() {
      if (this.factoryConfig) {
        const cfg = this.factoryConfig;
        return {
          machines: cfg.machines || [],
          zones: cfg.zones || [],
          orderMix: cfg.order_mix || {},
          assumptions: cfg.operating || {},
        };
      }
      return FALLBACK_FACTORY_DATA;
    },

    calculateFactoryCapacity(simConfig = null) {
      const { machines: rawMachines, zones: rawZones, orderMix: rawOrderMix, assumptions } = this.getFactoryData();
      const cfg = simConfig || {
        orders_per_day: assumptions.orders_per_day,
        avg_pieces_per_order: assumptions.avg_pieces_per_order,
        method_split: { ...rawOrderMix },
        efficiency: assumptions.efficiency_factor,
        qc_operators: rawZones.find(z => z.id === 'QC_PACK').operators,
        qc_separated: assumptions.qc_separated,
        machine_overrides: {},
        curer_stagger: false,
        dtf_parallel: false,
        gang_cutting: false,
        shifts: 1,
        second_shift_efficiency: 0.85,
      };

      const machines = rawMachines.map(machine => {
        const enabled = cfg.machine_overrides[machine.id] !== false;
        let tph = machine.theoretical_pcs_per_hour;
        if (machine.id === 'CURER-01' && cfg.curer_stagger) tph *= 1.3;
        if (machine.id === 'DTF-01' && cfg.dtf_parallel) tph *= 1.4;
        if (machine.id === 'VNL-01' && cfg.gang_cutting) tph *= 2.0;
        return { ...machine, theoretical_pcs_per_hour: tph, _enabled: enabled };
      });

      const zones = rawZones.map(zone => {
        if (zone.id === 'QC_PACK') return { ...zone, operators: cfg.qc_operators };
        return zone;
      });

      const orderMix = cfg.method_split;
      const shiftHours = assumptions.shift_hours;
      const ordersPerDay = cfg.orders_per_day;
      const avgPiecesPerOrder = cfg.avg_pieces_per_order;
      const efficiencyFactor = cfg.efficiency;
      const shiftMinutes = shiftHours * 60;
      const totalDailyPieces = ordersPerDay * avgPiecesPerOrder;

      const supportMachineTypes = new Set(['CURER', 'PRETREAT']);
      const machineCapacity = {};
      machines.forEach(machine => {
        if (!machine._enabled) {
          machineCapacity[machine.id] = 0;
          return;
        }
        const available = shiftMinutes - machine.mandatory_maintenance_min - machine.avg_changeover_min;
        const eff = supportMachineTypes.has(machine.type) ? 1.0 : efficiencyFactor;
        const realistic = machine.theoretical_pcs_per_hour * (available / 60) * eff;
        machineCapacity[machine.id] = Math.max(0, realistic);
      });

      const supportTypes = new Set(['CURER', 'PRETREAT', 'HEAT_PRESS']);
      const zoneResults = zones.map(zone => {
        if (zone.id === 'QC_PACK') {
          const qcEfficiency = 0.74;
          let capacity;
          if (cfg.qc_separated) {
            const qcStaff = Math.ceil(zone.operators / 2);
            const packStaff = Math.floor(zone.operators / 2);
            const qcCap = qcStaff * (shiftMinutes / 3.5);
            const packCap = packStaff * (shiftMinutes / 3.5);
            capacity = Math.min(qcCap, packCap) * qcEfficiency;
          } else {
            const qcCombinedMinutesPerPiece = 7;
            capacity = zone.operators * (shiftMinutes / qcCombinedMinutesPerPiece) * qcEfficiency;
          }
          const demand = totalDailyPieces;
          const safeCapacity = Math.max(1, Math.round(capacity));
          const load = demand / safeCapacity;
          return {
            ...zone,
            capacity: safeCapacity,
            demand: Math.round(demand),
            load,
            status: this._factoryLoadStatus(load),
            machines: [],
            sub_bottleneck: null,
            is_people_based: true,
          };
        }

        const zoneMachines = machines.filter(machine => machine.zone === zone.id);
        const productionMachines = zoneMachines.filter(machine => !supportTypes.has(machine.type));
        const subBottleneck = zoneMachines.find(machine => machine.is_sub_bottleneck);

        const rawSum = productionMachines.reduce((sum, machine) => sum + machineCapacity[machine.id], 0);
        let effectiveCapacity = rawSum;
        let cappedBy = null;

        if (subBottleneck) {
          const cap = machineCapacity[subBottleneck.id];
          if (cap < rawSum) {
            effectiveCapacity = cap;
            cappedBy = subBottleneck.id;
          }
        }

        const mix = orderMix[zone.id] || 0;
        const demand = totalDailyPieces * mix;
        const safeCapacity = Math.max(1, Math.round(effectiveCapacity));
        const load = demand > 0 ? demand / safeCapacity : 0;

        return {
          ...zone,
          capacity: safeCapacity,
          demand: Math.round(demand),
          load,
          status: this._factoryLoadStatus(load),
          machines: zoneMachines.map(machine => ({
            ...machine,
            realistic_daily: Math.round(machineCapacity[machine.id]),
            _enabled: machine._enabled,
          })),
          sub_bottleneck: cappedBy,
          is_people_based: false,
        };
      });

      if (cfg.shifts === 2) {
        const mult = 1 + cfg.second_shift_efficiency;
        zoneResults.forEach(zone => {
          zone.capacity = Math.round(zone.capacity * mult);
        });
      }

      zoneResults.forEach(zone => {
        zone.load = zone.demand > 0 ? zone.demand / zone.capacity : 0;
        zone.status = this._factoryLoadStatus(zone.load);
      });
      const bindingZone = zoneResults.reduce((max, zone) => (zone.load > max.load ? zone : max), zoneResults[0]);

      const fusingMachines = machines.filter(machine => machine.zone === 'FUSING');
      const fusingTotalCapacity = fusingMachines.reduce((sum, machine) => {
        if (!machine._enabled) return sum;
        const avail = shiftMinutes - machine.mandatory_maintenance_min - machine.avg_changeover_min;
        return sum + machine.theoretical_pcs_per_hour * (avail / 60);
      }, 0);

      const dtgDemand = totalDailyPieces * (orderMix.DTG || 0);
      const dtfDemand = totalDailyPieces * (orderMix.DTF || 0);
      const subDemand = totalDailyPieces * (orderMix.SUB || 0);
      const fusingDemand = (dtgDemand * 0.5) + (dtfDemand * 2) + subDemand;
      const safeFusing = Math.max(1, fusingTotalCapacity);
      const fusingContention = fusingDemand / safeFusing;

      const curerCapacity = machineCapacity['CURER-01'] || 1;
      const curerUtilisation = dtgDemand / curerCapacity;

      const pretreatCapacity = machineCapacity['PRETREAT-01'] || 1;
      const pretreatUtilisation = (dtgDemand * 0.5) / pretreatCapacity;

      const sharedResources = [
        {
          id: 'FUSING',
          name: 'Fusing Bay (4 Presses)',
          capacity: Math.round(fusingTotalCapacity),
          demand: Math.round(fusingDemand),
          contention: fusingContention,
          status: this._factoryLoadStatus(fusingContention),
          note: 'Shared by DTG (dark), DTF (x2), SUB',
        },
        {
          id: 'CURER-01',
          name: 'MAX Curer',
          capacity: Math.round(curerCapacity),
          demand: Math.round(dtgDemand),
          contention: curerUtilisation,
          status: this._factoryLoadStatus(curerUtilisation),
          note: 'Caps entire DTG zone output',
        },
        {
          id: 'PRETREAT-01',
          name: 'Pretreat Machine',
          capacity: Math.round(pretreatCapacity),
          demand: Math.round(dtgDemand * 0.5),
          contention: pretreatUtilisation,
          status: this._factoryLoadStatus(pretreatUtilisation),
          note: 'Used for DTG dark garments only (~50%)',
        },
      ];

      const constraintCascade = zoneResults
        .filter(zone => zone.demand > 0)
        .slice()
        .sort((a, b) => b.load - a.load)
        .map(zone => ({
          ...zone,
          fix: this._constraintFix(zone.id, zone.load),
        }));

      const displayAssumptions = {
        ...assumptions,
        orders_per_day: cfg.orders_per_day,
        avg_pieces_per_order: cfg.avg_pieces_per_order,
        efficiency_factor: cfg.efficiency,
      };

      return {
        zones: zoneResults,
        bindingZone,
        factoryThroughput: Math.min(bindingZone.capacity, totalDailyPieces),
        totalPossible: totalDailyPieces,
        sharedResources,
        constraintCascade,
        assumptions: displayAssumptions,
        total_daily_pieces: totalDailyPieces,
      };
    },

    initFactorySimConfig() {
      const { zones, assumptions } = this.getFactoryData();
      this.factorySimConfig = {
        orders_per_day: assumptions.orders_per_day,
        avg_pieces_per_order: assumptions.avg_pieces_per_order,
        method_split: { DTG: 55, DTF: 15, SUB: 10, EMB: 10, VNL: 5, SCR: 5 },
        efficiency: 70,
        qc_operators: zones.find(z => z.id === 'QC_PACK').operators,
        qc_separated: false,
        machine_overrides: {},
        curer_stagger: false,
        dtf_parallel: false,
        gang_cutting: false,
        shifts: 1,
        second_shift_efficiency: 85,
      };
      this.factorySimPreset = 'current';
    },

    applyFactoryPreset(preset) {
      const base = {
        orders_per_day: 40,
        avg_pieces_per_order: 3.5,
        method_split: { DTG: 55, DTF: 15, SUB: 10, EMB: 10, VNL: 5, SCR: 5 },
        efficiency: 70,
        qc_operators: 2,
        qc_separated: false,
        machine_overrides: {},
        curer_stagger: false,
        dtf_parallel: false,
        gang_cutting: false,
        shifts: 1,
        second_shift_efficiency: 85,
      };
      const presets = {
        current: { ...base },
        qc_fixed: { ...base, qc_operators: 4, qc_separated: true },
        phase3: { ...base, orders_per_day: 70, qc_operators: 4, qc_separated: true, curer_stagger: true },
        growth: { ...base, orders_per_day: 120, efficiency: 75, qc_operators: 6, qc_separated: true, curer_stagger: true, dtf_parallel: true, gang_cutting: true },
        '20cr': { ...base, orders_per_day: 200, efficiency: 75, qc_operators: 8, qc_separated: true, curer_stagger: true, dtf_parallel: true, gang_cutting: true },
        machine_down_dtg: { ...base, machine_overrides: { 'DTG-B1': false } },
        machine_down_dtf: { ...base, machine_overrides: { 'DTF-01': false } },
        qc_absent: { ...base, qc_operators: 1 },
        monsoon: { ...base, efficiency: 60 },
        second_shift: { ...base, shifts: 2, second_shift_efficiency: 85 },
      };
      if (presets[preset]) {
        this.factorySimConfig = { ...presets[preset] };
        this.factorySimPreset = preset;
      }
    },

    getSimulatedCapacity() {
      if (!this.factorySimConfig) return this.calculateFactoryCapacity();
      const cfg = this.factorySimConfig;
      return this.calculateFactoryCapacity({
        orders_per_day: cfg.orders_per_day,
        avg_pieces_per_order: cfg.avg_pieces_per_order,
        method_split: Object.fromEntries(Object.entries(cfg.method_split).map(([k, v]) => [k, v / 100])),
        efficiency: cfg.efficiency / 100,
        qc_operators: cfg.qc_operators,
        qc_separated: cfg.qc_separated,
        machine_overrides: cfg.machine_overrides,
        curer_stagger: cfg.curer_stagger,
        dtf_parallel: cfg.dtf_parallel,
        gang_cutting: cfg.gang_cutting,
        shifts: cfg.shifts,
        second_shift_efficiency: cfg.second_shift_efficiency / 100,
      });
    },

    simMethodSplitTotal() {
      if (!this.factorySimConfig) return 100;
      const split = this.factorySimConfig.method_split;
      return (split.DTG || 0) + (split.DTF || 0) + (split.SUB || 0) + (split.EMB || 0) + (split.VNL || 0) + (split.SCR || 0);
    },

    toggleFactorySim() {
      if (!this.factorySimOpen) {
        if (!this.factorySimConfig) this.initFactorySimConfig();
        this.factorySimOpen = true;
      } else {
        this.factorySimOpen = false;
      }
    },

    closeFactorySim() {
      this.factorySimOpen = false;
    },

    getFactoryCap() {
      return this.getSimulatedCapacity();
    },

    getFactoryBaseCap() {
      if (!this._factoryBaseCache) this._factoryBaseCache = this.calculateFactoryCapacity();
      return this._factoryBaseCache;
    },

    getFactoryRefreshLabel() {
      if (!this.factoryLastRefresh) return '';
      return `Updated ${this.formatRelativeTime(this.factoryLastRefresh)}`;
    },

    getFactoryAreaStatus() {
      const cap = this.getFactoryCap();
      const bindingLoad = Number(cap?.bindingZone?.load || 0);
      const constrainedCount = (cap?.constraintCascade || []).filter(zone => zone.load >= 1).length;
      const atRiskCount = (cap?.constraintCascade || []).filter(zone => zone.load >= 0.85).length;

      if (bindingLoad >= 1 || constrainedCount > 0) {
        return { tone: 'critical', label: 'Constrained' };
      }
      if (bindingLoad >= 0.85 || atRiskCount > 1) {
        return { tone: 'warning', label: 'At Risk' };
      }
      return { tone: 'healthy', label: 'Stable' };
    },

    getFactoryHeroMetrics() {
      const cap = this.getFactoryCap();
      const totalCapacity = (cap?.zones || []).reduce((sum, zone) => sum + (Number(zone.capacity) || 0), 0);
      const constrainedZones = (cap?.constraintCascade || []).filter(zone => zone.load >= 1).length;
      const sharedHotspots = (cap?.sharedResources || []).filter(resource => resource.contention >= 0.85).length;
      return [
        {
          id: 'throughput',
          label: 'Factory Throughput',
          value: `${Math.round(cap?.factoryThroughput || 0)} pcs/day`,
          note: `${Math.round(cap?.total_daily_pieces || 0)} pcs/day current demand`,
        },
        {
          id: 'constraint',
          label: 'Binding Constraint',
          value: cap?.bindingZone?.name || 'No constraint',
          note: `${Math.round((Number(cap?.bindingZone?.load || 0)) * 100)}% loaded`,
        },
        {
          id: 'zone-health',
          label: 'Constrained Zones',
          value: String(constrainedZones),
          note: `${(cap?.constraintCascade || []).length} production zones in model`,
        },
        {
          id: 'shared-resources',
          label: 'Shared Hotspots',
          value: String(sharedHotspots),
          note: `${Math.round(totalCapacity)} pcs/day modeled zone capacity`,
        },
      ];
    },

    getFactoryMetricAction(metricId) {
      const actions = {
        throughput: () => this.applyFactorySavedView('constraints'),
        constraint: () => this.applyFactorySavedView('constraints'),
        'zone-health': () => this.applyFactorySavedView('shared'),
        'shared-resources': () => this.applyFactorySavedView('shared'),
      };
      return actions[metricId] || (() => {});
    },

    getFactoryPriorityCards() {
      const cap = this.getFactoryCap();
      const constraintCascade = cap?.constraintCascade || [];
      const sharedResources = cap?.sharedResources || [];
      const assumptions = cap?.assumptions || {};
      const topConstraints = constraintCascade.slice(0, 3);
      const sharedHotspots = sharedResources.slice().sort((a, b) => b.contention - a.contention).slice(0, 3);
      const operatorZones = (cap?.zones || []).filter(zone => zone.is_people_based || zone.id === 'QC_PACK');

      return [
        {
          id: 'constraints',
          title: 'Constraint Cascade',
          label: 'Where the line is most likely to break first.',
          value: topConstraints[0] ? `${Math.round(topConstraints[0].load * 100)}%` : '0%',
          tone: topConstraints[0]?.load >= 1 ? 'critical' : topConstraints[0]?.load >= 0.85 ? 'warning' : 'healthy',
          items: topConstraints.map(zone => ({
            name: zone.name,
            meta: `${Math.round(zone.capacity)} cap / ${Math.round(zone.demand)} demand`,
          })),
        },
        {
          id: 'shared',
          title: 'Shared Resources',
          label: 'Monitor contention across bottleneck equipment.',
          value: sharedHotspots[0] ? `${Math.round(sharedHotspots[0].contention * 100)}%` : '0%',
          tone: sharedHotspots[0]?.contention >= 1 ? 'critical' : sharedHotspots[0]?.contention >= 0.85 ? 'warning' : 'healthy',
          items: sharedHotspots.map(resource => ({
            name: resource.name,
            meta: `${Math.round(resource.demand)} demand / ${Math.round(resource.capacity)} cap`,
          })),
        },
        {
          id: 'operating-model',
          title: 'Operating Model',
          label: 'Current assumptions driving the factory plan.',
          value: `${assumptions.orders_per_day || 0} orders`,
          tone: 'healthy',
          items: [
            { name: 'Avg pieces / order', meta: `${assumptions.avg_pieces_per_order || 0}` },
            { name: 'Shift hours', meta: `${assumptions.shift_hours || 0} hrs` },
            { name: 'People-based zones', meta: `${operatorZones.length} zones` },
          ],
        },
      ];
    },

    getFactoryFocusList() {
      const cap = this.getFactoryCap();
      const topConstraint = cap?.constraintCascade?.[0];
      const topShared = (cap?.sharedResources || []).slice().sort((a, b) => b.contention - a.contention)[0];
      const qcZone = (cap?.zones || []).find(zone => zone.id === 'QC_PACK');

      return [
        topConstraint && {
          title: `Relieve ${topConstraint.name}`,
          detail: topConstraint.fix || `${Math.round(topConstraint.load * 100)}% loaded against demand.`,
          action: () => {
            this.factoryZoneDetail = topConstraint.id;
            this.factorySimOpen = false;
            this.factoryShowFormulas = false;
          },
          tone: topConstraint.load >= 1 ? 'critical' : 'warning',
        },
        topShared && {
          title: `Inspect ${topShared.name}`,
          detail: `${Math.round(topShared.contention * 100)}% contention. ${topShared.note}`,
          action: () => {
            this.factorySimOpen = false;
            this.factoryShowFormulas = true;
          },
          tone: topShared.contention >= 1 ? 'critical' : 'warning',
        },
        qcZone && {
          title: 'Stress test the next shift',
          detail: `QC + Packing is ${Math.round(qcZone.load * 100)}% loaded. Run a quick scenario before changing staffing.`,
          action: () => {
            if (!this.factorySimConfig) this.initFactorySimConfig();
            this.factorySimOpen = true;
            this.factoryShowFormulas = false;
          },
          tone: qcZone.load >= 0.85 ? 'warning' : 'healthy',
        },
      ].filter(Boolean);
    },

    getFactorySavedViews() {
      return [
        { id: 'constraints', label: 'Constraint Cascade' },
        { id: 'shared', label: 'Shared Resources' },
        { id: 'people', label: 'People Zones' },
        { id: 'sim', label: 'Scenario Compare' },
      ];
    },

    applyFactorySavedView(viewId) {
      this.factorySavedView = viewId;
      if (viewId === 'sim') {
        if (!this.factorySimConfig) this.initFactorySimConfig();
        this.factorySimOpen = true;
        this.factoryShowFormulas = false;
        return;
      }
      this.factorySimOpen = false;
      this.factoryShowFormulas = viewId === 'shared';
    },

    getFactorySavedViewItems() {
      const cap = this.getFactoryCap();
      if (this.factorySavedView === 'shared') {
        return (cap?.sharedResources || []).slice(0, 5).map((resource) => ({
          title: resource.name,
          detail: `${Math.round(resource.contention * 100)}% contention`,
          action: () => {
            this.factoryShowFormulas = true;
            this.factorySimOpen = false;
          },
        }));
      }
      if (this.factorySavedView === 'people') {
        return (cap?.zones || [])
          .filter((zone) => zone.is_people_based || zone.id === 'QC_PACK')
          .slice(0, 5)
          .map((zone) => ({
            title: zone.name,
            detail: `${zone.operators} operators · ${Math.round(zone.load * 100)}% load`,
            action: () => {
              this.factoryZoneDetail = zone.id;
              this.factorySimOpen = false;
              this.factoryShowFormulas = false;
            },
          }));
      }
      if (this.factorySavedView === 'sim') {
        const compare = this.getFactoryScenarioCompare();
        return compare.items;
      }
      return (cap?.constraintCascade || []).slice(0, 5).map((zone) => ({
        title: zone.name,
        detail: `${Math.round(zone.load * 100)}% load · ${zone.fix || 'Monitor load'}`,
        action: () => {
          this.factoryZoneDetail = zone.id;
          this.factorySimOpen = false;
          this.factoryShowFormulas = false;
        },
      }));
    },

    getFactorySavedViewEmptyState() {
      const labels = {
        constraints: 'No constraints found right now.',
        shared: 'No shared-resource pressure right now.',
        people: 'No people-based zones found.',
        sim: 'Open the simulator to compare scenarios.',
      };
      return labels[this.factorySavedView] || 'No items available.';
    },

    applyFactoryQuickPreset(preset) {
      if (!this.factorySimConfig) this.initFactorySimConfig();
      this.applyFactoryPreset(preset);
      this.factorySimOpen = true;
      this.factoryShowFormulas = false;
      this.factorySavedView = 'sim';
    },

    focusFactoryZone(zoneId) {
      if (!zoneId) return;
      this.factoryZoneDetail = zoneId;
      this.factorySimOpen = false;
      this.factoryShowFormulas = false;
    },

    getFactoryScenarioCompare() {
      const current = this.getFactoryBaseCap();
      const simulated = this.getFactoryCap();
      const throughputDelta = Math.round((simulated?.factoryThroughput || 0) - (current?.factoryThroughput || 0));
      const bindingChanged = (simulated?.bindingZone?.id || '') !== (current?.bindingZone?.id || '');
      const currentShared = (current?.sharedResources || []).slice().sort((a, b) => b.contention - a.contention)[0];
      const simulatedShared = (simulated?.sharedResources || []).slice().sort((a, b) => b.contention - a.contention)[0];

      return {
        throughputDelta,
        bindingChanged,
        currentConstraint: current?.bindingZone?.name || '—',
        simulatedConstraint: simulated?.bindingZone?.name || '—',
        items: [
          {
            title: 'Throughput change',
            detail: `${throughputDelta >= 0 ? '+' : ''}${throughputDelta} pcs/day vs current`,
            action: () => {
              if (!this.factorySimConfig) this.initFactorySimConfig();
              this.factorySimOpen = true;
            },
          },
          {
            title: 'Binding constraint',
            detail: `${current?.bindingZone?.name || '—'} -> ${simulated?.bindingZone?.name || '—'}`,
            action: () => {
              this.factoryZoneDetail = simulated?.bindingZone?.id || current?.bindingZone?.id || null;
            },
          },
          {
            title: 'Hottest shared resource',
            detail: `${currentShared?.name || '—'} -> ${simulatedShared?.name || '—'}`,
            action: () => {
              this.factoryShowFormulas = true;
              this.factorySimOpen = false;
            },
          },
        ],
      };
    },

    factoryBarWidth(load) {
      return Math.min(load * 100, 100).toFixed(1) + '%';
    },

    factoryBarLabel(load) {
      return Math.round(load * 100) + '%';
    },

    _factoryLoadStatus(load) {
      if (load >= 1.0) return 'OVER';
      if (load >= 0.85) return 'AT_RISK';
      if (load >= 0.70) return 'APPROACHING';
      return 'OK';
    },

    _constraintFix(zoneId) {
      const fixes = {
        QC_PACK: 'Add 2 staff, separate QC and packing stations - unlocks full 140 pcs/day throughput',
        DTG: 'Implement stagger-loading protocol on MAX Curer (+30% throughput)',
        EMB: 'Add a third Tajima head or run split shifts - EMB is 56% loaded',
        DTF: 'DTF is within safe range; monitor if mix shifts above 20%',
        SUB: 'Sublimation is within safe range; printer is the limit, not the press',
        VNL: 'Vinyl is lightly loaded; no action needed',
        SCR: 'Screen Print has significant headroom; capacity far exceeds demand',
        LASER: 'Laser is not in current order mix; track when laser orders begin',
      };
      return fixes[zoneId] || 'Monitor load ratio';
    },

    factoryLoadBarWidth(load) {
      return Math.min(load * 100, 100).toFixed(1) + '%';
    },

    factoryLoadLabel(load) {
      return Math.round(load * 100) + '%';
    },

    toggleFactoryZone(zoneId) {
      this.factoryZoneDetail = this.factoryZoneDetail === zoneId ? null : zoneId;
    },

    async loadFactoryConfig() {
      if (this.factoryConfigLoading) return;
      this.factoryConfigLoading = true;
      try {
        const res = await fetch('/api/factory/config');
        if (!res.ok) throw new Error('Failed to load factory config');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.warn('Factory config load failed, using hardcoded data:', err.message);
        if (!this.factoryLastRefresh) this.factoryLastRefresh = new Date();
      } finally {
        this.factoryConfigLoading = false;
      }
    },

    async saveFactoryMachine(machineId, updates) {
      try {
        const res = await fetch(`/api/factory/machines/${machineId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Save failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryEditingMachine = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('saveFactoryMachine error:', err);
        this.factoryError = 'Failed to save - check console';
        setTimeout(() => { this.factoryError = null; }, 3000);
      }
    },

    async saveFactoryZone(zoneId, updates) {
      try {
        const res = await fetch(`/api/factory/zones/${zoneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Save failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryEditingZone = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('saveFactoryZone error:', err);
        this.factoryError = 'Failed to save - check console';
        setTimeout(() => { this.factoryError = null; }, 3000);
      }
    },

    async saveFactoryOperating(updates) {
      try {
        const res = await fetch('/api/factory/operating', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Save failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryEditingOperating = false;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('saveFactoryOperating error:', err);
        this.factoryError = 'Failed to save - check console';
        setTimeout(() => { this.factoryError = null; }, 3000);
      }
    },

    async addFactoryMachine(machine) {
      try {
        const res = await fetch('/api/factory/machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(machine),
        });
        if (!res.ok) throw new Error('Add failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('addFactoryMachine error:', err);
      }
    },

    async deleteFactoryMachine(machineId) {
      try {
        const res = await fetch(`/api/factory/machines/${machineId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('deleteFactoryMachine error:', err);
      }
    },

    startEditMachine(machine) {
      this.factoryEditingMachine = machine.id;
      this.factoryMachineEdits = {
        name: machine.name,
        theoretical_pcs_per_hour: machine.theoretical_pcs_per_hour,
        available_minutes: machine.available_minutes || null,
        efficiency_factor: machine.efficiency_factor || null,
        notes: machine.notes || '',
        formula: machine.formula || '',
        rules: JSON.parse(JSON.stringify(machine.rules || [])),
      };
    },

    cancelEditMachine() {
      this.factoryEditingMachine = null;
      this.factoryMachineEdits = {};
    },

    commitEditMachine(machineId) {
      const updates = {};
      const edits = this.factoryMachineEdits;
      if (edits.name !== undefined) updates.name = edits.name;
      if (edits.theoretical_pcs_per_hour !== undefined) updates.theoretical_pcs_per_hour = parseFloat(edits.theoretical_pcs_per_hour);
      if (edits.available_minutes !== null && edits.available_minutes !== undefined) updates.available_minutes = parseFloat(edits.available_minutes);
      if (edits.efficiency_factor !== null && edits.efficiency_factor !== undefined) updates.efficiency_factor = parseFloat(edits.efficiency_factor);
      if (edits.notes !== undefined) updates.notes = edits.notes;
      if (edits.formula !== undefined) updates.formula = edits.formula;
      if (edits.rules !== undefined) updates.rules = edits.rules;
      if (this.factoryConfig) this.saveFactoryMachine(machineId, updates);
      else this.factoryEditingMachine = null;
    },

    addMachineRule() {
      if (!this.factoryMachineEdits.rules) this.factoryMachineEdits.rules = [];
      this.factoryMachineEdits.rules.push({ type: 'caps_zone', target: '', description: '' });
    },

    removeMachineRule(index) {
      this.factoryMachineEdits.rules.splice(index, 1);
    },

    startEditZone(zone) {
      this.factoryEditingZone = zone.id;
      this.factoryZoneEdits = {
        operators: zone.operators,
        notes: zone.notes || '',
        formula: zone.formula || '',
        rules: JSON.parse(JSON.stringify(zone.rules || [])),
      };
    },

    cancelEditZone() {
      this.factoryEditingZone = null;
      this.factoryZoneEdits = {};
    },

    commitEditZone(zoneId) {
      const updates = {};
      const edits = this.factoryZoneEdits;
      if (edits.operators !== undefined) updates.operators = parseInt(edits.operators, 10);
      if (edits.notes !== undefined) updates.notes = edits.notes;
      if (edits.formula !== undefined) updates.formula = edits.formula;
      if (edits.rules !== undefined) updates.rules = edits.rules;
      if (this.factoryConfig) this.saveFactoryZone(zoneId, updates);
      else this.factoryEditingZone = null;
    },

    addZoneRule() {
      if (!this.factoryZoneEdits.rules) this.factoryZoneEdits.rules = [];
      this.factoryZoneEdits.rules.push({ type: 'sub_bottleneck', bottleneck_machine: '', description: '' });
    },

    removeZoneRule(index) {
      this.factoryZoneEdits.rules.splice(index, 1);
    },

    startEditOperating() {
      const { assumptions } = this.getFactoryData();
      this.factoryOperatingEdits = {
        shift_hours: assumptions.shift_hours,
        orders_per_day: assumptions.orders_per_day,
        avg_pieces_per_order: assumptions.avg_pieces_per_order,
      };
      this.factoryEditingOperating = true;
    },

    cancelEditOperating() {
      this.factoryEditingOperating = false;
      this.factoryOperatingEdits = {};
    },

    commitEditOperating() {
      const edits = this.factoryOperatingEdits;
      const updates = {
        shift_hours: parseFloat(edits.shift_hours),
        orders_per_day: parseInt(edits.orders_per_day, 10),
        avg_pieces_per_order: parseFloat(edits.avg_pieces_per_order),
      };
      if (this.factoryConfig) this.saveFactoryOperating(updates);
      else this.factoryEditingOperating = false;
    },
  };
}


// ── ./modules/command-shell.js ──
function createCommandShellModule() {
  let _cmdDebounceTimer = null;

  return {
    // Command palette
    cmdPaletteOpen: false,
    cmdSearch: '',
    cmdSelectedIndex: 0,
    // Command Palette 2.0 state
    cmdResults: [],
    cmdSearching: false,
    cmdCategory: 'all',
    cmdRecentCommands: (() => { try { return JSON.parse(localStorage.getItem('cmdRecent') || '[]'); } catch { return []; } })(),

    handleGlobalKeydown(event) {
      const key = String(event.key || '').toLowerCase();

      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault();
        this.openCmdPalette();
      }

      if (key === 'escape') {
        if (this.cmdPaletteOpen) this.closeCmdPalette();
        else if (this.showCreateCommitment) this.showCreateCommitment = false;
        else if (this.showCreateDecision) this.showCreateDecision = false;
        else if (this.showSnoozeFor) this.showSnoozeFor = null;
        else if (this.showReassignFor) this.showReassignFor = null;
        else if (this.detailPanel) this.closeDetailPanel();
      }

      const tag = event.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Table row keyboard navigation (j/k/ArrowUp/ArrowDown/Enter)
      if (!this.cmdPaletteOpen) {
        this.handleTableKeydown(event);
      }

      if (key === '/') {
        event.preventDefault();
        this.openCmdPalette();
        return;
      }

      if (event.shiftKey && ((event.metaKey && !event.ctrlKey) || (event.ctrlKey && !event.metaKey)) && !event.altKey) {
        event.preventDefault();
        switch (key) {
          case 'c': this.openNavigationTarget('chat'); break;
          case 'd': this.openNavigationTarget('dashboard'); break;
          case 't': this.openNavigationTarget('team'); break;
          case 'q': this.openNavigationTarget('actionQueue'); break;
          case 'p': this.openNavigationTarget('projects'); break;
          case 'f': this.openNavigationTarget('docs'); break;
          case 'l': this.openNavigationTarget('decisions'); break;
          case 'r': this.openNavigationTarget('registry'); break;
          case 'k': this.openNavigationTarget('knowledge'); break;
          case 'o': this.openNavigationTarget('notion'); break;
          case 'b': this.openNavigationTarget('bmc'); break;
          case 'i': this.openNavigationTarget('crm'); break;
          case 'm': this.openNavigationTarget('marketingOps'); break;
          case 'e': this.openNavigationTarget('techTeam'); break;
          case 'u': this.openNavigationTarget('factory'); break;
          case 'v': this.openNavigationTarget('ops'); break;
          case 'n': this.showCreateCommitment = true; break;
          case 'j': this.showCreateDecision = true; break;
          default: break;
        }
      }
    },

    async openNavigationTarget(action) {
      // Load HTML partial for views that have been extracted to separate files
      const partialViews = ['marketingOps', 'factory', 'ops', 'dashboard', 'bmc', 'techTeam'];
      if (partialViews.includes(action)) {
        await this._loadPartial(action);
      }
      // Ensure lazy module is initialized before setting the view so Alpine
      // can bind to the module's state and methods without errors.
      this._ensureModule(action);
      this.view = action;
      this.tableSelectedRow = -1;
      if (action === 'dashboard') {
        this.loadDashboard();
        this.startDashboardAutoRefresh?.();
      }
      else if (action === 'overview') this.loadOverview();
      else if (action === 'projects') this.loadProjects();
      else if (action === 'commitments') this.loadCommitments();
      else if (action === 'team') this.loadTeam();
      else if (action === 'docs') this.loadDocuments();
      else if (action === 'decisions') this.loadDecisions();
      else if (action === 'registry') this.loadRegistry();
      else if (action === 'knowledge') this.loadNotebooks();
      else if (action === 'notion') this.loadNotion();
      else if (action === 'bmc') this.loadBmc();
      else if (action === 'crm') this.loadCrm();
      else if (action === 'marketingOps') { this._ensureModule('competitor-intel'); this.loadMarketingOps(); }
      else if (action === 'techTeam') this.loadTechTeam();
      else if (action === 'actionQueue') this.loadActionQueue();
      else if (action === 'factory' && !this.factoryConfig) this.loadFactoryConfig();
      else if (action === 'ops') this.loadOps();
    },

    openCmdPalette() {
      this.cmdPaletteOpen = true;
      this.cmdSearch = '';
      this.cmdSelectedIndex = 0;
      this.cmdCategory = 'all';
      this.cmdResults = this.cmdRecentCommands.length > 0
        ? this._hydrateRecentCommands(this.cmdRecentCommands)
        : this.getDefaultCommands();
      this.$nextTick(() => {
        const input = document.getElementById('cmd-palette-input');
        if (input) input.focus();
      });
    },

    toggleCmdPalette() {
      if (this.cmdPaletteOpen) {
        this.closeCmdPalette();
        return;
      }
      this.openCmdPalette();
    },

    closeCmdPalette() {
      this.cmdPaletteOpen = false;
      this.cmdSearch = '';
      this.cmdSelectedIndex = 0;
      this.cmdSearching = false;
      this.cmdResults = [];
      if (_cmdDebounceTimer) {
        clearTimeout(_cmdDebounceTimer);
        _cmdDebounceTimer = null;
      }
    },

    // Restore action functions on recent commands (they were stripped before serialisation)
    _hydrateRecentCommands(recents) {
      return recents.map(r => {
        if (r.type === 'action') {
          const action = this.getActionCommands().find(a => a.label === r.label);
          return action ? { ...r, action: action.action } : r;
        }
        if (r.view) {
          return { ...r, action: () => this.openNavigationTarget(r.view) };
        }
        if (r.type && r.id) {
          return { ...r, action: () => this.openDrawer(r.type, r.id, r.label) };
        }
        return r;
      });
    },

    // Default commands shown when palette opens with no query
    getDefaultCommands() {
      return this.getViewCommands().slice(0, 8);
    },

    getViewCommands() {
      return [
        { label: 'Chat', icon: '▸', type: 'view', view: 'chat', keywords: ['colin', 'ai', 'assistant'], action: () => this.openNavigationTarget('chat') },
        { label: 'Dashboard', icon: '▸', type: 'view', view: 'dashboard', keywords: ['home', 'overview', 'summary'], action: () => this.openNavigationTarget('dashboard') },
        { label: 'Projects', icon: '▸', type: 'view', view: 'projects', keywords: ['project', 'initiative'], action: () => this.openNavigationTarget('projects') },
        { label: 'Commitments', icon: '▸', type: 'view', view: 'commitments', keywords: ['tasks', 'todos', 'actions'], action: () => this.openNavigationTarget('commitments') },
        { label: 'Team', icon: '▸', type: 'view', view: 'team', keywords: ['people', 'members', 'staff'], action: () => this.openNavigationTarget('team') },
        { label: 'Documents', icon: '▸', type: 'view', view: 'docs', keywords: ['docs', 'files', 'briefs'], action: () => this.openNavigationTarget('docs') },
        { label: 'Decision Log', icon: '▸', type: 'view', view: 'decisions', keywords: ['decisions', 'choices', 'log'], action: () => this.openNavigationTarget('decisions') },
        { label: 'Project Registry', icon: '▸', type: 'view', view: 'registry', keywords: ['registry', 'catalog'], action: () => this.openNavigationTarget('registry') },
        { label: 'Knowledge Base', icon: '▸', type: 'view', view: 'knowledge', keywords: ['notes', 'notebooks', 'knowledge'], action: () => this.openNavigationTarget('knowledge') },
        { label: 'Notion', icon: '▸', type: 'view', view: 'notion', keywords: ['notion', 'database'], action: () => this.openNavigationTarget('notion') },
        { label: 'Factory', icon: '▸', type: 'view', view: 'factory', keywords: ['production', 'ops', 'factory'], action: () => this.openNavigationTarget('factory') },
        { label: 'Business Model Canvas', icon: '▸', type: 'view', view: 'bmc', keywords: ['bmc', 'business model', 'canvas'], action: () => this.openNavigationTarget('bmc') },
        { label: 'CRM', icon: '▸', type: 'view', view: 'crm', keywords: ['customers', 'contacts', 'clients'], action: () => this.openNavigationTarget('crm') },
        { label: 'Marketing Ops', icon: '▸', type: 'view', view: 'marketingOps', keywords: ['marketing', 'campaigns', 'content'], action: () => this.openNavigationTarget('marketingOps') },
        { label: 'Tech Team', icon: '▸', type: 'view', view: 'techTeam', keywords: ['tech', 'engineering', 'dev', 'sprint'], action: () => this.openNavigationTarget('techTeam') },
        { label: 'Action Queue', icon: '▸', type: 'view', view: 'actionQueue', keywords: ['queue', 'actions', 'pending'], action: () => this.openNavigationTarget('actionQueue') },
      ];
    },

    getActionCommands() {
      return [
        {
          label: 'Refresh Dashboard',
          icon: '⚡',
          type: 'action',
          action: () => {
            this.forceRefresh();
            this.showSuccess('Dashboard refreshed');
          },
        },
        {
          label: 'Clear Cache',
          icon: '⚡',
          type: 'action',
          action: () => fetch('/api/notion/cache/clear', { method: 'POST' }).then(() => this.showSuccess('Cache cleared')),
        },
        {
          label: 'New Commitment',
          icon: '⚡',
          type: 'action',
          action: () => {
            this.view = 'commitments';
            this.$nextTick(() => { this.showCreateCommitment = true; });
          },
        },
        {
          label: 'New Decision',
          icon: '⚡',
          type: 'action',
          action: () => {
            this.view = 'decisions';
            this.$nextTick(() => { this.showCreateDecision = true; });
          },
        },
        {
          label: 'Toggle Sidebar',
          icon: '⚡',
          type: 'action',
          action: () => {
            this.sidebarExpanded = !this.sidebarExpanded;
            localStorage.setItem('sidebarExpanded', this.sidebarExpanded);
          },
        },
      ];
    },

    cmdEntityIcon(type) {
      const icons = {
        commitment: '◉',
        project: '◧',
        person: '◎',
        decision: '◆',
        view: '▸',
        action: '⚡',
      };
      return icons[type] || '•';
    },

    // Debounced async search — called on every input event
    handleCmdInput(query) {
      this.cmdSearch = query;
      this.cmdSelectedIndex = 0;

      if (_cmdDebounceTimer) clearTimeout(_cmdDebounceTimer);

      // Action mode — instant, no debounce
      if (query.startsWith('>')) {
        const q = query.slice(1).toLowerCase();
        this.cmdResults = this.getActionCommands().filter(cmd =>
          cmd.label.toLowerCase().includes(q)
        );
        return;
      }

      // Empty query — show recents or defaults
      if (!query) {
        this.cmdResults = this.cmdRecentCommands.length > 0
          ? this._hydrateRecentCommands(this.cmdRecentCommands)
          : this.getDefaultCommands();
        return;
      }

      // View results are instant
      const q = query.toLowerCase();
      const viewResults = this.getViewCommands().filter(cmd =>
        cmd.label.toLowerCase().includes(q) ||
        (cmd.keywords || []).some(k => k.includes(q))
      );
      this.cmdResults = viewResults;

      // Entity search debounced at 200ms
      if (query.length >= 2) {
        _cmdDebounceTimer = setTimeout(() => this._cmdSearchEntities(query, viewResults), 200);
      }
    },

    async _cmdSearchEntities(query, viewResults) {
      this.cmdSearching = true;
      try {
        const [overdue, commitments, projects, people, decisions] = await Promise.all([
          this._cmdFetchEntities('/api/notion/commitments/overdue', query, 'commitment'),
          this._cmdFetchEntities('/api/notion/commitments/upcoming?days=90', query, 'commitment'),
          this._cmdFetchEntities('/api/notion/projects', query, 'project'),
          this._cmdFetchEntities('/api/notion/people', query, 'person'),
          this._cmdFetchEntities('/api/notion/decisions?days=90', query, 'decision'),
        ]);

        // Only update results if the query hasn't changed during the fetch
        if (this.cmdSearch === query) {
          // Deduplicate overdue vs upcoming (overdue items may appear in both)
          const overdueIds = new Set(overdue.map(o => o.id));
          const uniqueCommitments = commitments.filter(c => !overdueIds.has(c.id));
          this.cmdResults = [
            ...viewResults,
            ...overdue,
            ...uniqueCommitments,
            ...projects,
            ...people,
            ...decisions,
          ].slice(0, 15);
        }
      } catch {
        // Silent fail — keep view results
      } finally {
        this.cmdSearching = false;
      }
    },

    async _cmdFetchEntities(url, query, type) {
      try {
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : (data.items || data.commitments || data.projects || data.people || data.decisions || []);

        const q = query.toLowerCase();
        return items
          .filter(item => {
            const name = item.name || item.title || '';
            return name.toLowerCase().includes(q);
          })
          .slice(0, 5)
          .map(item => ({
            id: item.id,
            label: item.name || item.title || 'Untitled',
            type,
            status: item.status || item.stage || '',
            icon: this.cmdEntityIcon(type),
            action: () => this.openDrawer(type, item.id, item.name || item.title),
          }));
      } catch {
        return [];
      }
    },

    // Execute a result item — handles both new action-based items and legacy ref-based items
    cmdExecuteResult(result) {
      if (!result) return;

      // Track in recents (strip non-serialisable action function)
      const { action: _fn, ...serialisable } = result;
      this.cmdRecentCommands = [
        serialisable,
        ...this.cmdRecentCommands.filter(r => r.label !== result.label),
      ].slice(0, 10);
      localStorage.setItem('cmdRecent', JSON.stringify(this.cmdRecentCommands));

      // Execute
      if (result.action) {
        result.action();
      } else if (result.view) {
        this.openNavigationTarget(result.view);
      }

      this.closeCmdPalette();
    },

    // Legacy execute by index (keeps backward compat with getCmdResults)
    cmdExecute(index) {
      const results = this.getCmdResults();
      const item = results[typeof index === 'number' ? index : this.cmdSelectedIndex];
      if (!item) {
        // If palette 2.0 is active, fall through to cmdResults
        const r2 = this.cmdResults[this.cmdSelectedIndex];
        if (r2) this.cmdExecuteResult(r2);
        return;
      }

      if (item.action && typeof item.action === 'function') {
        this.cmdExecuteResult(item);
        return;
      }

      if (item.action) {
        this.openNavigationTarget(item.action);
      } else if (item.dbRef) {
        this._ensureModule('notion');
        this.view = 'notion';
        this.openNotionDb(item.dbRef);
      } else if (item.pageRef) {
        this._ensureModule('notion');
        this.view = 'notion';
        this.openNotionPage(item.pageRef.id, item.pageRef.name);
      } else if (item.skillRef) {
        this.view = 'chat';
        this.triggerSkill(item.skillRef);
      } else if (item.personRef) {
        this.openPersonView(item.personRef);
      } else if (item.focusAreaRef) {
        this.openFocusAreaView(item.focusAreaRef);
      } else if (item.commitmentRef) {
        this.openDetailPanel(item.commitmentRef.id, item.commitmentRef.Name || item.commitmentRef.name);
      }

      this.closeCmdPalette();
    },

    // Keyboard navigation for palette 2.0
    cmdKeydown(event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.cmdSelectedIndex = Math.min(this.cmdSelectedIndex + 1, this.cmdResults.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.cmdSelectedIndex = Math.max(this.cmdSelectedIndex - 1, 0);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const r = this.cmdResults[this.cmdSelectedIndex];
        if (r) this.cmdExecuteResult(r);
      } else if (event.key === 'Escape') {
        this.closeCmdPalette();
      }
    },

    // Legacy directional navigation (kept for backward compat)
    cmdNavigate(direction) {
      if (this.cmdResults.length > 0) {
        this.cmdSelectedIndex = Math.min(
          Math.max(this.cmdSelectedIndex + direction, 0),
          this.cmdResults.length - 1
        );
        return;
      }
      const results = this.getCmdResults();
      if (results.length === 0) return;
      this.cmdSelectedIndex = (this.cmdSelectedIndex + direction + results.length) % results.length;
    },

    getShortcutMap() {
      return {
        palette: ['Cmd/Ctrl+K', '/'],
        chat: ['Cmd/Ctrl+Shift+C'],
        dashboard: ['Cmd/Ctrl+Shift+D'],
        team: ['Cmd/Ctrl+Shift+T'],
        queue: ['Cmd/Ctrl+Shift+Q'],
        projects: ['Cmd/Ctrl+Shift+P'],
        docs: ['Cmd/Ctrl+Shift+F'],
        decisions: ['Cmd/Ctrl+Shift+L'],
        registry: ['Cmd/Ctrl+Shift+R'],
        knowledge: ['Cmd/Ctrl+Shift+K'],
        notion: ['Cmd/Ctrl+Shift+O'],
        bmc: ['Cmd/Ctrl+Shift+B'],
        crm: ['Cmd/Ctrl+Shift+I'],
        marketingOps: ['Cmd/Ctrl+Shift+M'],
        techTeam: ['Cmd/Ctrl+Shift+E'],
        factory: ['Cmd/Ctrl+Shift+U'],
        newCommitment: ['Cmd/Ctrl+Shift+N'],
        newDecision: ['Cmd/Ctrl+Shift+J'],
      };
    },

    getShortcutLabel(shortcutKey) {
      const map = this.getShortcutMap();
      return (map[shortcutKey] || []).join(' / ');
    },

    getShortcutTooltip(label, shortcutKey) {
      const shortcut = this.getShortcutLabel(shortcutKey);
      return shortcut ? `${label} (${shortcut})` : label;
    },

    // Legacy synchronous results getter — kept for backward compatibility
    getCmdResults() {
      const q = this.cmdSearch.toLowerCase().trim();
      const tabs = [
        { group: 'Navigation', label: 'Chat', action: 'chat' },
        { group: 'Navigation', label: 'Dashboard', action: 'dashboard' },
        { group: 'Navigation', label: 'Projects', action: 'projects' },
        { group: 'Navigation', label: 'Commitments', action: 'commitments' },
        { group: 'Navigation', label: 'Team', action: 'team' },
        { group: 'Navigation', label: 'Documents', action: 'docs' },
        { group: 'Navigation', label: 'Decision Log', action: 'decisions' },
        { group: 'Navigation', label: 'Project Registry', action: 'registry' },
        { group: 'Navigation', label: 'Knowledge Base', action: 'knowledge' },
        { group: 'Navigation', label: 'Notion', action: 'notion' },
        { group: 'Navigation', label: 'Factory', action: 'factory' },
        { group: 'Navigation', label: 'Business Model Canvas', action: 'bmc' },
        { group: 'Navigation', label: 'CRM', action: 'crm' },
        { group: 'Navigation', label: 'Marketing Ops', action: 'marketingOps' },
        { group: 'Navigation', label: 'Tech Team', action: 'techTeam' },
      ];

      const databases = (this.notionDatabases.length > 0 ? this.notionDatabases : [
        { id: '274fc2b3b6f7430fbb27474320eb0f96', name: 'Focus Areas' },
        { id: '85c1b29205634f43b50dc16fc7466faa', name: 'Projects' },
        { id: '0b50073e544942aab1099fc559b390fb', name: 'Commitments' },
        { id: 'de346469925e4d1a825a849bc9f5269f', name: 'People' },
        { id: '3c8a9b22ba924f20bfdcab4cc7a46478', name: 'Decisions' },
        { id: '1fcf264fd2cd4308bcfd28997d171360', name: 'Platforms' },
        { id: '63ec25cae3b0432093fa639d4c8b5809', name: 'Audiences' },
      ]).map(db => ({ group: 'Databases', label: db.name, dbRef: db }));

      const keyPages = (this.notionKeyPages.length > 0 ? this.notionKeyPages : [
        { id: '307247aa0d7b8039bf78d35962815014', name: 'Business Bible' },
        { id: '307247aa0d7b8102bfa0f8a18d8809d9', name: 'Notion OS Root' },
        { id: '308247aa0d7b81cea80dca287155b137', name: 'Team Operating Manual' },
        { id: '315247aa0d7b81c59fddf518c01e8556', name: 'Marketing Context Pack' },
      ]).map(page => ({ group: 'Key Pages', label: page.name, pageRef: page }));

      const skillItems = this.skills.map(skill => ({
        group: 'Skills',
        label: `/${skill.name} - ${skill.description || ''}`,
        skillRef: skill,
      }));

      const all = [...tabs, ...databases, ...keyPages, ...skillItems];

      if (this.teamData.length > 0) {
        this.teamData.forEach(person => {
          all.push({ group: 'People', label: person.Name || person.name || 'Unknown', personRef: person });
        });
      }

      if (this.dashboard && this.dashboard.focusAreas) {
        this.dashboard.focusAreas.forEach(area => {
          all.push({ group: 'Focus Areas', label: area.Name || area.name || 'Unknown', focusAreaRef: area });
        });
      }

      if (this.dashboard && this.dashboard.overdue) {
        this.dashboard.overdue.forEach(commitment => {
          const name = commitment.Name || commitment.name || 'Untitled';
          all.push({ group: 'Overdue', label: name, commitmentRef: commitment });
        });
      }

      if (!q) return all;
      return all.filter(item => item.label.toLowerCase().includes(q));
    },
  };
}


// ── ./modules/chat.js ──
function createChatModule() {
  return {
    // Chat state
    messages: [],
    inputText: '',
    streaming: false,
    streamingText: '',
    pendingApprovals: [],
    activeTools: [],
    reconnecting: false,

    // Approval countdown timers: { [approvalId]: intervalId }
    _approvalTimers: {},

    async sendMessage() {
      const text = this.inputText.trim();
      if (!text || this.streaming) return;

      this.inputText = '';
      this.messages.push({ role: 'user', content: text });
      this.scrollToBottom();

      await this.streamResponse(text, null);
    },

    async triggerSkill(skill) {
      if (this.streaming) return;

      const message = skill.defaultMessage || `Run /${skill.name}`;
      this.messages.push({ role: 'user', content: `/${skill.name} — ${message}` });
      this.scrollToBottom();

      await this.streamResponse(message, skill.name);
    },

    routeToExpert(expert) {
      if (this.streaming) return;

      const message = `Route this to ${expert.name} (${expert.domain})`;
      this.inputText = message;
      this.$refs.chatInput?.focus();
    },

    async _fetchStream(message, skill) {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, skill }),
      });

      // Don't retry on HTTP errors (4xx/5xx)
      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        const httpErr = new Error(`HTTP ${response.status}: ${errText}`);
        httpErr.isHttpError = true;
        throw httpErr;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEventType = line.slice(7).trim();
            continue;
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              switch (currentEventType) {
                case 'text':
                  this.streamingText += data.text;
                  this.scrollToBottom();
                  break;
                case 'approval':
                  this._addApprovalWithTimer(data);
                  this.scrollToBottom();
                  break;
                case 'tool_use':
                  this.activeTools = [...this.activeTools, data].slice(-3);
                  break;
                case 'error':
                  this.streamingText += `\n\n**Error:** ${data.error}`;
                  break;
                case 'done':
                  break;
              }
            } catch {}
            currentEventType = 'message';
          }
        }
      }
    },

    async streamResponse(message, skill) {
      this.streaming = true;
      this.streamingText = '';
      this.activeTools = [];
      this.reconnecting = false;

      const MAX_RETRIES = 3;
      let attempt = 0;

      while (attempt <= MAX_RETRIES) {
        try {
          // Reset partial text before each attempt to prevent garbled output on retry
          this.streamingText = '';
          this.activeTools = [];
          await this._fetchStream(message, skill);

          // Success — exit retry loop
          break;
        } catch (err) {
          // Don't retry HTTP errors (4xx/5xx)
          if (err.isHttpError || attempt >= MAX_RETRIES) {
            console.error('Chat error:', err);
            this.reconnecting = false;
            this.messages.push({
              role: 'assistant',
              content: `**Connection error:** ${err.message}. Check that the server is running.`,
            });
            break;
          }

          attempt++;
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          this.reconnecting = true;
          console.warn(`Chat network error, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (this.streamingText) {
        this.messages.push({ role: 'assistant', content: this.streamingText });
      }

      this.streaming = false;
      this.streamingText = '';
      this.activeTools = [];
      this.reconnecting = false;
      this._clearAllApprovalTimers();
      this.pendingApprovals = [];
      this.scrollToBottom();
    },

    // Approval countdown helpers
    _addApprovalWithTimer(data) {
      const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
      const expiresAt = createdAt + TIMEOUT_MS;

      const approval = { ...data, timeRemaining: TIMEOUT_MS / 1000, expired: false };
      this.pendingApprovals.push(approval);

      // Move focus to the Approve button so keyboard users don't tab behind the prompt
      this.$nextTick(() => {
        document.querySelector('.approval-actions button')?.focus();
      });

      const intervalId = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((expiresAt - now) / 1000));
        const idx = this.pendingApprovals.findIndex(a => a.approvalId === data.approvalId);
        if (idx === -1) {
          clearInterval(intervalId);
          return;
        }
        this.pendingApprovals[idx].timeRemaining = remaining;
        if (remaining <= 0) {
          this.pendingApprovals[idx].expired = true;
          clearInterval(intervalId);
          delete this._approvalTimers[data.approvalId];
        }
      }, 1000);

      this._approvalTimers[data.approvalId] = intervalId;
    },

    _clearAllApprovalTimers() {
      for (const id of Object.values(this._approvalTimers)) {
        clearInterval(id);
      }
      this._approvalTimers = {};
    },

    approvalTimerLabel(approval) {
      if (approval.expired) return 'Expired';
      const t = approval.timeRemaining ?? 300;
      const m = Math.floor(t / 60);
      const s = String(t % 60).padStart(2, '0');
      return `${m}:${s}`;
    },

    approvalTimerClass(approval) {
      if (approval.expired) return 'approval-timer--expired';
      const t = approval.timeRemaining ?? 300;
      if (t <= 15) return 'approval-timer--danger';
      if (t <= 60) return 'approval-timer--warn';
      return 'approval-timer--ok';
    },

    async resolveApproval(approvalId, approved) {
      const approval = this.pendingApprovals.find(item => item.approvalId === approvalId);
      if (approval) approval.resolving = true;
      try {
        const res = await fetch('/api/chat/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId, approved }),
        });
        if (!res.ok) throw new Error('Server rejected approval');
        // Clear timer and remove approval
        if (this._approvalTimers[approvalId]) {
          clearInterval(this._approvalTimers[approvalId]);
          delete this._approvalTimers[approvalId];
        }
        this.pendingApprovals = this.pendingApprovals.filter(item => item.approvalId !== approvalId);
        // Return focus to chat input once approval is resolved
        this.$nextTick(() => {
          this.$refs.chatInput?.focus();
        });
      } catch (err) {
        console.error('Approval error:', err);
        if (approval) {
          approval.resolving = false;
          approval.error = 'Failed - try again';
        }
      }
    },

    async clearChat() {
      try {
        await fetch('/api/chat/clear', { method: 'POST' });
        this.messages = [];
        this._clearAllApprovalTimers();
        this.pendingApprovals = [];
        this.streamingText = '';
      } catch (err) {
        console.error('Clear error:', err);
      }
    },
  };
}


// ── ./modules/overview.js ──
function createOverviewModule() {
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


// ── ./modules/toasts.js ──
// Toast notification system
function createToastsModule() {
  return {
    // State
    toasts: [],
    _toastId: 0,

    // Methods
    addToast(message, type = 'info', duration = 4000) {
      const id = ++this._toastId;
      this.toasts.push({ id, message, type, exiting: false });
      if (duration > 0) {
        setTimeout(() => this.removeToast(id), duration);
      }
      return id;
    },

    removeToast(id) {
      const toast = this.toasts.find(t => t.id === id);
      if (toast) {
        toast.exiting = true;
        setTimeout(() => {
          this.toasts = this.toasts.filter(t => t.id !== id);
        }, 300); // match CSS animation duration
      }
    },

    showSuccess(message) { return this.addToast(message, 'success'); },
    showError(message) { return this.addToast(message, 'error', 6000); },
    showInfo(message) { return this.addToast(message, 'info'); },
  };
}


// ── ./modules/detail-drawer.js ──
// Universal detail drawer
function createDetailDrawerModule() {
  return {
    // State
    drawerOpen: false,
    drawerTitle: '',
    drawerType: null,    // 'commitment', 'project', 'person', 'decision', etc.
    drawerData: null,    // The entity data
    drawerLoading: false,
    drawerRelated: [],   // Related items loaded async

    // Methods
    async openDrawer(type, id, title) {
      this.drawerOpen = true;
      this.drawerTitle = title || 'Details';
      this.drawerType = type;
      this.drawerData = null;
      this.drawerLoading = true;
      this.drawerRelated = [];

      try {
        const res = await fetch(`/api/notion/pages/${id}`);
        if (!res.ok) throw new Error('Failed to load');
        this.drawerData = await res.json();

        // Load related items
        try {
          const relRes = await fetch(`/api/notion/pages/${id}/related`);
          if (relRes.ok) {
            const relData = await relRes.json();
            this.drawerRelated = relData.related || [];
          }
        } catch { /* related items are optional */ }
      } catch {
        this.showError('Failed to load details');
        this.drawerOpen = false;
      } finally {
        this.drawerLoading = false;
      }
    },

    closeDrawer() {
      this.drawerOpen = false;
      // Clear data after animation completes
      setTimeout(() => {
        this.drawerType = null;
        this.drawerData = null;
        this.drawerRelated = [];
      }, 300);
    },

    // Helper to get a property value from Notion page data
    getDrawerProp(name) {
      if (!this.drawerData?.properties) return null;
      const prop = this.drawerData.properties[name];
      if (!prop) return null;

      switch (prop.type) {
        case 'title': return prop.title?.map(t => t.plain_text).join('') || '';
        case 'rich_text': return prop.rich_text?.map(t => t.plain_text).join('') || '';
        case 'select': return prop.select?.name || '';
        case 'multi_select': {
          const names = prop.multi_select?.map(s => s.name) || [];
          return names.length > 0 ? names.join(', ') : '';
        }
        case 'date': return prop.date?.start || '';
        case 'number': return prop.number;
        case 'checkbox': return prop.checkbox;
        case 'status': return prop.status?.name || '';
        case 'url': return prop.url || '';
        case 'email': return prop.email || '';
        case 'phone_number': return prop.phone_number || '';
        case 'created_time': return prop.created_time || '';
        case 'last_edited_time': return prop.last_edited_time || '';
        case 'people': return prop.people?.map(p => p.name || p.id).join(', ') || '';
        case 'formula': {
          const f = prop.formula;
          if (!f) return '';
          return f.string || f.number?.toString() || f.boolean?.toString() || f.date?.start || '';
        }
        case 'relation': {
          const ids = prop.relation?.map(r => r.id) || [];
          return ids.length > 0 ? `${ids.length} linked` : '';
        }
        default: return null;
      }
    },

    // Format a Notion date for display
    formatDrawerDate(dateStr) {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },
  };
}


// ── ./modules/inline-actions.js ──
// Inline action helpers (status changes, context menus)
function createInlineActionsModule() {
  return {
    // Context menu state
    contextMenu: { open: false, x: 0, y: 0, items: [], target: null },

    openContextMenu(event, items, target) {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      this.contextMenu = {
        open: true,
        x: rect.left,
        y: rect.bottom + 4,
        items,
        target,
      };
    },

    closeContextMenu() {
      this.contextMenu.open = false;
    },

    async executeContextAction(action) {
      this.closeContextMenu();
      if (typeof action.handler === 'function') {
        await action.handler();
      }
    },

    // Inline status change (sends PATCH via approval gate)
    async changeStatus(endpoint, id, property, value) {
      try {
        const res = await fetch(endpoint.replace(':id', id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property, value }),
        });
        if (!res.ok) throw new Error('Update failed');
        const data = await res.json();
        if (data.pendingApproval) {
          this.showInfo('Awaiting approval...');
        } else {
          this.showSuccess(`Updated ${property} to ${value}`);
        }
        return data;
      } catch (err) {
        this.showError(`Failed to update: ${err.message}`);
        return null;
      }
    },

    // Commitment status options for context menus
    getCommitmentActions(item) {
      return [
        { label: 'Mark Done', icon: '✓', handler: () => this.changeStatus('/api/commitments/:id', item.id, 'Status', 'Done') },
        { label: 'Mark Blocked', icon: '⚠', handler: () => this.changeStatus('/api/commitments/:id', item.id, 'Status', 'Blocked') },
        { label: 'View Details', icon: '→', handler: () => this.openDrawer('commitment', item.id, item.name) },
        { divider: true },
        { label: 'Escalate', icon: '!', handler: () => this.changeStatus('/api/commitments/:id', item.id, 'Status', 'Needs Dan'), danger: true },
      ];
    },

    // Sprint item actions
    getSprintActions(item) {
      return [
        { label: 'Start Work', icon: '▶', handler: () => this.changeStatus('/api/tech-team/sprint/:id', item.id, 'Status', 'In Progress') },
        { label: 'Mark Done', icon: '✓', handler: () => this.changeStatus('/api/tech-team/sprint/:id', item.id, 'Status', 'Done') },
        { label: 'View Details', icon: '→', handler: () => this.openDrawer('sprint', item.id, item.name) },
      ];
    },

    // Campaign actions
    getCampaignActions(item) {
      return [
        { label: 'Move to Review', icon: '→', handler: () => this.changeStatus('/api/marketing-ops/campaigns/:id', item.id, 'Stage', 'Review') },
        { label: 'Flag At Risk', icon: '⚠', handler: () => this.changeStatus('/api/marketing-ops/campaigns/:id', item.id, 'Status', 'At Risk'), danger: true },
        { label: 'View Details', icon: '→', handler: () => this.openDrawer('campaign', item.id, item.name) },
      ];
    },
  };
}


// ── ./modules/ops.js ──
function createOpsModule() {
  return {
    // ── State ──────────────────────────────────────────────────────────
    opsSection: 'overview',

    ops: null,
    opsLoading: false,
    opsLastRefresh: null,
    opsSavedView: 'alerts',

    opsStock: [],
    opsStockTotal: 0,
    opsStockLoading: false,
    opsStockFilters: { status: '', vendor: '', search: '' },

    opsSales: null,
    opsSalesLoading: false,

    opsProducts: [],
    opsProductsTotal: 0,
    opsProductsLoading: false,
    opsProductsFilters: { tier: '', vendor: '', search: '' },

    opsPOs: [],
    opsPOsTotal: 0,
    opsPOsLoading: false,

    // ── Load: Overview ─────────────────────────────────────────────────
    async loadOps() {
      const signal = this.beginRequest('ops');
      this.opsLoading = true;
      try {
        const res = await fetch('/api/ops', { signal });
        if (res.ok) {
          this.ops = await res.json();
          this.opsLastRefresh = new Date();
          this.runNotificationChecks?.('ops');
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops load error:', err);
      } finally {
        this.endRequest('ops', signal);
        this.opsLoading = false;
      }
    },

    // ── Section switching ──────────────────────────────────────────────
    async opsSwitchSection(section) {
      this.opsSection = section;
      if (section === 'overview') {
        if (!this.ops) await this.loadOps();
      } else if (section === 'stock') {
        await this.loadOpsStock();
      } else if (section === 'sales') {
        if (!this.opsSales) await this.loadOpsSales();
      } else if (section === 'products') {
        if (!this.opsProducts.length) await this.loadOpsProducts();
      } else if (section === 'purchase-orders') {
        if (!this.opsPOs.length) await this.loadOpsPOs();
      }
    },

    // ── Load: Stock ────────────────────────────────────────────────────
    async loadOpsStock() {
      const signal = this.beginRequest('opsStock');
      this.opsStockLoading = true;
      const { status, vendor, search } = this.opsStockFilters;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (vendor) params.set('vendor', vendor);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/ops/stock?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.opsStock = data.rows || [];
          this.opsStockTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops stock error:', err);
      } finally {
        this.endRequest('opsStock', signal);
        this.opsStockLoading = false;
      }
    },

    // ── Load: Sales ────────────────────────────────────────────────────
    async loadOpsSales() {
      const signal = this.beginRequest('opsSales');
      this.opsSalesLoading = true;
      try {
        const res = await fetch('/api/ops/sales', { signal });
        if (res.ok) this.opsSales = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops sales error:', err);
      } finally {
        this.endRequest('opsSales', signal);
        this.opsSalesLoading = false;
      }
    },

    // ── Load: Products ─────────────────────────────────────────────────
    async loadOpsProducts() {
      const signal = this.beginRequest('opsProducts');
      this.opsProductsLoading = true;
      const { tier, vendor, search } = this.opsProductsFilters;
      const params = new URLSearchParams();
      if (tier) params.set('tier', tier);
      if (vendor) params.set('vendor', vendor);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/ops/products?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.opsProducts = data.rows || [];
          this.opsProductsTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops products error:', err);
      } finally {
        this.endRequest('opsProducts', signal);
        this.opsProductsLoading = false;
      }
    },

    // ── Load: Purchase Orders ──────────────────────────────────────────
    async loadOpsPOs() {
      const signal = this.beginRequest('opsPOs');
      this.opsPOsLoading = true;
      try {
        const res = await fetch('/api/ops/purchase-orders', { signal });
        if (res.ok) {
          const data = await res.json();
          this.opsPOs = data.rows || [];
          this.opsPOsTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops POs error:', err);
      } finally {
        this.endRequest('opsPOs', signal);
        this.opsPOsLoading = false;
      }
    },

    // ── Filter helpers ─────────────────────────────────────────────────
    opsApplyStockFilter(key, value) {
      this.opsStockFilters[key] = value;
      this.loadOpsStock();
    },

    opsApplyProductsFilter(key, value) {
      this.opsProductsFilters[key] = value;
      this.loadOpsProducts();
    },

    async opsFocusVendor(vendor) {
      if (!vendor) return;
      this.opsProductsFilters = { ...this.opsProductsFilters, vendor, tier: '', search: '' };
      this.opsSection = 'products';
      await this.loadOpsProducts();
    },

    async opsFocusProduct(productName) {
      if (!productName) return;
      this.opsStockFilters = { ...this.opsStockFilters, search: productName, vendor: '' };
      this.opsSection = 'stock';
      await this.loadOpsStock();
    },

    async opsFocusPoProduct(productName) {
      if (!productName) return;
      this.opsSection = 'purchase-orders';
      if (!this.opsPOs.length) await this.loadOpsPOs();
      this.showInfo(`Use browser find for "${productName}" in purchase orders`);
    },

    // ── Display helpers ────────────────────────────────────────────────
    getStockStatusColor(status) {
      if (!status) return '';
      const s = status.toString().toUpperCase().replace(/[^A-Z_]/g, '');
      if (s.includes('OUT')) return 'ops-status-out';
      if (s.includes('LOW')) return 'ops-status-low';
      if (s.includes('REORDER')) return 'ops-status-reorder';
      if (s.includes('OK') || s.includes('HEALTHY')) return 'ops-status-ok';
      if (s.includes('EXCESS')) return 'ops-status-excess';
      return 'ops-status-muted';
    },

    stripEmoji(str) {
      if (!str) return '';
      return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u{1F000}-\u{1FFFF}]/gu, '').trim();
    },

    formatCurrency(num) {
      if (!num && num !== 0) return '—';
      if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + 'Cr';
      if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
      if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
      return '₹' + num.toLocaleString('en-IN');
    },

    formatNumber(num) {
      if (!num && num !== 0) return '—';
      if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    },

    // Compute stacked bar width % for each segment
    opsStockBarSegments() {
      if (!this.ops?.stockHealth?.byStatus) return [];
      const byStatus = this.ops.stockHealth.byStatus;
      const total = byStatus.reduce((s, x) => s + (x.count || 0), 0);
      if (!total) return [];
      const colorMap = {
        OK: 'var(--green)',
        LOW: 'var(--amber)',
        REORDER: 'var(--yellow, var(--amber))',
        OUT: 'var(--red)',
        EXCESS: 'var(--accent)',
        DEAD: 'var(--text-muted)',
        NO_SALES: 'var(--border)',
      };
      return byStatus.map(x => ({
        name: x.name,
        count: x.count,
        pct: ((x.count / total) * 100).toFixed(1),
        color: colorMap[x.name] || 'var(--border)',
      }));
    },

    opsTierColor(tier) {
      const map = { A: 'success', B: 'accent', C: 'warning', D: 'danger' };
      return map[tier] || '';
    },

    getOpsRefreshLabel() {
      if (!this.opsLastRefresh) return 'Never refreshed';
      const diff = Math.round((Date.now() - this.opsLastRefresh.getTime()) / 1000);
      if (diff < 60) return `Refreshed ${diff}s ago`;
      if (diff < 3600) return `Refreshed ${Math.round(diff / 60)}m ago`;
      return `Refreshed ${Math.round(diff / 3600)}h ago`;
    },

    getOpsAreaStatus() {
      const out = this.ops?.stockHealth?.outOfStock || 0;
      const reorder = this.ops?.stockHealth?.reorderNeeded || 0;
      const low = this.ops?.stockHealth?.lowStock || 0;
      if (out > 0) return { tone: 'critical', label: 'Needs Intervention' };
      if (reorder > 0 || low > 0) return { tone: 'warning', label: 'Needs Attention' };
      if (!this.ops) return { tone: 'neutral', label: 'Loading' };
      return { tone: 'healthy', label: 'Healthy' };
    },

    getOpsHeroMetrics() {
      return [
        {
          id: 'variants',
          label: 'Total Variants',
          value: this.ops?.stockHealth?.totalVariants ? this.formatNumber(this.ops.stockHealth.totalVariants) : '—',
          note: `${this.ops?.products?.total || 0} product types`,
        },
        {
          id: 'healthy',
          label: 'Healthy Stock',
          value: this.ops?.stockHealth?.healthy ?? '—',
          note: `${this.ops?.stockHealth?.lowStock ?? 0} low`,
        },
        {
          id: 'out',
          label: 'Out Of Stock',
          value: this.ops?.stockHealth?.outOfStock ?? '—',
          note: `${this.ops?.stockHealth?.reorderNeeded ?? 0} reorder`,
        },
        {
          id: 'pos',
          label: 'Pending POs',
          value: this.ops?.pendingPOs?.count ?? '—',
          note: `${this.ops?.alerts?.length || 0} stock alerts`,
        },
      ];
    },

    getOpsMetricAction(metricId) {
      const actions = {
        variants: () => this.applyOpsSavedView('products'),
        healthy: () => this.applyOpsSavedView('stock-ok'),
        out: () => this.applyOpsSavedView('alerts'),
        pos: () => this.applyOpsSavedView('pos'),
      };
      return actions[metricId] || (() => {});
    },

    getOpsPriorityCards() {
      const topAlerts = (this.ops?.alerts || []).slice(0, 3);
      const topTiers = (this.ops?.products?.byTier || []).slice(0, 3);
      const topVendors = (this.ops?.vendors || []).slice(0, 3);
      return [
        {
          id: 'stock-risk',
          title: 'Stock Risk',
          tone: (this.ops?.stockHealth?.outOfStock || 0) > 0 ? 'critical' : ((this.ops?.stockHealth?.reorderNeeded || 0) > 0 ? 'warning' : 'healthy'),
          value: this.ops?.alerts?.length || 0,
          label: 'variants currently flagged for action',
          items: topAlerts.map(item => ({
            name: item.product || 'Unnamed item',
            meta: item.daysUntilStockout != null ? `${item.daysUntilStockout}d left` : this.stripEmoji(item.stockStatus || ''),
          })),
        },
        {
          id: 'purchase-pressure',
          title: 'Purchase Pressure',
          tone: (this.ops?.pendingPOs?.count || 0) > 0 ? 'warning' : 'healthy',
          value: this.ops?.pendingPOs?.count || 0,
          label: 'purchase orders still waiting to land',
          items: (this.ops?.pendingPOs?.items || []).slice(0, 3).map(item => ({
            name: item.Product || 'PO item',
            meta: `${item.Reorder_Qty ?? '—'} units`,
          })),
        },
        {
          id: 'portfolio-shape',
          title: 'Portfolio Shape',
          tone: 'neutral',
          value: this.ops?.products?.total || 0,
          label: 'product types and vendor spread',
          items: topTiers.length
            ? topTiers.map(item => ({ name: `Tier ${item.name}`, meta: String(item.count) }))
            : topVendors.map(item => ({ name: item.Vendor || 'Vendor', meta: `${item['Lead time'] || '—'}d lead time` })),
        },
      ];
    },

    getOpsFocusList() {
      const items = [];
      const firstAlert = this.ops?.alerts?.[0];
      if (firstAlert) {
        items.push({
          title: `${firstAlert.product || 'Item'} needs attention`,
          detail: firstAlert.daysUntilStockout != null
            ? `${firstAlert.daysUntilStockout} days until stockout`
            : this.stripEmoji(firstAlert.stockStatus || 'Stock alert'),
          target: 'stock',
        });
      }
      const firstPo = this.ops?.pendingPOs?.items?.[0];
      if (firstPo) {
        items.push({
          title: `Pending PO for ${firstPo.Product || 'inventory item'}`,
          detail: `${firstPo.Reorder_Qty ?? '—'} units in reorder queue`,
          target: 'purchase-orders',
        });
      }
      if (!items.length) {
        items.push({
          title: 'Stock looks stable',
          detail: 'No urgent stock or PO issues detected',
          target: 'overview',
        });
      }
      return items;
    },

    getOpsSavedViews() {
      return [
        { id: 'alerts', label: 'Stock Alerts' },
        { id: 'pos', label: 'Pending POs' },
        { id: 'products', label: 'Vendor Exposure' },
        { id: 'stock-ok', label: 'Healthy Stock' },
      ];
    },

    async applyOpsSavedView(viewId) {
      this.opsSavedView = viewId;
      if (viewId === 'pos') {
        this.opsSection = 'purchase-orders';
        await this.loadOpsPOs();
        return;
      }
      if (viewId === 'products') {
        this.opsSection = 'products';
        await this.loadOpsProducts();
        return;
      }
      this.opsSection = 'stock';
      if (viewId === 'stock-ok') {
        this.opsStockFilters = { ...this.opsStockFilters, status: 'OK', vendor: '', search: '' };
      } else {
        this.opsStockFilters = { ...this.opsStockFilters, status: '', vendor: '', search: '' };
      }
      await this.loadOpsStock();
    },

    getOpsSavedViewItems() {
      if (this.opsSavedView === 'pos') {
        return (this.ops?.pendingPOs?.items || []).slice(0, 5).map((item) => ({
          title: item.Product || 'PO item',
          detail: `${item.Reorder_Qty ?? '—'} units`,
          action: () => this.opsSwitchSection('purchase-orders'),
        }));
      }
      if (this.opsSavedView === 'products') {
        const vendors = (this.ops?.vendors || []).slice(0, 5);
        return vendors.map((item) => ({
          title: item.Vendor || 'Vendor',
          detail: `${item['Lead time'] || '—'}d lead time`,
          action: () => {
            this.opsProductsFilters = { ...this.opsProductsFilters, vendor: item.Vendor || '', tier: '', search: '' };
            this.opsSwitchSection('products');
          },
        }));
      }
      if (this.opsSavedView === 'stock-ok') {
        return (this.opsStock || []).slice(0, 5).map((item) => ({
          title: item.Product_Name || item.product || 'Healthy variant',
          detail: `${item.Status || item.stockStatus || 'OK'} · ${item.Total_Stock ?? item.totalStock ?? '—'} stock`,
          action: () => this.opsSwitchSection('stock'),
        }));
      }
      return (this.ops?.alerts || []).slice(0, 5).map((item) => ({
        title: item.product || 'Inventory alert',
        detail: item.daysUntilStockout != null ? `${item.daysUntilStockout}d left` : this.stripEmoji(item.stockStatus || 'Stock alert'),
        action: () => this.opsSwitchSection('stock'),
      }));
    },

    getOpsSavedViewEmptyState() {
      const labels = {
        alerts: 'No stock alerts right now.',
        pos: 'No pending purchase orders right now.',
        products: 'No vendor exposure data right now.',
        'stock-ok': 'No healthy stock rows loaded yet.',
      };
      return labels[this.opsSavedView] || 'No items available.';
    },

    getOpsAlertRowActions(row) {
      return [
        {
          label: 'Stock',
          handler: () => this.opsFocusProduct(row.product),
        },
        {
          label: 'POs',
          handler: () => this.opsFocusPoProduct(row.product),
        },
      ];
    },

    getOpsVendorRowActions(vendor) {
      return [
        {
          label: 'Products',
          handler: () => this.opsFocusVendor(vendor?.Vendor),
        },
      ];
    },

    getOpsProductRowActions(product) {
      return [
        {
          label: 'Stock',
          handler: () => this.opsFocusProduct(product?.Product_Name),
        },
        {
          label: 'Vendor',
          handler: () => this.opsFocusVendor(product?.Vendor),
        },
      ];
    },

    getOpsPoRowActions(po) {
      return [
        {
          label: 'Stock',
          handler: () => this.opsFocusProduct(po?.Product),
        },
      ];
    },
  };
}


// ── ./modules/competitor-intel.js ──
function createCompetitorIntelModule() {
  return {
    // ── Competitor Intelligence State ─────────────────────────────────
    ciData: null,
    ciLoading: false,
    ciSection: 'landscape',   // landscape | capabilities | swot | steal-adapt | detail
    ciDetail: null,
    ciDetailLoading: false,
    ciCapabilities: null,
    ciSwot: null,
    ciStealAdapt: null,
    ciTierFilter: '',
    ciCategoryFilter: '',
    ciSearch: '',

    // ── Load Methods ──────────────────────────────────────────────────

    async loadCompetitorIntel() {
      if (this.ciLoading) return;
      const signal = this.beginRequest('competitor-intel');
      this.ciLoading = true;
      try {
        const res = await fetch('/api/competitor-intel', { signal });
        if (res.ok) {
          this.ciData = await res.json();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Competitor Intel load error:', err);
      } finally {
        this.endRequest('competitor-intel', signal);
        this.ciLoading = false;
      }
    },

    async loadCiDetail(brand) {
      this.ciSection = 'detail';
      this.ciDetail = null;
      this.ciDetailLoading = true;
      try {
        const encoded = encodeURIComponent(brand);
        const res = await fetch(`/api/competitor-intel/competitor/${encoded}`);
        if (res.ok) {
          this.ciDetail = await res.json();
        }
      } catch (err) {
        console.error('CI detail load error:', err);
      } finally {
        this.ciDetailLoading = false;
      }
    },

    closeCiDetail() {
      this.ciSection = 'landscape';
      this.ciDetail = null;
    },

    async loadCiCapabilities() {
      if (this.ciCapabilities) return;
      try {
        const res = await fetch('/api/competitor-intel/capabilities');
        if (res.ok) {
          this.ciCapabilities = await res.json();
        }
      } catch (err) {
        console.error('CI capabilities load error:', err);
      }
    },

    async loadCiSwot() {
      if (this.ciSwot) return;
      try {
        const res = await fetch('/api/competitor-intel/swot');
        if (res.ok) {
          this.ciSwot = await res.json();
        }
      } catch (err) {
        console.error('CI SWOT load error:', err);
      }
    },

    async loadCiStealAdapt() {
      if (this.ciStealAdapt) return;
      try {
        const res = await fetch('/api/competitor-intel/steal-adapt');
        if (res.ok) {
          this.ciStealAdapt = await res.json();
        }
      } catch (err) {
        console.error('CI Steal/Adapt load error:', err);
      }
    },

    ciSwitchSection(section) {
      this.ciSection = section;
      if (section === 'capabilities') this.loadCiCapabilities();
      else if (section === 'swot') this.loadCiSwot();
      else if (section === 'steal-adapt') this.loadCiStealAdapt();
    },

    // ── Filter / Helpers ──────────────────────────────────────────────

    getFilteredCompetitors() {
      if (!this.ciData || !this.ciData.competitors) return [];
      let list = this.ciData.competitors;
      if (this.ciTierFilter) {
        list = list.filter(c => (c.Tier || '') === this.ciTierFilter);
      }
      if (this.ciCategoryFilter) {
        list = list.filter(c => (c.Category || '') === this.ciCategoryFilter);
      }
      if (this.ciSearch) {
        const q = this.ciSearch.toLowerCase();
        list = list.filter(c =>
          (c.Brand || '').toLowerCase().includes(q) ||
          (c['Core Strengths'] || '').toLowerCase().includes(q) ||
          (c.Tags || '').toLowerCase().includes(q)
        );
      }
      return list;
    },

    getCiAvgScore(brand) {
      if (!this.ciData || !this.ciData.capabilitySummary) return null;
      const entry = this.ciData.capabilitySummary.find(s => s.brand === brand);
      return entry ? entry.avgScore : null;
    },

    getTierColor(tier) {
      const map = {
        'Flagship': 'var(--accent)',
        'Enterprise': 'var(--purple)',
        'Mid': 'var(--green)',
        'Regional': 'var(--amber)',
        'D2C': 'var(--teal)',
        'Local': 'var(--text-muted)',
      };
      return map[tier] || 'var(--text-muted)';
    },

    getTierBg(tier) {
      const map = {
        'Flagship': 'var(--accent-dim)',
        'Enterprise': 'var(--purple-dim)',
        'Mid': 'var(--green-dim)',
        'Regional': 'var(--amber-dim)',
        'D2C': 'var(--teal-dim)',
        'Local': 'var(--bg-hover)',
      };
      return map[tier] || 'var(--bg-hover)';
    },

    getCapabilityColor(score) {
      const s = Number(score);
      if (s >= 4) return 'var(--green)';
      if (s === 3) return 'var(--amber)';
      return 'var(--red)';
    },

    getCapabilityBg(score) {
      const s = Number(score);
      if (s >= 4) return 'var(--green-dim)';
      if (s === 3) return 'var(--amber-dim)';
      return 'var(--red-dim)';
    },

    getScoreLabel(score) {
      const s = Number(score);
      if (s >= 4) return 'Strong';
      if (s === 3) return 'Average';
      return 'Weak';
    },

    getCiTiers() {
      if (!this.ciData) return [];
      return (this.ciData.byTier || []).map(t => t.name);
    },

    getCiCategories() {
      if (!this.ciData) return [];
      return (this.ciData.byCategory || []).map(c => c.name);
    },

    // Format dimension name from snake_case to Title Case
    formatDimension(dim) {
      return dim.replace(/_/g, ' ');
    },

    // Truncate text to N chars
    ciTruncate(text, n) {
      if (!text) return '';
      return text.length > n ? text.slice(0, n) + '...' : text;
    },

    // Extract tags as array from comma-separated string
    ciParseTags(tags) {
      if (!tags) return [];
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    },
  };
}


// ── app.js (entry) ──
/**
 * YDS Command Centre — Frontend Application
 * Uses Alpine.js for reactivity, marked.js for markdown rendering.
 */






















configureMarkdown();

// Lazy module registry: maps view name -> factory function.
// These are NOT initialized at startup — only when the user first navigates to the view.
const LAZY_MODULE_FACTORIES = {
  overview: createOverviewModule,
  bmc: createBmcModule,
  crm: createCrmModule,
  marketingOps: createMarketingOpsModule,
  techTeam: createTechTeamModule,
  registry: createRegistryModule,
  projects: createProjectsModule,
  team: createTeamModule,
  docs: createDocumentsModule,
  notion: createNotionBrowserModule,
  commitments: createCommitmentsModule,
  factory: createFactoryModule,
  ops: createOpsModule,
  'competitor-intel': createCompetitorIntelModule,
};

function app() {
  return {
    // Navigation
    view: 'overview',
    sidebarExpanded: localStorage.getItem('sidebarExpanded') !== 'false',
    globalContext: { owner: '', focusArea: '', mode: '' },
    showNotificationSettings: false,
    notificationModalTab: 'center',
    notificationCenterFilter: 'all',
    notificationPermission: 'default',
    notificationSettings: {
      enabled: false,
      blocked: true,
      waitingOnDan: true,
      p0Bugs: true,
      lowStock: true,
      stalledFlows: true,
      dailyDigest: true,
      dailyDigestTime: '09:00',
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      minimumIncrease: 1,
      cooldownMinutes: 30,
    },
    _notificationIntervalId: null,
    _notificationSnapshot: null,
    notificationCenter: [],

    // Tracks which lazy modules have been initialized
    _initializedModules: {},

    // Tracks which HTML partials have been fetched and injected
    _partialLoaded: {},

    async _loadPartial(name) {
      if (this._partialLoaded[name]) return;
      try {
        const res = await fetch(`/partials/${name}.html`);
        if (!res.ok) throw new Error(`Failed to load partial: ${name}`);
        const html = await res.text();
        const container = document.querySelector(`.${this._partialViewClass(name)}`);
        if (container) {
          container.innerHTML = html;
          this._partialLoaded[name] = true;
        }
      } catch (err) {
        console.error(`Failed to load view partial: ${name}`, err);
      }
    },

    _partialViewClass(name) {
      const classMap = {
        marketingOps: 'mktops-view',
        factory: 'factory-view',
        ops: 'ops-view',
        dashboard: 'dashboard-view',
        bmc: 'bmc-view',
        techTeam: 'tech-view',
      };
      return classMap[name] || name + '-view';
    },

    // Table keyboard navigation
    tableSelectedRow: -1,

    // Connection status
    connected: false,

    // Skills
    skills: [],

    // Expert panel (static — matches CLAUDE.md)
    experts: [
      { name: 'Rory', domain: 'Behavioral psychology, nudges', icon: 'R' },
      { name: 'JW', domain: 'Visual strategy, UX, brand', icon: 'J' },
      { name: 'Harry', domain: 'Copy, CTAs, messaging', icon: 'H' },
      { name: 'Tech', domain: 'Architecture, feasibility', icon: 'A' },
      { name: 'Emily', domain: 'Marketing campaigns', icon: 'E' },
    ],

    // Stub state for lazy modules — prevents Alpine binding errors before the module inits.
    // Must use the exact property names each module declares. When _ensureModule() runs,
    // Object.assign will overwrite these stubs with the real module state + methods.
    // overview
    overview: null, overviewLoading: false,
    // bmc
    bmc: null, bmcLoading: false, bmcDetailItem: null, bmcDetailKey: '', bmcSearch: '', bmcFilter: 'highlights', bmcFocus: '',
    // crm
    crm: null, crmLoading: false, crmSection: 'overview',
    crmLeads: [], crmLeadsTotal: 0, crmLeadsPage: 1, crmLeadsLoading: false,
    crmLeadFilters: { status: '', category: '', search: '' },
    crmFlows: [], crmFlowsLoading: false, crmFlowFilters: { status: '', stage: '', owner: '' },
    crmDetail: null, crmDetailType: null, crmDetailLoading: false,
    crmTeam: null, crmConfig: null,
    // marketing-ops
    mktops: null, mktopsLoading: false, mktopsSection: 'overview', mktopsLastRefresh: null,
    // competitor-intel
    ciData: null, ciLoading: false, ciSection: 'landscape', ciDetail: null, ciDetailLoading: false,
    ciCapabilities: null, ciSwot: null, ciStealAdapt: null,
    ciTierFilter: '', ciCategoryFilter: '', ciSearch: '',
    // tech-team
    techTeam: null, techTeamLoading: false,
    // registry
    registry: null, registryLoading: false, registryFilter: '', registryTypeFilter: '', registryExpanded: null,
    // projects
    projects: [], projectsLoading: false, projectsFilter: 'Active', projectsTypeFilter: '', expandedProject: null,
    // team
    teamData: [], teamLoading: false,
    // documents
    documents: { briefings: [], decisions: [], 'weekly-reviews': [] }, docsTab: 'briefings', docsLoading: false, activeDoc: null,
    // notion-browser (detailPanel is used globally by many views via openDetailPanel)
    detailPanel: null, quickNoteText: '', quickNoteSaving: false,
    notionDatabases: [], notionKeyPages: [], notionLoading: false, notionCurrentDb: null, notionCurrentPage: null, notionRecords: [], notionBreadcrumb: [],
    // commitments — editDropdown must exist before init() registers the document click handler
    commitments: [], commitmentsLoading: false, commitmentsView: 'kanban',
    commitmentFilters: { focusArea: '', person: '', priority: '', status: '' },
    editDropdown: null, showCreateCommitment: false, showCreateDecision: false,
    showSnoozeFor: null, showReassignFor: null, selectedOverdue: [],
    // factory
    factoryConfig: null, factoryConfigLoading: false,
    // ops
    opsSection: 'overview',
    ops: null, opsLoading: false,
    opsStock: [], opsStockTotal: 0, opsStockLoading: false,
    opsStockFilters: { status: '', vendor: '', search: '' },
    opsSales: null, opsSalesLoading: false,
    opsProducts: [], opsProductsTotal: 0, opsProductsLoading: false,
    opsProductsFilters: { tier: '', vendor: '', search: '' },
    opsPOs: [], opsPOsTotal: 0, opsPOsLoading: false,

    // Eager modules — always initialized
    ...createDashboardModule(),
    ...createCommandShellModule(),
    ...createChatModule(),
    ...createToastsModule(),
    ...createDetailDrawerModule(),
    ...createInlineActionsModule(),

    // Knowledge Base
    notebooks: null,
    notebooksLoading: false,
    notebooksSearch: '',
    notebooksCategory: '',
    notebooksExpanded: null,

    // Action Queue
    actionQueue: null,
    actionQueueLoading: false,
    queueTab: 'dan', // 'dan' | 'runner'

    // Pipeline
    pipeline: null,
    pipelineLoading: false,

    // Decisions standalone view
    decisions: [],
    decisionsLoading: false,

    // Decisions filters
    decisionDateRange: 'all', // 'week' | 'month' | '3months' | 'all'
    decisionSearch: '',
    decisionFocusArea: '',
    decisionOwner: '',
    // Visibility-based auto-refresh
    _lastVisible: Date.now(),
    _requestControllers: {},

    // Lazily initialize a module the first time its view is navigated to.
    // Merges all state and methods from the factory into `this` (the Alpine component).
    _ensureModule(name) {
      if (this._initializedModules[name]) return;
      const factory = LAZY_MODULE_FACTORIES[name];
      if (!factory) return;
      const mod = factory();
      Object.assign(this, mod);
      this._initializedModules[name] = true;
    },

    // Initialization
    async init() {
      this.loadNotificationSettings();
      this.syncNotificationPermission();

      // Check server health
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        this.connected = data.status === 'ok' && data.hasAnthropicKey;
      } catch {
        this.connected = false;
      }

      // Load available skills
      try {
        const res = await fetch('/api/skills');
        const data = await res.json();
        this.skills = data.skills;
      } catch (err) {
        console.error('Failed to load skills:', err);
      }

      document.addEventListener('keydown', (event) => this.handleGlobalKeydown(event));

      // Visibility-based auto-refresh
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this._lastVisible = Date.now();
        } else {
          this.syncNotificationPermission();
          const away = Date.now() - this._lastVisible;
          if (away > 60000) {
            if (this.view === 'overview') this.loadOverview();
            else if (this.view === 'dashboard') this.loadDashboard();
          }
          this.runNotificationChecks('visibility');
        }
      });

      document.addEventListener('click', (event) => {
        // Guard: commitments module may not be initialized yet when this fires
        if (typeof this.handleCommitmentDocumentClick === 'function') {
          this.handleCommitmentDocumentClick(event);
        }
        // Close context menu on any outside click
        if (this.contextMenu?.open) {
          this.closeContextMenu();
        }
      });

      // Auto-load overview on start. Keep other views lazy so initial load
      // only fetches the active surface instead of warming hidden tabs.
      if (window.innerWidth <= 768) {
        this.commitmentsView = 'list';
      }
      // Eagerly load notion-browser so openDetailPanel/closeDetailPanel are
      // available globally (many views call openDetailPanel on click).
      this._ensureModule('notion');
      this._ensureModule('overview');
      this.loadOverview();

      // Auto-refresh active view every 5 minutes
      this.refreshIntervalId = setInterval(() => {
        if (this.view === 'overview') this.loadOverview();
        else if (this.view === 'dashboard') this.loadDashboard();
      }, 300000);

      // Independent action queue refresh every 3 minutes — runs regardless of active view.
      // Uses silent mode (no loading spinner) so it doesn't disrupt other views.
      this._aqIntervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && !this._requestControllers?.actionQueue) {
          this.loadActionQueue({ silent: true });
        }
      }, 180000);

      this._notificationIntervalId = setInterval(() => {
        this.runNotificationChecks('timer');
      }, 60000);

      // Clean up intervals on page unload
      window.addEventListener('unload', () => {
        clearInterval(this.refreshIntervalId);
        clearInterval(this._aqIntervalId);
        clearInterval(this._notificationIntervalId);
      });
    },

    beginRequest(key) {
      if (this._requestControllers[key]) {
        this._requestControllers[key].abort();
      }
      const controller = new AbortController();
      this._requestControllers[key] = controller;
      return controller.signal;
    },

    endRequest(key, signal) {
      if (this._requestControllers[key] && this._requestControllers[key].signal === signal) {
        delete this._requestControllers[key];
      }
    },

    isAbortError(err) {
      return err && err.name === 'AbortError';
    },

    handleTableKeydown(event) {
      const key = event.key;
      if (key !== 'j' && key !== 'k' && key !== 'ArrowDown' && key !== 'ArrowUp' && key !== 'Enter') return;

      // Only active when a data-table is visible in the DOM
      const table = document.querySelector('.data-table:not([style*="display: none"]) tbody');
      if (!table) return;

      const rows = table.querySelectorAll('tr');
      if (rows.length === 0) return;

      if (key === 'j' || key === 'ArrowDown') {
        event.preventDefault();
        this.tableSelectedRow = Math.min(this.tableSelectedRow + 1, rows.length - 1);
        rows.forEach((r, i) => r.classList.toggle('data-table-row-selected', i === this.tableSelectedRow));
        rows[this.tableSelectedRow]?.scrollIntoView({ block: 'nearest' });
      } else if (key === 'k' || key === 'ArrowUp') {
        event.preventDefault();
        this.tableSelectedRow = Math.max(this.tableSelectedRow - 1, 0);
        rows.forEach((r, i) => r.classList.toggle('data-table-row-selected', i === this.tableSelectedRow));
        rows[this.tableSelectedRow]?.scrollIntoView({ block: 'nearest' });
      } else if (key === 'Enter') {
        const selectedRow = rows[this.tableSelectedRow];
        if (selectedRow) {
          const clickable = selectedRow.querySelector('[style*="cursor: pointer"], a, button:not(.context-menu-trigger)');
          if (clickable) clickable.click();
        }
      }
    },

    formatDueDate(c) {
      if (!c.dueDate) return '—';
      const label = this.formatDate(c.dueDate);
      if (c.isOverdue && c.daysOverdue > 0) return `${label} (${c.daysOverdue}d overdue)`;
      return label;
    },

    getLoadBarClass(count) {
      if (count >= 8) return 'red';
      if (count >= 5) return 'amber';
      return 'green';
    },

    getHealthDotClass(person) {
      const cls = this.getPersonHealthClass(person);
      return cls.replace('health-', '');
    },

    toggleCommitmentRow(key) {
      this.expandedCommitmentRow = this.expandedCommitmentRow === key ? null : key;
    },

    getCompletedThisWeek() {
      // Combines data from commitments (kanban view) if loaded, or falls back to upcoming/overdue from dashboard
      const all = this.commitments.length > 0 ? this.commitments : [
        ...(this.dashboard?.overdue || []),
        ...(this.upcomingCommitments || []),
      ];
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      return all.filter(c => {
        if (c.Status !== 'Done') return false;
        // Check due date or last edited within this week
        const raw = c['Due Date'] && (typeof c['Due Date'] === 'object' ? c['Due Date'].start : c['Due Date']);
        if (raw) {
          const due = new Date(raw + (raw.includes('T') ? '' : 'T00:00:00'));
          if (due >= startOfWeek) return true;
        }
        // Also check last_edited_time if available
        if (c.last_edited_time) {
          const edited = new Date(c.last_edited_time);
          if (edited >= startOfWeek) return true;
        }
        return false;
      });
    },

    getGlobalMetrics() {
      if (!this.dashboard) return null;
      const openCommitments = (this.dashboard.upcoming || []).length + (this.dashboard.overdue || []).length;
      const overdueCount = (this.dashboard.overdue || []).length;
      const activeProjects = this.projects.filter(p => p.Status === 'Active').length;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const decisionsThisMonth = (this.dashboard.recentDecisions || []).filter(d => {
        const raw = d.Date && (typeof d.Date === 'object' ? d.Date.start : d.Date);
        if (!raw) return false;
        return new Date(raw) >= startOfMonth;
      }).length;
      return { openCommitments, overdueCount, activeProjects, decisionsThisMonth };
    },

    getGlobalOwnerOptions() {
      const owners = new Set();

      (this.dashboard?.people || []).forEach((person) => {
        if (person?.Name) owners.add(person.Name);
      });
      (this.overview?.people?.members || []).forEach((person) => {
        if (person?.name) owners.add(person.name);
      });
      (this.teamData || []).forEach((person) => {
        if (person?.Name) owners.add(person.Name);
      });
      (this.crm?.flowStats?.byOwner || []).forEach((owner) => {
        if (owner?.name) owners.add(owner.name);
      });
      (this.mktops?.campaigns || []).forEach((campaign) => {
        (campaign?.ownerNames || []).forEach((owner) => {
          if (owner) owners.add(owner);
        });
      });
      (this.techTeam?.sprintItems || []).forEach((item) => {
        const assignees = Array.isArray(item?.['Assigned To']) ? item['Assigned To'] : [item?.['Assigned To']];
        assignees.filter(Boolean).forEach((owner) => owners.add(owner));
      });

      return [...owners].sort((a, b) => a.localeCompare(b));
    },

    getGlobalFocusAreaOptions() {
      const areas = new Set();

      (this.dashboard?.focusAreas || []).forEach((area) => {
        if (area?.Name) areas.add(area.Name);
      });
      (this.overview?.health?.focusAreas?.atRiskItems || []).forEach((area) => {
        if (area?.name) areas.add(area.name);
      });

      return [...areas]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
    },

    async openOwnerContext(ownerName) {
      if (!ownerName) return;
      this._ensureModule('team');
      if (Array.isArray(this.teamData) && this.teamData.length === 0) {
        await this.loadTeam();
      }
      const normalized = String(ownerName).trim().toLowerCase();
      const person = (this.teamData || []).find((entry) => String(entry.Name || '').trim().toLowerCase() === normalized);
      if (person?.id) {
        this.openPersonView(person);
        return;
      }
      await this.openNavigationTarget('team');
      this.showInfo(`Opened Team for ${ownerName}`);
    },

    async openFocusAreaByName(areaName) {
      if (!areaName) return;
      if (!this.dashboard) {
        await this.loadDashboard();
      }
      const normalized = String(areaName).trim().toLowerCase();
      const area = (this.dashboard?.focusAreas || []).find((entry) => String(entry.Name || '').trim().toLowerCase() === normalized);
      if (area?.id) {
        this.openFocusAreaView(area);
        return;
      }
      await this.openNavigationTarget('projects');
      this.showInfo(`Opened Projects for ${areaName}`);
    },

    async applyGlobalOwnerFilter(ownerName = this.globalContext.owner) {
      this.globalContext.owner = ownerName || '';
      if (!this.globalContext.owner) return;
      await this.openOwnerContext(this.globalContext.owner);
    },

    async applyGlobalFocusAreaFilter(areaName = this.globalContext.focusArea) {
      this.globalContext.focusArea = areaName || '';
      if (!this.globalContext.focusArea) return;
      await this.openFocusAreaByName(this.globalContext.focusArea);
    },

    async applyGlobalMode(mode) {
      this.globalContext.mode = mode;
      if (mode === 'blocked') {
        if (this.view === 'marketingOps' && typeof this.applyMarketingSavedView === 'function') {
          this.applyMarketingSavedView('blockers');
          return;
        }
        if (this.view === 'crm' && typeof this.crmApplySavedView === 'function') {
          await this.crmApplySavedView('stalled');
          return;
        }
        if (this.view === 'techTeam' && typeof this.applyTechSavedView === 'function') {
          this.applyTechSavedView('blocked');
          return;
        }
        if (this.view === 'ops' && typeof this.applyOpsSavedView === 'function') {
          this.applyOpsSavedView('alerts');
          return;
        }
        await this.openNavigationTarget('dashboard');
        if (typeof this.applyDashboardSavedView === 'function') {
          this.applyDashboardSavedView('overdue');
        }
        return;
      }

      if (mode === 'waiting') {
        if (this.view === 'techTeam' && typeof this.applyTechSavedView === 'function') {
          this.applyTechSavedView('waiting');
          return;
        }
        await this.openNavigationTarget('actionQueue');
        return;
      }

      if (mode === 'today') {
        if (this.view === 'marketingOps' && typeof this.applyMarketingSavedView === 'function') {
          this.applyMarketingSavedView('sessions');
          return;
        }
        await this.openNavigationTarget('dashboard');
        if (typeof this.applyDashboardSavedView === 'function') {
          this.applyDashboardSavedView('today');
        }
        return;
      }

      if (mode === 'projects') {
        if (this.globalContext.focusArea) {
          await this.openFocusAreaByName(this.globalContext.focusArea);
          return;
        }
        await this.openNavigationTarget('projects');
      }
    },

    clearGlobalContext() {
      this.globalContext = { owner: '', focusArea: '', mode: '' };
    },

    getBadgeCount(domain) {
      if (!this.dashboard) return 0;
      switch (domain) {
        case 'command':
          return (this.dashboard?.overdue?.length || 0) + (this.actionQueue?.dansQueueCount || 0);
        case 'operations':
          return typeof this.getOverloadedCount === 'function' ? this.getOverloadedCount() : 0;
        case 'growth':
          return this.mktops?.stats?.blockedCampaigns?.length || 0;
        case 'strategy':
          return this.dashboard?.recentDecisions?.length || 0;
        case 'systems':
          return this.techTeam?.stats?.blocked || 0;
        default:
          return 0;
      }
    },

    getLastRefreshLabel() {
      if (!this.lastRefresh) return '';
      const seconds = Math.floor((Date.now() - this.lastRefresh.getTime()) / 1000);
      if (seconds < 10) return 'Just now';
      if (seconds < 60) return seconds + 's ago';
      const minutes = Math.floor(seconds / 60);
      return minutes + 'm ago';
    },

    async forceRefresh() {
      try {
        await fetch('/api/notion/cache/clear', { method: 'POST' });
      } catch (err) {
        console.error('Cache clear error:', err);
      }
      await this.loadDashboard();
      // Also reload projects if they were loaded
      if (this.projects.length > 0) {
        this.loadProjects();
      }
    },

    notificationsSupported() {
      return typeof window !== 'undefined' && 'Notification' in window;
    },

    syncNotificationPermission() {
      this.notificationPermission = this.notificationsSupported() ? Notification.permission : 'unsupported';
    },

    loadNotificationSettings() {
      try {
        const rawSettings = JSON.parse(localStorage.getItem('notificationSettings') || '{}');
        this.notificationSettings = { ...this.notificationSettings, ...rawSettings };
      } catch {
        // fall back to defaults
      }
      try {
        this._notificationSnapshot = JSON.parse(localStorage.getItem('notificationSnapshot') || 'null');
      } catch {
        this._notificationSnapshot = null;
      }
      try {
        this.notificationCenter = JSON.parse(localStorage.getItem('notificationCenter') || '[]');
      } catch {
        this.notificationCenter = [];
      }
    },

    saveNotificationSettings() {
      localStorage.setItem('notificationSettings', JSON.stringify(this.notificationSettings));
    },

    openNotificationSettingsPanel() {
      this.syncNotificationPermission();
      this.notificationModalTab = 'center';
      this.showNotificationSettings = true;
    },

    closeNotificationSettingsPanel() {
      this.showNotificationSettings = false;
    },

    async requestNotificationAccess() {
      if (!this.notificationsSupported()) {
        this.showError('This browser does not support notifications');
        return;
      }
      const permission = await Notification.requestPermission();
      this.notificationPermission = permission;
      if (permission === 'granted') {
        this.notificationSettings.enabled = true;
        this.saveNotificationSettings();
        this.resetNotificationBaseline();
        this.showSuccess('Browser notifications enabled');
      } else {
        this.showInfo('Browser notifications were not enabled');
      }
    },

    toggleNotificationSetting(key) {
      this.notificationSettings[key] = !this.notificationSettings[key];
      this.saveNotificationSettings();
      if (key === 'enabled' && this.notificationSettings.enabled) {
        this.resetNotificationBaseline();
      }
    },

    updateNotificationTime(key, value) {
      this.notificationSettings[key] = value;
      this.saveNotificationSettings();
    },

    updateNotificationNumericSetting(key, value) {
      const numericValue = Math.max(0, Number(value || 0));
      this.notificationSettings[key] = numericValue;
      this.saveNotificationSettings();
    },

    resetNotificationBaseline() {
      this._notificationSnapshot = this.getNotificationSnapshot();
      localStorage.setItem('notificationSnapshot', JSON.stringify(this._notificationSnapshot));
    },

    getNotificationSnapshot() {
      const blocked = this.overview?.attention?.counts?.blockedTotal
        ?? (this.dashboard?.overdue || []).filter((item) => item.Status === 'Blocked').length
        ?? 0;
      const waitingOnDan = this.overview?.attention?.counts?.waitingOnDan
        ?? this.actionQueue?.dansQueueCount
        ?? 0;
      const p0Bugs = this.techTeam?.stats?.p0Bugs || 0;
      const lowStock = (this.ops?.stockHealth?.outOfStock || 0)
        + (this.ops?.stockHealth?.lowStock || 0)
        + (this.ops?.stockHealth?.reorderNeeded || 0);
      const stalledFlows = (this.crm?.flowStats?.byStatus || []).reduce((sum, item) => {
        return String(item.name || '').toLowerCase() === 'stalled' ? sum + (item.count || 0) : sum;
      }, 0);

      return {
        blocked,
        waitingOnDan,
        p0Bugs,
        lowStock,
        stalledFlows,
      };
    },

    getNotificationTimeMinutes(clockValue) {
      const [hours, minutes] = String(clockValue || '00:00').split(':').map((part) => Number(part || 0));
      return (hours * 60) + minutes;
    },

    isWithinQuietHours() {
      if (!this.notificationSettings.quietHoursEnabled) return false;
      const start = this.getNotificationTimeMinutes(this.notificationSettings.quietHoursStart);
      const end = this.getNotificationTimeMinutes(this.notificationSettings.quietHoursEnd);
      const now = new Date();
      const current = (now.getHours() * 60) + now.getMinutes();
      if (start === end) return false;
      if (start < end) return current >= start && current < end;
      return current >= start || current < end;
    },

    canSendBrowserNotification() {
      return this.notificationsSupported()
        && this.notificationPermission === 'granted'
        && this.notificationSettings.enabled
        && !this.isWithinQuietHours();
    },

    saveNotificationCenter() {
      localStorage.setItem('notificationCenter', JSON.stringify(this.notificationCenter));
    },

    getUnreadNotificationCount() {
      return (this.notificationCenter || []).filter((item) => !item.read && !item.dismissedAt).length;
    },

    getFilteredNotificationCenterItems() {
      const now = Date.now();
      const visible = (this.notificationCenter || []).filter((item) => !item.dismissedAt);
      if (this.notificationCenterFilter === 'unread') {
        return visible.filter((item) => !item.read);
      }
      if (this.notificationCenterFilter === 'snoozed') {
        return visible.filter((item) => item.snoozedUntil && new Date(item.snoozedUntil).getTime() > now);
      }
      return visible;
    },

    addNotificationCenterItem(item) {
      this.notificationCenter.unshift({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        read: false,
        dismissedAt: null,
        snoozedUntil: null,
        ...item,
      });
      this.notificationCenter = this.notificationCenter.slice(0, 60);
      this.saveNotificationCenter();
    },

    markNotificationRead(id) {
      const item = this.notificationCenter.find((entry) => entry.id === id);
      if (!item) return;
      item.read = true;
      this.saveNotificationCenter();
    },

    dismissNotification(id) {
      const item = this.notificationCenter.find((entry) => entry.id === id);
      if (!item) return;
      item.dismissedAt = new Date().toISOString();
      item.read = true;
      this.saveNotificationCenter();
    },

    snoozeNotification(id, minutes = 60) {
      const item = this.notificationCenter.find((entry) => entry.id === id);
      if (!item) return;
      item.snoozedUntil = new Date(Date.now() + minutes * 60000).toISOString();
      item.read = true;
      this.saveNotificationCenter();
    },

    async openNotificationCenterItem(item) {
      if (!item) return;
      this.markNotificationRead(item.id);
      if (item.view) {
        await this.openNavigationTarget(item.view);
      }
      this.closeNotificationSettingsPanel();
    },

    getNotificationRuleLabel(key) {
      const labels = {
        blocked: 'Blocked work',
        waitingOnDan: 'Waiting on Dan',
        p0Bugs: 'P0 bugs',
        lowStock: 'Stock risk',
        stalledFlows: 'Stalled flows',
        digest: 'Daily digest',
        test: 'Test',
      };
      return labels[key] || key;
    },

    isNotificationCooldownActive(key) {
      const cooldownMinutes = Number(this.notificationSettings.cooldownMinutes || 0);
      if (cooldownMinutes <= 0) return false;
      const stamp = localStorage.getItem(`notificationCooldown:${key}`);
      if (!stamp) return false;
      return (Date.now() - new Date(stamp).getTime()) < cooldownMinutes * 60000;
    },

    markNotificationCooldown(key) {
      localStorage.setItem(`notificationCooldown:${key}`, new Date().toISOString());
    },

    sendBrowserNotification(title, options = {}) {
      if (!this.canSendBrowserNotification()) return false;
      const notification = new Notification(title, {
        body: options.body || '',
        tag: options.tag || title,
        silent: false,
      });
      if (options.view) {
        notification.onclick = () => {
          window.focus();
          this.openNavigationTarget(options.view);
          notification.close();
        };
      }
      this.addNotificationCenterItem({
        type: options.type || 'info',
        rule: options.rule || null,
        title,
        body: options.body || '',
        view: options.view || null,
      });
      return true;
    },

    maybeSendDailyDigest() {
      if (!this.notificationSettings.dailyDigest) return;
      const today = new Date().toISOString().slice(0, 10);
      const lastDigestDate = localStorage.getItem('notificationDailyDigestSent');
      if (lastDigestDate === today) return;

      const targetMinutes = this.getNotificationTimeMinutes(this.notificationSettings.dailyDigestTime);
      const now = new Date();
      const currentMinutes = (now.getHours() * 60) + now.getMinutes();
      if (currentMinutes < targetMinutes) return;

      const snapshot = this.getNotificationSnapshot();
      const body = [
        `${snapshot.blocked} blocked`,
        `${snapshot.waitingOnDan} waiting`,
        `${snapshot.p0Bugs} P0 bugs`,
        `${snapshot.stalledFlows} stalled flows`,
        `${snapshot.lowStock} stock risks`,
      ].join(' • ');

      if (this.sendBrowserNotification('Daily command digest', {
        body,
        tag: `daily-digest-${today}`,
        view: 'overview',
        type: 'digest',
        rule: 'digest',
      })) {
        localStorage.setItem('notificationDailyDigestSent', today);
      }
    },

    runNotificationChecks(source = 'manual') {
      this.syncNotificationPermission();
      if (!this.notificationSettings.enabled || this.notificationPermission !== 'granted') return;

      const current = this.getNotificationSnapshot();
      const previous = this._notificationSnapshot;
      if (!previous) {
        this.resetNotificationBaseline();
        this.maybeSendDailyDigest();
        return;
      }

      const alerts = [
        {
          key: 'blocked',
          enabled: this.notificationSettings.blocked,
          title: 'Blocked work increased',
          body: `${current.blocked} blocked items now need attention`,
          view: 'dashboard',
        },
        {
          key: 'waitingOnDan',
          enabled: this.notificationSettings.waitingOnDan,
          title: 'New waiting-on-Dan items',
          body: `${current.waitingOnDan} items are waiting on you`,
          view: 'actionQueue',
        },
        {
          key: 'p0Bugs',
          enabled: this.notificationSettings.p0Bugs,
          title: 'P0 bug pressure increased',
          body: `${current.p0Bugs} P0 bugs are now open`,
          view: 'techTeam',
        },
        {
          key: 'lowStock',
          enabled: this.notificationSettings.lowStock,
          title: 'Stock risk increased',
          body: `${current.lowStock} stock alerts now need review`,
          view: 'ops',
        },
        {
          key: 'stalledFlows',
          enabled: this.notificationSettings.stalledFlows,
          title: 'Stalled CRM flows increased',
          body: `${current.stalledFlows} stalled flows now need follow-up`,
          view: 'crm',
        },
      ];

      alerts.forEach((alert) => {
        if (!alert.enabled) return;
        const delta = (current[alert.key] || 0) - (previous[alert.key] || 0);
        if (delta < Number(this.notificationSettings.minimumIncrease || 1)) return;
        if (this.isNotificationCooldownActive(alert.key)) return;
        if ((current[alert.key] || 0) > (previous[alert.key] || 0)) {
          this.sendBrowserNotification(alert.title, {
            body: alert.body,
            tag: `alert-${alert.key}-${source}`,
            view: alert.view,
            type: 'alert',
            rule: alert.key,
          });
          this.markNotificationCooldown(alert.key);
        }
      });

      this._notificationSnapshot = current;
      localStorage.setItem('notificationSnapshot', JSON.stringify(current));
      this.maybeSendDailyDigest();
    },

    sendTestNotification() {
      this.syncNotificationPermission();
      if (!this.notificationSettings.enabled || this.notificationPermission !== 'granted') {
        this.showInfo('Enable browser notifications first');
        return;
      }
      if (this.isWithinQuietHours()) {
        this.showInfo('Notifications are currently inside quiet hours');
        return;
      }
      this.sendBrowserNotification('Test notification', {
        body: 'Alerts are working in the browser while this app is open.',
        tag: 'test-notification',
        view: this.view || 'overview',
        type: 'test',
        rule: 'test',
      });
    },

    formatRelativeDate(dateValue) {
      if (!dateValue) return '—';
      const raw = typeof dateValue === 'object' && dateValue !== null && dateValue.start
        ? dateValue.start
        : String(dateValue);
      const dateOnly = raw.split('T')[0];
      const due = new Date(dateOnly + 'T00:00:00');
      if (isNaN(due)) return raw;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffMs = due.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < -1) return Math.abs(diffDays) + ' days overdue';
      if (diffDays === -1) return '1 day overdue';
      if (diffDays === 0) return 'Due today';
      if (diffDays === 1) return 'Due tomorrow';
      if (diffDays <= 6) {
        const dayName = due.toLocaleDateString('en-US', { weekday: 'short' });
        return 'Due ' + dayName;
      }
      const month = due.toLocaleDateString('en-US', { month: 'short' });
      const day = due.getDate();
      return 'Due ' + month + ' ' + day;
    },

    // --- Knowledge Base ---

    async loadNotebooks() {
      const signal = this.beginRequest('notebooks');
      this.notebooksLoading = true;
      try {
        const res = await fetch('/api/notebooks', { signal });
        if (res.ok) this.notebooks = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Notebooks load error:', err);
      } finally {
        this.endRequest('notebooks', signal);
        this.notebooksLoading = false;
      }
    },

    getFilteredNotebooks() {
      if (!this.notebooks || !this.notebooks.available) return [];
      let categories = this.notebooks.categories;

      if (this.notebooksCategory) {
        categories = categories.filter(c => c.name === this.notebooksCategory);
      }

      if (this.notebooksSearch.trim()) {
        const q = this.notebooksSearch.toLowerCase().trim();
        categories = categories.map(c => ({
          ...c,
          notebooks: c.notebooks.filter(n =>
            n.name.toLowerCase().includes(q) ||
            n.description.toLowerCase().includes(q)
          )
        })).filter(c => c.notebooks.length > 0);
      }

      return categories;
    },

    getTotalFilteredNotebooks() {
      return this.getFilteredNotebooks().reduce((sum, c) => sum + c.notebooks.length, 0);
    },

    // --- Decisions Standalone View ---

    async loadDecisions() {
      const signal = this.beginRequest('decisions');
      this.view = 'decisions';
      this.decisionsLoading = true;
      try {
        const res = await fetch('/api/notion/decisions?days=365', { signal });
        if (res.ok) {
          const data = await res.json();
          this.decisions = data.decisions || [];
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Decisions load error:', err);
      } finally {
        this.endRequest('decisions', signal);
        this.decisionsLoading = false;
      }
    },

    // --- Project Staleness ---

    isProjectStale(project) {
      const projectEdit = project.last_edited_time;
      const commitmentEdit = project.lastCommitmentActivity;
      const latestEdit = [projectEdit, commitmentEdit].filter(Boolean).sort().reverse()[0];
      if (!latestEdit) return true;
      const daysSince = Math.floor((Date.now() - new Date(latestEdit).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 7;
    },

    getProjectStaleDays(project) {
      const projectEdit = project.last_edited_time;
      const commitmentEdit = project.lastCommitmentActivity;
      const latestEdit = [projectEdit, commitmentEdit].filter(Boolean).sort().reverse()[0];
      if (!latestEdit) return '?';
      return Math.floor((Date.now() - new Date(latestEdit).getTime()) / (1000 * 60 * 60 * 24));
    },

    // --- Decision Filters ---

    getFilteredDecisions() {
      let results;
      if (this.view === 'decisions' && this.decisions.length > 0) {
        results = this.decisions;
      } else if (this.dashboard && this.dashboard.recentDecisions) {
        results = this.dashboard.recentDecisions;
      } else {
        return [];
      }

      // Date range filter
      if (this.decisionDateRange !== 'all') {
        const now = new Date();
        let cutoff;
        if (this.decisionDateRange === 'week') {
          cutoff = new Date(now);
          cutoff.setDate(now.getDate() - 7);
        } else if (this.decisionDateRange === 'month') {
          cutoff = new Date(now);
          cutoff.setMonth(now.getMonth() - 1);
        } else if (this.decisionDateRange === '3months') {
          cutoff = new Date(now);
          cutoff.setMonth(now.getMonth() - 3);
        }
        results = results.filter(d => {
          const raw = d.Date && typeof d.Date === 'object' ? d.Date.start : d.Date;
          if (!raw) return false;
          return new Date(raw) >= cutoff;
        });
      }

      // Keyword search: Name, Context, Decision, Rationale
      if (this.decisionSearch.trim()) {
        const q = this.decisionSearch.toLowerCase().trim();
        results = results.filter(d => {
          return (
            (d.Name || '').toLowerCase().includes(q) ||
            (d.Context || '').toLowerCase().includes(q) ||
            (d.Decision || '').toLowerCase().includes(q) ||
            (d.Rationale || '').toLowerCase().includes(q)
          );
        });
      }

      // Focus Area filter: match UUID against dashboard focusAreas lookup
      if (this.decisionFocusArea) {
        const focusAreas = (this.dashboard.focusAreas || []);
        // Find the UUID for the selected name
        const matchArea = focusAreas.find(a => a.Name === this.decisionFocusArea);
        if (matchArea) {
          const matchId = matchArea.id.replace(/-/g, '');
          results = results.filter(d => {
            const faIds = d['Focus Area'] || [];
            return Array.isArray(faIds) && faIds.some(id => id.replace(/-/g, '') === matchId);
          });
        }
      }

      // Owner filter: text field match
      if (this.decisionOwner) {
        results = results.filter(d => (d.Owner || '') === this.decisionOwner);
      }

      return results;
    },

    getDecisionFilterOptions() {
      let decisions;
      let focusAreas;
      if (this.view === 'decisions' && this.decisions.length > 0) {
        decisions = this.decisions;
        focusAreas = (this.dashboard && this.dashboard.focusAreas) || [];
      } else if (this.dashboard && this.dashboard.recentDecisions) {
        decisions = this.dashboard.recentDecisions;
        focusAreas = this.dashboard.focusAreas || [];
      } else {
        return { focusAreas: [], owners: [] };
      }

      // Collect unique focus area IDs used across all decisions
      const usedFaIds = new Set();
      for (const d of decisions) {
        const faIds = d['Focus Area'] || [];
        if (Array.isArray(faIds)) faIds.forEach(id => usedFaIds.add(id.replace(/-/g, '')));
      }

      // Map to names using dashboard focusAreas
      const uniqueFocusAreas = focusAreas
        .filter(a => usedFaIds.has(a.id.replace(/-/g, '')))
        .map(a => a.Name)
        .filter(Boolean)
        .sort();

      // Unique owners
      const ownersSet = new Set();
      for (const d of decisions) {
        if (d.Owner) ownersSet.add(d.Owner);
      }
      const owners = [...ownersSet].sort();

      return { focusAreas: uniqueFocusAreas, owners };
    },

    // Group filtered decisions by month, newest first
    getDecisionsByMonth() {
      const decisions = this.getFilteredDecisions();
      const groups = [];
      const monthMap = {};

      for (const d of decisions) {
        const raw = d.Date && typeof d.Date === 'object' ? d.Date.start : (d.Date || '');
        let monthKey = 'Unknown';
        if (raw) {
          const dt = new Date(raw.split('T')[0] + 'T00:00:00');
          if (!isNaN(dt)) {
            monthKey = dt.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
        }
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { month: monthKey, decisions: [], _date: raw };
          groups.push(monthMap[monthKey]);
        }
        monthMap[monthKey].decisions.push(d);
      }

      // Sort groups newest first
      groups.sort((a, b) => {
        if (a.month === 'Unknown') return 1;
        if (b.month === 'Unknown') return -1;
        return new Date(b._date) - new Date(a._date);
      });

      // Add count
      for (const g of groups) {
        g.count = g.decisions.length;
      }

      return groups;
    },

    // --- Utilities ---

    getGreeting() {
      const hour = new Date().getHours();
      if (hour < 12) return 'Good morning, Dan';
      if (hour < 18) return 'Good afternoon, Dan';
      return 'Good evening, Dan';
    },

    getTodayDate() {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    },

    getInitials(name) {
      if (!name) return '?';
      return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    },

    getAvatar(name) {
      if (!name) return { initials: '?', color: 'var(--text-muted)' };
      const parts = name.trim().split(/\s+/);
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      const colors = [
        'var(--accent)', 'var(--green)', 'var(--amber)',
        'var(--purple)', 'var(--teal)', 'var(--red)'
      ];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      const color = colors[Math.abs(hash) % colors.length];
      return { initials, color };
    },

    autoResize(event) {
      const el = event.target;
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    },

    renderMarkdown(text) {
      if (!text) return '';
      try {
        return DOMPurify.sanitize(marked.parse(text));
      } catch {
        return this.escapeHtml(text);
      }
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    formatToolName(name) {
      return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    },

    getCacheAge(timestamp) {
      if (!timestamp) return '';
      const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
      if (seconds < 10) return 'Just now';
      if (seconds < 60) return seconds + 's ago';
      const minutes = Math.floor(seconds / 60);
      return minutes + 'm ago';
    },

    formatRelativeTime(value) {
      if (!value) return '';
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
      if (seconds < 10) return 'just now';
      if (seconds < 60) return `${seconds}s ago`;
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days === 1) return 'yesterday';
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    },

    // Universal status → badge class mapper. Call from templates as :class="statusClass(item.status)"
    statusClass(status) {
      if (!status) return 'neutral';
      const s = String(status).toLowerCase();
      if (['done','complete','completed','active','live','on track','resolved','shipped'].includes(s)) return 'success';
      if (['in progress','open','ongoing','started','doing'].includes(s)) return 'info';
      if (['blocked','overdue','off track','failed','critical','high'].includes(s)) return 'danger';
      if (['at risk','waiting','pending','review','needs dan','medium'].includes(s)) return 'warning';
      if (['cancelled','archived','paused','low','backlog'].includes(s)) return 'neutral';
      if (['proposed','draft','briefing'].includes(s)) return 'purple';
      return 'neutral';
    },

    // Priority-specific variant (high=danger, medium=warning, low=neutral)
    priorityClass(priority) {
      if (!priority) return 'neutral';
      const p = String(priority).toLowerCase();
      if (p === 'critical' || p === 'high') return 'danger';
      if (p === 'medium') return 'warning';
      return 'neutral';
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = document.getElementById('messages');
        if (el) el.scrollTop = el.scrollHeight;
      });
    },

    // ── SVG Chart Generators ─────────────────────────────────────────────────

    // Escape text for safe embedding in SVG
    _escSvg(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },

    // Horizontal bar chart — data: [{ label, value, color? }]
    generateBarChart(data, width = 300, height = 160) {
      if (!data || data.length === 0) return '';
      const max = Math.max(...data.map(d => d.value)) || 1;
      const barHeight = Math.min(24, (height - 20) / data.length - 4);
      const labelWidth = 80;
      const chartWidth = width - labelWidth - 10;
      let bars = '';
      data.forEach((d, i) => {
        const y = i * (barHeight + 4) + 4;
        const barW = Math.max(2, (d.value / max) * chartWidth);
        const color = d.color || 'var(--accent)';
        bars += `<text x="${labelWidth - 8}" y="${y + barHeight / 2 + 4}" text-anchor="end" fill="var(--text-secondary)" font-size="11" font-family="var(--font-ui)">${this._escSvg(d.label)}</text>`;
        bars += `<rect x="${labelWidth}" y="${y}" width="${barW}" height="${barHeight}" rx="3" fill="${color}" opacity="0.8"/>`;
        bars += `<text x="${labelWidth + barW + 6}" y="${y + barHeight / 2 + 4}" fill="var(--text-muted)" font-size="10" font-family="var(--font-mono)">${d.value}</text>`;
      });
      const svgHeight = data.length * (barHeight + 4) + 8;
      return `<svg class="chart-bar" width="100%" viewBox="0 0 ${width} ${svgHeight}" preserveAspectRatio="xMinYMin meet">${bars}</svg>`;
    },

    // Donut chart — data: [{ label, value, color }]
    generateDonutChart(data, size = 120) {
      if (!data || data.length === 0) return '';
      const total = data.reduce((sum, d) => sum + d.value, 0) || 1;
      const cx = size / 2;
      const cy = size / 2;
      const r = (size / 2) - 10;
      const innerR = r * 0.6;
      let paths = '';
      let startAngle = -90;
      data.forEach(d => {
        const angle = (d.value / total) * 360;
        const endAngle = startAngle + angle;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const largeArc = angle > 180 ? 1 : 0;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const ix1 = cx + innerR * Math.cos(endRad);
        const iy1 = cy + innerR * Math.sin(endRad);
        const ix2 = cx + innerR * Math.cos(startRad);
        const iy2 = cy + innerR * Math.sin(startRad);
        paths += `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix1.toFixed(2)} ${iy1.toFixed(2)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z" fill="${d.color}" opacity="0.85"/>`;
        startAngle = endAngle;
      });
      paths += `<text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="var(--text-primary)" font-size="18" font-weight="600" font-family="var(--font-ui)">${total}</text>`;
      paths += `<text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-family="var(--font-ui)">total</text>`;
      return `<svg class="chart-donut" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${paths}</svg>`;
    },

    // Progress bar (div-based for simplicity)
    generateProgressBar(value, max, color = 'var(--accent)', height = 6) {
      const pct = Math.min(100, Math.max(0, (value / (max || 1)) * 100));
      return `<div class="chart-progress" style="height:${height}px"><div class="chart-progress-fill" style="width:${pct}%;background:${color}"></div></div>`;
    },

    // Funnel chart — stages: [{ label, value, color }] ordered widest to narrowest
    generateFunnelChart(stages, width = 300, height = 160) {
      if (!stages || stages.length === 0) return '';
      const max = stages[0]?.value || 1;
      const stageHeight = Math.min(32, height / stages.length - 4);
      let bars = '';
      stages.forEach((s, i) => {
        const y = i * (stageHeight + 4);
        const barW = Math.max(20, (s.value / max) * (width - 120));
        const x = (width - 120 - barW) / 2 + 60;
        const color = s.color || 'var(--accent)';
        bars += `<rect x="${x.toFixed(2)}" y="${y}" width="${barW.toFixed(2)}" height="${stageHeight}" rx="4" fill="${color}" opacity="0.8"/>`;
        bars += `<text x="${(x + barW / 2).toFixed(2)}" y="${y + stageHeight / 2 + 4}" text-anchor="middle" fill="var(--text-inverse)" font-size="11" font-weight="600" font-family="var(--font-ui)">${s.value}</text>`;
        bars += `<text x="${width - 4}" y="${y + stageHeight / 2 + 4}" text-anchor="end" fill="var(--text-secondary)" font-size="10" font-family="var(--font-ui)">${this._escSvg(s.label)}</text>`;
      });
      const svgHeight = stages.length * (stageHeight + 4);
      return `<svg class="chart-funnel" width="100%" viewBox="0 0 ${width} ${svgHeight}" preserveAspectRatio="xMidYMin meet">${bars}</svg>`;
    },

    // ── Chart Data Helpers ────────────────────────────────────────────────────

    // Commitment status breakdown for dashboard donut
    getDashboardBurndownData() {
      const overdue = (this.dashboard?.overdue || []).length;
      const metrics = this.getGlobalMetrics();
      const total = metrics?.openCommitments || 0;
      const active = Math.max(0, total - overdue);
      return [
        { label: 'Active', value: active, color: 'var(--accent)' },
        { label: 'Overdue', value: overdue, color: 'var(--red)' },
      ].filter(d => d.value > 0);
    },

    // CRM pipeline funnel (uses sheets pipeline data)
    getCrmFunnelData() {
      const rows = this.crm?.pipeline?.rows || [];
      if (!rows.length) return [];
      const stageCounts = {};
      rows.forEach(r => {
        const stage = r.Stage || r.stage || r.Status || r.status || 'Unknown';
        stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      });
      const stageOrder = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
      const colors = ['var(--accent)', 'var(--teal)', 'var(--amber)', 'var(--purple)', 'var(--green)', 'var(--red)'];
      return Object.entries(stageCounts)
        .sort((a, b) => {
          const ai = stageOrder.indexOf(a[0]);
          const bi = stageOrder.indexOf(b[0]);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .map(([label, value], i) => ({ label, value, color: colors[i % colors.length] }));
    },

    // Marketing ops campaign status distribution
    getMktopsCampaignChartData() {
      const s = this.mktops?.stats;
      if (!s) return [];
      return [
        { label: 'Active', value: s.activeCampaigns || 0, color: 'var(--accent)' },
        { label: 'Blocked', value: Array.isArray(s.blockedCampaigns) ? s.blockedCampaigns.length : (s.blockedCampaigns || 0), color: 'var(--red)' },
        { label: 'In Review', value: Array.isArray(s.needsReviewContent) ? s.needsReviewContent.length : 0, color: 'var(--amber)' },
        { label: 'Live Seq.', value: s.liveSequences || 0, color: 'var(--green)' },
      ].filter(d => d.value > 0);
    },

    // Tech team sprint status distribution
    getSprintChartData() {
      const s = this.techTeam?.stats;
      if (!s) return [];
      return [
        { label: 'Done', value: s.doneItems || 0, color: 'var(--green)' },
        { label: 'In Progress', value: s.inProgress || 0, color: 'var(--accent)' },
        { label: 'Blocked', value: s.blocked || 0, color: 'var(--red)' },
        { label: 'Open Bugs', value: s.openBugs || 0, color: 'var(--amber)' },
      ].filter(d => d.value > 0);
    },

  };
}

window.app = app;

})();
