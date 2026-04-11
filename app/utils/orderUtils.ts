// utils/orderUtils.ts
import { OrderStatus, AcceptanceStatus, PaymentMode, OrderType, ProductWorkflowStatus } from '../types';

// The internal display status type for visual mapping in StatusPill
type DisplayStatus = 'Active' | 'Not Started' | 'In Progress' | 'Blocked' | 'Planned' | 'Paused' | 'Warning';

// FIX: Changed return types to string literals that StatusPill is designed to handle
export const getOrderTypeStatus = (type: OrderType | undefined): DisplayStatus => {
  switch (type) {
    case OrderType.B2C: return 'Active'; // B2C is typically a standard, active order type
    case OrderType.B2B: return 'In Progress'; // B2B often involves more active management
    case OrderType.PARTNER: return 'Planned'; // Partner orders might have a specific flow
    default: return 'Not Started';
  }
};

// FIX: Added new function to get a tag color for OrderType
export const getOrderTypeTagColor = (type: OrderType | undefined): 'green' | 'blue' | 'gray' => {
  switch (type) {
    case OrderType.B2C: return 'green';
    case OrderType.B2B: return 'blue';
    case OrderType.PARTNER: return 'gray';
    default: return 'gray';
  }
};

// FIX: Added new function to get an emoji for OrderType
export const getOrderTypeEmoji = (type: OrderType | undefined): string => {
  switch (type) {
    case OrderType.B2C: return '🛒';
    case OrderType.B2B: return '🏢';
    case OrderType.PARTNER: return '🤝';
    default: return '❓';
  }
};

// FIX: Changed return types to string literals that StatusPill is designed to handle
export const getPaymentModeStatus = (mode: PaymentMode | undefined): DisplayStatus => {
  switch (mode) {
    case PaymentMode.PREPAID: return 'Active'; // Prepaid is often a sign of a confirmed transaction
    case PaymentMode.COD: return 'In Progress'; // COD might imply pending confirmation or payment at delivery
    default: return 'Not Started';
  }
};

// FIX: Added new function to get a tag color for PaymentMode
export const getPaymentModeTagColor = (mode: PaymentMode | undefined): 'green' | 'blue' | 'gray' => {
  switch (mode) {
    case PaymentMode.PREPAID: return 'green';
    case PaymentMode.COD: return 'blue';
    default: return 'gray';
  }
};

// FIX: Added new function to get an emoji for PaymentMode
export const getPaymentModeEmoji = (mode: PaymentMode | undefined): string => {
  switch (mode) {
    case PaymentMode.PREPAID: return '💳';
    case PaymentMode.COD: return '💵';
    default: return '❓';
  }
};

export const getSalesChannelTagColor = (channel: string | undefined): 'green' | 'blue' | 'gray' => {
  if (!channel) return 'gray';
  const lowerChannel = channel.toLowerCase();
  // Include 'sales team' for green, consistent with business logic for direct channels
  if (lowerChannel.includes('website') || lowerChannel.includes('shopify') || lowerChannel.includes('sales team')) return 'green';
  if (lowerChannel.includes('amazon') || lowerChannel.includes('instagram') || lowerChannel.includes('partner')) return 'blue';
  return 'gray';
};

export const getProductStatusEmoji = (status: string | undefined): string => {
  if (!status) return '❓';
  switch (status.toLowerCase()) {
    case 'order placed': return '📝';
    case 'processing': return '⚙️';
    case 'design pending': return '🎨';
    case 'production': return '🏭';
    case 'fulfillment': return '📦';
    case 'shipped': return '🚚';
    case 'delivered': return '✅';
    case 'cancelled': return '❌';
    default: return '⚪'; // Generic for other statuses
  }
};

export const getAcceptanceStatusEmoji = (status: AcceptanceStatus | undefined): string => {
  if (!status) return '❓';
  switch (status) {
    case AcceptanceStatus.AWAITING: return '⏳';
    case AcceptanceStatus.ACCEPTED: return '👍';
    case AcceptanceStatus.REJECTED: return '👎';
    default: return '⚪';
  }
};

export const getProductWorkflowStatusEmoji = (status: ProductWorkflowStatus | undefined): string => {
  if (!status) return '⚪';
  switch (status) {
    case ProductWorkflowStatus.DESIGN_PENDING: return '🎨'; // Added design pending
    case ProductWorkflowStatus.DESIGN_REJECTED: return '🚫'; // Added design rejected
    case ProductWorkflowStatus.QUEUED_FOR_PICK: return '📋';
    case ProductWorkflowStatus.BLANK_PICKED: return '👕';
    case ProductWorkflowStatus.BATCHED: return '📦';
    case ProductWorkflowStatus.QUEUED_FOR_PRODUCTION: return '🏭';
    case ProductWorkflowStatus.IN_PRODUCTION: return '🛠️';
    case ProductWorkflowStatus.FINISHING_PENDING: return '✨';
    case ProductWorkflowStatus.FULFILLMENT_PENDING: return '🚚';
    case ProductWorkflowStatus.PACKED: return '📦';
    case ProductWorkflowStatus.SHIPPED: return '✈️';
    case ProductWorkflowStatus.DELIVERED: return '✅';
    default: return '⚪';
  }
};

export const getFinishingStatusEmoji = (status: string | undefined): string => {
  if (!status) return '⚪';
  switch (status.toLowerCase()) {
    case 'completed': return '✅';
    case 'qc pending': return '🔍';
    case 'rework': return '🔄';
    default: return '⚪';
  }
};

export const getDueDatePill = (expectedShipDate: string | undefined, isRushOrder: boolean | undefined): { label: string; color: 'green' | 'blue' | 'gray' | 'destructive' | 'warning' } => {
  if (!expectedShipDate) {
    return { label: 'N/A', color: 'gray' };
  }

  const shipDate = new Date(expectedShipDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to start of day

  const diffTime = shipDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Calculate difference in days

  if (isRushOrder) {
    return { label: 'Rush! ⚡', color: 'destructive' };
  }
  if (diffDays <= 0) {
    return { label: 'Overdue', color: 'destructive' };
  }
  if (diffDays <= 1) { // 0 to 1 day left
    return { label: 'Due Soon', color: 'warning' };
  }
  if (diffDays <= 3) { // 2 to 3 days left
    return { label: 'Upcoming', color: 'blue' };
  }
  return { label: 'Normal', color: 'green' };
};