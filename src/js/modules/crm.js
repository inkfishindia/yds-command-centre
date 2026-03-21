export function createCrmModule() {
  return {
    // CRM
    crm: null,
    crmLoading: false,
    crmSection: 'overview',
    crmSearch: '',
    crmExpandedItem: null,
    crmSectionData: null,

    async loadCrm() {
      const signal = this.beginRequest('crm');
      this.crmLoading = true;
      try {
        const res = await fetch('/api/crm', { signal });
        if (res.ok) this.crm = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM load error:', err);
      } finally {
        this.endRequest('crm', signal);
        this.crmLoading = false;
      }
    },

    async crmSwitchSection(section) {
      this.crmSection = section;
      if (section === 'overview') {
        if (!this.crm) await this.loadCrm();
        return;
      }

      const signal = this.beginRequest('crmSection');
      this.crmLoading = true;
      this.crmSectionData = null;
      try {
        const res = await fetch(`/api/crm/${section}`, { signal });
        if (res.ok) {
          this.crmSectionData = await res.json();
          this.crm = { ...this.crm, ...this.crmSectionData };
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM section error:', err);
      } finally {
        this.endRequest('crmSection', signal);
        this.crmLoading = false;
      }
    },

    getCrmRows() {
      if (!this.crm) return [];
      if (this.crmSection !== 'overview' && this.crmSectionData && this.crmSectionData.rows) {
        let rows = this.crmSectionData.rows;
        if (this.crmSearch) {
          const query = this.crmSearch.toLowerCase();
          rows = rows.filter((row) =>
            Object.values(row).some((value) => String(value || '').toLowerCase().includes(query))
          );
        }
        return rows;
      }
      return [];
    },

    getCrmColumns() {
      if (!this.crm || this.crmSection === 'overview') return [];
      if (this.crmSectionData && this.crmSectionData.rows && this.crmSectionData.rows.length > 0) {
        return Object.keys(this.crmSectionData.rows[0]).filter((key) => key !== 'rowIndex' && !key.endsWith('_resolved'));
      }
      return [];
    },
  };
}
