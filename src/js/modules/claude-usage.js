export function createClaudeUsageModule() {
  return {
    claudeUsageSessions: [],
    claudeUsageNewPercent: 50,
    claudeUsageNewNote: '',
    claudeUsageMaxWeekly: 1000, // 10 sessions × 100%

    loadClaudeUsage() {
      try {
        const raw = localStorage.getItem('claude_usage_sessions');
        this.claudeUsageSessions = raw ? JSON.parse(raw) : [];
      } catch {
        this.claudeUsageSessions = [];
      }
    },

    _saveClaudeUsage() {
      localStorage.setItem('claude_usage_sessions', JSON.stringify(this.claudeUsageSessions));
    },

    _getWeekStart() {
      const now = new Date();
      const day = now.getDay(); // 0 = Sunday
      const diff = day === 0 ? -6 : 1 - day; // Monday = start
      const monday = new Date(now);
      monday.setDate(now.getDate() + diff);
      monday.setHours(0, 0, 0, 0);
      return monday;
    },

    getWeeklySessions() {
      const weekStart = this._getWeekStart();
      return this.claudeUsageSessions.filter((s) => new Date(s.date) >= weekStart);
    },

    getWeeklyUsedPercent() {
      return this.getWeeklySessions().reduce((sum, s) => sum + (s.percent || 0), 0);
    },

    getWeeklyRemainingPercent() {
      return Math.max(0, this.claudeUsageMaxWeekly - this.getWeeklyUsedPercent());
    },

    getWeeklyProgressPercent() {
      return Math.min(100, (this.getWeeklyUsedPercent() / this.claudeUsageMaxWeekly) * 100);
    },

    getSessionEquivalent(percent) {
      return (percent / 100).toFixed(1);
    },

    getUsageProgressClass() {
      const pct = this.getWeeklyProgressPercent();
      if (pct > 80) return 'usage-progress-fill--danger';
      if (pct > 60) return 'usage-progress-fill--warning';
      return 'usage-progress-fill--ok';
    },

    addClaudeSession() {
      const pct = parseInt(this.claudeUsageNewPercent, 10);
      if (!pct || pct < 1 || pct > 100) return;
      const entry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        percent: pct,
        note: (this.claudeUsageNewNote || '').trim(),
      };
      this.claudeUsageSessions = [entry, ...this.claudeUsageSessions];
      this._saveClaudeUsage();
      this.claudeUsageNewPercent = 50;
      this.claudeUsageNewNote = '';
    },

    removeClaudeSession(id) {
      this.claudeUsageSessions = this.claudeUsageSessions.filter((s) => s.id !== id);
      this._saveClaudeUsage();
    },

    resetClaudeUsage() {
      const weekStart = this._getWeekStart();
      // Keep sessions from previous weeks, remove only current week
      this.claudeUsageSessions = this.claudeUsageSessions.filter((s) => new Date(s.date) < weekStart);
      this._saveClaudeUsage();
    },

    formatClaudeSessionDate(isoDate) {
      if (!isoDate) return '—';
      const d = new Date(isoDate);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
        ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    },

    getWeekLabel() {
      const start = this._getWeekStart();
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
      return `${fmt(start)} – ${fmt(end)}`;
    },
  };
}
