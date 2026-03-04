/**
 * YDS Command Centre — Frontend Application
 * Uses Alpine.js for reactivity, marked.js for markdown rendering.
 */

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

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

    // Dashboard
    dashboard: null,
    dashboardLoading: false,
    upcomingCommitments: [],
    expandedDecision: null,

    // Projects
    projects: [],
    projectsLoading: false,
    projectsFilter: 'Active',
    projectsTypeFilter: '',

    // Team
    teamData: [],
    teamLoading: false,
    expandedTeamMember: null,

    // Commitments kanban
    commitments: [],
    commitmentsLoading: false,
    commitmentsView: 'kanban', // 'kanban' | 'list'
    commitmentFilters: { focusArea: '', person: '', priority: '', status: '' },

    // Decisions date filter
    decisionDateRange: 'all', // 'week' | 'month' | '3months' | 'all'

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

      // Command palette keyboard shortcut
      document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          this.toggleCmdPalette();
        }
        if (e.key === 'Escape') {
          if (this.cmdPaletteOpen) this.closeCmdPalette();
          else if (this.detailPanel) this.closeDetailPanel();
        }
      });

      // Auto-load dashboard on start
      this.loadDashboard();
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

    // --- Dashboard ---

    async loadDashboard() {
      this.expandedDecision = null;
      this.dashboardLoading = true;
      try {
        const res = await fetch('/api/notion/dashboard');
        this.dashboard = await res.json();
        this.upcomingCommitments = this.dashboard.upcoming || [];
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        this.dashboardLoading = false;
      }
    },

    // --- Projects ---

    async loadProjects() {
      this.projectsLoading = true;
      try {
        const res = await fetch('/api/notion/projects');
        const data = await res.json();
        this.projects = data.projects || [];
      } catch (err) {
        console.error('Projects load error:', err);
      } finally {
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

    getFocusHealthClass(area) {
      const health = (area.Health || area.Status || '').toLowerCase();
      if (health.includes('attention')) return 'focus-attention';
      if (health.includes('paused') || health.includes('hold')) return 'focus-paused';
      if (health.includes('needs improvement')) return 'focus-needs-improvement';
      return '';
    },

    // --- Commitments Kanban ---

    async loadCommitments() {
      this.commitmentsLoading = true;
      try {
        const res = await fetch('/api/notion/commitments/all');
        const data = await res.json();
        this.commitments = data.commitments || [];
      } catch (err) {
        console.error('Commitments load error:', err);
      } finally {
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

    // --- Team ---

    async loadTeam() {
      this.expandedTeamMember = null;
      this.teamLoading = true;
      try {
        // Use enriched people from dashboard if already loaded (has workload data)
        if (this.dashboard && this.dashboard.people && this.dashboard.people.length) {
          this.teamData = this.dashboard.people;
        } else {
          const res = await fetch('/api/notion/people');
          const data = await res.json();
          this.teamData = data.people;
        }
      } catch (err) {
        console.error('Team error:', err);
      } finally {
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
      this.docsLoading = true;
      try {
        const res = await fetch('/api/documents');
        this.documents = await res.json();
      } catch (err) {
        console.error('Documents error:', err);
      } finally {
        this.docsLoading = false;
      }
    },

    async openDocument(category, filename) {
      try {
        const res = await fetch(`/api/documents/${category}/${encodeURIComponent(filename)}`);
        this.activeDoc = await res.json();
      } catch (err) {
        console.error('Document open error:', err);
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
      this.notionLoading = true;
      this.notionActiveDb = null;
      this.notionActivePage = null;
      this.notionPageContent = '';
      try {
        const [dbRes, kpRes] = await Promise.all([
          fetch('/api/notion/databases'),
          fetch('/api/notion/key-pages'),
        ]);
        const dbData = await dbRes.json();
        const kpData = await kpRes.json();
        this.notionDatabases = dbData.databases;
        this.notionKeyPages = kpData.pages;
      } catch (err) {
        console.error('Notion load error:', err);
      } finally {
        this.notionLoading = false;
      }
    },

    async openNotionDb(db) {
      this.notionLoading = true;
      this.notionActiveDb = db;
      this.notionActivePage = null;
      this.notionPageContent = '';
      this.notionEntries = [];
      this.notionSearchQuery = '';
      this.notionFilterStatus = '';
      try {
        const res = await fetch(`/api/notion/databases/${db.id}`);
        const data = await res.json();
        this.notionEntries = data.results;
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        console.error('Database query error:', err);
      } finally {
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
      this.notionLoading = true;
      try {
        const res = await fetch(`/api/notion/databases/${this.notionActiveDb.id}?cursor=${this.notionNextCursor}`);
        const data = await res.json();
        this.notionEntries = [...this.notionEntries, ...data.results];
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        console.error('Load more error:', err);
      } finally {
        this.notionLoading = false;
      }
    },

    async openNotionPage(pageId, pageName) {
      this.notionLoading = true;
      this.notionActivePage = { id: pageId, name: pageName || 'Loading...' };
      this.notionPageContent = '';
      this.notionRelated = {};
      this.notionRelatedLoading = true;
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`),
          fetch(`/api/notion/pages/${pageId}/content`),
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
        fetch(`/api/notion/pages/${pageId}/related`)
          .then(r => r.json())
          .then(data => { this.notionRelated = data.related || {}; })
          .catch(() => { this.notionRelated = {}; })
          .finally(() => { this.notionRelatedLoading = false; });
      } catch (err) {
        console.error('Page load error:', err);
        this.notionPageContent = '*Failed to load page content*';
        this.notionRelatedLoading = false;
      } finally {
        this.notionLoading = false;
      }
    },

    notionBack() {
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
      this.detailPanel = { id: pageId, name: pageName || 'Loading...', loading: true, properties: null, content: null, url: null };
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`),
          fetch(`/api/notion/pages/${pageId}/content`),
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
        console.error('Detail panel error:', err);
        if (this.detailPanel) {
          this.detailPanel.loading = false;
          this.detailPanel.content = '*Failed to load*';
        }
      }
    },

    closeDetailPanel() {
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
      }

      this.closeCmdPalette();
    },

    // --- Team Workload ---

    getMaxWorkload() {
      if (!this.teamData || this.teamData.length === 0) return 1;
      return Math.max(...this.teamData.map(p => p.activeCommitmentCount || 0), 1);
    },

    getWorkloadPercent(count) {
      const max = this.getMaxWorkload();
      return max === 0 ? 0 : Math.round((count / max) * 100);
    },

    getSortedTeamByWorkload() {
      return [...this.teamData].sort((a, b) => (b.activeCommitmentCount || 0) - (a.activeCommitmentCount || 0));
    },

    // --- Decision Date Filter ---

    getFilteredDecisions() {
      if (!this.dashboard || !this.dashboard.recentDecisions) return [];
      if (this.decisionDateRange === 'all') return this.dashboard.recentDecisions;

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

      return this.dashboard.recentDecisions.filter(d => {
        const raw = d.Date && typeof d.Date === 'object' ? d.Date.start : d.Date;
        if (!raw) return this.decisionDateRange === 'all';
        return new Date(raw) >= cutoff;
      });
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
