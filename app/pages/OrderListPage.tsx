// pages/AllOrderItemsPage.tsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, ManagerEditorLayout, Select, Modal, ConfirmDialog } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { OrderItem, OrderStatus, AcceptanceStatus, PaymentMode, OrderType, AllOrderItemsPageProps } from '../types';
import OrderItemForm from '../components/orders/OrderItemForm'; // NEW
import OrderItemDetailDrawer from '../components/orders/OrderItemDetailDrawer'; // NEW

const AllOrderItemsPage: React.FC<AllOrderItemsPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, handleGrantSheetsAccess, saveItem, deleteItem, // NEW: Import saveItem and deleteItem
  } = useOrder();

  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  
  // NEW: State for Add/Edit Form Modal
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);

  // NEW: State for Delete Confirmation Dialog
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);

  // NEW: State for Detail Drawer
  const [detailOrderItem, setDetailOrderItem] = useState<OrderItem | null>(null);


  const filteredOrderItems = useMemo(() => {
    let currentItems = orderItems;

    if (orderNumberFilter.trim()) {
      currentItems = currentItems.filter(item =>
        item.orderNumber.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    if (customerNameFilter.trim()) {
      currentItems = currentItems.filter(item =>
        item.customerName.toLowerCase().includes(customerNameFilter.toLowerCase())
      );
    }
    if (statusFilter !== 'All') {
      currentItems = currentItems.filter(item => item.status === statusFilter);
    }

    return currentItems;

  }, [orderItems, orderNumberFilter, customerNameFilter, statusFilter]);

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const orderStatusOptions = useMemo(() => ['All', ...Object.values(OrderStatus).sort()], []);

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
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Order Item
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
        options={orderStatusOptions.map(s => ({ value: s, label: s }))}
        value={statusFilter}
        onChange={(val) => setStatusFilter(val as OrderStatus | 'All')}
        placeholder="Filter by Status"
        className="w-40"
        aria-label="Filter orders by status"
      />
    </div>
  );

  const tableHeaders = useMemo(() => [
    'Order #', 'Date', 'Customer', 'Product', 'Variant', 'Qty', 'Amount', 'Status', 'Actions' // NEW: Add 'Actions' header
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
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
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading order data from Google Sheet...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Orders" : "No Orders Found"}
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
    <ManagerEditorLayout title={title} toolbar={toolbar}>
      <p className="mb-8 text-[var(--color-text-secondary)]">Comprehensive view of all customer orders, including individual product lines.</p>

      {filteredOrderItems.length === 0 ? (
        <EmptyState
          title="No Orders Found"
          description="Your sheet is either empty or no orders match the current filters."
          action={!isMockMode && <Button variant="primary" onClick={() => handleOpenForm(null)}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Order</Button>}
        />
      ) : (
        <Table headers={tableHeaders}>
          {filteredOrderItems.map((item, index) => (
            <tr key={`${item.orderNumber}-${item.id || index}`} // Use item.id for key if available, fallback to index
                className="hover:bg-[var(--color-bg-stage)]/80 group cursor-pointer"
                onClick={() => handleRowClick(item)}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRowClick(item)}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-brand-primary)]">{item.orderNumber}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-secondary)]">{item.date}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--color-text-primary)]">{item.customerName}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.product}</td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.variant}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{item.quantity}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                {item.totalAmountWithTax !== undefined ? `₹${item.totalAmountWithTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {item.status && <StatusPill status={item.status}>{item.status}</StatusPill>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                {!isMockMode && (
                  <div className="flex space-x-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm(item); }} title="Edit Order">✏️</Button>
                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleConfirmDelete(item); }} title="Delete Order">🗑️</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
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
        title="Confirm Order Deletion"
        body={`Are you sure you want to clear order "${itemToDelete?.orderNumber}"? This action will clear the row in Google Sheets.`}
        confirmLabel="Clear Row"
        tone="danger"
      />
    </ManagerEditorLayout>
  );
};

export default AllOrderItemsPage;