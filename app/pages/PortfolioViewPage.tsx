
import React, { useState, useMemo, useCallback } from 'react'
import { Card, Button, EmptyState, StatusPill, Modal, ConfirmDialog, Select, ManagerEditorLayout } from '../ui' // Changed Page, Card, Button, EmptyState, StatusPill, Modal, ConfirmDialog, Select
import PortfolioItemDetailDrawer from '../ui/organisms/PortfolioItemDetailDrawer'
import PortfolioItemForm from '../ui/organisms/PortfolioItemForm'
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { useToast } from '../contexts/ToastContext'
import { Program, Project, Task, Milestone, ProgramRiskLevel, ProgramHealthStatus, ProgramStatus, ProgramPriority, ProjectStatus, ProjectPriority, TeamMember, BusinessModelCanvasData,
  StrategicInitiative, StrategicObjective, Goal, QuarterlyInitiative, ResourceAllocationBudget } from '../types'
import BmcItemDetailDrawer from '../components/bmc/BmcItemDetailDrawer'; // Import BmcItemDetailDrawer for team members

type ItemType = 'program' | 'project' | 'task' | 'milestone' | 'strategicInitiative' | 'strategicObjective' | 'goal' | 'quarterlyInitiative' | 'resourceAllocationBudget';
type Item = Program | Project | Task | Milestone | StrategicInitiative | StrategicObjective | Goal | QuarterlyInitiative | ResourceAllocationBudget;

// Helper to get the ID from any Item type safely
const getItemId = (item: Item, type: ItemType): string => {
    switch (type) {
        case 'program': return (item as Program).programId;
        case 'project': return (item as Project).projectId;
        case 'task': return (item as Task).taskId;
        case 'milestone': return (item as Milestone).milestoneId;
        case 'strategicInitiative': return (item as StrategicInitiative).strategicInitiativeId;
        case 'strategicObjective': return (item as StrategicObjective).objectiveId;
        case 'goal': return (item as Goal).goalId;
        case 'quarterlyInitiative': return (item as QuarterlyInitiative).initiativeId;
        case 'resourceAllocationBudget': return (item as ResourceAllocationBudget).budgetCategoryId;
        default: return ''; // Should not happen
    }
}

// Helper to get the display name from any Item type safely
const getItemName = (item: Item, type: ItemType): string => {
    switch (type) {
        case 'program': return (item as Program).programName || '';
        case 'project': return (item as Project).projectName || '';
        case 'task': return (item as Task).taskName || '';
        case 'milestone': return (item as Milestone).milestoneName || '';
        case 'strategicInitiative': return (item as StrategicInitiative).strategicInitiativeName || '';
        case 'strategicObjective': return (item as StrategicObjective).objectiveName || '';
        case 'goal': return (item as Goal).goalName || '';
        case 'quarterlyInitiative': return (item as QuarterlyInitiative).initiativeName || '';
        case 'resourceAllocationBudget': return (item as ResourceAllocationBudget).budgetCategory || '';
        default: return '';
    }
}


const PortfolioViewPage: React.FC = () => {
    const { isSignedIn, signIn, isAuthActionInProgress, userProfile, isMockMode } = useAuth()
    const { addToast } = useToast()
    const {
        programs,
        projects,
        tasks,
        milestones,
        strategicInitiatives, // NEW
        strategicObjectives,   // NEW
        goals,                               // NEW
        quarterlyInitiatives, // NEW
        resourceAllocationBudgets, // NEW
        team, // Get team members
        hubs, // Get hubs
        teamMemberMap, // Get team member map
        loading,
        error,
        initialLoadComplete,
        loadPortfolioData,
        selectedProgramId,
        setSelectedProgramId,
        selectedProjectId,
        setSelectedProjectId,
        selectedStrategicInitiativeId, // NEW
        setSelectedStrategicInitiativeId, // NEW
        selectedStrategicObjectiveId,   // NEW
        setSelectedStrategicObjectiveId, // NEW
        selectedGoalId,                 // NEW
        setSelectedGoalId,              // NEW
        saveItem, // Use the new saveItem from context
        deleteItem // Use the new deleteItem from context
    } = usePortfolio()

    const [detailItem, setDetailItem] = useState<{ type: ItemType; item: Item } | null>(null)
    const [formState, setFormState] = useState<{ isOpen: boolean; mode: 'add' | 'edit'; type: ItemType | null; item: Partial<Item> | null }>({ isOpen: false, mode: 'add', type: null, item: null })
    const [deleteState, setDeleteState] = useState<{ isOpen: boolean; type: ItemType | null; item: Item | null }>({ isOpen: false, type: null, item: null })
    const [selectedTeamMemberForDrawer, setSelectedTeamMemberForDrawer] = useState<{ sectionKey: keyof BusinessModelCanvasData, item: TeamMember } | null>(null);

    // --- Filter States ---
    const [riskLevelFilter, setRiskLevelFilter] = useState<ProgramRiskLevel | 'All'>('All')
    const [healthStatusFilter, setHealthStatusFilter] = useState<ProgramHealthStatus | 'All'>('All')
    const [deadlineFilter, setDeadlineFilter] = useState<string>('') // For programs (days_to_next_milestone)
    const [budgetVarianceFilter, setBudgetVarianceFilter] = useState<string>('') // For programs (budgetVariance)
    const [ownerFilter, setOwnerFilter] = useState<string>('All') // For programs and projects
    const [hubFilter, setHubFilter] = useState<string>('All') // For programs and projects
    const [grouping, setGrouping] = useState<'none' | 'owner' | 'hub'>('none')
    // --- End Filter States ---

    const handleStrategicInitiativeCardClick = useCallback((initiative: StrategicInitiative) => { // NEW
      if (selectedStrategicInitiativeId === initiative.strategicInitiativeId) {
          setSelectedStrategicInitiativeId(null);
          setDetailItem(null);
      } else {
          setSelectedStrategicInitiativeId(initiative.strategicInitiativeId);
          setSelectedStrategicObjectiveId(null);
          setSelectedGoalId(null);
          setSelectedProgramId(null);
          setSelectedProjectId(null);
          setDetailItem({ type: 'strategicInitiative', item: initiative });
      }
    }, [selectedStrategicInitiativeId, setSelectedStrategicInitiativeId, setSelectedStrategicObjectiveId, setSelectedGoalId, setSelectedProgramId, setSelectedProjectId]);

    const handleStrategicObjectiveCardClick = useCallback((objective: StrategicObjective) => { // NEW
      if (selectedStrategicObjectiveId === objective.objectiveId) {
          setSelectedStrategicObjectiveId(null);
          setDetailItem(null);
      } else {
          setSelectedStrategicObjectiveId(objective.objectiveId);
          if (objective.parentStrategicInitiativeId) {
              setSelectedStrategicInitiativeId(objective.parentStrategicInitiativeId);
          } else {
              setSelectedStrategicInitiativeId(null);
          }
          setSelectedGoalId(null);
          setSelectedProgramId(null);
          setSelectedProjectId(null);
          setDetailItem({ type: 'strategicObjective', item: objective });
      }
    }, [selectedStrategicObjectiveId, setSelectedStrategicObjectiveId, setSelectedStrategicInitiativeId, setSelectedGoalId, setSelectedProgramId, setSelectedProjectId]);

    const handleGoalCardClick = useCallback((goal: Goal) => { // NEW
      if (selectedGoalId === goal.goalId) {
          setSelectedGoalId(null);
          setDetailItem(null);
      } else {
          setSelectedGoalId(goal.goalId);
          if (goal.parentObjectiveId) {
              setSelectedStrategicObjectiveId(goal.parentObjectiveId);
              const parentObjective = strategicObjectives.find(obj => obj.objectiveId === goal.parentObjectiveId);
              if (parentObjective?.parentStrategicInitiativeId) {
                  setSelectedStrategicInitiativeId(parentObjective.parentStrategicInitiativeId);
              } else {
                  setSelectedStrategicInitiativeId(null);
              }
          } else {
              setSelectedStrategicObjectiveId(null);
              setSelectedStrategicInitiativeId(null);
          }
          setSelectedProgramId(null);
          setSelectedProjectId(null);
          setDetailItem({ type: 'goal', item: goal });
      }
    }, [selectedGoalId, setSelectedGoalId, setSelectedStrategicObjectiveId, strategicObjectives, setSelectedStrategicInitiativeId, setSelectedProgramId, setSelectedProjectId]);


    const handleProgramCardClick = useCallback((program: Program) => {
        if (selectedProgramId === program.programId) {
            setSelectedProgramId(null)
            setDetailItem(null)
        } else {
            setSelectedProgramId(program.programId)
            setSelectedProjectId(null) // Deselect any project when a new program is selected
            setSelectedStrategicInitiativeId(null); // Clear strategic selections
            setSelectedStrategicObjectiveId(null);
            setSelectedGoalId(null);
            setDetailItem({ type: 'program', item: program })
        }
    }, [selectedProgramId, setSelectedProgramId, setSelectedProjectId, setSelectedStrategicInitiativeId, setSelectedStrategicObjectiveId, setSelectedGoalId]) // Removed detailItem from dependencies as it's set here

    const handleProjectCardClick = useCallback((project: Project) => {
        if (selectedProjectId === project.projectId) {
            setSelectedProjectId(null)
            setDetailItem(null)
        } else {
            setSelectedProjectId(project.projectId)
            // When a project is selected, also select its parent program
            if (project.programId) {
                setSelectedProgramId(project.programId);
            } else {
                setSelectedProgramId(null);
            }
            setSelectedStrategicInitiativeId(null); // Clear strategic selections
            setSelectedStrategicObjectiveId(null);
            setSelectedGoalId(null);
            setDetailItem({ type: 'project', item: project })
        }
    }, [selectedProjectId, setSelectedProjectId, setSelectedProgramId, setSelectedStrategicInitiativeId, setSelectedStrategicObjectiveId, setSelectedGoalId]) // Removed detailItem from dependencies as it's set here

    const handleTaskCardClick = useCallback((task: Task) => {
        // Select parent project and program when task is clicked
        if (task.projectId) {
            setSelectedProjectId(task.projectId);
            const parentProject = projects.find(p => p.projectId === task.projectId);
            if (parentProject?.programId) {
                setSelectedProgramId(parentProject.programId);
            } else {
                setSelectedProgramId(null);
            }
        } else {
            setSelectedProjectId(null);
            setSelectedProgramId(null);
        }
        setSelectedStrategicInitiativeId(null); // Clear strategic selections
        setSelectedStrategicObjectiveId(null);
        setSelectedGoalId(null);

        if (detailItem?.type === 'task' && (detailItem.item as Task).taskId === task.taskId) {
            setDetailItem(null) // Close if already open for this task
        } else {
            setDetailItem({ type: 'task', item: task }) // Open for this task
        }
    }, [detailItem, projects, setSelectedProjectId, setSelectedProgramId, setSelectedStrategicInitiativeId, setSelectedStrategicObjectiveId, setSelectedGoalId])

    const handleMilestoneCardClick = useCallback((milestone: Milestone) => {
        // Select parent project and program when milestone is clicked
        if (milestone.projectId) {
            setSelectedProjectId(milestone.projectId);
            const parentProject = projects.find(p => p.projectId === milestone.projectId);
            if (parentProject?.programId) {
                setSelectedProgramId(parentProject.programId);
            } else {
                setSelectedProgramId(null);
            }
        } else {
            setSelectedProjectId(null);
            setSelectedProgramId(null);
        }
        setSelectedStrategicInitiativeId(null); // Clear strategic selections
        setSelectedStrategicObjectiveId(null);
        setSelectedGoalId(null);

        if (detailItem?.type === 'milestone' && (detailItem.item as Milestone).milestoneId === milestone.milestoneId) {
            setDetailItem(null) // Close if already open for this milestone
        } else {
            setDetailItem({ type: 'milestone', item: milestone }) // Open for this milestone
        }
    }, [detailItem, projects, setSelectedProjectId, setSelectedProgramId, setSelectedStrategicInitiativeId, setSelectedStrategicObjectiveId, setSelectedGoalId])

    const handleQuarterlyInitiativeCardClick = useCallback((qi: QuarterlyInitiative) => { // NEW
        // Select parent goal when quarterly initiative is clicked
        if (qi.parentGoalIds) {
            // Assuming single parent goal for simplicity in current context
            const parentGoalId = qi.parentGoalIds.split('|')[0].trim();
            setSelectedGoalId(parentGoalId);
            const parentGoal = goals.find(g => g.goalId === parentGoalId);
            if (parentGoal?.parentObjectiveId) {
                setSelectedStrategicObjectiveId(parentGoal.parentObjectiveId);
                const parentObjective = strategicObjectives.find(obj => obj.objectiveId === parentGoal.parentObjectiveId);
                if (parentObjective?.parentStrategicInitiativeId) {
                    setSelectedStrategicInitiativeId(parentObjective.parentStrategicInitiativeId);
                } else {
                    setSelectedStrategicInitiativeId(null);
                }
            } else {
                setSelectedStrategicObjectiveId(null);
                setSelectedStrategicInitiativeId(null);
            }
        } else {
            setSelectedGoalId(null);
            setSelectedStrategicObjectiveId(null);
            setSelectedStrategicInitiativeId(null);
        }
        setSelectedProgramId(null);
        setSelectedProjectId(null);

        if (detailItem?.type === 'quarterlyInitiative' && (detailItem.item as QuarterlyInitiative).initiativeId === qi.initiativeId) {
            setDetailItem(null);
        } else {
            setDetailItem({ type: 'quarterlyInitiative', item: qi });
        }
    }, [detailItem, goals, strategicObjectives, setSelectedGoalId, setSelectedStrategicObjectiveId, setSelectedStrategicInitiativeId, setSelectedProgramId, setSelectedProjectId]);

    const handleResourceAllocationBudgetCardClick = useCallback((rab: ResourceAllocationBudget) => { // NEW
        setSelectedStrategicInitiativeId(null); // Clear all selections as it's a top-level item
        setSelectedStrategicObjectiveId(null);
        setSelectedGoalId(null);
        setSelectedProgramId(null);
        setSelectedProjectId(null);

        if (detailItem?.type === 'resourceAllocationBudget' && (detailItem.item as ResourceAllocationBudget).budgetCategoryId === rab.budgetCategoryId) {
            setDetailItem(null);
        } else {
            setDetailItem({ type: 'resourceAllocationBudget', item: rab });
        }
    }, [detailItem, setSelectedStrategicInitiativeId, setSelectedStrategicObjectiveId, setSelectedGoalId, setSelectedProgramId, setSelectedProjectId]);

    const handleOpenTeamMemberDrawer = useCallback((member: TeamMember) => {
        setSelectedTeamMemberForDrawer({ sectionKey: 'team', item: member });
    }, []);

    const handleCloseTeamMemberDrawer = useCallback(() => {
        setSelectedTeamMemberForDrawer(null);
    }, []);

    const handleOpenForm = (type: ItemType, mode: 'add' | 'edit', item: Item | Partial<Item> | null = null) => {
        if (!isSignedIn && !isMockMode) {
            addToast("Please sign in to add/edit items.", "error")
            return
        }
        let initialData = item
        if (mode === 'add') {
            if (type === 'project') initialData = { programId: selectedProgramId || '' } as Partial<Project>
            else if (type === 'task') initialData = { projectId: selectedProjectId || '' } as Partial<Task>
            else if (type === 'milestone') initialData = { projectId: selectedProjectId || '' } as Partial<Milestone>
            // NEW: Add parent IDs for new items
            else if (type === 'strategicObjective') initialData = { parentStrategicInitiativeId: selectedStrategicInitiativeId || '' } as Partial<StrategicObjective>
            else if (type === 'goal') initialData = { parentObjectiveId: selectedStrategicObjectiveId || '' } as Partial<Goal>
            else if (type === 'quarterlyInitiative') initialData = { parentGoalIds: selectedGoalId || '' } as Partial<QuarterlyInitiative>
        }
        setFormState({ isOpen: true, mode, type, item: initialData })
        setDetailItem(null) // Close detail drawer when opening form
        setSelectedTeamMemberForDrawer(null); // Close team member drawer
    }
    // FIX: Corrected arguments for saveItem call. The context now handles sheetId and userProfile.
    const handleSaveItem = useCallback(async (itemData: Partial<Item>) => {
        const type = formState.type
        if (!type) return

        if (!isSignedIn && !isMockMode) {
            addToast("Please sign in to save changes.", "error")
            return
        }

        try {
            let currentParentId: string | null | undefined;
            if (type === 'project') currentParentId = selectedProgramId;
            else if (type === 'task' || type === 'milestone') currentParentId = selectedProjectId;
            else if (type === 'strategicObjective') currentParentId = selectedStrategicInitiativeId;
            else if (type === 'goal') currentParentId = selectedStrategicObjectiveId;
            else if (type === 'quarterlyInitiative') currentParentId = selectedGoalId;
            else currentParentId = null;

            await saveItem(type, itemData, currentParentId);
            setFormState({ isOpen: false, mode: 'add', type: null, item: null })
        } catch (err: any) {
            addToast(`Failed to save: ${err.message}`, 'error')
        }
    }, [addToast, formState, saveItem, selectedProgramId, selectedProjectId, selectedStrategicInitiativeId, selectedStrategicObjectiveId, selectedGoalId, isSignedIn, isMockMode])

    // FIX: Corrected arguments for deleteItem call. The context now handles sheetId.
    const handleDelete = useCallback(async () => {
        const { type, item } = deleteState
        if (!type || !item) return

        if (!isSignedIn && !isMockMode) {
            addToast("Please sign in to delete items.", "error")
            return
        }

        try {
            await deleteItem(type, item);
            setDeleteState({ isOpen: false, type: null, item: null })
        } catch(err: any) {
            addToast(`Failed to delete: ${err.message}`, 'error')
        }
    }, [deleteState, addToast, deleteItem, isSignedIn, isMockMode])

    // --- Filter Options ---
    const allUniqueOwners = useMemo<string[]>(() => {
        const owners = new Set<string>();
        team.forEach(tm => tm.fullName && owners.add(tm.fullName)); // Use full name from team members
        // Fallback for items where ownerPersonId/ownerName might not map to a full team member
        programs.forEach(p => p.ownerPersonId && !teamMemberMap.has(p.ownerPersonId) && owners.add(p.ownerPersonId));
        projects.forEach(p => p.ownerName && !teamMemberMap.has(p.ownerId || '') && owners.add(p.ownerName));
        tasks.forEach(t => t.ownerName && !teamMemberMap.has(t.ownerId || '') && owners.add(t.ownerName));
        milestones.forEach(m => m.ownerName && !teamMemberMap.has(m.ownerId || '') && owners.add(m.ownerName));
        strategicInitiatives.forEach(si => si.ownerPersonId && !teamMemberMap.has(si.ownerPersonId) && owners.add(si.ownerPersonId)); // NEW
        strategicObjectives.forEach(so => so.ownerPersonId && !teamMemberMap.has(so.ownerPersonId) && owners.add(so.ownerPersonId)); // NEW
        goals.forEach(g => g.ownerPersonId && !teamMemberMap.has(g.ownerPersonId) && owners.add(g.ownerPersonId));                 // NEW
        quarterlyInitiatives.forEach(qi => qi.ownerPersonId && !teamMemberMap.has(qi.ownerPersonId) && owners.add(qi.ownerPersonId)); // NEW
        resourceAllocationBudgets.forEach(rab => rab.ownerPersonId && !teamMemberMap.has(rab.ownerPersonId) && owners.add(rab.ownerPersonId)); // NEW
        return ['All', ...Array.from(owners).sort()];
    }, [programs, projects, tasks, milestones, strategicInitiatives, strategicObjectives, goals, quarterlyInitiatives, resourceAllocationBudgets, team, teamMemberMap]);

    const allUniqueHubs = useMemo<string[]>(() => {
        const hubsSet = new Set<string>();
        // Programs have ownerHubId, Hubs have name
        team.forEach(tm => tm.primaryHubName && hubsSet.add(tm.primaryHubName)); // Use hub name from team members if available
        programs.forEach(p => p.ownerHubId && hubsSet.add(p.ownerHubId));
        projects.forEach(p => p.hubName && hubsSet.add(p.hubName));
        tasks.forEach(t => t.hubName && hubsSet.add(t.hubName));
        strategicObjectives.forEach(so => so.ownerHubId && hubsSet.add(so.ownerHubId)); // NEW
        goals.forEach(g => g.hubId && hubsSet.add(g.hubId));                 // NEW
        quarterlyInitiatives.forEach(qi => qi.hubId && hubsSet.add(qi.hubId)); // NEW
        resourceAllocationBudgets.forEach(rab => rab.hubId && hubsSet.add(rab.hubId)); // NEW
        
        // Add actual hub names from the `hubs` data
        hubs.forEach(h => h.name && hubsSet.add(h.name));

        return ['All', ...Array.from(hubsSet).sort()];
    }, [programs, projects, tasks, strategicObjectives, goals, quarterlyInitiatives, resourceAllocationBudgets, team, hubs]);

    const riskLevelOptions = useMemo<string[]>(() => ['All', ...Object.values(ProgramRiskLevel).sort()], [])
    const healthStatusOptions = useMemo<string[]>(() => ['All', ...Object.values(ProgramHealthStatus).sort()], [])
    const deadlineOptions = useMemo(() => [
        { value: '', label: 'All Deadlines' },
        { value: 'overdue', label: 'Overdue' },
        { value: '30', label: 'Upcoming (0-30 days)' },
        { value: '90', label: 'Mid-term (31-90 days)' },
        { value: '91+', label: 'Long-term (91+ days)' },
    ], [])
    const budgetVarianceOptions = useMemo(() => [
        { value: '', label: 'All Budgets' },
        { value: 'under', label: 'Under Budget' },
        { value: 'over', label: 'Over Budget' },
        { value: 'on_track', label: 'On Track (0 variance)' }
    ], [])

    const groupingOptions = useMemo(() => [
        { value: 'none', label: 'No Grouping' },
        { value: 'owner', label: 'By Owner' },
        { value: 'hub', label: 'By Hub' },
    ], [])
    // --- End Filter Options ---

    // --- Filtered & Grouped Strategic Initiatives --- (NEW)
    const filteredStrategicInitiatives = useMemo<StrategicInitiative[]>(() => {
      let currentInitiatives = strategicInitiatives;
      if (ownerFilter && ownerFilter !== 'All') {
        currentInitiatives = currentInitiatives.filter(si => {
          const owner = teamMemberMap.get(si.ownerPersonId || '');
          return (owner?.fullName || si.ownerPersonId) === ownerFilter;
        });
      }
      // Add other filters as needed for StrategicInitiatives
      return currentInitiatives;
    }, [strategicInitiatives, ownerFilter, teamMemberMap]);

    const groupedStrategicInitiatives = useMemo<Record<string, StrategicInitiative[]>>(() => {
      if (grouping === 'none') {
        return { 'All Strategic Initiatives': filteredStrategicInitiatives };
      } else if (grouping === 'owner') {
        return filteredStrategicInitiatives.reduce((acc, si) => {
          const owner = teamMemberMap.get(si.ownerPersonId || '');
          const key = owner?.fullName || si.ownerPersonId || 'Unassigned';
          acc[key] = (acc[key] || []).concat(si);
          return acc;
        }, {} as Record<string, StrategicInitiative[]>);
      } else if (grouping === 'hub') {
        // Strategic initiatives might not have a direct hub, relate to owner's hub
        return filteredStrategicInitiatives.reduce((acc, si) => {
            const owner = teamMemberMap.get(si.ownerPersonId || '');
            const key = owner?.primaryHubName || 'No Hub';
            acc[key] = (acc[key] || []).concat(si);
            return acc;
        }, {} as Record<string, StrategicInitiative[]>);
      }
      return { 'All Strategic Initiatives': filteredStrategicInitiatives };
    }, [filteredStrategicInitiatives, grouping, teamMemberMap]);

    // --- Filtered & Grouped Strategic Objectives --- (NEW)
    const filteredStrategicObjectives = useMemo<StrategicObjective[]>(() => {
      let currentObjectives = selectedStrategicInitiativeId ? strategicObjectives.filter(so => so.parentStrategicInitiativeId === selectedStrategicInitiativeId) : strategicObjectives;

      if (ownerFilter && ownerFilter !== 'All') {
        currentObjectives = currentObjectives.filter(so => {
          const owner = teamMemberMap.get(so.ownerPersonId || '');
          return (owner?.fullName || so.ownerPersonId) === ownerFilter;
        });
      }
      if (hubFilter && hubFilter !== 'All') {
        currentObjectives = currentObjectives.filter(so => {
          const owner = teamMemberMap.get(so.ownerPersonId || '');
          return (owner?.primaryHubName || so.ownerHubId) === hubFilter;
        });
      }
      // Add other filters as needed for StrategicObjectives
      return currentObjectives;
    }, [strategicObjectives, selectedStrategicInitiativeId, ownerFilter, hubFilter, teamMemberMap]);

    const groupedStrategicObjectives = useMemo<Record<string, StrategicObjective[]>>(() => {
      if (grouping === 'none') {
        return { 'All Strategic Objectives': filteredStrategicObjectives };
      } else if (grouping === 'owner') {
        return filteredStrategicObjectives.reduce((acc, so) => {
          const owner = teamMemberMap.get(so.ownerPersonId || '');
          const key = owner?.fullName || so.ownerPersonId || 'Unassigned';
          acc[key] = (acc[key] || []).concat(so);
          return acc;
        }, {} as Record<string, StrategicObjective[]>);
      } else if (grouping === 'hub') {
        return filteredStrategicObjectives.reduce((acc, so) => {
          const owner = teamMemberMap.get(so.ownerPersonId || '');
          const key = owner?.primaryHubName || so.ownerHubId || 'No Hub';
          acc[key] = (acc[key] || []).concat(so);
          return acc;
        }, {} as Record<string, StrategicObjective[]>);
      }
      return { 'All Strategic Objectives': filteredStrategicObjectives };
    }, [filteredStrategicObjectives, grouping, teamMemberMap]);

    // --- Filtered & Grouped Goals --- (NEW)
    const filteredGoals = useMemo<Goal[]>(() => {
      let currentGoals = selectedStrategicObjectiveId ? goals.filter(g => g.parentObjectiveId === selectedStrategicObjectiveId) : goals;

      if (ownerFilter && ownerFilter !== 'All') {
        currentGoals = currentGoals.filter(g => {
          const owner = teamMemberMap.get(g.ownerPersonId || '');
          return (owner?.fullName || g.ownerPersonId) === ownerFilter;
        });
      }
      if (hubFilter && hubFilter !== 'All') {
        currentGoals = currentGoals.filter(g => {
          const owner = teamMemberMap.get(g.ownerPersonId || '');
          return (owner?.primaryHubName || g.hubId) === hubFilter;
        });
      }
      // Add other filters as needed for Goals
      return currentGoals;
    }, [goals, selectedStrategicObjectiveId, ownerFilter, hubFilter, teamMemberMap]);

    const groupedGoals = useMemo<Record<string, Goal[]>>(() => {
      if (grouping === 'none') {
        return { 'All Goals': filteredGoals };
      } else if (grouping === 'owner') {
        return filteredGoals.reduce((acc, g) => {
          const owner = teamMemberMap.get(g.ownerPersonId || '');
          const key = owner?.fullName || g.ownerPersonId || 'Unassigned';
          acc[key] = (acc[key] || []).concat(g);
          return acc;
        }, {} as Record<string, Goal[]>);
      } else if (grouping === 'hub') {
        return filteredGoals.reduce((acc, g) => {
          const owner = teamMemberMap.get(g.ownerPersonId || '');
          const key = owner?.primaryHubName || g.hubId || 'No Hub';
          acc[key] = (acc[key] || []).concat(g);
          return acc;
        }, {} as Record<string, Goal[]>);
      }
      return { 'All Goals': filteredGoals };
    }, [filteredGoals, grouping, teamMemberMap]);

    // --- Filtered & Grouped Programs ---
    const filteredPrograms = useMemo<Program[]>(() => {
        let currentPrograms = programs

        if (riskLevelFilter && riskLevelFilter !== 'All') {
            currentPrograms = currentPrograms.filter(p => p.riskLevel === riskLevelFilter)
        }
        if (healthStatusFilter && healthStatusFilter !== 'All') {
            currentPrograms = currentPrograms.filter(p => p.healthStatus === healthStatusFilter)
        }
        if (deadlineFilter) {
            currentPrograms = currentPrograms.filter(p => {
                if (p.daysToNextMilestone === undefined || p.daysToNextMilestone === null) return false
                if (deadlineFilter === 'overdue') return p.daysToNextMilestone < 0
                if (deadlineFilter === '30') return p.daysToNextMilestone >= 0 && p.daysToNextMilestone <= 30
                if (deadlineFilter === '90') return p.daysToNextMilestone > 30 && p.daysToNextMilestone <= 90
                if (deadlineFilter === '91+') return p.daysToNextMilestone > 90
                return true
            })
        }
        if (budgetVarianceFilter) {
            currentPrograms = currentPrograms.filter(p => {
                if (p.budgetVariance === undefined || p.budgetVariance === null) return false
                if (budgetVarianceFilter === 'under') return p.budgetVariance < 0
                if (budgetVarianceFilter === 'over') return p.budgetVariance > 0
                if (budgetVarianceFilter === 'on_track') return p.budgetVariance === 0
                return true
            })
        }
        if (ownerFilter && ownerFilter !== 'All') {
            currentPrograms = currentPrograms.filter(p => {
              const owner = teamMemberMap.get(p.ownerPersonId || '');
              return (owner?.fullName || p.ownerPersonId) === ownerFilter;
            });
        }
        if (hubFilter && hubFilter !== 'All') {
            currentPrograms = currentPrograms.filter(p => {
              const owner = teamMemberMap.get(p.ownerPersonId || '');
              return (owner?.primaryHubName || p.ownerHubId) === hubFilter;
            });
        }
        
        return currentPrograms
    }, [programs, riskLevelFilter, healthStatusFilter, deadlineFilter, budgetVarianceFilter, ownerFilter, hubFilter, teamMemberMap])

    const groupedPrograms = useMemo<Record<string, Program[]>>(() => {
        if (grouping === 'none') {
            return { 'All Programs': filteredPrograms }
        } else if (grouping === 'owner') {
            return filteredPrograms.reduce((acc, program) => {
                const owner = teamMemberMap.get(program.ownerPersonId || '');
                const key = owner?.fullName || program.ownerPersonId || 'Unassigned';
                acc[key] = (acc[key] || []).concat(program)
                return acc
            }, {} as Record<string, Program[]>)
        } else if (grouping === 'hub') {
            return filteredPrograms.reduce((acc, program) => {
                const owner = teamMemberMap.get(program.ownerPersonId || '');
                const key = owner?.primaryHubName || program.ownerHubId || 'No Hub';
                acc[key] = (acc[key] || []).concat(program)
                return acc
            }, {} as Record<string, Program[]>)
        }
        return { 'All Programs': filteredPrograms }
    }, [filteredPrograms, grouping, teamMemberMap])
    // --- End Filtered & Grouped Programs ---

    // --- Filtered & Grouped Projects ---
    const filteredProjects = useMemo<Project[]>(() => {
        let currentProjects = selectedProgramId ? projects.filter(p => p.programId === selectedProgramId) : projects

        if (ownerFilter && ownerFilter !== 'All') {
            currentProjects = currentProjects.filter(p => {
              const owner = teamMemberMap.get(p.ownerId || '');
              return (owner?.fullName || p.ownerName) === ownerFilter;
            });
        }
        if (hubFilter && hubFilter !== 'All') {
            currentProjects = currentProjects.filter(p => {
              const owner = teamMemberMap.get(p.ownerId || '');
              return (owner?.primaryHubName || p.hubName) === hubFilter;
            });
        }
        // Project-specific filters (e.g., project health, priority) can be added here
        return currentProjects
    }, [projects, selectedProgramId, ownerFilter, hubFilter, teamMemberMap])

    const groupedProjects = useMemo<Record<string, Project[]>>(() => {
        if (grouping === 'none') {
            return { 'All Projects': filteredProjects }
        } else if (grouping === 'owner') {
            return filteredProjects.reduce((acc, project) => {
                const owner = teamMemberMap.get(project.ownerId || '');
                const key = owner?.fullName || project.ownerName || 'Unassigned';
                acc[key] = (acc[key] || []).concat(project)
                return acc
            }, {} as Record<string, Project[]>)
        } else if (grouping === 'hub') {
            return filteredProjects.reduce((acc, project) => {
                const owner = teamMemberMap.get(project.ownerId || '');
                const key = owner?.primaryHubName || project.hubName || 'No Hub';
                acc[key] = (acc[key] || []).concat(project)
                return acc
            }, {} as Record<string, Project[]>)
        }
        return { 'All Projects': filteredProjects }
    }, [filteredProjects, grouping, teamMemberMap])
    // --- End Filtered & Grouped Projects ---

    // --- Filtered Tasks ---
    const filteredTasks = useMemo(() => {
        let currentTasks = tasks; // Start with all tasks

        if (selectedProjectId) {
            // If a specific project is selected, filter by that project
            currentTasks = currentTasks.filter(t => t.projectId === selectedProjectId);
        } else if (selectedProgramId) {
            // If a program is selected but no specific project,
            // filter tasks whose projectId belongs to any project in the filteredProjects list for the selected program
            const projectIdsInSelectedProgram = new Set(filteredProjects.map(p => p.projectId));
            currentTasks = currentTasks.filter(t => t.projectId && projectIdsInSelectedProgram.has(t.projectId));
        } else if (selectedGoalId) { // NEW: filter by tasks related to the selected goal's programs/projects
             // Find programs linked to the selected goal via QuarterlyInitiatives, then projects for those programs, then tasks
             const relatedQuarterlyInitiatives = quarterlyInitiatives.filter(qi =>
                qi.parentGoalIds?.split('|').map(id => id.trim()).includes(selectedGoalId || '')
             );
             const programIdsFromQIs = new Set(relatedQuarterlyInitiatives.flatMap(qi =>
                 qi.programIds ? qi.programIds.split('|').map(id => id.trim()) : []
             ));
             const projectIdsInRelatedPrograms = new Set(programs
                 .filter(p => p.programId && programIdsFromQIs.has(p.programId))
                 .flatMap(p => projects.filter(proj => proj.programId === p.programId).map(proj => proj.projectId))
             );
             currentTasks = currentTasks.filter(t => t.projectId && projectIdsInRelatedPrograms.has(t.projectId));
        }


        // Apply owner filter
        if (ownerFilter && ownerFilter !== 'All') {
            currentTasks = currentTasks.filter(t => {
              const owner = teamMemberMap.get(t.ownerId || '');
              return (owner?.fullName || t.ownerName) === ownerFilter;
            });
        }
        return currentTasks;
    }, [tasks, selectedProjectId, selectedProgramId, selectedGoalId, filteredProjects, programs, projects, quarterlyInitiatives, ownerFilter, teamMemberMap]);

    // --- Filtered Milestones ---
    const filteredMilestones = useMemo(() => {
        let currentMilestones = milestones;
        
        if (selectedProjectId) {
            // If a specific project is selected, filter by that project
            currentMilestones = currentMilestones.filter(m => m.projectId === selectedProjectId);
        } else if (selectedProgramId) {
            // If a program is selected but no specific project,
            // filter milestones whose projectId belongs to any project in the filteredProjects list for the selected program
            const projectIdsInSelectedProgram = new Set(filteredProjects.map(p => p.projectId));
            currentMilestones = currentMilestones.filter(m => m.projectId && projectIdsInSelectedProgram.has(m.projectId));
        } else if (selectedGoalId) { // NEW: filter by milestones related to the selected goal's programs/projects
            const relatedQuarterlyInitiatives = quarterlyInitiatives.filter(qi =>
                qi.parentGoalIds?.split('|').map(id => id.trim()).includes(selectedGoalId || '')
            );
            const programIdsFromQIs = new Set(relatedQuarterlyInitiatives.flatMap(qi =>
                qi.programIds ? qi.programIds.split('|').map(id => id.trim()) : []
            ));
            const projectIdsInRelatedPrograms = new Set(programs
                .filter(p => p.programId && programIdsFromQIs.has(p.programId))
                .flatMap(p => projects.filter(proj => proj.programId === p.programId).map(proj => proj.projectId))
            );
            currentMilestones = currentMilestones.filter(m => m.projectId && projectIdsInRelatedPrograms.has(m.projectId));
        }

        // Apply owner filter
        if (ownerFilter && ownerFilter !== 'All') {
            currentMilestones = currentMilestones.filter(m => {
              const owner = teamMemberMap.get(m.ownerId || '');
              return (owner?.fullName || m.ownerName) === ownerFilter;
            });
        }
        return currentMilestones;
    }, [milestones, selectedProjectId, selectedProgramId, selectedGoalId, filteredProjects, programs, projects, quarterlyInitiatives, ownerFilter, teamMemberMap]);

    // --- Filtered Quarterly Initiatives --- (NEW)
    const filteredQuarterlyInitiatives = useMemo<QuarterlyInitiative[]>(() => {
        let currentQIs = selectedGoalId ? quarterlyInitiatives.filter(qi => qi.parentGoalIds?.split('|').some(id => id.trim() === selectedGoalId)) : quarterlyInitiatives;

        if (ownerFilter && ownerFilter !== 'All') {
            currentQIs = currentQIs.filter(qi => {
                const owner = teamMemberMap.get(qi.ownerPersonId || '');
                return (owner?.fullName || qi.ownerPersonId) === ownerFilter;
            });
        }
        if (hubFilter && hubFilter !== 'All') {
            currentQIs = currentQIs.filter(qi => {
                const owner = teamMemberMap.get(qi.ownerPersonId || '');
                return (owner?.primaryHubName || qi.hubId) === hubFilter;
            });
        }
        return currentQIs;
    }, [quarterlyInitiatives, selectedGoalId, ownerFilter, hubFilter, teamMemberMap]);


    const toolbar = (
        <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => loadPortfolioData(true)} disabled={loading} variant="secondary">
                {loading ? 'Refreshing...' : 'Refresh 🔄'}
            </Button>
            <Select
                options={riskLevelOptions.map(r => ({ value: r, label: r }))}
                value={riskLevelFilter}
                onChange={(value) => setRiskLevelFilter(value as ProgramRiskLevel | 'All')}
                placeholder="Filter by Risk Level"
                className="w-40"
                aria-label="Filter programs by risk level"
            />
            <Select
                options={healthStatusOptions.map(h => ({ value: h, label: h }))}
                value={healthStatusFilter}
                onChange={(value) => setHealthStatusFilter(value as ProgramHealthStatus | 'All')}
                placeholder="Filter by Health Status"
                className="w-40"
                aria-label="Filter programs by health status"
            />
            <Select
                options={deadlineOptions}
                value={deadlineFilter}
                onChange={setDeadlineFilter}
                placeholder="Filter by Deadline"
                className="w-40"
                aria-label="Filter programs by deadline"
            />
            <Select
                options={budgetVarianceOptions}
                value={budgetVarianceFilter}
                onChange={setBudgetVarianceFilter}
                placeholder="Filter by Budget"
                className="w-40"
                aria-label="Filter programs by budget variance"
            />
            <Select
                options={allUniqueOwners.map(o => ({ value: o, label: o }))}
                value={ownerFilter}
                onChange={setOwnerFilter}
                placeholder="Filter by Owner"
                className="w-40"
                aria-label="Filter by owner"
            />
            <Select
                options={allUniqueHubs.map(h => ({ value: h, label: h }))}
                value={hubFilter}
                onChange={setHubFilter}
                placeholder="Filter by Hub"
                className="w-40"
                aria-label="Filter by hub"
            />
            <Select
                options={groupingOptions}
                value={grouping}
                onChange={(value) => setGrouping(value as 'none' | 'owner' | 'hub')}
                placeholder="Group By"
                className="w-40"
                aria-label="Group items by"
            />
        </div>
    )


    if (!isSignedIn && !isMockMode) {
        return (
            <ManagerEditorLayout title="Portfolio View">
                <Card title="Google Sign-in Required">
                    <EmptyState
                        title="Please sign in to view the portfolio"
                        description="Connect your Google account to fetch programs, projects, and tasks from Google Sheets."
                        action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>{isAuthActionInProgress ? 'Signing In...' : 'Sign in with Google 🚀'}</Button>}
                    />
                </Card>
            </ManagerEditorLayout>
        )
    }

    if (loading && !initialLoadComplete) {
        return <ManagerEditorLayout title="Portfolio View"><div className="text-center py-10 text-[var(--color-text-secondary)]">Loading portfolio data...</div></ManagerEditorLayout>
    }

    if (error && (!programs.length && !projects.length && !tasks.length && !milestones.length) && !isMockMode) {
        return (
            <ManagerEditorLayout title="Portfolio View">
                <Card title="Data Load Error">
                    <EmptyState title="Failed to load portfolio data" description={error} action={<Button onClick={() => loadPortfolioData(true)} variant="primary">Try Again</Button>} />
                </Card>
            </ManagerEditorLayout>
        )
    }

    const modalTitle = formState.mode === 'add' ? `Add New ${formState.type}` : `Edit ${formState.type}`

    return (
        <ManagerEditorLayout title="Portfolio View" toolbar={toolbar}>
            <p className="mb-8 text-[var(--color-text-secondary)]">Select an item to filter its children. Use the icons to manage items.</p>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-6" style={{ height: 'calc(100vh - 220px)' }}> {/* Adjusted grid columns */}
                {/* Strategic Initiatives Column */}
                <Card title={`⭐ Strategic Initiatives (${filteredStrategicInitiatives.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('strategicInitiative', 'add')}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {Object.keys(groupedStrategicInitiatives).length > 0 ? (Object.entries(groupedStrategicInitiatives) as [string, StrategicInitiative[]][]).map(([groupKey, groupItems]) => (
                            <div key={groupKey} className="pb-4">
                                {grouping !== 'none' && <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-surface)] py-1 -mx-2 px-2 z-10">{groupKey}</h3>}
                                {groupItems.map(si => {
                                    const owner = teamMemberMap.get(si.ownerPersonId || '');
                                    return (
                                        <div key={si.strategicInitiativeId}
                                             className={`p-3 rounded-md border-2 transition-all group cursor-pointer ${selectedStrategicInitiativeId === si.strategicInitiativeId ? 'bg-[var(--color-bg-stage)] border-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-surface)] border-transparent hover:border-[var(--color-border-primary)]'}`}
                                             style={{ boxShadow: 'var(--shadow-elevation)' }}
                                             onClick={() => handleStrategicInitiativeCardClick(si)}
                                             role="button"
                                             aria-label={`Strategic Initiative: ${si.strategicInitiativeName}, Status: ${si.status || 'N/A'}`}
                                             tabIndex={0}
                                             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStrategicInitiativeCardClick(si)}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 pr-2">
                                                    <p className="font-bold text-sm text-[var(--color-text-primary)]">{si.strategicInitiativeName}</p>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-[var(--color-text-secondary)] font-mono">
                                                            {owner ? (
                                                                <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                            ) : (si.ownerPersonId || 'Unassigned')}
                                                        </span>
                                                        {si.status && <StatusPill status={si.status}>{si.status}</StatusPill>}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('strategicInitiative', 'edit', si); }} title="Edit Strategic Initiative">✏️</Button>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )) : <EmptyState
                                title="No Strategic Initiatives"
                                description={isMockMode ? "No mock initiatives available." : "Define your top-level strategic initiatives."}
                             />}
                    </div>
                </Card>

                {/* Strategic Objectives Column */}
                <Card title={`🎯 Strategic Objectives (${filteredStrategicObjectives.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('strategicObjective', 'add')} disabled={!selectedStrategicInitiativeId}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {Object.keys(groupedStrategicObjectives).length > 0 ? (Object.entries(groupedStrategicObjectives) as [string, StrategicObjective[]][]).map(([groupKey, groupItems]) => (
                            <div key={groupKey} className="pb-4">
                                {grouping !== 'none' && <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-surface)] py-1 -mx-2 px-2 z-10">{groupKey}</h3>}
                                {groupItems.map(so => {
                                    const owner = teamMemberMap.get(so.ownerPersonId || '');
                                    return (
                                        <div key={so.objectiveId}
                                             className={`p-3 rounded-md border-2 transition-all group cursor-pointer ${selectedStrategicObjectiveId === so.objectiveId ? 'bg-[var(--color-bg-stage)] border-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-surface)] border-transparent hover:border-[var(--color-border-primary)]'}`}
                                             style={{ boxShadow: 'var(--shadow-elevation)' }}
                                             onClick={() => handleStrategicObjectiveCardClick(so)}
                                             role="button"
                                             aria-label={`Strategic Objective: ${so.objectiveName}, Status: ${so.status || 'N/A'}`}
                                             tabIndex={0}
                                             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleStrategicObjectiveCardClick(so)}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 pr-2">
                                                    <p className="font-bold text-sm text-[var(--color-text-primary)]">{so.objectiveName}</p>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-[var(--color-text-secondary)] font-mono">
                                                            {owner ? (
                                                                <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                            ) : (so.ownerPersonId || 'Unassigned')}
                                                        </span>
                                                        {so.status && <StatusPill status={so.status}>{so.status}</StatusPill>}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('strategicObjective', 'edit', so); }} title="Edit Strategic Objective">✏️</Button>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )) : <EmptyState
                                title={selectedStrategicInitiativeId ? "No Objectives for this Initiative" : "No Strategic Objectives"}
                                description={selectedStrategicInitiativeId ? "No objectives found for the selected initiative." : "Define your strategic objectives."}
                             />}
                    </div>
                </Card>

                {/* Goals Column */}
                <Card title={`🥅 Goals (${filteredGoals.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('goal', 'add')} disabled={!selectedStrategicObjectiveId}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {Object.keys(groupedGoals).length > 0 ? (Object.entries(groupedGoals) as [string, Goal[]][]).map(([groupKey, groupItems]) => (
                            <div key={groupKey} className="pb-4">
                                {grouping !== 'none' && <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-surface)] py-1 -mx-2 px-2 z-10">{groupKey}</h3>}
                                {groupItems.map(goal => {
                                    const owner = teamMemberMap.get(goal.ownerPersonId || '');
                                    return (
                                        <div key={goal.goalId}
                                             className={`p-3 rounded-md border-2 transition-all group cursor-pointer ${selectedGoalId === goal.goalId ? 'bg-[var(--color-bg-stage)] border-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-surface)] border-transparent hover:border-[var(--color-border-primary)]'}`}
                                             style={{ boxShadow: 'var(--shadow-elevation)' }}
                                             onClick={() => handleGoalCardClick(goal)}
                                             role="button"
                                             aria-label={`Goal: ${goal.goalName}, Status: ${goal.status || 'N/A'}`}
                                             tabIndex={0}
                                             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleGoalCardClick(goal)}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 pr-2">
                                                    <p className="font-bold text-sm text-[var(--color-text-primary)]">{goal.goalName}</p>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-[var(--color-text-secondary)] font-mono">
                                                            {owner ? (
                                                                <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                            ) : (goal.ownerPersonId || 'Unassigned')}
                                                        </span>
                                                        {goal.status && <StatusPill status={goal.status}>{goal.status}</StatusPill>}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('goal', 'edit', goal); }} title="Edit Goal">✏️</Button>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )) : <EmptyState
                                title={selectedStrategicObjectiveId ? "No Goals for this Objective" : "No Goals Found"}
                                description={selectedStrategicObjectiveId ? "No goals found for the selected objective." : "Define your strategic goals."}
                             />}
                    </div>
                </Card>


                <Card title={`🎯 Programs (${filteredPrograms.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('program', 'add')}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {(Object.entries(groupedPrograms) as [string, Program[]][]).map(([groupKey, groupItems]) => (
                            <div key={groupKey} className="pb-4">
                                {grouping !== 'none' && <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-surface)] py-1 -mx-2 px-2 z-10">{groupKey}</h3>}
                                {groupItems.map(program => {
                                    const progress = program.timelineProgressPct !== undefined && program.timelineProgressPct !== null ? Math.max(0, Math.min(100, program.timelineProgressPct)) : null
                                    const owner = teamMemberMap.get(program.ownerPersonId || '');
                                    return (
                                        <div key={program.programId}
                                             className={`p-3 rounded-md border-2 transition-all group cursor-pointer ${selectedProgramId === program.programId ? 'bg-[var(--color-bg-stage)] border-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-surface)] border-transparent hover:border-[var(--color-border-primary)]'}`}
                                             style={{ boxShadow: 'var(--shadow-elevation)' }}
                                             onClick={() => handleProgramCardClick(program)}
                                             role="button"
                                             aria-label={`Program: ${program.programName}, Status: ${program.status || 'N/A'}, Progress: ${progress !== null ? `${progress}%` : 'N/A'}`}
                                             tabIndex={0}
                                             onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleProgramCardClick(program)}>
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 pr-2">
                                                    <p className="font-bold text-sm text-[var(--color-text-primary)]">{program.programName}</p>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-[var(--color-text-secondary)] font-mono">
                                                            {owner ? (
                                                                <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                            ) : (program.ownerPersonId || 'Unassigned')}
                                                        </span>
                                                        {program.status && <StatusPill status={program.status}>{program.status}</StatusPill>}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('program', 'edit', program); }} title="Edit Program">✏️</Button>}
                                                </div>
                                            </div>
                                            {/* Progress Bar for Programs */}
                                            <div className="mt-2" role="progressbar" aria-valuenow={progress !== null ? progress : 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Program timeline progress: ${progress !== null ? `${progress}%` : 'Not available'}`}>
                                                <div className="w-full bg-[var(--color-border-primary)] rounded-full h-2">
                                                    <div className="h-full rounded-full transition-all duration-300"
                                                         style={{ width: progress !== null ? `${progress}%` : '0%', backgroundColor: progress !== null ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{progress !== null ? `${progress}% Progress` : 'N/A Progress'}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                        {Object.keys(groupedPrograms).length === 0 && <EmptyState
                                title="No Programs Found"
                                description={isMockMode ? "No mock programs available." : "There are no programs in your data source or none are loaded."}
                             />}
                    </div>
                </Card>

                <Card title={`🚧 Projects (${filteredProjects.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('project', 'add')} disabled={!selectedProgramId}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {(Object.entries(groupedProjects) as [string, Project[]][]).map(([groupKey, groupItems]) => (
                            <div key={groupKey} className="pb-4">
                                {grouping !== 'none' && <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-surface)] py-1 -mx-2 px-2 z-10">{groupKey}</h3>}
                                {groupItems.map(project => {
                                    const progress = project.completionPct !== undefined && project.completionPct !== null ? Math.max(0, Math.min(100, project.completionPct)) : null
                                    const owner = teamMemberMap.get(project.ownerId || '');
                                    return (
                                         <div key={project.projectId}
                                              className={`p-3 rounded-md border-2 transition-all group cursor-pointer ${selectedProjectId === project.projectId ? 'bg-[var(--color-bg-stage)] border-[var(--color-brand-primary)]' : 'bg-[var(--color-bg-surface)] border-transparent hover:border-[var(--color-border-primary)]'}`}
                                              style={{ boxShadow: 'var(--shadow-elevation)' }}
                                              onClick={() => handleProjectCardClick(project)}
                                              role="button"
                                              aria-label={`Project: ${project.projectName}, Status: ${project.status || 'N/A'}, Completion: ${progress !== null ? `${progress}%` : 'N/A'}`}
                                              tabIndex={0}
                                              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleProjectCardClick(project)}>
                                            <div className="flex items-start justify-between">
                                                 <div className="flex-1 pr-2">
                                                    <p className="font-bold text-sm text-[var(--color-text-primary)]">{project.projectName}</p>
                                                    <div className="flex items-center justify-between text-xs mt-1">
                                                        <span className="text-[var(--color-text-secondary)] font-mono">
                                                            {owner ? (
                                                                <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                            ) : (project.ownerName || 'Unassigned')}
                                                        </span>
                                                        {project.status && <StatusPill status={project.status}>{project.status}</StatusPill>}
                                                    </div>
                                                </div>
                                                <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('project', 'edit', project); }} title="Edit Project">✏️</Button>}
                                                </div>
                                            </div>
                                            {/* Progress Bar for Projects */}
                                            <div className="mt-2" role="progressbar" aria-valuenow={progress !== null ? progress : 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Project completion progress: ${progress !== null ? `${progress}%` : 'Not available'}`}>
                                                <div className="w-full bg-[var(--color-border-primary)] rounded-full h-2">
                                                    <div className="h-full rounded-full transition-all duration-300"
                                                         style={{ width: progress !== null ? `${progress}%` : '0%', backgroundColor: progress !== null ? 'var(--color-brand-primary)' : 'var(--color-text-secondary)' }}>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-[var(--color-text-secondary)] mt-1">{progress !== null ? `${progress}% Complete` : 'N/A Complete'}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                        {Object.keys(groupedProjects).length === 0 && (
                            <EmptyState
                                title={selectedProgramId ? "No Projects for this Program" : "No Projects Found"}
                                description={selectedProgramId ? "No projects found for the selected program. Ensure projects in your data source have a matching 'program_id'." : "There are no projects in your data source or none are loaded."}
                            />
                        )}
                    </div>
                </Card>

                {/* Quarterly Initiatives Column */}
                <Card title={`🗓️ Quarterly Initiatives (${filteredQuarterlyInitiatives.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('quarterlyInitiative', 'add')} disabled={!selectedGoalId}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {filteredQuarterlyInitiatives.length > 0 ? filteredQuarterlyInitiatives.map(qi => {
                            const owner = teamMemberMap.get(qi.ownerPersonId || '');
                            return (
                                <div key={qi.initiativeId}
                                 className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-transparent hover:border-[var(--color-border-primary)] group cursor-pointer"
                                 style={{ boxShadow: 'var(--shadow-elevation)' }}
                                 onClick={() => handleQuarterlyInitiativeCardClick(qi)}
                                 role="button"
                                 aria-label={`Quarterly Initiative: ${qi.initiativeName}, Status: ${qi.status || 'N/A'}`}
                                 tabIndex={0}
                                 onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleQuarterlyInitiativeCardClick(qi)}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-2">
                                        <p className="font-bold text-sm text-[var(--color-text-primary)]">{qi.initiativeName}</p>
                                        <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="text-[var(--color-text-secondary)]">
                                                {owner ? (
                                                    <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                ) : (qi.ownerPersonId || 'Unassigned')}
                                            </span>
                                            {qi.status && <StatusPill status={qi.status}>{qi.status}</StatusPill>}
                                        </div>
                                    </div>
                                    <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('quarterlyInitiative', 'edit', qi); }} title="Edit Quarterly Initiative">✏️</Button>}
                                    </div>
                                </div>
                            </div>
                        )}) : (
                            <EmptyState
                                title={selectedGoalId ? "No Initiatives for this Goal" : "No Quarterly Initiatives Found"}
                                description={selectedGoalId ? "No initiatives found for the selected goal." : "There are no quarterly initiatives in your data source or none are loaded."}
                            />
                        )}
                    </div>
                </Card>

                <Card title={`📝 Tasks (${filteredTasks.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('task', 'add')} disabled={!selectedProjectId && !selectedProgramId && !selectedGoalId}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {filteredTasks.length > 0 ? filteredTasks.map(task => {
                            const owner = teamMemberMap.get(task.ownerId || '');
                            return (
                                <div key={task.taskId}
                                 className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-transparent hover:border-[var(--color-border-primary)] group cursor-pointer"
                                 style={{ boxShadow: 'var(--shadow-elevation)' }}
                                 onClick={() => handleTaskCardClick(task)}
                                 role="button"
                                 aria-label={`Task: ${task.taskName}, Status: ${task.status || 'N/A'}`}
                                 tabIndex={0}
                                 onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleTaskCardClick(task)}>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-2">
                                        <p className="font-bold text-sm text-[var(--color-text-primary)]">{task.taskName}</p>
                                        <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="text-[var(--color-text-secondary)]">
                                                {owner ? (
                                                    <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                ) : (task.ownerName || 'Unassigned')}
                                            </span>
                                            {task.status && <StatusPill status={task.status}>{task.status}</StatusPill>}
                                        </div>
                                    </div>
                                    <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('task', 'edit', task); }} title="Edit Task">✏️</Button>}
                                    </div>
                                </div>
                            </div>
                        )}) : (
                            <EmptyState
                                title={selectedProjectId ? "No Tasks for this Project" : selectedProgramId ? "No Tasks for this Program" : selectedGoalId ? "No Tasks for this Goal" : "No Tasks Found"}
                                description={selectedProjectId ? "No tasks found for the selected project." : selectedProgramId ? "No tasks found for any project in the selected program." : selectedGoalId ? "No tasks found for any project/program linked to this goal. Ensure tasks in your data source have a matching 'project_id' or 'program_id'." : "There are no tasks in your data source or none are loaded."}
                            />
                        )}
                    </div>
                </Card>

                <Card title={`🏁 Milestones (${filteredMilestones.length})`} headerAction={!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('milestone', 'add')} disabled={!selectedProjectId && !selectedProgramId && !selectedGoalId}><span role="img" aria-label="plus">➕</span></Button>} className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
                    <div className="h-full overflow-y-auto space-y-2 p-2">
                        {filteredMilestones.length > 0 ? filteredMilestones.map(milestone => {
                            const owner = teamMemberMap.get(milestone.ownerId || '');
                            return (
                                <div key={milestone.milestoneId}
                                 className="p-3 rounded-md bg-[var(--color-bg-stage)] border border-transparent hover:border-[var(--color-border-primary)] group cursor-pointer"
                                 style={{ boxShadow: 'var(--shadow-elevation)' }}
                                 onClick={() => handleMilestoneCardClick(milestone)}
                                 role="button"
                                 aria-label={`Milestone: ${milestone.milestoneName}, Status: ${milestone.status || 'N/A'}`}
                                 tabIndex={0}
                                 onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleMilestoneCardClick(milestone)}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 pr-2">
                                        <p className="font-bold text-sm text-[var(--color-text-primary)]">{milestone.milestoneName}</p>
                                        <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="text-[var(--color-text-secondary)]">
                                                {owner ? (
                                                    <span className="cursor-pointer hover:underline" onClick={(e) => { e.stopPropagation(); handleOpenTeamMemberDrawer(owner); }}>{owner.fullName}</span>
                                                ) : (milestone.ownerName || 'Unassigned')}
                                            </span>
                                            {milestone.status && <StatusPill status={milestone.status}>{milestone.status}</StatusPill>}
                                        </div>
                                    </div>
                                    <div className="flex space-x-1 pl-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!isMockMode && <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); handleOpenForm('milestone', 'edit', milestone); }} title="Edit Milestone">✏️</Button>}
                                    </div>
                                </div>
                            </div>
                        )}) : (
                            <EmptyState
                                title={selectedProjectId ? "No Milestones for this Project" : selectedProgramId ? "No Milestones for this Program" : selectedGoalId ? "No Milestones for this Goal" : "No Milestones Found"}
                                description={selectedProjectId ? "No milestones found for the selected project." : selectedProgramId ? "No milestones found for any project in the selected program." : selectedGoalId ? "No milestones found for any project/program linked to this goal. Ensure milestones in your data source have a matching 'project_id' or 'program_id'." : "There are no milestones in your data source or none are loaded."}
                            />
                        )}
                    </div>
                </Card>
            </div>

            <PortfolioItemDetailDrawer
                isOpen={!!detailItem}
                onClose={() => setDetailItem(null)}
                onEdit={(type, item) => handleOpenForm(type, 'edit', item)}
                onDelete={(type, item) => setDeleteState({ isOpen: true, type, item })}
                data={detailItem}
                isMockMode={isMockMode}
                teamMemberMap={teamMemberMap} // Pass teamMemberMap
                onViewTeamMemberDetails={handleOpenTeamMemberDrawer} // Pass callback
            />

            <BmcItemDetailDrawer
                isOpen={!!selectedTeamMemberForDrawer}
                onClose={handleCloseTeamMemberDrawer}
                data={selectedTeamMemberForDrawer}
                onEdit={(sectionKey, item) => handleOpenForm(sectionKey as ItemType, 'edit', item)} // Re-use handleOpenForm
            />

            <Modal open={formState.isOpen} onClose={() => setFormState({ ...formState, isOpen: false })} title={modalTitle} className="max-w-2xl">
                {formState.type && (
                    <PortfolioItemForm
                        key={`${formState.type}-${getItemId(formState.item as Item, formState.type) || 'new'}`}
                        type={formState.type as ItemType}
                        item={formState.item as Partial<Item>}
                        onSave={handleSaveItem}
                        onCancel={() => setFormState({ ...formState, isOpen: false })}
                        programId={selectedProgramId}
                        projectId={selectedProjectId}
                        strategicInitiativeId={selectedStrategicInitiativeId} // NEW
                        strategicObjectiveId={selectedStrategicObjectiveId}   // NEW
                        goalId={selectedGoalId}                               // NEW
                        team={team}
                        hubs={hubs}
                    />
                )}
            </Modal>

            <ConfirmDialog
                open={deleteState.isOpen}
                onCancel={() => setDeleteState({ isOpen: false, type: null, item: null })}
                onConfirm={handleDelete}
                title={`Confirm Deletion`}
                body={`Are you sure you want to clear this ${deleteState.type}?. This action will clear the row in Google Sheets but will not delete the row itself.`}
                confirmLabel="Clear Row"
                tone="danger"
            />
        </ManagerEditorLayout>
    )
}

export default PortfolioViewPage;