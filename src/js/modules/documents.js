export function createDocumentsModule() {
  return {
    // Documents
    documents: { outputs: [], briefings: [], decisions: [], 'weekly-reviews': [] },
    docsTab: 'outputs',
    docsLoading: false,
    activeDoc: null,
    docsSearch: '',
    docsStatusFilter: '',
    docsReviewSummary: { total: 0, pending: 0, approved: 0, 'needs-edit': 0, rejected: 0 },

    async loadDocuments() {
      const signal = this.beginRequest('documents');
      this.docsLoading = true;
      try {
        const res = await fetch('/api/documents', { signal });
        const data = await res.json();
        this.docsReviewSummary = data._summary || { total: 0, pending: 0, approved: 0, 'needs-edit': 0, rejected: 0 };
        delete data._summary;
        this.documents = data;
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Documents error:', err);
      } finally {
        this.endRequest('documents', signal);
        this.docsLoading = false;
      }
    },

    async openDocument(category, filename) {
      const signal = this.beginRequest('activeDocument');
      try {
        const res = await fetch(`/api/documents/${category}/${encodeURIComponent(filename)}`, { signal });
        this.activeDoc = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Document open error:', err);
      } finally {
        this.endRequest('activeDocument', signal);
      }
    },

    getVisibleDocuments() {
      let items = Array.isArray(this.documents[this.docsTab]) ? [...this.documents[this.docsTab]] : [];
      if (this.docsSearch) {
        const query = this.docsSearch.trim().toLowerCase();
        items = items.filter((item) => String(item.name || '').toLowerCase().includes(query));
      }
      if (this.docsStatusFilter) {
        items = items.filter((item) => (item.status || 'pending') === this.docsStatusFilter);
      }
      return items;
    },

    async reviewDocument(item, status) {
      if (!item?.path || !status) return;
      try {
        const res = await fetch('/api/documents/review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ path: item.path, status }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        await this.loadDocuments();
        if (this.activeDoc?.filename === item.name) {
          this.activeDoc = { ...this.activeDoc, status };
        }
      } catch (err) {
        console.error('Document review error:', err);
      }
    },

    getDocsStatusClass(status) {
      if (status === 'approved') return 'pill-green';
      if (status === 'needs-edit') return 'pill-amber';
      if (status === 'rejected') return 'pill-red';
      return 'pill-blue';
    },

    discussDocument(doc) {
      if (this.streaming) return;
      this.view = 'chat';
      this.inputText = `I'd like to discuss this document: ${doc.filename}\n\n---\n${doc.content.slice(0, 500)}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    async reviewActiveDocument(status) {
      if (!this.activeDoc?.path || !status) return;
      await this.reviewDocument(this.activeDoc, status);
      await this.openDocument(this.activeDoc.category, this.activeDoc.filename);
    },
  };
}
