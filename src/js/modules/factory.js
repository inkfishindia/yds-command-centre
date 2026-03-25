const FALLBACK_FACTORY_DATA = {
  machines: [
    { id: 'DTG-B1', name: 'Brother DTG #1', type: 'DTG', zone: 'DTG', brand: 'Brother', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-B2', name: 'Brother DTG #2', type: 'DTG', zone: 'DTG', brand: 'Brother', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-B3', name: 'Brother DTG #3', type: 'DTG', zone: 'DTG', brand: 'Brother', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 50, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-E1', name: 'Epson DTG #1', type: 'DTG', zone: 'DTG', brand: 'Epson', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 55, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTG-E2', name: 'Epson DTG #2', type: 'DTG', zone: 'DTG', brand: 'Epson', theoretical_pcs_per_hour: 7.5, cycle_time_minutes: 8, cycle_time_light: 5, cycle_time_dark: 10, mandatory_maintenance_min: 55, avg_changeover_min: 25, depends_on: ['CURER-01'], is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'CURER-01', name: 'MAX Curer', type: 'CURER', zone: 'DTG', brand: 'MAX', theoretical_pcs_per_hour: 20, cycle_time_minutes: 3, mandatory_maintenance_min: 0, avg_changeover_min: 0, is_shared: false, is_sub_bottleneck: true, status: 'ACTIVE' },
    { id: 'PRETREAT-01', name: 'Pretreatment Machine', type: 'PRETREAT', zone: 'DTG', brand: 'Unknown', theoretical_pcs_per_hour: 30, cycle_time_minutes: 2, mandatory_maintenance_min: 10, avg_changeover_min: 0, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'DTF-01', name: 'Custom DTF Printer', type: 'DTF', zone: 'DTF', brand: 'Custom', theoretical_pcs_per_hour: 10, cycle_time_minutes: 6, mandatory_maintenance_min: 30, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SUB-E1', name: 'Epson Sublimation Printer', type: 'SUBLIMATION', zone: 'SUB', brand: 'Epson', theoretical_pcs_per_hour: 8, cycle_time_minutes: 8, mandatory_maintenance_min: 15, avg_changeover_min: 15, is_shared: false, is_sub_bottleneck: true, status: 'ACTIVE' },
    { id: 'SUB-MUG12', name: '12-Mug Vacuum Press', type: 'HEAT_PRESS', zone: 'SUB', brand: 'Unknown', theoretical_pcs_per_hour: 72, cycle_time_minutes: 10, mandatory_maintenance_min: 5, avg_changeover_min: 5, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'VNL-01', name: 'Roland Print-and-Cut', type: 'VINYL', zone: 'VNL', brand: 'Roland', theoretical_pcs_per_hour: 6, cycle_time_minutes: 10, mandatory_maintenance_min: 10, avg_changeover_min: 15, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'EMB-T1', name: 'Tajima Embroidery #1', type: 'EMBROIDERY', zone: 'EMB', brand: 'Tajima', theoretical_pcs_per_hour: 4, cycle_time_minutes: 15, mandatory_maintenance_min: 15, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'EMB-T2', name: 'Tajima Embroidery #2', type: 'EMBROIDERY', zone: 'EMB', brand: 'Tajima', theoretical_pcs_per_hour: 4, cycle_time_minutes: 15, mandatory_maintenance_min: 15, avg_changeover_min: 20, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-01', name: 'Single-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 20, cycle_time_minutes: 3, mandatory_maintenance_min: 0, avg_changeover_min: 60, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-06', name: '6-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 50, cycle_time_minutes: 1.2, mandatory_maintenance_min: 0, avg_changeover_min: 45, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-08', name: '8-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 75, cycle_time_minutes: 0.8, mandatory_maintenance_min: 0, avg_changeover_min: 45, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'SCR-12', name: '12-Head Screen Press', type: 'SCREEN_PRINT', zone: 'SCR', brand: 'Unknown', theoretical_pcs_per_hour: 100, cycle_time_minutes: 0.6, mandatory_maintenance_min: 0, avg_changeover_min: 60, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'LASER-01', name: 'Laser Engraver', type: 'LASER', zone: 'LASER', brand: 'Unknown', theoretical_pcs_per_hour: 12, cycle_time_minutes: 5, mandatory_maintenance_min: 10, avg_changeover_min: 10, is_shared: false, is_sub_bottleneck: false, status: 'ACTIVE' },
    { id: 'FUSE-01', name: 'Flat Fusing Press #1', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
    { id: 'FUSE-02', name: 'Flat Fusing Press #2', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
    { id: 'FUSE-03', name: 'Flat Fusing Press #3', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
    { id: 'FUSE-04', name: 'Flat Fusing Press #4', type: 'HEAT_PRESS', zone: 'FUSING', brand: 'Unknown', is_shared: true, shared_with: ['DTG', 'DTF', 'SUB'], theoretical_pcs_per_hour: 15, cycle_time_minutes: 4, mandatory_maintenance_min: 0, avg_changeover_min: 0, status: 'ACTIVE' },
  ],
  zones: [
    { id: 'DTG', name: 'DTG Bay', method: 'Direct-to-Garment', operators: 2 },
    { id: 'DTF', name: 'DTF Bay', method: 'Direct-to-Film', operators: 1 },
    { id: 'SUB', name: 'Sublimation Bay', method: 'Sublimation', operators: 1 },
    { id: 'VNL', name: 'Vinyl Bay', method: 'Vinyl Print & Cut', operators: 1 },
    { id: 'EMB', name: 'Embroidery Bay', method: 'Embroidery', operators: 1 },
    { id: 'SCR', name: 'Screen Print Bay', method: 'Screen Printing', operators: 2 },
    { id: 'LASER', name: 'Laser Bay', method: 'Laser Engraving', operators: 1 },
    { id: 'QC_PACK', name: 'QC + Packing', method: 'Quality Control & Packing', operators: 2 },
  ],
  orderMix: { DTG: 0.55, DTF: 0.15, SUB: 0.10, EMB: 0.10, VNL: 0.05, SCR: 0.05 },
  assumptions: {
    shift_hours: 8,
    orders_per_day: 40,
    avg_pieces_per_order: 3.5,
    efficiency_factor: 0.70,
    qc_combined_minutes_per_piece: 7,
    qc_efficiency: 0.74,
    qc_separated: false,
  },
};

export function createFactoryModule() {
  return {
    // Factory capacity
    factoryZoneDetail: null,
    factorySimOpen: false,
    factorySimConfig: null,
    factorySimPreset: 'current',
    _factoryBaseCache: null,
    factoryConfig: null,
    factoryConfigLoading: false,
    factoryEditingMachine: null,
    factoryEditingZone: null,
    factoryShowFormulas: false,
    factoryMachineEdits: {},
    factoryZoneEdits: {},
    factoryOperatingEdits: {},
    factoryEditingOperating: false,
    factoryError: null,
    factoryLastRefresh: null,
    factorySavedView: 'constraints',

    getFactoryData() {
      if (this.factoryConfig) {
        const cfg = this.factoryConfig;
        return {
          machines: cfg.machines || [],
          zones: cfg.zones || [],
          orderMix: cfg.order_mix || {},
          assumptions: cfg.operating || {},
        };
      }
      return FALLBACK_FACTORY_DATA;
    },

    calculateFactoryCapacity(simConfig = null) {
      const { machines: rawMachines, zones: rawZones, orderMix: rawOrderMix, assumptions } = this.getFactoryData();
      const cfg = simConfig || {
        orders_per_day: assumptions.orders_per_day,
        avg_pieces_per_order: assumptions.avg_pieces_per_order,
        method_split: { ...rawOrderMix },
        efficiency: assumptions.efficiency_factor,
        qc_operators: rawZones.find(z => z.id === 'QC_PACK').operators,
        qc_separated: assumptions.qc_separated,
        machine_overrides: {},
        curer_stagger: false,
        dtf_parallel: false,
        gang_cutting: false,
        shifts: 1,
        second_shift_efficiency: 0.85,
      };

      const machines = rawMachines.map(machine => {
        const enabled = cfg.machine_overrides[machine.id] !== false;
        let tph = machine.theoretical_pcs_per_hour;
        if (machine.id === 'CURER-01' && cfg.curer_stagger) tph *= 1.3;
        if (machine.id === 'DTF-01' && cfg.dtf_parallel) tph *= 1.4;
        if (machine.id === 'VNL-01' && cfg.gang_cutting) tph *= 2.0;
        return { ...machine, theoretical_pcs_per_hour: tph, _enabled: enabled };
      });

      const zones = rawZones.map(zone => {
        if (zone.id === 'QC_PACK') return { ...zone, operators: cfg.qc_operators };
        return zone;
      });

      const orderMix = cfg.method_split;
      const shiftHours = assumptions.shift_hours;
      const ordersPerDay = cfg.orders_per_day;
      const avgPiecesPerOrder = cfg.avg_pieces_per_order;
      const efficiencyFactor = cfg.efficiency;
      const shiftMinutes = shiftHours * 60;
      const totalDailyPieces = ordersPerDay * avgPiecesPerOrder;

      const supportMachineTypes = new Set(['CURER', 'PRETREAT']);
      const machineCapacity = {};
      machines.forEach(machine => {
        if (!machine._enabled) {
          machineCapacity[machine.id] = 0;
          return;
        }
        const available = shiftMinutes - machine.mandatory_maintenance_min - machine.avg_changeover_min;
        const eff = supportMachineTypes.has(machine.type) ? 1.0 : efficiencyFactor;
        const realistic = machine.theoretical_pcs_per_hour * (available / 60) * eff;
        machineCapacity[machine.id] = Math.max(0, realistic);
      });

      const supportTypes = new Set(['CURER', 'PRETREAT', 'HEAT_PRESS']);
      const zoneResults = zones.map(zone => {
        if (zone.id === 'QC_PACK') {
          const qcEfficiency = 0.74;
          let capacity;
          if (cfg.qc_separated) {
            const qcStaff = Math.ceil(zone.operators / 2);
            const packStaff = Math.floor(zone.operators / 2);
            const qcCap = qcStaff * (shiftMinutes / 3.5);
            const packCap = packStaff * (shiftMinutes / 3.5);
            capacity = Math.min(qcCap, packCap) * qcEfficiency;
          } else {
            const qcCombinedMinutesPerPiece = 7;
            capacity = zone.operators * (shiftMinutes / qcCombinedMinutesPerPiece) * qcEfficiency;
          }
          const demand = totalDailyPieces;
          const safeCapacity = Math.max(1, Math.round(capacity));
          const load = demand / safeCapacity;
          return {
            ...zone,
            capacity: safeCapacity,
            demand: Math.round(demand),
            load,
            status: this._factoryLoadStatus(load),
            machines: [],
            sub_bottleneck: null,
            is_people_based: true,
          };
        }

        const zoneMachines = machines.filter(machine => machine.zone === zone.id);
        const productionMachines = zoneMachines.filter(machine => !supportTypes.has(machine.type));
        const subBottleneck = zoneMachines.find(machine => machine.is_sub_bottleneck);

        const rawSum = productionMachines.reduce((sum, machine) => sum + machineCapacity[machine.id], 0);
        let effectiveCapacity = rawSum;
        let cappedBy = null;

        if (subBottleneck) {
          const cap = machineCapacity[subBottleneck.id];
          if (cap < rawSum) {
            effectiveCapacity = cap;
            cappedBy = subBottleneck.id;
          }
        }

        const mix = orderMix[zone.id] || 0;
        const demand = totalDailyPieces * mix;
        const safeCapacity = Math.max(1, Math.round(effectiveCapacity));
        const load = demand > 0 ? demand / safeCapacity : 0;

        return {
          ...zone,
          capacity: safeCapacity,
          demand: Math.round(demand),
          load,
          status: this._factoryLoadStatus(load),
          machines: zoneMachines.map(machine => ({
            ...machine,
            realistic_daily: Math.round(machineCapacity[machine.id]),
            _enabled: machine._enabled,
          })),
          sub_bottleneck: cappedBy,
          is_people_based: false,
        };
      });

      if (cfg.shifts === 2) {
        const mult = 1 + cfg.second_shift_efficiency;
        zoneResults.forEach(zone => {
          zone.capacity = Math.round(zone.capacity * mult);
        });
      }

      zoneResults.forEach(zone => {
        zone.load = zone.demand > 0 ? zone.demand / zone.capacity : 0;
        zone.status = this._factoryLoadStatus(zone.load);
      });
      const bindingZone = zoneResults.reduce((max, zone) => (zone.load > max.load ? zone : max), zoneResults[0]);

      const fusingMachines = machines.filter(machine => machine.zone === 'FUSING');
      const fusingTotalCapacity = fusingMachines.reduce((sum, machine) => {
        if (!machine._enabled) return sum;
        const avail = shiftMinutes - machine.mandatory_maintenance_min - machine.avg_changeover_min;
        return sum + machine.theoretical_pcs_per_hour * (avail / 60);
      }, 0);

      const dtgDemand = totalDailyPieces * (orderMix.DTG || 0);
      const dtfDemand = totalDailyPieces * (orderMix.DTF || 0);
      const subDemand = totalDailyPieces * (orderMix.SUB || 0);
      const fusingDemand = (dtgDemand * 0.5) + (dtfDemand * 2) + subDemand;
      const safeFusing = Math.max(1, fusingTotalCapacity);
      const fusingContention = fusingDemand / safeFusing;

      const curerCapacity = machineCapacity['CURER-01'] || 1;
      const curerUtilisation = dtgDemand / curerCapacity;

      const pretreatCapacity = machineCapacity['PRETREAT-01'] || 1;
      const pretreatUtilisation = (dtgDemand * 0.5) / pretreatCapacity;

      const sharedResources = [
        {
          id: 'FUSING',
          name: 'Fusing Bay (4 Presses)',
          capacity: Math.round(fusingTotalCapacity),
          demand: Math.round(fusingDemand),
          contention: fusingContention,
          status: this._factoryLoadStatus(fusingContention),
          note: 'Shared by DTG (dark), DTF (x2), SUB',
        },
        {
          id: 'CURER-01',
          name: 'MAX Curer',
          capacity: Math.round(curerCapacity),
          demand: Math.round(dtgDemand),
          contention: curerUtilisation,
          status: this._factoryLoadStatus(curerUtilisation),
          note: 'Caps entire DTG zone output',
        },
        {
          id: 'PRETREAT-01',
          name: 'Pretreat Machine',
          capacity: Math.round(pretreatCapacity),
          demand: Math.round(dtgDemand * 0.5),
          contention: pretreatUtilisation,
          status: this._factoryLoadStatus(pretreatUtilisation),
          note: 'Used for DTG dark garments only (~50%)',
        },
      ];

      const constraintCascade = zoneResults
        .filter(zone => zone.demand > 0)
        .slice()
        .sort((a, b) => b.load - a.load)
        .map(zone => ({
          ...zone,
          fix: this._constraintFix(zone.id, zone.load),
        }));

      const displayAssumptions = {
        ...assumptions,
        orders_per_day: cfg.orders_per_day,
        avg_pieces_per_order: cfg.avg_pieces_per_order,
        efficiency_factor: cfg.efficiency,
      };

      return {
        zones: zoneResults,
        bindingZone,
        factoryThroughput: Math.min(bindingZone.capacity, totalDailyPieces),
        totalPossible: totalDailyPieces,
        sharedResources,
        constraintCascade,
        assumptions: displayAssumptions,
        total_daily_pieces: totalDailyPieces,
      };
    },

    initFactorySimConfig() {
      const { zones, assumptions } = this.getFactoryData();
      this.factorySimConfig = {
        orders_per_day: assumptions.orders_per_day,
        avg_pieces_per_order: assumptions.avg_pieces_per_order,
        method_split: { DTG: 55, DTF: 15, SUB: 10, EMB: 10, VNL: 5, SCR: 5 },
        efficiency: 70,
        qc_operators: zones.find(z => z.id === 'QC_PACK').operators,
        qc_separated: false,
        machine_overrides: {},
        curer_stagger: false,
        dtf_parallel: false,
        gang_cutting: false,
        shifts: 1,
        second_shift_efficiency: 85,
      };
      this.factorySimPreset = 'current';
    },

    applyFactoryPreset(preset) {
      const base = {
        orders_per_day: 40,
        avg_pieces_per_order: 3.5,
        method_split: { DTG: 55, DTF: 15, SUB: 10, EMB: 10, VNL: 5, SCR: 5 },
        efficiency: 70,
        qc_operators: 2,
        qc_separated: false,
        machine_overrides: {},
        curer_stagger: false,
        dtf_parallel: false,
        gang_cutting: false,
        shifts: 1,
        second_shift_efficiency: 85,
      };
      const presets = {
        current: { ...base },
        qc_fixed: { ...base, qc_operators: 4, qc_separated: true },
        phase3: { ...base, orders_per_day: 70, qc_operators: 4, qc_separated: true, curer_stagger: true },
        growth: { ...base, orders_per_day: 120, efficiency: 75, qc_operators: 6, qc_separated: true, curer_stagger: true, dtf_parallel: true, gang_cutting: true },
        '20cr': { ...base, orders_per_day: 200, efficiency: 75, qc_operators: 8, qc_separated: true, curer_stagger: true, dtf_parallel: true, gang_cutting: true },
        machine_down_dtg: { ...base, machine_overrides: { 'DTG-B1': false } },
        machine_down_dtf: { ...base, machine_overrides: { 'DTF-01': false } },
        qc_absent: { ...base, qc_operators: 1 },
        monsoon: { ...base, efficiency: 60 },
        second_shift: { ...base, shifts: 2, second_shift_efficiency: 85 },
      };
      if (presets[preset]) {
        this.factorySimConfig = { ...presets[preset] };
        this.factorySimPreset = preset;
      }
    },

    getSimulatedCapacity() {
      if (!this.factorySimConfig) return this.calculateFactoryCapacity();
      const cfg = this.factorySimConfig;
      return this.calculateFactoryCapacity({
        orders_per_day: cfg.orders_per_day,
        avg_pieces_per_order: cfg.avg_pieces_per_order,
        method_split: Object.fromEntries(Object.entries(cfg.method_split).map(([k, v]) => [k, v / 100])),
        efficiency: cfg.efficiency / 100,
        qc_operators: cfg.qc_operators,
        qc_separated: cfg.qc_separated,
        machine_overrides: cfg.machine_overrides,
        curer_stagger: cfg.curer_stagger,
        dtf_parallel: cfg.dtf_parallel,
        gang_cutting: cfg.gang_cutting,
        shifts: cfg.shifts,
        second_shift_efficiency: cfg.second_shift_efficiency / 100,
      });
    },

    simMethodSplitTotal() {
      if (!this.factorySimConfig) return 100;
      const split = this.factorySimConfig.method_split;
      return (split.DTG || 0) + (split.DTF || 0) + (split.SUB || 0) + (split.EMB || 0) + (split.VNL || 0) + (split.SCR || 0);
    },

    toggleFactorySim() {
      if (!this.factorySimOpen) {
        if (!this.factorySimConfig) this.initFactorySimConfig();
        this.factorySimOpen = true;
      } else {
        this.factorySimOpen = false;
      }
    },

    closeFactorySim() {
      this.factorySimOpen = false;
    },

    getFactoryCap() {
      return this.getSimulatedCapacity();
    },

    getFactoryBaseCap() {
      if (!this._factoryBaseCache) this._factoryBaseCache = this.calculateFactoryCapacity();
      return this._factoryBaseCache;
    },

    getFactoryRefreshLabel() {
      if (!this.factoryLastRefresh) return '';
      return `Updated ${this.formatRelativeTime(this.factoryLastRefresh)}`;
    },

    getFactoryAreaStatus() {
      const cap = this.getFactoryCap();
      const bindingLoad = Number(cap?.bindingZone?.load || 0);
      const constrainedCount = (cap?.constraintCascade || []).filter(zone => zone.load >= 1).length;
      const atRiskCount = (cap?.constraintCascade || []).filter(zone => zone.load >= 0.85).length;

      if (bindingLoad >= 1 || constrainedCount > 0) {
        return { tone: 'critical', label: 'Constrained' };
      }
      if (bindingLoad >= 0.85 || atRiskCount > 1) {
        return { tone: 'warning', label: 'At Risk' };
      }
      return { tone: 'healthy', label: 'Stable' };
    },

    getFactoryHeroMetrics() {
      const cap = this.getFactoryCap();
      const totalCapacity = (cap?.zones || []).reduce((sum, zone) => sum + (Number(zone.capacity) || 0), 0);
      const constrainedZones = (cap?.constraintCascade || []).filter(zone => zone.load >= 1).length;
      const sharedHotspots = (cap?.sharedResources || []).filter(resource => resource.contention >= 0.85).length;
      return [
        {
          id: 'throughput',
          label: 'Factory Throughput',
          value: `${Math.round(cap?.factoryThroughput || 0)} pcs/day`,
          note: `${Math.round(cap?.total_daily_pieces || 0)} pcs/day current demand`,
        },
        {
          id: 'constraint',
          label: 'Binding Constraint',
          value: cap?.bindingZone?.name || 'No constraint',
          note: `${Math.round((Number(cap?.bindingZone?.load || 0)) * 100)}% loaded`,
        },
        {
          id: 'zone-health',
          label: 'Constrained Zones',
          value: String(constrainedZones),
          note: `${(cap?.constraintCascade || []).length} production zones in model`,
        },
        {
          id: 'shared-resources',
          label: 'Shared Hotspots',
          value: String(sharedHotspots),
          note: `${Math.round(totalCapacity)} pcs/day modeled zone capacity`,
        },
      ];
    },

    getFactoryMetricAction(metricId) {
      const actions = {
        throughput: () => this.applyFactorySavedView('constraints'),
        constraint: () => this.applyFactorySavedView('constraints'),
        'zone-health': () => this.applyFactorySavedView('shared'),
        'shared-resources': () => this.applyFactorySavedView('shared'),
      };
      return actions[metricId] || (() => {});
    },

    getFactoryPriorityCards() {
      const cap = this.getFactoryCap();
      const constraintCascade = cap?.constraintCascade || [];
      const sharedResources = cap?.sharedResources || [];
      const assumptions = cap?.assumptions || {};
      const topConstraints = constraintCascade.slice(0, 3);
      const sharedHotspots = sharedResources.slice().sort((a, b) => b.contention - a.contention).slice(0, 3);
      const operatorZones = (cap?.zones || []).filter(zone => zone.is_people_based || zone.id === 'QC_PACK');

      return [
        {
          id: 'constraints',
          title: 'Constraint Cascade',
          label: 'Where the line is most likely to break first.',
          value: topConstraints[0] ? `${Math.round(topConstraints[0].load * 100)}%` : '0%',
          tone: topConstraints[0]?.load >= 1 ? 'critical' : topConstraints[0]?.load >= 0.85 ? 'warning' : 'healthy',
          items: topConstraints.map(zone => ({
            name: zone.name,
            meta: `${Math.round(zone.capacity)} cap / ${Math.round(zone.demand)} demand`,
          })),
        },
        {
          id: 'shared',
          title: 'Shared Resources',
          label: 'Monitor contention across bottleneck equipment.',
          value: sharedHotspots[0] ? `${Math.round(sharedHotspots[0].contention * 100)}%` : '0%',
          tone: sharedHotspots[0]?.contention >= 1 ? 'critical' : sharedHotspots[0]?.contention >= 0.85 ? 'warning' : 'healthy',
          items: sharedHotspots.map(resource => ({
            name: resource.name,
            meta: `${Math.round(resource.demand)} demand / ${Math.round(resource.capacity)} cap`,
          })),
        },
        {
          id: 'operating-model',
          title: 'Operating Model',
          label: 'Current assumptions driving the factory plan.',
          value: `${assumptions.orders_per_day || 0} orders`,
          tone: 'healthy',
          items: [
            { name: 'Avg pieces / order', meta: `${assumptions.avg_pieces_per_order || 0}` },
            { name: 'Shift hours', meta: `${assumptions.shift_hours || 0} hrs` },
            { name: 'People-based zones', meta: `${operatorZones.length} zones` },
          ],
        },
      ];
    },

    getFactoryFocusList() {
      const cap = this.getFactoryCap();
      const topConstraint = cap?.constraintCascade?.[0];
      const topShared = (cap?.sharedResources || []).slice().sort((a, b) => b.contention - a.contention)[0];
      const qcZone = (cap?.zones || []).find(zone => zone.id === 'QC_PACK');

      return [
        topConstraint && {
          title: `Relieve ${topConstraint.name}`,
          detail: topConstraint.fix || `${Math.round(topConstraint.load * 100)}% loaded against demand.`,
          action: () => {
            this.factoryZoneDetail = topConstraint.id;
            this.factorySimOpen = false;
            this.factoryShowFormulas = false;
          },
          tone: topConstraint.load >= 1 ? 'critical' : 'warning',
        },
        topShared && {
          title: `Inspect ${topShared.name}`,
          detail: `${Math.round(topShared.contention * 100)}% contention. ${topShared.note}`,
          action: () => {
            this.factorySimOpen = false;
            this.factoryShowFormulas = true;
          },
          tone: topShared.contention >= 1 ? 'critical' : 'warning',
        },
        qcZone && {
          title: 'Stress test the next shift',
          detail: `QC + Packing is ${Math.round(qcZone.load * 100)}% loaded. Run a quick scenario before changing staffing.`,
          action: () => {
            if (!this.factorySimConfig) this.initFactorySimConfig();
            this.factorySimOpen = true;
            this.factoryShowFormulas = false;
          },
          tone: qcZone.load >= 0.85 ? 'warning' : 'healthy',
        },
      ].filter(Boolean);
    },

    getFactorySavedViews() {
      return [
        { id: 'constraints', label: 'Constraint Cascade' },
        { id: 'shared', label: 'Shared Resources' },
        { id: 'people', label: 'People Zones' },
        { id: 'sim', label: 'Scenario Compare' },
      ];
    },

    applyFactorySavedView(viewId) {
      this.factorySavedView = viewId;
      if (viewId === 'sim') {
        if (!this.factorySimConfig) this.initFactorySimConfig();
        this.factorySimOpen = true;
        this.factoryShowFormulas = false;
        return;
      }
      this.factorySimOpen = false;
      this.factoryShowFormulas = viewId === 'shared';
    },

    getFactorySavedViewItems() {
      const cap = this.getFactoryCap();
      if (this.factorySavedView === 'shared') {
        return (cap?.sharedResources || []).slice(0, 5).map((resource) => ({
          title: resource.name,
          detail: `${Math.round(resource.contention * 100)}% contention`,
          action: () => {
            this.factoryShowFormulas = true;
            this.factorySimOpen = false;
          },
        }));
      }
      if (this.factorySavedView === 'people') {
        return (cap?.zones || [])
          .filter((zone) => zone.is_people_based || zone.id === 'QC_PACK')
          .slice(0, 5)
          .map((zone) => ({
            title: zone.name,
            detail: `${zone.operators} operators · ${Math.round(zone.load * 100)}% load`,
            action: () => {
              this.factoryZoneDetail = zone.id;
              this.factorySimOpen = false;
              this.factoryShowFormulas = false;
            },
          }));
      }
      if (this.factorySavedView === 'sim') {
        const compare = this.getFactoryScenarioCompare();
        return compare.items;
      }
      return (cap?.constraintCascade || []).slice(0, 5).map((zone) => ({
        title: zone.name,
        detail: `${Math.round(zone.load * 100)}% load · ${zone.fix || 'Monitor load'}`,
        action: () => {
          this.factoryZoneDetail = zone.id;
          this.factorySimOpen = false;
          this.factoryShowFormulas = false;
        },
      }));
    },

    getFactorySavedViewEmptyState() {
      const labels = {
        constraints: 'No constraints found right now.',
        shared: 'No shared-resource pressure right now.',
        people: 'No people-based zones found.',
        sim: 'Open the simulator to compare scenarios.',
      };
      return labels[this.factorySavedView] || 'No items available.';
    },

    applyFactoryQuickPreset(preset) {
      if (!this.factorySimConfig) this.initFactorySimConfig();
      this.applyFactoryPreset(preset);
      this.factorySimOpen = true;
      this.factoryShowFormulas = false;
      this.factorySavedView = 'sim';
    },

    focusFactoryZone(zoneId) {
      if (!zoneId) return;
      this.factoryZoneDetail = zoneId;
      this.factorySimOpen = false;
      this.factoryShowFormulas = false;
    },

    getFactoryScenarioCompare() {
      const current = this.getFactoryBaseCap();
      const simulated = this.getFactoryCap();
      const throughputDelta = Math.round((simulated?.factoryThroughput || 0) - (current?.factoryThroughput || 0));
      const bindingChanged = (simulated?.bindingZone?.id || '') !== (current?.bindingZone?.id || '');
      const currentShared = (current?.sharedResources || []).slice().sort((a, b) => b.contention - a.contention)[0];
      const simulatedShared = (simulated?.sharedResources || []).slice().sort((a, b) => b.contention - a.contention)[0];

      return {
        throughputDelta,
        bindingChanged,
        currentConstraint: current?.bindingZone?.name || '—',
        simulatedConstraint: simulated?.bindingZone?.name || '—',
        items: [
          {
            title: 'Throughput change',
            detail: `${throughputDelta >= 0 ? '+' : ''}${throughputDelta} pcs/day vs current`,
            action: () => {
              if (!this.factorySimConfig) this.initFactorySimConfig();
              this.factorySimOpen = true;
            },
          },
          {
            title: 'Binding constraint',
            detail: `${current?.bindingZone?.name || '—'} -> ${simulated?.bindingZone?.name || '—'}`,
            action: () => {
              this.factoryZoneDetail = simulated?.bindingZone?.id || current?.bindingZone?.id || null;
            },
          },
          {
            title: 'Hottest shared resource',
            detail: `${currentShared?.name || '—'} -> ${simulatedShared?.name || '—'}`,
            action: () => {
              this.factoryShowFormulas = true;
              this.factorySimOpen = false;
            },
          },
        ],
      };
    },

    factoryBarWidth(load) {
      return Math.min(load * 100, 100).toFixed(1) + '%';
    },

    factoryBarLabel(load) {
      return Math.round(load * 100) + '%';
    },

    _factoryLoadStatus(load) {
      if (load >= 1.0) return 'OVER';
      if (load >= 0.85) return 'AT_RISK';
      if (load >= 0.70) return 'APPROACHING';
      return 'OK';
    },

    _constraintFix(zoneId) {
      const fixes = {
        QC_PACK: 'Add 2 staff, separate QC and packing stations - unlocks full 140 pcs/day throughput',
        DTG: 'Implement stagger-loading protocol on MAX Curer (+30% throughput)',
        EMB: 'Add a third Tajima head or run split shifts - EMB is 56% loaded',
        DTF: 'DTF is within safe range; monitor if mix shifts above 20%',
        SUB: 'Sublimation is within safe range; printer is the limit, not the press',
        VNL: 'Vinyl is lightly loaded; no action needed',
        SCR: 'Screen Print has significant headroom; capacity far exceeds demand',
        LASER: 'Laser is not in current order mix; track when laser orders begin',
      };
      return fixes[zoneId] || 'Monitor load ratio';
    },

    factoryLoadBarWidth(load) {
      return Math.min(load * 100, 100).toFixed(1) + '%';
    },

    factoryLoadLabel(load) {
      return Math.round(load * 100) + '%';
    },

    toggleFactoryZone(zoneId) {
      this.factoryZoneDetail = this.factoryZoneDetail === zoneId ? null : zoneId;
    },

    async loadFactoryConfig() {
      if (this.factoryConfigLoading) return;
      this.factoryConfigLoading = true;
      try {
        const res = await fetch('/api/factory/config');
        if (!res.ok) throw new Error('Failed to load factory config');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.warn('Factory config load failed, using hardcoded data:', err.message);
        if (!this.factoryLastRefresh) this.factoryLastRefresh = new Date();
      } finally {
        this.factoryConfigLoading = false;
      }
    },

    async saveFactoryMachine(machineId, updates) {
      try {
        const res = await fetch(`/api/factory/machines/${machineId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Save failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryEditingMachine = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('saveFactoryMachine error:', err);
        this.factoryError = 'Failed to save - check console';
        setTimeout(() => { this.factoryError = null; }, 3000);
      }
    },

    async saveFactoryZone(zoneId, updates) {
      try {
        const res = await fetch(`/api/factory/zones/${zoneId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Save failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryEditingZone = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('saveFactoryZone error:', err);
        this.factoryError = 'Failed to save - check console';
        setTimeout(() => { this.factoryError = null; }, 3000);
      }
    },

    async saveFactoryOperating(updates) {
      try {
        const res = await fetch('/api/factory/operating', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error('Save failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryEditingOperating = false;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('saveFactoryOperating error:', err);
        this.factoryError = 'Failed to save - check console';
        setTimeout(() => { this.factoryError = null; }, 3000);
      }
    },

    async addFactoryMachine(machine) {
      try {
        const res = await fetch('/api/factory/machines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(machine),
        });
        if (!res.ok) throw new Error('Add failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('addFactoryMachine error:', err);
      }
    },

    async deleteFactoryMachine(machineId) {
      try {
        const res = await fetch(`/api/factory/machines/${machineId}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        this.factoryConfig = await res.json();
        this._factoryBaseCache = null;
        this.factoryLastRefresh = new Date();
      } catch (err) {
        console.error('deleteFactoryMachine error:', err);
      }
    },

    startEditMachine(machine) {
      this.factoryEditingMachine = machine.id;
      this.factoryMachineEdits = {
        name: machine.name,
        theoretical_pcs_per_hour: machine.theoretical_pcs_per_hour,
        available_minutes: machine.available_minutes || null,
        efficiency_factor: machine.efficiency_factor || null,
        notes: machine.notes || '',
        formula: machine.formula || '',
        rules: JSON.parse(JSON.stringify(machine.rules || [])),
      };
    },

    cancelEditMachine() {
      this.factoryEditingMachine = null;
      this.factoryMachineEdits = {};
    },

    commitEditMachine(machineId) {
      const updates = {};
      const edits = this.factoryMachineEdits;
      if (edits.name !== undefined) updates.name = edits.name;
      if (edits.theoretical_pcs_per_hour !== undefined) updates.theoretical_pcs_per_hour = parseFloat(edits.theoretical_pcs_per_hour);
      if (edits.available_minutes !== null && edits.available_minutes !== undefined) updates.available_minutes = parseFloat(edits.available_minutes);
      if (edits.efficiency_factor !== null && edits.efficiency_factor !== undefined) updates.efficiency_factor = parseFloat(edits.efficiency_factor);
      if (edits.notes !== undefined) updates.notes = edits.notes;
      if (edits.formula !== undefined) updates.formula = edits.formula;
      if (edits.rules !== undefined) updates.rules = edits.rules;
      if (this.factoryConfig) this.saveFactoryMachine(machineId, updates);
      else this.factoryEditingMachine = null;
    },

    addMachineRule() {
      if (!this.factoryMachineEdits.rules) this.factoryMachineEdits.rules = [];
      this.factoryMachineEdits.rules.push({ type: 'caps_zone', target: '', description: '' });
    },

    removeMachineRule(index) {
      this.factoryMachineEdits.rules.splice(index, 1);
    },

    startEditZone(zone) {
      this.factoryEditingZone = zone.id;
      this.factoryZoneEdits = {
        operators: zone.operators,
        notes: zone.notes || '',
        formula: zone.formula || '',
        rules: JSON.parse(JSON.stringify(zone.rules || [])),
      };
    },

    cancelEditZone() {
      this.factoryEditingZone = null;
      this.factoryZoneEdits = {};
    },

    commitEditZone(zoneId) {
      const updates = {};
      const edits = this.factoryZoneEdits;
      if (edits.operators !== undefined) updates.operators = parseInt(edits.operators, 10);
      if (edits.notes !== undefined) updates.notes = edits.notes;
      if (edits.formula !== undefined) updates.formula = edits.formula;
      if (edits.rules !== undefined) updates.rules = edits.rules;
      if (this.factoryConfig) this.saveFactoryZone(zoneId, updates);
      else this.factoryEditingZone = null;
    },

    addZoneRule() {
      if (!this.factoryZoneEdits.rules) this.factoryZoneEdits.rules = [];
      this.factoryZoneEdits.rules.push({ type: 'sub_bottleneck', bottleneck_machine: '', description: '' });
    },

    removeZoneRule(index) {
      this.factoryZoneEdits.rules.splice(index, 1);
    },

    startEditOperating() {
      const { assumptions } = this.getFactoryData();
      this.factoryOperatingEdits = {
        shift_hours: assumptions.shift_hours,
        orders_per_day: assumptions.orders_per_day,
        avg_pieces_per_order: assumptions.avg_pieces_per_order,
      };
      this.factoryEditingOperating = true;
    },

    cancelEditOperating() {
      this.factoryEditingOperating = false;
      this.factoryOperatingEdits = {};
    },

    commitEditOperating() {
      const edits = this.factoryOperatingEdits;
      const updates = {
        shift_hours: parseFloat(edits.shift_hours),
        orders_per_day: parseInt(edits.orders_per_day, 10),
        avg_pieces_per_order: parseFloat(edits.avg_pieces_per_order),
      };
      if (this.factoryConfig) this.saveFactoryOperating(updates);
      else this.factoryEditingOperating = false;
    },
  };
}
