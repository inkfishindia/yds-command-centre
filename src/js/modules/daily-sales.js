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
      from: null,          // YYYY-MM-DD or null
      to: null,            // YYYY-MM-DD or null
      channels: [],        // string[]
      orderType: 'all',    // 'all' | 'B2C' | 'B2B'
      paymentMode: 'all',  // 'all' | specific value
      status: 'realized',  // 'realized' | 'all' | specific status name
      state: '',           // '' or specific state
      printMethod: '',     // '' or specific tag
    },

    // Which filter dropdown is open: 'date' | 'channel' | 'status' | null
    _dsFilterDropdownOpen: null,

    // Debounce timer ref for filter changes
    _dsFilterDebounce: null,

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
     */
    setDailyFilter(key, value) {
      this.dailySalesFilters[key] = value;
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
        state: '',
        printMethod: '',
      };
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
        f.state ||
        f.printMethod
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
      if (f.state) params.set('state', f.state);
      if (f.printMethod) params.set('printMethod', f.printMethod);
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

      this.dailySalesFilters = {
        from: params.get('from') || null,
        to: params.get('to') || null,
        channels: params.get('channels') ? params.get('channels').split(',') : [],
        orderType: params.get('orderType') || 'all',
        paymentMode: params.get('paymentMode') || 'all',
        status: params.get('status') || 'realized',
        state: params.get('state') || '',
        printMethod: params.get('printMethod') || '',
      };
    },

    /**
     * Push current filter state into the URL hash.
     * Omits default values so clean state = just #daily-sales.
     */
    _updateUrlHash() {
      const qs = this._filterToQueryString();
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
      const primaryFill = `${primaryPath} L ${toX(n - 1).toFixed(1)},${bottomY} L ${PAD_LEFT.toFixed(1)},${bottomY} Z`;
      const secondaryFill = `${secondaryPath} L ${toX(n - 1).toFixed(1)},${bottomY} L ${PAD_LEFT.toFixed(1)},${bottomY} Z`;

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
        primaryFill,
        secondaryFill,
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
      const metric = this._dsTrendMetric || 'revenue';

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
  };
}
