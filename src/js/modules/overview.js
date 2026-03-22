export function createOverviewModule() {
  return {
    overview: null,
    overviewLoading: false,

    async loadOverview() {
      this.overviewLoading = true;
      try {
        const res = await fetch('/api/overview');
        if (res.ok) this.overview = await res.json();
      } catch (err) {
        console.error('Overview load error:', err);
      } finally {
        this.overviewLoading = false;
      }
    },
  };
}
