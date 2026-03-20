/**
 * YDS Command Centre — Frontend Application
 * Uses Alpine.js for reactivity, marked.js for markdown rendering.
 */

import { configureMarkdown } from './modules/markdown.js';
import { createDashboardModule } from './modules/dashboard.js';

configureMarkdown();

function app() {
  return {
    // Navigation
    view: 'dashboard',

    // Connection status
    connected: false,

    // Chat state
    messages: [],
    inputText: '',
    streaming: false,
    streamingText: '',
    pendingApprovals: [],
    activeTools: [],

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

    ...createDashboardModule(),

    // Registry
    registry: null,
    registryLoading: false,
    registryFilter: '',
    registryTypeFilter: '',
    registryExpanded: null,

    // Knowledge Base
    notebooks: null,
    notebooksLoading: false,
    notebooksSearch: '',
    notebooksCategory: '',
    notebooksExpanded: null,

    // Marketing Ops
    mktops: null,
    mktopsLoading: false,
    mktopsSection: 'campaigns',
    mktopsCampaignSearch: '',
    mktopsStatusFilter: '',
    mktopsJourneyFilter: '',
    mktopsLastRefresh: null,
    mktopsSequenceView: 'table',
    mktopsActionLoading: null,
    mktopsCampaignCommitments: null,
    mktopsCampaignCommitmentsLoading: false,
    mktopsMetrics: null,
    mktopsMetricsExpanded: false,

    // Tech Team
    techTeam: null,
    techTeamLoading: false,
    techTeamSection: 'command',
    techTeamLastRefresh: null,
    techSystemFilter: '',
    techPriorityFilter: '',
    techTypeFilter: '',
    techSprintSearch: '',
    techActionLoading: null,
    techExpandedItem: null,
    techAgents: null,
    techStrategy: null,
    techGithub: null,

    // Projects
    projects: [],
    projectsLoading: false,
    projectsFilter: 'Active',
    projectsTypeFilter: '',
    expandedProject: null,

    // Team
    teamData: [],
    teamLoading: false,
    expandedTeamMember: null,

    // Commitments kanban
    commitments: [],
    commitmentsLoading: false,
    commitmentsView: 'kanban', // 'kanban' | 'list'
    commitmentFilters: { focusArea: '', person: '', priority: '', status: '' },

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

    // Inline action state (dashboard commitment rows)
    showSnoozeFor: null,
    showReassignFor: null,
    actionFeedback: null,

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

    // Documents
    documents: { briefings: [], decisions: [], 'weekly-reviews': [] },
    docsTab: 'briefings',
    docsLoading: false,
    activeDoc: null,

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

    // Detail panel (slide-in sidebar)
    detailPanel: null,

    // Command palette
    cmdPaletteOpen: false,
    cmdSearch: '',
    cmdSelectedIndex: 0,

    // Keyboard chord navigation
    _chordPending: null,
    _chordTimeout: null,

    // Visibility-based auto-refresh
    _lastVisible: Date.now(),
    _requestControllers: {},

    // Bulk overdue selection
    selectedOverdue: [],

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

      // Command palette keyboard shortcut + chord navigation
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          this.toggleCmdPalette();
        }
        if (e.key === 'Escape') {
          if (this._chordPending) {
            clearTimeout(this._chordTimeout);
            this._chordPending = null;
          } else if (this.cmdPaletteOpen) this.closeCmdPalette();
          else if (this.showCreateCommitment) { this.showCreateCommitment = false; }
          else if (this.showCreateDecision) { this.showCreateDecision = false; }
          else if (this.showSnoozeFor) { this.showSnoozeFor = null; }
          else if (this.showReassignFor) { this.showReassignFor = null; }
          else if (this.detailPanel) this.closeDetailPanel();
        }

        // Chord and single-key shortcuts — skip when typing in inputs
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        if (e.metaKey || e.ctrlKey || e.altKey) return;

        // Single-key: / opens command palette
        if (e.key === '/' && !this._chordPending) {
          e.preventDefault();
          this.toggleCmdPalette();
          return;
        }

        // Chord first key: g or n
        if ((e.key === 'g' || e.key === 'n') && !this._chordPending) {
          e.preventDefault();
          this._chordPending = e.key;
          this._chordTimeout = setTimeout(() => { this._chordPending = null; }, 500);
          return;
        }

        // Chord second key
        if (this._chordPending) {
          clearTimeout(this._chordTimeout);
          const chord = this._chordPending + e.key;
          this._chordPending = null;
          e.preventDefault();
          switch (chord) {
            case 'gh': this.view = 'dashboard'; this.loadDashboard(); break;
            case 'gt': this.view = 'team'; this.loadTeam(); break;
            case 'gq': this.view = 'actionQueue'; this.loadActionQueue(); break;
            case 'gp': this.view = 'projects'; this.loadProjects(); break;
            case 'gc': this.view = 'chat'; break;
            case 'gd': this.view = 'docs'; this.loadDocuments(); break;
            case 'gl': this.view = 'decisions'; this.loadDecisions(); break;
            case 'gr': this.view = 'registry'; this.loadRegistry(); break;
            case 'gk': this.view = 'knowledge'; this.loadNotebooks(); break;
            case 'gm': this.view = 'marketingOps'; this.loadMarketingOps(); break;
            case 'ge': this.view = 'techTeam'; this.loadTechTeam(); break;
            case 'nc': this.showCreateCommitment = true; break;
            case 'nd': this.showCreateDecision = true; break;
          }
        }
      });

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

      // Click outside closes edit dropdown
      document.addEventListener('click', (e) => {
        if (this.editDropdown && !e.target.closest('.edit-dropdown') && !e.target.closest('.editable-badge')) {
          this.editDropdown = null;
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

    // --- Chat ---

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

    async streamResponse(message, skill) {
      this.streaming = true;
      this.streamingText = '';
      this.activeTools = [];

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, skill }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

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
                    this.pendingApprovals.push(data);
                    this.scrollToBottom();
                    break;
                  case 'tool_use':
                    this.activeTools = [...this.activeTools, data].slice(-3);
                    break;
                  case 'error':
                    this.streamingText += `\n\n**Error:** ${data.error}`;
                    break;
                  case 'done':
                    // Stream complete
                    break;
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
              currentEventType = 'message'; // Reset after processing
            }
          }
        }

        // Finalize — move streaming text to messages
        if (this.streamingText) {
          this.messages.push({ role: 'assistant', content: this.streamingText });
        }
      } catch (err) {
        console.error('Chat error:', err);
        this.messages.push({
          role: 'assistant',
          content: `**Connection error:** ${err.message}. Check that the server is running.`,
        });
      } finally {
        this.streaming = false;
        this.streamingText = '';
        this.activeTools = [];
        this.pendingApprovals = [];
        this.scrollToBottom();
      }
    },

    async resolveApproval(approvalId, approved) {
      // Mark as processing to prevent double-clicks
      const approval = this.pendingApprovals.find(a => a.approvalId === approvalId);
      if (approval) approval.resolving = true;
      try {
        const res = await fetch('/api/chat/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId, approved }),
        });
        if (!res.ok) throw new Error('Server rejected approval');
        this.pendingApprovals = this.pendingApprovals.filter(a => a.approvalId !== approvalId);
      } catch (err) {
        console.error('Approval error:', err);
        if (approval) {
          approval.resolving = false;
          approval.error = 'Failed — try again';
        }
      }
    },

    async clearChat() {
      try {
        await fetch('/api/chat/clear', { method: 'POST' });
        this.messages = [];
        this.pendingApprovals = [];
        this.streamingText = '';
      } catch (err) {
        console.error('Clear error:', err);
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

    // --- Registry ---

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
      if (this.registryFilter) projects = projects.filter(p => p.status === this.registryFilter);
      if (this.registryTypeFilter) projects = projects.filter(p => p.type === this.registryTypeFilter);
      return projects;
    },

    getRegistryStatusClass(status) {
      const map = { 'active': 'reg-active', 'in-progress': 'reg-building', 'back-burner': 'reg-paused', 'not-started': 'reg-planned' };
      return map[status] || '';
    },

    getRegistryTypeLabel(type) {
      const map = { 'agent-system': 'AI Team', 'app': 'App', 'backend': 'Backend', 'knowledge-base': 'Knowledge', 'integration': 'Integration' };
      return map[type] || type;
    },

    getRegistryTypeClass(type) {
      const map = { 'agent-system': 'reg-type-agent', 'app': 'reg-type-app', 'backend': 'reg-type-backend', 'knowledge-base': 'reg-type-knowledge', 'integration': 'reg-type-integration' };
      return map[type] || '';
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

    // --- Marketing Ops ---

    async loadMarketingOps() {
      const signal = this.beginRequest('mktops');
      this.mktopsLoading = true;
      try {
        const [data, metricsRes] = await Promise.all([
          fetch('/api/marketing-ops', { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/marketing-ops/metrics', { signal }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);
        if (!data) return;
        this.mktops = data;
        this.mktopsMetrics = metricsRes ? Object.values(metricsRes).map(m => ({ ...m })) : null;
        this.mktopsLastRefresh = new Date();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.error('Marketing ops error:', e);
      } finally {
        this.mktopsLoading = false;
        this.endRequest('mktops', signal);
      }
    },

    getCampaignsByStage(stage) {
      if (!this.mktops?.campaigns) return [];
      return this.mktops.campaigns.filter(c => {
        if (c.Stage !== stage) return false;
        if (this.mktopsStatusFilter && c.Status !== this.mktopsStatusFilter) return false;
        if (this.mktopsCampaignSearch) {
          const q = this.mktopsCampaignSearch.toLowerCase();
          const name = (c.Name || '').toLowerCase();
          const owners = (c.ownerNames || []).join(' ').toLowerCase();
          if (!name.includes(q) && !owners.includes(q)) return false;
        }
        return true;
      });
    },

    getContentByStatus(status) {
      if (!this.mktops?.content) return [];
      return this.mktops.content.filter(c => c.Status === status);
    },

    getSequenceHealth(seq) {
      if ((seq['Unsub Rate'] || 0) > 2) return 'critical';
      if ((seq['Open Rate'] || 100) < 15) return 'warning';
      return 'healthy';
    },

    getFilteredSequences() {
      if (!this.mktops?.sequences) return [];
      if (!this.mktopsJourneyFilter) return this.mktops.sequences;
      return this.mktops.sequences.filter(s => s['Journey Stage'] === this.mktopsJourneyFilter);
    },

    getMktopsRefreshLabel() {
      if (!this.mktopsLastRefresh) return '';
      const seconds = Math.floor((Date.now() - this.mktopsLastRefresh.getTime()) / 1000);
      if (seconds < 10) return 'Just now';
      if (seconds < 60) return seconds + 's ago';
      const minutes = Math.floor(seconds / 60);
      return minutes + 'm ago';
    },

    formatMktDate(dateVal) {
      if (!dateVal) return '';
      const d = typeof dateVal === 'string' ? dateVal : dateVal.start;
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    },

    getSequencesByJourneyStage(stage) {
      if (!this.mktops?.sequences) return [];
      return this.getFilteredSequences().filter(s => (s['Journey Stage'] || 'Awareness') === stage);
    },

    async campaignAction(id, property, value) {
      this.mktopsActionLoading = id;
      try {
        const res = await fetch(`/api/marketing-ops/campaigns/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property, value })
        });
        if (!res.ok) throw new Error('Action failed');
        await this.loadMarketingOps();
      } catch (e) {
        console.error('Campaign action failed:', e);
      } finally {
        this.mktopsActionLoading = null;
      }
    },

    getCampaignActions(c) {
      const actions = [];
      const stage = c.Stage || '';
      if (stage === 'Briefing') actions.push({ label: 'Start', property: 'Stage', value: 'In Progress' });
      if (stage === 'In Progress') actions.push({ label: 'To Review', property: 'Stage', value: 'Review' });
      if (stage === 'Review') actions.push({ label: 'Go Live', property: 'Stage', value: 'Live' });
      if (stage === 'Live') actions.push({ label: 'Complete', property: 'Stage', value: 'Complete' });
      if (c.Status !== 'Blocked') actions.push({ label: 'Block', property: 'Status', value: 'Blocked' });
      return actions;
    },

    async loadCampaignCommitments(id) {
      const signal = this.beginRequest('campaignCommitments');
      this.mktopsCampaignCommitmentsLoading = true;
      this.mktopsCampaignCommitments = null;
      try {
        const res = await fetch(`/api/marketing-ops/campaigns/${id}/commitments`, { signal });
        if (res.ok) this.mktopsCampaignCommitments = await res.json();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.error('Failed to load campaign commitments:', e);
      } finally {
        this.mktopsCampaignCommitmentsLoading = false;
        this.endRequest('campaignCommitments', signal);
      }
    },

    // --- Tech Team ---

    async loadTechTeam() {
      const signal = this.beginRequest('techTeam');
      this.techTeamLoading = true;
      try {
        const [data, agentsRes, strategyRes, githubRes] = await Promise.all([
          fetch('/api/tech-team', { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/tech-team/agents', { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/tech-team/strategy', { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch('/api/tech-team/github', { signal }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (!data) return;
        this.techTeam = data;
        this.techAgents = agentsRes;
        this.techStrategy = strategyRes;
        this.techGithub = githubRes;
        this.techTeamLastRefresh = new Date();
      } catch (e) {
        if (this.isAbortError(e)) return;
        console.error('Tech team error:', e);
      } finally {
        this.techTeamLoading = false;
        this.endRequest('techTeam', signal);
      }
    },

    getSprintItemsByStatus(status) {
      if (!this.techTeam?.sprintItems) return [];
      return this.techTeam.sprintItems.filter(i => {
        if (i.Status !== status) return false;
        if (this.techSystemFilter && i.System !== this.techSystemFilter) return false;
        if (this.techPriorityFilter && i.Priority !== this.techPriorityFilter) return false;
        if (this.techTypeFilter && i.Type !== this.techTypeFilter) return false;
        if (this.techSprintSearch) {
          const q = this.techSprintSearch.toLowerCase();
          const name = (i.Name || '').toLowerCase();
          const bugId = (i['Bug ID'] || '').toLowerCase();
          if (!name.includes(q) && !bugId.includes(q)) return false;
        }
        return true;
      });
    },

    getTechBugs() {
      if (!this.techTeam?.sprintItems) return [];
      return this.techTeam.sprintItems.filter(i => i.Type === 'Bug' && i.Status !== 'Cancelled');
    },

    getTechBugStats() {
      const bugs = this.getTechBugs().filter(b => b.Status !== 'Done');
      const stats = { total: bugs.length, byPriority: {}, bySystem: {} };
      bugs.forEach(b => {
        const p = b.Priority || 'Unset';
        const s = b.System || 'Unset';
        stats.byPriority[p] = (stats.byPriority[p] || 0) + 1;
        stats.bySystem[s] = (stats.bySystem[s] || 0) + 1;
      });
      return stats;
    },

    getSpecsByStatus(status) {
      if (!this.techTeam?.specs) return [];
      return this.techTeam.specs.filter(s => s.Status === status);
    },

    getRoadmapByHorizon(horizon) {
      if (!this.techTeam?.sprintItems) return [];
      return this.techTeam.sprintItems.filter(i => i.Horizon === horizon && i.Status !== 'Done' && i.Status !== 'Cancelled');
    },

    getVelocityData() {
      if (!this.techTeam?.sprintArchive) return [];
      return this.techTeam.sprintArchive.filter(s => s['Items Planned']).map(s => ({
        name: s['Sprint Name'] || `Sprint ${s['Sprint Number']}`,
        planned: s['Items Planned'] || 0,
        completed: s['Items Completed'] || 0,
        hoursPlanned: s['Total Hours Planned'] || 0,
        hoursCompleted: s['Total Hours Completed'] || 0,
        pct: s['Items Planned'] ? Math.round((s['Items Completed'] / s['Items Planned']) * 100) : 0,
      }));
    },

    getTechRefreshLabel() {
      if (!this.techTeamLastRefresh) return '';
      const mins = Math.floor((Date.now() - this.techTeamLastRefresh) / 60000);
      if (mins < 1) return 'Just now';
      return `${mins}m ago`;
    },

    async techSprintAction(id, property, value) {
      this.techActionLoading = id;
      try {
        const res = await fetch(`/api/tech-team/sprint/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property, value })
        });
        if (res.ok) await this.loadTechTeam();
      } catch (e) {
        console.error('Tech sprint action error:', e);
      } finally {
        this.techActionLoading = null;
      }
    },

    getTechSystems() {
      if (!this.techTeam?.sprintItems) return [];
      return [...new Set(this.techTeam.sprintItems.map(i => i.System).filter(Boolean))].sort();
    },

    getTechPriorityClass(priority) {
      if (!priority) return '';
      if (priority.startsWith('P0')) return 'tech-priority-critical';
      if (priority.startsWith('P1')) return 'tech-priority-high';
      if (priority.startsWith('P2')) return 'tech-priority-medium';
      return 'tech-priority-low';
    },

    getTechTypeClass(type) {
      if (!type) return '';
      return 'tech-type-' + type.toLowerCase();
    },

    // --- Projects ---

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
        filtered = filtered.filter(p => p.Status === this.projectsFilter);
      }
      if (this.projectsTypeFilter) {
        filtered = filtered.filter(p => p.Type === this.projectsTypeFilter);
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

    // Compute health signal from enriched focus area data
    getComputedHealth(area) {
      const overdue = area.overdueCount || 0;
      const blocked = area.blockedCount || 0;
      const open = area.commitmentCount || 0;
      const lastActivity = area.lastActivityDate || null;

      // Dormant: no open commitments at all
      if (open === 0) return { color: 'grey', label: 'Dormant' };

      // Days since last activity
      let daysSinceActivity = null;
      if (lastActivity) {
        const actDate = new Date(lastActivity + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        daysSinceActivity = Math.floor((today.getTime() - actDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Off Track: 3+ overdue OR 2+ blocked OR no activity for 14+ days
      if (overdue >= 3 || blocked >= 2 || (daysSinceActivity !== null && daysSinceActivity >= 14)) {
        return { color: 'red', label: 'Off Track' };
      }

      // At Risk: 1-2 overdue OR 1 blocked OR no activity 7-13 days
      if (overdue >= 1 || blocked >= 1 || (daysSinceActivity !== null && daysSinceActivity >= 7)) {
        return { color: 'amber', label: 'At Risk' };
      }

      // On Track: 0 overdue, 0 blocked, activity within 7 days
      return { color: 'green', label: 'On Track' };
    },

    // Sort focus areas: red → amber → green → grey, then overdueCount descending within group
    getSortedFocusAreas() {
      if (!this.dashboard || !this.dashboard.focusAreas) return [];
      const colorOrder = { red: 0, amber: 1, green: 2, grey: 3 };
      return [...this.dashboard.focusAreas].sort((a, b) => {
        const ha = this.getComputedHealth(a);
        const hb = this.getComputedHealth(b);
        const orderA = colorOrder[ha.color] ?? 4;
        const orderB = colorOrder[hb.color] ?? 4;
        if (orderA !== orderB) return orderA - orderB;
        // Within same health: overdueCount descending
        return (b.overdueCount || 0) - (a.overdueCount || 0);
      });
    },

    // Format a date string as "today", "2 days ago", "12 days ago"
    formatDaysAgo(dateStr) {
      if (!dateStr) return '—';
      const raw = typeof dateStr === 'object' && dateStr.start ? dateStr.start : String(dateStr);
      const dateOnly = raw.split('T')[0];
      const d = new Date(dateOnly + 'T00:00:00');
      if (isNaN(d)) return '—';
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return 'today';
      if (diffDays === 1) return '1 day ago';
      if (diffDays > 0) return diffDays + ' days ago';
      // Future date (edge case)
      if (diffDays === -1) return 'tomorrow';
      return Math.abs(diffDays) + ' days from now';
    },

    // --- Commitments Kanban ---

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
      return this.getFilteredCommitments().filter(c => (c.Status || 'Not Started') === status);
    },

    getFilteredCommitments() {
      let filtered = this.commitments;
      if (this.commitmentFilters.focusArea) {
        const fa = this.commitmentFilters.focusArea;
        filtered = filtered.filter(c => Array.isArray(c.focusAreaNames) && c.focusAreaNames.includes(fa));
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

    isCommitmentOverdue(c) {
      if (!c['Due Date']) return false;
      const raw = typeof c['Due Date'] === 'object' ? c['Due Date'].start : c['Due Date'];
      if (!raw) return false;
      const due = new Date(raw + 'T00:00:00');
      return due < new Date() && c.Status !== 'Done';
    },

    getCommitmentFilterOptions() {
      const focusAreas = new Set();
      const people = new Set();
      const priorities = new Set();
      for (const c of this.commitments) {
        if (c.focusAreaNames) c.focusAreaNames.forEach(n => n && focusAreas.add(n));
        if (c.assignedNames) c.assignedNames.forEach(n => n && people.add(n));
        if (c.Priority) priorities.add(c.Priority);
      }
      return {
        focusAreas: [...focusAreas].sort(),
        people: [...people].sort(),
        priorities: [...priorities].sort(),
      };
    },

    // === Commitment Write-Back ===

    async updateCommitmentField(commitmentId, field, newValue, apiPath) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldValue = commitment[field];
      commitment[field] = newValue;
      this.editDropdown = null;

      // Undo toast for status/priority only
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
          try { const err = await res.json(); msg = err.error || msg; } catch {}
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
          try { const err = await res.json(); msg = err.error || msg; } catch {}
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
          try { const err = await res.json(); msg = err.error || msg; } catch {}
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
          try { const err = await res.json(); msg = err.error || msg; } catch {}
          throw new Error(msg);
        }
        const result = await res.json();
        const commitment = this.commitments.find(c => c.id === commitmentId);
        if (commitment) commitment.Notes = result.notes;
        // Also update the detail panel if open
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

    // --- Dashboard Quick Actions ---

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

    // --- Bulk Overdue Actions ---

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
        } catch { /* continue */ }
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
        } catch { /* continue */ }
      }
      this.selectedOverdue = [];
      this.actionFeedback = { type: 'success', message: `${count} items snoozed +${days}d` };
      setTimeout(() => { this.actionFeedback = null; }, 3000);
      this.loadDashboard();
    },

    // --- Create Modals ---

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
          try { const err = await res.json(); msg = err.error || msg; } catch {}
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
          try { const err = await res.json(); msg = err.error || msg; } catch {}
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

    // --- Dropdown Management ---

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
      const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
      const nextFriday = new Date(today); nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
      const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today); nextMonth.setMonth(today.getMonth() + 1);

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

    // --- Undo Toast ---

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

    // --- Team ---

    async loadTeam() {
      const signal = this.beginRequest('team');
      this.expandedTeamMember = null;
      this.teamLoading = true;
      try {
        // Use enriched people from dashboard if already loaded (has workload data)
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

    // --- Documents ---

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

    // --- Notion Browser ---

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

      // Filter by search query
      if (this.notionSearchQuery.trim()) {
        const q = this.notionSearchQuery.toLowerCase().trim();
        entries = entries.filter(entry => {
          const name = this.getEntryName(entry).toLowerCase();
          const meta = this.getEntryMeta(entry).toLowerCase();
          return name.includes(q) || meta.includes(q);
        });
      }

      // Filter by status
      if (this.notionFilterStatus) {
        entries = entries.filter(entry => {
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

        // Fetch related pages in background
        fetch(`/api/notion/pages/${pageId}/related`, { signal: relatedSignal })
          .then(r => r.json())
          .then(data => { this.notionRelated = data.related || {}; })
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
        const d = entry['Due Date'];
        parts.push(`Due: ${typeof d === 'object' && d !== null && d.start ? d.start : d}`);
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
      return Object.entries(props).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0));
    },

    formatDate(val) {
      if (!val) return '—';
      const raw = typeof val === 'object' && val.start ? val.start : String(val);
      const dateOnly = raw.split('T')[0];
      const d = new Date(dateOnly + 'T00:00:00');
      if (isNaN(d)) return raw;
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatPropertyValue(value) {
      if (Array.isArray(value)) {
        if (value.length === 0) return '—';
        // Resolved relations arrive as [{id, name}] objects
        if (typeof value[0] === 'object' && value[0] !== null && value[0].name) {
          return value.map(r => r.name).join(', ');
        }
        // Fallback: raw UUID strings that weren't resolved
        if (typeof value[0] === 'string' && /^[0-9a-f-]{32,36}$/.test(value[0])) {
          return value.length + ' linked';
        }
        return value.join(', ');
      }
      if (value && typeof value === 'object' && value.start) {
        const fmt = this.formatDate(value);
        if (value.end) return `${fmt} → ${this.formatDate({ start: value.end })}`;
        return fmt;
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

    // --- Detail Panel ---

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

    // --- Command Palette ---

    toggleCmdPalette() {
      this.cmdPaletteOpen = !this.cmdPaletteOpen;
      this.cmdSearch = '';
      this.cmdSelectedIndex = 0;
      if (this.cmdPaletteOpen) {
        this.$nextTick(() => this.$refs.cmdInput?.focus());
      }
    },

    closeCmdPalette() {
      this.cmdPaletteOpen = false;
      this.cmdSearch = '';
      this.cmdSelectedIndex = 0;
    },

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
        { group: 'Navigation', label: 'Marketing Ops', action: 'marketingOps' },
        { group: 'Navigation', label: 'Tech Team', action: 'techTeam' },
        { group: 'Navigation', label: 'Notion', action: 'notion' },
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
      ]).map(p => ({ group: 'Key Pages', label: p.name, pageRef: p }));

      const skillItems = this.skills.map(s => ({
        group: 'Skills', label: `/${s.name} — ${s.description || ''}`, skillRef: s,
      }));

      const all = [...tabs, ...databases, ...keyPages, ...skillItems];

      // Add people from loaded team data
      if (this.teamData.length > 0) {
        this.teamData.forEach(p => {
          all.push({ group: 'People', label: p.Name || p.name || 'Unknown', personRef: p });
        });
      }

      // Add focus areas from dashboard
      if (this.dashboard && this.dashboard.focusAreas) {
        this.dashboard.focusAreas.forEach(fa => {
          all.push({ group: 'Focus Areas', label: fa.Name || fa.name || 'Unknown', focusAreaRef: fa });
        });
      }

      // Add overdue commitments from dashboard
      if (this.dashboard && this.dashboard.overdue) {
        this.dashboard.overdue.forEach(c => {
          const name = c.Name || c.name || 'Untitled';
          all.push({ group: 'Overdue', label: name, commitmentRef: c });
        });
      }

      // Add campaigns from marketing ops
      if (this.mktops && this.mktops.campaigns) {
        this.mktops.campaigns.forEach(c => {
          all.push({ group: 'Campaigns', label: c.Name || 'Untitled', campaignRef: c });
        });
      }

      // Add content from marketing ops
      if (this.mktops && this.mktops.content) {
        this.mktops.content.forEach(c => {
          all.push({ group: 'Content', label: c.Name || 'Untitled', contentRef: c });
        });
      }

      // Add sprint items from tech team
      if (this.techTeam?.sprintItems) {
        this.techTeam.sprintItems.slice(0, 50).forEach(item => {
          all.push({ group: 'Sprint Items', label: `${item['Bug ID'] ? item['Bug ID'] + ' ' : ''}${item.Name || 'Untitled'}`, techItemRef: item });
        });
      }

      if (!q) return all;
      return all.filter(item => item.label.toLowerCase().includes(q));
    },

    cmdNavigate(direction) {
      const results = this.getCmdResults();
      if (results.length === 0) return;
      this.cmdSelectedIndex = (this.cmdSelectedIndex + direction + results.length) % results.length;
    },

    cmdExecute(index) {
      const results = this.getCmdResults();
      const item = results[typeof index === 'number' ? index : this.cmdSelectedIndex];
      if (!item) return;

      if (item.action) {
        this.view = item.action;
        if (item.action === 'dashboard') this.loadDashboard();
        else if (item.action === 'projects') { if (!this.projects.length) this.loadProjects(); }
        else if (item.action === 'commitments') this.loadCommitments();
        else if (item.action === 'team') this.loadTeam();
        else if (item.action === 'docs') this.loadDocuments();
        else if (item.action === 'decisions') this.loadDecisions();
        else if (item.action === 'registry') this.loadRegistry();
        else if (item.action === 'knowledge') this.loadNotebooks();
        else if (item.action === 'marketingOps') this.loadMarketingOps();
        else if (item.action === 'techTeam') this.loadTechTeam();
        else if (item.action === 'notion') this.loadNotion();
      } else if (item.dbRef) {
        this.view = 'notion';
        this.openNotionDb(item.dbRef);
      } else if (item.pageRef) {
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
      } else if (item.campaignRef) {
        this.view = 'marketingOps';
        if (!this.mktops) this.loadMarketingOps();
        this.mktopsSection = 'campaigns';
        this.openDetailPanel(item.campaignRef.id, item.campaignRef.Name);
      } else if (item.contentRef) {
        this.view = 'marketingOps';
        if (!this.mktops) this.loadMarketingOps();
        this.mktopsSection = 'content';
        this.openDetailPanel(item.contentRef.id, item.contentRef.Name);
      } else if (item.techItemRef) {
        this.view = 'techTeam';
        this.loadTechTeam();
        this.techTeamSection = 'sprint';
      }

      this.closeCmdPalette();
    },

    // --- Team Workload ---

    getOverloadedCount() {
      if (!this.teamData || this.teamData.length === 0) return 0;
      return this.teamData.filter(p => (p.overdueCount || 0) >= 3 || (p.activeCommitmentCount || 0) >= 8).length;
    },

    getMaxWorkload() {
      if (!this.teamData || this.teamData.length === 0) return 1;
      return Math.max(...this.teamData.map(p => p.activeCommitmentCount || 0), 1);
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
        // Primary: overdueCount descending
        const overdueA = a.overdueCount || 0;
        const overdueB = b.overdueCount || 0;
        if (overdueB !== overdueA) return overdueB - overdueA;
        // Secondary: blockedCount descending
        const blockedA = a.blockedCount || 0;
        const blockedB = b.blockedCount || 0;
        if (blockedB !== blockedA) return blockedB - blockedA;
        // Tertiary: activeCommitmentCount descending
        return (b.activeCommitmentCount || 0) - (a.activeCommitmentCount || 0);
      });
    },

    getTeamMetrics() {
      if (!this.teamData || this.teamData.length === 0) {
        return { totalOpen: 0, totalOverdue: 0, mostLoaded: '—', unassigned: 0 };
      }
      const totalOpen = this.teamData.reduce((sum, p) => sum + (p.activeCommitmentCount || 0), 0);
      const totalOverdue = this.teamData.reduce((sum, p) => sum + (p.overdueCount || 0), 0);
      const mostLoaded = this.teamData.reduce((best, p) =>
        (p.activeCommitmentCount || 0) > (best.activeCommitmentCount || 0) ? p : best,
        this.teamData[0]
      );
      const unassigned = (this.dashboard && this.dashboard.unassignedCount != null)
        ? this.dashboard.unassignedCount
        : 0;
      return {
        totalOpen,
        totalOverdue,
        mostLoaded: mostLoaded ? (mostLoaded.Name || '—') : '—',
        unassigned,
      };
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

    // ── Factory View ──────────────────────────────────────────────────────────

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
      // Fallback hardcoded data
      const machines = [
        { id: "DTG-B1", name: "Brother DTG #1", type: "DTG", zone: "DTG", brand: "Brother", theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ["CURER-01"], is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "DTG-B2", name: "Brother DTG #2", type: "DTG", zone: "DTG", brand: "Brother", theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ["CURER-01"], is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "DTG-B3", name: "Brother DTG #3", type: "DTG", zone: "DTG", brand: "Brother", theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ["CURER-01"], is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "DTG-E1", name: "Epson DTG #1", type: "DTG", zone: "DTG", brand: "Epson", theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 55, avg_changeover_min: 25, depends_on: ["CURER-01"], is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "DTG-E2", name: "Epson DTG #2", type: "DTG", zone: "DTG", brand: "Epson", theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 55, avg_changeover_min: 25, depends_on: ["CURER-01"], is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "CURER-01", name: "MAX Curer", type: "CURER", zone: "DTG", brand: "MAX", theoretical_pcs_per_hour: 20, cycle_time_minutes: 3, mandatory_maintenance_min: 0, avg_changeover_min: 0, is_shared: false, is_sub_bottleneck: true, status: "ACTIVE" },
        { id: "PRETREAT-01", name: "Pretreatment Machine", type: "PRETREAT", zone: "DTG", brand: "Unknown", theoretical_pcs_per_hour: 30, cycle_time_minutes: 2, mandatory_maintenance_min: 10, avg_changeover_min: 0, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "DTF-01", name: "Custom DTF Printer", type: "DTF", zone: "DTF", brand: "Custom", theoretical_pcs_per_hour: 10, cycle_time_minutes: 6, mandatory_maintenance_min: 30, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "SUB-E1", name: "Epson Sublimation Printer", type: "SUBLIMATION", zone: "SUB", brand: "Epson", theoretical_pcs_per_hour: 8, cycle_time_minutes: 8, mandatory_maintenance_min: 15, avg_changeover_min: 15, is_shared: false, is_sub_bottleneck: true, status: "ACTIVE" },
        { id: "SUB-MUG12", name: "12-Mug Vacuum Press", type: "HEAT_PRESS", zone: "SUB", brand: "Unknown", theoretical_pcs_per_hour: 72, cycle_time_minutes: 10, mandatory_maintenance_min: 5, avg_changeover_min: 5, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "VNL-01", name: "Roland Print-and-Cut", type: "VINYL", zone: "VNL", brand: "Roland", theoretical_pcs_per_hour: 6, cycle_time_minutes: 10, mandatory_maintenance_min: 10, avg_changeover_min: 15, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "EMB-T1", name: "Tajima Embroidery #1", type: "EMBROIDERY", zone: "EMB", brand: "Tajima", theoretical_pcs_per_hour: 4, cycle_time_minutes: 15, mandatory_maintenance_min: 15, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "EMB-T2", name: "Tajima Embroidery #2", type: "EMBROIDERY", zone: "EMB", brand: "Tajima", theoretical_pcs_per_hour: 4, cycle_time_minutes: 15, mandatory_maintenance_min: 15, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "SCR-01", name: "Single-Head Screen Press", type: "SCREEN_PRINT", zone: "SCR", brand: "Unknown", theoretical_pcs_per_hour: 20, cycle_time_minutes: 3, mandatory_maintenance_min: 0, avg_changeover_min: 60, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "SCR-06", name: "6-Head Screen Press", type: "SCREEN_PRINT", zone: "SCR", brand: "Unknown", theoretical_pcs_per_hour: 50, cycle_time_minutes: 1.2, mandatory_maintenance_min: 0, avg_changeover_min: 45, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "SCR-08", name: "8-Head Screen Press", type: "SCREEN_PRINT", zone: "SCR", brand: "Unknown", theoretical_pcs_per_hour: 75, cycle_time_minutes: 0.8, mandatory_maintenance_min: 0, avg_changeover_min: 45, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "SCR-12", name: "12-Head Screen Press", type: "SCREEN_PRINT", zone: "SCR", brand: "Unknown", theoretical_pcs_per_hour: 100, cycle_time_minutes: 0.6, mandatory_maintenance_min: 0, avg_changeover_min: 60, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "LASER-01", name: "Laser Engraver", type: "LASER", zone: "LASER", brand: "Unknown", theoretical_pcs_per_hour: 12, cycle_time_minutes: 5, mandatory_maintenance_min: 10, avg_changeover_min: 10, is_shared: false, is_sub_bottleneck: false, status: "ACTIVE" },
        { id: "FUSE-01", name: "Flat Fusing Press #1", type: "HEAT_PRESS", zone: "FUSING", brand: "Unknown", is_shared: true, shared_with: ["DTG", "DTF", "SUB"], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: "ACTIVE" },
        { id: "FUSE-02", name: "Flat Fusing Press #2", type: "HEAT_PRESS", zone: "FUSING", brand: "Unknown", is_shared: true, shared_with: ["DTG", "DTF", "SUB"], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: "ACTIVE" },
        { id: "FUSE-03", name: "Flat Fusing Press #3", type: "HEAT_PRESS", zone: "FUSING", brand: "Unknown", is_shared: true, shared_with: ["DTG", "DTF", "SUB"], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: "ACTIVE" },
        { id: "FUSE-04", name: "Flat Fusing Press #4", type: "HEAT_PRESS", zone: "FUSING", brand: "Unknown", is_shared: true, shared_with: ["DTG", "DTF", "SUB"], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: "ACTIVE" },
      ];

      const zones = [
        { id: "DTG",     name: "DTG Bay",         method: "Direct-to-Garment",            operators: 2 },
        { id: "DTF",     name: "DTF Bay",          method: "Direct-to-Film",               operators: 1 },
        { id: "SUB",     name: "Sublimation Bay",  method: "Sublimation",                  operators: 1 },
        { id: "VNL",     name: "Vinyl Bay",        method: "Vinyl Print & Cut",            operators: 1 },
        { id: "EMB",     name: "Embroidery Bay",   method: "Embroidery",                   operators: 1 },
        { id: "SCR",     name: "Screen Print Bay", method: "Screen Printing",              operators: 2 },
        { id: "LASER",   name: "Laser Bay",        method: "Laser Engraving",              operators: 1 },
        { id: "QC_PACK", name: "QC + Packing",     method: "Quality Control & Packing",    operators: 2 },
      ];

      const orderMix = { DTG: 0.55, DTF: 0.15, SUB: 0.10, EMB: 0.10, VNL: 0.05, SCR: 0.05 };

      const assumptions = {
        shift_hours: 8,
        orders_per_day: 40,
        avg_pieces_per_order: 3.5,
        efficiency_factor: 0.70,
        qc_combined_minutes_per_piece: 7,
        qc_efficiency: 0.74,
        qc_separated: false,
      };

      return { machines, zones, orderMix, assumptions };
    },

    calculateFactoryCapacity(simConfig = null) {
      const { machines: rawMachines, zones: rawZones, orderMix: rawOrderMix, assumptions } = this.getFactoryData();

      // ── Apply sim overrides ────────────────────────────────────────────────
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

      // Build working machine list (apply enable/disable overrides)
      const machines = rawMachines.map(m => {
        const enabled = cfg.machine_overrides[m.id] !== false;
        let tph = m.theoretical_pcs_per_hour;
        // Apply process improvement multipliers
        if (m.id === 'CURER-01' && cfg.curer_stagger) tph *= 1.3;
        if (m.id === 'DTF-01'   && cfg.dtf_parallel)  tph *= 1.4;
        if (m.id === 'VNL-01'   && cfg.gang_cutting)  tph *= 2.0;
        return { ...m, theoretical_pcs_per_hour: tph, _enabled: enabled };
      });

      // Build working zones (apply QC operator override)
      const zones = rawZones.map(z => {
        if (z.id === 'QC_PACK') return { ...z, operators: cfg.qc_operators };
        return z;
      });

      // Order mix: normalise so values are fractions (0–1)
      const orderMix = cfg.method_split;

      const shift_hours = assumptions.shift_hours;
      const orders_per_day = cfg.orders_per_day;
      const avg_pieces_per_order = cfg.avg_pieces_per_order;
      const efficiency_factor = cfg.efficiency;
      const shift_minutes = shift_hours * 60;
      const total_daily_pieces = orders_per_day * avg_pieces_per_order;

      // ── Machine-level realistic capacity ────────────────────────────────────
      const supportMachineTypes = new Set(["CURER", "PRETREAT"]);
      const machineCapacity = {};
      machines.forEach(m => {
        if (!m._enabled) { machineCapacity[m.id] = 0; return; }
        const available = shift_minutes - m.mandatory_maintenance_min - m.avg_changeover_min;
        const eff = supportMachineTypes.has(m.type) ? 1.0 : efficiency_factor;
        const realistic = m.theoretical_pcs_per_hour * (available / 60) * eff;
        machineCapacity[m.id] = Math.max(0, realistic);
      });

      // ── Zone-level calculations ──────────────────────────────────────────────
      const supportTypes = new Set(["CURER", "PRETREAT", "HEAT_PRESS"]);

      const zoneResults = zones.map(zone => {
        if (zone.id === "QC_PACK") {
          // QC+Pack is people-based — uses validated 0.74 efficiency (not the machine efficiency slider)
          const qc_efficiency = 0.74;
          let capacity;
          if (cfg.qc_separated) {
            // Separated mode: split operators across QC and packing in parallel
            // Each station handles 3.5 min/piece (vs 7 min combined)
            const qc_staff   = Math.ceil(zone.operators / 2);
            const pack_staff  = Math.floor(zone.operators / 2);
            const qc_cap   = qc_staff   * (shift_minutes / 3.5);
            const pack_cap  = pack_staff  * (shift_minutes / 3.5);
            capacity = Math.min(qc_cap, pack_cap) * qc_efficiency;
          } else {
            // Combined: each operator handles both QC + packing (7 min/piece total)
            const qc_combined_minutes_per_piece = 7;
            capacity = zone.operators * (shift_minutes / qc_combined_minutes_per_piece) * qc_efficiency;
          }
          const demand = total_daily_pieces;
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

        const zoneMachines = machines.filter(m => m.zone === zone.id);
        const productionMachines = zoneMachines.filter(m => !supportTypes.has(m.type));
        const subBottleneck = zoneMachines.find(m => m.is_sub_bottleneck);

        const rawSum = productionMachines.reduce((sum, m) => sum + machineCapacity[m.id], 0);

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
        const demand = total_daily_pieces * mix;
        const safeCapacity = Math.max(1, Math.round(effectiveCapacity));
        const load = demand > 0 ? demand / safeCapacity : 0;

        return {
          ...zone,
          capacity: safeCapacity,
          demand: Math.round(demand),
          load,
          status: this._factoryLoadStatus(load),
          machines: zoneMachines.map(m => ({
            ...m,
            realistic_daily: Math.round(machineCapacity[m.id]),
            _enabled: m._enabled,
          })),
          sub_bottleneck: cappedBy,
          is_people_based: false,
        };
      });

      // ── Shift multiplier ─────────────────────────────────────────────────────
      if (cfg.shifts === 2) {
        const mult = 1 + cfg.second_shift_efficiency;
        zoneResults.forEach(z => {
          z.capacity = Math.round(z.capacity * mult);
        });
      }

      // ── Binding constraint ───────────────────────────────────────────────────
      // Recalculate load after potential shift adjustment
      zoneResults.forEach(z => {
        z.load = z.demand > 0 ? z.demand / z.capacity : 0;
        z.status = this._factoryLoadStatus(z.load);
      });
      const bindingZone = zoneResults.reduce((max, z) => z.load > max.load ? z : max, zoneResults[0]);

      // ── Shared resource (Fusing Bay) contention ──────────────────────────────
      const fusingMachines = machines.filter(m => m.zone === "FUSING");
      const fusingTotalCapacity = fusingMachines.reduce((sum, m) => {
        if (!m._enabled) return sum;
        const avail = shift_minutes - m.mandatory_maintenance_min - m.avg_changeover_min;
        return sum + m.theoretical_pcs_per_hour * (avail / 60);
      }, 0);

      const dtgDemand  = total_daily_pieces * (orderMix.DTG || 0);
      const dtfDemand  = total_daily_pieces * (orderMix.DTF || 0);
      const subDemand  = total_daily_pieces * (orderMix.SUB || 0);
      const fusingDemand = (dtgDemand * 0.5 * 1) + (dtfDemand * 2) + (subDemand * 1);
      const safeFusing = Math.max(1, fusingTotalCapacity);
      const fusingContention = fusingDemand / safeFusing;

      const curerCapacity = machineCapacity["CURER-01"] || 1;
      const curerUtilisation = dtgDemand / curerCapacity;

      const pretreatCapacity = machineCapacity["PRETREAT-01"] || 1;
      const pretreatUtilisation = (dtgDemand * 0.5) / pretreatCapacity;

      const sharedResources = [
        {
          id: "FUSING",
          name: "Fusing Bay (4 Presses)",
          capacity: Math.round(fusingTotalCapacity),
          demand: Math.round(fusingDemand),
          contention: fusingContention,
          status: this._factoryLoadStatus(fusingContention),
          note: "Shared by DTG (dark), DTF (×2), SUB",
        },
        {
          id: "CURER-01",
          name: "MAX Curer",
          capacity: Math.round(curerCapacity),
          demand: Math.round(dtgDemand),
          contention: curerUtilisation,
          status: this._factoryLoadStatus(curerUtilisation),
          note: "Caps entire DTG zone output",
        },
        {
          id: "PRETREAT-01",
          name: "Pretreat Machine",
          capacity: Math.round(pretreatCapacity),
          demand: Math.round(dtgDemand * 0.5),
          contention: pretreatUtilisation,
          status: this._factoryLoadStatus(pretreatUtilisation),
          note: "Used for DTG dark garments only (~50%)",
        },
      ];

      // ── Constraint cascade ───────────────────────────────────────────────────
      const constraintCascade = zoneResults
        .filter(z => z.demand > 0)
        .slice()
        .sort((a, b) => b.load - a.load)
        .map(z => ({
          ...z,
          fix: this._constraintFix(z.id, z.load),
        }));

      // Use actual assumptions values for display (but override with sim values when active)
      const displayAssumptions = {
        ...assumptions,
        orders_per_day: cfg.orders_per_day,
        avg_pieces_per_order: cfg.avg_pieces_per_order,
        efficiency_factor: cfg.efficiency,
      };

      return {
        zones: zoneResults,
        bindingZone,
        factoryThroughput: Math.min(bindingZone.capacity, total_daily_pieces),
        totalPossible: total_daily_pieces,
        sharedResources,
        constraintCascade,
        assumptions: displayAssumptions,
        total_daily_pieces,
      };
    },

    // ── Simulation helpers ─────────────────────────────────────────────────────

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
        orders_per_day: 40, avg_pieces_per_order: 3.5,
        method_split: { DTG: 55, DTF: 15, SUB: 10, EMB: 10, VNL: 5, SCR: 5 },
        efficiency: 70, qc_operators: 2, qc_separated: false, machine_overrides: {},
        curer_stagger: false, dtf_parallel: false, gang_cutting: false, shifts: 1, second_shift_efficiency: 85,
      };
      const presets = {
        'current':          { ...base },
        'qc_fixed':         { ...base, qc_operators: 4, qc_separated: true },
        'phase3':           { ...base, orders_per_day: 70, qc_operators: 4, qc_separated: true, curer_stagger: true },
        'growth':           { ...base, orders_per_day: 120, efficiency: 75, qc_operators: 6, qc_separated: true, curer_stagger: true, dtf_parallel: true, gang_cutting: true },
        '20cr':             { ...base, orders_per_day: 200, efficiency: 75, qc_operators: 8, qc_separated: true, curer_stagger: true, dtf_parallel: true, gang_cutting: true },
        'machine_down_dtg': { ...base, machine_overrides: { 'DTG-B1': false } },
        'machine_down_dtf': { ...base, machine_overrides: { 'DTF-01': false } },
        'qc_absent':        { ...base, qc_operators: 1 },
        'monsoon':          { ...base, efficiency: 60 },
        'second_shift':     { ...base, shifts: 2, second_shift_efficiency: 85 },
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
        method_split: Object.fromEntries(
          Object.entries(cfg.method_split).map(([k, v]) => [k, v / 100])
        ),
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
      const m = this.factorySimConfig.method_split;
      return (m.DTG || 0) + (m.DTF || 0) + (m.SUB || 0) + (m.EMB || 0) + (m.VNL || 0) + (m.SCR || 0);
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

    // View helpers (called from HTML — no nested x-data needed)
    getFactoryCap() {
      return this.getSimulatedCapacity();
    },
    getFactoryBaseCap() {
      if (!this._factoryBaseCache) this._factoryBaseCache = this.calculateFactoryCapacity();
      return this._factoryBaseCache;
    },
    factoryBarWidth(load) {
      return Math.min(load * 100, 100).toFixed(1) + '%';
    },
    factoryBarLabel(load) {
      return Math.round(load * 100) + '%';
    },

    _factoryLoadStatus(load) {
      if (load >= 1.0)  return "OVER";
      if (load >= 0.85) return "AT_RISK";
      if (load >= 0.70) return "APPROACHING";
      return "OK";
    },

    _constraintFix(zoneId, load) {
      const fixes = {
        QC_PACK: "Add 2 staff, separate QC and packing stations — unlocks full 140 pcs/day throughput",
        DTG:     "Implement stagger-loading protocol on MAX Curer (+30% throughput)",
        EMB:     "Add a third Tajima head or run split shifts — EMB is 56% loaded",
        DTF:     "DTF is within safe range; monitor if mix shifts above 20%",
        SUB:     "Sublimation is within safe range; printer is the limit, not the press",
        VNL:     "Vinyl is lightly loaded; no action needed",
        SCR:     "Screen Print has significant headroom; capacity far exceeds demand",
        LASER:   "Laser is not in current order mix; track when laser orders begin",
      };
      return fixes[zoneId] || "Monitor load ratio";
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

    // ── Factory config API ──────────────────────────────────────────────────

    async loadFactoryConfig() {
      if (this.factoryConfigLoading) return;
      this.factoryConfigLoading = true;
      try {
        const res = await fetch('/api/factory/config');
        if (!res.ok) throw new Error('Failed to load factory config');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
      } catch (e) {
        console.warn('Factory config load failed, using hardcoded data:', e.message);
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
      } catch (e) {
        console.error('saveFactoryMachine error:', e);
        this.factoryError = 'Failed to save — check console';
        setTimeout(() => this.factoryError = null, 3000);
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
      } catch (e) {
        console.error('saveFactoryZone error:', e);
        this.factoryError = 'Failed to save — check console';
        setTimeout(() => this.factoryError = null, 3000);
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
      } catch (e) {
        console.error('saveFactoryOperating error:', e);
        this.factoryError = 'Failed to save — check console';
        setTimeout(() => this.factoryError = null, 3000);
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
      } catch (e) {
        console.error('addFactoryMachine error:', e);
      }
    },

    async deleteFactoryMachine(machineId) {
      try {
        const res = await fetch(`/api/factory/machines/${machineId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
      } catch (e) {
        console.error('deleteFactoryMachine error:', e);
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
      const e = this.factoryMachineEdits;
      if (e.name !== undefined) updates.name = e.name;
      if (e.theoretical_pcs_per_hour !== undefined) updates.theoretical_pcs_per_hour = parseFloat(e.theoretical_pcs_per_hour);
      if (e.available_minutes !== null && e.available_minutes !== undefined) updates.available_minutes = parseFloat(e.available_minutes);
      if (e.efficiency_factor !== null && e.efficiency_factor !== undefined) updates.efficiency_factor = parseFloat(e.efficiency_factor);
      if (e.notes !== undefined) updates.notes = e.notes;
      if (e.formula !== undefined) updates.formula = e.formula;
      if (e.rules !== undefined) updates.rules = e.rules;
      if (this.factoryConfig) {
        this.saveFactoryMachine(machineId, updates);
      } else {
        // Optimistic update on hardcoded data is not possible; just cancel
        this.factoryEditingMachine = null;
      }
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
      const e = this.factoryZoneEdits;
      if (e.operators !== undefined) updates.operators = parseInt(e.operators);
      if (e.notes !== undefined) updates.notes = e.notes;
      if (e.formula !== undefined) updates.formula = e.formula;
      if (e.rules !== undefined) updates.rules = e.rules;
      if (this.factoryConfig) {
        this.saveFactoryZone(zoneId, updates);
      } else {
        this.factoryEditingZone = null;
      }
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
      const e = this.factoryOperatingEdits;
      const updates = {
        shift_hours: parseFloat(e.shift_hours),
        orders_per_day: parseInt(e.orders_per_day),
        avg_pieces_per_order: parseFloat(e.avg_pieces_per_order),
      };
      if (this.factoryConfig) {
        this.saveFactoryOperating(updates);
      } else {
        this.factoryEditingOperating = false;
      }
    },
  };
}

window.app = app;
