// Universal detail drawer
export function createDetailDrawerModule() {
  return {
    // State
    drawerOpen: false,
    drawerTitle: '',
    drawerType: null,    // 'commitment', 'project', 'person', 'decision', etc.
    drawerData: null,    // The entity data
    drawerLoading: false,
    drawerRelated: [],   // Related items loaded async

    // Methods
    async openDrawer(type, id, title) {
      this.drawerOpen = true;
      this.drawerTitle = title || 'Details';
      this.drawerType = type;
      this.drawerData = null;
      this.drawerLoading = true;
      this.drawerRelated = [];

      try {
        const res = await fetch(`/api/notion/pages/${id}`);
        if (!res.ok) throw new Error('Failed to load');
        this.drawerData = await res.json();

        // Load related items
        try {
          const relRes = await fetch(`/api/notion/pages/${id}/related`);
          if (relRes.ok) {
            const relData = await relRes.json();
            this.drawerRelated = relData.related || [];
          }
        } catch { /* related items are optional */ }
      } catch {
        this.showError('Failed to load details');
        this.drawerOpen = false;
      } finally {
        this.drawerLoading = false;
      }
    },

    closeDrawer() {
      this.drawerOpen = false;
      // Clear data after animation completes
      setTimeout(() => {
        this.drawerType = null;
        this.drawerData = null;
        this.drawerRelated = [];
      }, 300);
    },

    // Helper to get a property value from Notion page data
    getDrawerProp(name) {
      if (!this.drawerData?.properties) return null;
      const prop = this.drawerData.properties[name];
      if (!prop) return null;

      switch (prop.type) {
        case 'title': return prop.title?.map(t => t.plain_text).join('') || '';
        case 'rich_text': return prop.rich_text?.map(t => t.plain_text).join('') || '';
        case 'select': return prop.select?.name || '';
        case 'multi_select': {
          const names = prop.multi_select?.map(s => s.name) || [];
          return names.length > 0 ? names.join(', ') : '';
        }
        case 'date': return prop.date?.start || '';
        case 'number': return prop.number;
        case 'checkbox': return prop.checkbox;
        case 'status': return prop.status?.name || '';
        case 'url': return prop.url || '';
        case 'email': return prop.email || '';
        case 'phone_number': return prop.phone_number || '';
        case 'created_time': return prop.created_time || '';
        case 'last_edited_time': return prop.last_edited_time || '';
        case 'people': return prop.people?.map(p => p.name || p.id).join(', ') || '';
        case 'formula': {
          const f = prop.formula;
          if (!f) return '';
          return f.string || f.number?.toString() || f.boolean?.toString() || f.date?.start || '';
        }
        case 'relation': {
          const ids = prop.relation?.map(r => r.id) || [];
          return ids.length > 0 ? `${ids.length} linked` : '';
        }
        default: return null;
      }
    },

    // Format a Notion date for display
    formatDrawerDate(dateStr) {
      if (!dateStr) return '—';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    },
  };
}
