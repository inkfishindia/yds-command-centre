export function createCompetitorIntelModule() {
  return {
    // ── Competitor Intelligence State ─────────────────────────────────
    ciData: null,
    ciLoading: false,
    ciSection: 'landscape',   // landscape | capabilities | swot | steal-adapt | detail
    ciDetail: null,
    ciDetailLoading: false,
    ciCapabilities: null,
    ciSwot: null,
    ciStealAdapt: null,
    ciTierFilter: '',
    ciCategoryFilter: '',
    ciSearch: '',

    // ── Load Methods ──────────────────────────────────────────────────

    async loadCompetitorIntel() {
      if (this.ciLoading) return;
      const signal = this.beginRequest('competitor-intel');
      this.ciLoading = true;
      try {
        const res = await fetch('/api/competitor-intel', { signal });
        if (res.ok) {
          this.ciData = await res.json();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Competitor Intel load error:', err);
      } finally {
        this.endRequest('competitor-intel', signal);
        this.ciLoading = false;
      }
    },

    async loadCiDetail(brand) {
      this.ciSection = 'detail';
      this.ciDetail = null;
      this.ciDetailLoading = true;
      try {
        const encoded = encodeURIComponent(brand);
        const res = await fetch(`/api/competitor-intel/competitor/${encoded}`);
        if (res.ok) {
          this.ciDetail = await res.json();
        }
      } catch (err) {
        console.error('CI detail load error:', err);
      } finally {
        this.ciDetailLoading = false;
      }
    },

    closeCiDetail() {
      this.ciSection = 'landscape';
      this.ciDetail = null;
    },

    async loadCiCapabilities() {
      if (this.ciCapabilities) return;
      try {
        const res = await fetch('/api/competitor-intel/capabilities');
        if (res.ok) {
          this.ciCapabilities = await res.json();
        }
      } catch (err) {
        console.error('CI capabilities load error:', err);
      }
    },

    async loadCiSwot() {
      if (this.ciSwot) return;
      try {
        const res = await fetch('/api/competitor-intel/swot');
        if (res.ok) {
          this.ciSwot = await res.json();
        }
      } catch (err) {
        console.error('CI SWOT load error:', err);
      }
    },

    async loadCiStealAdapt() {
      if (this.ciStealAdapt) return;
      try {
        const res = await fetch('/api/competitor-intel/steal-adapt');
        if (res.ok) {
          this.ciStealAdapt = await res.json();
        }
      } catch (err) {
        console.error('CI Steal/Adapt load error:', err);
      }
    },

    ciSwitchSection(section) {
      this.ciSection = section;
      if (section === 'capabilities') this.loadCiCapabilities();
      else if (section === 'swot') this.loadCiSwot();
      else if (section === 'steal-adapt') this.loadCiStealAdapt();
    },

    // ── Filter / Helpers ──────────────────────────────────────────────

    getFilteredCompetitors() {
      if (!this.ciData || !this.ciData.competitors) return [];
      let list = this.ciData.competitors;
      if (this.ciTierFilter) {
        list = list.filter(c => (c.Tier || '') === this.ciTierFilter);
      }
      if (this.ciCategoryFilter) {
        list = list.filter(c => (c.Category || '') === this.ciCategoryFilter);
      }
      if (this.ciSearch) {
        const q = this.ciSearch.toLowerCase();
        list = list.filter(c =>
          (c.Brand || '').toLowerCase().includes(q) ||
          (c['Core Strengths'] || '').toLowerCase().includes(q) ||
          (c.Tags || '').toLowerCase().includes(q)
        );
      }
      return list;
    },

    getCiAvgScore(brand) {
      if (!this.ciData || !this.ciData.capabilitySummary) return null;
      const entry = this.ciData.capabilitySummary.find(s => s.brand === brand);
      return entry ? entry.avgScore : null;
    },

    getTierColor(tier) {
      const map = {
        'Flagship': 'var(--accent)',
        'Enterprise': 'var(--purple)',
        'Mid': 'var(--green)',
        'Regional': 'var(--amber)',
        'D2C': 'var(--teal)',
        'Local': 'var(--text-muted)',
      };
      return map[tier] || 'var(--text-muted)';
    },

    getTierBg(tier) {
      const map = {
        'Flagship': 'var(--accent-dim)',
        'Enterprise': 'var(--purple-dim)',
        'Mid': 'var(--green-dim)',
        'Regional': 'var(--amber-dim)',
        'D2C': 'var(--teal-dim)',
        'Local': 'var(--bg-hover)',
      };
      return map[tier] || 'var(--bg-hover)';
    },

    getCapabilityColor(score) {
      const s = Number(score);
      if (s >= 4) return 'var(--green)';
      if (s === 3) return 'var(--amber)';
      return 'var(--red)';
    },

    getCapabilityBg(score) {
      const s = Number(score);
      if (s >= 4) return 'var(--green-dim)';
      if (s === 3) return 'var(--amber-dim)';
      return 'var(--red-dim)';
    },

    getScoreLabel(score) {
      const s = Number(score);
      if (s >= 4) return 'Strong';
      if (s === 3) return 'Average';
      return 'Weak';
    },

    getCiTiers() {
      if (!this.ciData) return [];
      return (this.ciData.byTier || []).map(t => t.name);
    },

    getCiCategories() {
      if (!this.ciData) return [];
      return (this.ciData.byCategory || []).map(c => c.name);
    },

    // Format dimension name from snake_case to Title Case
    formatDimension(dim) {
      return dim.replace(/_/g, ' ');
    },

    // Truncate text to N chars
    ciTruncate(text, n) {
      if (!text) return '';
      return text.length > n ? text.slice(0, n) + '...' : text;
    },

    // Extract tags as array from comma-separated string
    ciParseTags(tags) {
      if (!tags) return [];
      return tags.split(',').map(t => t.trim()).filter(Boolean);
    },
  };
}
