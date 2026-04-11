// pages/OrderListProductsPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, ManagerEditorLayout, Select, Modal, ConfirmDialog } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { OrderItem, OrderStatus, ProductWorkflowStatus, OrderListProductsPageProps } from '../types';
import OrderItemForm from '../components/orders/OrderItemForm';
import OrderItemDetailDrawer from '../components/orders/OrderItemDetailDrawer';
import { getProductWorkflowStatusEmoji } from '../utils/orderUtils';
import DemoModeBanner from '../components/layout/DemoModeBanner';

const OrderListProductsPage: React.FC<OrderListProductsPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, handleGrantSheetsAccess, saveItem, deleteItem,
  } = useOrder();

  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [productNameFilter, setProductNameFilter] = useState('');
  const [printTechnologyFilter, setPrintTechnologyFilter] = useState('All');
  const [productStatusFilter, setProductStatusFilter] = useState<ProductWorkflowStatus | 'All'>('All');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);
  const [detailOrderItem, setDetailOrderItem] = useState<OrderItem | null>(null);

  const filteredOrderItems = useMemo(() => {
    let currentItems = orderItems;

    if (orderNumberFilter.trim()) {
      currentItems = currentItems.filter(item =>
        item.orderNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    if (productNameFilter.trim()) {
      currentItems = currentItems.filter(item =>
        item.product?.toLowerCase().includes(productNameFilter.toLowerCase())
      );
    }
    if (printTechnologyFilter !== 'All') {
      currentItems = currentItems.filter(item => item.print_technology === printTechnologyFilter);
    }
    if (productStatusFilter !== 'All') {
      currentItems = currentItems.filter(item => item.productStatus === productStatusFilter);
    }

    return currentItems;
  }, [orderItems, orderNumberFilter, productNameFilter, printTechnologyFilter, productStatusFilter]);

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

  const productWorkflowStatusOptions = useMemo(() => ['All', ...Object.values(ProductWorkflowStatus).sort()], []);
  const printTechnologyOptions = useMemo(() => {
    const technologies = new Set<string>();
    orderItems.forEach(item => {
      if (item.print_technology && item.print_technology.trim() !== '') {
        technologies.add(item.print_technology.trim());
      }
    });
    return ['All', ...Array.from(technologies).sort()];
  }, [orderItems]);

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
    setDetailOrderItem(null);
    handleOpenForm(item);
  }, [handleOpenForm]);

  const handleDeleteFromDrawer = useCallback((item: OrderItem) => {
    setDetailOrderItem(null);
    handleConfirmDelete(item);
  }, [handleConfirmDelete]);

  const handleOpenDesignFile = useCallback((e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const toolbar = (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleLoadData} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh Products 🔄'}
      </Button>
      {!isMockMode && (
        <Button onClick={() => handleOpenForm(null)} disabled={isAuthActionInProgress} variant="accent">
          <span role="img" aria-label="plus" className="mr-2">➕</span>Add Product Item
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
        placeholder="Filter by Product Name"
        value={productNameFilter}
        onChange={(e) => setProductNameFilter(e.target.value)}
        className="w-48"
        aria-label="Filter by product name"
      />
      <Select
        options={printTechnologyOptions.map(s => ({ value: s, label: s }))}
        value={printTechnologyFilter}
        onChange={(val) => setPrintTechnologyFilter(val)}
        placeholder="Filter by Print Tech"
        className="w-40"
        aria-label="Filter by print technology"
      />
      <Select
        options={productWorkflowStatusOptions.map(s => ({ value: s, label: s }))}
        value={productStatusFilter}
        onChange={(val) => setProductStatusFilter(val as ProductWorkflowStatus | 'All')}
        placeholder="Filter by Product Status"
        className="w-40"
        aria-label="Filter by product workflow status"
      />
    </div>
  );

  const tableHeaders = useMemo(() => [
    'Order #', 'Product', 'Variant', 'Qty', 'Design File', 'Print Tech', 'Status', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Product Order List"
            description="Connect your Google account to fetch and view your product order data from Google Sheets."
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
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading product order data from Google Sheet...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Products List" : "No Product Order Data Found"}
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
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">Focused view on individual product items, their design files, and production details.</p>

      {filteredOrderItems.length === 0 ? (
        <EmptyState
          title="No Product Order Items Found"
          description="Your sheet is either empty or no items match the current filters. Add some product items or adjust filters to see them here."
          action={!isMockMode && <Button variant="primary" onClick={() => handleOpenForm(null)}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Product Item</Button>}
        />
      ) : (
        <Table headers={tableHeaders}>
          {filteredOrderItems.map((item, index) => (
            <tr key={item.id || index}
                className="hover:bg-[var(--color-bg-stage)]/80 group cursor-pointer"
                onClick={() => handleRowClick(item)}
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRowClick(item)}>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-brand-primary)]">{item.orderNumber}</td>
              <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
                {item.design_thumbnail_url && (
                    <img src={item.design_thumbnail_url} alt="Design thumbnail" className="inline-block w-8 h-8 object-contain rounded mr-2" />
                )}
                {item.product}
              </td>
              <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{item.variant}</td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">{item.quantity}</td>
              <td className="px-4 py-3 text-sm">
                {item.design_file_url ? (
                  <Button size="sm" variant="secondary" onClick={(e) => handleOpenDesignFile(e, item.design_file_url!)} title="Open Design File">
                    <span role="img" aria-label="file" className="mr-1">📄</span> Open
                  </Button>
                ) : (
                  <span className="text-[var(--color-text-secondary)] italic">N/A</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {item.print_technology && <StatusPill status={item.print_technology}>{item.print_technology}</StatusPill>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
                {item.productStatus && <StatusPill status={item.productStatus}>{getProductWorkflowStatusEmoji(item.productStatus)} {item.productStatus}</StatusPill>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                {!isMockMode && (
                  <div className="flex space-x-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm(item); }} title="Edit Product Item">✏️</Button>
                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleConfirmDelete(item); }} title="Delete Product Item">🗑️</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}

      {/* Order Item Detail Drawer */}
      <OrderItemDetailDrawer
        isOpen={!!detailOrderItem}
        onClose={handleCloseDetailDrawer}
        onEdit={handleEditFromDrawer}
        onDelete={handleDeleteFromDrawer}
        data={detailOrderItem}
        isMockMode={isMockMode}
      />

      {/* Order Item Form Modal */}
      <Modal open={isFormModalOpen} onClose={handleCloseForm} title={editingOrderItem ? 'Edit Product Item' : 'Add New Product Item'}>
        <OrderItemForm
          item={editingOrderItem}
          onSave={handleSave}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={isConfirmDeleteOpen}
        onCancel={handleCancelDelete}
        onConfirm={handleExecuteDelete}
        title="Confirm Product Item Deletion"
        body={`Are you sure you want to clear product "${itemToDelete?.product}" from order "${itemToDelete?.orderNumber}"? This action will clear the row in Google Sheets.`}
        confirmLabel="Clear Row"
        tone="danger"
      />
    </ManagerEditorLayout>
  );
};

export default OrderListProductsPage;