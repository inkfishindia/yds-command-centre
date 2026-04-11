// pages/OrderSummaryPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, ManagerEditorLayout, Select, Tag } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
// FIX: Import useToast to use addToast
import { useToast } from '../contexts/ToastContext';
import { OrderSummaryItem, OrderStatus, OrderSummaryPageProps, PaymentMode, OrderType, AcceptanceStatus, ProductWorkflowStatus } from '../types'; // NEW: Import ProductWorkflowStatus for designPending filter
// NEW: Import shared utility functions
import { getProductStatusEmoji, getOrderTypeTagColor, getPaymentModeTagColor, getSalesChannelTagColor, getAcceptanceStatusEmoji } from '../utils/orderUtils';
import OrderDetailsDrawer from '../components/orders/OrderDetailsDrawer'; // NEW: Import the renamed drawer


const OrderSummaryPage: React.FC<OrderSummaryPageProps> = () => { // Removed onViewOrderDetails prop as it's now handled internally
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { addToast } = useToast(); // FIX: Destructure addToast from useToast
  const {
    orderSummaryItems, orderSheetId, setOrderSheetId, // Using the main sheet ID for all order-related data
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, handleGrantSheetsAccess,
    orderItems, // NEW: Need all order items for the detail drawer
    setSelectedOrderNumberForDetail, // Needed to clear state if navigating away
    updateOrderSummaryAcceptanceStatus, // NEW: For Kanban drag and drop
  } = useOrder();

  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [acceptanceStatusFilter, setAcceptanceStatusFilter] = useState<AcceptanceStatus | 'All'>('All'); // UPDATED: Changed to AcceptanceStatus filter
  const [dateRangeFilter, setDateRangeFilter] = useState<'All Time' | 'Last 7 Days' | 'Last 30 Days' | 'Last 90 Days'>('Last 30 Days'); // NEW
  const [salesChannelFilter, setSalesChannelFilter] = useState<'All' | string>('All'); // NEW: Dynamic filter
  const [paymentModeFilter, setPaymentModeFilter] = useState<PaymentMode | 'All'>('All'); // NEW
  const [orderTypeFilter, setOrderTypeFilter] = useState<OrderType | 'All'>('All'); // NEW
  const [shippingStateFilter, setShippingStateFilter] = useState<'All' | 'Karnataka' | 'Maharashtra' | 'Delhi'>('All'); // NEW: Mock filter
  const [minAmountFilter, setMinAmountFilter] = useState<number | ''>(''); // NEW
  const [maxAmountFilter, setMaxAmountFilter] = useState<number | ''>(''); // NEW

  // NEW: State for Order Details Drawer
  const [isOrderDetailsDrawerOpen, setIsOrderDetailsDrawerOpen] = useState(false);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null);

  // Drag and Drop states
  const [draggingOrderNumber, setDraggingOrderNumber] = useState<string | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<AcceptanceStatus | null>(null);


  const filteredOrderSummaryItems = useMemo(() => {
    let currentItems = orderSummaryItems;

    if (orderNumberFilter.trim()) {
      // FIX: Use optional chaining to safely access `orderNumber`
      currentItems = currentItems.filter(item =>
        item.orderNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    if (customerNameFilter.trim()) {
      // FIX: Use optional chaining to safely access `customerName`
      currentItems = currentItems.filter(item =>
        item.customerName?.toLowerCase().includes(customerNameFilter.toLowerCase())
      );
    }
    // The acceptance status filter now applies to the Kanban columns.
    // However, if the filter is 'All', we return all items, and the Kanban itself filters by status.
    // If a specific status is filtered, we apply that here.
    if (acceptanceStatusFilter !== 'All') {
      currentItems = currentItems.filter(item => item.acceptanceStatus === acceptanceStatusFilter);
    }

    // NEW: Date Range Filter
    if (dateRangeFilter !== 'All Time') {
        const now = new Date();
        const cutoffDate = new Date(now);
        if (dateRangeFilter === 'Last 7 Days') cutoffDate.setDate(now.getDate() - 7);
        else if (dateRangeFilter === 'Last 30 Days') cutoffDate.setDate(now.getDate() - 30);
        else if (dateRangeFilter === 'Last 90 Days') cutoffDate.setDate(now.getDate() - 90);

        currentItems = currentItems.filter(item => {
            const itemDate = item.date ? new Date(item.date) : null;
            return itemDate && itemDate >= cutoffDate;
        });
    }

    // NEW: Payment Mode Filter
    if (paymentModeFilter !== 'All') {
        currentItems = currentItems.filter(item => item.paymentMode === paymentModeFilter);
    }

    // NEW: Order Type Filter
    if (orderTypeFilter !== 'All') {
        currentItems = currentItems.filter(item => item.orderType === orderTypeFilter);
    }

    // NEW: Amount Range Filter
    if (minAmountFilter !== '') {
        currentItems = currentItems.filter(item => (item.totalAmountWithTax || 0) >= minAmountFilter);
    }
    if (maxAmountFilter !== '') {
        currentItems = currentItems.filter(item => (item.totalAmountWithTax || 0) <= maxAmountFilter);
    }

    // NEW: Sales Channel Filter
    if (salesChannelFilter !== 'All') {
        currentItems = currentItems.filter(item => item.salesChannel === salesChannelFilter);
    }

    return currentItems;
  }, [orderSummaryItems, orderNumberFilter, customerNameFilter, acceptanceStatusFilter, dateRangeFilter, paymentModeFilter, orderTypeFilter, minAmountFilter, maxAmountFilter, salesChannelFilter]);

  // NEW: Quick Filters Logic
  const applyQuickFilter = useCallback((filterType: 'highValue' | 'urgent' | 'multipleItems' | 'designPending') => {
    // Clear filters that conflict with the new quick filter
    setOrderNumberFilter('');
    setCustomerNameFilter('');
    setAcceptanceStatusFilter('All'); // Reset status filter here so it can be set below
    setDateRangeFilter('All Time');
    setSalesChannelFilter('All');
    setPaymentModeFilter('All');
    setOrderTypeFilter('All');
    setShippingStateFilter('All');
    setMinAmountFilter('');
    setMaxAmountFilter('');

    if (filterType === 'highValue') {
        setMinAmountFilter(5000);
        addToast("Applied 'High Value' filter (Min Amount: ₹5000+)", "info");
    } else if (filterType === 'urgent') {
        setAcceptanceStatusFilter(AcceptanceStatus.ACCEPTED); // Example: urgent means accepted and ready for next step
        addToast("Applied 'Accepted Orders' filter", "info");
    } else if (filterType === 'designPending') {
        // Find order numbers where at least one line item is 'Design Pending'
        const designPendingOrderNumbers = new Set(orderItems
            .filter(item => item.productStatus === ProductWorkflowStatus.DESIGN_PENDING)
            .map(item => item.orderNumber)
            .filter(Boolean)
        );
        // Filter summary items whose orderNumber is in the set of designPendingOrderNumbers
        setOrderNumberFilter(Array.from(designPendingOrderNumbers).join('|'));
        addToast("Applied 'Design Pending' filter (Orders with at least one item in Design Pending status)", "info");
    } else if (filterType === 'multipleItems') {
        // This relies on `totalQuantityOfAllProducts` in summary item.
        const ordersWithMultipleItems = orderSummaryItems.filter(item => (item.totalQuantityOfAllProducts || 0) > 1);
        if (ordersWithMultipleItems.length > 0) {
          // Instead of joining, filter by the specific order numbers directly
          // This will be handled by the `orderNumberFilter` input in the UI.
          const orderNumbersToFilter = ordersWithMultipleItems.map(item => item.orderNumber).filter(Boolean).join('|');
          setOrderNumberFilter(orderNumbersToFilter);
        } else {
          setOrderNumberFilter('');
        }
        addToast("Applied 'Multiple Items' filter (Orders with >1 product quantity)", "info");
    }
  }, [addToast, orderSummaryItems, orderItems, setMinAmountFilter, setMaxAmountFilter, setAcceptanceStatusFilter, setOrderNumberFilter]);


  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const allAcceptanceStatuses = useMemo(() => Object.values(AcceptanceStatus).sort(), []); // UPDATED: Use AcceptanceStatus
  const acceptanceStatusFilterOptions = useMemo(() => ['All', ...allAcceptanceStatuses].map(s => ({ value: s, label: s })), [allAcceptanceStatuses]); // UPDATED

  const dateRangeOptions = useMemo(() => ([
    { value: 'All Time', label: 'All Time' },
    { value: 'Last 7 Days', label: 'Last 7 Days' },
    { value: 'Last 30 Days', label: 'Last 30 Days' },
    { value: 'Last 90 Days', label: 'Last 90 Days' },
  ]), []);

  const uniqueSalesChannels = useMemo(() => {
    const channels = new Set<string>();
    orderSummaryItems.forEach(item => {
      if (item.salesChannel && item.salesChannel.trim() !== '') {
        channels.add(item.salesChannel.trim());
      }
    });
    return Array.from(channels).sort();
  }, [orderSummaryItems]);

  const salesChannelOptions = useMemo(() => ([
    { value: 'All', label: 'All' },
    ...uniqueSalesChannels.map(s => ({ value: s, label: s })),
  ]), [uniqueSalesChannels]);

  const paymentModeOptions = useMemo(() => ['All', ...Object.values(PaymentMode)].map(m => ({ value: m, label: m })), []);
  const orderTypeOptions = useMemo(() => ['All', ...Object.values(OrderType)].map(t => ({ value: t, label: t })), []);

  const shippingStateOptions = useMemo(() => ([ // Mock options
    { value: 'All', label: 'All' },
    { value: 'Karnataka', label: 'Karnataka' },
    { value: 'Maharashtra', label: 'Maharashtra' },
    { value: 'Delhi', label: 'Delhi' },
  ]), []);

  const handleClearAllFilters = useCallback(() => {
    setOrderNumberFilter('');
    setCustomerNameFilter('');
    setAcceptanceStatusFilter('All'); // UPDATED
    setDateRangeFilter('All Time');
    setSalesChannelFilter('All');
    setPaymentModeFilter('All');
    setOrderTypeFilter('All');
    setShippingStateFilter('All');
    setMinAmountFilter('');
    setMaxAmountFilter('');
    addToast("All filters cleared!", "info"); // FIX: addToast is now available
  }, [addToast]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Orders 🔄'}
      </Button>
      <Button onClick={handleClearAllFilters} variant="secondary">
        Clear All Filters 🧹
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
      <Select
        options={acceptanceStatusFilterOptions} // UPDATED
        value={acceptanceStatusFilter} // UPDATED
        onChange={(val) => setAcceptanceStatusFilter(val as AcceptanceStatus | 'All')} // UPDATED
        placeholder="Filter by Acceptance Status" // UPDATED
        className="w-40"
        aria-label="Filter orders by acceptance status" // UPDATED
      />
      {/* NEW: Additional Filters */}
      <Select
        options={dateRangeOptions}
        value={dateRangeFilter}
        onChange={(val) => setDateRangeFilter(val as typeof dateRangeFilter)}
        placeholder="Filter by Date"
        className="w-40"
        aria-label="Filter orders by date range"
      />
      <Select
        options={salesChannelOptions}
        value={salesChannelFilter}
        onChange={(val) => setSalesChannelFilter(val as typeof salesChannelFilter)}
        placeholder="Sales Channel"
        className="w-40"
        aria-label="Filter orders by sales channel"
      />
      <Select
        options={paymentModeOptions}
        value={paymentModeFilter}
        onChange={(val) => setPaymentModeFilter(val as PaymentMode | 'All')}
        placeholder="Payment Mode"
        className="w-40"
        aria-label="Filter orders by payment mode"
      />
      <Select
        options={orderTypeOptions}
        value={orderTypeFilter}
        onChange={(val) => setOrderTypeFilter(val as OrderType | 'All')}
        placeholder="Order Type"
        className="w-40"
        aria-label="Filter orders by order type"
      />
      <Select
        options={shippingStateOptions}
        value={shippingStateFilter}
        onChange={(val) => setShippingStateFilter(val as typeof shippingStateFilter)}
        placeholder="Shipping State"
        className="w-40"
        aria-label="Filter orders by shipping state"
      />
      <Input
        type="number"
        placeholder="Min Amount"
        value={minAmountFilter}
        onChange={(e) => setMinAmountFilter(e.target.value === '' ? '' : parseFloat(e.target.value))}
        className="w-32"
        aria-label="Minimum amount filter"
      />
      <Input
        type="number"
        placeholder="Max Amount"
        value={maxAmountFilter}
        onChange={(e) => setMaxAmountFilter(e.target.value === '' ? '' : parseFloat(e.target.value))}
        className="w-32"
        aria-label="Maximum amount filter"
      />
    </div>
  );

  const quickFilters = (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <Button variant="secondary" size="sm" onClick={handleClearAllFilters}>Show All</Button>
      <Button variant="secondary" size="sm" onClick={() => applyQuickFilter('urgent')}>Urgent Production</Button>
      <Button variant="secondary" size="sm" onClick={() => applyQuickFilter('designPending')}>Design Pending</Button>
      <Button variant="secondary" size="sm" onClick={() => applyQuickFilter('highValue')}>High Value (₹5000+)</Button>
      <Button variant="secondary" size="sm" onClick={() => applyQuickFilter('multipleItems')}>Multiple Items</Button>
    </div>
  );

  const handleOpenOrderDetailsDrawer = useCallback((orderNumber: string) => {
    setSelectedOrderNumber(orderNumber);
    setIsOrderDetailsDrawerOpen(true);
  }, []);

  const handleCloseOrderDetailsDrawer = useCallback(() => {
    setIsOrderDetailsDrawerOpen(false);
    setSelectedOrderNumber(null);
    setSelectedOrderNumberForDetail(null); // Clear context state as well
  }, [setSelectedOrderNumberForDetail]);

  // Drag & Drop Handlers
  const handleDragStart = useCallback((e: React.DragEvent, orderNumber: string, currentStatus: AcceptanceStatus) => {
    e.dataTransfer.setData('text/plain', orderNumber);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingOrderNumber(orderNumber);
    (e.currentTarget as HTMLElement).style.opacity = '0.4'; // Visual feedback for dragged item
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = '1'; // Reset opacity
    setDraggingOrderNumber(null);
    setHoveredColumn(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); // Allows drop
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, status: AcceptanceStatus) => {
    e.preventDefault();
    setHoveredColumn(status); // Highlight column on hover
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    setHoveredColumn(null); // Remove highlight when leaving column
  }, []);


  const handleDrop = useCallback(async (e: React.DragEvent, newAcceptanceStatus: AcceptanceStatus) => {
    e.preventDefault();
    setHoveredColumn(null);
    const draggedOrderNumber = e.dataTransfer.getData('text/plain');

    if (!draggedOrderNumber) {
      addToast('Invalid drag operation: No order number found.', 'error');
      return;
    }

    const currentOrderSummaryItem = orderSummaryItems.find(item => item.orderNumber === draggedOrderNumber);
    if (!currentOrderSummaryItem) {
        addToast(`Order ${draggedOrderNumber} not found.`, 'error');
        return;
    }

    if (currentOrderSummaryItem.acceptanceStatus === newAcceptanceStatus) {
      addToast(`Order ${draggedOrderNumber} is already in "${newAcceptanceStatus}" status.`, 'info');
      return;
    }
    
    // setLoading(true); // Indicate loading state for the operation - REMOVED: Handled by context
    try {
      await updateOrderSummaryAcceptanceStatus(draggedOrderNumber, newAcceptanceStatus);
    } catch (err: any) {
        addToast(`Failed to update order status: ${err.message}`, 'error');
        // Revert local state if API call fails
        // This is handled by a full reload in `updateOrderSummaryAcceptanceStatus`, so no explicit local revert needed here.
    } finally {
        // setLoading(false); // End loading state - REMOVED: Handled by context
        setDraggingOrderNumber(null); // Clear dragging state
    }
  }, [orderSummaryItems, updateOrderSummaryAcceptanceStatus, addToast]);


  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Order List (Summary)">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Order Data"
            description="Connect your Google account to fetch and view your summarized order list from Google Sheets."
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
      <ManagerEditorLayout title="Order List (Summary)">
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
      <ManagerEditorLayout title="Order List (Summary)">
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading order summary data from Google Sheet...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderSummaryItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title="Order List (Summary)">
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Order Summary" : "No Order Summary Found"}
            description={error || "Enter the Google Sheet ID for your order list to get started."}
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
    <ManagerEditorLayout title="Order List (Summary)" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Aggregated view of all customer orders, organized by acceptance status. Click on an order to see detailed product lines.</p>
      
      {quickFilters} {/* NEW: Quick Filters */}

      {filteredOrderSummaryItems.length === 0 && !loading ? (
        <EmptyState
          title="No Order Summaries Found"
          description="Your sheet is either empty or no orders match the current filters."
        />
      ) : (
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar flex-1">
          {allAcceptanceStatuses.map((status: AcceptanceStatus) => { // UPDATED: Iterate over AcceptanceStatus
            const ordersInStatus = filteredOrderSummaryItems.filter(item => item.acceptanceStatus === status); // UPDATED: Filter by acceptanceStatus
            return (
              <div 
                key={status} 
                className={`flex-none w-[280px] max-h-full mr-6 ${hoveredColumn === status ? 'border-2 border-dashed border-[var(--color-brand-primary)]' : ''}`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <Card title={<span className="font-semibold text-[var(--color-text-primary)]">{getAcceptanceStatusEmoji(status)} {status} ({ordersInStatus.length})</span>} className="flex flex-col h-full"> {/* UPDATED: Use AcceptanceStatus emoji */}
                  <div className="flex-1 overflow-y-auto space-y-4 p-4">
                    {ordersInStatus.length > 0 ? (
                      ordersInStatus.map((item) => (
                        <div
                          key={item.orderNumber}
                          draggable="true"
                          onDragStart={(e) => handleDragStart(e, item.orderNumber, item.acceptanceStatus || AcceptanceStatus.AWAITING)}
                          onDragEnd={handleDragEnd}
                          className={`p-3 rounded-md bg-[var(--color-bg-stage)] border border-transparent hover:border-[var(--color-brand-primary)] group cursor-pointer ${draggingOrderNumber === item.orderNumber ? 'opacity-40' : ''}`}
                          style={{ boxShadow: 'var(--shadow-elevation)' }}
                          onClick={() => handleOpenOrderDetailsDrawer(item.orderNumber)} // Use local state for drawer
                          tabIndex={0}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleOpenOrderDetailsDrawer(item.orderNumber)} // Use local state for drawer
                          role="button"
                          aria-label={`View details for order ${item.orderNumber}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="text-lg font-bold text-[var(--color-text-primary)]">{item.orderNumber}</h4>
                              <p className="text-xs text-[var(--color-text-secondary)] mt-1">{item.date}</p>
                            </div>
                            {/* FIX: Use getOrderTypeTagColor for Tag component */}
                            <Tag color={getOrderTypeTagColor(item.orderType)}>{item.orderType || 'N/A'}</Tag>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-xs font-semibold text-[var(--color-text-secondary)] mr-1">Customer:</span>
                              <span className="font-medium text-[var(--color-text-primary)]">{item.customerName}</span>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-[var(--color-text-secondary)] mr-1">Total Amount:</span>
                              <span className="font-medium text-[var(--color-text-primary)]">{item.totalAmountWithTax !== undefined ? `₹${item.totalAmountWithTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div>
                                <span className="text-xs font-semibold text-[var(--color-text-secondary)] mr-1">Products:</span>
                                <span className="font-medium text-[var(--color-text-primary)]">{item.totalNoOfProducts || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-xs font-semibold text-[var(--color-text-secondary)] mr-1">Qty:</span>
                                <span className="font-medium text-[var(--color-text-primary)]">{item.totalQuantityOfAllProducts || 'N/A'}</span>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {/* FIX: Use getPaymentModeTagColor for Tag component */}
                              <Tag color={getPaymentModeTagColor(item.paymentMode)}>{item.paymentMode || 'N/A'}</Tag>
                              {item.salesChannel && <Tag color={getSalesChannelTagColor(item.salesChannel)}>{item.salesChannel}</Tag>}
                              <StatusPill status={item.acceptanceStatus}>{item.acceptanceStatus}</StatusPill> {/* UPDATED: Use acceptanceStatus for StatusPill */}
                            </div>
                          </div>
                          {/* NEW: Placed "View Details" button always visible at the bottom-right */}
                          <div className="mt-4 flex justify-end">
                            <Button
                              size="sm"
                              variant="accent"
                              onClick={(e) => { e.stopPropagation(); handleOpenOrderDetailsDrawer(item.orderNumber); }} // Use local state for drawer
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No Orders" description={`No orders in "${status}" acceptance status matching current filters.`} />
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW: Order Details Drawer (replaces OrderSummaryDetailDrawer) */}
      <OrderDetailsDrawer
        isOpen={isOrderDetailsDrawerOpen}
        onClose={handleCloseOrderDetailsDrawer}
        orderNumber={selectedOrderNumber}
        allOrderItems={orderItems}
      />
    </ManagerEditorLayout>
  );
};

export default OrderSummaryPage;