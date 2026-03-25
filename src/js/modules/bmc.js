export function createBmcModule() {
  return {
    // BMC (Business Model Canvas)
    bmc: null,
    bmcLoading: false,
    bmcDetailItem: null,
    bmcDetailKey: '',
    bmcSearch: '',
    bmcFilter: 'highlights',
    bmcFocus: '',
    bmcLastRefresh: null,

    async loadBmc() {
      const signal = this.beginRequest('bmc');
      this.bmcLoading = true;
      try {
        const res = await fetch('/api/bmc', { signal });
        if (res.ok) {
          this.bmc = await res.json();
          this.bmcLastRefresh = new Date();
        }
      } catch (err) {
        if (this.isAbortError(err)) return;
        console.error('BMC load error:', err);
      } finally {
        this.endRequest('bmc', signal);
        this.bmcLoading = false;
      }
    },

    getBmcBlockItems(blockKey) {
      if (!this.bmc || !this.bmc.canvas) return [];
      return this.bmc.canvas[blockKey] || [];
    },

    getBmcFilteredItems(blockKey) {
      let items = this.getBmcBlockItems(blockKey);

      if (this.bmcFocus && this.bmcFocus !== blockKey) {
        return [];
      }

      if (this.bmcFilter !== 'all') {
        items = items.filter((item) => this.matchesBmcFilter(blockKey, item));
      }

      if (this.bmcSearch) {
        const query = this.bmcSearch.toLowerCase();
        items = items.filter((item) =>
          Object.values(item || {}).some((value) => String(value || '').toLowerCase().includes(query))
        );
      }

      return items;
    },

    openBmcDetail(blockKey, item) {
      this.bmcDetailKey = blockKey;
      this.bmcDetailItem = item;
    },

    openBmcRelatedItem(related) {
      if (!related) return;
      this.bmcFocus = related.blockKey;
      this.openBmcDetail(related.blockKey, related.item);
    },

    getBmcTopItems(blockKey, limit = null) {
      const defaultLimits = {
        partners: this.bmcFilter === 'highlights' ? 3 : 5,
        hubs: this.bmcFilter === 'highlights' ? 3 : 4,
        flywheels: this.bmcFilter === 'highlights' ? 2 : 3,
        channels: this.bmcFilter === 'highlights' ? 3 : 5,
        segments: this.bmcFilter === 'highlights' ? 3 : 5,
        team: this.bmcFilter === 'highlights' ? 3 : 5,
        business_units: this.bmcFilter === 'highlights' ? 3 : 4,
        cost_structure: this.bmcFilter === 'highlights' ? 4 : 6,
        revenue_streams: this.bmcFilter === 'highlights' ? 4 : 6,
        metrics: this.bmcFilter === 'highlights' ? 4 : 6,
        platforms: this.bmcFilter === 'highlights' ? 4 : 6,
      };
      const itemLimit = limit ?? defaultLimits[blockKey] ?? 4;
      return this.getBmcFilteredItems(blockKey).slice(0, itemLimit);
    },

    matchesBmcFilter(blockKey, item) {
      const status = this.getBmcStatus(blockKey, item).toLowerCase();
      const preview = this.getBmcItemPreview(blockKey, item).toLowerCase();
      const label = this.getBmcItemLabel(blockKey, item).toLowerCase();
      const haystack = `${status} ${preview} ${label}`;

      if (this.bmcFilter === 'risk') {
        return haystack.includes('risk') || haystack.includes('critical') || haystack.includes('kill') || haystack.includes('at risk') || haystack.includes('p0');
      }
      if (this.bmcFilter === 'highlights') {
        return true;
      }
      if (this.bmcFilter === 'validated') {
        return haystack.includes('valid') || haystack.includes('active') || haystack.includes('ready') || haystack.includes('track');
      }
      if (this.bmcFilter === 'owners') {
        return Object.keys(item || {}).some((key) => key.toLowerCase().includes('owner') && item[key]);
      }
      if (this.bmcFilter === 'money') {
        return ['revenue_streams', 'cost_structure', 'metrics', 'business_units'].includes(blockKey);
      }
      return true;
    },

    clearBmcFocus() {
      this.bmcFocus = '';
    },

    getBmcFocusLabel() {
      const map = {
        partners: 'Partners',
        hubs: 'Activities',
        flywheels: 'Value Props',
        channels: 'Channels',
        segments: 'Segments',
        team: 'Resources',
        business_units: 'Business Units',
        cost_structure: 'Costs',
        revenue_streams: 'Revenue',
        metrics: 'Metrics',
        platforms: 'Platforms',
      };
      return map[this.bmcFocus] || '';
    },

    getBmcItemLabel(blockKey, item) {
      const nameFields = {
        partners: ['name', 'partnerName'],
        hubs: ['name', 'hubName'],
        flywheels: ['name', 'flywheelName'],
        channels: ['name', 'channelName'],
        segments: ['name', 'segmentName'],
        team: ['full_name', 'fullName', 'name'],
        business_units: ['name', 'businessUnitName'],
        cost_structure: ['category', 'name'],
        revenue_streams: ['businessUnitId_resolved', 'businessUnitId', 'name'],
        metrics: ['name', 'metricName'],
        platforms: ['name', 'platformName'],
      };
      const fields = nameFields[blockKey] || ['name'];
      for (const field of fields) {
        if (item[field]) return item[field];
      }
      for (const value of Object.values(item)) {
        if (typeof value === 'string' && value.length > 0 && value.length < 60) return value;
      }
      return '(unnamed)';
    },

    getBmcItemPreview(blockKey, item) {
      const previewFields = {
        partners: ['role', 'partnerType', 'status', 'notes'],
        hubs: ['coreCapabilities', 'hubType', 'status', 'primaryBottleneck'],
        flywheels: ['valueProposition', 'customerStruggle', 'customerStruggleSolved', 'motionSequence'],
        channels: ['channelType', 'platformName', 'motionType', 'status'],
        segments: ['behavioralTruth', 'customerProfile', 'validationStatus', 'status'],
        team: ['role', 'ownerRole', 'status'],
        business_units: ['coreOffering', 'offeringDescription', 'status'],
        cost_structure: ['costType', 'currentCostMonthly', 'status'],
        revenue_streams: ['revenueModel', 'currentRevenueAnnual', 'targetRevenueMar2026', 'status'],
        metrics: ['currentValue', 'targetValue', 'status'],
        platforms: ['platformType', 'category', 'status'],
      };

      const fields = previewFields[blockKey] || [];
      for (const field of fields) {
        if (item[field]) return String(item[field]);
      }

      for (const [key, value] of Object.entries(item || {})) {
        if (key === 'rowIndex') continue;
        if (typeof value === 'string' && value && value !== this.getBmcItemLabel(blockKey, item)) {
          return value;
        }
      }

      return '';
    },

    getBmcStatus(blockKey, item) {
      const fields = ['status', 'validationStatus', 'riskLevel', 'criticalityLevel', 'priority', 'category'];
      for (const field of fields) {
        if (item[field]) return String(item[field]);
      }
      if (blockKey === 'revenue_streams' && item.currentRevenueAnnual) return 'Revenue';
      if (blockKey === 'cost_structure' && item.currentCostMonthly) return 'Cost';
      return '';
    },

    getBmcStatusClass(value = '') {
      const text = String(value).toLowerCase();
      if (!text) return '';
      if (text.includes('risk') || text.includes('critical') || text.includes('kill') || text.includes('high') || text.includes('p0')) {
        return 'danger';
      }
      if (text.includes('valid') || text.includes('active') || text.includes('ready') || text.includes('track')) {
        return 'success';
      }
      if (text.includes('emerging') || text.includes('warning') || text.includes('medium') || text.includes('at risk')) {
        return 'warning';
      }
      return 'neutral';
    },

    getBmcSectionSummary(blockKey) {
      const items = this.getBmcBlockItems(blockKey);
      if (!items.length) return 'No connected records yet.';

      const summaries = {
        partners: 'External leverage, distribution, and operational dependencies.',
        hubs: 'The operating capabilities that make delivery possible.',
        flywheels: 'The compounding motions that turn demand into durable advantage.',
        channels: 'How the business reaches customers and drives activation.',
        segments: 'Who the business serves and what each segment needs.',
        team: 'The people and roles that currently carry the model.',
        business_units: 'Commercial engines that package the offer into revenue.',
        cost_structure: 'The major cost centres and operating commitments.',
        revenue_streams: 'Where money comes from and what growth depends on.',
        metrics: 'The measures that tell you whether the model is working.',
        platforms: 'Owned and external surfaces that power experience and distribution.',
      };

      return summaries[blockKey] || `${items.length} connected items in this section.`;
    },

    getBmcHeroMetrics() {
      const stats = this.bmc?.stats || {};
      const totalSegments = stats.totalSegments ?? this.getBmcBlockItems('segments').length;
      const totalBus = stats.totalBusinessUnits ?? this.getBmcBlockItems('business_units').length;
      const totalRev = stats.totalRevenueStreams ?? this.getBmcBlockItems('revenue_streams').length;
      const totalPartners = stats.totalPartners ?? this.getBmcBlockItems('partners').length;

      return [
        { label: 'Segments', value: totalSegments, note: 'active market frames' },
        { label: 'Business Units', value: totalBus, note: 'commercial engines' },
        { label: 'Revenue Streams', value: totalRev, note: 'ways the model earns' },
        { label: 'Partners', value: totalPartners, note: 'external dependencies' },
      ];
    },

    getBmcRefreshLabel() {
      if (!this.bmcLastRefresh) return '';
      return `Updated ${this.formatRelativeTime(this.bmcLastRefresh)}`;
    },

    getBmcAreaStatus() {
      const blocks = ['segments', 'flywheels', 'revenue_streams', 'cost_structure', 'partners', 'business_units'];
      const riskyCount = blocks.reduce((count, blockKey) => {
        return count + this.getBmcBlockItems(blockKey).filter((item) => this.getBmcStatusClass(this.getBmcStatus(blockKey, item)) === 'danger').length;
      }, 0);

      if (riskyCount >= 4) return { tone: 'critical', label: 'Needs Strategic Attention' };
      if (riskyCount >= 1) return { tone: 'warning', label: 'Mixed Signals' };
      return { tone: 'healthy', label: 'Strategically Coherent' };
    },

    getBmcPriorityCards() {
      const riskySegments = this.getBmcBlockItems('segments')
        .filter((item) => this.getBmcStatusClass(this.getBmcStatus('segments', item)) === 'danger')
        .slice(0, 3)
        .map((item) => ({
          name: this.getBmcItemLabel('segments', item),
          meta: this.getBmcStatus('segments', item) || this.getBmcItemPreview('segments', item),
        }));

      const riskyRevenue = this.getBmcBlockItems('revenue_streams')
        .filter((item) => this.getBmcStatusClass(this.getBmcStatus('revenue_streams', item)) !== 'success')
        .slice(0, 3)
        .map((item) => ({
          name: this.getBmcItemLabel('revenue_streams', item),
          meta: this.getBmcStatus('revenue_streams', item) || this.getBmcItemPreview('revenue_streams', item),
        }));

      const coreFlywheels = this.getBmcTopItems('flywheels', 3).map((item) => ({
        name: this.getBmcItemLabel('flywheels', item),
        meta: this.getBmcItemPreview('flywheels', item) || this.getBmcStatus('flywheels', item),
      }));

      return [
        {
          id: 'segments',
          title: 'Segment Risk',
          label: 'Customer segments showing validation or positioning risk.',
          value: String(riskySegments.length),
          tone: riskySegments.length >= 2 ? 'critical' : riskySegments.length === 1 ? 'warning' : 'healthy',
          items: riskySegments.length ? riskySegments : [{ name: 'No critical segment signals', meta: 'Current segment set looks stable.' }],
        },
        {
          id: 'revenue',
          title: 'Revenue Pressure',
          label: 'Revenue streams that need review or clearer validation.',
          value: String(riskyRevenue.length),
          tone: riskyRevenue.length >= 2 ? 'warning' : 'healthy',
          items: riskyRevenue.length ? riskyRevenue : [{ name: 'Revenue model signals healthy', meta: 'No major stream flagged right now.' }],
        },
        {
          id: 'flywheels',
          title: 'Core Flywheels',
          label: 'The motions currently anchoring the business model.',
          value: String(coreFlywheels.length),
          tone: 'healthy',
          items: coreFlywheels.length ? coreFlywheels : [{ name: 'No flywheels loaded', meta: 'Connect the BMC source to populate this view.' }],
        },
      ];
    },

    getBmcFocusList() {
      const primaryFlywheel = this.getBmcSpotlight('flywheels');
      const leadSegment = this.getBmcSpotlight('segments');
      const revenueItem = this.getBmcBlockItems('revenue_streams')[0];

      return [
        primaryFlywheel && {
          title: `Refine ${primaryFlywheel.title}`,
          detail: primaryFlywheel.status || primaryFlywheel.preview || 'Review the primary value proposition motion.',
          action: () => { this.bmcFocus = 'flywheels'; },
          tone: this.getBmcStatusClass(primaryFlywheel.status) === 'danger' ? 'critical' : 'healthy',
        },
        leadSegment && {
          title: `Validate ${leadSegment.title}`,
          detail: leadSegment.status || leadSegment.preview || 'Check segment truth, validation, and messaging fit.',
          action: () => { this.bmcFocus = 'segments'; },
          tone: this.getBmcStatusClass(leadSegment.status) === 'danger' ? 'warning' : 'healthy',
        },
        revenueItem && {
          title: `Inspect ${this.getBmcItemLabel('revenue_streams', revenueItem)}`,
          detail: this.getBmcStatus('revenue_streams', revenueItem) || this.getBmcItemPreview('revenue_streams', revenueItem),
          action: () => { this.bmcFocus = 'revenue_streams'; },
          tone: this.getBmcStatusClass(this.getBmcStatus('revenue_streams', revenueItem)) === 'danger' ? 'critical' : 'warning',
        },
      ].filter(Boolean);
    },

    getBmcSpotlight(blockKey) {
      const item = this.getBmcBlockItems(blockKey)[0];
      if (!item) return null;
      return {
        title: this.getBmcItemLabel(blockKey, item),
        preview: this.getBmcItemPreview(blockKey, item),
        status: this.getBmcStatus(blockKey, item),
      };
    },

    getBmcDetailTitle() {
      if (!this.bmcDetailItem) return '';
      return this.getBmcItemLabel(this.bmcDetailKey, this.bmcDetailItem);
    },

    getBmcMetaLines(blockKey, item) {
      const pairsByBlock = {
        partners: [
          ['Type', item.partnerType],
          ['Role', item.role],
          ['Risk', item.riskLevel],
        ],
        hubs: [
          ['Type', item.hubType],
          ['Owner', item.ownerPersonName || item.ownerPerson || item.owner_hub_id],
          ['Bottleneck', item.primaryBottleneck],
        ],
        flywheels: [
          ['Motion', item.motionSequence || item.motion],
          ['Owner', item.ownerPersonName || item.ownerPerson],
          ['Metric', item.efficiencyMetrics || item.conversionRatePct],
        ],
        channels: [
          ['Type', item.channelType],
          ['Platform', item.platformName],
          ['Motion', item.motionType],
        ],
        segments: [
          ['Owner', item.ownerPersonName || item.owner_person_name],
          ['Business Unit', item.businessUnitId_resolved || item.bu_name],
          ['Flywheel', item.servesFlywheels || item.served_by_flywheels_ids],
        ],
        team: [
          ['Role', item.role],
          ['Hub', item.hubId_resolved || item.owner_hub_id],
          ['Business Unit', item.businessUnitId_resolved || item.business_unit_id],
        ],
        business_units: [
          ['Owner', item.ownerPersonName || item.owner_rollup_name],
          ['Flywheel', item.primaryFlywheelId_resolved || item.primaryFlywheelName || item.primary_flywheel_name],
          ['AOV', item.validatedAov || item.avgOrderValue],
        ],
        cost_structure: [
          ['Type', item.costType],
          ['Monthly', item.currentCostMonthly || item.monthlyAmount],
          ['Owner', item.ownerPersonId_resolved || item.ownerPerson],
        ],
        revenue_streams: [
          ['Model', item.revenueModel],
          ['Current', item.currentRevenueAnnual || item.nineMonthRevenue],
          ['Target', item.targetRevenueMar2026],
        ],
        metrics: [
          ['Current', item.currentValue],
          ['Target', item.targetValue || item.target],
          ['Owner', item.ownerPersonId_resolved || item.ownerPerson],
        ],
        platforms: [
          ['Type', item.platformType],
          ['Category', item.category],
          ['Owner', item.ownerUserId_resolved || item.owner_User_id || item.ownerPerson],
        ],
      };

      return (pairsByBlock[blockKey] || [])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .slice(0, 3)
        .map(([label, value]) => ({ label, value: String(value) }));
    },

    getBmcSectionName(blockKey) {
      const map = {
        partners: 'Partners',
        hubs: 'Activities',
        flywheels: 'Value Propositions',
        channels: 'Channels',
        segments: 'Customer Segments',
        team: 'Resources',
        business_units: 'Business Units',
        cost_structure: 'Cost Structure',
        revenue_streams: 'Revenue Streams',
        metrics: 'Key Metrics',
        platforms: 'Platforms',
      };
      return map[blockKey] || blockKey;
    },

    normalizeBmcToken(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/[^\w\s/&]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },

    splitBmcReferenceValues(value) {
      if (value === undefined || value === null || value === '') return [];
      const raw = Array.isArray(value) ? value : [value];
      return raw
        .flatMap((entry) => String(entry).split(/[|,;/]+/))
        .map((entry) => entry.trim())
        .filter(Boolean);
    },

    findBmcRelatedByNames(blockKey, names = []) {
      if (!blockKey || !names.length) return [];
      const needles = names.map((name) => this.normalizeBmcToken(name)).filter(Boolean);
      if (!needles.length) return [];

      return this.getBmcBlockItems(blockKey).filter((candidate) => {
        const label = this.normalizeBmcToken(this.getBmcItemLabel(blockKey, candidate));
        return needles.some((needle) => label === needle || label.includes(needle) || needle.includes(label));
      });
    },

    getBmcRelatedItems() {
      if (!this.bmcDetailItem || !this.bmcDetailKey) return [];

      const item = this.bmcDetailItem;
      const relationConfig = {
        partners: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name, item.business_unit_id]],
          ['channels', [item.channelName, item.channel_name]],
        ],
        hubs: [
          ['team', [item.ownerPersonName, item.ownerPerson]],
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
        ],
        flywheels: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
          ['segments', [item.segmentName, item.customerSegmentName, item.servedSegments]],
          ['team', [item.ownerPersonName, item.ownerPerson]],
        ],
        channels: [
          ['platforms', [item.platformName, item.platform_name]],
          ['segments', [item.segmentName, item.customerSegmentName]],
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
        ],
        segments: [
          ['business_units', [item.businessUnitId_resolved, item.bu_name]],
          ['flywheels', [item.servesFlywheels, item.served_by_flywheels_ids, item.primaryFlywheelId_resolved]],
          ['team', [item.ownerPersonName, item.owner_person_name]],
        ],
        team: [
          ['hubs', [item.hubId_resolved, item.owner_hub_id]],
          ['business_units', [item.businessUnitId_resolved, item.business_unit_id]],
        ],
        business_units: [
          ['flywheels', [item.primaryFlywheelId_resolved, item.primaryFlywheelName, item.primary_flywheel_name]],
          ['segments', [item.primarySegmentName, item.segmentName]],
          ['team', [item.ownerPersonName, item.owner_rollup_name]],
          ['revenue_streams', [item.name, item.businessUnitName]],
        ],
        cost_structure: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
          ['team', [item.ownerPersonId_resolved, item.ownerPerson]],
        ],
        revenue_streams: [
          ['business_units', [item.businessUnitId_resolved, item.businessUnitId]],
          ['platforms', [item.platformName]],
          ['team', [item.ownerPersonId_resolved, item.ownerPerson]],
        ],
        metrics: [
          ['business_units', [item.businessUnitId_resolved, item.business_unit_name]],
          ['flywheels', [item.flywheelName, item.flywheel_id_resolved]],
          ['team', [item.ownerPersonId_resolved, item.ownerPerson]],
        ],
        platforms: [
          ['channels', [item.name, item.platformName]],
          ['team', [item.ownerUserId_resolved, item.owner_User_id, item.ownerPerson]],
        ],
      };

      const seen = new Set();
      const related = [];

      for (const [blockKey, rawNames] of relationConfig[this.bmcDetailKey] || []) {
        const names = rawNames.flatMap((value) => this.splitBmcReferenceValues(value));
        for (const candidate of this.findBmcRelatedByNames(blockKey, names)) {
          if (candidate === item && blockKey === this.bmcDetailKey) continue;
          const name = this.getBmcItemLabel(blockKey, candidate);
          const key = `${blockKey}:${this.normalizeBmcToken(name)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          related.push({
            blockKey,
            section: this.getBmcSectionName(blockKey),
            name,
            status: this.getBmcStatus(blockKey, candidate),
            item: candidate,
          });
        }
      }

      return related.slice(0, 8);
    },
  };
}
