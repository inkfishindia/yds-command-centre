export function createProjectsModule() {
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
