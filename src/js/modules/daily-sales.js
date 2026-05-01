/**
 * Daily Sales dashboard module
 * State and methods for the /daily-sales view.
 *
 * Phase 1: Realized badge, data quality section (acceptance mix + duplicates)
 * Phase 2: Filter strip, URL hash state, click-to-drill sheet
 *
 * Fetches GET /api/daily-sales (with filter query string) when view becomes active.
 * Cached in module state — explicit refresh button re-fetches.
 */

export function createDailySalesModule() {
  return {
    // ── Data ─────────────────────────────────────────────────────
    dailySales: null,         // full API payload
    dailySalesLoading: false,
    dailySalesError: null,

    // ── Chart state ───────────────────────────────────────────────
    _dsTrendPaths: null,      // { revenuePath, ordersPath, revenueFill, ordersFill, xLabels, gridLines }
    _dsTrendMetric: 'revenue', // 'revenue' | 'orders' | 'aov' — which metric to plot
    _dsTrendTooltip: {        // hover tooltip state
      visible: false,
      x: 0, y: 0,
      date: '', revenue: '', orders: '', aov: '',
    },

    // ── Phase 1: Realized badge ───────────────────────────────────
    dailySalesRealizedExpanded: false,  // toggle breakdown visibility

    // ── Phase 2: Filter state ─────────────────────────────────────
    // Mirrors filters.applied from the API response.
    dailySalesFilters: {
      from: null,             // YYYY-MM-DD or null
      to: null,               // YYYY-MM-DD or null
      channels: [],           // string[]
      orderType: 'all',       // 'all' | 'B2C' | 'B2B'
      paymentMode: 'all',     // 'all' | specific value
      status: 'realized',     // 'realized' | 'all' | specific status name
      excludeStatuses: [],    // string[] — statuses to exclude (lens patch)
      state: '',              // '' or specific state
      printMethod: '',        // '' or specific tag/print method
      acceptanceStatus: '',   // '' | 'Accepted' | 'Awaiting' | 'Rejected' (v5 new)
    },

    // Which filter dropdown is open: 'date' | 'status' | 'acceptance' | 'state' | null
    // Channel dropdown removed per UI Spec §14 — Order Type chips replace it
    _dsFilterDropdownOpen: null,

    // ── v5 Weekly Trend chart ─────────────────────────────────────
    _dsWeeklyMetric: 'revenue',  // 'revenue' | 'orders'
    _dsWeeklyTooltip: {
      visible: false,
      x: 0, y: 0,
      week: '', dateRange: '', orders: '', revenue: '', aov: '',
    },

    // ── v5 Concerns collapsible state ────────────────────────────
    _dsConcernsPendingOpen: true,
    _dsConcernsRejectedOpen: true,
    _dsConcernsStuckOpen: false,

    // Debounce timer ref for filter changes
    _dsFilterDebounce: null,

    // ── v5: Lens segment control ──────────────────────────────────
    // 'realized' | 'active' | 'all' | 'custom'
    dailySalesLens: 'realized',

    // ── v5: Stat-card tooltip state ───────────────────────────────
    // null | 'yesterday' | 'mtd' | 'ytd'
    dailySalesActiveTooltip: null,

    // ── Phase 2: Drill sheet ──────────────────────────────────────
    dailySalesDrill: {
      open: false,
      title: '',
      context: {},         // { type, value } — the dimension being drilled
      orders: [],
      total: 0,
      loading: false,
      hasMore: false,
      offset: 0,
    },

    // Ref to the element that triggered drill-open (for focus return)
    _dsDrillTriggerEl: null,

    // ── Load ──────────────────────────────────────────────────────

    async loadDailySales() {
      if (this.dailySalesLoading) return;
      this.dailySalesLoading = true;
      this.dailySalesError = null;

      try {
        const qs = this._filterToQueryString();
        const url = qs ? `/api/daily-sales?${qs}` : '/api/daily-sales';
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.dailySales = await res.json();

        // Sync filter state from API response (default status etc.)
        if (this.dailySales?.filters?.applied) {
          this.dailySalesFilters = { ...this.dailySalesFilters, ...this.dailySales.filters.applied };
        }

        // Compute SVG paths after data loads
        this.$nextTick(() => this._dsComputeTrendPaths());
      } catch (err) {
        console.error('[daily-sales] load error:', err);
        this.dailySalesError = 'Failed to load sales data. Try again.';
      } finally {
        this.dailySalesLoading = false;
      }
    },

    // ── Phase 2: Filter methods ───────────────────────────────────

    /**
     * Update a single filter key and debounce the reload by 500ms.
     * Prevents API spam when user clicks several chips in quick succession.
     * When status or excludeStatuses change manually (not via applyLensFilter),
     * check whether the result still matches a named lens — if not, mark as custom.
     */
    setDailyFilter(key, value) {
      this.dailySalesFilters[key] = value;

      // When user manually touches status, re-evaluate lens
      if (key === 'status' || key === 'excludeStatuses') {
        this.dailySalesLens = this._detectLens();
      }

      this._updateUrlHash();

      if (this._dsFilterDebounce) clearTimeout(this._dsFilterDebounce);
      this._dsFilterDebounce = setTimeout(() => {
        this._dsFilterDebounce = null;
        this.loadDailySales();
      }, 500);
    },

    /**
     * Toggle a single channel in the multi-select channels filter.
     */
    toggleDailyChannel(channel) {
      const channels = [...(this.dailySalesFilters.channels || [])];
      const idx = channels.indexOf(channel);
      if (idx === -1) {
        channels.push(channel);
      } else {
        channels.splice(idx, 1);
      }
      this.setDailyFilter('channels', channels);
    },

    /**
     * Check whether a specific channel is active in the filter.
     */
    isDailyChannelActive(channel) {
      return (this.dailySalesFilters.channels || []).includes(channel);
    },

    /**
     * Reset all filters to their defaults, then reload.
     */
    resetDailyFilters() {
      if (this._dsFilterDebounce) clearTimeout(this._dsFilterDebounce);
      this.dailySalesFilters = {
        from: null,
        to: null,
        channels: [],
        orderType: 'all',
        paymentMode: 'all',
        status: 'realized',
        excludeStatuses: [],
        state: '',
        printMethod: '',
        acceptanceStatus: '',
      };
      this.dailySalesLens = 'realized';
      this._updateUrlHash();
      this.loadDailySales();
    },

    /**
     * Apply a date-range preset.
     * preset: 'today' | 'yesterday' | '7d' | '30d' | 'mtd' | 'ytd'
     */
    applyDateRangePreset(preset) {
      const now = new Date();
      const toISO = (d) => d.toISOString().slice(0, 10);
      const today = toISO(now);

      let from = null;
      let to = null;

      if (preset === 'today') {
        from = today;
        to = today;
      } else if (preset === 'yesterday') {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        from = toISO(y);
        to = toISO(y);
      } else if (preset === '7d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        from = toISO(d);
        to = today;
      } else if (preset === '30d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        from = toISO(d);
        to = today;
      } else if (preset === 'mtd') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        from = toISO(d);
        to = today;
      } else if (preset === 'ytd') {
        // Indian FY: Apr 1 of current FY
        const fyStart = now.getMonth() >= 3
          ? new Date(now.getFullYear(), 3, 1)
          : new Date(now.getFullYear() - 1, 3, 1);
        from = toISO(fyStart);
        to = today;
      } else if (preset === 'custom') {
        // Keep from/to as-is, just close dropdown — user edits via date inputs
        this._dsFilterDropdownOpen = null;
        return;
      }

      this.dailySalesFilters.from = from;
      this.dailySalesFilters.to = to;
      this._dsFilterDropdownOpen = null;
      this._updateUrlHash();

      if (this._dsFilterDebounce) clearTimeout(this._dsFilterDebounce);
      this._dsFilterDebounce = setTimeout(() => {
        this._dsFilterDebounce = null;
        this.loadDailySales();
      }, 500);
    },

    /**
     * Returns true when any filter differs from its default.
     */
    isDailyFilterActive() {
      const f = this.dailySalesFilters;
      return !!(
        f.from ||
        f.to ||
        (f.channels && f.channels.length > 0) ||
        (f.orderType && f.orderType !== 'all') ||
        (f.paymentMode && f.paymentMode !== 'all') ||
        (f.status && f.status !== 'realized') ||
        (f.excludeStatuses && f.excludeStatuses.length > 0) ||
        f.state ||
        f.printMethod ||
        f.acceptanceStatus
      );
    },

    /**
     * Human-readable label for the current date range.
     */
    dsDateRangeLabel() {
      const f = this.dailySalesFilters;
      if (!f.from && !f.to) return 'Date';
      if (f.from && f.to && f.from === f.to) return this._dsShortDate(f.from);
      if (f.from && f.to) return `${this._dsShortDate(f.from)} – ${this._dsShortDate(f.to)}`;
      if (f.from) return `From ${this._dsShortDate(f.from)}`;
      return `To ${this._dsShortDate(f.to)}`;
    },

    _dsShortDate(iso) {
      if (!iso) return '';
      try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } catch { return iso; }
    },

    /**
     * Toggle a filter dropdown open/closed.
     * Closes all others first.
     */
    toggleDsFilterDropdown(name) {
      this._dsFilterDropdownOpen = this._dsFilterDropdownOpen === name ? null : name;
    },

    /**
     * Close all filter dropdowns.
     */
    closeDsFilterDropdown() {
      this._dsFilterDropdownOpen = null;
    },

    /**
     * Serialize current filter state to a URL query string.
     * Omits default values to keep URLs clean.
     */
    _filterToQueryString() {
      const f = this.dailySalesFilters;
      const params = new URLSearchParams();
      if (f.from) params.set('from', f.from);
      if (f.to) params.set('to', f.to);
      if (f.channels && f.channels.length > 0) params.set('channels', f.channels.join(','));
      if (f.orderType && f.orderType !== 'all') params.set('orderType', f.orderType);
      if (f.paymentMode && f.paymentMode !== 'all') params.set('paymentMode', f.paymentMode);
      if (f.status && f.status !== 'realized') params.set('status', f.status);
      if (f.excludeStatuses && f.excludeStatuses.length > 0) params.set('excludeStatuses', f.excludeStatuses.join(','));
      if (f.state) params.set('state', f.state);
      if (f.printMethod) params.set('printMethod', f.printMethod);
      if (f.acceptanceStatus) params.set('acceptanceStatus', f.acceptanceStatus);
      return params.toString();
    },

    /**
     * Parse window.location.hash after '#daily-sales?' into filter state.
     * Called on view mount.
     */
    _filterFromHash() {
      const hash = window.location.hash;
      if (!hash.startsWith('#daily-sales')) return;
      const queryPart = hash.split('?')[1];
      if (!queryPart) return;
      const params = new URLSearchParams(queryPart);

      // Restore lens first; if present, derive status/excludeStatuses from it
      const lensParam = params.get('lens');
      if (lensParam && ['realized', 'active', 'all'].includes(lensParam)) {
        this.dailySalesLens = lensParam;
        const lensFilter = this._lensToFilter(lensParam);
        this.dailySalesFilters = {
          from: params.get('from') || null,
          to: params.get('to') || null,
          channels: params.get('channels') ? params.get('channels').split(',') : [],
          orderType: params.get('orderType') || 'all',
          paymentMode: params.get('paymentMode') || 'all',
          status: lensFilter.status,
          excludeStatuses: lensFilter.excludeStatuses,
          state: params.get('state') || '',
          printMethod: params.get('printMethod') || '',
          acceptanceStatus: params.get('acceptanceStatus') || '',
        };
      } else {
        // Custom or no lens — restore explicit filters
        this.dailySalesLens = 'custom';
        this.dailySalesFilters = {
          from: params.get('from') || null,
          to: params.get('to') || null,
          channels: params.get('channels') ? params.get('channels').split(',') : [],
          orderType: params.get('orderType') || 'all',
          paymentMode: params.get('paymentMode') || 'all',
          status: params.get('status') || 'realized',
          excludeStatuses: params.get('excludeStatuses') ? params.get('excludeStatuses').split(',') : [],
          state: params.get('state') || '',
          printMethod: params.get('printMethod') || '',
          acceptanceStatus: params.get('acceptanceStatus') || '',
        };
      }
    },

    /**
     * Push current filter state into the URL hash.
     * Omits default values so clean state = just #daily-sales.
     */
    _updateUrlHash() {
      const f = this.dailySalesFilters;
      const params = new URLSearchParams();

      // Lens — written first for readability in the URL
      if (this.dailySalesLens && this.dailySalesLens !== 'custom') {
        params.set('lens', this.dailySalesLens);
      }

      // Non-lens filters
      if (f.from) params.set('from', f.from);
      if (f.to) params.set('to', f.to);
      if (f.channels && f.channels.length > 0) params.set('channels', f.channels.join(','));
      if (f.orderType && f.orderType !== 'all') params.set('orderType', f.orderType);
      if (f.paymentMode && f.paymentMode !== 'all') params.set('paymentMode', f.paymentMode);

      // When lens is custom, write explicit status/excludeStatuses to hash
      if (this.dailySalesLens === 'custom') {
        if (f.status && f.status !== 'realized') params.set('status', f.status);
        if (f.excludeStatuses && f.excludeStatuses.length > 0) params.set('excludeStatuses', f.excludeStatuses.join(','));
      }

      if (f.state) params.set('state', f.state);
      if (f.printMethod) params.set('printMethod', f.printMethod);
      if (f.acceptanceStatus) params.set('acceptanceStatus', f.acceptanceStatus);

      const qs = params.toString();
      const newHash = qs ? `#daily-sales?${qs}` : '#daily-sales';
      // Replace rather than push to avoid polluting browser history
      const url = window.location.pathname + window.location.search + newHash;
      history.replaceState(null, '', url);
    },

    // ── Phase 2: Drill sheet ──────────────────────────────────────

    /**
     * Open the drill sheet for a given dimension/value pair.
     * context = { type: 'state'|'channel'|'orderType'|'paymentMode', value: string }
     * Fetches /api/daily-sales/orders with filters + drill dimension applied.
     */
    async openDrillSheet(context, triggerEl) {
      this._dsDrillTriggerEl = triggerEl || null;

      this.dailySalesDrill = {
        open: true,
        title: this._dsDrillTitle(context),
        context,
        orders: [],
        total: 0,
        loading: true,
        hasMore: false,
        offset: 0,
      };

      // Focus close button after open (handled in template via x-effect/x-ref)
      this.$nextTick(() => {
        const closeBtn = document.getElementById('ds-drill-close-btn');
        if (closeBtn) closeBtn.focus();
      });

      await this._fetchDrillOrders(context, 0, true);
    },

    /**
     * Fetch the next page of drill orders (pagination).
     */
    async loadMoreDrillOrders() {
      if (!this.dailySalesDrill.hasMore || this.dailySalesDrill.loading) return;
      const nextOffset = this.dailySalesDrill.offset + 100;
      await this._fetchDrillOrders(this.dailySalesDrill.context, nextOffset, false);
    },

    /**
     * Internal: fetch orders for the drill sheet.
     * append=true to paginate, false to replace.
     */
    async _fetchDrillOrders(context, offset, replace) {
      this.dailySalesDrill.loading = true;
      try {
        const params = new URLSearchParams();
        // Pass current filters
        const f = this.dailySalesFilters;
        if (f.from) params.set('from', f.from);
        if (f.to) params.set('to', f.to);
        if (f.channels && f.channels.length > 0) params.set('channels', f.channels.join(','));
        if (f.orderType && f.orderType !== 'all') params.set('orderType', f.orderType);
        if (f.paymentMode && f.paymentMode !== 'all') params.set('paymentMode', f.paymentMode);
        if (f.status && f.status !== 'realized') params.set('status', f.status);

        // Override with drill dimension
        if (context.type === 'state') params.set('state', context.value);
        if (context.type === 'channel') params.set('channels', context.value);
        if (context.type === 'orderType') params.set('orderType', context.value);
        if (context.type === 'paymentMode') params.set('paymentMode', context.value);
        if (context.type === 'status') params.set('status', context.value);
        if (context.type === 'printMethod') params.set('printMethod', context.value);

        params.set('limit', '100');
        params.set('offset', String(offset));

        const res = await fetch(`/api/daily-sales/orders?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        if (replace) {
          this.dailySalesDrill.orders = data.orders || [];
        } else {
          this.dailySalesDrill.orders = [...this.dailySalesDrill.orders, ...(data.orders || [])];
        }
        this.dailySalesDrill.total = data.total || 0;
        this.dailySalesDrill.hasMore = data.hasMore || false;
        this.dailySalesDrill.offset = offset;
      } catch (err) {
        console.error('[daily-sales] drill fetch error:', err);
        if (replace) this.dailySalesDrill.orders = [];
      } finally {
        this.dailySalesDrill.loading = false;
      }
    },

    /**
     * Close the drill sheet and restore focus to the trigger element.
     */
    closeDrillSheet() {
      this.dailySalesDrill.open = false;
      if (this._dsDrillTriggerEl) {
        this._dsDrillTriggerEl.focus();
        this._dsDrillTriggerEl = null;
      }
    },

    /**
     * Build a human-readable title for the drill sheet header.
     */
    _dsDrillTitle(context) {
      const now = new Date();
      const month = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      switch (context.type) {
        case 'state': return `${context.value} · ${month}`;
        case 'channel': return `${context.value} · ${month}`;
        case 'orderType': return `${context.value} Orders · ${month}`;
        case 'paymentMode': return `${context.value} Payments · ${month}`;
        case 'status': return `${context.value} Orders · ${month}`;
        case 'printMethod': return `${context.value} · ${month}`;
        default: return `Drill · ${month}`;
      }
    },

    // ── Phase 1: Realized badge ───────────────────────────────────

    /**
     * Toggle the realized breakdown panel.
     */
    toggleRealizedBreakdown() {
      this.dailySalesRealizedExpanded = !this.dailySalesRealizedExpanded;
    },

    // ── Helpers ───────────────────────────────────────────────────

    /**
     * Format count as pct of total, e.g. "80.6%"
     */
    dsFormatPctOfTotal(count, total) {
      if (!total) return '0%';
      return `${((count / total) * 100).toFixed(1)}%`;
    },

    /**
     * Revenue total from drill orders list.
     */
    dsDrillTotalRevenue() {
      return this.dailySalesDrill.orders.reduce((sum, o) => sum + (o.amountWithTax || 0), 0);
    },

    // ── v4 Freshness helpers ──────────────────────────────────────

    /**
     * "2026-04-28" → "Apr 28, 2026"
     */
    formatDataCutoff(iso) {
      if (!iso) return '';
      try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
        });
      } catch { return iso; }
    },

    /**
     * "2026-04-28" → "Apr 28" (short, for period label and MTD/YTD appendix)
     */
    formatCutoffShort(iso) {
      if (!iso) return '';
      try {
        const [y, m, d] = iso.split('-').map(Number);
        return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short',
        });
      } catch { return iso; }
    },

    /**
     * ISO timestamp → "2 minutes ago" / "just now" / "5 hours ago" / "yesterday"
     */
    formatRelativeTime(iso) {
      if (!iso) return '';
      try {
        const diffMs = Date.now() - new Date(iso).getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'just now';
        if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? '' : 's'} ago`;
        const diffHr = Math.floor(diffMin / 60);
        if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? '' : 's'} ago`;
        const diffDay = Math.floor(diffHr / 24);
        if (diffDay === 1) return 'yesterday';
        return `${diffDay} days ago`;
      } catch { return ''; }
    },

    // ── Formatters ────────────────────────────────────────────────

    /**
     * Format a number in Indian rupee style: ₹1,82,000
     * Uses Intl.NumberFormat with en-IN locale for lakh/crore comma placement.
     */
    formatINR(amount) {
      if (amount == null || isNaN(amount)) return '₹0';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(amount);
    },

    /**
     * Format a percentage, handling null (div-by-zero from server).
     * null → "—"  |  number → "+12.3%" or "-4.5%"
     */
    formatPct(pct) {
      if (pct == null) return '—';
      const sign = pct >= 0 ? '+' : '';
      return `${sign}${pct.toFixed(1)}%`;
    },

    /**
     * Returns a CSS class name based on delta sign.
     * Used to colour delta text green/red/neutral.
     */
    deltaClass(delta) {
      if (delta == null || delta === 0) return 'ds-delta-neutral';
      return delta > 0 ? 'ds-delta-up' : 'ds-delta-down';
    },

    /**
     * Arrow character for delta direction.
     */
    deltaArrow(delta) {
      if (delta == null || delta === 0) return '−';
      return delta > 0 ? '↑' : '↓';
    },

    /**
     * Format ISO timestamp to a localised time string.
     * e.g. "2026-04-28T10:00:00.000Z" → "28 Apr 2026, 3:30 PM"
     */
    dsFormatDate(iso) {
      if (!iso) return '';
      try {
        return new Date(iso).toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      } catch {
        return iso;
      }
    },

    /**
     * Format a short date (YYYY-MM-DD) into "Apr 1" style for x-axis labels.
     */
    dsFormatShortDate(yyyyMmDd) {
      if (!yyyyMmDd) return '';
      try {
        const [y, m, d] = yyyyMmDd.split('-').map(Number);
        const date = new Date(y, m - 1, d);
        return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      } catch {
        return yyyyMmDd;
      }
    },

    /**
     * Return a CSS class for order status badges in the feed.
     */
    dsStatusClass(status) {
      if (!status) return '';
      const s = status.toLowerCase();
      if (s.includes('deliver')) return 'ds-status-delivered';
      if (s.includes('ship')) return 'ds-status-shipped';
      if (s.includes('cancel')) return 'ds-status-cancelled';
      if (s.includes('return')) return 'ds-status-returned';
      return 'ds-status-processing';
    },

    // ── SVG Trend Chart ───────────────────────────────────────────

    /**
     * Compute SVG path strings for the dual-line trend chart.
     * Called once after data loads, result stored in _dsTrendPaths.
     * viewBox: 0 0 800 260 (padding: 20px top/bottom, 40px left/right for axis labels)
     *
     * PHASE 3 NOTE: when swapping to Observable Plot or ECharts, switch the
     * data source to dailySales.trend30dLong (long format: [{date, metric, value}])
     * — that's what those libs consume natively. The wide format trend30d
     * continues to be exposed for backward compat. See
     * docs/architecture/daily-sales-evolution.md for the swap procedure.
     */
    _dsComputeTrendPaths() {
      const trend = this.dailySales?.trend30d;
      if (!Array.isArray(trend) || trend.length === 0) {
        this._dsTrendPaths = null;
        return;
      }

      const W = 800;
      const H = 260;
      const PAD_LEFT = 52;   // space for left Y-axis labels
      const PAD_RIGHT = 48;  // space for right Y-axis labels
      const PAD_TOP = 16;
      const PAD_BOTTOM = 32; // space for X-axis labels

      const chartW = W - PAD_LEFT - PAD_RIGHT;
      const chartH = H - PAD_TOP - PAD_BOTTOM;

      const revenues = trend.map(d => d.revenue);
      const orders = trend.map(d => d.orders);
      const aovs = trend.map(d => d.aov || 0);

      const metric = this._dsTrendMetric || 'revenue';
      const maxPrimary = metric === 'aov' ? Math.max(...aovs, 1) : (metric === 'orders' ? Math.max(...orders, 1) : Math.max(...revenues, 1));
      const maxSecondary = metric === 'revenue' ? Math.max(...orders, 1) : Math.max(...revenues, 1);
      const n = trend.length;

      const xStep = chartW / (n - 1 || 1);

      // Map a data point index to SVG x
      const toX = (i) => PAD_LEFT + i * xStep;

      // Map primary metric to Y (left axis)
      const toYPrimary = (v) => PAD_TOP + chartH - (v / maxPrimary) * chartH;

      // Map secondary to Y (right axis)
      const toYSecondary = (v) => PAD_TOP + chartH - (v / maxSecondary) * chartH;

      const getPrimaryPath = () => {
        if (metric === 'aov') {
          return trend.map((d, i) => `${toX(i).toFixed(1)},${toYPrimary(d.aov || 0).toFixed(1)}`).join(' L ');
        }
        if (metric === 'orders') {
          return trend.map((d, i) => `${toX(i).toFixed(1)},${toYPrimary(d.orders).toFixed(1)}`).join(' L ');
        }
        return trend.map((d, i) => `${toX(i).toFixed(1)},${toYPrimary(d.revenue).toFixed(1)}`).join(' L ');
      };

      const getSecondaryPath = () => {
        if (metric === 'revenue') {
          return trend.map((d, i) => `${toX(i).toFixed(1)},${toYSecondary(d.orders).toFixed(1)}`).join(' L ');
        }
        return trend.map((d, i) => `${toX(i).toFixed(1)},${toYSecondary(d.revenue).toFixed(1)}`).join(' L ');
      };

      const primaryPath = `M ${getPrimaryPath()}`;
      const secondaryPath = `M ${getSecondaryPath()}`;

      // Fill polygons: close path back along the bottom of the chart
      const bottomY = (PAD_TOP + chartH).toFixed(1);
      const revenueFill = `${primaryPath} L ${toX(n - 1).toFixed(1)},${bottomY} L ${PAD_LEFT.toFixed(1)},${bottomY} Z`;
      const ordersFill = `${secondaryPath} L ${toX(n - 1).toFixed(1)},${bottomY} L ${PAD_LEFT.toFixed(1)},${bottomY} Z`;

      // X-axis labels: show every 5th label (6 total for 30 days)
      const xLabels = [];
      const step = Math.ceil(n / 6);
      for (let i = 0; i < n; i += step) {
        xLabels.push({
          x: toX(i).toFixed(1),
          label: this.dsFormatShortDate(trend[i].date),
        });
      }
      // Always include the last label
      const lastI = n - 1;
      if (xLabels[xLabels.length - 1]?.label !== this.dsFormatShortDate(trend[lastI].date)) {
        xLabels.push({
          x: toX(lastI).toFixed(1),
          label: this.dsFormatShortDate(trend[lastI].date),
        });
      }

      // Horizontal grid lines (4 evenly spaced within chart area)
      const gridLines = [];
      for (let g = 1; g <= 4; g++) {
        const y = (PAD_TOP + chartH - (g / 4) * chartH).toFixed(1);
        let label;
        if (metric === 'aov') {
          label = this._dsFormatAxisRevenue(maxPrimary * g / 4);
        } else if (metric === 'orders') {
          label = Math.round(maxPrimary * g / 4);
        } else {
          label = this._dsFormatAxisRevenue(maxPrimary * g / 4);
        }
        gridLines.push({ y, label });
      }

      // Store hover target data (one "column" per data point)
      const hoverCols = trend.map((d, i) => ({
        x: (toX(i) - xStep / 2).toFixed(1),
        cx: toX(i).toFixed(1),
        cy_primary: toYPrimary(metric === 'aov' ? (d.aov || 0) : (metric === 'orders' ? d.orders : d.revenue)).toFixed(1),
        cy_secondary: toYSecondary(metric === 'revenue' ? d.orders : d.revenue).toFixed(1),
        width: xStep.toFixed(1),
        date: d.date,
        revenue: d.revenue,
        orders: d.orders,
        aov: d.aov || 0,
      }));

      this._dsTrendPaths = {
        primaryPath,
        secondaryPath,
        revenueFill,
        ordersFill,
        xLabels,
        gridLines,
        hoverCols,
        W,
        H,
        PAD_BOTTOM,
        PAD_TOP,
        chartH,
        chartHBottom: PAD_TOP + chartH,
      };
    },

    setDsTrendMetric(metric) {
      this._dsTrendMetric = metric;
      this._dsComputeTrendPaths();
    },

    /**
     * Compact Y-axis revenue label: abbreviate to ₹1.2L or ₹1.2Cr
     */
    _dsFormatAxisRevenue(v) {
      if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(1)}Cr`;
      if (v >= 1_00_000) return `₹${(v / 1_00_000).toFixed(1)}L`;
      if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
      return `₹${v}`;
    },

    /**
     * Show tooltip on mousemove over the chart hover column.
     */
    dsTrendShowTooltip(col, event) {
      const container = event.currentTarget?.closest('.ds-trend-chart');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;

      // Keep tooltip in-bounds
      const TIP_W = 180;
      const TIP_H = 96;
      let tipX = relX + 12;
      let tipY = relY - 36;
      if (tipX + TIP_W > rect.width) tipX = relX - TIP_W - 8;
      if (tipY < 0) tipY = relY + 12;
      if (tipY + TIP_H > rect.height) tipY = rect.height - TIP_H - 4;

      this._dsTrendTooltip = {
        visible: true,
        x: tipX,
        y: tipY,
        date: this.dsFormatShortDate(col.date),
        revenue: this.formatINR(col.revenue),
        orders: col.orders,
        aov: this.formatINR(col.aov),
      };
    },

    dsTrendHideTooltip() {
      this._dsTrendTooltip = { ...this._dsTrendTooltip, visible: false };
    },

    // ── v5: Lens segment control ──────────────────────────────────

    /**
     * Map a lens name to the filter patch it applies.
     * Single source of truth — used by applyLensFilter and _detectLens.
     */
    _lensToFilter(lens) {
      const map = {
        realized: { status: 'realized', excludeStatuses: [] },
        active:   { status: 'all',      excludeStatuses: ['Cancelled', 'RTO', 'Lost', 'Draft Order'] },
        all:      { status: 'all',      excludeStatuses: [] },
      };
      return map[lens] || map.realized;
    },

    /**
     * Apply a named lens — patches status + excludeStatuses into filter state,
     * marks selectedLens, updates hash, and triggers a debounced reload.
     */
    applyLensFilter(lens) {
      const patch = this._lensToFilter(lens);
      this.dailySalesLens = lens;
      this.dailySalesFilters.status = patch.status;
      this.dailySalesFilters.excludeStatuses = patch.excludeStatuses;
      this._updateUrlHash();

      if (this._dsFilterDebounce) clearTimeout(this._dsFilterDebounce);
      this._dsFilterDebounce = setTimeout(() => {
        this._dsFilterDebounce = null;
        this.loadDailySales();
      }, 300);
    },

    /**
     * Inspect current filter state and return which named lens it matches,
     * or 'custom' if it matches none.
     */
    _detectLens() {
      const f = this.dailySalesFilters;
      const status = f.status;
      const excl = (f.excludeStatuses || []).slice().sort().join(',');

      const lensExcl = {
        realized: '',
        active:   ['Cancelled', 'Draft Order', 'Lost', 'RTO'].sort().join(','),
        all:      '',
      };

      if (status === 'realized' && excl === lensExcl.realized) return 'realized';
      if (status === 'all'      && excl === lensExcl.active)   return 'active';
      if (status === 'all'      && excl === lensExcl.all)       return 'all';
      return 'custom';
    },

    // ── v5: Stat-card info tooltips ───────────────────────────────

    /**
     * Toggle a stat-card tooltip open/closed.
     * id: 'yesterday' | 'mtd' | 'ytd'
     */
    toggleDsTooltip(id) {
      this.dailySalesActiveTooltip = this.dailySalesActiveTooltip === id ? null : id;
    },

    /**
     * Close any open stat-card tooltip.
     */
    closeDsTooltip() {
      this.dailySalesActiveTooltip = null;
    },

    /**
     * Build the tooltip data object for a given card.
     * Returns { title, window, includes, excludes, otherFilters }
     */
    dsTooltipData(card) {
      const ds = this.dailySales;
      if (!ds) return {};

      const cutoff = ds.yesterday?.date || ds.freshness?.dataCutoff || '';
      const appliedStatusList = ds.filters?.appliedStatusList || [];
      const excludeStatuses = ds.filters?.applied?.excludeStatuses || [];

      // Compute card-specific window
      let windowFrom = '';
      let windowTo = cutoff;

      if (card === 'yesterday') {
        windowFrom = ds.yesterday?.date || cutoff;
        windowTo = ds.yesterday?.date || cutoff;
      } else if (card === 'mtd') {
        // First of current month
        if (cutoff) {
          const [y, m] = cutoff.split('-').map(Number);
          windowFrom = `${y}-${String(m).padStart(2, '0')}-01`;
        }
        windowTo = cutoff;
      } else if (card === 'ytd') {
        // April 1 of current Indian FY
        if (cutoff) {
          const [y, m] = cutoff.split('-').map(Number);
          const fyYear = m >= 4 ? y : y - 1;
          windowFrom = `${fyYear}-04-01`;
        }
        windowTo = cutoff;
      }

      const windowStr = windowFrom && windowTo
        ? `${this.formatCutoffShort(windowFrom)} → ${this.formatCutoffShort(windowTo)} IST`
        : '—';

      // Includes
      const includesStr = appliedStatusList.length > 0
        ? appliedStatusList.join(', ')
        : (this.dailySalesFilters.status === 'all' ? 'All statuses' : '—');

      // Excludes
      const excludesStr = excludeStatuses.length > 0 ? excludeStatuses.join(', ') : '—';

      // Other non-default filters
      const f = this.dailySalesFilters;
      const others = [];
      if (f.channels && f.channels.length > 0) others.push(`channel: ${f.channels.join(', ')}`);
      if (f.orderType && f.orderType !== 'all') others.push(`type: ${f.orderType}`);
      if (f.paymentMode && f.paymentMode !== 'all') others.push(`payment: ${f.paymentMode}`);
      if (f.state) others.push(`state: ${f.state}`);
      if (f.printMethod) others.push(`method: ${f.printMethod}`);
      const otherStr = others.length > 0 ? others.join(' · ') : '—';

      const titles = { yesterday: 'Yesterday', mtd: 'Month-to-Date', ytd: 'Year-to-Date' };

      return {
        title: titles[card] || card,
        window: windowStr,
        includes: includesStr,
        includesCount: appliedStatusList.length,
        excludes: excludesStr,
        otherFilters: otherStr,
      };
    },

    // ── v5: Banner stale-data helper ──────────────────────────────

    /**
     * Compute how many days the data is stale (dataCutoff vs yesterday.date).
     * Returns integer ≥ 2 if stale, null otherwise (not stale / missing data).
     */
    _computeStaleDays() {
      const cutoff = this.dailySales?.freshness?.dataCutoff;
      const ydate = this.dailySales?.yesterday?.date;
      if (!cutoff || !ydate) return null;

      const cutoffMs = new Date(cutoff).getTime();
      const ydateMs = new Date(ydate).getTime();
      if (isNaN(cutoffMs) || isNaN(ydateMs)) return null;

      const deltaDays = Math.round((ydateMs - cutoffMs) / 86400000);
      return deltaDays >= 2 ? deltaDays : null;
    },

    /**
     * Returns true when freshness data indicates a Sheets error
     * (data is loaded but dataCutoff is null).
     */
    _isSheetsError() {
      return !!this.dailySales && this.dailySales.freshness?.dataCutoff === null;
    },

    // ── v5: Weekly Trend (SVG bar chart) ─────────────────────────

    setDsWeeklyMetric(metric) {
      this._dsWeeklyMetric = metric;
    },

    /**
     * Compute SVG bar chart data for the weekly trend panel.
     * Returns { bars[], gridLines[], maxVal, W, H } or null.
     */
    _dsWeeklyChartData() {
      const trend = this.dailySales?.weeklyTrend;
      if (!Array.isArray(trend) || trend.length === 0) return null;

      const metric = this._dsWeeklyMetric || 'revenue';
      const W = 600;
      const H = 180;
      const PAD_LEFT = 48;
      const PAD_RIGHT = 12;
      const PAD_TOP = 12;
      const PAD_BOTTOM = 28;
      const chartW = W - PAD_LEFT - PAD_RIGHT;
      const chartH = H - PAD_TOP - PAD_BOTTOM;

      const values = trend.map(d => metric === 'orders' ? d.orders : d.revenue);
      const maxVal = Math.max(...values, 1);
      const n = trend.length;
      const barW = Math.floor(chartW / n) - 4;
      const xStep = chartW / n;

      // Current week number (FY week = floor((fyOrdinal - 1) / 7) + 1)
      // We consider the last week in the dataset as the current week
      const currentWeek = trend[trend.length - 1]?.week;

      const bars = trend.map((d, i) => {
        const val = metric === 'orders' ? d.orders : d.revenue;
        const barH = Math.max(2, (val / maxVal) * chartH);
        const x = PAD_LEFT + i * xStep + (xStep - barW) / 2;
        const y = PAD_TOP + chartH - barH;
        return {
          x: x.toFixed(1),
          y: y.toFixed(1),
          width: barW.toFixed(1),
          height: barH.toFixed(1),
          cx: (x + barW / 2).toFixed(1),
          labelY: (PAD_TOP + chartH + 14).toFixed(1),
          label: `W${d.week}`,
          isCurrent: d.week === currentWeek,
          week: d.week,
          dateRange: d.dateRange,
          orders: d.orders,
          revenue: d.revenue,
          aov: d.aov,
        };
      });

      // Y-axis grid lines (3 lines)
      const gridLines = [];
      for (let g = 1; g <= 3; g++) {
        const y = PAD_TOP + chartH - (g / 3) * chartH;
        const val = maxVal * g / 3;
        gridLines.push({
          y: y.toFixed(1),
          label: metric === 'orders' ? Math.round(val) : this._dsFormatAxisRevenue(val),
        });
      }

      return { bars, gridLines, W, H, PAD_BOTTOM, PAD_TOP, chartH: PAD_TOP + chartH };
    },

    /**
     * Show tooltip for weekly bar chart hover.
     */
    dsWeeklyShowTooltip(bar, event) {
      const container = event.currentTarget?.closest('.ds-weekly-chart');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;
      const TIP_W = 180;
      const TIP_H = 100;
      let tipX = relX + 12;
      let tipY = relY - 36;
      if (tipX + TIP_W > rect.width) tipX = relX - TIP_W - 8;
      if (tipY < 0) tipY = relY + 12;
      if (tipY + TIP_H > rect.height) tipY = rect.height - TIP_H - 4;
      this._dsWeeklyTooltip = {
        visible: true,
        x: tipX,
        y: tipY,
        week: `W${bar.week}`,
        dateRange: bar.dateRange,
        orders: bar.orders,
        revenue: this.formatINR(bar.revenue),
        aov: this.formatINR(bar.aov),
      };
    },

    dsWeeklyHideTooltip() {
      this._dsWeeklyTooltip = { ...this._dsWeeklyTooltip, visible: false };
    },

    // ── v5: MTD by Channel card click ────────────────────────────

    /**
     * Click on a channel card applies the matching orderType filter.
     * If already active, deselects (returns to 'all').
     * channelGroup: 'D2C' | 'Corporate' | 'Partner – DS' | 'Partner – Stores'
     */
    applyMtdChannelFilter(channelGroup) {
      const map = {
        'D2C':               'B2C',
        'Corporate':         'Manual',
        'Partner – DS':     'DS',
        'Partner – Stores': 'Stores',
      };
      const orderType = map[channelGroup];
      if (!orderType) return;
      const current = this.dailySalesFilters.orderType;
      this.setDailyFilter('orderType', current === orderType ? 'all' : orderType);
    },

    /**
     * Returns true if the MTD channel card for a given channelGroup is active.
     */
    isMtdChannelActive(channelGroup) {
      const map = {
        'D2C':               'B2C',
        'Corporate':         'Manual',
        'Partner – DS':     'DS',
        'Partner – Stores': 'Stores',
      };
      return this.dailySalesFilters.orderType === map[channelGroup];
    },

    // ── v5: Mix label translation ─────────────────────────────────

    /**
     * Translate Order Type raw value to display label per UI Spec §5 Panel 8.
     * Template-only — raw value (item.name) still used for filter wiring.
     */
    dsOrderTypeLabel(raw) {
      const map = { 'Manual': 'Corporate', 'B2C': 'D2C', 'DS': 'Drop-ship', 'Stores': 'B2B Stores' };
      return map[raw] || raw;
    },

    /**
     * Translate Sales Channel raw value to display label.
     * Fixes COMMMERCE (3 m's) typo for display.
     */
    dsSalesChannelLabel(raw) {
      if (!raw) return raw;
      if (raw === 'COMMMERCE') return 'COMMERCE';
      return raw;
    },

    // ── v5: Channel group pill color ─────────────────────────────

    /**
     * Returns CSS class suffix for channel group pill.
     */
    dsChannelGroupClass(channelGroup) {
      if (!channelGroup) return 'ds-cg-pill--other';
      const g = channelGroup.toLowerCase();
      if (g === 'd2c') return 'ds-cg-pill--d2c';
      if (g === 'corporate') return 'ds-cg-pill--corporate';
      if (g.includes('ds')) return 'ds-cg-pill--ds';
      if (g.includes('stores')) return 'ds-cg-pill--stores';
      return 'ds-cg-pill--other';
    },

    // ── v5: Acceptance badge ──────────────────────────────────────

    /**
     * Returns CSS class for acceptance status badge.
     */
    dsAcceptanceClass(status) {
      if (!status) return 'ds-acceptance--unknown';
      const s = status.toLowerCase();
      if (s === 'accepted') return 'ds-acceptance--accepted';
      if (s === 'awaiting') return 'ds-acceptance--awaiting';
      if (s === 'rejected') return 'ds-acceptance--rejected';
      return 'ds-acceptance--unknown';
    },

    /**
     * Returns row background class for order row based on acceptanceStatus.
     */
    dsOrderRowBg(acceptanceStatus) {
      if (!acceptanceStatus) return '';
      const s = acceptanceStatus.toLowerCase();
      if (s === 'awaiting') return 'ds-order-row--awaiting';
      if (s === 'rejected') return 'ds-order-row--rejected';
      return '';
    },

    // ── v5: formatINRShort ────────────────────────────────────────

    /**
     * Compact INR formatter for axis labels: ₹47L, ₹4.7K, etc.
     * Same as _dsFormatAxisRevenue but public for template use.
     */
    formatINRShort(amount) {
      if (amount == null || isNaN(amount)) return '₹0';
      return this._dsFormatAxisRevenue(amount);
    },
  };
}
