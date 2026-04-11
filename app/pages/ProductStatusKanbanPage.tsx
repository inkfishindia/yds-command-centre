// pages/ProductStatusKanbanPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, StatusPill, ManagerEditorLayout, Select } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { OrderItem, OrderStatus } from '../types';
import OrderItemForm from '../components/orders/OrderItemForm';
import OrderItemDetailDrawer from '../components/orders/OrderItemDetailDrawer';
import { Modal, ConfirmDialog } from '../ui';
// NEW: Import shared utility functions
import { getProductStatusEmoji } from '../utils/orderUtils';


const ProductStatusKanbanPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, handleGrantSheetsAccess, saveItem, deleteItem,
  } = useOrder();

  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'All'>('All');
  
  // State for Add/Edit Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);

  // State for Delete Confirmation Dialog
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);

  // State for Detail Drawer
  const [detailOrderItem, setDetailOrderItem] = useState<OrderItem | null>(null);

  const uniqueProductStatuses = useMemo(() => {
    const statuses = new Set<string>();
    orderItems.forEach(item => {
      if (item.productStatus && item.productStatus.trim() !== '') {
        statuses.add(item.productStatus.trim());
      }
    });
    const sortedStatuses = Array.from(statuses).sort();
    if (sortedStatuses.length === 0) {
      // Add a default placeholder if no statuses are found
      return ['Unassigned'];
    }
    // Ensure "Unassigned" is always an option if there are items without status
    if (orderItems.some(item => !item.productStatus || item.productStatus.trim() === '')) {
      return ['Unassigned', ...sortedStatuses];
    }
    return sortedStatuses;
  }, [orderItems]);

  const filteredOrderItems = useMemo(() => {
    let currentItems = orderItems;

    if (orderNumberFilter.trim()) {
      currentItems = currentItems.filter(item =>
        // FIX: Add optional chaining for item.orderNumber
        item.orderNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    if (customerNameFilter.trim()) {
      currentItems = currentItems.filter(item =>
        // FIX: Add optional chaining for item.customerName
        item.customerName?.toLowerCase().includes(customerNameFilter.toLowerCase())
      );
    }
    if (orderStatusFilter !== 'All') {
      currentItems = currentItems.filter(item => item.status === orderStatusFilter);
    }
    return currentItems;
  }, [orderItems, orderNumberFilter, customerNameFilter, orderStatusFilter]);

  const groupedItemsByProductStatus = useMemo(() => {
    return uniqueProductStatuses.reduce((acc, status) => {
      const itemsInStatus = filteredOrderItems.filter(item => 
        (status === 'Unassigned' && (!item.productStatus || item.productStatus.trim() === '')) ||
        (item.productStatus && item.productStatus.trim() === status)
      );
      acc[status] = itemsInStatus;
      return acc;
    }, {} as Record<string, OrderItem[]>);
  }, [uniqueProductStatuses, filteredOrderItems]);

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const allOrderStatuses = useMemo(() => Object.values(OrderStatus).sort(), []);
  const orderStatusFilterOptions = useMemo(() => ['All', ...allOrderStatuses].map(s => ({ value: s, label: s })), [allOrderStatuses]);

  // NEW: CRUD Operations & Detail Drawer
  const handleOpenForm = useCallback((item: OrderItem | null) => {
    setEditingOrderItem(item);
    setIsFormModalOpen(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setIsFormModalOpen(false);
    setEditingOrderItem(null);
  }, []);

  const handleSave = useCallback(async (itemData: Partial<OrderItem>) => {
    await saveItem(itemData);
    handleCloseForm();
  }, [saveItem, handleCloseForm]);

  const handleConfirmDelete = useCallback((item: OrderItem) => {
    setItemToDelete(item);
    setIsConfirmDeleteOpen(true);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsConfirmDeleteOpen(false);
    setItemToDelete(null);
  }, []);

  const handleExecuteDelete = useCallback(async () => {
    if (itemToDelete) {
      await deleteItem(itemToDelete);
      handleCancelDelete();
    }
  }, [itemToDelete, deleteItem, handleCancelDelete]);

  const handleRowClick = useCallback((item: OrderItem) => {
    setDetailOrderItem(item);
  }, []);

  const handleCloseDetailDrawer = useCallback(() => {
    setDetailOrderItem(null);
  }, []);

  const handleEditFromDrawer = useCallback((item: OrderItem) => {
    setDetailOrderItem(null); // Close drawer
    handleOpenForm(item); // Open edit form
  }, [handleOpenForm]);

  const handleDeleteFromDrawer = useCallback((item: OrderItem) => {
    setDetailOrderItem(null); // Close drawer
    handleConfirmDelete(item); // Open delete confirm
  }, [handleConfirmDelete]);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Orders 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Order
        </Button>
      )}
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
        options={orderStatusFilterOptions}
        value={orderStatusFilter}
        onChange={(val) => setOrderStatusFilter(val as OrderStatus | 'All')}
        placeholder="Filter by Order Status"
        className="w-40"
        aria-label="Filter orders by status"
      />
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Product Status (Kanban)">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Order Data"
            description="Connect your Google account to fetch and view your order list from Google Sheets."
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
      <ManagerEditorLayout title="Product Status (Kanban)">
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
      <ManagerEditorLayout title="Product Status (Kanban)">
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading product status data from Google Sheet...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title="Product Status (Kanban)">
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Product Status" : "No Order Data Found"}
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
    <ManagerEditorLayout title="Product Status (Kanban)" toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Visualize and manage individual product items by their current processing status.</p>

      {Object.keys(groupedItemsByProductStatus).length === 0 ? (
        <EmptyState
          title="No Product Items Found"
          description="Your sheet is either empty or no items match the current filters. Ensure items have a 'product status' defined."
          action={!isMockMode && <Button variant="primary" onClick={() => handleOpenForm(null)}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Order Item</Button>}
        />
      ) : (
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar flex-1">
          {uniqueProductStatuses.map((status: string) => {
            const itemsInStatus = groupedItemsByProductStatus[status];
            if (!itemsInStatus || itemsInStatus.length === 0) {
              return null; // Don't render empty columns if there are no items
            }
            return (
              <div key={status} className="flex-none w-[280px] max-h-full mr-6">
                <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getProductStatusEmoji(status)} {status} ({itemsInStatus.length})</h3>} className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto space-y-4 p-4">
                    {itemsInStatus.length > 0 ? (
                      itemsInStatus.map((item) => (
                        <div
                          key={item.id || `${item.orderNumber}-${item.product}-${item.variant}`}
                          className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-transparent hover:border-[var(--color-border-primary)] group cursor-pointer"
                          style={{ boxShadow: 'var(--shadow-elevation)' }}
                          onClick={() => handleRowClick(item)}
                          tabIndex={0}
                          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRowClick(item)}
                          role="button"
                          aria-label={`View details for product ${item.product} in order ${item.orderNumber}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-md font-bold text-[var(--color-text-primary)]">{item.product}</h4>
                              <p className="text-xs text-[var(--color-text-secondary)] mt-1">Order #: {item.orderNumber}</p>
                            </div>
                            <StatusPill status={item.status}>{item.status}</StatusPill>
                          </div>
                          <div className="space-y-1 text-sm mt-2">
                            <div>
                              <p className="font-semibold text-[var(--color-brand-primary)]">Customer:</p>
                              <p className="text-[var(--color-text-secondary)]">{item.customerName}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--color-brand-primary)]">Variant:</p>
                              <p className="text-[var(--color-text-secondary)]">{item.variant}</p>
                            </div>
                            <div>
                              <p className="font-semibold text-[var(--color-brand-primary)]">Quantity:</p>
                              <p className="text-[var(--color-text-secondary)]">{item.quantity}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <EmptyState title="No Items" description={`No items in "${status}" status.`} />
                    )}
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW: Order Detail Drawer */}
      <OrderItemDetailDrawer
        isOpen={!!detailOrderItem}
        onClose={handleCloseDetailDrawer}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        data={detailOrderItem}
        isMockMode={isMockMode}
      />

      {/* NEW: Order Form Modal */}
      <Modal open={isFormModalOpen} onClose={handleCloseForm} title={editingOrderItem ? 'Edit Order Item' : 'Add New Order Item'}>
        <OrderItemForm
          item={editingOrderItem}
          onSave={handleSave}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* NEW: Confirm Delete Dialog */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleExecuteDelete}
        title="Confirm Order Item Deletion"
        body={`Are you sure you want to clear the product "${itemToDelete?.product}" from order "${itemToDelete?.orderNumber}"? This action will clear the row in Google Sheets.`}
        confirmLabel="Clear Row"
        tone="danger"
      />
    </ManagerEditorLayout>
  );
};

export default ProductStatusKanbanPage;