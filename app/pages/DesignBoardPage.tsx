// pages/DesignBoardPage.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { Card, Button, Input, EmptyState, Table, StatusPill, ManagerEditorLayout, Select, Modal, ConfirmDialog, Tag } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useOrder } from '../contexts/OrderContext';
import { OrderItem, OrderStatus, ProductWorkflowStatus, DesignBoardPageProps } from '../types';
import OrderItemForm from '../components/orders/OrderItemForm';
import OrderItemDetailDrawer from '../components/orders/OrderItemDetailDrawer';
import { getProductWorkflowStatusEmoji, getDueDatePill, getOrderTypeTagColor, getSalesChannelTagColor } from '../utils/orderUtils';
import DemoModeBanner from '../components/layout/DemoModeBanner';

const DesignBoardPage: React.FC<DesignBoardPageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const {
    orderItems, orderSheetId, setOrderSheetId,
    loading, error, initialLoadComplete, showPermissionPrompt,
    loadOrders, handleGrantSheetsAccess, saveItem, deleteItem,
  } = useOrder();

  const [orderNumberFilter, setOrderNumberFilter] = useState('');
  const [productNameFilter, setProductNameFilter] = useState('');
  const [printTechnologyFilter, setPrintTechnologyFilter] = useState('All');
  const [rushOnlyFilter, setRushOnlyFilter] = useState(false); // NEW: Rush only filter


  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOrderItem, setEditingOrderItem] = useState<OrderItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<OrderItem | null>(null);
  const [detailOrderItem, setDetailOrderItem] = useState<OrderItem | null>(null);

  const filteredDesignItems = useMemo(() => {
    // Core rule: items needing design are those where design_file_url is empty
    // AND print_technology is set and not 'none' (assuming 'none' means no print needed).
    let itemsNeedingDesign = orderItems.filter(item => 
      (!item.design_file_url || item.design_file_url.trim() === '') &&
      item.print_technology && item.print_technology.trim().toLowerCase() !== 'none'
    );

    // Apply additional filters
    if (orderNumberFilter.trim()) {
      itemsNeedingDesign = itemsNeedingDesign.filter(item =>
        item.orderNumber?.toLowerCase().includes(orderNumberFilter.toLowerCase())
      );
    }
    if (productNameFilter.trim()) {
      itemsNeedingDesign = itemsNeedingDesign.filter(item =>
        item.product?.toLowerCase().includes(productNameFilter.toLowerCase())
      );
    }
    if (printTechnologyFilter !== 'All') {
      itemsNeedingDesign = itemsNeedingDesign.filter(item => item.print_technology === printTechnologyFilter);
    }
    if (rushOnlyFilter) { // NEW: Apply rush only filter
      itemsNeedingDesign = itemsNeedingDesign.filter(item => item.is_rush_order);
    }

    return itemsNeedingDesign;
  }, [orderItems, orderNumberFilter, productNameFilter, printTechnologyFilter, rushOnlyFilter]);

  const handleLoadData = useCallback(() => {
    loadOrders(true);
  }, [loadOrders]);

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
        {loading ? 'Refreshing...' : 'Refresh Designs 🔄'}
      </Button>
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
        placeholder="Print Technology"
        className="w-40"
        aria-label="Filter by print technology"
      />
      <div className="flex items-center gap-2"> {/* NEW: Group checkbox with label */}
        <input
          id="rushOnlyFilter"
          type="checkbox"
          checked={rushOnlyFilter}
          onChange={(e) => setRushOnlyFilter(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--color-border-primary)] text-[var(--color-brand-primary)] focus:ring-[var(--color-brand-primary)]"
          aria-label="Filter for rush orders only"
        />
        <label htmlFor="rushOnlyFilter" className="text-sm text-[var(--color-text-secondary)]">Rush only</label>
      </div>
    </div>
  );

  const tableHeaders = useMemo(() => [
    'Order #', 'Product', 'Qty', 'Print', 'Due', 'Actions'
  ], []);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to access Design Board data"
            description="Connect your Google account to manage product designs from Google Sheets."
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
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading design board data...</div>
        </Card>
      </ManagerEditorLayout>
    );
  }

  if ((!orderSheetId || error) && !orderItems.length && !isMockMode) {
    return (
      <ManagerEditorLayout title={title}>
        <Card title={error ? "Data Load Error" : "Configure Data Source"}>
          <EmptyState
            title={error ? "Failed to load Design Board" : "No Order Data Found"}
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
        This board shows all order items that require a design file based on their `print_technology` and a missing `design_file_url`.
      </p>

      {filteredDesignItems.length === 0 ? (
        <EmptyState
          title="No Designs Pending"
          description="All order items have design files or do not require one based on their print technology. Great job!"
        />
      ) : (
        <Table headers={tableHeaders}>
          {filteredDesignItems.map((item, index) => {
            const dueDatePill = getDueDatePill(item.expectedShipDate, item.is_rush_order);
            return (
              <tr key={item.id || index}
                  className="hover:bg-[var(--color-bg-stage)]/80 group cursor-pointer"
                  onClick={() => handleRowClick(item)}
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleRowClick(item)}>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-brand-primary)]">
                  <a href={`#/order_management/order_list_summary`} // Link to order summary (root of order)
                     onClick={(e) => {
                        e.stopPropagation(); // Prevent opening item detail drawer
                        // Optionally, set state to filter summary page for this order, or pass order number
                        // window.location.hash = `#/order_management/order_list_summary?order=${item.orderNumber}`;
                     }}
                     className="hover:underline"
                  >
                    {item.orderNumber}
                  </a>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-primary)]">
                  <div className="flex items-center">
                    {item.design_thumbnail_url && (
                        <img src={item.design_thumbnail_url} alt="Design thumbnail" className="inline-block w-8 h-8 object-contain rounded mr-2" />
                    )}
                    <div>
                      <p>{item.product}</p>
                      {item.variant && <p className="text-xs text-[var(--color-text-secondary)]">{item.variant}</p>}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.salesChannel && <Tag color={getSalesChannelTagColor(item.salesChannel)}>{item.salesChannel}</Tag>}
                        {item.orderType && <Tag color={getOrderTypeTagColor(item.orderType)}>{item.orderType}</Tag>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)] text-right">{item.quantity}</td>
                <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">
                  <div className="flex flex-col">
                    <StatusPill status={item.print_technology}>{item.print_technology || 'N/A'}</StatusPill>
                    {item.print_location && <span className="text-xs text-[var(--color-text-secondary)] mt-1">{item.print_location}</span>}
                    {item.print_size && <span className="text-xs text-[var(--color-text-secondary)]">{item.print_size}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--color-text-primary)]">
                  <div className="flex flex-col">
                    {item.expectedShipDate && <span className="text-xs text-[var(--color-text-secondary)]">{new Date(item.expectedShipDate).toLocaleDateString()}</span>}
                    <StatusPill status={dueDatePill.color}>{dueDatePill.label}</StatusPill>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  {!isMockMode && (
                    <div className="flex space-x-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="accent" onClick={(e) => { e.stopPropagation(); handleOpenForm(item); }} title="Update Design File">🎨 Add / Update Design</Button>
                      <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); handleConfirmDelete(item); }} title="Clear Row">🗑️</Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
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
      <Modal open={isFormModalOpen} onClose={handleCloseForm} title={editingOrderItem ? 'Update Design Item' : 'Add Design Item'}>
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

export default DesignBoardPage;