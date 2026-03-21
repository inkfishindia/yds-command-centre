export function createMarketingOpsModule() {
  return {
    // Marketing Ops
    mktops: null,
    mktopsLoading: false,
    mktopsSection: 'overview',
    mktopsLastRefresh: null,

    // Marketing AI Tools inputs
    mktopsAiInputs: { segment: '', context: '', competitor: '', focus: '', topic: '', audience: '', goal: '', product: '', budget: '' },

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
  };
}
