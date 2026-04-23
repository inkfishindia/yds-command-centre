export function createCommandShellModule() {
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
      const partialViews = ['chat', 'overview', 'dashboard', 'actionQueue', 'focusArea', 'team', 'personView', 'docs', 'notion', 'knowledge', 'decisions', 'projects', 'registry', 'commitments', 'factory', 'marketingOps', 'techTeam', 'bmc', 'crm', 'ops', 'status', 'claude-usage', 'system-map', 'dan-colin'];
      this.view = action;
      this.tableSelectedRow = -1;
      if (partialViews.includes(action)) {
        await this.$nextTick();
      }
      // Ensure lazy module is initialized before Alpine binds injected partial DOM.
      await this._ensureModule(action);
      if (action === 'marketingOps') {
        await this._ensureModule('competitor-intel');
      }
      if (action === 'actionQueue') {
        // Action Queue cards reuse helpers from these lazy modules.
        await Promise.all([
          this._ensureModule('notion'),
          this._ensureModule('commitments'),
        ]);
      }
      if (partialViews.includes(action)) {
        await this._loadPartial(action);
      }
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
      else if (action === 'marketingOps') this.loadMarketingOps();
      else if (action === 'techTeam') this.loadTechTeam();
      else if (action === 'actionQueue') this.loadActionQueue();
      else if (action === 'factory' && !this.factoryConfig) this.loadFactoryConfig();
      else if (action === 'ops') this.loadOps();
      else if (action === 'status') this.loadSystemStatus();
      else if (action === 'claude-usage') this.loadClaudeUsage();
      else if (action === 'system-map') this.loadSystemMap();
      else if (action === 'dan-colin') this.loadDanColin();
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
        { label: 'System Status', icon: '▸', type: 'view', view: 'status', keywords: ['health', 'status', 'sync', 'read models'], action: () => this.openNavigationTarget('status') },
        { label: 'System Map', icon: '▸', type: 'view', view: 'system-map', keywords: ['map', 'architecture', 'routes', 'modules', 'databases', 'repo', 'docs'], action: () => this.openNavigationTarget('system-map') },
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
          label: 'Sync Read Models',
          icon: '⚡',
          type: 'action',
          action: async () => {
            await fetch('/api/health/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            if (this.view === 'status') await this.loadSystemStatus();
            if (this.view === 'overview') await this.loadOverview();
            this.showSuccess('Read models synced');
          },
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
    async cmdExecuteResult(result) {
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
        await result.action();
      } else if (result.view) {
        await this.openNavigationTarget(result.view);
      }

      this.closeCmdPalette();
    },

    // Legacy execute by index (keeps backward compat with getCmdResults)
    async cmdExecute(index) {
      const results = this.getCmdResults();
      const item = results[typeof index === 'number' ? index : this.cmdSelectedIndex];
      if (!item) {
        // If palette 2.0 is active, fall through to cmdResults
        const r2 = this.cmdResults[this.cmdSelectedIndex];
        if (r2) await this.cmdExecuteResult(r2);
        return;
      }

      if (item.action && typeof item.action === 'function') {
        await this.cmdExecuteResult(item);
        return;
      }

      if (item.action) {
        await this.openNavigationTarget(item.action);
      } else if (item.dbRef) {
        await this._ensureModule('notion');
        this.view = 'notion';
        this.openNotionDb(item.dbRef);
      } else if (item.pageRef) {
        await this._ensureModule('notion');
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
