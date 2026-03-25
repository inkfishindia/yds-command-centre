export function createNotionBrowserModule() {
  return {
    // Notion browser
    notionDatabases: [],
    notionEntries: [],
    notionLoading: false,
    notionActiveDb: null,
    notionActivePage: null,
    notionPageContent: '',
    notionKeyPages: [],
    notionHasMore: false,
    notionNextCursor: null,
    notionRelated: {},
    notionRelatedLoading: false,
    notionSearchQuery: '',
    notionFilterStatus: '',

    // Detail panel
    detailPanel: null,

    async loadNotion() {
      const signal = this.beginRequest('notionHome');
      this.notionLoading = true;
      this.notionActiveDb = null;
      this.notionActivePage = null;
      this.notionPageContent = '';
      try {
        const [dbRes, kpRes] = await Promise.all([
          fetch('/api/notion/databases', { signal }),
          fetch('/api/notion/key-pages', { signal }),
        ]);
        const dbData = await dbRes.json();
        const kpData = await kpRes.json();
        this.notionDatabases = dbData.databases;
        this.notionKeyPages = kpData.pages;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Notion load error:', err);
      } finally {
        this.endRequest('notionHome', signal);
        this.notionLoading = false;
      }
    },

    async openNotionDb(db) {
      const signal = this.beginRequest('notionDb');
      this.notionLoading = true;
      this.notionActiveDb = db;
      this.notionActivePage = null;
      this.notionPageContent = '';
      this.notionEntries = [];
      this.notionSearchQuery = '';
      this.notionFilterStatus = '';
      try {
        const res = await fetch(`/api/notion/databases/${db.id}`, { signal });
        const data = await res.json();
        this.notionEntries = data.results;
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Database query error:', err);
      } finally {
        this.endRequest('notionDb', signal);
        this.notionLoading = false;
      }
    },

    getFilteredEntries() {
      let entries = this.notionEntries;
      if (this.notionSearchQuery.trim()) {
        const query = this.notionSearchQuery.toLowerCase().trim();
        entries = entries.filter((entry) => {
          const name = this.getEntryName(entry).toLowerCase();
          const meta = this.getEntryMeta(entry).toLowerCase();
          return name.includes(query) || meta.includes(query);
        });
      }
      if (this.notionFilterStatus) {
        entries = entries.filter((entry) => {
          const status = (entry.Status || entry.Health || '').toLowerCase();
          return status === this.notionFilterStatus.toLowerCase();
        });
      }
      return entries;
    },

    getAvailableStatuses() {
      const statuses = new Set();
      for (const entry of this.notionEntries) {
        if (entry.Status) statuses.add(entry.Status);
        if (entry.Health) statuses.add(entry.Health);
      }
      return [...statuses].sort();
    },

    async loadMoreEntries() {
      if (!this.notionHasMore || !this.notionNextCursor || !this.notionActiveDb) return;
      const signal = this.beginRequest('notionMoreEntries');
      this.notionLoading = true;
      try {
        const res = await fetch(`/api/notion/databases/${this.notionActiveDb.id}?cursor=${this.notionNextCursor}`, { signal });
        const data = await res.json();
        this.notionEntries = [...this.notionEntries, ...data.results];
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Load more error:', err);
      } finally {
        this.endRequest('notionMoreEntries', signal);
        this.notionLoading = false;
      }
    },

    async openNotionPage(pageId, pageName) {
      const pageSignal = this.beginRequest('notionPage');
      const relatedSignal = this.beginRequest('notionRelated');
      this.notionLoading = true;
      this.notionActivePage = { id: pageId, name: pageName || 'Loading...' };
      this.notionPageContent = '';
      this.notionRelated = {};
      this.notionRelatedLoading = true;
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`, { signal: pageSignal }),
          fetch(`/api/notion/pages/${pageId}/content`, { signal: pageSignal }),
        ]);
        const page = await pageRes.json();
        const content = await contentRes.json();
        this.notionActivePage = {
          id: pageId,
          name: pageName || page.properties?.Name || 'Untitled',
          url: page.url,
          created: page.created,
          updated: page.updated,
          properties: page.properties,
        };
        this.notionPageContent = content.markdown || '*No content*';

        fetch(`/api/notion/pages/${pageId}/related`, { signal: relatedSignal })
          .then((response) => response.json())
          .then((data) => { this.notionRelated = data.related || {}; })
          .catch((err) => {
            if (!this.isAbortError(err)) this.notionRelated = {};
          })
          .finally(() => {
            this.endRequest('notionRelated', relatedSignal);
            this.notionRelatedLoading = false;
          });
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Page load error:', err);
        this.notionPageContent = '*Failed to load page content*';
        this.notionRelatedLoading = false;
      } finally {
        this.endRequest('notionPage', pageSignal);
        this.notionLoading = false;
      }
    },

    notionBack() {
      if (this._requestControllers.notionPage) this._requestControllers.notionPage.abort();
      if (this._requestControllers.notionRelated) this._requestControllers.notionRelated.abort();
      if (this._requestControllers.notionDb) this._requestControllers.notionDb.abort();
      if (this._requestControllers.notionMoreEntries) this._requestControllers.notionMoreEntries.abort();
      if (this.notionActivePage) {
        this.notionActivePage = null;
        this.notionPageContent = '';
        this.notionRelated = {};
        this.notionRelatedLoading = false;
      } else if (this.notionActiveDb) {
        this.notionActiveDb = null;
        this.notionEntries = [];
      }
    },

    getEntryName(entry) {
      return entry.Name || entry.Title || entry.name || entry.title || 'Untitled';
    },

    getEntryMeta(entry) {
      const parts = [];
      if (entry.Function) parts.push(entry.Function);
      if (entry.Role) parts.push(entry.Role);
      if (entry.Type) parts.push(entry.Type);
      if (entry['Due Date']) {
        const dueDate = entry['Due Date'];
        parts.push(`Due: ${typeof dueDate === 'object' && dueDate !== null && dueDate.start ? dueDate.start : dueDate}`);
      }
      if (entry.Date) parts.push(entry.Date);
      if (entry.Owner) parts.push(`Owner: ${entry.Owner}`);
      return parts.slice(0, 3).join(' · ');
    },

    badgeAttr(value) {
      return (value || '').toLowerCase().trim();
    },

    hasRelated() {
      return Object.keys(this.notionRelated).length > 0;
    },

    getRelatedEntries() {
      return Object.entries(this.notionRelated).filter(([, pages]) => pages.length > 0);
    },

    getPropertyEntries(props) {
      if (!props) return [];
      return Object.entries(props).filter(([, value]) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0));
    },

    getDetailSections() {
      if (!this.detailPanel?.properties) return { header: [], dates: [], meta: [], content: [], relations: [] };
      const props = this.detailPanel.properties;
      const entries = this.getPropertyEntries(props);

      const headerFields = ['Status', 'Stage', 'Priority', 'Health', 'Type'];
      const metaFields = ['Owner', 'Assigned To', 'Assigned', 'Created', 'Last edited time', 'Created time'];
      const dateFields = ['Due Date', 'Due', 'Start Date', 'End Date', 'Date'];

      const header = [];
      const dates = [];
      const meta = [];
      const content = [];
      const relations = [];

      for (const [key, val] of entries) {
        const formatted = this.formatPropertyValue(val);
        if (formatted === null || formatted === undefined || formatted === '' || formatted === '—') continue;

        const item = { key, value: formatted, raw: val };

        if (headerFields.some(f => key.includes(f))) header.push(item);
        else if (dateFields.some(f => key.includes(f))) dates.push(item);
        else if (metaFields.some(f => key.includes(f))) meta.push(item);
        else if (val && val.type === 'relation') relations.push(item);
        else if (typeof formatted === 'string' && formatted.length > 100) content.push(item);
        else meta.push(item);
      }

      return { header, dates, meta, content, relations };
    },

    formatDate(val) {
      if (!val) return '—';
      const raw = typeof val === 'object' && val.start ? val.start : String(val);
      const dateOnly = raw.split('T')[0];
      const date = new Date(dateOnly + 'T00:00:00');
      if (isNaN(date)) return raw;
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    },

    formatPropertyValue(value) {
      if (Array.isArray(value)) {
        if (value.length === 0) return '—';
        if (typeof value[0] === 'object' && value[0] !== null && value[0].name) {
          return value.map((relation) => relation.name).join(', ');
        }
        if (typeof value[0] === 'string' && /^[0-9a-f-]{32,36}$/.test(value[0])) {
          return `${value.length} linked`;
        }
        return value.join(', ');
      }
      if (value && typeof value === 'object' && value.start) {
        const formatted = this.formatDate(value);
        if (value.end) return `${formatted} → ${this.formatDate({ start: value.end })}`;
        return formatted;
      }
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    },

    askColinAboutPage(page) {
      this.view = 'chat';
      const context = this.notionPageContent.slice(0, 500);
      this.inputText = `Tell me about this Notion page: "${page.name}"\n\nContent preview:\n${context}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    async openDetailPanel(pageId, pageName) {
      const signal = this.beginRequest('detailPanel');
      this.detailPanel = { id: pageId, name: pageName || 'Loading...', loading: true, properties: null, content: null, url: null };
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`, { signal }),
          fetch(`/api/notion/pages/${pageId}/content`, { signal }),
        ]);
        const page = await pageRes.json();
        const content = await contentRes.json();
        this.detailPanel = {
          id: pageId,
          name: pageName || page.properties?.Name || 'Untitled',
          url: page.url,
          properties: page.properties,
          content: content.markdown || '',
          loading: false,
        };
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Detail panel error:', err);
        if (this.detailPanel) {
          this.detailPanel.loading = false;
          this.detailPanel.content = '*Failed to load*';
        }
      } finally {
        this.endRequest('detailPanel', signal);
      }
    },

    closeDetailPanel() {
      if (this._requestControllers.detailPanel) this._requestControllers.detailPanel.abort();
      this.detailPanel = null;
    },

    askColinAboutDetail() {
      if (!this.detailPanel) return;
      this.view = 'chat';
      const context = (this.detailPanel.content || '').slice(0, 500);
      this.inputText = `Tell me about "${this.detailPanel.name}"\n\nContext:\n${context}...`;
      this.closeDetailPanel();
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },
  };
}
