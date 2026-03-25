export function createCrmModule() {
  return {
    // CRM
    crmSection: 'overview',
    crm: null,
    crmLoading: false,
    crmSavedView: 'newest-leads',

    // Leads
    crmLeads: [],
    crmLeadsTotal: 0,
    crmLeadsPage: 1,
    crmLeadsLoading: false,
    crmLeadFilters: { status: '', category: '', search: '' },

    // Flows
    crmFlows: [],
    crmFlowsLoading: false,
    crmFlowFilters: { status: '', stage: '', owner: '' },

    // Detail
    crmDetail: null,
    crmDetailType: null, // 'lead' | 'flow'
    crmDetailLoading: false,

    // Team
    crmTeam: null,

    // Config
    crmConfig: null,

    async loadCrm() {
      const signal = this.beginRequest('crm');
      this.crmLoading = true;
      try {
        const res = await fetch('/api/crm', { signal });
        if (res.ok) {
          this.crm = await res.json();
          this.runNotificationChecks?.('crm');
        }
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
      } else if (section === 'leads') {
        await this.loadCrmLeads();
      } else if (section === 'flows') {
        await this.loadCrmFlows();
      } else if (section === 'team') {
        await this.loadCrmTeam();
      } else if (section === 'config') {
        await this.loadCrmConfig();
      }
    },

    async loadCrmLeads() {
      const signal = this.beginRequest('crmLeads');
      this.crmLeadsLoading = true;
      const { status, category, search } = this.crmLeadFilters;
      const params = new URLSearchParams({ page: this.crmLeadsPage, limit: 50 });
      if (status) params.set('status', status);
      if (category) params.set('category', category);
      if (search) params.set('search', search);
      try {
        const res = await fetch(`/api/crm/leads?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmLeads = data.rows || [];
          this.crmLeadsTotal = data.total || 0;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM leads error:', err);
      } finally {
        this.endRequest('crmLeads', signal);
        this.crmLeadsLoading = false;
      }
    },

    async loadCrmFlows() {
      const signal = this.beginRequest('crmFlows');
      this.crmFlowsLoading = true;
      const { status, stage, owner } = this.crmFlowFilters;
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (stage) params.set('stage', stage);
      if (owner) params.set('owner', owner);
      try {
        const res = await fetch(`/api/crm/flows?${params}`, { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmFlows = data.rows || [];
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM flows error:', err);
      } finally {
        this.endRequest('crmFlows', signal);
        this.crmFlowsLoading = false;
      }
    },

    async openCrmLead(leadId) {
      this.crmDetailType = 'lead';
      this.crmDetailLoading = true;
      this.crmDetail = null;
      const signal = this.beginRequest('crmDetail');
      try {
        const res = await fetch(`/api/crm/leads/${leadId}`, { signal });
        if (res.ok) this.crmDetail = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM lead detail error:', err);
      } finally {
        this.endRequest('crmDetail', signal);
        this.crmDetailLoading = false;
      }
    },

    async openCrmFlow(flowId) {
      this.crmDetailType = 'flow';
      this.crmDetailLoading = true;
      this.crmDetail = null;
      const signal = this.beginRequest('crmDetail');
      try {
        const res = await fetch(`/api/crm/flows/${flowId}`, { signal });
        if (res.ok) this.crmDetail = await res.json();
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM flow detail error:', err);
      } finally {
        this.endRequest('crmDetail', signal);
        this.crmDetailLoading = false;
      }
    },

    closeCrmDetail() {
      this.crmDetail = null;
      this.crmDetailType = null;
    },

    async loadCrmTeam() {
      if (this.crmTeam) return;
      const signal = this.beginRequest('crmTeam');
      try {
        const res = await fetch('/api/crm/team', { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmTeam = data;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM team error:', err);
      } finally {
        this.endRequest('crmTeam', signal);
      }
    },

    async loadCrmConfig() {
      if (this.crmConfig) return;
      const signal = this.beginRequest('crmConfig');
      try {
        const res = await fetch('/api/crm/config', { signal });
        if (res.ok) {
          const data = await res.json();
          this.crmConfig = data;
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('CRM config error:', err);
      } finally {
        this.endRequest('crmConfig', signal);
      }
    },

    crmApplyFilter(key, value) {
      this.crmLeadFilters[key] = value;
      this.crmLeadsPage = 1;
      this.loadCrmLeads();
    },

    crmApplyFlowFilter(key, value) {
      this.crmFlowFilters[key] = value;
      this.loadCrmFlows();
    },

    async crmApplySavedView(viewId) {
      this.crmSavedView = viewId;
      if (viewId === 'newest-leads') {
        this.crmLeadFilters = { status: '', category: '', search: '' };
        this.crmLeadsPage = 1;
        this.crmSection = 'leads';
        await this.loadCrmLeads();
        return;
      }
      if (viewId === 'qualified') {
        this.crmFlowFilters = { ...this.crmFlowFilters, status: 'Qualified', stage: '', owner: '' };
        this.crmSection = 'flows';
        await this.loadCrmFlows();
        return;
      }
      if (viewId === 'won') {
        this.crmFlowFilters = { ...this.crmFlowFilters, status: 'Won', stage: '', owner: '' };
        this.crmSection = 'flows';
        await this.loadCrmFlows();
        return;
      }
      if (viewId === 'owner-load') {
        this.crmSection = 'team';
        await this.loadCrmTeam();
        return;
      }
      this.crmFlowFilters = { ...this.crmFlowFilters, status: 'Stalled', stage: '', owner: '' };
      this.crmSection = 'flows';
      await this.loadCrmFlows();
    },

    crmNextPage() {
      const totalPages = Math.ceil(this.crmLeadsTotal / 50);
      if (this.crmLeadsPage < totalPages) {
        this.crmLeadsPage++;
        this.loadCrmLeads();
      }
    },

    crmPrevPage() {
      if (this.crmLeadsPage > 1) {
        this.crmLeadsPage--;
        this.loadCrmLeads();
      }
    },

    crmTotalPages() {
      return Math.ceil(this.crmLeadsTotal / 50) || 1;
    },

    getCrmStatusColor(status) {
      if (!status) return 'crm-status-unknown';
      const s = String(status).toLowerCase();
      if (s === 'active') return 'crm-status-active';
      if (s === 'stalled') return 'crm-status-stalled';
      if (s === 'won') return 'crm-status-won';
      if (s === 'qualified') return 'crm-status-qualified';
      if (s === 'lost' || s === 'unknown') return 'crm-status-lost';
      if (s === 'new') return 'crm-status-new';
      return 'crm-status-unknown';
    },

    getCrmFlowStatusCount(status) {
      if (!this.crm || !this.crm.flowStats) return 0;
      const item = (this.crm.flowStats.byStatus || []).find(
        (s) => s.name.toLowerCase() === status.toLowerCase()
      );
      return item ? item.count : 0;
    },

    getCrmOverviewKpi(name) {
      if (!this.crm || !this.crm.flowStats) return 0;
      return this.getCrmFlowStatusCount(name);
    },

    getCrmAreaStatus() {
      const stalled = this.getCrmFlowStatusCount('Stalled');
      const lost = this.getCrmFlowStatusCount('Lost');
      const qualified = this.getCrmFlowStatusCount('Qualified');
      if (stalled >= 10 || lost >= qualified) return { tone: 'critical', label: 'Needs Intervention' };
      if (stalled > 0) return { tone: 'warning', label: 'Needs Attention' };
      if (!this.crm) return { tone: 'neutral', label: 'Loading' };
      return { tone: 'healthy', label: 'Healthy' };
    },

    getCrmHeroMetrics() {
      return [
        {
          id: 'total-leads',
          label: 'Total Leads',
          value: this.crm?.leadStats?.total || 0,
          note: `${this.getCrmFlowStatusCount('New')} new`,
        },
        {
          id: 'active-flows',
          label: 'Active Flows',
          value: this.getCrmFlowStatusCount('Active'),
          note: `${this.getCrmFlowStatusCount('Qualified')} qualified`,
        },
        {
          id: 'stalled',
          label: 'Stalled',
          value: this.getCrmFlowStatusCount('Stalled'),
          note: `${this.getCrmFlowStatusCount('Lost')} lost`,
        },
        {
          id: 'team',
          label: 'CRM Team',
          value: this.crm?.team?.count || 0,
          note: `${this.crm?.flowStats?.total || 0} total flows`,
        },
      ];
    },

    getCrmPriorityCards() {
      const topOwners = (this.crm?.flowStats?.byOwner || []).slice(0, 3);
      const topStatuses = (this.crm?.flowStats?.byStatus || []).slice(0, 4);
      const recentLeads = (this.crm?.leadStats?.recentLeads || []).slice(0, 3);
      return [
        {
          id: 'pipeline-health',
          title: 'Pipeline Health',
          tone: this.getCrmFlowStatusCount('Stalled') > 0 ? 'warning' : 'healthy',
          value: this.getCrmFlowStatusCount('Active'),
          label: 'active flows in motion',
          items: topStatuses.map(item => ({
            name: item.name,
            meta: String(item.count),
          })),
        },
        {
          id: 'owner-workload',
          title: 'Owner Workload',
          tone: 'neutral',
          value: this.crm?.flowStats?.total || 0,
          label: 'flows distributed across the CRM team',
          items: topOwners.map(item => ({
            name: item.name,
            meta: `${item.count} flows`,
          })),
        },
        {
          id: 'newest-leads',
          title: 'Newest Leads',
          tone: 'neutral',
          value: this.crm?.leadStats?.recentLeads?.length || 0,
          label: 'most recent leads entering the system',
          items: recentLeads.map(item => ({
            name: item.name || item.company || 'Untitled',
            meta: item.Status || item.Category || '',
          })),
        },
      ];
    },

    getCrmFocusList() {
      const stalled = (this.crm?.flowStats?.byStatus || []).find(item => String(item.name || '').toLowerCase() === 'stalled');
      const recentLead = this.crm?.leadStats?.recentLeads?.[0];
      const items = [];
      if (stalled && stalled.count > 0) {
        items.push({
          title: `${stalled.count} stalled flows need review`,
          detail: 'Jump into flows to unblock or requalify stuck pipeline',
          target: 'flows',
        });
      }
      if (recentLead) {
        items.push({
          title: `Newest lead: ${recentLead.name || recentLead.company || 'Untitled'}`,
          detail: recentLead.Status || recentLead.Category || 'New lead',
          target: 'leads',
        });
      }
      if (items.length === 0) {
        items.push({
          title: 'Pipeline is clear',
          detail: 'No immediate CRM bottlenecks detected',
          target: 'overview',
        });
      }
      return items;
    },

    getCrmMetricAction(metricId) {
      const actions = {
        'total-leads': () => this.crmApplySavedView('newest-leads'),
        'active-flows': () => this.crmApplySavedView('qualified'),
        stalled: () => this.crmApplySavedView('stalled'),
        team: () => this.crmApplySavedView('owner-load'),
      };
      return actions[metricId] || (() => {});
    },

    getCrmSavedViews() {
      return [
        { id: 'stalled', label: 'Stalled Flows' },
        { id: 'qualified', label: 'Qualified' },
        { id: 'newest-leads', label: 'Newest Leads' },
        { id: 'owner-load', label: 'Owner Load' },
        { id: 'won', label: 'Won' },
      ];
    },

    getCrmSavedViewItems() {
      if (this.crmSavedView === 'newest-leads') {
        return (this.crm?.leadStats?.recentLeads || []).slice(0, 5).map((lead) => ({
          title: lead.name || lead.company || 'Untitled lead',
          detail: lead.Status || lead.Category || 'Recent lead',
          action: () => this.openCrmLead(lead.lead_id),
        }));
      }
      if (this.crmSavedView === 'owner-load') {
        return (this.crm?.flowStats?.byOwner || []).slice(0, 5).map((owner) => ({
          title: owner.name,
          detail: `${owner.count} flows owned`,
          action: () => {
            this.crmFlowFilters = { ...this.crmFlowFilters, owner: owner.name, status: '', stage: '' };
            this.crmSwitchSection('flows');
          },
        }));
      }
      const statusName = this.crmSavedView === 'qualified'
        ? 'Qualified'
        : this.crmSavedView === 'won'
          ? 'Won'
          : 'Stalled';
      return (this.crm?.flows?.rows || this.crmFlows || [])
        .filter((flow) => String(flow.status || '').toLowerCase() === statusName.toLowerCase())
        .slice(0, 5)
        .map((flow) => ({
          title: flow.leadName || 'Untitled flow',
          detail: `${flow.owner || 'Unassigned'} · ${flow.stage || flow.status || 'Flow'}`,
          action: () => this.openCrmFlow(flow.flow_id),
        }));
    },

    getCrmSavedViewEmptyState() {
      const labels = {
        stalled: 'No stalled flows right now.',
        qualified: 'No qualified flows right now.',
        'newest-leads': 'No recent leads available.',
        'owner-load': 'No owner workload data available.',
        won: 'No won flows right now.',
      };
      return labels[this.crmSavedView] || 'No items available.';
    },

    async openCrmOwnerContext(ownerName) {
      if (!ownerName) return;
      if (Array.isArray(this.teamData) && this.teamData.length === 0) {
        await this.loadTeam();
      }
      const normalized = String(ownerName).trim().toLowerCase();
      const person = (this.teamData || []).find((entry) => String(entry.Name || '').trim().toLowerCase() === normalized);
      if (person?.id) {
        this.openPersonView(person);
        return;
      }
      await this.openNavigationTarget('team');
      this.showInfo(`Opened Team for ${ownerName}`);
    },
  };
}
