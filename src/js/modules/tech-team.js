export function createTechTeamModule() {
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
