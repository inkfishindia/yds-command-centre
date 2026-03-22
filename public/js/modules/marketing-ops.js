export function createMarketingOpsModule() {
  return {
    // Marketing Ops
    mktops: null,
    mktopsLoading: false,
    mktopsSection: 'overview',
    mktopsLastRefresh: null,

    // Marketing AI Tools inputs
    mktopsAiInputs: { segment: '', context: '', competitor: '', focus: '', topic: '', audience: '', goal: '', product: '', budget: '' },

    // Marketing Tasks
    mktopsTasks: null,
    mktopsTasksLoading: false,
    mktopsTasksSummary: null,
    mktopsTasksFilter: { priority: 'all', channel: 'all', type: 'all' },

    // ── Content Calendar ─────────────────────────────────────
    calendarMonth: (() => {
      const d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    })(),
    calendarData: null,
    calendarLoading: false,
    calendarFilters: {
      contentTypes: ['Carousel', 'Reel', 'Feed Post', 'Story', 'Email', 'WhatsApp', 'Blog'],
      status: 'all',
      pillar: 'all',
    },

    // Content create/edit modal
    contentModalOpen: false,
    contentModalMode: 'create',
    contentForm: {
      id: null,
      name: '',
      status: 'Idea',
      contentType: 'Feed Post',
      contentPillar: '',
      publishDate: '',
      owner: '',
      hook: '',
      audienceSegment: [],
      productFocus: [],
      caption: '',
      visualBrief: '',
      campaignId: '',
      notes: '',
    },
    contentSaving: false,
    contentPendingApproval: false,
    contentSaveError: null,

    // Calendar view mode: 'month' | 'week'
    calendarViewMode: 'month',

    // Calendar memoization
    _calendarDaysKey: null,
    _calendarDaysCached: null,

    // Month-level fetch cache
    _calendarMonthCache: {},

    // Pre-computed rendered arrays for Alpine x-for (avoids method calls in templates)
    _renderedCalendarDays: [],
    _renderedWeekDays: [],

    // Lazily-built icon lookup map
    _contentTypeIcons: null,

    runMarketingAiTool(toolName) {
      const inputs = this.mktopsAiInputs;
      let prompt = '';
      switch (toolName) {
        case 'customer_psychology_generator':
          prompt = `Use the customer_psychology_generator tool to analyze the segment "${inputs.segment}"${inputs.context ? '. Context: ' + inputs.context : ''}`;
          break;
        case 'competitor_analysis':
          prompt = `Use the competitor_analysis tool to analyze "${inputs.competitor}"${inputs.focus ? '. Focus on: ' + inputs.focus : ''}`;
          break;
        case 'content_strategy_generator':
          prompt = `Use the content_strategy_generator tool for topic "${inputs.topic}"${inputs.audience ? '. Audience: ' + inputs.audience : ''}${inputs.goal ? '. Goal: ' + inputs.goal : ''}`;
          break;
        case 'campaign_ideator':
          prompt = `Use the campaign_ideator tool for product "${inputs.product}"${inputs.goal ? '. Goal: ' + inputs.goal : ''}${inputs.budget ? '. Budget: ' + inputs.budget : ''}`;
          break;
      }
      if (prompt) {
        this.inputText = prompt;
        this.view = 'chat';
        this.$nextTick(() => this.sendMessage());
      }
    },

    async loadMarketingOps() {
      const signal = this.beginRequest('marketingOps');
      this.mktopsLoading = true;
      try {
        const res = await fetch('/api/marketing-ops', { signal });
        if (res.ok) {
          this.mktops = await res.json();
          this.mktopsLastRefresh = new Date();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Marketing Ops load error:', err);
      } finally {
        this.endRequest('marketingOps', signal);
        this.mktopsLoading = false;
      }
    },

    getMktopsRefreshLabel() {
      if (!this.mktopsLastRefresh) return 'Never refreshed';
      const diff = Math.round((Date.now() - this.mktopsLastRefresh.getTime()) / 1000);
      if (diff < 60) return `Refreshed ${diff}s ago`;
      if (diff < 3600) return `Refreshed ${Math.round(diff / 60)}m ago`;
      return `Refreshed ${Math.round(diff / 3600)}h ago`;
    },

    // ── Content Calendar Methods ──────────────────────────────

    async loadCalendar() {
      const month = this.calendarMonth;

      // Serve from cache immediately if available
      if (this._calendarMonthCache[month]) {
        this.calendarData = this._calendarMonthCache[month];
        this._calendarDaysKey = null;
        this.calendarLoading = false;
        this._rebuildCalendarView();
        this._prefetchAdjacentMonths(month);
        return;
      }

      this.calendarLoading = true;
      this.calendarData = null;
      try {
        const res = await fetch(`/api/marketing-ops/content/calendar?month=${month}`);
        if (res.ok) {
          const data = await res.json();
          this._calendarMonthCache[month] = data;
          this.calendarData = data;
        } else {
          this.calendarData = { items: [] };
        }
      } catch (err) {
        console.error('Calendar load error:', err);
        this.calendarData = { items: [] };
      } finally {
        this._calendarDaysKey = null;
        this.calendarLoading = false;
        this._rebuildCalendarView();
        this._prefetchAdjacentMonths(month);
      }
    },

    _prefetchAdjacentMonths(month) {
      const [y, m] = month.split('-').map(Number);
      const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
      const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
      [prev, next].forEach(mo => {
        if (!this._calendarMonthCache[mo]) {
          fetch(`/api/marketing-ops/content/calendar?month=${mo}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => { if (data) this._calendarMonthCache[mo] = data; })
            .catch(() => {});
        }
      });
    },

    navigateMonth(direction) {
      const [year, month] = this.calendarMonth.split('-').map(Number);
      const d = new Date(year, month - 1 + direction, 1);
      this.calendarMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      this.loadCalendar();
    },

    goToToday() {
      const d = new Date();
      this.calendarMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      this.loadCalendar();
    },

    getCalendarMonthLabel() {
      const [year, month] = this.calendarMonth.split('-').map(Number);
      return new Date(year, month - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    },

    isCurrentCalendarMonth() {
      const d = new Date();
      const current = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      return this.calendarMonth === current;
    },

    getCalendarDays() {
      // Memoize: rebuild only when month or data length changes
      const cacheKey = this.calendarMonth + '_' + (this.calendarData && this.calendarData.items ? this.calendarData.items.length : 0);
      if (cacheKey === this._calendarDaysKey && this._calendarDaysCached) {
        return this._calendarDaysCached;
      }

      const [year, month] = this.calendarMonth.split('-').map(Number);
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

      const firstDay = new Date(year, month - 1, 1);
      const lastDay = new Date(year, month, 0);

      // Start grid on Monday (ISO week). getDay() → 0=Sun, 1=Mon...
      const startDow = firstDay.getDay(); // 0=Sun
      const startOffset = (startDow === 0) ? 6 : startDow - 1; // days before month start (Mon-based)

      // Use byDate map from API if available, else fall back to filtering items array
      const byDate = (this.calendarData && this.calendarData.byDate) || null;
      const allItems = (this.calendarData && this.calendarData.items) ? this.calendarData.items : [];

      const days = [];
      // Fill leading days from prev month
      for (let i = startOffset - 1; i >= 0; i--) {
        const d = new Date(year, month - 1, -i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ date: dateStr, dayNum: d.getDate(), isToday: false, isCurrentMonth: false, items: [] });
      }

      // Fill current month
      for (let day = 1; day <= lastDay.getDate(); day++) {
        const dateStr = year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
        const items = byDate
          ? ((byDate[dateStr]) || [])
          : allItems.filter(item => item.publishDate && item.publishDate.startsWith(dateStr));
        days.push({ date: dateStr, dayNum: day, isToday: dateStr === todayStr, isCurrentMonth: true, items });
      }

      // Fill trailing days to complete 6-row grid (42 cells)
      const total = 42;
      let nextDay = 1;
      while (days.length < total) {
        const d = new Date(year, month, nextDay++);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        days.push({ date: dateStr, dayNum: d.getDate(), isToday: false, isCurrentMonth: false, items: [] });
      }

      this._calendarDaysKey = cacheKey;
      this._calendarDaysCached = days;
      return days;
    },

    getFilteredCalendarItems(items) {
      return items.filter(item => {
        // Content type filter chips
        const activeTypes = this.calendarFilters.contentTypes;
        if (activeTypes.length > 0 && item.contentType) {
          if (!activeTypes.includes(item.contentType)) return false;
        }
        // Status filter
        if (this.calendarFilters.status !== 'all' && item.status !== this.calendarFilters.status) return false;
        // Pillar filter
        if (this.calendarFilters.pillar !== 'all' && item.contentPillar !== this.calendarFilters.pillar) return false;
        return true;
      });
    },

    toggleContentTypeFilter(type) {
      const idx = this.calendarFilters.contentTypes.indexOf(type);
      if (idx >= 0) {
        this.calendarFilters.contentTypes = this.calendarFilters.contentTypes.filter(t => t !== type);
      } else {
        this.calendarFilters.contentTypes = [...this.calendarFilters.contentTypes, type];
      }
      this._rebuildCalendarView();
    },

    getUpcomingThisWeek() {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      // End of current week (Sunday)
      const dayOfWeek = today.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + daysToSunday);
      const endStr = endOfWeek.toISOString().slice(0, 10);

      const allItems = (this.calendarData && this.calendarData.items) ? this.calendarData.items : [];
      return allItems
        .filter(item => item.publishDate && item.publishDate >= todayStr && item.publishDate <= endStr)
        .sort((a, b) => a.publishDate.localeCompare(b.publishDate));
    },

    getUnscheduledItems() {
      // Prefer the dedicated unscheduled array from the API if present
      const unscheduled = (this.calendarData && this.calendarData.unscheduled)
        ? this.calendarData.unscheduled
        : (this.calendarData && this.calendarData.items ? this.calendarData.items.filter(item => !item.publishDate) : []);
      return this.getFilteredCalendarItems(unscheduled);
    },

    openContentModal(mode, date, item) {
      this.contentModalMode = mode;
      this.contentPendingApproval = false;
      this.contentSaveError = null;
      if (mode === 'create') {
        this.contentForm = {
          id: null,
          name: '',
          status: 'Briefed',
          contentType: 'Carousel',
          contentPillar: '',
          publishDate: date || '',
          owner: '',
          hook: '',
          audienceSegment: [],
          productFocus: [],
          caption: '',
          visualBrief: '',
          campaignId: '',
          notes: '',
        };
      } else if (mode === 'edit' && item) {
        this.contentForm = {
          id: item.id || null,
          name: item.name || '',
          status: item.status || 'Idea',
          contentType: item.contentType || 'Feed Post',
          contentPillar: item.contentPillar || '',
          publishDate: item.publishDate || '',
          owner: item.owner || '',
          hook: item.hook || '',
          audienceSegment: Array.isArray(item.audienceSegment) ? [...item.audienceSegment] : [],
          productFocus: Array.isArray(item.productFocus) ? [...item.productFocus] : [],
          caption: item.caption || '',
          visualBrief: item.visualBrief || '',
          campaignId: item.campaignId || '',
          notes: item.notes || '',
        };
      }
      this.contentModalOpen = true;
    },

    closeContentModal() {
      this.contentModalOpen = false;
      this.contentSaving = false;
      this.contentPendingApproval = false;
      this.contentSaveError = null;
      this.contentForm = {
        id: null,
        name: '',
        status: 'Briefed',
        contentType: 'Carousel',
        contentPillar: '',
        publishDate: '',
        owner: '',
        hook: '',
        audienceSegment: [],
        productFocus: [],
        caption: '',
        visualBrief: '',
        campaignId: '',
        notes: '',
      };
    },

    async saveContent() {
      if (!this.contentForm.name.trim()) return;
      this.contentSaving = true;
      this.contentSaveError = null;
      try {
        const isEdit = this.contentModalMode === 'edit' && this.contentForm.id;
        const url = isEdit
          ? `/api/marketing-ops/content/${this.contentForm.id}`
          : '/api/marketing-ops/content';
        const method = isEdit ? 'PATCH' : 'POST';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.contentForm),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (data.pendingApproval || data.status === 'pending') {
            // Approval gate triggered
            this.contentPendingApproval = true;
            this.contentSaving = false;
            // Don't close modal — show pending state
          } else {
            this.closeContentModal();
            // Invalidate month cache so next load fetches fresh data
            delete this._calendarMonthCache[this.calendarMonth];
            await this.loadCalendar();
          }
        } else {
          this.contentSaveError = data.error || 'Failed to save. Please try again.';
          this.contentSaving = false;
        }
      } catch (err) {
        console.error('Save content error:', err);
        this.contentSaveError = 'Network error. Please try again.';
        this.contentSaving = false;
      }
    },

    getContentTypeIcon(type) {
      switch (type) {
        case 'Carousel':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="4" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.5"/><rect x="4" y="2" width="8" height="9" rx="1" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
        case 'Reel':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 5l4 2-4 2V5z" fill="currentColor"/></svg>';
        case 'Feed Post':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="1" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M1 9l3-3 3 3 2-2 4 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        case 'Story':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="3" y="1" width="8" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><line x1="5" y1="4" x2="9" y2="4" stroke="currentColor" stroke-width="1.2"/><line x1="5" y1="6.5" x2="9" y2="6.5" stroke="currentColor" stroke-width="1.2"/></svg>';
        case 'WhatsApp':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5A5.5 5.5 0 0 0 2.09 9.8L1.5 12.5l2.76-.58A5.5 5.5 0 1 0 7 1.5z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M5 5.5c0 2.485 1.515 4 4 4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
        case 'Blog':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/><line x1="4" y1="4.5" x2="10" y2="4.5" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="7" x2="10" y2="7" stroke="currentColor" stroke-width="1.2"/><line x1="4" y1="9.5" x2="7.5" y2="9.5" stroke="currentColor" stroke-width="1.2"/></svg>';
        case 'Email':
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 4l6 4 6-4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
        default:
          return '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="2" y="1" width="10" height="12" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>';
      }
    },

    _getIconMap() {
      if (this._contentTypeIcons) return this._contentTypeIcons;
      this._contentTypeIcons = {};
      for (const type of ['Carousel', 'Reel', 'Feed Post', 'Story', 'Email', 'WhatsApp', 'Blog']) {
        this._contentTypeIcons[type] = this.getContentTypeIcon(type);
      }
      this._contentTypeIcons['_default'] = this.getContentTypeIcon('Other');
      return this._contentTypeIcons;
    },

    _rebuildCalendarView() {
      const iconMap = this._getIconMap();
      const activeTypes = this.calendarFilters.contentTypes;
      const filterStatus = this.calendarFilters.status;
      const filterPillar = this.calendarFilters.pillar;

      const filterFn = (items) => {
        return items.filter(item => {
          if (activeTypes.length > 0 && item.contentType && !activeTypes.includes(item.contentType)) return false;
          if (filterStatus !== 'all' && item.status !== filterStatus) return false;
          if (filterPillar !== 'all' && item.contentPillar !== filterPillar) return false;
          return true;
        });
      };

      // Month view
      const rawDays = this.getCalendarDays();
      this._renderedCalendarDays = rawDays.map(cell => ({
        ...cell,
        filtered: filterFn(cell.items),
      }));

      // Week view — always compute so toggling is instant
      const rawWeek = this.getWeekDays();
      this._renderedWeekDays = rawWeek.map(day => ({
        ...day,
        filtered: filterFn(day.items),
      }));

      // Suppress unused-variable lint warning — iconMap is available for future chip pre-baking
      void iconMap;
    },

    getChipType(item) {
      return (item && item.contentType) || 'Other';
    },

    formatCalDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    },

    // ── Marketing Tasks ──────────────────────────────────

    async loadMarketingTasks() {
      this.mktopsTasksLoading = true;
      try {
        const [tasksRes, summaryRes] = await Promise.all([
          fetch('/api/marketing-ops/tasks'),
          fetch('/api/marketing-ops/tasks/summary'),
        ]);
        if (tasksRes.ok) {
          const data = await tasksRes.json();
          this.mktopsTasks = data.tasks || [];
        }
        if (summaryRes.ok) {
          this.mktopsTasksSummary = await summaryRes.json();
        }
      } catch (err) {
        console.error('Marketing Tasks load error:', err);
        this.mktopsTasks = [];
      } finally {
        this.mktopsTasksLoading = false;
      }
    },

    getTasksByStatus(status) {
      if (!this.mktopsTasks) return [];
      return this.mktopsTasks.filter(task => {
        if (task.status !== status) return false;
        const f = this.mktopsTasksFilter;
        if (f.priority !== 'all' && task.priority !== f.priority) return false;
        if (f.channel !== 'all' && task.channel !== f.channel) return false;
        if (f.type !== 'all' && task.type !== f.type) return false;
        return true;
      });
    },

    getTaskPriorityClass(priority) {
      switch ((priority || '').toLowerCase()) {
        case 'urgent': return 'task-priority-urgent';
        case 'high':   return 'task-priority-high';
        case 'medium': return 'task-priority-medium';
        case 'low':    return 'task-priority-low';
        default:       return 'task-priority-default';
      }
    },

    isTaskOverdue(task) {
      if (!task.dueDate) return false;
      const due = new Date(task.dueDate + 'T23:59:59');
      return due < new Date();
    },

    formatTaskDue(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    },

    // ── Drag-and-Drop Rescheduling ────────────────────────────

    async handleCalendarDrop(event, targetDate) {
      event.currentTarget.classList.remove('drag-over');
      let data;
      try {
        data = JSON.parse(event.dataTransfer.getData('text/plain'));
      } catch {
        return;
      }
      if (!data.id || data.fromDate === targetDate) return;

      // Optimistic: move item in live calendarData immediately, no server wait
      const items = this.calendarData && this.calendarData.items;
      if (!items) return;

      const item = items.find(i => i.id === data.id);
      if (!item) return;

      const oldDate = item.publishDate;
      item.publishDate = targetDate;

      // Update byDate map in place
      const byDate = this.calendarData.byDate || {};
      if (byDate[oldDate]) {
        byDate[oldDate] = byDate[oldDate].filter(i => i.id !== data.id);
      }
      if (!byDate[targetDate]) byDate[targetDate] = [];
      byDate[targetDate].push(item);
      this.calendarData.byDate = byDate;

      // Rebuild rendered arrays immediately — no loading state, no flash
      this._calendarDaysKey = null;
      this._rebuildCalendarView();

      // Fire PATCH in background
      try {
        const res = await fetch(`/api/marketing-ops/content/${data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publishDate: targetDate }),
        });
        if (!res.ok) throw new Error('PATCH failed');
        // Invalidate month cache so next explicit reload fetches fresh data
        delete this._calendarMonthCache[this.calendarMonth];
      } catch (err) {
        console.error('Reschedule error — reverting:', err);
        // Revert optimistic move
        item.publishDate = oldDate;
        if (byDate[targetDate]) {
          byDate[targetDate] = byDate[targetDate].filter(i => i.id !== data.id);
        }
        if (!byDate[oldDate]) byDate[oldDate] = [];
        byDate[oldDate].push(item);
        this.calendarData.byDate = { ...byDate };
        this._calendarDaysKey = null;
        this._rebuildCalendarView();
      }
    },

    // ── Week View ─────────────────────────────────────────────

    getWeekDays() {
      const [year, month] = this.calendarMonth.split('-').map(Number);
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      // Use today if in current displayed month, otherwise 1st of month
      const referenceDate = (today.getFullYear() === year && today.getMonth() + 1 === month)
        ? today
        : new Date(year, month - 1, 1);

      const dayOfWeek = referenceDate.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(referenceDate);
      monday.setDate(referenceDate.getDate() + mondayOffset);

      const days = [];
      const byDate = (this.calendarData && this.calendarData.byDate) || {};
      const allItems = (this.calendarData && this.calendarData.items) || [];

      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const items = byDate[dateStr] !== undefined
          ? byDate[dateStr]
          : allItems.filter(item => item.publishDate === dateStr);
        days.push({
          date: dateStr,
          dayNum: d.getDate(),
          dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          isToday: dateStr === todayStr,
          isCurrentMonth: d.getMonth() + 1 === month,
          items,
        });
      }
      return days;
    },

    navigateWeek(direction) {
      // Shift the reference month by 7 days from the first of the current display month
      const [year, month] = this.calendarMonth.split('-').map(Number);
      const d = new Date(year, month - 1, 1);
      d.setDate(d.getDate() + direction * 7);
      this.calendarMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      this._calendarDaysKey = null;
      this.loadCalendar();
    },
  };
}
