/**
 * Marketing Log Module — /marketing-log view
 *
 * State + methods for browsing and adding Marketing Log entries.
 * Endpoints: GET /api/marketing-log, POST /api/marketing-log (SSE approval-gated)
 *
 * Public state: mktLogEntries, mktLogTotal, mktLogLoading, mktLogError,
 *   mktLogFilters, mktLogAddOpen, mktLogForm, mktLogSaving,
 *   mktLogPendingApproval, mktLogSaveError, mktLogLastRefresh
 * Public methods: initMarketingLog, refreshMarketingLog, loadMarketingLog,
 *   openMktLogAdd, closeMktLogAdd, saveMktLogEntry,
 *   formatMktLogDate, mktLogPriorityClass
 */

export function createMarketingLogModule() {
  return {
    // ── State ────────────────────────────────────────────────────────────
    mktLogEntries: [],
    mktLogTotal: 0,
    mktLogLoading: false,
    mktLogError: null,
    mktLogLastRefresh: null,

    // Filters
    mktLogFilters: {
      area: '',
      type: '',
      tag: '',
      status: '',
      limit: 50,
    },

    // Add form
    mktLogAddOpen: false,
    mktLogForm: {
      note: '',
      area: '',
      type: '',
      tags: [],
      priority: 'Medium',
    },
    mktLogSaving: false,
    mktLogPendingApproval: false,
    mktLogSaveError: null,

    // Validation constants (mirrors server-side)
    _mktLogAreas: ['Google Ads', 'Meta Ads', 'Email', 'WhatsApp', 'Website', 'SEO', 'Brand', 'Product', 'Team', 'General'],
    _mktLogTypes: ['Observation', 'Idea', 'Decision', 'Data Point', 'Feedback', 'Task', 'Question'],
    _mktLogTags: ['urgent', 'follow-up', 'share-with-team', 'data', 'creative', 'budget', 'competitor'],
    _mktLogPriorities: ['High', 'Medium', 'Low'],
    _mktLogStatuses: ['Logged', 'Actioned', 'Shared', 'Archived'],

    // ── Init ──────────────────────────────────────────────────────────────
    async initMarketingLog() {
      if (this.mktLogLoading) return;
      await this.loadMarketingLog();
    },

    async refreshMarketingLog() {
      await this.loadMarketingLog();
    },

    // ── Load ──────────────────────────────────────────────────────────────
    async loadMarketingLog() {
      this.mktLogLoading = true;
      this.mktLogError = null;
      try {
        const params = new URLSearchParams();
        if (this.mktLogFilters.area)   params.set('area',   this.mktLogFilters.area);
        if (this.mktLogFilters.type)   params.set('type',   this.mktLogFilters.type);
        if (this.mktLogFilters.tag)    params.set('tag',    this.mktLogFilters.tag);
        if (this.mktLogFilters.status) params.set('status', this.mktLogFilters.status);
        params.set('limit', String(this.mktLogFilters.limit));

        const res = await fetch(`/api/marketing-log?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.mktLogEntries = data.entries || [];
        this.mktLogTotal   = data.total   || 0;
        this.mktLogLastRefresh = new Date().toISOString();
      } catch (err) {
        console.error('[marketing-log] loadMarketingLog error:', err);
        this.mktLogError = err.message || 'Failed to load marketing log.';
      } finally {
        this.mktLogLoading = false;
      }
    },

    // ── Add form ──────────────────────────────────────────────────────────
    openMktLogAdd() {
      this.mktLogForm = { note: '', area: '', type: '', tags: [], priority: 'Medium' };
      this.mktLogSaveError = null;
      this.mktLogPendingApproval = false;
      this.mktLogAddOpen = true;
    },

    closeMktLogAdd() {
      this.mktLogAddOpen = false;
      this.mktLogSaving = false;
      this.mktLogPendingApproval = false;
      this.mktLogSaveError = null;
      this.mktLogForm = { note: '', area: '', type: '', tags: [], priority: 'Medium' };
    },

    mktLogTagToggle(tag) {
      const idx = this.mktLogForm.tags.indexOf(tag);
      if (idx === -1) this.mktLogForm.tags.push(tag);
      else this.mktLogForm.tags.splice(idx, 1);
    },

    async saveMktLogEntry() {
      if (!this.mktLogForm.note.trim()) return;
      this.mktLogSaving = true;
      this.mktLogSaveError = null;

      try {
        const body = {
          note:     this.mktLogForm.note.trim(),
          area:     this.mktLogForm.area     || undefined,
          type:     this.mktLogForm.type     || undefined,
          tags:     this.mktLogForm.tags.length ? this.mktLogForm.tags : undefined,
          priority: this.mktLogForm.priority || 'Medium',
        };

        // POST via fetch — SSE response
        const res = await fetch('/api/marketing-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok && res.status === 400) {
          const err = await res.json();
          throw new Error(err.error || 'Validation error');
        }

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // SSE streaming response
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            try {
              const event = JSON.parse(line.slice(5).trim());
              if (event.approvalId) {
                this.mktLogPendingApproval = true;
              }
              if (event.message === 'Operation complete') {
                this.mktLogPendingApproval = false;
                this.closeMktLogAdd();
                await this.loadMarketingLog();
                return;
              }
              if (event.message === 'Operation cancelled' || event.message?.includes('cancelled')) {
                this.mktLogPendingApproval = false;
                this.mktLogSaveError = 'Entry was rejected.';
                this.mktLogSaving = false;
                return;
              }
              if (event.error) {
                throw new Error(event.error);
              }
            } catch {
              // non-JSON lines (event: type lines) — skip
            }
          }
        }

        this.closeMktLogAdd();
        await this.loadMarketingLog();
      } catch (err) {
        console.error('[marketing-log] saveMktLogEntry error:', err);
        this.mktLogSaveError = err.message || 'Failed to save entry.';
        this.mktLogSaving = false;
        this.mktLogPendingApproval = false;
      }
    },

    // ── Helpers ───────────────────────────────────────────────────────────
    formatMktLogDate(iso) {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      } catch {
        return iso;
      }
    },

    mktLogPriorityClass(priority) {
      const map = { High: 'priority-high', Medium: 'priority-medium', Low: 'priority-low' };
      return map[priority] || 'priority-medium';
    },
  };
}
