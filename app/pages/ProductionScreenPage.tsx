// pages/ProductionScreenPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Button, Input, EmptyState, StatusPill, ManagerEditorLayout, Modal, ConfirmDialog, Tag } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { usePortfolio } from '../contexts/PortfolioContext'; // To get team members
import { OrderItem, ProductWorkflowStatus, OrderStatus, ProductionScreenPageProps } from '../types';
import AssignToOperatorModal from '../components/orders/AssignToOperatorModal';
import MarkProductionCompleteModal from '../components/orders/MarkProductionCompleteModal';
import MarkFinishingCompleteModal from '../components/orders/MarkFinishingCompleteModal';
import OrderItemDetailDrawer from '../components/orders/OrderItemDetailDrawer';
import MarkPackedModal from '../components/orders/MarkPackedModal'; // NEW: Import MarkPackedModal
import MarkShippedModal from '../components/orders/MarkShippedModal'; // NEW: Import MarkShippedModal
import { getProductWorkflowStatusEmoji } from '../utils/orderUtils';
import DemoModeBanner from '../components/layout/DemoModeBanner';

interface ProductionCardProps {
  item: OrderItem;
  onViewDetails: (item: OrderItem) => void;
  onAssignToOperator?: (item: OrderItem) => void;
  onMarkProductionComplete?: (item: OrderItem) => void;
  onMarkFinishingComplete?: (item: OrderItem) => void;
  onMarkPacked?: (item: OrderItem) => void; // NEW
  onMarkShipped?: (item: OrderItem) => void; // NEW
  loading: boolean;
}

const ProductionCard: React.FC<ProductionCardProps> = React.memo(({
  item,
  onViewDetails,
  onAssignToOperator,
  onMarkProductionComplete,
  onMarkFinishingComplete,
  onMarkPacked, // NEW
  onMarkShipped, // NEW
  loading,
}) => {
  const isRush = item.is_rush_order;
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Timer effect for items in IN_PRODUCTION status
  useEffect(() => {
    let interval: number | undefined; // Use `number | undefined` for setInterval return type
    if (item.print_started_at && item.productStatus === ProductWorkflowStatus.IN_PRODUCTION) {
      const startTime = new Date(item.print_started_at).getTime();
      
      // Calculate initial elapsed time
      const initialElapsed = Math.max(0, Math.floor((new Date().getTime() - startTime) / 1000));
      setSecondsElapsed(initialElapsed);

      // Update every second
      interval = window.setInterval(() => { // Use window.setInterval
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      // Reset timer if not in production or no start time
      setSecondsElapsed(0);
    }
    return () => {
      if (interval !== undefined) { // Check if interval is defined before clearing
        clearInterval(interval);
      }
    };
  }, [item.print_started_at, item.productStatus]); // Dependencies: only when item's start time or status changes

  const timerDisplay = useMemo(() => {
    if (secondsElapsed > 0) {
      const minutes = Math.floor(secondsElapsed / 60);
      const seconds = secondsElapsed % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return null;
  }, [secondsElapsed]);

  return (
    <div
      className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-[var(--color-border-primary)] hover:border-[var(--color-brand-primary)] group cursor-pointer"
      style={{ boxShadow: 'var(--shadow-elevation)' }}
      onClick={() => onViewDetails(item)}
      tabIndex={0}
      role="button"
      aria-label={`Production item for order ${item.orderNumber}, product ${item.product}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-2">
          <h4 className="text-md font-bold text-[var(--color-text-primary)]">Order #: {item.orderNumber}</h4>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Batch ID: {item.batchId || 'N/A'}</p>
        </div>
        {isRush && <Tag color="green">Rush! ⚡</Tag>}
      </div>
      <div className="flex items-center space-x-2 mt-2">
        {item.design_thumbnail_url && (
          <img src={item.design_thumbnail_url} alt="Design thumbnail" className="w-12 h-12 object-contain rounded" />
        )}
        <div className="flex-1">
          <p className="font-semibold text-[var(--color-brand-primary)]">{item.product}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Print Tech: {item.print_technology || 'N/A'}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Size: {item.print_size || 'N/A'}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Qty: {item.quantity}</p>
        </div>
      </div>
      {item.assigned_to && (
        <p className="text-xs text-[var(--color-text-secondary)] mt-2">Operator: {item.assigned_to}</p>
      )}
      {timerDisplay && item.productStatus === ProductWorkflowStatus.IN_PRODUCTION && (
        <div className="text-sm font-bold text-[var(--color-brand-primary)] mt-2">Timer: {timerDisplay}</div>
      )}

      <div className="mt-3 flex justify-end">
        {item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PRODUCTION && onAssignToOperator && (
          <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); onAssignToOperator(item); }} disabled={loading}>
            Assign Operator 👷
          </Button>
        )}
        {item.productStatus === ProductWorkflowStatus.IN_PRODUCTION && onMarkProductionComplete && (
          <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); onMarkProductionComplete(item); }} disabled={loading}>
            Complete Print ✅
          </Button>
        )}
        {item.productStatus === ProductWorkflowStatus.FINISHING_PENDING && onMarkFinishingComplete && (
          <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); onMarkFinishingComplete(item); }} disabled={loading}>
            Mark Finished ✨
          </Button>
        )}
        {item.productStatus === ProductWorkflowStatus.FULFILLMENT_PENDING && onMarkPacked && ( // NEW: Mark Packed button
          <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); onMarkPacked(item); }} disabled={loading}>
            Mark Packed 📦
          </Button>
        )}
        {item.productStatus === ProductWorkflowStatus.PACKED && onMarkShipped && ( // NEW: Mark Shipped button
          <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); onMarkShipped(item); }} disabled={loading}>
            Mark Shipped 🚚
          </Button>
        )}
      </div>
    </div>
  );
});

// Define the type for groupedItems
interface GroupedProductionItems {
  queued: Record<string, OrderItem[]>;
  printing: OrderItem[];
  finishing: OrderItem[];
  fulfillment: OrderItem[]; // NEW: Fulfillment Pending column
  packed: OrderItem[]; // NEW: Packed column
  shippedToday: OrderItem[]; // NEW: Shipped Today (for widget)
}

const ProductionScreenPage: React.FC<ProductionScreenPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, saveItem, handleGrantSheetsAccess,
  } = useOrder();
  const { team: teamMembers } = usePortfolio(); // Get team members for operator assignment

  const [filterOrderNumber, setFilterOrderNumber] = useState('');
  const [filterCustomerName, setFilterCustomerName] = useState('');
  const [filterProductionStation, setFilterProductionStation] = useState('');

  // Consolidated modal states
  const [assignModalState, setAssignModalState] = useState<{isOpen: boolean; item: OrderItem | null; groupKey: string}>({isOpen: false, item: null, groupKey: ''});
  const [completeProductionModalState, setCompleteProductionModalState] = useState<{isOpen: boolean; item: OrderItem | null}>({isOpen: false, item: null});
  const [completeFinishingModalState, setCompleteFinishingModalState] = useState<{isOpen: boolean; item: OrderItem | null}>({isOpen: false, item: null});
  const [markPackedModalState, setMarkPackedModalState] = useState<{isOpen: boolean; item: OrderItem | null}>({isOpen: false, item: null}); // NEW
  const [markShippedModalState, setMarkShippedModalState] = useState<{isOpen: boolean; item: OrderItem | null}>({isOpen: false, item: null}); // NEW
  const [detailDrawerState, setDetailDrawerState] = useState<{isOpen: boolean; item: OrderItem | null}>({isOpen: false, item: null});

  // Client-side tracking for top widget (Completed Today)
  const [packedTodayCount, setPackedTodayCount] = useState(0); // NEW: Renamed from printedTodayCount
  const [totalProductionTimeSeconds, setTotalProductionTimeSeconds] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    // Load counts for today, reset if day changes
    const loadDailyStats = () => {
      let storedCount = parseInt(localStorage.getItem('packedTodayCount') || '0', 10);
      let storedTime = parseInt(localStorage.getItem('totalProductionTimeSeconds') || '0', 10);
      const storedDate = localStorage.getItem('productionStatsDate');

      if (storedDate === today) {
        setPackedTodayCount(storedCount);
        setTotalProductionTimeSeconds(storedTime);
      } else {
        storedCount = 0;
        storedTime = 0;
        localStorage.setItem('packedTodayCount', '0');
        localStorage.setItem('totalProductionTimeSeconds', '0');
        localStorage.setItem('productionStatsDate', today);
        setPackedTodayCount(storedCount);
        setTotalProductionTimeSeconds(storedTime);
      }
    };
    loadDailyStats();
  }, []);

  const updateProductionMetrics = useCallback((timeTakenSeconds: number, updateType: 'printed' | 'packed') => { // NEW: updateType param
    const today = new Date().toISOString().split('T')[0];
    let currentPackedCount = parseInt(localStorage.getItem('packedTodayCount') || '0', 10);
    let currentTotalProductionTime = parseInt(localStorage.getItem('totalProductionTimeSeconds') || '0', 10);
    const lastDate = localStorage.getItem('productionStatsDate');

    if (lastDate !== today) {
      currentPackedCount = 0;
      currentTotalProductionTime = 0;
      localStorage.setItem('productionStatsDate', today);
    }
    
    if (updateType === 'packed') { // NEW: Only increment packed count if type is 'packed'
      currentPackedCount++;
      localStorage.setItem('packedTodayCount', String(currentPackedCount));
      setPackedTodayCount(currentPackedCount);
    }

    currentTotalProductionTime += timeTakenSeconds; // Always update total time with new item's time
    localStorage.setItem('totalProductionTimeSeconds', String(currentTotalProductionTime));
    setTotalProductionTimeSeconds(currentTotalProductionTime);
  }, []);


  const avgTimePerItem = useMemo(() => {
    return packedTodayCount > 0 ? (totalProductionTimeSeconds / packedTodayCount) : 0;
  }, [packedTodayCount, totalProductionTimeSeconds]); // NEW: Use packedTodayCount

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const filteredItems = useMemo(() => {
    return orderItems.filter(item => {
      const matchesOrderNumber = filterOrderNumber.trim() === '' || item.orderNumber?.toLowerCase().includes(filterOrderNumber.toLowerCase());
      const matchesCustomerName = filterCustomerName.trim() === '' || item.customerName?.toLowerCase().includes(filterCustomerName.toLowerCase());
      const matchesProductionStation = filterProductionStation.trim() === '' || item.production_station?.toLowerCase().includes(filterProductionStation.toLowerCase());
      return matchesOrderNumber && matchesCustomerName && matchesProductionStation;
    });
  }, [orderItems, filterOrderNumber, filterCustomerName, filterProductionStation]);

  const groupedItems: GroupedProductionItems = useMemo(() => {
    const queued: Record<string, OrderItem[]> = {}; // Grouped by production_station
    const printing: OrderItem[] = [];
    const finishing: OrderItem[] = [];
    const fulfillment: OrderItem[] = []; // NEW
    const packed: OrderItem[] = []; // NEW
    const shippedToday: OrderItem[] = []; // NEW

    const today = new Date().toISOString().split('T')[0];

    filteredItems.forEach(item => {
      if (item.productStatus === ProductWorkflowStatus.QUEUED_FOR_PRODUCTION) {
        const groupKey = item.production_station || 'Unassigned Station';
        if (!queued[groupKey]) {
          queued[groupKey] = [];
        }
        queued[groupKey].push(item);
      } else if (item.productStatus === ProductWorkflowStatus.IN_PRODUCTION) {
        printing.push(item);
      } else if (item.productStatus === ProductWorkflowStatus.FINISHING_PENDING) {
        finishing.push(item);
      } else if (item.productStatus === ProductWorkflowStatus.FULFILLMENT_PENDING) { // NEW
        fulfillment.push(item);
      } else if (item.productStatus === ProductWorkflowStatus.PACKED) { // NEW
        packed.push(item);
      } else if (item.shippedAt && new Date(item.shippedAt).toISOString().split('T')[0] === today) { // NEW
        shippedToday.push(item);
      }
    });

    return { queued, printing, finishing, fulfillment, packed, shippedToday }; // NEW: Return all groups
  }, [filteredItems]);


  // --- Modals & Actions ---

  // Assign to Operator (Queued Column)
  const handleOpenAssignModal = useCallback((item: OrderItem) => {
    setAssignModalState({isOpen: true, item: item, groupKey: item.production_station || 'Unassigned Station'});
  }, []);

  const handleSaveAssignedOperator = useCallback(async (itemIds: string[], operatorId: string, newStatus: ProductWorkflowStatus) => {
    if (!assignModalState.item) return;

    await Promise.all(itemIds.map(async (id) => {
        const itemToUpdate = orderItems.find(oi => oi.id === id);
        if (itemToUpdate) {
            await saveItem({
                ...itemToUpdate,
                assigned_to: operatorId,
                print_started_at: new Date().toISOString(),
                productStatus: newStatus,
                status: OrderStatus.PRODUCTION, // Also update overall order status
            });
        }
    }));
    setAssignModalState({isOpen: false, item: null, groupKey: ''});
  }, [assignModalState.item, orderItems, saveItem]);

  // Complete Production (Printing Column)
  const handleOpenCompleteProductionModal = useCallback((item: OrderItem) => {
    setCompleteProductionModalState({isOpen: true, item: item});
  }, []);

  const handleSaveProductionCompletion = useCallback(async (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => {
    if (!completeProductionModalState.item) return;
    await saveItem({ ...item, ...updatedFields, productStatus: newStatus, status: OrderStatus.PRODUCTION });
    // Update total production time for metrics. No longer counting individual 'printedTodayCount'.
    if (updatedFields.production_time_seconds !== undefined) {
      // The updateProductionMetrics now handles tracking total time for all items
      // completed, not just 'printed'. So it's more accurate to call it here.
      updateProductionMetrics(updatedFields.production_time_seconds, 'printed'); // Pass 'printed' type
    }
    setCompleteProductionModalState({isOpen: false, item: null});
  }, [saveItem, updateProductionMetrics, completeProductionModalState.item]);

  // Complete Finishing (Finishing Column)
  const handleOpenCompleteFinishingModal = useCallback((item: OrderItem) => {
    setCompleteFinishingModalState({isOpen: true, item: item});
  }, []);

  const handleSaveFinishingCompletion = useCallback(async (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => {
    if (!completeFinishingModalState.item) return;
    await saveItem({ ...item, ...updatedFields, productStatus: newStatus, status: OrderStatus.FULFILLMENT }); // Update overall order status to FULFILLMENT
    setCompleteFinishingModalState({isOpen: false, item: null});
  }, [saveItem, completeFinishingModalState.item]);

  // Mark Packed (Fulfillment Column) - NEW
  const handleOpenMarkPackedModal = useCallback((item: OrderItem) => {
    setMarkPackedModalState({isOpen: true, item: item});
  }, []);

  const handleSaveMarkPacked = useCallback(async (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => {
    if (!markPackedModalState.item) return;
    await saveItem({ ...item, ...updatedFields, productStatus: newStatus, status: OrderStatus.FULFILLMENT }); // Still in fulfillment, just packed state
    // Update the packedTodayCount for the widget when item is packed.
    updateProductionMetrics(0, 'packed'); // timeTakenSeconds can be 0 here as we just track packed count
    setMarkPackedModalState({isOpen: false, item: null});
  }, [saveItem, updateProductionMetrics, markPackedModalState.item]);


  // Mark Shipped (Packed Column) - NEW
  const handleOpenMarkShippedModal = useCallback((item: OrderItem) => {
    setMarkShippedModalState({isOpen: true, item: item});
  }, []);

  const handleSaveMarkShipped = useCallback(async (item: OrderItem, updatedFields: Partial<OrderItem>, newStatus: ProductWorkflowStatus) => {
    if (!markShippedModalState.item) return;
    await saveItem({ ...item, ...updatedFields, productStatus: newStatus, status: OrderStatus.SHIPPED }); // Update overall order status to SHIPPED
    setMarkShippedModalState({isOpen: false, item: null});
  }, [saveItem, markShippedModalState.item]);


  // Detail Drawer Handlers
  const handleViewDetails = useCallback((item: OrderItem) => {
    setDetailDrawerState({isOpen: true, item: item});
  }, []);

  const handleCloseDetailDrawer = useCallback(() => {
    setDetailDrawerState({isOpen: false, item: null});
  }, []);

  const handleEditFromDrawer = useCallback((item: OrderItem) => {
    setDetailDrawerState({isOpen: false, item: null}); // Close drawer
    // Route to appropriate action modal based on item's status
    switch (item.productStatus) {
      case ProductWorkflowStatus.QUEUED_FOR_PRODUCTION:
        handleOpenAssignModal(item);
        break;
      case ProductWorkflowStatus.IN_PRODUCTION:
        handleOpenCompleteProductionModal(item);
        break;
      case ProductWorkflowStatus.FINISHING_PENDING:
        handleOpenCompleteFinishingModal(item);
        break;
      case ProductWorkflowStatus.FULFILLMENT_PENDING: // NEW
        handleOpenMarkPackedModal(item);
        break;
      case ProductWorkflowStatus.PACKED: // NEW
        handleOpenMarkShippedModal(item);
        break;
      default:
        alert("Editing for this item's current status is not available from here.");
        break;
    }
  }, [handleOpenAssignModal, handleOpenCompleteProductionModal, handleOpenCompleteFinishingModal, handleOpenMarkPackedModal, handleOpenMarkShippedModal]);

  const handleDeleteFromDrawer = useCallback(async (item: OrderItem) => {
    setDetailDrawerState({isOpen: false, item: null}); // Close drawer
    if (confirm(`Are you sure you want to revert this item (${item.product}) from order ${item.orderNumber} to a previous stage or mark as rejected?`)) {
        await saveItem({ ...item, productStatus: ProductWorkflowStatus.DESIGN_REJECTED, status: OrderStatus.CANCELLED });
    }
  }, [saveItem]);


  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Data 🔄'}
      </Button>
      <Input
        placeholder="Filter by Order #"
        value={filterOrderNumber}
        onChange={(e) => setFilterOrderNumber(e.target.value)}
        className="w-40"
        aria-label="Filter by order number"
      />
      <Input
        placeholder="Filter by Customer"
        value={filterCustomerName}
        onChange={(e) => setFilterCustomerName(e.target.value)}
        className="w-48"
        aria-label="Filter by customer name"
      />
      <Input
        placeholder="Filter by Station"
        value={filterProductionStation}
        onChange={(e) => setFilterProductionStation(e.target.value)}
        className="w-48"
        aria-label="Filter by production station"
      />
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Production Screen data"
            description="Connect your Google account to manage production workflows from Google Sheets."
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

  if (loading && !orderItems.length) {
    return (
      <ManagerEditorLayout title={title}>
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading production screen data...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Production Screen" : "No Order Data Found"}
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
      <p className="mb-8 text-[var(--color-text-secondary)]">Manage item production through various stages: queuing, printing, and finishing.</p>

      {/* Top Widget */}
      <Card title="Production Stats" className="mb-6">
        <div className="flex flex-wrap justify-around items-center text-center text-sm gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--color-brand-primary)]">{packedTodayCount}</p>
            <p className="text-[var(--color-text-secondary)]">Packed Items Today ✅</p> {/* NEW: Renamed */}
          </div>
          <div>
            <p className="text-2xl font-bold text-[var(--color-brand-primary)]">
              {avgTimePerItem > 0 ? `${(avgTimePerItem / 60).toFixed(1)} min/item` : 'N/A'}
            </p>
            <p className="text-[var(--color-text-secondary)]">Avg. Production Time</p> {/* NEW: Renamed */}
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      {(Object.keys(groupedItems.queued).length === 0 && groupedItems.printing.length === 0 && groupedItems.finishing.length === 0 && groupedItems.fulfillment.length === 0 && groupedItems.packed.length === 0) && !loading ? ( // NEW: Check all columns
        <EmptyState title="No Items in Production" description="There are no items in the production workflow or they do not match current filters." />
      ) : (
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar flex-1">
          {/* Column 1: Queued */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.QUEUED_FOR_PRODUCTION)} Queued ({Object.values(groupedItems.queued).flat().length} items)</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {Object.keys(groupedItems.queued).length > 0 ? (
                  Object.entries(groupedItems.queued).flatMap(([groupKey, items]) => (
                    <React.Fragment key={groupKey}>
                      <h4 className="text-sm font-bold uppercase text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-stage)] py-1 -mx-2 px-2 z-10">{groupKey}</h4>
                      {items.map(item => (
                        <ProductionCard
                          key={item.id}
                          item={item}
                          onViewDetails={handleViewDetails}
                          onAssignToOperator={handleOpenAssignModal}
                          loading={loading}
                        />
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items queued for production." />
                )}
              </div>
            </Card>
          </div>

          {/* Column 2: Printing */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.IN_PRODUCTION)} Printing ({ groupedItems.printing.length })</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {groupedItems.printing.length > 0 ? (
                  groupedItems.printing.map((item) => (
                    <ProductionCard
                      key={item.id}
                      item={item}
                      onViewDetails={handleViewDetails}
                      onMarkProductionComplete={handleOpenCompleteProductionModal}
                      loading={loading}
                    />
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items currently in production." />
                )}
              </div>
            </Card>
          </div>

          {/* Column 3: Finishing */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.FINISHING_PENDING)} Finishing ({ groupedItems.finishing.length })</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {groupedItems.finishing.length > 0 ? (
                  groupedItems.finishing.map((item) => (
                    <ProductionCard
                      key={item.id}
                      item={item}
                      onViewDetails={handleViewDetails}
                      onMarkFinishingComplete={handleOpenCompleteFinishingModal}
                      loading={loading}
                    />
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items awaiting finishing." />
                )}
              </div>
            </Card>
          </div>

          {/* NEW Column 4: Fulfillment Pending */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.FULFILLMENT_PENDING)} Fulfillment ({ groupedItems.fulfillment.length })</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {groupedItems.fulfillment.length > 0 ? (
                  groupedItems.fulfillment.map((item) => (
                    <ProductionCard
                      key={item.id}
                      item={item}
                      onViewDetails={handleViewDetails}
                      onMarkPacked={handleOpenMarkPackedModal}
                      loading={loading}
                    />
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items awaiting packing." />
                )}
              </div>
            </Card>
          </div>

          {/* NEW Column 5: Packed */}
          <div className="flex-none w-[320px] max-h-full mr-6">
            <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductWorkflowStatusEmoji(ProductWorkflowStatus.PACKED)} Packed ({ groupedItems.packed.length })</h3>} className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {groupedItems.packed.length > 0 ? (
                  groupedItems.packed.map((item) => (
                    <ProductionCard
                      key={item.id}
                      item={item}
                      onViewDetails={handleViewDetails}
                      onMarkShipped={handleOpenMarkShippedModal}
                      loading={loading}
                    />
                  ))
                ) : (
                  <EmptyState title="No Items" description="No items packed, awaiting shipment." />
                )}
              </div>
            </Card>
          </div>

          {/* Column for Shipped Today (for widget reference, not a direct workflow column now) - REMOVED from Kanban visually, moved to widget logic */}
        </div>
      )}

      {/* Modals */}
      <AssignToOperatorModal
        isOpen={assignModalState.isOpen}
        onClose={() => setAssignModalState({isOpen: false, item: null, groupKey: ''})}
        items={assignModalState.item ? [assignModalState.item] : []}
        onSave={handleSaveAssignedOperator}
        loading={loading}
        groupKey={`${assignModalState.item?.product} (Order #${assignModalState.item?.orderNumber})`}
        teamMembers={teamMembers}
      />

      <MarkProductionCompleteModal
        isOpen={completeProductionModalState.isOpen}
        onClose={() => setCompleteProductionModalState({isOpen: false, item: null})}
        item={completeProductionModalState.item}
        onSave={handleSaveProductionCompletion}
        loading={loading}
      />

      <MarkFinishingCompleteModal
        isOpen={completeFinishingModalState.isOpen}
        onClose={() => setCompleteFinishingModalState({isOpen: false, item: null})}
        item={completeFinishingModalState.item}
        onSave={handleSaveFinishingCompletion}
        loading={loading}
        teamMembers={teamMembers}
      />

      {/* NEW: Mark Packed Modal */}
      <MarkPackedModal
        isOpen={markPackedModalState.isOpen}
        onClose={() => setMarkPackedModalState({isOpen: false, item: null})}
        item={markPackedModalState.item}
        onSave={handleSaveMarkPacked}
        loading={loading}
        teamMembers={teamMembers}
      />

      {/* NEW: Mark Shipped Modal */}
      <MarkShippedModal
        isOpen={markShippedModalState.isOpen}
        onClose={() => setMarkShippedModalState({isOpen: false, item: null})}
        item={markShippedModalState.item}
        onSave={handleSaveMarkShipped}
        loading={loading}
      />

      <OrderItemDetailDrawer
        isOpen={detailDrawerState.isOpen}
        onClose={() => setDetailDrawerState({isOpen: false, item: null})}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        data={detailDrawerState.item}
        isMockMode={isMockMode}
      />
    </ManagerEditorLayout>
  );
};

export default ProductionScreenPage;