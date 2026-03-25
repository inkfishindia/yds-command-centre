/**
 * YDS Command Centre — Frontend Application
 * Uses Alpine.js for reactivity, marked.js for markdown rendering.
 */

import { configureMarkdown } from './modules/markdown.js';
import { createDashboardModule } from './modules/dashboard.js';
import { createBmcModule } from './modules/bmc.js';
import { createCrmModule } from './modules/crm.js';
import { createMarketingOpsModule } from './modules/marketing-ops.js';
import { createTechTeamModule } from './modules/tech-team.js';
import { createRegistryModule } from './modules/registry.js';
import { createProjectsModule } from './modules/projects.js';
import { createTeamModule } from './modules/team.js';
import { createDocumentsModule } from './modules/documents.js';
import { createNotionBrowserModule } from './modules/notion-browser.js';
import { createCommitmentsModule } from './modules/commitments.js';
import { createFactoryModule } from './modules/factory.js';
import { createCommandShellModule } from './modules/command-shell.js';
import { createChatModule } from './modules/chat.js';
import { createOverviewModule } from './modules/overview.js';
import { createToastsModule } from './modules/toasts.js';
import { createDetailDrawerModule } from './modules/detail-drawer.js';
import { createInlineActionsModule } from './modules/inline-actions.js';
import { createOpsModule } from './modules/ops.js';
import { createCompetitorIntelModule } from './modules/competitor-intel.js';

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

      // Auto-load overview on start, prefetch dashboard in background
      if (window.innerWidth <= 768) {
        this.commitmentsView = 'list';
      }
      // Eagerly load notion-browser so openDetailPanel/closeDetailPanel are
      // available globally (many views call openDetailPanel on click).
      this._ensureModule('notion');
      this._ensureModule('overview');
      this.loadOverview().then(() => {
        // Prefetch dashboard data after overview settles so Dash view is instant
        setTimeout(() => {
          this._loadPartial('dashboard').then(() => this.loadDashboard()).then(() => {
            this.startDashboardAutoRefresh();
          });
        }, 2000);
      });

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
