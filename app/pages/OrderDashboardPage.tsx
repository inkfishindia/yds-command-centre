// pages/OrderDashboardPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, ManagerEditorLayout, MetricCard, Tag } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { OrderSummaryItem, OrderItem, OrderStatus, AcceptanceStatus, OrderDashboardPageProps, ProductWorkflowStatus, OrderType } from '../types'; // FIX: Imported OrderType
import OrderDetailsDrawer from '../components/orders/OrderDetailsDrawer';
import DemoModeBanner from '../components/layout/DemoModeBanner';
import { getProductStatusEmoji, getAcceptanceStatusEmoji, getOrderTypeTagColor, getPaymentModeTagColor, getSalesChannelTagColor, getDueDatePill, getOrderTypeEmoji, getPaymentModeEmoji } from '../utils/orderUtils'; // FIX: Imported getOrderTypeEmoji and getPaymentModeEmoji

const OrderDashboardPage: React.FC<OrderDashboardPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderSummaryItems, orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, handleGrantSheetsAccess,
  } = useOrder();

  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');

  // State for Order Details Drawer
  const [isOrderDetailsDrawerOpen, setIsOrderDetailsDrawerOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const filteredOrderSummaryItems = useMemo(() => {
    let currentItems = orderSummaryItems;

    if (orderNumberFilter.trim()) {
      currentItems = currentItems.filter(item =>
        item.orderNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    if (customerNameFilter.trim()) {
      currentItems = currentItems.filter(item =>
        item.customerName?.toLowerCase().includes(customerNameFilter.toLowerCase())
      );
    }
    return currentItems;
  }, [orderSummaryItems, orderNumberFilter, customerNameFilter]);

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const todayOrders = new Date();
    todayOrders.setDate(todayOrders.getDate());
    todayOrders.setHours(0, 0, 0, 0);

    let newOrdersCount = 0;
    let ordersWithIssuesCount = 0;
    let rushOrdersCount = 0;
    let dueTodayOrOverdueCount = 0;
    let ordersInDesignPendingCount = 0;
    let ordersInProductionCount = 0;
    let ordersInFulfillmentCount = 0;

    const processedOrderNumbers = new Set<string>(); // To count unique orders for rush, due, etc.

    orderSummaryItems.forEach(summary => {
      // New Orders (Awaiting Acceptance)
      if (summary.acceptanceStatus === AcceptanceStatus.AWAITING) {
        newOrdersCount++;
      }

      // Orders with Issues (e.g., missing critical shipping info)
      if (!summary.shippingAddress || !summary.email || !summary.phone) {
        ordersWithIssuesCount++;
      }
    });

    orderItems.forEach(item => {
      // Rush Orders
      if (item.is_rush_order && item.orderNumber && !processedOrderNumbers.has(item.orderNumber)) {
        rushOrdersCount++;
        processedOrderNumbers.add(item.orderNumber);
      }

      // Due Today / Overdue
      if (item.expectedShipDate) {
        const shipDate = new Date(item.expectedShipDate);
        shipDate.setHours(0, 0, 0, 0);
        if (shipDate <= now && item.productStatus !== ProductWorkflowStatus.DELIVERED && item.orderNumber && !processedOrderNumbers.has(item.orderNumber)) {
          dueTodayOrOverdueCount++;
          processedOrderNumbers.add(item.orderNumber);
        }
      }

      // Orders in Design Pending
      if (item.productStatus === ProductWorkflowStatus.DESIGN_PENDING && item.orderNumber) {
        ordersInDesignPendingCount++;
      }
      
      // Orders in Production (Queued for Production, In Production)
      if ((item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PRODUCTION || item.productStatus === ProductWorkflowStatus.IN_PRODUCTION) && item.orderNumber) {
        ordersInProductionCount++;
      }

      // Orders in Fulfillment (Finishing, Packed, Fulfillment Pending)
      if ((item.productStatus === ProductWorkflowStatus.FINISHING_PENDING || item.productStatus === ProductWorkflowStatus.FULFILLMENT_PENDING || item.productStatus === ProductWorkflowStatus.PACKED) && item.orderNumber) {
        ordersInFulfillmentCount++;
      }
    });
    
    // Convert counts of line items to unique order counts for workflow stages
    const uniqueDesignPendingOrders = new Set(orderItems.filter(item => item.productStatus === ProductWorkflowStatus.DESIGN_PENDING).map(item => item.orderNumber)).size;
    const uniqueProductionOrders = new Set(orderItems.filter(item => item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PRODUCTION || item.productStatus === ProductWorkflowStatus.IN_PRODUCTION).map(item => item.orderNumber)).size;
    const uniqueFulfillmentOrders = new Set(orderItems.filter(item => item.productStatus === ProductWorkflowStatus.FINISHING_PENDING || item.productStatus === ProductWorkflowStatus.FULFILLMENT_PENDING || item.productStatus === ProductWorkflowStatus.PACKED).map(item => item.orderNumber)).size;

    return {
      totalOrders: orderSummaryItems.length,
      newOrdersCount,
      ordersWithIssuesCount,
      rushOrdersCount,
      dueTodayOrOverdueCount,
      ordersInDesignPendingCount: uniqueDesignPendingOrders,
      ordersInProductionCount: uniqueProductionOrders,
      ordersInFulfillmentCount: uniqueFulfillmentOrders,
    };
  }, [orderSummaryItems, orderItems]);


  const handleOpenOrderDetailsDrawer = useCallback((orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    setIsOrderDetailsDrawerOpen(true);
  }, []);

  const handleCloseOrderDetailsDrawer = useCallback(() => {
    setIsOrderDetailsDrawerOpen(false);
    setSelectedOrderNumber(null);
  }, []);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Orders 🔄'}
      </Button>
      <Input
        placeholder="Filter by Order #"
        value={orderNumberFilter}
        onChange={(e) => setOrderNumberFilter(e.target.value)}
        className="w-40"
        aria-label="Filter by order number"
      />
      <Input
        placeholder="Filter by Customer Name"
        value={customerNameFilter}
        onChange={(e) => setCustomerNameFilter(e.target.value)}
        className="w-48"
        aria-label="Filter by customer name"
      />
    </div>
  );

  const tableHeaders = useMemo(() => [
    'Order #', 'Date', 'Customer', '# Items', 'Total Amount', 'Expected Ship Date', 'Status', 'Acceptance', 'Payment', 'Type', 'Sales Channel', 'Flags', 'Actions'
  ], []);


  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Order Dashboard"
            description="Connect your Google account to view your aggregated order data from Google Sheets."
            action={
              <Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>
                {isAuthActionInProgress ? 'Loading...' : 'Sign in with Google 🚀'}
              </Button>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (showPermissionPrompt && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sheets Access Permissions Needed">
          <EmptyState
            title="Grant Google Sheets access to load data"
            description={error || "This application needs your explicit permission to read data from your Google Sheets. A pop-up will appear to request your consent."}
            action={
              <Button variant="accent" onClick={handleGrantSheetsAccess} disabled={isAuthActionInProgress}>
                {isAuthActionInProgress ? 'Requesting access...' : 'Grant Sheets Access 📄'}
              </Button>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  if (loading && !orderSummaryItems.length) {
    return (
      <ManagerEditorLayout title={title}>
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading order dashboard data...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderSummaryItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Order Dashboard" : "No Order Data Found"}
            description={error || "Enter the Google Sheet ID for your orders to get started."}
            action={
              <div className="space-y-4">
                <Input
                  label="Google Spreadsheet ID"
                  id="orderSheetIdInput"
                  value={orderSheetId}
                  onChange={(e) => setOrderSheetId(e.target.value)}
                  placeholder="Enter Google Spreadsheet ID"
                  helperText="Found in the sheet URL: https://docs.google.com/spreadsheets/d/YOUR_ID/edit"
                  required
                />
                <Button onClick={handleLoadData} disabled={!orderSheetId || loading || isAuthActionInProgress} variant="primary">
                  {loading ? 'Loading...' : 'Retry Load from Sheet 📄'}
                </Button>
              </div>
            }
          />
        </Card>
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title={title} toolbar={toolbar}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        A high-level overview of your entire order pipeline, from new orders to fulfillment.
      </p>

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-8">
        <MetricCard title="Total Orders" value={dashboardMetrics.totalOrders} icon="📦" />
        <MetricCard title="New Orders (Awaiting)" value={dashboardMetrics.newOrdersCount} icon={getAcceptanceStatusEmoji(AcceptanceStatus.AWAITING)} />
        <MetricCard title="Orders with Issues" value={dashboardMetrics.ordersWithIssuesCount} icon="⚠️" />
        <MetricCard title="Rush Orders" value={dashboardMetrics.rushOrdersCount} icon="⚡" />
        <MetricCard title="Due Today / Overdue" value={dashboardMetrics.dueTodayOrOverdueCount} icon="⏰" />
        <MetricCard title="In Design Pending" value={dashboardMetrics.ordersInDesignPendingCount} icon={getProductStatusEmoji(ProductWorkflowStatus.DESIGN_PENDING)} />
        <MetricCard title="In Production" value={dashboardMetrics.ordersInProductionCount} icon={getProductStatusEmoji(ProductWorkflowStatus.IN_PRODUCTION)} />
        <MetricCard title="In Fulfillment" value={dashboardMetrics.ordersInFulfillmentCount} icon={getProductStatusEmoji(ProductWorkflowStatus.FULFILLMENT_PENDING)} />
      </div>

      {/* Orders Table */}
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Recent Orders</h2>
      {filteredOrderSummaryItems.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="Your sheet is either empty or no orders match the current filters."
        />
      ) : (
        <Table headers={tableHeaders}>
          {filteredOrderSummaryItems.map((item, index) => {
            const firstLineItem = orderItems.find(li => li.orderNumber === item.orderNumber);
            const dueDatePill = getDueDatePill(firstLineItem?.expectedShipDate, firstLineItem?.is_rush_order);

            const flags = [];
            if (firstLineItem?.is_rush_order) flags.push({ label: 'Rush', emoji: '⚡', color: 'destructive' });
            if (firstLineItem?.whitelabelRequired) flags.push({ label: 'Whitelabel', emoji: '🏷️', color: 'blue' });
            if (item.orderType === OrderType.B2B) flags.push({ label: 'B2B', emoji: '🏢', color: 'green' });


            return (
              <tr key={item.orderNumber || index}
                  className="hover:bg-[var(--color-bg-stage)]/80 group cursor-pointer"
                  onClick={() => handleOpenOrderDetailsDrawer(item.orderNumber)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenOrderDetailsDrawer(item.orderNumber)}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-brand-primary)]">{item.orderNumber}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{item.date}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">{item.customerName}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)] text-right">{item.totalNoOfProducts || 'N/A'}</td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                  {item.totalAmountWithTax !== undefined ? `₹${item.totalAmountWithTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {firstLineItem?.expectedShipDate ? new Date(firstLineItem.expectedShipDate).toLocaleDateString() : 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {item.status && <StatusPill status={item.status}>{getProductStatusEmoji(item.status)} {item.status}</StatusPill>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {item.acceptanceStatus && <StatusPill status={item.acceptanceStatus}>{getAcceptanceStatusEmoji(item.acceptanceStatus)} {item.acceptanceStatus}</StatusPill>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {item.paymentMode && <StatusPill status={item.paymentMode}>{getPaymentModeEmoji(item.paymentMode)} {item.paymentMode}</StatusPill>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {item.orderType && <StatusPill status={item.orderType}>{getOrderTypeEmoji(item.orderType)} {item.orderType}</StatusPill>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {item.salesChannel && <Tag color={getSalesChannelTagColor(item.salesChannel)}>{item.salesChannel}</Tag>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm flex flex-wrap gap-1">
                  {flags.map((flag, idx) => (
                    <Tag key={idx} color={flag.color} title={flag.label}>{flag.emoji}</Tag>
                  ))}
                  <StatusPill status={dueDatePill.color}>{dueDatePill.label}</StatusPill>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); handleOpenOrderDetailsDrawer(item.orderNumber); }} title="View Order Details">
                    View Details 👁️
                  </Button>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      {/* Order Details Drawer */}
      <OrderDetailsDrawer
        isOpen={isOrderDetailsDrawerOpen}
        onClose={handleCloseOrderDetailsDrawer}
        orderNumber={selectedOrderNumber}
        allOrderItems={orderItems}
      />
    </ManagerEditorLayout>
  );
};

export default OrderDashboardPage;