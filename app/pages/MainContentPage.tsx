import React from 'react';
import { NavMainItem } from '../navigation';
import { Tabs } from '../ui';
import { ProgramsPageProps } from '../types'; // Import props for ProgramsPage
import { ProjectsPageProps } from '../types'; // Import props for ProjectsPage
import { TasksPageProps } from '../types'; // Import props for TasksPage
import { MilestonesPageProps } from '../types'; // Import props for MilestonesPage
// NEW: Import props interfaces for new strategic/operational pages
// FIX: Corrected typo: QuarterlyInitiativePageProps -> QuarterlyInitiativesPageProps
import { StrategicInitiativesPageProps, StrategicObjectivesPageProps, GoalsPageProps, QuarterlyInitiativesPageProps, ResourceAllocationBudgetPageProps, AllOrderItemsPageProps, OrderSummaryPageProps, PickListKanbanPageProps, ProductionScreenPageProps, OrderListProductsPageProps } from '../types';
import { useOrder } from '../contexts/OrderContext';


interface MainContentPageProps {
    mainItem: NavMainItem;
    activeSubItemId: string;
    onSubNavigate: (subItemId: string) => void;
    // NEW: Add props for hierarchical navigation for existing items
    selectedProgramId: string | null;
    selectedProjectId: string | null;
    navigateToProjects: (programId: string) => void;
    navigateToTasks: (projectId: string) => void;
    navigateToMilestones: (projectId: string) => void;
    // NEW: Add props for hierarchical navigation for new items
    selectedStrategicInitiativeId: string | null;
    selectedStrategicObjectiveId: string | null;
    selectedGoalId: string | null;
    navigateToObjectives: (strategicInitiativeId: string) => void;
    navigateToGoals: (objectiveId: string) => void;
    navigateToQuarterlyInitiatives: (goalId: string) => void;
    // NEW: Order management props
    // removed selectedOrderNumberForDetail, navigateToOrderDetails
}

const MainContentPage: React.FC<MainContentPageProps> = ({ 
    mainItem, 
    activeSubItemId, 
    onSubNavigate,
    selectedProgramId, 
    selectedProjectId, 
    navigateToProjects, 
    navigateToTasks, 
    navigateToMilestones,
    // NEW hierarchical navigation props
    selectedStrategicInitiativeId,
    selectedStrategicObjectiveId,
    selectedGoalId,
    navigateToObjectives,
    navigateToGoals,
    navigateToQuarterlyInitiatives,
    // removed selectedOrderNumberForDetail, navigateToOrderDetails
}) => {
    const activeSubItem = mainItem.subItems.find(item => item.id === activeSubItemId);
    const ActiveComponent = activeSubItem?.component || (() => <div>Page not found</div>);
    
    const showTabs = mainItem.subItems.length > 1;

    // NEW: Determine props to pass based on activeSubItemId
    const componentProps: any = {
      // General props if any
    };

    if (activeSubItemId === 'programs') {
      Object.assign(componentProps, {
        onViewProjects: navigateToProjects,
        onViewTasks: navigateToTasks, // Pass to ProgramsPage for Projects column
        onViewMilestones: navigateToMilestones, // Pass to ProgramsPage for Milestones column
      } as ProgramsPageProps);
    } else if (activeSubItemId === 'projects') {
      Object.assign(componentProps, {
        programId: selectedProgramId, // Pass programId
        onViewTasks: navigateToTasks,
        onViewMilestones: navigateToMilestones, // Pass to projects page
      } as ProjectsPageProps);
    } else if (activeSubItemId === 'tasks') {
      Object.assign(componentProps, {
        projectId: selectedProjectId, // Pass projectId
      } as TasksPageProps);
    } else if (activeSubItemId === 'milestones') {
      Object.assign(componentProps, {
        projectId: selectedProjectId, // Pass projectId
      } as MilestonesPageProps);
    } else if (activeSubItemId === 'strategic_initiatives') { // NEW
      Object.assign(componentProps, {
        onViewObjectives: navigateToObjectives,
      } as StrategicInitiativesPageProps);
    } else if (activeSubItemId === 'strategic_objectives') { // NEW
      Object.assign(componentProps, {
        strategicInitiativeId: selectedStrategicInitiativeId,
        onViewGoals: navigateToGoals,
      } as StrategicObjectivesPageProps);
    } else if (activeSubItemId === 'goals') { // NEW
      Object.assign(componentProps, {
        strategicObjectiveId: selectedStrategicObjectiveId,
        onViewQuarterlyInitiatives: navigateToQuarterlyInitiatives,
      } as GoalsPageProps);
    } else if (activeSubItemId === 'quarterly_initiatives') { // NEW
      Object.assign(componentProps, {
        goalId: selectedGoalId,
      } as QuarterlyInitiativesPageProps);
    } else if (activeSubItemId === 'resource_allocation') { // NEW
      Object.assign(componentProps, {
        // Resource Allocation is a top-level list, no parent ID needed
      } as ResourceAllocationBudgetPageProps);
    } else if (activeSubItemId === 'all_order_items') { // Renamed from order_list_with_product
      Object.assign(componentProps, {
        title: activeSubItem?.label, // Pass title
      } as AllOrderItemsPageProps);
    } else if (activeSubItemId === 'order_list_products') { // NEW: For Order List (Products) Page
      Object.assign(componentProps, {
        title: activeSubItem?.label, // Pass title
      } as OrderListProductsPageProps);
    } /* Removed: else if (activeSubItemId === 'design_board') { // NEW: For Design Board Page
      Object.assign(componentProps, {
        title: activeSubItem?.label, // Pass title
      } as DesignBoardPageProps);
    } */ else if (activeSubItemId === 'pick_list_kanban') { // NEW: For Pick List Kanban Page
      Object.assign(componentProps, {
        title: activeSubItem?.label, // Pass title
      } as PickListKanbanPageProps);
    } else if (activeSubItemId === 'production_screen') { // NEW: For Production Screen Page
      Object.assign(componentProps, {
        title: activeSubItem?.label, // Pass title
      } as ProductionScreenPageProps);
    }
    else if (activeSubItemId === 'order_list_summary') { // NEW: For Order Summary
      Object.assign(componentProps, {
        // Removed onViewOrderDetails from here. OrderSummaryPage will manage its drawer internally.
      } as OrderSummaryPageProps);
    }

    // FIX: Pass the label of the active sub-item as 'title' prop to the component
    // This allows mock pages to display their title dynamically.
    if (activeSubItem?.label) {
        componentProps.title = activeSubItem.label;
    }

    return (
        <div>
            {showTabs && (
                <Tabs 
                    items={mainItem.subItems.map(item => ({ id: item.id, label: item.label }))}
                    activeTab={activeSubItemId}
                    onTabClick={onSubNavigate}
                    mainSectionId={mainItem.id} // NEW: Pass mainItem.id to Tabs
                />
            )}

            <div className={showTabs ? "mt-6" : ""}>
                <ActiveComponent {...componentProps} />
            </div>
        </div>
    );
};

export default MainContentPage;