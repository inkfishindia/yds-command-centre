/**
 * IG Module — IG Playbook view
 *
 * Manages state and data loading for the /ig view.
 * Endpoints: /api/marketing-ops/ig/*
 * Pattern mirrors mcc.js — createMccModule() / Object.assign merge.
 *
 * Public state: igLoading, igThisWeek, igAdCandidates, igKillRuleTriggers,
 *   igWeeklyOpsLatest, igHooks, igTemplates, igHooksExpanded,
 *   igTemplatesExpanded, igLastRefresh, igError
 * Public methods: initIg, refreshIg, formatSwps, swpsTone, igPillarClass,
 *   formatIgDate, igHitTargetLabel
 */

export function createIgModule() {
  return {
    // ── State ───────────────────────────────────────────────────
    igLoading: false,
    igThisWeek: null,         // { rows, summary: { postCount, avgSWPS, hitTargetCount } }
    igAdCandidates: null,     // { rows, summary }
    igKillRuleTriggers: null, // { rows, killRuleTriggerCount }
    igWeeklyOpsLatest: null,  // { row }
    igHooks: null,            // { rows }
    igTemplates: null,        // { rows }
    igHooksExpanded: false,
    igTemplatesExpanded: false,
    igLastRefresh: null,
    igError: null,

    // ── Init ─────────────────────────────────────────────────────
    async initIg() {
      if (this.igLoading) return;
      this.igLoading = true;
      this.igError = null;

      try {
        await this.loadIgPlaybook();
        this.igLastRefresh = new Date().toISOString();
      } catch (err) {
        console.error('[ig] init error:', err);
        this.igError = err.message || 'Failed to load IG Playbook data.';
      } finally {
        this.igLoading = false;
      }
    },

    // ── Load all IG data in parallel ─────────────────────────────
    async loadIgPlaybook() {
      const fetches = [
        this._fetchIgThisWeek(),
        this._fetchIgAdCandidates(),
        this._fetchIgKillRuleTriggers(),
        this._fetchIgWeeklyOpsLatest(),
        this._fetchIgHooks(),
        this._fetchIgTemplates(),
      ];
      await Promise.all(fetches);
    },

    async _fetchIgThisWeek() {
      try {
        const res = await fetch('/api/marketing-ops/ig/performance/this-week');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.igThisWeek = await res.json();
      } catch (err) {
        console.error('[ig] fetchThisWeek error:', err);
        this.igThisWeek = { rows: [], summary: { postCount: 0, avgSWPS: null, hitTargetCount: 0 } };
      }
    },

    async _fetchIgAdCandidates() {
      try {
        const res = await fetch('/api/marketing-ops/ig/performance/ad-candidates');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.igAdCandidates = await res.json();
      } catch (err) {
        console.error('[ig] fetchAdCandidates error:', err);
        this.igAdCandidates = { rows: [], summary: {} };
      }
    },

    async _fetchIgKillRuleTriggers() {
      try {
        const res = await fetch('/api/marketing-ops/ig/approvals/kill-rule-triggers');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.igKillRuleTriggers = await res.json();
      } catch (err) {
        console.error('[ig] fetchKillRuleTriggers error:', err);
        this.igKillRuleTriggers = { rows: [], killRuleTriggerCount: 0 };
      }
    },

    async _fetchIgWeeklyOpsLatest() {
      try {
        const res = await fetch('/api/marketing-ops/ig/weekly-ops/latest');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.igWeeklyOpsLatest = await res.json();
      } catch (err) {
        console.error('[ig] fetchWeeklyOpsLatest error:', err);
        this.igWeeklyOpsLatest = { row: null };
      }
    },

    async _fetchIgHooks() {
      try {
        const res = await fetch('/api/marketing-ops/ig/hooks?status=Active');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.igHooks = await res.json();
      } catch (err) {
        console.error('[ig] fetchHooks error:', err);
        this.igHooks = { rows: [] };
      }
    },

    async _fetchIgTemplates() {
      try {
        const res = await fetch('/api/marketing-ops/ig/templates?status=Active');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.igTemplates = await res.json();
      } catch (err) {
        console.error('[ig] fetchTemplates error:', err);
        this.igTemplates = { rows: [] };
      }
    },

    // ── Refresh ──────────────────────────────────────────────────
    async refreshIg() {
      this.igThisWeek = null;
      this.igAdCandidates = null;
      this.igKillRuleTriggers = null;
      this.igWeeklyOpsLatest = null;
      this.igHooks = null;
      this.igTemplates = null;
      this.igLastRefresh = null;
      this.igError = null;
      await this.initIg();
    },

    // ── Helpers ──────────────────────────────────────────────────

    /** Format a SWPS number (0–1) as "X.X%" */
    formatSwps(num) {
      if (num == null || isNaN(num)) return '—';
      return (num * 100).toFixed(1) + '%';
    },

    /**
     * Return 'good' | 'warn' | 'bad' tone class based on SWPS vs 3.5% target.
     * ≥3.5% = good, 2–3.5% = warn, <2% = bad
     */
    swpsTone(num) {
      if (num == null || isNaN(num)) return 'neutral';
      if (num >= 0.035) return 'good';
      if (num >= 0.02) return 'warn';
      return 'bad';
    },

    /** CSS class for pillar color coding */
    igPillarClass(pillar) {
      const map = {
        'Permission': 'pillar-permission',
        'Napkin': 'pillar-napkin',
        'In-the-Wild': 'pillar-wild',
        'Craft': 'pillar-craft',
        'Educational': 'pillar-educational',
      };
      return map[pillar] || '';
    },

    /** Format ISO date string to short readable format */
    formatIgDate(dateStr) {
      if (!dateStr) return '—';
      try {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } catch {
        return dateStr;
      }
    },

    /** Hit target display */
    igHitTargetLabel(hit) {
      return hit === true ? '✓' : hit === false ? '✗' : '—';
    },

    /** Check if all 6 fetch results are empty (env vars not set) */
    igIsEnvEmpty() {
      const noRows = (obj) => !obj || !obj.rows || obj.rows.length === 0;
      const noRow = (obj) => !obj || !obj.row;
      return (
        noRows(this.igThisWeek) &&
        noRows(this.igAdCandidates) &&
        noRows(this.igKillRuleTriggers) &&
        noRow(this.igWeeklyOpsLatest) &&
        noRows(this.igHooks) &&
        noRows(this.igTemplates)
      );
    },
  };
}
