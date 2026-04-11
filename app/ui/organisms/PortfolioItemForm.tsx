
import React, { useState, useMemo } from 'react'
import {
  Program, Project, Task, Milestone, 
  StrategicInitiative, StrategicObjective, Goal, 
  QuarterlyInitiative, ResourceAllocationBudget,
  TeamMember, Hub
} from '../../types'
import { Input, Select, Textarea, Button } from '../index';
import { PROGRAMS_SHEET_CONFIG } from '../../src/config/programSheetConfig'
import { PROJECTS_SHEET_CONFIG } from '../../src/config/projectSheetConfig'
import { TASKS_SHEET_CONFIG } from '../../src/config/taskSheetConfig'
import { MILESTONES_SHEET_CONFIG } from '../../src/config/milestoneSheetConfig'
import { STRATEGIC_INITIATIVE_SHEET_CONFIG } from '../../src/config/strategicInitiativeSheetConfig';
import { STRATEGIC_OBJECTIVE_SHEET_CONFIG } from '../../src/config/strategicObjectiveSheetConfig';
import { GOAL_SHEET_CONFIG } from '../../src/config/goalSheetConfig';
import { QUARTERLY_INITIATIVE_SHEET_CONFIG } from '../../src/config/quarterlyInitiativeSheetConfig';
import { RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG } from '../../src/config/resourceAllocationBudgetSheetConfig';

type ItemType = 'program' | 'project' | 'task' | 'milestone' | 'strategicInitiative' | 'strategicObjective' | 'goal' | 'quarterlyInitiative' | 'resourceAllocationBudget';
type Item = any;

interface PortfolioItemFormProps {
  type: ItemType
  item: Partial<Item> | null
  onSave: (itemData: Partial<Item>) => void
  onCancel: () => void
  team: TeamMember[];
  hubs: Hub[];
  programId?: string | null;
  projectId?: string | null;
  strategicInitiativeId?: string | null;
  strategicObjectiveId?: string | null;
  goalId?: string | null;
}

const configMap = {
  program: PROGRAMS_SHEET_CONFIG,
  project: PROJECTS_SHEET_CONFIG,
  task: TASKS_SHEET_CONFIG,
  milestone: MILESTONES_SHEET_CONFIG,
  strategicInitiative: STRATEGIC_INITIATIVE_SHEET_CONFIG,
  strategicObjective: STRATEGIC_OBJECTIVE_SHEET_CONFIG,
  goal: GOAL_SHEET_CONFIG,
  quarterlyInitiative: QUARTERLY_INITIATIVE_SHEET_CONFIG,
  resourceAllocationBudget: RESOURCE_ALLOCATION_BUDGET_SHEET_CONFIG,
};

const PortfolioItemForm: React.FC<PortfolioItemFormProps> = ({ 
  type, item, onSave, onCancel, team, hubs,
  programId, projectId, strategicInitiativeId, strategicObjectiveId, goalId 
}) => {
  const config = configMap[type];
  
  const [formData, setFormData] = useState<any>(() => {
    const base = item || {};
    // Inject parent relations if this is a new item
    if (!item?.id) {
      if (type === 'project') return { ...base, programId: programId };
      if (type === 'task' || type === 'milestone') return { ...base, projectId: projectId };
      if (type === 'strategicObjective') return { ...base, parentStrategicInitiativeId: strategicInitiativeId };
      if (type === 'goal') return { ...base, parentObjectiveId: strategicObjectiveId };
      if (type === 'quarterlyInitiative') return { ...base, parentGoalIds: goalId };
    }
    return base;
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const fields = useMemo(() => {
    return Object.entries(config.fieldToHeaderMap).map(([key, label]) => {
      const isId = key.toLowerCase().includes('id');
      const isDescription = key.toLowerCase().includes('description') || key.toLowerCase().includes('notes') || key.toLowerCase().includes('outcome');
      const isDate = key.toLowerCase().includes('date') || key.toLowerCase().includes('timeline');
      const isOwner = key.toLowerCase().includes('owner') || key.toLowerCase().includes('person');
      const isHub = key.toLowerCase().includes('hub');
      
      return {
        key,
        label: String(label),
        type: isDescription ? 'textarea' : isDate ? 'date' : (isOwner || isHub) ? 'select' : 'text',
        disabled: isId && !!formData.id
      };
    });
  }, [config, formData.id]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map(field => {
          const value = formData[field.key] || '';
          
          if (field.type === 'select') {
            const options = field.key.toLowerCase().includes('hub') 
              ? hubs.map(h => ({ value: h.id, label: h.name }))
              : team.map(t => ({ value: t.id, label: t.fullName }));
              
            return (
              <Select 
                key={field.key} 
                label={field.label} 
                value={value} 
                options={options} 
                onChange={v => handleInputChange(field.key, v)} 
              />
            );
          }

          if (field.type === 'textarea') {
            return (
              <div key={field.key} className="md:col-span-2">
                <Textarea 
                  label={field.label} 
                  value={value} 
                  onChange={e => handleInputChange(field.key, e.target.value)} 
                  rows={3}
                />
              </div>
            );
          }

          return (
            <Input 
              key={field.key}
              label={field.label}
              type={field.type}
              value={value}
              disabled={field.disabled}
              onChange={e => handleInputChange(field.key, e.target.value)}
            />
          );
        })}
      </div>
      
      <div className="flex justify-end gap-3 sticky bottom-0 bg-[var(--color-bg-surface)] py-4 border-t border-[var(--color-border-primary)]">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Commit to Sheet 💾</Button>
      </div>
    </form>
  )
}

export default PortfolioItemForm
