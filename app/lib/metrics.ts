
import { DailyReportData, DashboardMetrics, DeltaMetric } from '../types';

function calculateDelta(current: number, previous: number): DeltaMetric {
  const delta = current - previous;
  const percentChange = previous !== 0 ? (delta / previous) * 100 : 0;
  return { value: current, delta, percentChange };
}

/**
 * Calculates key dashboard metrics adhering to Sheets-First Rules Engine philosophy.
 * Computes deltas between 'Today' (latest row) and 'Yesterday' (previous row).
 */
export function calculateMetrics(reportData: DailyReportData[]): DashboardMetrics {
  // Assume data is sorted by date descending (latest first)
  const today = reportData[0] || {} as DailyReportData;
  const yesterday = reportData[1] || {} as DailyReportData;

  // CORE KPIs
  const registrations = calculateDelta(today.registrations || 0, yesterday.registrations || 0);
  const ordersReceived = calculateDelta(today.ordersReceived || 0, yesterday.ordersReceived || 0);
  
  const todayConv = today.ordersReceived && (today.ordersReceived + today.abandonedCartsGuests + today.abandonedCartsUsers) > 0 
    ? (today.ordersReceived / (today.ordersReceived + today.abandonedCartsGuests + today.abandonedCartsUsers)) * 100 
    : 0;
  const yesterdayConv = yesterday.ordersReceived && (yesterday.ordersReceived + yesterday.abandonedCartsGuests + yesterday.abandonedCartsUsers) > 0 
    ? (yesterday.ordersReceived / (yesterday.ordersReceived + yesterday.abandonedCartsGuests + yesterday.abandonedCartsUsers)) * 100 
    : 0;
  const conversionRate = calculateDelta(todayConv, yesterdayConv);

  const todayAov = today.ordersReceived ? today.totalOrderValue / today.ordersReceived : 0;
  const yesterdayAov = yesterday.ordersReceived ? yesterday.totalOrderValue / yesterday.ordersReceived : 0;
  const aov = calculateDelta(todayAov, yesterdayAov);

  const totalRevenue = calculateDelta(today.totalOrderValue || 0, yesterday.totalOrderValue || 0);

  // REVENUE BREAKDOWN
  const revenueBreakdown = {
    b2c: today.b2cOrderValue || 0,
    business: today.businessProductsValue || 0,
    partner: today.partnerProductsValue || 0,
    cod: today.codOrderValue || 0,
    manual: today.manualOrderValue || 0,
    ds: today.dsOrderValue || 0,
  };

  const yesterdayRevenueBreakdown = {
    b2c: yesterday.b2cOrderValue || 0,
    business: yesterday.businessProductsValue || 0,
    partner: yesterday.partnerProductsValue || 0,
    cod: yesterday.codOrderValue || 0,
    manual: yesterday.manualOrderValue || 0,
    ds: yesterday.dsOrderValue || 0,
  };

  // ORDER HEALTH & RISK
  const todayOPR = today.registrations ? today.ordersReceived / today.registrations : 0;
  const yesterdayOPR = yesterday.registrations ? yesterday.ordersReceived / yesterday.registrations : 0;
  
  const todayCODPct = today.ordersReceived ? (today.codOrders / today.ordersReceived) * 100 : 0;
  const yesterdayCODPct = yesterday.ordersReceived ? (yesterday.codOrders / yesterday.ordersReceived) * 100 : 0;

  const todayDiscPct = today.ordersReceived ? (today.ordersWithDiscount / today.ordersReceived) * 100 : 0;
  const yesterdayDiscPct = yesterday.ordersReceived ? (yesterday.ordersWithDiscount / yesterday.ordersReceived) * 100 : 0;

  const todayBizPct = today.ordersReceived ? (today.businessOrders / today.ordersReceived) * 100 : 0;
  const yesterdayBizPct = yesterday.ordersReceived ? (yesterday.businessOrders / yesterday.ordersReceived) * 100 : 0;

  const orderHealth = {
    ordersPerReg: calculateDelta(todayOPR, yesterdayOPR),
    codPct: calculateDelta(todayCODPct, yesterdayCODPct),
    discountPct: calculateDelta(todayDiscPct, yesterdayDiscPct),
    businessOrderPct: calculateDelta(todayBizPct, yesterdayBizPct),
  };

  // CART LEAKAGE
  const todayTotalCarts = (today.ordersReceived || 0) + (today.abandonedCartsGuests || 0) + (today.abandonedCartsUsers || 0);
  const yesterdayTotalCarts = (yesterday.ordersReceived || 0) + (yesterday.abandonedCartsGuests || 0) + (yesterday.abandonedCartsUsers || 0);

  const todayAbanRate = todayTotalCarts > 0 ? ((today.abandonedCartsGuests + today.abandonedCartsUsers) / todayTotalCarts) * 100 : 0;
  const yesterdayAbanRate = yesterdayTotalCarts > 0 ? ((yesterday.abandonedCartsGuests + yesterday.abandonedCartsUsers) / yesterdayTotalCarts) * 100 : 0;

  const leakage = {
    totalCarts: calculateDelta(todayTotalCarts, yesterdayTotalCarts),
    abandonedGuests: calculateDelta(today.abandonedCartsGuests || 0, yesterday.abandonedCartsGuests || 0),
    abandonedUsers: calculateDelta(today.abandonedCartsUsers || 0, yesterday.abandonedCartsUsers || 0),
    abandonmentRate: calculateDelta(todayAbanRate, yesterdayAbanRate),
  };

  return {
    registrations,
    ordersReceived,
    conversionRate,
    aov,
    totalRevenue,
    revenueBreakdown,
    yesterdayRevenueBreakdown,
    orderHealth,
    leakage,
    trends: reportData.slice(0, 7).reverse(), // Last 7 days chronologically
  };
}
