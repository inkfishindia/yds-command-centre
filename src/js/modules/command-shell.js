export function createCommandShellModule() {
  return {
    // Command palette
    cmdPaletteOpen: false,
    cmdSearch: '',
    cmdSelectedIndex: 0,

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
          case 'n': this.showCreateCommitment = true; break;
          case 'j': this.showCreateDecision = true; break;
          default: break;
        }
      }
    },

    openNavigationTarget(action) {
      // Ensure lazy module is initialized before setting the view so Alpine
      // can bind to the module's state and methods without errors.
      this._ensureModule(action);
      this.view = action;
      if (action === 'dashboard') this.loadDashboard();
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
    },

    openCmdPalette() {
      this.cmdPaletteOpen = true;
      this.cmdSearch = '';
      this.cmdSelectedIndex = 0;
      this.$nextTick(() => this.$refs.cmdInput?.focus());
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
  };
}
