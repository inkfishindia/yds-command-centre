import React, { useState, useCallback, useMemo, useEffect, Suspense } from 'react'
import { AppShell, ToastContainer, DashboardLayout, ManagerEditorLayout, WorkspaceLayout } from './ui/index'
import { navigationStructure } from './navigation'
import MainContentPage from './pages/MainContentPage'
import { useAuth } from './contexts/AuthContext'
import { useOrder } from './contexts/OrderContext'; // Import useOrder to get selectedOrderNumberForDetail setter

export const App: React.FC = () => {
  const { initialAuthCheckComplete } = useAuth()
  const { setSelectedOrderNumberForDetail } = useOrder(); // Get setter from context

  const parseHash = useCallback((): { main: string; sub: string } => {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const pathParts = hash.substring(2).split('/');
      const mainId = pathParts[0];
      const subId = pathParts[1];

      const mainItem = navigationStructure.find(item => item.id === mainId);
      if (mainItem) {
        const defaultSubItem = mainItem.subItems.length > 0 ? mainItem.subItems[0].id : mainId;
        const resolvedSubId = mainItem.subItems.find(item => item.id === subId) ? subId : defaultSubItem;
        return { main: mainId, sub: resolvedSubId };
      }
    }
    // Default to command_center/dashboard
    return { main: 'command_center', sub: 'dashboard' };
  }, []);

  const [currentPath, setCurrentPath] = useState<{ main: string; sub: string }>(parseHash);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  // NEW: State for hierarchical navigation of new portfolio items
  const [selectedStrategicInitiativeId, setSelectedStrategicInitiativeId] = useState<string | null>(null);
  const [selectedStrategicObjectiveId, setSelectedStrategicObjectiveId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const newPath = parseHash();
      // Only update state if the parsed hash actually represents a different path
      if (newPath.main !== currentPath.main || newPath.sub !== currentPath.sub) {
        setCurrentPath(newPath);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [parseHash, currentPath.main, currentPath.sub]);


  const handleNavigate = useCallback((mainId: string) => {
    const mainItem = navigationStructure.find(item => item.id === mainId);
    if (mainItem) {
      const targetSubId = mainItem.subItems.length > 0 ? mainItem.subItems[0].id : mainId;
      window.location.hash = `/${mainId}/${targetSubId}`;
      setSelectedProgramId(null);
      setSelectedProjectId(null);
      setSelectedStrategicInitiativeId(null); // NEW
      setSelectedStrategicObjectiveId(null);   // NEW
      setSelectedGoalId(null);                 // NEW
      setSelectedOrderNumberForDetail(null);   // Clear order filter
    }
  }, [setSelectedOrderNumberForDetail]);

  const handleSubNavigate = useCallback((subId: string) => {
    const mainItem = navigationStructure.find(item => item.id === currentPath.main);
    if (mainItem && mainItem.subItems.find(item => item.id === subId)) { // Ensure subId is valid for the current main path
        window.location.hash = `/${currentPath.main}/${subId}`;
        setSelectedProgramId(null);
        setSelectedProjectId(null);
        setSelectedStrategicInitiativeId(null); // NEW
        setSelectedStrategicObjectiveId(null);   // NEW
        setSelectedGoalId(null);                 // NEW
        setSelectedOrderNumberForDetail(null); // This is now handled by OrderListPage for consistency.
    }
  }, [currentPath.main, setSelectedOrderNumberForDetail]);

  const navigateToProjects = useCallback((programId: string) => {
    window.location.hash = `/portfolio_management/projects`;
    setSelectedProgramId(programId);
    setSelectedProjectId(null);
    setSelectedStrategicInitiativeId(null); // NEW
    setSelectedStrategicObjectiveId(null);   // NEW
    setSelectedGoalId(null);                 // NEW
    setSelectedOrderNumberForDetail(null);   // Clear order filter
  }, [setSelectedOrderNumberForDetail]);

  const navigateToTasks = useCallback((projectId: string) => {
    window.location.hash = `/portfolio_management/tasks`;
    setSelectedProjectId(projectId);
    setSelectedProgramId(null);
    setSelectedStrategicInitiativeId(null); // NEW
    setSelectedStrategicObjectiveId(null);   // NEW
    setSelectedGoalId(null);                 // NEW
    setSelectedOrderNumberForDetail(null);   // Clear order filter
  }, [setSelectedOrderNumberForDetail]);

  const navigateToMilestones = useCallback((projectId: string) => {
    window.location.hash = `/portfolio_management/milestones`;
    setSelectedProjectId(projectId);
    setSelectedProgramId(null);
    setSelectedStrategicInitiativeId(null); // NEW
    setSelectedStrategicObjectiveId(null);   // NEW
    setSelectedGoalId(null);                 // NEW
    setSelectedOrderNumberForDetail(null);   // Clear order filter
  }, [setSelectedOrderNumberForDetail]);

  // NEW: Navigation for Strategic Initiatives -> Strategic Objectives -> Goals -> Quarterly Initiatives
  const navigateToObjectives = useCallback((strategicInitiativeId: string) => {
    window.location.hash = `/portfolio_management/strategic_objectives`;
    setSelectedStrategicInitiativeId(strategicInitiativeId);
    setSelectedStrategicObjectiveId(null);
    setSelectedGoalId(null);
    setSelectedProgramId(null);
    setSelectedProjectId(null);
    setSelectedOrderNumberForDetail(null);   // Clear order filter
  }, [setSelectedOrderNumberForDetail]);

  const navigateToGoals = useCallback((objectiveId: string) => {
    window.location.hash = `/portfolio_management/goals`;
    setSelectedStrategicObjectiveId(objectiveId);
    setSelectedStrategicInitiativeId(null); // Clear parent if not directly related
    setSelectedGoalId(null);
    setSelectedProgramId(null);
    setSelectedProjectId(null);
    setSelectedOrderNumberForDetail(null);   // Clear order filter
  }, [setSelectedOrderNumberForDetail]);

  const navigateToQuarterlyInitiatives = useCallback((goalId: string) => {
    window.location.hash = `/portfolio_management/quarterly_initiatives`;
    setSelectedGoalId(goalId);
    setSelectedStrategicObjectiveId(null); // Clear parent if not directly related
    setSelectedStrategicInitiativeId(null); // Clear parent if not directly related
    setSelectedProgramId(null);
    setSelectedProjectId(null);
    setSelectedOrderNumberForDetail(null);   // Clear order filter
  }, [setSelectedOrderNumberForDetail]);

  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => !prev)
  }, [])

  const activeMainItem = useMemo(() =>
    navigationStructure.find(item => item.id === currentPath.main)!,
    [currentPath.main]
  )

  // Add a loading state while initial auth check is in progress
  // This prevents flashing a signed-out UI on refresh for signed-in users.
  if (!initialAuthCheckComplete) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-[var(--color-bg-canvas)]">
        <div className="text-center text-[var(--color-text-secondary)]">
          <p className="text-2xl font-semibold">Initializing Your Design Lab...</p>
          <p className="text-md mt-2">Checking authentication status.</p>
        </div>
      </div>
    );
  }

  const loadingFallback = (
    <div className="flex items-center justify-center h-full w-full">
      <div className="text-center text-[var(--color-text-secondary)]">
        <p className="text-lg">Loading Page...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)] text-[var(--color-text-primary)] font-sans">
      <AppShell
        mainNavItems={navigationStructure}
        activeMainId={currentPath.main}
        onNavigate={handleNavigate}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      >
        <Suspense fallback={loadingFallback}>
          <MainContentPage
            mainItem={activeMainItem}
            activeSubItemId={currentPath.sub}
            onSubNavigate={handleSubNavigate}
            selectedProgramId={selectedProgramId}
            selectedProjectId={selectedProjectId}
            navigateToProjects={navigateToProjects}
            navigateToTasks={navigateToTasks}
            navigateToMilestones={navigateToMilestones}
            selectedStrategicInitiativeId={selectedStrategicInitiativeId}
            selectedStrategicObjectiveId={selectedStrategicObjectiveId}
            selectedGoalId={selectedGoalId}
            navigateToObjectives={navigateToObjectives}
            navigateToGoals={navigateToGoals}
            navigateToQuarterlyInitiatives={navigateToQuarterlyInitiatives}
            // NEW: Order management props
            // removed selectedOrderNumberForDetail
            // removed navigateToOrderDetails
          />
        </Suspense>
      </AppShell>
      <ToastContainer />
    </div>
  )
}