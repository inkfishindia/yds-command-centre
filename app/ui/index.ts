// atoms
export { default as Button } from './atoms/Button';
export { default as Input } from './atoms/Input';
export { default as Tag } from './atoms/Tag';
export { default as StatusPill } from './atoms/StatusPill';
export { default as Textarea } from './atoms/Textarea';
export { default as Checkbox } from './atoms/Checkbox';
export { default as Switch } from './atoms/Switch';
export { default as HealthIndicator } from './atoms/HealthIndicator';
export { default as CapacityBar } from './atoms/CapacityBar';
export { default as ProgressRing } from './atoms/ProgressRing';
export { default as AvatarGroup } from './atoms/AvatarGroup';

// molecules
export { default as Card } from './molecules/Card';
export { default as Select } from './molecules/Select';
export { default as Table } from './molecules/Table';
export { default as Modal } from './molecules/Modal';
export { default as Tabs } from './molecules/Tabs';
export { default as ConfirmDialog } from './molecules/ConfirmDialog';
export { default as EmptyState } from './molecules/EmptyState';
export { default as Drawer } from './molecules/Drawer';
export { default as MultiSelect } from './molecules/MultiSelect';
export { default as MetricCard } from './molecules/MetricCard';
export { default as FileUpload } from './molecules/FileUpload';
export { default as SnoozeMenu } from './molecules/SnoozeMenu';
export { default as MetricsBar } from './molecules/MetricsBar';
export { default as ApprovalCard } from './molecules/ApprovalCard';
export { default as TimelineChart } from './molecules/TimelineChart';
export { default as FilterBar } from './molecules/FilterBar';
export { default as StatCard } from './molecules/StatCard';
export { default as DateRangePicker } from './molecules/DateRangePicker';
export { default as TabBar } from './molecules/TabBar';

// organisms
export { default as Toast } from './organisms/Toast';
export { default as ToastContainer } from './organisms/ToastContainer';
export { default as Header } from './organisms/Header'; 
export { default as MarkdownOutput } from './organisms/MarkdownOutput';
export { default as PortfolioItemForm } from './organisms/PortfolioItemForm';
export { default as PortfolioItemDetailDrawer } from './organisms/PortfolioItemDetailDrawer';
export { default as KanbanBoard } from './organisms/KanbanBoard';
export { default as CalendarView } from './organisms/CalendarView';
export { default as ChatDrawer } from './organisms/ChatDrawer';
export { default as DetailDrawer } from './organisms/DetailDrawer';
export { default as DataTable } from './organisms/DataTable';
export { default as FormDrawer } from './organisms/FormDrawer';
export type { FormField } from './organisms/FormDrawer';
export { default as ErrorBoundary } from './organisms/ErrorBoundary';

// orders components (NEW)
export { default as OrderItemForm } from '../components/orders/OrderItemForm';
export { default as OrderItemDetailDrawer } from '../components/orders/OrderItemDetailDrawer';
export { default as OrderDetailsDrawer } from '../components/orders/OrderDetailsDrawer'; // RENAMED: from OrderSummaryDetailDrawer
export { default as OrderEditForm } from '../components/orders/OrderEditForm'; // NEW: Add this export
export { default as MarkPackedModal } from '../components/orders/MarkPackedModal'; // NEW: Add this export
export { default as MarkShippedModal } from '../components/orders/MarkShippedModal'; // NEW: Add this export
// Removed: export { default as DesignWorkflowModal } from '../components/orders/DesignWorkflowModal'; // NEW: Add this export

// ai components
export { default as ChatMessage } from '../components/ai/ChatMessage'; // NEW

// layouts
export { default as AppShell } from './layouts/AppShell';
export { default as Sidebar } from './layouts/Sidebar';
export { default as ManagerEditorLayout } from './layouts/ManagerEditorLayout';
export { default as DashboardLayout } from './layouts/DashboardLayout';
export { default as WorkspaceLayout } from './layouts/WorkspaceLayout';