
import React, { createContext, useState, useContext, useCallback, ReactNode, useEffect } from 'react'
import {
  Program, Project, Task, Milestone, PortfolioItemType, TeamMember, Hub, CustomerSegment,
  StrategicInitiative, StrategicObjective, Goal, QuarterlyInitiative, ResourceAllocationBudget, BMCSheetConfigItem
} from '../types'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'
import { fetchValues, updateValues, appendValues, fetchHeaders } from '../lib/sheets'
import { getEnv } from '../lib/env'
import { requestAllGoogleApiTokens } from '../lib/googleAuth';

import { PROGRAMS_SHEET_CONFIG } from '../src/config/programSheetConfig'
import { parseProgramsData } from '../services/programSheetsParser'
import { PROJECTS_SHEET_CONFIG } from '../src/config/projectSheetConfig'
import { parseProjectsData } from '../services/projectSheetsParser'
import { TASKS_SHEET_CONFIG } from '../src/config/taskSheetConfig'
import { parseTasksData } from '../services/taskSheetsParser'
import { MILESTONES_SHEET_CONFIG } from '../src/config/milestoneSheetConfig'
import { parseMilestonesData } from '../services/milestoneSheetsParser'
import { STRATEGIC_INITIATIVE_SHEET_CONFIG } from '../src/config/strategicInitiativeSheetConfig';
import { parseStrategicInitiativesData } from '../services/strategicInitiativeSheetsParser';
import { STRATEGIC_OBJECTIVE_SHEET_CONFIG } from '../src/config/strategicObjectiveSheetConfig';
import { parseStrategicObjectivesData } from '../services/strategicObjectiveSheetsParser';
import { GOAL_SHEET_CONFIG } from '../src/config/goalSheetConfig';
import { parseGoalsData } from '../services/goalSheetsParser';
import { QUARTERLY_INITIATIVE_SHEET_CONFIG } from '../src/config/quarterlyInitiativeSheetConfig';
import { parseQuarterlyInitiativesData } from '../services/quarterlyInitiativeSheetsParser';
import { RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG } from '../src/config/resourceAllocationBudgetSheetConfig';
import { parseResourceAllocationBudgetsData } from '../services/resourceAllocationBudgetSheetsParser';

import {
  mockPrograms, mockProjects, mockTasks, mockMilestones, mockBmcData,
  mockStrategicInitiatives, mockStrategicObjectives, mockGoals, mockQuarterlyInitiatives, mockResourceAllocationBudgets
} from '../lib/mockData'
import { BMC_SHEET_CONFIGS } from '../hooks/useBmc';
import { parseObjectListSection } from '../services/bmcSheetsParser';
import { bmcRegistry } from '../lib/dataRegistry';

interface PortfolioContextType {
    programs: Program[];
    projects: Project[];
    tasks: Task[];
    milestones: Milestone[];
    strategicInitiatives: StrategicInitiative[];
    strategicObjectives: StrategicObjective[];
    goals: Goal[];
    quarterlyInitiatives: QuarterlyInitiative[];
    resourceAllocationBudgets: ResourceAllocationBudget[];
    team: TeamMember[];
    hubs: Hub[];
    customerSegments: CustomerSegment[];
    teamMemberMap: Map<string, TeamMember>;
    loading: boolean;
    error: string | null;
    initialLoadComplete: boolean;
    showPermissionPrompt: boolean;
    programSheetId: string; projectSheetId: string; taskSheetId: string; milestoneSheetId: string;
    strategicInitiativeSheetId: string; strategicObjectiveSheetId: string; goalSheetId: string;
    quarterlyInitiativeSheetId: string; resourceAllocationBudgetSheetId: string;
    // Fix: Added missing setters to PortfolioContextType
    setProgramSheetId: (id: string) => void;
    setProjectSheetId: (id: string) => void;
    setTaskSheetId: (id: string) => void;
    setMilestoneSheetId: (id: string) => void;
    setStrategicInitiativeSheetId: (id: string) => void;
    setStrategicObjectiveSheetId: (id: string) => void;
    setGoalSheetId: (id: string) => void;
    setQuarterlyInitiativeSheetId: (id: string) => void;
    setResourceAllocationBudgetSheetId: (id: string) => void;
    loadPortfolioData: (forceRefresh?: boolean) => Promise<void>;
    handleGrantSheetsAccess: () => Promise<void>;
    saveItem: (type: PortfolioItemType, data: any, parentId: string | null) => Promise<void>;
    deleteItem: (type: PortfolioItemType, item: any) => Promise<void>;
    selectedProgramId: string | null; setSelectedProgramId: (id: string | null) => void;
    selectedProjectId: string | null; setSelectedProjectId: (id: string | null) => void;
    selectedStrategicInitiativeId: string | null; setSelectedStrategicInitiativeId: (id: string | null) => void;
    selectedStrategicObjectiveId: string | null; setSelectedStrategicObjectiveId: (id: string | null) => void;
    selectedGoalId: string | null; setSelectedGoalId: (id: string | null) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isSignedIn, isMockMode } = useAuth();
    const { addToast } = useToast();

    // Data States
    const [programs, setPrograms] = useState<Program[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [milestones, setMilestones] = useState<Milestone[]>([]);
    const [strategicInitiatives, setStrategicInitiatives] = useState<StrategicInitiative[]>([]);
    const [strategicObjectives, setStrategicObjectives] = useState<StrategicObjective[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [quarterlyInitiatives, setQuarterlyInitiatives] = useState<QuarterlyInitiative[]>([]);
    const [resourceAllocationBudgets, setResourceAllocationBudgets] = useState<ResourceAllocationBudget[]>([]);
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [hubs, setHubs] = useState<Hub[]>([]);
    const [customerSegments, setCustomerSegments] = useState<CustomerSegment[]>([]);
    const [teamMemberMap, setTeamMemberMap] = useState<Map<string, TeamMember>>(new Map());

    // Navigation States
    const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [selectedStrategicInitiativeId, setSelectedStrategicInitiativeId] = useState<string | null>(null);
    const [selectedStrategicObjectiveId, setSelectedStrategicObjectiveId] = useState<string | null>(null);
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [initialLoadComplete, setInitialLoadComplete] = useState(false);
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

    // Sheet IDs with local state and localStorage persistence
    const [programSheetId, setProgramSheetId] = useState(() => localStorage.getItem('programs_google_sheet_id') || getEnv('PROGRAMS_GOOGLE_SHEET_ID'));
    const [projectSheetId, setProjectSheetId] = useState(() => localStorage.getItem('projects_google_sheet_id') || getEnv('PROJECTS_GOOGLE_SHEET_ID'));
    const [taskSheetId, setTaskSheetId] = useState(() => localStorage.getItem('tasks_google_sheet_id') || getEnv('TASKS_GOOGLE_SHEET_ID'));
    const [milestoneSheetId, setMilestoneSheetId] = useState(() => localStorage.getItem('milestones_google_sheet_id') || getEnv('MILESTONES_GOOGLE_SHEET_ID'));
    const [strategicInitiativeSheetId, setStrategicInitiativeSheetId] = useState(() => localStorage.getItem('strategic_initiatives_google_sheet_id') || getEnv('STRATEGIC_INITIATIVES_GOOGLE_SHEET_ID'));
    const [strategicObjectiveSheetId, setStrategicObjectiveSheetId] = useState(() => localStorage.getItem('strategic_objectives_google_sheet_id') || getEnv('STRATEGIC_OBJECTIVES_GOOGLE_SHEET_ID'));
    const [goalSheetId, setGoalSheetId] = useState(() => localStorage.getItem('goals_google_sheet_id') || getEnv('GOALS_GOOGLE_SHEET_ID'));
    const [quarterlyInitiativeSheetId, setQuarterlyInitiativeSheetId] = useState(() => localStorage.getItem('quarterly_initiatives_google_sheet_id') || getEnv('QUARTERLY_INITIATIVES_GOOGLE_SHEET_ID'));
    const [resourceAllocationBudgetSheetId, setResourceAllocationBudgetSheetId] = useState(() => localStorage.getItem('resource_allocation_budget_google_sheet_id') || getEnv('RESOURCE_ALLOCATION_BUDGET_GOOGLE_SHEET_ID'));

    // Fix: Helper to update state and storage
    const updateSheetId = useCallback((setter: (id: string) => void, lsKey: string, id: string) => {
      localStorage.setItem(lsKey, id);
      setter(id);
    }, []);

    const loadPortfolioData = useCallback(async (forceRefresh = false) => {
        if (isMockMode) {
            setPrograms(mockPrograms); setProjects(mockProjects); setTasks(mockTasks); setMilestones(mockMilestones);
            setStrategicInitiatives(mockStrategicInitiatives); setStrategicObjectives(mockStrategicObjectives);
            setGoals(mockGoals); setQuarterlyInitiatives(mockQuarterlyInitiatives);
            setResourceAllocationBudgets(mockResourceAllocationBudgets);
            setTeam(mockBmcData.team); setHubs(mockBmcData.hubs);
            setInitialLoadComplete(true);
            return;
        }

        if (!isSignedIn) return;
        setLoading(true);

        try {
            const bmcId = getEnv('BMC_GOOGLE_SHEET_ID');
            const [progRes, projRes, taskRes, mileRes, stratInitRes, stratObjRes, goalRes, quartRes, budgetRes, teamRes, hubsRes] = await Promise.all([
                fetchValues(programSheetId, 'PROGRAMS!A:AZ'),
                fetchValues(projectSheetId, 'Project!A:AZ'),
                fetchValues(taskSheetId, 'task!A:AZ'),
                fetchValues(milestoneSheetId, 'Milestones!A:AZ'),
                fetchValues(strategicInitiativeSheetId, 'STRATEGIC INITIATIVES!A:AZ'),
                fetchValues(strategicObjectiveSheetId, 'strategic_objectives!A:AZ'),
                fetchValues(goalSheetId, 'GOALS!A:AZ'),
                fetchValues(quarterlyInitiativeSheetId, 'quarterly_initiatives!A:AZ'),
                fetchValues(resourceAllocationBudgetSheetId, 'RESOURCE_ALLOCATION_BUDGET!A:AZ'),
                fetchValues(bmcId, 'People!A:AZ'),
                fetchValues(bmcId, 'Hubs!A:AZ')
            ]);

            if (progRes.values) setPrograms(parseProgramsData(progRes.values, PROGRAMS_SHEET_CONFIG));
            if (projRes.values) setProjects(parseProjectsData(projRes.values, PROJECTS_SHEET_CONFIG));
            if (taskRes.values) setTasks(parseTasksData(taskRes.values, TASKS_SHEET_CONFIG));
            if (mileRes.values) setMilestones(parseMilestonesData(mileRes.values, MILESTONES_SHEET_CONFIG));
            if (stratInitRes.values) setStrategicInitiatives(parseStrategicInitiativesData(stratInitRes.values, STRATEGIC_INITIATIVE_SHEET_CONFIG));
            if (stratObjRes.values) setStrategicObjectives(parseStrategicObjectivesData(stratObjRes.values, STRATEGIC_OBJECTIVE_SHEET_CONFIG));
            if (goalRes.values) setGoals(parseGoalsData(goalRes.values, GOAL_SHEET_CONFIG));
            if (quartRes.values) setQuarterlyInitiatives(parseQuarterlyInitiativesData(quartRes.values, QUARTERLY_INITIATIVE_SHEET_CONFIG));
            if (budgetRes.values) setResourceAllocationBudgets(parseResourceAllocationBudgetsData(budgetRes.values, RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG));
            
            if (teamRes.values) {
                const parsedTeam = parseObjectListSection(teamRes.values, BMC_SHEET_CONFIGS.find(c => c.sectionKey === 'team')!);
                setTeam(parsedTeam);
                const map = new Map();
                parsedTeam.forEach((t: any) => map.set(t.id, t));
                setTeamMemberMap(map);
            }
            if (hubsRes.values) setHubs(parseObjectListSection(hubsRes.values, BMC_SHEET_CONFIGS.find(c => c.sectionKey === 'hubs')!));

            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
            setInitialLoadComplete(true);
        }
    }, [isSignedIn, isMockMode, programSheetId, projectSheetId, taskSheetId, milestoneSheetId, strategicInitiativeSheetId, strategicObjectiveSheetId, goalSheetId, quarterlyInitiativeSheetId, resourceAllocationBudgetSheetId]);

    const saveItem = useCallback(async (type: PortfolioItemType, data: any, parentId: string | null) => {
        if (isMockMode) {
            addToast("Mock Mode: Changes not saved to Sheets.", "info");
            return;
        }

        const configMap: Record<string, any> = {
            program: { config: PROGRAMS_SHEET_CONFIG, id: programSheetId, list: programs, idKey: 'programId' },
            project: { config: PROJECTS_SHEET_CONFIG, id: projectSheetId, list: projects, idKey: 'projectId' },
            task: { config: TASKS_SHEET_CONFIG, id: taskSheetId, list: tasks, idKey: 'taskId' },
            milestone: { config: MILESTONES_SHEET_CONFIG, id: milestoneSheetId, list: milestones, idKey: 'milestoneId' },
            strategicInitiative: { config: STRATEGIC_INITIATIVE_SHEET_CONFIG, id: strategicInitiativeSheetId, list: strategicInitiatives, idKey: 'strategicInitiativeId' },
            strategicObjective: { config: STRATEGIC_OBJECTIVE_SHEET_CONFIG, id: strategicObjectiveSheetId, list: strategicObjectives, idKey: 'objectiveId' },
            goal: { config: GOAL_SHEET_CONFIG, id: goalSheetId, list: goals, idKey: 'goalId' },
            quarterlyInitiative: { config: QUARTERLY_INITIATIVE_SHEET_CONFIG, id: quarterlyInitiativeSheetId, list: quarterlyInitiatives, idKey: 'initiativeId' },
            resourceAllocationBudget: { config: RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG, id: resourceAllocationBudgetSheetId, list: resourceAllocationBudgets, idKey: 'budgetCategoryId' }
        };

        const { config, id: sheetId, list, idKey } = configMap[type];
        const headers = await fetchHeaders(sheetId, `${config.sheetName}!A:AZ`, config.headerRow);
        
        const existingIdx = list.findIndex((item: any) => item[idKey] === data[idKey]);
        const finalData = { ...data };
        if (!finalData[idKey]) finalData[idKey] = `${type.toUpperCase().slice(0,3)}-${Date.now()}`;

        const rowData = headers.map(h => {
            const field = Object.keys(config.fieldToHeaderMap).find(k => config.fieldToHeaderMap[k] === h);
            return field ? String(finalData[field] || '') : '';
        });

        try {
            if (existingIdx > -1) {
                const rowNum = config.headerRow + 1 + existingIdx;
                await updateValues(sheetId, `${config.sheetName}!A${rowNum}`, [rowData]);
            } else {
                await appendValues(sheetId, config.sheetName, [rowData]);
            }
            addToast("Saved to Google Sheets successfully!", "success");
            loadPortfolioData(true);
        } catch (e: any) {
            addToast(`Save failed: ${e.message}`, "error");
        }
    }, [isMockMode, addToast, loadPortfolioData, programs, projects, tasks, milestones, strategicInitiatives, strategicObjectives, goals, quarterlyInitiatives, resourceAllocationBudgets, programSheetId, projectSheetId, taskSheetId, milestoneSheetId, strategicInitiativeSheetId, strategicObjectiveSheetId, goalSheetId, quarterlyInitiativeSheetId, resourceAllocationBudgetSheetId]);

    const deleteItem = useCallback(async (type: PortfolioItemType, item: any) => {
        // Implementation for clearing a row
        addToast("Clearing records is not fully enabled in this build.", "info");
    }, [addToast]);

    useEffect(() => {
        if (!initialLoadComplete) loadPortfolioData();
    }, [initialLoadComplete, loadPortfolioData]);

    return (
        <PortfolioContext.Provider value={{
            programs, projects, tasks, milestones, 
            strategicInitiatives, strategicObjectives, goals, quarterlyInitiatives, resourceAllocationBudgets,
            team, hubs, customerSegments, teamMemberMap, loading, error, initialLoadComplete, showPermissionPrompt,
            programSheetId, projectSheetId, taskSheetId, milestoneSheetId,
            strategicInitiativeSheetId, strategicObjectiveSheetId, goalSheetId,
            quarterlyInitiativeSheetId, resourceAllocationBudgetSheetId,
            // Fix: Provided implementation for setters in the value object
            setProgramSheetId: (id) => updateSheetId(setProgramSheetId, 'programs_google_sheet_id', id),
            setProjectSheetId: (id) => updateSheetId(setProjectSheetId, 'projects_google_sheet_id', id),
            setTaskSheetId: (id) => updateSheetId(setTaskSheetId, 'tasks_google_sheet_id', id),
            setMilestoneSheetId: (id) => updateSheetId(setMilestoneSheetId, 'milestones_google_sheet_id', id),
            setStrategicInitiativeSheetId: (id) => updateSheetId(setStrategicInitiativeSheetId, 'strategic_initiatives_google_sheet_id', id),
            setStrategicObjectiveSheetId: (id) => updateSheetId(setStrategicObjectiveSheetId, 'strategic_objectives_google_sheet_id', id),
            setGoalSheetId: (id) => updateSheetId(setGoalSheetId, 'goals_google_sheet_id', id),
            setQuarterlyInitiativeSheetId: (id) => updateSheetId(setQuarterlyInitiativeSheetId, 'quarterly_initiatives_google_sheet_id', id),
            setResourceAllocationBudgetSheetId: (id) => updateSheetId(setResourceAllocationBudgetSheetId, 'resource_allocation_budget_google_sheet_id', id),
            loadPortfolioData, handleGrantSheetsAccess: async () => {},
            saveItem, deleteItem,
            selectedProgramId, setSelectedProgramId,
            selectedProjectId, setSelectedProjectId,
            selectedStrategicInitiativeId, setSelectedStrategicInitiativeId,
            selectedStrategicObjectiveId, setSelectedStrategicObjectiveId,
            selectedGoalId, setSelectedGoalId
        }}>
            {children}
        </PortfolioContext.Provider>
    );
};

export const usePortfolio = () => {
    const context = useContext(PortfolioContext);
    if (!context) throw new Error('usePortfolio must be used within PortfolioProvider');
    return context;
};
