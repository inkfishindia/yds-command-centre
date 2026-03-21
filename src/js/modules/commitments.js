export function createCommitmentsModule() {
  return {
    // Commitments kanban
    commitments: [],
    commitmentsLoading: false,
    commitmentsView: 'kanban',
    commitmentFilters: { focusArea: '', person: '', priority: '', status: '' },

    // Write-back state
    editDropdown: null,
    undoToast: null,
    quickNoteText: '',
    quickNoteSaving: false,
    writeErrors: {},
    peopleList: [],

    // Quick-create modals
    showCreateCommitment: false,
    showCreateDecision: false,
    submittingCommitment: false,
    submittingDecision: false,
    newCommitment: { name: '', assigneeId: '', dueDate: '', focusAreaId: '', priority: 'Medium', notes: '' },
    newDecision: { name: '', decision: '', rationale: '', context: '', focusAreaId: '', owner: 'Dan' },

    // Inline action state
    showSnoozeFor: null,
    showReassignFor: null,
    actionFeedback: null,

    // Bulk overdue selection
    selectedOverdue: [],

    handleCommitmentDocumentClick(event) {
      if (this.editDropdown && !event.target.closest('.edit-dropdown') && !event.target.closest('.editable-badge')) {
        this.editDropdown = null;
      }
    },

    async loadCommitments() {
      const signal = this.beginRequest('commitments');
      this.commitmentsLoading = true;
      try {
        const res = await fetch('/api/notion/commitments/all', { signal });
        const data = await res.json();
        this.commitments = data.commitments || [];
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('Commitments load error:', err);
      } finally {
        this.endRequest('commitments', signal);
        this.commitmentsLoading = false;
      }
    },

    getCommitmentsByStatus(status) {
      return this.getFilteredCommitments().filter(c => (c.Status || 'Not Started') === status);
    },

    getFilteredCommitments() {
      let filtered = this.commitments;
      if (this.commitmentFilters.focusArea) {
        const focusArea = this.commitmentFilters.focusArea;
        filtered = filtered.filter(c => Array.isArray(c.focusAreaNames) && c.focusAreaNames.includes(focusArea));
      }
      if (this.commitmentFilters.person) {
        const person = this.commitmentFilters.person;
        filtered = filtered.filter(c => Array.isArray(c.assignedNames) && c.assignedNames.includes(person));
      }
      if (this.commitmentFilters.priority) {
        filtered = filtered.filter(c => c.Priority === this.commitmentFilters.priority);
      }
      if (this.commitmentFilters.status) {
        filtered = filtered.filter(c => (c.Status || 'Not Started') === this.commitmentFilters.status);
      }
      return filtered;
    },

    isCommitmentOverdue(commitment) {
      if (!commitment['Due Date']) return false;
      const raw = typeof commitment['Due Date'] === 'object' ? commitment['Due Date'].start : commitment['Due Date'];
      if (!raw) return false;
      const due = new Date(raw + 'T00:00:00');
      return due < new Date() && commitment.Status !== 'Done';
    },

    getCommitmentFilterOptions() {
      const focusAreas = new Set();
      const people = new Set();
      const priorities = new Set();

      for (const commitment of this.commitments) {
        if (commitment.focusAreaNames) commitment.focusAreaNames.forEach(name => name && focusAreas.add(name));
        if (commitment.assignedNames) commitment.assignedNames.forEach(name => name && people.add(name));
        if (commitment.Priority) priorities.add(commitment.Priority);
      }

      return {
        focusAreas: [...focusAreas].sort(),
        people: [...people].sort(),
        priorities: [...priorities].sort(),
      };
    },

    async updateCommitmentField(commitmentId, field, newValue, apiPath) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldValue = commitment[field];
      commitment[field] = newValue;
      this.editDropdown = null;

      if (field === 'Status' || field === 'Priority') {
        this.showUndoToast(commitmentId, field, oldValue, newValue);
      }

      delete this.writeErrors[commitmentId + field];

      try {
        const body = {};
        body[apiPath === 'status' ? 'status' : 'priority'] = newValue;
        const res = await fetch(`/api/commitments/${commitmentId}/${apiPath}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          let msg = 'Update failed';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
      } catch (err) {
        commitment[field] = oldValue;
        this.writeErrors[commitmentId + field] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + field]; }, 4000);
        this.dismissUndoToast();
      }
    },

    updateStatus(commitmentId, newStatus) {
      this.updateCommitmentField(commitmentId, 'Status', newStatus, 'status');
    },

    updatePriority(commitmentId, newPriority) {
      this.updateCommitmentField(commitmentId, 'Priority', newPriority, 'priority');
    },

    async updateDueDate(commitmentId, newDate) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldValue = commitment['Due Date'];
      commitment['Due Date'] = { start: newDate, end: null };
      this.editDropdown = null;
      delete this.writeErrors[commitmentId + 'dueDate'];

      try {
        const res = await fetch(`/api/commitments/${commitmentId}/due-date`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: newDate }),
        });
        if (!res.ok) {
          let msg = 'Update failed';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
      } catch (err) {
        commitment['Due Date'] = oldValue;
        this.writeErrors[commitmentId + 'dueDate'] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + 'dueDate']; }, 4000);
      }
    },

    async updateAssignee(commitmentId, personId, personName) {
      const commitment = this.commitments.find(c => c.id === commitmentId);
      if (!commitment) return;

      const oldAssignedTo = [...(commitment['Assigned To'] || [])];
      const oldAssignedNames = [...(commitment.assignedNames || [])];

      commitment['Assigned To'] = [personId];
      commitment.assignedNames = [personName];
      this.editDropdown = null;
      delete this.writeErrors[commitmentId + 'assignee'];

      try {
        const res = await fetch(`/api/commitments/${commitmentId}/assignee`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId: personId.replace(/-/g, '') }),
        });
        if (!res.ok) {
          let msg = 'Update failed';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
      } catch (err) {
        commitment['Assigned To'] = oldAssignedTo;
        commitment.assignedNames = oldAssignedNames;
        this.writeErrors[commitmentId + 'assignee'] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + 'assignee']; }, 4000);
      }
    },

    async submitQuickNote(commitmentId) {
      const note = this.quickNoteText.trim();
      if (!note || this.quickNoteSaving) return;

      this.quickNoteSaving = true;
      delete this.writeErrors[commitmentId + 'notes'];

      try {
        const res = await fetch(`/api/commitments/${commitmentId}/notes`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        });
        if (!res.ok) {
          let msg = 'Failed to save note';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          throw new Error(msg);
        }
        const result = await res.json();
        const commitment = this.commitments.find(c => c.id === commitmentId);
        if (commitment) commitment.Notes = result.notes;
        if (this.detailPanel && this.detailPanel.id === commitmentId && this.detailPanel.properties) {
          this.detailPanel.properties.Notes = result.notes;
        }
        this.quickNoteText = '';
      } catch (err) {
        this.writeErrors[commitmentId + 'notes'] = err.message;
        setTimeout(() => { delete this.writeErrors[commitmentId + 'notes']; }, 4000);
      } finally {
        this.quickNoteSaving = false;
      }
    },

    async quickMarkDone(item) {
      try {
        const res = await fetch(`/api/commitments/${item.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Done' }),
        });
        if (res.ok) {
          this.actionFeedback = { type: 'success', message: `"${item.Name || 'Commitment'}" marked done` };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          this.actionFeedback = { type: 'error', message: 'Failed to update status' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to update' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      }
    },

    async quickSnooze(itemId, newDate) {
      try {
        const res = await fetch(`/api/commitments/${itemId}/due-date`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dueDate: newDate }),
        });
        if (res.ok) {
          this.showSnoozeFor = null;
          this.actionFeedback = { type: 'success', message: 'Due date updated' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          this.actionFeedback = { type: 'error', message: 'Failed to snooze' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to snooze' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      }
    },

    async quickReassign(itemId, personId, personName) {
      try {
        const res = await fetch(`/api/commitments/${itemId}/assignee`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ personId }),
        });
        if (res.ok) {
          this.showReassignFor = null;
          this.actionFeedback = { type: 'success', message: `Reassigned to ${personName}` };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          this.actionFeedback = { type: 'error', message: 'Failed to reassign' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to reassign' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      }
    },

    getSnoozeDate(preset) {
      const d = new Date();
      if (preset === 'tomorrow') d.setDate(d.getDate() + 1);
      else if (preset === '+3') d.setDate(d.getDate() + 3);
      else if (preset === '+7') d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    },

    toggleOverdueSelect(id) {
      const idx = this.selectedOverdue.indexOf(id);
      if (idx === -1) this.selectedOverdue.push(id);
      else this.selectedOverdue.splice(idx, 1);
    },

    isOverdueSelected(id) {
      return this.selectedOverdue.includes(id);
    },

    selectAllOverdue() {
      if (!this.dashboard || !this.dashboard.overdue) return;
      if (this.selectedOverdue.length === this.dashboard.overdue.length) {
        this.selectedOverdue = [];
      } else {
        this.selectedOverdue = this.dashboard.overdue.map(c => c.id);
      }
    },

    async bulkMarkDone() {
      if (this.selectedOverdue.length === 0) return;
      const count = this.selectedOverdue.length;
      for (const id of this.selectedOverdue) {
        try {
          await fetch(`/api/commitments/${id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Done' }),
          });
        } catch {}
      }
      this.selectedOverdue = [];
      this.actionFeedback = { type: 'success', message: `${count} items marked done` };
      setTimeout(() => { this.actionFeedback = null; }, 3000);
      this.loadDashboard();
    },

    async bulkSnooze(days) {
      if (this.selectedOverdue.length === 0) return;
      const count = this.selectedOverdue.length;
      const d = new Date();
      d.setDate(d.getDate() + days);
      const newDate = d.toISOString().split('T')[0];
      for (const id of this.selectedOverdue) {
        try {
          await fetch(`/api/commitments/${id}/due-date`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dueDate: newDate }),
          });
        } catch {}
      }
      this.selectedOverdue = [];
      this.actionFeedback = { type: 'success', message: `${count} items snoozed +${days}d` };
      setTimeout(() => { this.actionFeedback = null; }, 3000);
      this.loadDashboard();
    },

    async submitCommitment() {
      this.submittingCommitment = true;
      try {
        const res = await fetch('/api/commitments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newCommitment),
        });
        if (res.ok) {
          this.showCreateCommitment = false;
          this.newCommitment = { name: '', assigneeId: '', dueDate: '', focusAreaId: '', priority: 'Medium', notes: '' };
          this.actionFeedback = { type: 'success', message: 'Commitment created' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          let msg = 'Failed to create';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          this.actionFeedback = { type: 'error', message: msg };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to create commitment' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      } finally {
        this.submittingCommitment = false;
      }
    },

    async submitDecision() {
      this.submittingDecision = true;
      try {
        const res = await fetch('/api/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.newDecision),
        });
        if (res.ok) {
          this.showCreateDecision = false;
          this.newDecision = { name: '', decision: '', rationale: '', context: '', focusAreaId: '', owner: 'Dan' };
          this.actionFeedback = { type: 'success', message: 'Decision recorded' };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
          this.loadDashboard();
        } else {
          let msg = 'Failed to create';
          try {
            const err = await res.json();
            msg = err.error || msg;
          } catch {}
          this.actionFeedback = { type: 'error', message: msg };
          setTimeout(() => { this.actionFeedback = null; }, 3000);
        }
      } catch {
        this.actionFeedback = { type: 'error', message: 'Failed to create decision' };
        setTimeout(() => { this.actionFeedback = null; }, 3000);
      } finally {
        this.submittingDecision = false;
      }
    },

    openEditDropdown(commitmentId, field, event) {
      event.stopPropagation();
      const rect = event.target.getBoundingClientRect();
      const options = field === 'Status'
        ? ['Not Started', 'In Progress', 'Blocked', 'Done', 'Cancelled']
        : field === 'Priority'
          ? ['Urgent', 'High', 'Medium', 'Low']
          : [];
      this.editDropdown = {
        commitmentId,
        field,
        options,
        position: { top: rect.bottom + 4, left: rect.left },
      };
    },

    openDatePicker(commitmentId, event) {
      event.stopPropagation();
      const rect = event.target.getBoundingClientRect();
      const today = new Date();
      const fmt = d => d.toISOString().split('T')[0];
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextFriday = new Date(today);
      nextFriday.setDate(today.getDate() + ((5 - today.getDay() + 7) % 7 || 7));
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 1);

      this.editDropdown = {
        commitmentId,
        field: 'dueDate',
        shortcuts: [
          { label: 'Today', value: fmt(today) },
          { label: 'Tomorrow', value: fmt(tomorrow) },
          { label: 'Next Friday', value: fmt(nextFriday) },
          { label: 'Next week', value: fmt(nextWeek) },
          { label: 'Next month', value: fmt(nextMonth) },
        ],
        position: { top: rect.bottom + 4, left: rect.left },
      };
    },

    async openPersonPicker(commitmentId, event) {
      event.stopPropagation();
      const rect = event.target.getBoundingClientRect();

      if (this.peopleList.length === 0) {
        try {
          const res = await fetch('/api/notion/people');
          const data = await res.json();
          this.peopleList = data.people || [];
        } catch (err) {
          console.error('Failed to load people:', err);
          return;
        }
      }

      this.editDropdown = {
        commitmentId,
        field: 'assignee',
        people: this.peopleList,
        position: { top: rect.bottom + 4, left: rect.left },
      };
    },

    closeEditDropdown() {
      this.editDropdown = null;
    },

    showUndoToast(commitmentId, field, oldValue, newValue) {
      if (this.undoToast?.timeoutId) clearTimeout(this.undoToast.timeoutId);
      const timeoutId = setTimeout(() => { this.undoToast = null; }, 5000);
      this.undoToast = { commitmentId, field, oldValue, newValue, timeoutId };
    },

    undoLastChange() {
      if (!this.undoToast) return;
      const { commitmentId, field, oldValue } = this.undoToast;
      clearTimeout(this.undoToast.timeoutId);
      this.undoToast = null;
      if (field === 'Status') this.updateCommitmentField(commitmentId, 'Status', oldValue, 'status');
      else if (field === 'Priority') this.updateCommitmentField(commitmentId, 'Priority', oldValue, 'priority');
    },

    dismissUndoToast() {
      if (this.undoToast?.timeoutId) clearTimeout(this.undoToast.timeoutId);
      this.undoToast = null;
    },
  };
}
