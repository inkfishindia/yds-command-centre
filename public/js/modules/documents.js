export function createDocumentsModule() {
  return {
    // Documents
    documents: { briefings: [], decisions: [], 'weekly-reviews': [] },
    docsTab: 'briefings',
    docsLoading: false,
    activeDoc: null,

    async loadDocuments() {
      const signal = this.beginRequest('documents');
      this.docsLoading = true;
      try {
        const res = await fetch('/api/documents', { signal });
        this.documents = await res.json();
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

    discussDocument(doc) {
      if (this.streaming) return;
      this.view = 'chat';
      this.inputText = `I'd like to discuss this document: ${doc.filename}\n\n---\n${doc.content.slice(0, 500)}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },
  };
}
