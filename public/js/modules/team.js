export function createTeamModule() {
  return {
    // Team
    teamData: [],
    teamLoading: false,
    expandedTeamMember: null,

    async loadTeam() {
      const signal = this.beginRequest('team');
      this.expandedTeamMember = null;
      this.teamLoading = true;
      try {
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

    getOverloadedCount() {
      if (!this.teamData || this.teamData.length === 0) return 0;
      return this.teamData.filter((person) => (person.overdueCount || 0) >= 3 || (person.activeCommitmentCount || 0) >= 8).length;
    },

    getMaxWorkload() {
      if (!this.teamData || this.teamData.length === 0) return 1;
      return Math.max(...this.teamData.map((person) => person.activeCommitmentCount || 0), 1);
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
        const overdueA = a.overdueCount || 0;
        const overdueB = b.overdueCount || 0;
        if (overdueB !== overdueA) return overdueB - overdueA;
        const blockedA = a.blockedCount || 0;
        const blockedB = b.blockedCount || 0;
        if (blockedB !== blockedA) return blockedB - blockedA;
        return (b.activeCommitmentCount || 0) - (a.activeCommitmentCount || 0);
      });
    },

    getTeamMetrics() {
      if (!this.teamData || this.teamData.length === 0) {
        return { totalOpen: 0, totalOverdue: 0, mostLoaded: '—', unassigned: 0 };
      }
      const totalOpen = this.teamData.reduce((sum, person) => sum + (person.activeCommitmentCount || 0), 0);
      const totalOverdue = this.teamData.reduce((sum, person) => sum + (person.overdueCount || 0), 0);
      const mostLoaded = this.teamData.reduce((best, person) =>
        (person.activeCommitmentCount || 0) > (best.activeCommitmentCount || 0) ? person : best,
      this.teamData[0]);
      const unassigned = (this.dashboard && this.dashboard.unassignedCount != null) ? this.dashboard.unassignedCount : 0;
      return {
        totalOpen,
        totalOverdue,
        mostLoaded: mostLoaded ? (mostLoaded.Name || '—') : '—',
        unassigned,
      };
    },
  };
}
