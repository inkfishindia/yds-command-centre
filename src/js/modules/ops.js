export function createOpsModule() {
  return {
    // ── State ──────────────────────────────────────────────────────────
    opsSection: 'overview',

    ops: null,
    opsLoading: false,
    opsLastRefresh: null,
    opsSavedView: 'alerts',

    opsStock: [],
    opsStockTotal: 0,
    opsStockLoading: false,
    opsStockFilters: { status: '', vendor: '', search: '' },

    opsSales: null,
    opsSalesLoading: false,

    opsProducts: [],
    opsProductsTotal: 0,
    opsProductsLoading: false,
    opsProductsFilters: { tier: '', vendor: '', search: '' },

    opsPOs: [],
    opsPOsTotal: 0,
    opsPOsLoading: false,

    // ── Load: Overview ─────────────────────────────────────────────────
    async loadOps() {
      const signal = this.beginRequest('ops');
      this.opsLoading = true;
      try {
        const res = await fetch('/api/ops', { signal });
        if (res.ok) {
          this.ops = await res.json();
          this.opsLastRefresh = new Date();
          this.runNotificationChecks?.('ops');
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops load error:', err);
      } finally {
        this.endRequest('ops', signal);
        this.opsLoading = false;
      }
    },

    // ── Section switching ──────────────────────────────────────────────
    async opsSwitchSection(section) {
      this.opsSection = section;
      if (section === 'overview') {
        if (!this.ops) await this.loadOps();
      } else if (section === 'stock') {
        await this.loadOpsStock();
      } else if (section === 'sales') {
        if (!this.opsSales) await this.loadOpsSales();
      } else if (section === 'products') {
        if (!this.opsProducts.length) await this.loadOpsProducts();
      } else if (section === 'purchase-orders') {
        if (!this.opsPOs.length) await this.loadOpsPOs();
      }
    },

    // ── Load: Stock ────────────────────────────────────────────────────
    async loadOpsStock() {
      const signal = this.beginRequest('opsStock');
      this.opsStockLoading = true;
      const { status, vendor, search } = this.opsStockFilters;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (vendor) params.set('vendor', vendor);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/ops/stock?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.opsStock = data.rows || [];
          this.opsStockTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops stock error:', err);
      } finally {
        this.endRequest('opsStock', signal);
        this.opsStockLoading = false;
      }
    },

    // ── Load: Sales ────────────────────────────────────────────────────
    async loadOpsSales() {
      const signal = this.beginRequest('opsSales');
      this.opsSalesLoading = true;
      try {
        const res = await fetch('/api/ops/sales', { signal });
        if (res.ok) this.opsSales = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops sales error:', err);
      } finally {
        this.endRequest('opsSales', signal);
        this.opsSalesLoading = false;
      }
    },

    // ── Load: Products ─────────────────────────────────────────────────
    async loadOpsProducts() {
      const signal = this.beginRequest('opsProducts');
      this.opsProductsLoading = true;
      const { tier, vendor, search } = this.opsProductsFilters;
      const params = new URLSearchParams();
      if (tier) params.set('tier', tier);
      if (vendor) params.set('vendor', vendor);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/ops/products?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.opsProducts = data.rows || [];
          this.opsProductsTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops products error:', err);
      } finally {
        this.endRequest('opsProducts', signal);
        this.opsProductsLoading = false;
      }
    },

    // ── Load: Purchase Orders ──────────────────────────────────────────
    async loadOpsPOs() {
      const signal = this.beginRequest('opsPOs');
      this.opsPOsLoading = true;
      try {
        const res = await fetch('/api/ops/purchase-orders', { signal });
        if (res.ok) {
          const data = await res.json();
          this.opsPOs = data.rows || [];
          this.opsPOsTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Ops POs error:', err);
      } finally {
        this.endRequest('opsPOs', signal);
        this.opsPOsLoading = false;
      }
    },

    // ── Filter helpers ─────────────────────────────────────────────────
    opsApplyStockFilter(key, value) {
      this.opsStockFilters[key] = value;
      this.loadOpsStock();
    },

    opsApplyProductsFilter(key, value) {
      this.opsProductsFilters[key] = value;
      this.loadOpsProducts();
    },

    async opsFocusVendor(vendor) {
      if (!vendor) return;
      this.opsProductsFilters = { ...this.opsProductsFilters, vendor, tier: '', search: '' };
      this.opsSection = 'products';
      await this.loadOpsProducts();
    },

    async opsFocusProduct(productName) {
      if (!productName) return;
      this.opsStockFilters = { ...this.opsStockFilters, search: productName, vendor: '' };
      this.opsSection = 'stock';
      await this.loadOpsStock();
    },

    async opsFocusPoProduct(productName) {
      if (!productName) return;
      this.opsSection = 'purchase-orders';
      if (!this.opsPOs.length) await this.loadOpsPOs();
      this.showInfo(`Use browser find for "${productName}" in purchase orders`);
    },

    // ── Display helpers ────────────────────────────────────────────────
    getStockStatusColor(status) {
      if (!status) return '';
      const s = status.toString().toUpperCase().replace(/[^A-Z_]/g, '');
      if (s.includes('OUT')) return 'ops-status-out';
      if (s.includes('LOW')) return 'ops-status-low';
      if (s.includes('REORDER')) return 'ops-status-reorder';
      if (s.includes('OK') || s.includes('HEALTHY')) return 'ops-status-ok';
      if (s.includes('EXCESS')) return 'ops-status-excess';
      return 'ops-status-muted';
    },

    stripEmoji(str) {
      if (!str) return '';
      return str.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]|[\u{FE00}-\u{FEFF}]|[\u{1F000}-\u{1FFFF}]/gu, '').trim();
    },

    formatCurrency(num) {
      if (!num && num !== 0) return '—';
      if (num >= 10000000) return '₹' + (num / 10000000).toFixed(1) + 'Cr';
      if (num >= 100000) return '₹' + (num / 100000).toFixed(1) + 'L';
      if (num >= 1000) return '₹' + (num / 1000).toFixed(1) + 'K';
      return '₹' + num.toLocaleString('en-IN');
    },

    formatNumber(num) {
      if (!num && num !== 0) return '—';
      if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    },

    // Compute stacked bar width % for each segment
    opsStockBarSegments() {
      if (!this.ops?.stockHealth?.byStatus) return [];
      const byStatus = this.ops.stockHealth.byStatus;
      const total = byStatus.reduce((s, x) => s + (x.count || 0), 0);
      if (!total) return [];
      const colorMap = {
        OK: 'var(--green)',
        LOW: 'var(--amber)',
        REORDER: 'var(--yellow, var(--amber))',
        OUT: 'var(--red)',
        EXCESS: 'var(--accent)',
        DEAD: 'var(--text-muted)',
        NO_SALES: 'var(--border)',
      };
      return byStatus.map(x => ({
        name: x.name,
        count: x.count,
        pct: ((x.count / total) * 100).toFixed(1),
        color: colorMap[x.name] || 'var(--border)',
      }));
    },

    opsTierColor(tier) {
      const map = { A: 'success', B: 'accent', C: 'warning', D: 'danger' };
      return map[tier] || '';
    },

    getOpsRefreshLabel() {
      if (!this.opsLastRefresh) return 'Never refreshed';
      const diff = Math.round((Date.now() - this.opsLastRefresh.getTime()) / 1000);
      if (diff < 60) return `Refreshed ${diff}s ago`;
      if (diff < 3600) return `Refreshed ${Math.round(diff / 60)}m ago`;
      return `Refreshed ${Math.round(diff / 3600)}h ago`;
    },

    getOpsAreaStatus() {
      const out = this.ops?.stockHealth?.outOfStock || 0;
      const reorder = this.ops?.stockHealth?.reorderNeeded || 0;
      const low = this.ops?.stockHealth?.lowStock || 0;
      if (out > 0) return { tone: 'critical', label: 'Needs Intervention' };
      if (reorder > 0 || low > 0) return { tone: 'warning', label: 'Needs Attention' };
      if (!this.ops) return { tone: 'neutral', label: 'Loading' };
      return { tone: 'healthy', label: 'Healthy' };
    },

    getOpsHeroMetrics() {
      return [
        {
          id: 'variants',
          label: 'Total Variants',
          value: this.ops?.stockHealth?.totalVariants ? this.formatNumber(this.ops.stockHealth.totalVariants) : '—',
          note: `${this.ops?.products?.total || 0} product types`,
        },
        {
          id: 'healthy',
          label: 'Healthy Stock',
          value: this.ops?.stockHealth?.healthy ?? '—',
          note: `${this.ops?.stockHealth?.lowStock ?? 0} low`,
        },
        {
          id: 'out',
          label: 'Out Of Stock',
          value: this.ops?.stockHealth?.outOfStock ?? '—',
          note: `${this.ops?.stockHealth?.reorderNeeded ?? 0} reorder`,
        },
        {
          id: 'pos',
          label: 'Pending POs',
          value: this.ops?.pendingPOs?.count ?? '—',
          note: `${this.ops?.alerts?.length || 0} stock alerts`,
        },
      ];
    },

    getOpsMetricAction(metricId) {
      const actions = {
        variants: () => this.applyOpsSavedView('products'),
        healthy: () => this.applyOpsSavedView('stock-ok'),
        out: () => this.applyOpsSavedView('alerts'),
        pos: () => this.applyOpsSavedView('pos'),
      };
      return actions[metricId] || (() => {});
    },

    getOpsPriorityCards() {
      const topAlerts = (this.ops?.alerts || []).slice(0, 3);
      const topTiers = (this.ops?.products?.byTier || []).slice(0, 3);
      const topVendors = (this.ops?.vendors || []).slice(0, 3);
      return [
        {
          id: 'stock-risk',
          title: 'Stock Risk',
          tone: (this.ops?.stockHealth?.outOfStock || 0) > 0 ? 'critical' : ((this.ops?.stockHealth?.reorderNeeded || 0) > 0 ? 'warning' : 'healthy'),
          value: this.ops?.alerts?.length || 0,
          label: 'variants currently flagged for action',
          items: topAlerts.map(item => ({
            name: item.product || 'Unnamed item',
            meta: item.daysUntilStockout != null ? `${item.daysUntilStockout}d left` : this.stripEmoji(item.stockStatus || ''),
          })),
        },
        {
          id: 'purchase-pressure',
          title: 'Purchase Pressure',
          tone: (this.ops?.pendingPOs?.count || 0) > 0 ? 'warning' : 'healthy',
          value: this.ops?.pendingPOs?.count || 0,
          label: 'purchase orders still waiting to land',
          items: (this.ops?.pendingPOs?.items || []).slice(0, 3).map(item => ({
            name: item.Product || 'PO item',
            meta: `${item.Reorder_Qty ?? '—'} units`,
          })),
        },
        {
          id: 'portfolio-shape',
          title: 'Portfolio Shape',
          tone: 'neutral',
          value: this.ops?.products?.total || 0,
          label: 'product types and vendor spread',
          items: topTiers.length
            ? topTiers.map(item => ({ name: `Tier ${item.name}`, meta: String(item.count) }))
            : topVendors.map(item => ({ name: item.Vendor || 'Vendor', meta: `${item['Lead time'] || '—'}d lead time` })),
        },
      ];
    },

    getOpsFocusList() {
      const items = [];
      const firstAlert = this.ops?.alerts?.[0];
      if (firstAlert) {
        items.push({
          title: `${firstAlert.product || 'Item'} needs attention`,
          detail: firstAlert.daysUntilStockout != null
            ? `${firstAlert.daysUntilStockout} days until stockout`
            : this.stripEmoji(firstAlert.stockStatus || 'Stock alert'),
          target: 'stock',
        });
      }
      const firstPo = this.ops?.pendingPOs?.items?.[0];
      if (firstPo) {
        items.push({
          title: `Pending PO for ${firstPo.Product || 'inventory item'}`,
          detail: `${firstPo.Reorder_Qty ?? '—'} units in reorder queue`,
          target: 'purchase-orders',
        });
      }
      if (!items.length) {
        items.push({
          title: 'Stock looks stable',
          detail: 'No urgent stock or PO issues detected',
          target: 'overview',
        });
      }
      return items;
    },

    getOpsSavedViews() {
      return [
        { id: 'alerts', label: 'Stock Alerts' },
        { id: 'pos', label: 'Pending POs' },
        { id: 'products', label: 'Vendor Exposure' },
        { id: 'stock-ok', label: 'Healthy Stock' },
      ];
    },

    async applyOpsSavedView(viewId) {
      this.opsSavedView = viewId;
      if (viewId === 'pos') {
        this.opsSection = 'purchase-orders';
        await this.loadOpsPOs();
        return;
      }
      if (viewId === 'products') {
        this.opsSection = 'products';
        await this.loadOpsProducts();
        return;
      }
      this.opsSection = 'stock';
      if (viewId === 'stock-ok') {
        this.opsStockFilters = { ...this.opsStockFilters, status: 'OK', vendor: '', search: '' };
      } else {
        this.opsStockFilters = { ...this.opsStockFilters, status: '', vendor: '', search: '' };
      }
      await this.loadOpsStock();
    },

    getOpsSavedViewItems() {
      if (this.opsSavedView === 'pos') {
        return (this.ops?.pendingPOs?.items || []).slice(0, 5).map((item) => ({
          title: item.Product || 'PO item',
          detail: `${item.Reorder_Qty ?? '—'} units`,
          action: () => this.opsSwitchSection('purchase-orders'),
        }));
      }
      if (this.opsSavedView === 'products') {
        const vendors = (this.ops?.vendors || []).slice(0, 5);
        return vendors.map((item) => ({
          title: item.Vendor || 'Vendor',
          detail: `${item['Lead time'] || '—'}d lead time`,
          action: () => {
            this.opsProductsFilters = { ...this.opsProductsFilters, vendor: item.Vendor || '', tier: '', search: '' };
            this.opsSwitchSection('products');
          },
        }));
      }
      if (this.opsSavedView === 'stock-ok') {
        return (this.opsStock || []).slice(0, 5).map((item) => ({
          title: item.Product_Name || item.product || 'Healthy variant',
          detail: `${item.Status || item.stockStatus || 'OK'} · ${item.Total_Stock ?? item.totalStock ?? '—'} stock`,
          action: () => this.opsSwitchSection('stock'),
        }));
      }
      return (this.ops?.alerts || []).slice(0, 5).map((item) => ({
        title: item.product || 'Inventory alert',
        detail: item.daysUntilStockout != null ? `${item.daysUntilStockout}d left` : this.stripEmoji(item.stockStatus || 'Stock alert'),
        action: () => this.opsSwitchSection('stock'),
      }));
    },

    getOpsSavedViewEmptyState() {
      const labels = {
        alerts: 'No stock alerts right now.',
        pos: 'No pending purchase orders right now.',
        products: 'No vendor exposure data right now.',
        'stock-ok': 'No healthy stock rows loaded yet.',
      };
      return labels[this.opsSavedView] || 'No items available.';
    },

    getOpsAlertRowActions(row) {
      return [
        {
          label: 'Stock',
          handler: () => this.opsFocusProduct(row.product),
        },
        {
          label: 'POs',
          handler: () => this.opsFocusPoProduct(row.product),
        },
      ];
    },

    getOpsVendorRowActions(vendor) {
      return [
        {
          label: 'Products',
          handler: () => this.opsFocusVendor(vendor?.Vendor),
        },
      ];
    },

    getOpsProductRowActions(product) {
      return [
        {
          label: 'Stock',
          handler: () => this.opsFocusProduct(product?.Product_Name),
        },
        {
          label: 'Vendor',
          handler: () => this.opsFocusVendor(product?.Vendor),
        },
      ];
    },

    getOpsPoRowActions(po) {
      return [
        {
          label: 'Stock',
          handler: () => this.opsFocusProduct(po?.Product),
        },
      ];
    },
  };
}
