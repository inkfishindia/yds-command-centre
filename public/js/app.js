/**
 * YDS Command Centre — Frontend Application
 * Uses Alpine.js for reactivity, marked.js for markdown rendering.
 */

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

function app() {
  return {
    // Navigation
    view: 'chat',

    // Connection status
    connected: false,

    // Chat state
    messages: [],
    inputText: '',
    streaming: false,
    streamingText: '',
    pendingApprovals: [],
    activeTools: [],

    // Skills
    skills: [],

    // Expert panel (static — matches CLAUDE.md)
    experts: [
      { name: 'Rory', domain: 'Behavioral psychology, nudges', icon: 'R' },
      { name: 'JW', domain: 'Visual strategy, UX, brand', icon: 'J' },
      { name: 'Harry', domain: 'Copy, CTAs, messaging', icon: 'H' },
      { name: 'Tech', domain: 'Architecture, feasibility', icon: 'A' },
      { name: 'Emily', domain: 'Marketing campaigns', icon: 'E' },
    ],

    // Dashboard
    dashboard: null,
    dashboardLoading: false,

    // Team
    teamData: [],
    teamLoading: false,

    // Documents
    documents: { briefings: [], decisions: [], 'weekly-reviews': [] },
    docsTab: 'briefings',
    docsLoading: false,
    activeDoc: null,

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

    // Initialization
    async init() {
      // Check server health
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        this.connected = data.status === 'ok' && data.hasAnthropicKey;
      } catch {
        this.connected = false;
      }

      // Load available skills
      try {
        const res = await fetch('/api/skills');
        const data = await res.json();
        this.skills = data.skills;
      } catch (err) {
        console.error('Failed to load skills:', err);
      }
    },

    // --- Chat ---

    async sendMessage() {
      const text = this.inputText.trim();
      if (!text || this.streaming) return;

      this.inputText = '';
      this.messages.push({ role: 'user', content: text });
      this.scrollToBottom();

      await this.streamResponse(text, null);
    },

    async triggerSkill(skill) {
      if (this.streaming) return;

      const message = skill.defaultMessage || `Run /${skill.name}`;
      this.messages.push({ role: 'user', content: `/${skill.name} — ${message}` });
      this.scrollToBottom();

      await this.streamResponse(message, skill.name);
    },

    routeToExpert(expert) {
      if (this.streaming) return;

      const message = `Route this to ${expert.name} (${expert.domain})`;
      this.inputText = message;
      this.$refs.chatInput?.focus();
    },

    async streamResponse(message, skill) {
      this.streaming = true;
      this.streamingText = '';
      this.activeTools = [];

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, skill }),
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let currentEventType = 'message';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop(); // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEventType = line.slice(7).trim();
              continue;
            }
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                switch (currentEventType) {
                  case 'text':
                    this.streamingText += data.text;
                    this.scrollToBottom();
                    break;
                  case 'approval':
                    this.pendingApprovals.push(data);
                    this.scrollToBottom();
                    break;
                  case 'tool_use':
                    this.activeTools = [...this.activeTools, data];
                    break;
                  case 'error':
                    this.streamingText += `\n\n**Error:** ${data.error}`;
                    break;
                  case 'done':
                    // Stream complete
                    break;
                }
              } catch {
                // Ignore parse errors for incomplete chunks
              }
              currentEventType = 'message'; // Reset after processing
            }
          }
        }

        // Finalize — move streaming text to messages
        if (this.streamingText) {
          this.messages.push({ role: 'assistant', content: this.streamingText });
        }
      } catch (err) {
        console.error('Chat error:', err);
        this.messages.push({
          role: 'assistant',
          content: `**Connection error:** ${err.message}. Check that the server is running.`,
        });
      } finally {
        this.streaming = false;
        this.streamingText = '';
        this.activeTools = [];
        this.scrollToBottom();
      }
    },

    async resolveApproval(approvalId, approved) {
      try {
        await fetch('/api/chat/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId, approved }),
        });
        this.pendingApprovals = this.pendingApprovals.filter(a => a.approvalId !== approvalId);
      } catch (err) {
        console.error('Approval error:', err);
      }
    },

    async clearChat() {
      try {
        await fetch('/api/chat/clear', { method: 'POST' });
        this.messages = [];
        this.pendingApprovals = [];
        this.streamingText = '';
      } catch (err) {
        console.error('Clear error:', err);
      }
    },

    // --- Dashboard ---

    async loadDashboard() {
      this.dashboardLoading = true;
      try {
        const res = await fetch('/api/notion/dashboard');
        this.dashboard = await res.json();
      } catch (err) {
        console.error('Dashboard error:', err);
      } finally {
        this.dashboardLoading = false;
      }
    },

    getFocusHealthClass(area) {
      const health = (area.Health || area.Status || '').toLowerCase();
      if (health.includes('attention')) return 'focus-attention';
      if (health.includes('paused') || health.includes('hold')) return 'focus-paused';
      if (health.includes('needs improvement')) return 'focus-needs-improvement';
      return '';
    },

    // --- Team ---

    async loadTeam() {
      this.teamLoading = true;
      try {
        const res = await fetch('/api/notion/people');
        const data = await res.json();
        this.teamData = data.people;
      } catch (err) {
        console.error('Team error:', err);
      } finally {
        this.teamLoading = false;
      }
    },

    askColinAbout(personName) {
      this.view = 'chat';
      this.inputText = `What is ${personName}'s current workload and commitments?`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    // --- Documents ---

    async loadDocuments() {
      this.docsLoading = true;
      try {
        const res = await fetch('/api/documents');
        this.documents = await res.json();
      } catch (err) {
        console.error('Documents error:', err);
      } finally {
        this.docsLoading = false;
      }
    },

    async openDocument(category, filename) {
      try {
        const res = await fetch(`/api/documents/${category}/${encodeURIComponent(filename)}`);
        this.activeDoc = await res.json();
      } catch (err) {
        console.error('Document open error:', err);
      }
    },

    discussDocument(doc) {
      this.view = 'chat';
      this.inputText = `I'd like to discuss this document: ${doc.filename}\n\n---\n${doc.content.slice(0, 500)}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    // --- Notion Browser ---

    async loadNotion() {
      this.notionLoading = true;
      this.notionActiveDb = null;
      this.notionActivePage = null;
      this.notionPageContent = '';
      try {
        const [dbRes, kpRes] = await Promise.all([
          fetch('/api/notion/databases'),
          fetch('/api/notion/key-pages'),
        ]);
        const dbData = await dbRes.json();
        const kpData = await kpRes.json();
        this.notionDatabases = dbData.databases;
        this.notionKeyPages = kpData.pages;
      } catch (err) {
        console.error('Notion load error:', err);
      } finally {
        this.notionLoading = false;
      }
    },

    async openNotionDb(db) {
      this.notionLoading = true;
      this.notionActiveDb = db;
      this.notionActivePage = null;
      this.notionPageContent = '';
      this.notionEntries = [];
      try {
        const res = await fetch(`/api/notion/databases/${db.id}`);
        const data = await res.json();
        this.notionEntries = data.results;
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        console.error('Database query error:', err);
      } finally {
        this.notionLoading = false;
      }
    },

    async loadMoreEntries() {
      if (!this.notionHasMore || !this.notionNextCursor || !this.notionActiveDb) return;
      this.notionLoading = true;
      try {
        const res = await fetch(`/api/notion/databases/${this.notionActiveDb.id}?cursor=${this.notionNextCursor}`);
        const data = await res.json();
        this.notionEntries = [...this.notionEntries, ...data.results];
        this.notionHasMore = data.hasMore;
        this.notionNextCursor = data.nextCursor;
      } catch (err) {
        console.error('Load more error:', err);
      } finally {
        this.notionLoading = false;
      }
    },

    async openNotionPage(pageId, pageName) {
      this.notionLoading = true;
      this.notionActivePage = { id: pageId, name: pageName || 'Loading...' };
      this.notionPageContent = '';
      try {
        const [pageRes, contentRes] = await Promise.all([
          fetch(`/api/notion/pages/${pageId}`),
          fetch(`/api/notion/pages/${pageId}/content`),
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
      } catch (err) {
        console.error('Page load error:', err);
        this.notionPageContent = '*Failed to load page content*';
      } finally {
        this.notionLoading = false;
      }
    },

    notionBack() {
      if (this.notionActivePage) {
        this.notionActivePage = null;
        this.notionPageContent = '';
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
      if (entry.Status) parts.push(entry.Status);
      if (entry.Health) parts.push(entry.Health);
      if (entry.Priority) parts.push(entry.Priority);
      if (entry.Function) parts.push(entry.Function);
      if (entry.Role) parts.push(entry.Role);
      if (entry.Type) parts.push(entry.Type);
      if (entry['Due Date']) parts.push(`Due: ${entry['Due Date']}`);
      if (entry.Date) parts.push(entry.Date);
      if (entry.Owner) parts.push(`Owner: ${entry.Owner}`);
      return parts.slice(0, 3).join(' · ');
    },

    getPropertyEntries(props) {
      if (!props) return [];
      return Object.entries(props).filter(([, v]) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0));
    },

    formatPropertyValue(value) {
      if (Array.isArray(value)) return value.join(', ');
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    },

    askColinAboutPage(page) {
      this.view = 'chat';
      const context = this.notionPageContent.slice(0, 500);
      this.inputText = `Tell me about this Notion page: "${page.name}"\n\nContent preview:\n${context}...`;
      this.$nextTick(() => this.$refs.chatInput?.focus());
    },

    // --- Utilities ---

    renderMarkdown(text) {
      if (!text) return '';
      try {
        return marked.parse(text);
      } catch {
        return this.escapeHtml(text);
      }
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    formatToolName(name) {
      return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    },

    scrollToBottom() {
      this.$nextTick(() => {
        const el = document.getElementById('messages');
        if (el) el.scrollTop = el.scrollHeight;
      });
    },
  };
}
