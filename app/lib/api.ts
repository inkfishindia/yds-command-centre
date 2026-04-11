/**
 * Unified API client for YDS Design Lab ERP.
 *
 * Dual-mode:
 *  - LOCAL mode (default when USE_MOCK_DATA === 'true'): returns mock/sample data
 *  - LIVE mode: calls /api/* on the same Express backend (same origin)
 *
 * In dev: Vite proxies /api/* to Express on port 3000.
 * In prod: Express serves both the React app and /api/* routes.
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function isLocal(): boolean {
  if (typeof window === 'undefined') return true;
  const rc = (window as any).__RUNTIME_CONFIG__;
  return rc?.USE_MOCK_DATA === 'true';
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Types (lightweight — expand as you wire modules)
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  overdue: Array<{ id: string; title: string; dueDate: string }>;
  dueToday: Array<{ id: string; title: string }>;
  recentDecisions: Array<{ id: string; title: string; date: string }>;
  focusAreas: Array<{ id: string; name: string; health: string }>;
  stats: { totalProjects: number; activeCommitments: number; overdueCount: number };
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  date: string;
  customer: string;
  items: number;
  totalAmount: number;
  expectedShipDate: string | null;
  status: string;
  acceptance: string;
  payment: string;
  type: string;
  salesChannel: string;
}

export interface CRMLead {
  id: string;
  name: string;
  email: string;
  company: string;
  status: string;
  source: string;
  value: number;
  lastContact: string;
}

export interface Project {
  id: string;
  title: string;
  status: string;
  health: string;
  owner: string;
  dueDate: string;
}

// ---------------------------------------------------------------------------
// Mock data (minimal — just enough to render pages without a backend)
// ---------------------------------------------------------------------------

const MOCK = {
  dashboard: (): DashboardSummary => ({
    overdue: [
      { id: '1', title: 'Q2 pricing review', dueDate: '2026-04-08' },
      { id: '2', title: 'Vendor onboarding — Fabric Co', dueDate: '2026-04-05' },
    ],
    dueToday: [{ id: '3', title: 'Weekly ops sync' }],
    recentDecisions: [
      { id: '1', title: 'Keep ERP as primary UI', date: '2026-04-11' },
    ],
    focusAreas: [
      { id: '1', name: 'Market Expansion', health: 'on_track' },
      { id: '2', name: 'Product Innovation', health: 'at_risk' },
      { id: '3', name: 'Customer Retention', health: 'on_track' },
    ],
    stats: { totalProjects: 12, activeCommitments: 28, overdueCount: 2 },
  }),

  orders: (): OrderSummary[] => [
    { id: '1', orderNumber: 'YD-20251181-001', date: '2026-04-06', customer: 'John Doe', items: 2, totalAmount: 1530.46, expectedShipDate: '2026-04-09', status: 'Shipped', acceptance: 'Accepted', payment: 'Prepaid', type: 'B2C', salesChannel: 'Website' },
    { id: '2', orderNumber: 'YD-20251182-002', date: '2026-04-09', customer: 'Jane Smith', items: 1, totalAmount: 1060.82, expectedShipDate: null, status: 'Processing', acceptance: 'Accepted', payment: 'COD', type: 'B2C', salesChannel: 'Instagram' },
  ],

  leads: (): CRMLead[] => [
    { id: '1', name: 'Acme Corp', email: 'hello@acme.co', company: 'Acme Corp', status: 'Qualified', source: 'Website', value: 45000, lastContact: '2026-04-10' },
    { id: '2', name: 'BlueStar Ltd', email: 'info@bluestar.in', company: 'BlueStar Ltd', status: 'New', source: 'Instagram', value: 12000, lastContact: '2026-04-09' },
  ],

  projects: (): Project[] => [
    { id: '1', title: 'ERP Consolidation', status: 'Active', health: 'on_track', owner: 'Dan', dueDate: '2026-05-15' },
    { id: '2', title: 'Instagram Growth Engine', status: 'Active', health: 'at_risk', owner: 'Marketing', dueDate: '2026-04-30' },
  ],
};

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  // -- Command Centre data (via /api/cc) --

  dashboard: {
    async get(): Promise<DashboardSummary> {
      if (isLocal()) return MOCK.dashboard();
      return fetchJSON('/api/dashboard');
    },
  },

  projects: {
    async list(): Promise<Project[]> {
      if (isLocal()) return MOCK.projects();
      return fetchJSON('/api/projects');
    },
  },

  crm: {
    async leads(): Promise<CRMLead[]> {
      if (isLocal()) return MOCK.leads();
      return fetchJSON('/api/crm/leads');
    },
  },

  decisions: {
    async list() {
      if (isLocal()) return MOCK.dashboard().recentDecisions;
      return fetchJSON('/api/decisions');
    },
  },

  focusAreas: {
    async list() {
      if (isLocal()) return MOCK.dashboard().focusAreas;
      return fetchJSON('/api/focus-areas');
    },
  },

  marketingOps: {
    async campaigns() {
      if (isLocal()) return [];
      return fetchJSON('/api/marketing-ops/campaigns');
    },
    async contentCalendar() {
      if (isLocal()) return [];
      return fetchJSON('/api/marketing-ops/content-calendar');
    },
  },

  // -- Live Dashboard data (via /api/ld) --

  orders: {
    async list(): Promise<OrderSummary[]> {
      if (isLocal()) return MOCK.orders();
      return fetchJSON('/api/orders');
    },
    async summary() {
      if (isLocal()) return { total: 18, newOrders: 5, issues: 0, rush: 2, overdue: 1, designPending: 0, inProduction: 2, inFulfillment: 3 };
      return fetchJSON('/api/orders/summary');
    },
  },

  analytics: {
    async googleAds() {
      if (isLocal()) return { spend: 0, clicks: 0, impressions: 0, conversions: 0 };
      return fetchJSON('/api/analytics/google-ads');
    },
    async ga4() {
      if (isLocal()) return { sessions: 0, users: 0, bounceRate: 0, avgDuration: 0 };
      return fetchJSON('/api/analytics/ga4');
    },
  },

  instagram: {
    async posts() {
      if (isLocal()) return [];
      return fetchJSON('/api/instagram/posts');
    },
  },
};

export default api;
