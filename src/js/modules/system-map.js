export function createSystemMapModule() {
  return {
    // System Map state
    systemMap: null,
    systemMapLoading: false,
    systemMapError: null,
    systemMapFilter: '',
    systemMapExpanded: {
      repo: true,
      routes: false,
      views: true,
      notion: true,
      sheets: true,
      modules: true,
      docs: true,
    },

    async loadSystemMap(force = false) {
      const signal = this.beginRequest('systemMap');
      this.systemMapLoading = true;
      this.systemMapError = null;
      try {
        const url = force ? '/api/system-map?force=true' : '/api/system-map';
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.systemMap = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('System Map load error:', err);
        this.systemMapError = 'Failed to load system map. Try refreshing.';
      } finally {
        this.endRequest('systemMap', signal);
        this.systemMapLoading = false;
      }
    },

    toggleSystemMapSection(key) {
      this.systemMapExpanded[key] = !this.systemMapExpanded[key];
    },

    async copySystemMapId(id) {
      try {
        await navigator.clipboard.writeText(id);
        this.showInfo('Copied: ' + id.substring(0, 12) + '...');
      } catch {
        this.showError('Copy failed — try selecting manually');
      }
    },

    // Filter helpers — each returns a filtered subset based on systemMapFilter
    _smFilter(val) {
      if (!this.systemMapFilter) return true;
      const q = this.systemMapFilter.toLowerCase();
      return val && val.toLowerCase().includes(q);
    },

    _smMatchAny(...vals) {
      if (!this.systemMapFilter) return true;
      return vals.some(v => v && this._smFilter(String(v)));
    },

    filteredRoutes() {
      if (!this.systemMap?.routes) return [];
      const q = this.systemMapFilter.toLowerCase();
      if (!q) return this.systemMap.routes;
      return this.systemMap.routes
        .map(group => {
          const matchGroup = group.file && group.file.toLowerCase().includes(q);
          const filteredEndpoints = (group.endpoints || []).filter(ep =>
            (ep.method && ep.method.toLowerCase().includes(q)) ||
            (ep.path && ep.path.toLowerCase().includes(q)) ||
            (ep.description && ep.description.toLowerCase().includes(q))
          );
          if (matchGroup || filteredEndpoints.length > 0) {
            return { ...group, endpoints: matchGroup ? (group.endpoints || []) : filteredEndpoints };
          }
          return null;
        })
        .filter(Boolean);
    },

    filteredNotionDbs() {
      if (!this.systemMap?.notionDatabases) return [];
      if (!this.systemMapFilter) return this.systemMap.notionDatabases;
      return this.systemMap.notionDatabases.filter(db =>
        this._smMatchAny(db.name, db.id, db.purpose, ...(db.propertiesSummary || []))
      );
    },

    filteredSheets() {
      if (!this.systemMap?.sheets) return [];
      if (!this.systemMapFilter) return this.systemMap.sheets;
      return this.systemMap.sheets.filter(s =>
        this._smMatchAny(s.label, s.key, s.envVar)
      );
    },

    filteredModules() {
      if (!this.systemMap?.modules) return [];
      if (!this.systemMapFilter) return this.systemMap.modules;
      return this.systemMap.modules.filter(m =>
        this._smMatchAny(m.name, m.referencedByView, ...(m.exports || []))
      );
    },

    filteredDocs() {
      if (!this.systemMap?.docs) return { docsFiles: [], recentSessions: [] };
      const docs = this.systemMap.docs;
      if (!this.systemMapFilter) return docs;
      const q = this.systemMapFilter.toLowerCase();
      return {
        docsFiles: (docs.docsFiles || []).filter(f => f.toLowerCase().includes(q)),
        recentSessions: (docs.recentSessions || []).filter(s => s.toLowerCase().includes(q)),
      };
    },

    filteredViews() {
      if (!this.systemMap?.views) return [];
      if (!this.systemMapFilter) return this.systemMap.views;
      const q = this.systemMapFilter.toLowerCase();
      return this.systemMap.views.filter(v =>
        (v.id && v.id.toLowerCase().includes(q)) ||
        (v.label && v.label.toLowerCase().includes(q)) ||
        (v.status && v.status.toLowerCase().includes(q)) ||
        (v.partial && v.partial.toLowerCase().includes(q)) ||
        (v.module && v.module.toLowerCase().includes(q))
      );
    },

    getViewStatusClass(status) {
      const map = {
        functional: 'view-status-functional',
        beta: 'view-status-beta',
        mock: 'view-status-mock',
        unknown: 'view-status-unknown',
      };
      return 'view-status-pill ' + (map[status] || 'view-status-unknown');
    },

    getViewStatusCounts() {
      const views = this.systemMap?.views || [];
      return {
        total: views.length,
        functional: views.filter(v => v.status === 'functional').length,
        beta: views.filter(v => v.status === 'beta').length,
        mock: views.filter(v => v.status === 'mock').length,
        unknown: views.filter(v => v.status === 'unknown').length,
      };
    },

    filteredAgents() {
      if (!this.systemMap?.agents) return [];
      if (!this.systemMapFilter) return this.systemMap.agents;
      return this.systemMap.agents.filter(a =>
        this._smMatchAny(a.name, a.description)
      );
    },

    // Repo tree — hardcoded from CLAUDE.md File Map (stable)
    getRepoTree() {
      return [
        { path: 'server/', level: 0, owner: null },
        { path: 'routes/', level: 1, owner: 'backend-builder' },
        { path: 'services/', level: 1, owner: 'backend-builder' },
        { path: 'tools/', level: 1, owner: 'backend-builder' },
        { path: 'data/', level: 1, owner: 'devops-infra' },
        { path: 'src/js/', level: 0, owner: null },
        { path: 'modules/', level: 1, owner: 'frontend-builder' },
        { path: 'app.js', level: 1, owner: 'frontend-builder' },
        { path: 'public/', level: 0, owner: null },
        { path: 'css/', level: 1, owner: 'frontend-builder' },
        { path: 'js/', level: 1, owner: 'frontend-builder' },
        { path: 'partials/', level: 1, owner: 'frontend-builder' },
        { path: '.claude/', level: 0, owner: null },
        { path: 'agents/', level: 1, owner: 'code-reviewer' },
        { path: 'rules/', level: 1, owner: 'code-reviewer' },
        { path: 'skills/', level: 1, owner: 'design-planner' },
        { path: 'docs/', level: 1, owner: 'scribe' },
        { path: 'data/', level: 0, owner: null },
        { path: 'sessions/', level: 1, owner: null },
      ];
    },

    getAgentBadgeClass(owner) {
      const map = {
        'backend-builder': 'agent-badge-blue',
        'frontend-builder': 'agent-badge-green',
        'devops-infra': 'agent-badge-orange',
        'design-planner': 'agent-badge-purple',
        'code-reviewer': 'agent-badge-teal',
        'scribe': 'agent-badge-gray',
      };
      return map[owner] || 'agent-badge-gray';
    },

    getMethodBadgeClass(method) {
      const map = {
        GET: 'method-get',
        POST: 'method-post',
        PATCH: 'method-patch',
        DELETE: 'method-delete',
        PUT: 'method-put',
      };
      return map[(method || '').toUpperCase()] || 'method-get';
    },

    truncateId(id) {
      if (!id || id.length <= 16) return id || '—';
      return id.substring(0, 8) + '...' + id.substring(id.length - 4);
    },

    getRoutesCount() {
      if (!this.systemMap?.routes) return 0;
      return this.systemMap.routes.reduce((sum, g) => sum + (g.endpoints?.length || 0), 0);
    },

    filteredRepoTree() {
      if (!this.systemMapFilter) return this.getRepoTree();
      const q = this.systemMapFilter.toLowerCase();
      return this.getRepoTree().filter(row =>
        row.path.toLowerCase().includes(q) ||
        (row.owner && row.owner.toLowerCase().includes(q))
      );
    },
  };
}
