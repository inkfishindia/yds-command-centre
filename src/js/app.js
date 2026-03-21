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

configureMarkdown();

// Lazy module registry: maps view name -> factory function.
// These are NOT initialized at startup — only when the user first navigates to the view.
const LAZY_MODULE_FACTORIES = {
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
};

function app() {
  return {
    // Navigation
    view: 'dashboard',

    // Tracks which lazy modules have been initialized
    _initializedModules: {},

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
    // bmc
    bmc: null, bmcLoading: false, bmcDetailItem: null, bmcDetailKey: '', bmcSearch: '', bmcFilter: 'highlights', bmcFocus: '',
    // crm
    crm: null, crmLoading: false, crmSection: 'overview', crmSearch: '', crmExpandedItem: null, crmSectionData: null,
    // marketing-ops
    mktops: null, mktopsLoading: false, mktopsSection: 'overview', mktopsLastRefresh: null,
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
    // notion-browser
    notionDatabases: [], notionKeyPages: [], notionLoading: false, notionCurrentDb: null, notionCurrentPage: null, notionRecords: [], notionBreadcrumb: [],
    // commitments — editDropdown must exist before init() registers the document click handler
    commitments: [], commitmentsLoading: false, commitmentsView: 'kanban',
    commitmentFilters: { focusArea: '', person: '', priority: '', status: '' },
    editDropdown: null, showCreateCommitment: false, showCreateDecision: false,
    showSnoozeFor: null, showReassignFor: null, selectedOverdue: [],
    // factory
    factoryConfig: null, factoryConfigLoading: false,

    // Eager modules — always initialized
    ...createDashboardModule(),
    ...createCommandShellModule(),
    ...createChatModule(),

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
          const away = Date.now() - this._lastVisible;
          if (away > 60000 && this.view === 'dashboard') {
            this.loadDashboard();
          }
        }
      });

      document.addEventListener('click', (event) => {
        // Guard: commitments module may not be initialized yet when this fires
        if (typeof this.handleCommitmentDocumentClick === 'function') {
          this.handleCommitmentDocumentClick(event);
        }
      });

      // Auto-load dashboard on start
      if (window.innerWidth <= 768) {
        this.commitmentsView = 'list';
      }
      this.loadDashboard();

      // Auto-refresh dashboard every 5 minutes
      this.refreshIntervalId = setInterval(() => {
        this.loadDashboard();
      }, 300000);

      // Independent action queue refresh every 3 minutes — runs regardless of active view.
      // Uses silent mode (no loading spinner) so it doesn't disrupt other views.
      this._aqIntervalId = setInterval(() => {
        if (document.visibilityState === 'visible' && !this._requestControllers?.actionQueue) {
          this.loadActionQueue({ silent: true });
        }
      }, 180000);

      // Clean up intervals on page unload
      window.addEventListener('unload', () => {
        clearInterval(this.refreshIntervalId);
        clearInterval(this._aqIntervalId);
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

    scrollToBottom() {
      this.$nextTick(() => {
        const el = document.getElementById('messages');
        if (el) el.scrollTop = el.scrollHeight;
      });
    },

  };
}

window.app = app;
