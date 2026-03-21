export function createRegistryModule() {
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
