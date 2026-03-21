export function createTechTeamModule() {
  return {
    // Tech Team
    techTeam: null,
    techTeamLoading: false,
    techTeamSection: 'overview',

    async loadTechTeam() {
      const signal = this.beginRequest('techTeam');
      this.techTeamLoading = true;
      try {
        const res = await fetch('/api/tech-team', { signal });
        if (res.ok) this.techTeam = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Tech Team load error:', err);
      } finally {
        this.endRequest('techTeam', signal);
        this.techTeamLoading = false;
      }
    },
  };
}
