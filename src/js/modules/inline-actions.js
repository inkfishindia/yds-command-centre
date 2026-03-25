// Inline action helpers (status changes, context menus)
export function createInlineActionsModule() {
  return {
    // Context menu state
    contextMenu: { open: false, x: 0, y: 0, items: [], target: null },

    openContextMenu(event, items, target) {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      this.contextMenu = {
        open: true,
        x: rect.left,
        y: rect.bottom + 4,
        items,
        target,
      };
    },

    closeContextMenu() {
      this.contextMenu.open = false;
    },

    async executeContextAction(action) {
      this.closeContextMenu();
      if (typeof action.handler === 'function') {
        await action.handler();
      }
    },

    // Inline status change (sends PATCH via approval gate)
    async changeStatus(endpoint, id, property, value) {
      try {
        const res = await fetch(endpoint.replace(':id', id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ property, value }),
        });
        if (!res.ok) throw new Error('Update failed');
        const data = await res.json();
        if (data.pendingApproval) {
          this.showInfo('Awaiting approval...');
        } else {
          this.showSuccess(`Updated ${property} to ${value}`);
        }
        return data;
      } catch (err) {
        this.showError(`Failed to update: ${err.message}`);
        return null;
      }
    },

    // Commitment status options for context menus
    getCommitmentActions(item) {
      return [
        { label: 'Mark Done', icon: '✓', handler: () => this.changeStatus('/api/commitments/:id', item.id, 'Status', 'Done') },
        { label: 'Mark Blocked', icon: '⚠', handler: () => this.changeStatus('/api/commitments/:id', item.id, 'Status', 'Blocked') },
        { label: 'View Details', icon: '→', handler: () => this.openDrawer('commitment', item.id, item.name) },
        { divider: true },
        { label: 'Escalate', icon: '!', handler: () => this.changeStatus('/api/commitments/:id', item.id, 'Status', 'Needs Dan'), danger: true },
      ];
    },

    // Sprint item actions
    getSprintActions(item) {
      return [
        { label: 'Start Work', icon: '▶', handler: () => this.changeStatus('/api/tech-team/sprint/:id', item.id, 'Status', 'In Progress') },
        { label: 'Mark Done', icon: '✓', handler: () => this.changeStatus('/api/tech-team/sprint/:id', item.id, 'Status', 'Done') },
        { label: 'View Details', icon: '→', handler: () => this.openDrawer('sprint', item.id, item.name) },
      ];
    },

    // Campaign actions
    getCampaignActions(item) {
      return [
        { label: 'Move to Review', icon: '→', handler: () => this.changeStatus('/api/marketing-ops/campaigns/:id', item.id, 'Stage', 'Review') },
        { label: 'Flag At Risk', icon: '⚠', handler: () => this.changeStatus('/api/marketing-ops/campaigns/:id', item.id, 'Status', 'At Risk'), danger: true },
        { label: 'View Details', icon: '→', handler: () => this.openDrawer('campaign', item.id, item.name) },
      ];
    },
  };
}
