import React, { useState, useMemo } from 'react'
import {
  BusinessModelCanvasData, PartnerStatus, PartnerRiskLevel, CustomerSegmentStatus, CostType, PlatformType, PlatformStatus,
  MetricCategory, MetricStatus, GapActionPriority, GapActionStatus,
  Strategy,
  CustomerSegment,
  BusinessUnit,
  Flywheel,
  KeyActivity, KeyResource, CustomerRelationship, Channel, RevenueStream, Cost, TeamMember, Hub, Metric, GapAction, ValueProposition,
  Partner,
  Platform,
} from '../../types'
import { BMC_SHEET_CONFIGS } from '../../hooks/useBmc'
import { bmcRegistry } from '../../lib/dataRegistry'; // NEW: Import registry
import { usePicklists } from '../../hooks/usePicklists'; // NEW: Import picklists hook
import { Input, Select, Textarea, Button, MultiSelect } from '../../ui';

interface BmcItemFormProps {
  sectionKey: keyof BusinessModelCanvasData
  item: any | null
  bmcData: BusinessModelCanvasData | null
  onSave: (itemData: any) => void
  onCancel: () => void
}

const enumOptionsMap: Record<string, any> = {
  'status': {
    'keyPartners': PartnerStatus,
    'platforms': PlatformStatus,
    'metrics': MetricStatus,
    'gapsActions': GapActionStatus,
  },
  'riskLevel': { 'keyPartners': PartnerRiskLevel },
  'type': {
    'costStructure': CostType,
    'platforms': PlatformType
  },
  'category': { 'metrics': MetricCategory },
  'priority': { 'gapsActions': GapActionPriority },
}

interface RelationalFieldConfig {
  dataKey: keyof BusinessModelCanvasData
  valueField: string
  labelField: string
}

const relationalFieldMap: Record<string, RelationalFieldConfig> = {
  segmentId: { dataKey: 'customerSegments', valueField: 'id', labelField: 'name' },
  servesSegments: { dataKey: 'customerSegments', valueField: 'id', labelField: 'name' },
  serves_segments: { dataKey: 'customerSegments', valueField: 'id', labelField: 'name' },
  primarySegments: { dataKey: 'customerSegments', valueField: 'id', labelField: 'name' },
  flywheelId: { dataKey: 'flywheels', valueField: 'id', labelField: 'name' },
  enables_flywheels: { dataKey: 'flywheels', valueField: 'id', labelField: 'name' },
  serves_flywheels: { dataKey: 'flywheels', valueField: 'id', labelField: 'name' },
  platformId: { dataKey: 'platforms', valueField: 'id', labelField: 'name' },
  ownerHub: { dataKey: 'hubs', valueField: 'id', labelField: 'name' },
  owner_hub_id: { dataKey: 'hubs', valueField: 'id', labelField: 'name' },
  primaryHub: { dataKey: 'hubs', valueField: 'id', labelField: 'name' },
  ownerPerson: { dataKey: 'team', valueField: 'id', labelField: 'fullName' },
  owner_person_id: { dataKey: 'team', valueField: 'id', labelField: 'fullName' },
  primaryOwner: { dataKey: 'team', valueField: 'id', labelField: 'fullName' },
  enables_resources: { dataKey: 'keyResources', valueField: 'id', labelField: 'name' },
  enables_activities: { dataKey: 'keyActivities', valueField: 'id', labelField: 'name' },
  serves_bus: { dataKey: 'businessUnits', valueField: 'id', labelField: 'name' },
  servesBUs: { dataKey: 'businessUnits', valueField: 'id', labelField: 'name' },
  platforms: { dataKey: 'platforms', valueField: 'id', labelField: 'name' },
}

const multiSelectFields = new Set([
  'servesSegments',
  'serves_segments',
  'primarySegments',
  'enables_flywheels',
  'serves_flywheels',
  'enables_resources',
  'enables_activities',
  'servesBUs',
  'serves_bus',
  'platforms',
])

const BmcItemForm: React.FC<BmcItemFormProps> = ({ sectionKey, item, bmcData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<any>(item || {})
  const { picklists } = usePicklists(); // NEW: Get picklists

  const config = useMemo(() => {
    return bmcRegistry[sectionKey] || BMC_SHEET_CONFIGS.find(c => c.sectionKey === sectionKey)
  }, [sectionKey])

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  if (!config) {
    return <p className="text-red-500">Configuration error: No form definition found for this section.</p>
  }

  if (config.isSimpleList && config.fieldToHeaderMap?.description) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          label={String(config.fieldToHeaderMap.description)}
          value={formData.description || ''}
          onChange={(e) => handleInputChange('description', e.target.value)}
          required
          rows={4}
        />
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="submit" variant="primary">Save</Button>
        </div>
      </form>
    )
  }

  const textAreaFields: { [key: string]: string[] } = {
    strategy: ['vision', 'mission', 'designPov', 'categoryEntryPoints', 'buyingSituations', 'distinctiveAssets', 'competitiveAlt1', 'competitiveAlt2', 'competitiveAlt3', 'claudePanelLink', 'currentSolutionEfficiency', 'ourSolutionEfficiency', 'deltaScore', 'messagingTone', 'brandPosition', 'differentiatedValue'],
    customerSegments: ['customerProfile', 'jobsToBeDone', 'keyPainPoints', 'decisionCriteria', 'notes', 'expression', 'forStatement', 'againstStatement', 'promiseStatement', 'psychographic', 'adoptionThreshold', 'irreversibilityTrigger', 'oldWorldPain', 'newWorldGain', 'purchaseTrigger1', 'purchaseTrigger2', 'purchaseTrigger3', 'currentSolutionEfficiency', 'ourSolutionEfficiency', 'deltaScore'],
    businessUnits: ['coreOffering', 'notes', 'salesMotion', 'supportModel'],
    flywheels: ['customerStruggleSolved', 'acquisitionModel', 'serviceModel', 'keyMetrics', 'jtbdTriggerMoment', 'motionSequence', 'primaryBottleneck'],
    // ... add other sections as needed
  };

  const isTextAreaField = (field: string): boolean => {
    return !!(textAreaFields[sectionKey] && textAreaFields[sectionKey].includes(field));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {Object.entries(config.fieldToHeaderMap || {}).map(([field, header]) => {
        const fieldKey = field as string; 
        
        if (fieldKey === 'id' && (sectionKey === 'strategy' || (item?.id && String(item.id).startsWith('generated-')))) {
          return null;
        }

        const headerString = String(header)
        const value = formData[fieldKey] !== undefined && formData[fieldKey] !== null ? String(formData[fieldKey]) : ''
        
        // NEW: Check for enum binding in registry
        const enumBindingName = config.enumBindings?.[fieldKey];
        if (enumBindingName && picklists[enumBindingName]) {
            const options = picklists[enumBindingName].map((val: any) => ({ value: val, label: val }));
            return (
                <Select
                    key={field}
                    label={headerString}
                    options={options}
                    value={value}
                    onChange={(val) => handleInputChange(fieldKey, val)}
                    placeholder={`Select ${headerString}`}
                />
            );
        }

        if (isTextAreaField(field)) {
          return (
            <Textarea key={field} label={headerString} value={value} onChange={(e) => handleInputChange(fieldKey, e.target.value)} rows={3} />
          );
        }

        const relationalConfig = relationalFieldMap[fieldKey as string]
        if (relationalConfig && bmcData && Array.isArray(bmcData[relationalConfig.dataKey]) && (bmcData[relationalConfig.dataKey] as any[]).length > 0) {
          const options = (bmcData[relationalConfig.dataKey] as any[]).map(optionItem => ({
            value: optionItem[relationalConfig.valueField],
            label: optionItem[relationalConfig.labelField],
          })).filter(opt => opt.value && opt.label)

          if (multiSelectFields.has(fieldKey as string)) {
            const selectedValues = typeof formData[fieldKey] === 'string'
              ? (formData[fieldKey] as string).split(',').map(s => s.trim()).filter(Boolean)
              : Array.isArray(formData[fieldKey]) ? (formData[fieldKey] as string[]) : []

            return (
              <MultiSelect
                key={field}
                label={headerString}
                options={options}
                value={selectedValues}
                onChange={(selectedIds) => handleInputChange(fieldKey, selectedIds.join(', '))}
                placeholder={`Select ${headerString}`}
              />
            )
          }

          return (
            <Select key={field} label={headerString} options={options} value={value} onChange={(val) => handleInputChange(fieldKey, val)} placeholder={`Select ${headerString}`} />
          )
        }

        const enumMap = enumOptionsMap[fieldKey as string]
        const specificEnum = enumMap ? enumMap[sectionKey] : null

        if (specificEnum) {
          const options = Object.values(specificEnum).map((val: any) => ({ value: val, label: val }))
          return (
            <Select key={field} label={headerString} options={options} value={value} onChange={(val) => handleInputChange(fieldKey, val)} placeholder={`Select ${headerString}`} />
          )
        }

        const isNumeric = ['amount', 'revenue', 'aov', 'margin', 'count', 'pct', 'score', 'days', 'hours', 'capacity'].some(term => headerString.toLowerCase().includes(term) || String(fieldKey).toLowerCase().includes(term))
        const inputType = isNumeric ? 'number' : 'text'
        const isUrl = headerString.toLowerCase().includes('link') || String(fieldKey).toLowerCase().includes('link');

        return (
          <Input key={field} label={headerString} type={isUrl ? 'url' : inputType} value={value} onChange={(e) => handleInputChange(fieldKey, isNumeric ? parseFloat(e.target.value) || 0 : e.target.value)} step={isNumeric ? "0.01" : undefined} />
        )
      })}
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">Save</Button>
      </div>
    </form>
  )
}

export default BmcItemForm
