import React, { useMemo } from 'react';
import { ManagerEditorLayout, Card, Table } from '../ui'; // FIX: Updated imports to use ui barrel

const schemaCsvData = `spreadsheet_id,spreadsheet_name,sheet_name,gid,header,sample_value
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,program_id,PROG-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,program_name,Shopify App Launch
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,segment_ids,SEG-04
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,flywheel_id,FLW-03
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,initiative_id,Q1-I1
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,status,In Progress
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,priority,Critical
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,owner_person_id,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,hub_id,HUB-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,hub_ids,HUB-01|HUB-02
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,linked_business_unit_ids,BU-03
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,customer_problem,"Partners lack an easy way to sell our products"
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,our_solution,A seamless Shopify app for partners.
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,why_now,"Shopify's market share is growing rapidly"
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,timeline_start,2025-04-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,timeline_end,2025-06-30
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,success_metric,Partner Activation Rate
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,target_value,60%
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,current_value,33%
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,metric_progress_pct,50
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_total,500000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_spent,325000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_remaining,175000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,risk_level,Medium
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,health_status,On Track
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,blockers,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,next_milestone,Finalize Marketing Assets
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,next_milestone_date,2025-06-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,days_to_next_milestone,30
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,dependent_program_ids,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,platform_ids,PLT-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,channel_ids,CHL-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,created_date,2025-03-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,last_updated,2025-05-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,updated_by_person_id,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,notes,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,days_total,90
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,days_elapsed,45
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,days_remaining,45
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,timeline_progress_pct,65
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_variance,0
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,velocity_score,1.2
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,weekly_burn_rate,50000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,runway_days,24
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,on_track_indicator,Yes
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_burn_rate_pct,65%
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,projects_count,2
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,projects_active,2
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,projects_blocked,0
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,projects_complete,0
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,program_completion_pct,58%
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,tasks_total,15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,tasks_complete,8
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,tasks_blocked,1
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_original,500000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,budget_revised1,500000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,created_at,2025-03-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,created_by,PER-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,updated_at,2025-05-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,PROGRAMS,0,updated_by,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,project_id,PRJ-101
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,project_name,Shopify App Core Feature Dev
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,program_id,PROG-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,program_name,Shopify App Launch
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,initiative_id,Q1-I1
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,owner_person_id,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,owner_name,Nirmal
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,hub_id,HUB-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,hub_name,Digital Platform
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,status,In Progress
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,priority,High
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,start_date,2025-04-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,end_date,2025-06-30
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,budget,300000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,dependencies,PRJ-102
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,success_metric,Core features delivered
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,revenue_impact,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,project_type,Technology
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,business_unit_impact,BU-03
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,segment_impact,SEG-04
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,platform_id,PLT-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,channel_ids,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,completion_pct,70
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,health_score,92
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,actual_end_date,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,milestones_count,2
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,tasks_count,10
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,tasks_complete,7
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,tasks_in_progress,2
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,tasks_blocked,1
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,days_to_deadline,45
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,budget_spent,210000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,budget_variance,-10000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,velocity_tasks_per_day,0.5
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,is_on_time,Yes
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,budget_original,300000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,budget_revised,300000
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,created_at,2025-03-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,created_by,PER-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,updated_at,2025-05-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Project,719163995,updated_by,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,task_id,TSK-1101
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,project_id,PRJ-101
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,milestone_id,M-101-A
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,9632111628,task_name,Develop User Authentication
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,owner_person_id,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,owner_name,Nirmal
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,hub_id,HUB-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,hub_name,Digital Platform
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,description,Set up auth flow using JWT
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,priority,High
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,status,Completed
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,effort_hours,16
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,due_date,2025-04-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,dependencies,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,assignee_ids,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,task_category,Backend
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,task_type,Development
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,actual_completion_date,2025-04-14
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,notes,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,impact_if_delayed,Minor
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,age_days,30
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,created_at,2025-04-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,created_by,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,updated_at,2025-04-14
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,task,963211628,updated_by,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,milestone_id,M-101-A
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,project_id,PRJ-101
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,milestone_name,Alpha Version Release
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,owner_name,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,owner,Nirmal
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,start_date,2025-04-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,target_date,2025-05-15
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,status,In Progress
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,completion_%,60%
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,Task_blocker,TSK-1103
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,Tasks_Count,5
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,Tasks_Complete,3
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,Calc_Completion_%,60%
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,Days_to_Target,30
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,milestone_type,Release
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,blocker_type,Dependency
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,dependent_milestone_ids,M-101-B
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,actual_completion_date,
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,created_at,2025-04-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,created_by,PER-05
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,updated_at,2025-05-01
1y1rke6XG8SIs9O6bjOFhronEyzMhOsnsIDydTiop-wA,YDS - Management,Milestones,246947641,updated_by,PER-05
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Tier,Tier 1
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Brand,Printify
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Website,https://printify.com/
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Instagram,https://www.instagram.com/printify/
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Logo,
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Category,POD Marketplace
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Secondary Category,
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Tags,"Global, Dropshipping, Wide Catalog"
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Core Strengths,Vast network of print providers
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,Competitors,915101242,Typical Use,E-commerce sellers for dropshipping
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Competitor,Printify
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Insight,Focuses on empowering merchants over end-customers
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Visual Identity,Clean, corporate, tech-focused
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Positioning,The platform for e-commerce entrepreneurs
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Messaging,Scale your business, we handle the rest
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,UX,Functional, utilitarian, complex for beginners
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Strategic Note,Their weakness is our D2C strength - no minimums and local speed.
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Home Page UX,Heavy on testimonials and partner logos
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Customizer Interface (Editor UX),Robust but can be overwhelming
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Product Page UX (Storefront),N/A (B2B platform)
1D12Ns5tqSbk1Gblf3kthQXnYmcOhfap0JfzJb5KzcwI,YDS - Competitor Landscape,analysis,171694668,Catalog & Template System,Extensive but generic
`;

interface SchemaRow {
  header: string;
  sampleValue: string;
}

interface SheetSchema {
  sheetName: string;
  gid: string;
  spreadsheetId: string;
  spreadsheetName: string;
  rows: SchemaRow[];
}

const parseSchemaCsv = (csv: string): SheetSchema[] => {
  const lines = csv.trim().split('\n');
  const headerLine = lines.shift(); // remove header
  if (!headerLine) return [];

  const groupedBySheet = lines.reduce((acc, line) => {
    // This is a simple parser. It will not handle all CSV edge cases perfectly,
    // especially commas within quoted fields. It's designed for the provided data structure.
    const parts = line.split(',');
    if (parts.length < 5) return acc;
    
    const spreadsheet_id = parts[0];
    const spreadsheet_name = parts[1];
    const sheet_name = parts[2];
    const gid = parts[3];
    const header = parts[4];
    const sample_value = parts.slice(5).join(',');

    if (!spreadsheet_id || !sheet_name || !header || sheet_name.trim() === '') return acc;
    
    const cleanHeader = header.replace(/^"|"$/g, '');
    const cleanSampleValue = sample_value.replace(/^"|"$/g, '').replace(/""/g, '"');

    const uniqueSheetKey = `${spreadsheet_id}_${sheet_name}_${gid}`;

    if (!acc[uniqueSheetKey]) {
      acc[uniqueSheetKey] = {
        sheetName: sheet_name,
        gid: gid,
        spreadsheetId: spreadsheet_id,
        spreadsheetName: spreadsheet_name,
        rows: [],
      };
    }
    
    // If the "header" field contains commas, it's likely a row describing all headers.
    // We will display it as such for transparency.
    acc[uniqueSheetKey].rows.push({ header: cleanHeader, sampleValue: cleanSampleValue });
    return acc;
  }, {} as Record<string, SheetSchema>);

  return Object.values(groupedBySheet);
};


const SheetSchemaPage: React.FC = () => {
  const schemas = useMemo(() => parseSchemaCsv(schemaCsvData), []);

  return (
    <ManagerEditorLayout title="Sheet Schema Viewer">
      <p className="mb-8 text-[var(--color-text-secondary)]">
        This page displays the detailed schema for each Google Sheet used as a data source, including headers and sample values, based on the provided manifest.
      </p>

      {schemas.length === 0 ? (
        <Card>
          <p>No schema data available to display.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {schemas.map(schema => (
            <Card key={`${schema.spreadsheetId}-${schema.gid}`} title={`${schema.sheetName} (gid: ${schema.gid})`}>
              <div className="mb-4 text-xs text-[var(--color-text-secondary)]">
                <p><strong>Spreadsheet:</strong> {schema.spreadsheetName}</p>
                <p><strong>ID:</strong> {schema.spreadsheetId}</p>
              </div>
              <Table headers={['Header', 'Sample Value']}>
                {schema.rows.map((row, index) => (
                  <tr key={index} className="hover:bg-[var(--color-bg-stage)]/80">
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-[var(--color-text-primary)]">{row.header}</td>
                    <td className="px-6 py-3 text-sm text-[var(--color-text-secondary)] break-words">{row.sampleValue}</td>
                  </tr>
                ))}
              </Table>
            </Card>
          ))}
        </div>
      )}
    </ManagerEditorLayout>
  );
};

export default SheetSchemaPage;