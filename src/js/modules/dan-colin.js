/**
 * Dan ↔ Colin Queue module
 * State and methods for the /dan-colin view.
 *
 * SSE + approval pattern mirrors chat.js. No new approval handler —
 * we reuse the existing pendingApprovals + _addApprovalWithTimer flow.
 */

export function createDanColinModule() {
  return {
    // ── Data ─────────────────────────────────────────────────────
    danColin: null,          // { waiting[], now[], drop[], watch[], closed[], meta }
    danColinLoading: false,
    danColinLoadError: null,

    // ── Answer textarea drafts & save states ─────────────────────
    danColinDraftAnswer: {},  // { [rowId]: string }
    danColinSavingFor: {},    // { [rowId]: true } — currently posting
    danColinSavedFor:  {},    // { [rowId]: timestamp } — recently saved (flash)
    _dcDebounceTimers: {},    // { [rowId]: timeoutId }
    _dcExitingRows: {},       // { [rowId]: true } — slide-out animation active

    // ── UI state ──────────────────────────────────────────────────
    dcAnswerFocused: false,
    watchExpanded: false,
    closedExpanded: false,
    dropSheetOpen: false,
    dropDraft: '',
    dropSubmitting: false,
    dropSubmitSuccess: false,
    dropError: null,
    dcToast: null,           // { message, type } — null = hidden
    _dcToastTimer: null,

    // ── v2: Chip nav ──────────────────────────────────────────────
    dcChipNav: {
      activeSection: 'waiting',  // 'waiting' | 'now' | 'watch' | 'drop' | 'closed'
    },
    _dcChipObserver: null,       // IntersectionObserver instance

    // ── v2: Keyboard shortcut layer ───────────────────────────────
    dcFocusedRowIndex: null,     // null or number (index across all visible rows)
    dcCheatsheetOpen: false,
    dcKeyboardAttached: false,
    _dcKeydownHandler: null,

    // ── v2: Focus area legend ─────────────────────────────────────
    dcFocusAreaLegendOpen: false,
    _dcFocusColorCache: {},      // { [name]: cssColor }

    // ── v2: Slow-network toast timer ─────────────────────────────
    _dcSlowNetworkTimer: null,

    // ── Load ──────────────────────────────────────────────────────

    async loadDanColin() {
      this.danColinLoading = true;
      this.danColinLoadError = null;

      // §8: Slow-network toast — trigger if fetch takes >3s
      if (this._dcSlowNetworkTimer) clearTimeout(this._dcSlowNetworkTimer);
      this._dcSlowNetworkTimer = setTimeout(() => {
        this._showDcToast('Notion is slow… still loading', 'neutral');
      }, 3000);

      try {
        const res = await fetch('/api/dan-colin', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.danColin = await res.json();
        // On desktop (≥768px) expand Watch by default
        if (window.innerWidth >= 768) {
          this.watchExpanded = true;
        }
        // Dismiss slow-network toast on success
        clearTimeout(this._dcSlowNetworkTimer);
        if (this.dcToast?.type === 'neutral') {
          this.dcToast = null;
        }
        // Re-wire scroll-spy after data loads
        this.$nextTick(() => this._dcInitScrollSpy());
      } catch (err) {
        clearTimeout(this._dcSlowNetworkTimer);
        console.error('[dan-colin] load error:', err);
        this.danColinLoadError = 'Failed to load queue. Try again.';
      } finally {
        this.danColinLoading = false;
      }
    },

    // ── Answer debounce ───────────────────────────────────────────

    answerDebounce(rowId, text) {
      this.danColinDraftAnswer = { ...this.danColinDraftAnswer, [rowId]: text };
      // clear previous timer
      if (this._dcDebounceTimers[rowId]) {
        clearTimeout(this._dcDebounceTimers[rowId]);
        delete this._dcDebounceTimers[rowId];
      }
      // Only schedule if there's actual content
      if (!text || !text.trim()) return;
      this._dcDebounceTimers[rowId] = setTimeout(() => {
        delete this._dcDebounceTimers[rowId];
        this.submitAnswer(rowId, text);
      }, 2000);
    },

    // §9: Is a debounce timer running for this row?
    dcIsDebounceRunning(rowId) {
      return !!this._dcDebounceTimers[rowId];
    },

    async submitAnswer(rowId, text) {
      if (this.danColinSavingFor[rowId]) return;
      if (!text || !text.trim()) return;

      this.danColinSavingFor = { ...this.danColinSavingFor, [rowId]: true };

      try {
        const response = await fetch(`/api/dan-colin/${rowId}/answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: text }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = 'message';
        let autoClose = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
              continue;
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (currentEventType === 'approval') {
                  // Bubble up to the existing approval UI in chat.js
                  this._addApprovalWithTimer(data);
                } else if (currentEventType === 'done') {
                  autoClose = data?.result?.autoClose === true;
                } else if (currentEventType === 'error') {
                  throw new Error(data.error || 'Answer failed');
                }
              } catch (parseErr) {
                if (parseErr.message && !parseErr.message.startsWith('JSON')) throw parseErr;
              }
              currentEventType = 'message';
            }
          }
        }

        // Mark as saved
        this.danColinSavedFor = { ...this.danColinSavedFor, [rowId]: Date.now() };
        this.danColinSavingFor = { ...this.danColinSavingFor, [rowId]: false };

        // If autoClose → animate row out after 1.5s, then refresh
        if (autoClose) {
          setTimeout(() => {
            this._exitRow(rowId);
          }, 1500);
        }
      } catch (err) {
        console.error('[dan-colin] submitAnswer error:', err);
        // Revert saving state so user can retry
        this.danColinSavingFor = { ...this.danColinSavingFor, [rowId]: false };
        this.danColinSavedFor = { ...this.danColinSavedFor, [rowId]: null };
        this._showDcToast('Save failed. Try again.', 'error');
      }
    },

    _exitRow(rowId) {
      this._dcExitingRows = { ...this._dcExitingRows, [rowId]: true };
      setTimeout(() => {
        // Remove row from waiting array in state + refresh
        if (this.danColin) {
          this.danColin = {
            ...this.danColin,
            waiting: (this.danColin.waiting || []).filter(r => r.id !== rowId),
          };
        }
        const newExiting = { ...this._dcExitingRows };
        delete newExiting[rowId];
        this._dcExitingRows = newExiting;
        // Refresh from server to get updated closed section
        this.loadDanColin();
      }, 350); // slightly longer than CSS animation
    },

    // ── Drop Sheet ────────────────────────────────────────────────

    openDropSheet() {
      this.dropSheetOpen = true;
      this.dropError = null;
      this.$nextTick(() => {
        document.getElementById('dc-drop-textarea')?.focus();
      });
    },

    closeDropSheet() {
      this.dropSheetOpen = false;
      this.dropDraft = '';
      this.dropError = null;
      this.dropSubmitSuccess = false;
    },

    async submitDrop() {
      if (this.dropSubmitting) return;
      const text = (this.dropDraft || '').trim();
      if (!text) {
        this.dropError = 'Please enter something to drop.';
        return;
      }
      this.dropError = null;
      this.dropSubmitting = true;
      this.dropSubmitSuccess = false;

      try {
        const response = await fetch('/api/dan-colin/drop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text }),
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }

        // Read SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
              continue;
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (currentEventType === 'approval') {
                  this._addApprovalWithTimer(data);
                } else if (currentEventType === 'error') {
                  throw new Error(data.error || 'Drop failed');
                }
              } catch (parseErr) {
                if (parseErr.message && !parseErr.message.startsWith('JSON')) throw parseErr;
              }
              currentEventType = 'message';
            }
          }
        }

        // Success
        this.dropSubmitting = false;
        this.dropSubmitSuccess = true;
        this._showDcToast("In Colin's queue — processed midday", 'success');

        // Close sheet after brief success flash + toast starts
        setTimeout(() => {
          this.closeDropSheet();
          this.loadDanColin();
        }, 800);
      } catch (err) {
        console.error('[dan-colin] submitDrop error:', err);
        this.dropSubmitting = false;
        this.dropSubmitSuccess = false;
        this.dropError = err.message || 'Drop failed. Try again.';
      }
    },

    // ── Section toggles ───────────────────────────────────────────

    toggleWatch() {
      this.watchExpanded = !this.watchExpanded;
    },

    toggleClosed() {
      this.closedExpanded = !this.closedExpanded;
    },

    // ── Toast ─────────────────────────────────────────────────────

    _showDcToast(message, type = 'success') {
      if (this._dcToastTimer) clearTimeout(this._dcToastTimer);
      this.dcToast = { message, type };
      // neutral (slow-network) stays until dismissed manually
      if (type !== 'neutral') {
        this._dcToastTimer = setTimeout(() => {
          this.dcToast = null;
        }, 3000);
      }
    },

    // ── Helpers ───────────────────────────────────────────────────

    dcFormatDate(iso) {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
        });
      } catch {
        return '';
      }
    },

    dcTodayLabel() {
      return new Date().toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    },

    dcWaitingCount() {
      return (this.danColin?.waiting || []).length;
    },

    dcNowCount() {
      return (this.danColin?.now || []).length;
    },

    dcWatchCount() {
      return (this.danColin?.watch || []).length;
    },

    dcDropCount() {
      return (this.danColin?.drop || []).length;
    },

    dcClosedCount() {
      return (this.danColin?.closed || []).length;
    },

    dcIsSaving(rowId) {
      return !!this.danColinSavingFor[rowId];
    },

    dcIsSaved(rowId) {
      const ts = this.danColinSavedFor[rowId];
      if (!ts) return false;
      return (Date.now() - ts) < 4000; // show checkmark for 4s
    },

    dcIsExiting(rowId) {
      return !!this._dcExitingRows[rowId];
    },

    dcDraftFor(rowId) {
      return this.danColinDraftAnswer[rowId] || '';
    },

    // ── v2: §3 Age pill helpers ───────────────────────────────────

    dcComputeAgePill(dateStr) {
      if (!dateStr) return '';
      const ageMs = Date.now() - new Date(dateStr).getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      const ageDays = ageHours / 24;
      if (ageHours < 1) return 'just now';
      if (ageHours < 24) return `${Math.floor(ageHours)}h ago`;
      if (ageDays < 7) return `${Math.floor(ageDays)}d ago`;
      return `${Math.floor(ageDays / 7)}w ago`;
    },

    dcIsAgePillStale(row) {
      const dateStr = row.updatedAt || row.createdAt;
      if (!dateStr) return false;
      const ageDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays >= 3;
    },

    // ── v2: §4 Focus area color helpers ──────────────────────────

    dcGetFocusAreaColor(focusAreaName) {
      if (!focusAreaName) return 'var(--text-muted)';
      if (this._dcFocusColorCache[focusAreaName]) {
        return this._dcFocusColorCache[focusAreaName];
      }
      // Deterministic hash
      let hash = 0;
      for (let i = 0; i < focusAreaName.length; i++) {
        hash = ((hash << 5) - hash + focusAreaName.charCodeAt(i)) | 0;
      }
      const colorIndex = (Math.abs(hash) % 8) + 1;  // 1–8
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue(`--dc-fa-color-${colorIndex}`)
        .trim() || 'var(--text-muted)';
      this._dcFocusColorCache[focusAreaName] = color;
      return color;
    },

    // Collect unique focus areas from all rows for legend
    dcGetFocusAreaLegend() {
      if (!this.danColin) return [];
      const seen = new Map();
      const allRows = [
        ...(this.danColin.waiting || []),
        ...(this.danColin.now || []),
        ...(this.danColin.watch || []),
        ...(this.danColin.drop || []),
      ];
      for (const row of allRows) {
        const names = row.focusAreaNames || [];
        for (const name of names) {
          if (!seen.has(name)) {
            seen.set(name, this.dcGetFocusAreaColor(name));
          }
        }
      }
      return Array.from(seen.entries()).map(([name, color]) => ({ name, color }));
    },

    // ── v2: §6 Empty state copy helpers ──────────────────────────

    dcEmptyHeadline(section) {
      const map = {
        waiting: 'No open asks.',
        now: 'Nothing active.',
        watch: 'Nothing on radar.',
        drop: 'Nothing dropped yet.',
        closed: 'No completions yet.',
      };
      return map[section] || '';
    },

    dcEmptySubheadline(section) {
      const map = {
        waiting: 'Clean slate.',
        now: 'Check back soon.',
        watch: 'Items you\'re monitoring go here.',
        drop: 'Tap + or press ⌘K to drop.',
        closed: 'Items move here when answered.',
      };
      return map[section] || '';
    },

    // ── v2: §2 Scroll-spy chip nav ────────────────────────────────

    _dcInitScrollSpy() {
      // Disconnect previous observer if any
      if (this._dcChipObserver) {
        this._dcChipObserver.disconnect();
        this._dcChipObserver = null;
      }

      // Only on mobile
      if (window.innerWidth >= 768) return;

      const sectionIds = ['dc-section-waiting', 'dc-section-now', 'dc-section-watch', 'dc-section-drop', 'dc-section-closed'];
      const sectionMap = {
        'dc-section-waiting': 'waiting',
        'dc-section-now': 'now',
        'dc-section-watch': 'watch',
        'dc-section-drop': 'drop',
        'dc-section-closed': 'closed',
      };

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              const sectionKey = sectionMap[entry.target.id];
              if (sectionKey) {
                this.dcChipNav.activeSection = sectionKey;
              }
            }
          }
        },
        { rootMargin: '-84px 0px -60% 0px', threshold: 0 }
      );

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }

      this._dcChipObserver = observer;
    },

    dcScrollToSection(section) {
      const id = `dc-section-${section}`;
      const el = document.getElementById(id);
      if (!el) return;
      this.dcChipNav.activeSection = section;
      // Expand collapsed sections before scrolling
      if (section === 'watch' && !this.watchExpanded) this.watchExpanded = true;
      if (section === 'closed' && !this.closedExpanded) this.closedExpanded = true;
      this.$nextTick(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    },

    // ── v2: §5 Keyboard shortcut layer ───────────────────────────

    dcAttachKeyboard() {
      if (this.dcKeyboardAttached) return;
      this._dcKeydownHandler = (e) => {
        // Never fire when typing in an input/textarea (except our own shortcuts)
        const tag = document.activeElement?.tagName;
        const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

        // Global shortcuts that work even in inputs
        if (e.key === 'Escape') {
          if (this.dcCheatsheetOpen) {
            this.dcCheatsheetOpen = false;
            e.preventDefault();
            return;
          }
          if (this.dropSheetOpen) {
            this.closeDropSheet();
            e.preventDefault();
            return;
          }
          // Blur focused input
          if (inInput) {
            document.activeElement.blur();
            e.preventDefault();
          }
          return;
        }

        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          if (!this.dropSheetOpen) this.openDropSheet();
          else this.closeDropSheet();
          return;
        }

        // Skip non-global shortcuts when in input
        if (inInput) return;

        if (e.key === '?') {
          e.preventDefault();
          this.dcCheatsheetOpen = !this.dcCheatsheetOpen;
          return;
        }

        if (e.key === 'j') {
          e.preventDefault();
          this._dcMoveFocus(1);
          return;
        }

        if (e.key === 'k') {
          e.preventDefault();
          this._dcMoveFocus(-1);
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          this._dcActivateFocused();
          return;
        }

        if (e.key === 'a') {
          e.preventDefault();
          this._dcFocusAnswerField();
          return;
        }
      };

      window.addEventListener('keydown', this._dcKeydownHandler);
      this.dcKeyboardAttached = true;
    },

    dcDetachKeyboard() {
      if (this._dcKeydownHandler) {
        window.removeEventListener('keydown', this._dcKeydownHandler);
        this._dcKeydownHandler = null;
      }
      if (this._dcChipObserver) {
        this._dcChipObserver.disconnect();
        this._dcChipObserver = null;
      }
      this.dcKeyboardAttached = false;
    },

    _dcGetAllVisibleRows() {
      // Returns all .dc-row elements currently visible in the DOM (in order)
      return Array.from(document.querySelectorAll('.dc-body .dc-row:not([style*="display: none"])'));
    },

    _dcMoveFocus(delta) {
      const rows = this._dcGetAllVisibleRows();
      if (!rows.length) return;

      let nextIndex;
      if (this.dcFocusedRowIndex === null) {
        nextIndex = delta > 0 ? 0 : rows.length - 1;
      } else {
        nextIndex = this.dcFocusedRowIndex + delta;
        nextIndex = Math.max(0, Math.min(rows.length - 1, nextIndex));
      }

      // Remove previous focus class
      rows.forEach(r => r.classList.remove('dc-row--focused'));

      this.dcFocusedRowIndex = nextIndex;
      const target = rows[nextIndex];
      if (target) {
        target.classList.add('dc-row--focused');
        target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    },

    _dcActivateFocused() {
      const rows = this._dcGetAllVisibleRows();
      if (this.dcFocusedRowIndex === null || !rows[this.dcFocusedRowIndex]) return;
      const target = rows[this.dcFocusedRowIndex];
      // Click it — works for both answer expansion and Notion-link rows
      target.click();
    },

    _dcFocusAnswerField() {
      const rows = this._dcGetAllVisibleRows();
      if (this.dcFocusedRowIndex === null || !rows[this.dcFocusedRowIndex]) {
        // Focus first waiting textarea if no row focused
        const ta = document.querySelector('.dc-answer-textarea');
        if (ta) ta.focus();
        return;
      }
      const target = rows[this.dcFocusedRowIndex];
      const ta = target?.querySelector('.dc-answer-textarea');
      if (ta) ta.focus();
    },

    // ── v2: Mount / unmount lifecycle ────────────────────────────

    dcMount() {
      // Load data only if not already loaded/loading (avoids double-load with command-shell nav)
      if (!this.danColin && !this.danColinLoading) {
        this.loadDanColin();
      } else if (this.danColin) {
        // Already have data — just re-wire scroll spy
        this.$nextTick(() => this._dcInitScrollSpy());
      }
      this.dcAttachKeyboard();
    },

    dcUnmount() {
      this.dcDetachKeyboard();
      if (this._dcSlowNetworkTimer) {
        clearTimeout(this._dcSlowNetworkTimer);
        this._dcSlowNetworkTimer = null;
      }
      Object.values(this._dcDebounceTimers || {}).forEach(t => clearTimeout(t));
      this._dcDebounceTimers = {};
    },
  };
}
