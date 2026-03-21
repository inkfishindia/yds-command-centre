export function createChatModule() {
  return {
    // Chat state
    messages: [],
    inputText: '',
    streaming: false,
    streamingText: '',
    pendingApprovals: [],
    activeTools: [],
    reconnecting: false,

    // Approval countdown timers: { [approvalId]: intervalId }
    _approvalTimers: {},

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

    async _fetchStream(message, skill) {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, skill }),
      });

      // Don't retry on HTTP errors (4xx/5xx)
      if (!response.ok) {
        const errText = await response.text().catch(() => response.statusText);
        const httpErr = new Error(`HTTP ${response.status}: ${errText}`);
        httpErr.isHttpError = true;
        throw httpErr;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentEventType = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

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
                  this._addApprovalWithTimer(data);
                  this.scrollToBottom();
                  break;
                case 'tool_use':
                  this.activeTools = [...this.activeTools, data].slice(-3);
                  break;
                case 'error':
                  this.streamingText += `\n\n**Error:** ${data.error}`;
                  break;
                case 'done':
                  break;
              }
            } catch {}
            currentEventType = 'message';
          }
        }
      }
    },

    async streamResponse(message, skill) {
      this.streaming = true;
      this.streamingText = '';
      this.activeTools = [];
      this.reconnecting = false;

      const MAX_RETRIES = 3;
      let attempt = 0;

      while (attempt <= MAX_RETRIES) {
        try {
          // Reset partial text before each attempt to prevent garbled output on retry
          this.streamingText = '';
          this.activeTools = [];
          await this._fetchStream(message, skill);

          // Success — exit retry loop
          break;
        } catch (err) {
          // Don't retry HTTP errors (4xx/5xx)
          if (err.isHttpError || attempt >= MAX_RETRIES) {
            console.error('Chat error:', err);
            this.reconnecting = false;
            this.messages.push({
              role: 'assistant',
              content: `**Connection error:** ${err.message}. Check that the server is running.`,
            });
            break;
          }

          attempt++;
          const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
          this.reconnecting = true;
          console.warn(`Chat network error, retrying in ${delay}ms (attempt ${attempt}/${MAX_RETRIES})`, err);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      if (this.streamingText) {
        this.messages.push({ role: 'assistant', content: this.streamingText });
      }

      this.streaming = false;
      this.streamingText = '';
      this.activeTools = [];
      this.reconnecting = false;
      this._clearAllApprovalTimers();
      this.pendingApprovals = [];
      this.scrollToBottom();
    },

    // Approval countdown helpers
    _addApprovalWithTimer(data) {
      const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
      const createdAt = data.createdAt ? new Date(data.createdAt).getTime() : Date.now();
      const expiresAt = createdAt + TIMEOUT_MS;

      const approval = { ...data, timeRemaining: TIMEOUT_MS / 1000, expired: false };
      this.pendingApprovals.push(approval);

      const intervalId = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((expiresAt - now) / 1000));
        const idx = this.pendingApprovals.findIndex(a => a.approvalId === data.approvalId);
        if (idx === -1) {
          clearInterval(intervalId);
          return;
        }
        this.pendingApprovals[idx].timeRemaining = remaining;
        if (remaining <= 0) {
          this.pendingApprovals[idx].expired = true;
          clearInterval(intervalId);
          delete this._approvalTimers[data.approvalId];
        }
      }, 1000);

      this._approvalTimers[data.approvalId] = intervalId;
    },

    _clearAllApprovalTimers() {
      for (const id of Object.values(this._approvalTimers)) {
        clearInterval(id);
      }
      this._approvalTimers = {};
    },

    approvalTimerLabel(approval) {
      if (approval.expired) return 'Expired';
      const t = approval.timeRemaining ?? 300;
      const m = Math.floor(t / 60);
      const s = String(t % 60).padStart(2, '0');
      return `${m}:${s}`;
    },

    approvalTimerClass(approval) {
      if (approval.expired) return 'approval-timer--expired';
      const t = approval.timeRemaining ?? 300;
      if (t <= 15) return 'approval-timer--danger';
      if (t <= 60) return 'approval-timer--warn';
      return 'approval-timer--ok';
    },

    async resolveApproval(approvalId, approved) {
      const approval = this.pendingApprovals.find(item => item.approvalId === approvalId);
      if (approval) approval.resolving = true;
      try {
        const res = await fetch('/api/chat/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ approvalId, approved }),
        });
        if (!res.ok) throw new Error('Server rejected approval');
        // Clear timer and remove approval
        if (this._approvalTimers[approvalId]) {
          clearInterval(this._approvalTimers[approvalId]);
          delete this._approvalTimers[approvalId];
        }
        this.pendingApprovals = this.pendingApprovals.filter(item => item.approvalId !== approvalId);
      } catch (err) {
        console.error('Approval error:', err);
        if (approval) {
          approval.resolving = false;
          approval.error = 'Failed - try again';
        }
      }
    },

    async clearChat() {
      try {
        await fetch('/api/chat/clear', { method: 'POST' });
        this.messages = [];
        this._clearAllApprovalTimers();
        this.pendingApprovals = [];
        this.streamingText = '';
      } catch (err) {
        console.error('Clear error:', err);
      }
    },
  };
}
