import React, { useState, useCallback, useMemo } from 'react'
import { Card, Button, EmptyState, Modal, StatusPill, ManagerEditorLayout } from '../ui'
import { useAuth } from '../contexts/AuthContext'
import { useBmc } from '../hooks/useBmc'
import { Strategy, BusinessModelCanvasData, BusinessUnit, Flywheel, CustomerSegment, Hub, TeamMember } from '../types'
import BmcItemForm from '../components/forms/BmcItemForm'
import DemoModeBanner from '../components/layout/DemoModeBanner'
import BmcNote from '../components/bmc/BmcNote'
import BmcItemDetailDrawer from '../components/bmc/BmcItemDetailDrawer'

type SectionKey = keyof BusinessModelCanvasData;

const StrategyPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth()
  const { bmcData, loading, error, loadBmcData, updateBmcItem, addBmcItem, hasAttemptedInitialLoad } = useBmc()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [formConfig, setFormConfig] = useState<{
    isOpen: boolean;
    sectionKey: SectionKey;
    item: any | null;
    mode: 'add' | 'edit';
  }>({ isOpen: false, sectionKey: 'strategy', item: null, mode: 'add' });
  const [drawerItem, setDrawerItem] = useState<{ sectionKey: SectionKey; item: any } | null>(null);

  const handleOpenForm = useCallback((sectionKey: SectionKey, mode: 'add' | 'edit', item: any | null = null) => {
    if (!isSignedIn && !isMockMode) {
      signIn();
      return;
    }
    setFormConfig({ isOpen: true, sectionKey, item, mode });
    setDrawerItem(null);
  }, [isSignedIn, isMockMode, signIn]);

  const handleCloseForm = useCallback(() => {
    setFormConfig({ isOpen: false, sectionKey: 'strategy', item: null, mode: 'add' });
  }, []);

  const handleSaveItem = useCallback(async (itemData: any) => {
    try {
      if (formConfig.mode === 'edit') {
        const itemToSave = formConfig.sectionKey === 'strategy' ? { ...itemData, id: 'STRATEGY-GLOBAL' } : { ...formConfig.item, ...itemData };
        await updateBmcItem(formConfig.sectionKey, itemToSave);
      } else {
        const itemToSave = formConfig.sectionKey === 'strategy' ? { ...itemData, id: 'STRATEGY-GLOBAL' } : itemData;
        await addBmcItem(formConfig.sectionKey, itemToSave);
      }
      handleCloseForm();
    } catch (e) {
      console.error("Failed to save item:", e);
    }
  }, [updateBmcItem, addBmcItem, formConfig, handleCloseForm]);

  const handleNoteClick = useCallback((sectionKey: SectionKey, item: any) => {
    setDrawerItem({ sectionKey, item });
  }, []);

  const handleEditRequest = useCallback((sectionKey: SectionKey, item: any) => {
    setDrawerItem(null);
    handleOpenForm(sectionKey, 'edit', item);
  }, [handleOpenForm]);


  const renderValue = (value: any) => {
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (value === null || value === undefined || String(value).trim() === '') {
      return <span className="text-[var(--color-text-secondary)] italic">Not set</span>
    }
    if (Array.isArray(value)) {
        if (value.length === 0) return <span className="text-[var(--color-text-secondary)] italic">None</span>;
        return value.join(', ');
    }
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return <a href={value} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">{value}</a>
    }
    return String(value)
  }

  const canvasData = bmcData;

  const platformEmojis: Record<string, string> = {
    'PLT-01': '🌐',
    'PLT-02': '🤝',
    'PLT-03': '📱',
    'PLT-04': '🛠️',
    'PLT-05': '🖥️',
    'CHL-01': '📢',
    'CHL-03': '💬',
  };

  const getPlatformEmoji = (platformId: string) => platformEmojis[platformId] || '❓';


  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Strategy Board">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to view your Strategy Board"
            description="Connect your Google account to define and manage your company's strategic components."
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

  if (loading && !bmcData) {
    return <ManagerEditorLayout title="Strategy Board"><div className="text-center py-10">Loading Strategy Data...</div></ManagerEditorLayout>
  }

  if (error) {
    return (
      <ManagerEditorLayout title="Strategy Board">
        <EmptyState title="Failed to load strategy data" description={error} action={<Button onClick={() => loadBmcData()}>Retry</Button>} />
      </ManagerEditorLayout>
    );
  }

  if (!canvasData && hasAttemptedInitialLoad) {
    return (
      <ManagerEditorLayout title="Strategy Board">
        <EmptyState title="No data" description="Could not load Business Model Canvas data. This might be due to a missing Sheet ID or lack of data in the source." action={<Button onClick={() => loadBmcData()} disabled={loading}>Load from Sheet 📄</Button>} />
      </ManagerEditorLayout>
    )
  }
  
  if (!canvasData) {
    return (
      <ManagerEditorLayout title="Strategy Board">
        <EmptyState title="Awaiting Data" description="Sign in to load your Strategy Board." action={!isSignedIn ? <Button onClick={signIn}>Sign In</Button> : null} />
      </ManagerEditorLayout>
    )
  }

  const currentStrategy = canvasData.strategy;
  
  const globalStrategySummaryFields: Array<{ key: keyof Strategy; label: string }> = [
    { key: 'vision', label: 'Vision' },
    { key: 'mission', label: 'Mission' },
    { key: 'brandPosition', label: 'Brand Position' },
    { key: 'differentiatedValue', label: 'Differentiated Value' },
  ];


  const toolbar = (
    <div className="flex items-center space-x-2">
      {(isSignedIn || isMockMode) && (
        <Button variant="primary" onClick={() => handleOpenForm('strategy', 'edit', currentStrategy)} disabled={isAuthActionInProgress}>
          <span role="img" aria-label="edit" className="mr-2">✏️</span> Edit Global Strategy
        </Button>
      )}
    </div>
  );

  return (
    <ManagerEditorLayout title="Strategy Board" toolbar={toolbar}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">Visualize how your core strategy is implemented through business units, flywheels, customer segments, and organizational structure.</p>

      {currentStrategy && (
        <Card title="🌟 Global Strategic Statements" bodyClassName="grid grid-cols-1 md:grid-cols-2 gap-4">
          {globalStrategySummaryFields.map(field => (
            <div key={field.key}>
              <h4 className="text-xs font-bold uppercase text-[var(--color-text-secondary)] tracking-wider">{field.label}</h4>
              <p className="text-base text-[var(--color-text-primary)] mt-1 break-words whitespace-pre-wrap">
                {renderValue(currentStrategy[field.key])}
              </p>
            </div>
          ))}
        </Card>
      )}
      {!currentStrategy && (
         <Card title="🌟 Global Strategic Statements" className="mb-6">
            <EmptyState
              title="No Global Strategy Defined"
              description={isMockMode ? "No mock global strategy available. Define one to see it here." : "Start by defining your company's overarching vision, mission, and brand positioning."}
              action={<Button variant="primary" onClick={() => handleOpenForm('strategy', 'add', null)}>Define Global Strategy</Button>}
            />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <Card
          title={
            <div className="flex items-center justify-between w-full">
              <span>What We Sell <span className="text-sm text-[var(--color-text-secondary)]">(Business Units)</span></span>
              {!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('businessUnits', 'add')}><span role="img" aria-label="plus">➕</span></Button>}
            </div>
          }
          className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2"
        >
          <div className="h-full overflow-y-auto space-y-2 p-2">
            {canvasData?.businessUnits && canvasData.businessUnits.length > 0 ? (
              canvasData.businessUnits.map((bu: BusinessUnit) => (
                <BmcNote key={bu.id} color="yellow" onClick={() => handleNoteClick('businessUnits', bu)}>
                  <div className="flex justify-between items-center text-sm font-bold">
                    <span className="text-[var(--color-brand-primary)]">{bu.name}</span>
                    <StatusPill status={bu.buType === 'D2C' ? 'Active' : bu.buType === 'B2B' ? 'In Progress' : 'Planned'}>
                        {bu.buType}
                    </StatusPill>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)] mt-1">{bu.coreOffering}</p>
                  <div className="text-xs mt-2 flex items-center space-x-2 text-[var(--color-text-secondary)]">
                    <span className="italic">{bu.volumeRange}</span>
                    {bu.salesMotion && <span>| {bu.salesMotion}</span>}
                  </div>
                </BmcNote>
              ))
            ) : (
              <EmptyState title="No Business Units" description="Define your business units and their core offerings." />
            )}
          </div>
        </Card>

        <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <span>How We Grow <span className="text-sm text-[var(--color-text-secondary)]">(Flywheels)</span></span>
                {!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('flywheels', 'add')}><span role="img" aria-label="plus">➕</span></Button>}
              </div>
            }
            className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2">
            <div className="h-full overflow-y-auto space-y-2 p-2">
              {canvasData?.flywheels && canvasData.flywheels.length > 0 ? (
                canvasData.flywheels.map((fw: Flywheel) => (
                  <BmcNote key={fw.id} color="olive" onClick={() => handleNoteClick('flywheels', fw)}>
                    <p className="font-bold text-sm text-[var(--color-brand-primary)]">{fw.name}</p>
                    <p className="text-xs text-[var(--color-text-primary)] mt-1">
                      <span className="font-semibold italic">Trigger:</span> {fw.jtbdTriggerMoment || 'N/A'}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      <span className="font-semibold italic">Motion:</span> {fw.motionSequence || 'N/A'}
                    </p>
                  </BmcNote>
                ))
              ) : (
                <EmptyState title="No Flywheels" description="Define your growth mechanisms and loops." />
              )}
            </div>
          </Card>

          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <span>Who We Serve <span className="text-sm text-[var(--color-text-secondary)]">(Customer Segments)</span></span>
                {!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('customerSegments', 'add')}><span role="img" aria-label="plus">➕</span></Button>}
              </div>
            }
            className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2"
          >
            <div className="h-full overflow-y-auto space-y-2 p-2">
              {canvasData?.customerSegments && canvasData.customerSegments.length > 0 ? (
                canvasData.customerSegments.map((segment: CustomerSegment) => (
                  <BmcNote key={segment.id} color="orange" onClick={() => handleNoteClick('customerSegments', segment)}>
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-[var(--color-brand-primary)]">{segment.name}</span>
                      {segment.priorityRank && <StatusPill status={segment.priorityRank === 'High' ? 'Blocked' : segment.priorityRank === 'Medium' ? 'In Progress' : 'Not Started'}>{segment.priorityRank}</StatusPill>}
                    </div>
                    <p className="text-sm text-[var(--color-text-primary)] mt-1">{segment.promiseStatement || 'No Promise Set'}</p>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{segment.positioning || 'No Positioning'}</p>
                    <div className="mt-2 flex items-center space-x-2">
                        {segment.platforms && segment.platforms.map(pId => (
                            <span key={pId} className="text-lg" title={pId}>{getPlatformEmoji(pId)}</span>
                        ))}
                    </div>
                  </BmcNote>
                ))
              ) : (
                <EmptyState title="No Customer Segments" description="Define your target customer groups." />
              )}
            </div>
          </Card>
        </div>

        <div className="col-span-1 grid grid-cols-1 gap-6"> 
          <Card
            title={
              <div className="flex items-center justify-between w-full">
                <span>Hubs & Teams <span className="text-sm text-[var(--color-text-secondary)]">(Structure)</span></span>
                {!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('hubs', 'add')}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Hub</Button>}
              </div>
            }
            className="flex flex-col" bodyClassName="flex-1 overflow-hidden !p-2"
          >
            <div className="h-full overflow-y-auto space-y-2 p-2">
              {canvasData?.hubs && canvasData.hubs.length > 0 ? (
                canvasData.hubs.map((hub: Hub) => (
                  <BmcNote key={hub.id} color="purple" onClick={() => handleNoteClick('hubs', hub)}>
                    <p className="font-bold text-sm text-[var(--color-brand-primary)]">{hub.name}</p>
                    <p className="text-xs text-[var(--color-text-primary)] mt-1">{hub.type}</p>
                  </BmcNote>
                ))
              ) : (
                <EmptyState title="No Hubs Defined" description="Define your organizational departments/hubs." />
              )}

              <h3 className="text-sm font-semibold text-[var(--color-text-secondary)] sticky top-0 bg-[var(--color-bg-surface)] py-1 -mx-2 px-2 z-10 mt-4 mb-2">Team Members</h3>
              {canvasData?.team && canvasData.team.length > 0 ? (
                  canvasData.team.map((member: TeamMember) => (
                      <BmcNote key={member.id} color="teal" onClick={() => handleNoteClick('team', member)}>
                          <p className="font-bold text-sm text-[var(--color-brand-primary)]">{member.fullName}</p>
                          <p className="text-xs text-[var(--color-text-primary)] mt-1">{member.role}</p>
                      </BmcNote>
                  ))
              ) : (
                  <EmptyState title="No Team Members" description="Add team members to your organization." />
              )}
              <div className="mt-4 flex justify-center">
                  {!isMockMode && <Button size="sm" variant="secondary" onClick={() => handleOpenForm('team', 'add')}><span role="img" aria-label="plus" className="mr-2">➕</span>Add Team Member</Button>}
              </div>
            </div>
          </Card>
        </div>
      </div>


      <BmcItemDetailDrawer
        isOpen={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        data={drawerItem}
        onEdit={handleEditRequest}
      />

      <Modal open={formConfig.isOpen} onClose={handleCloseForm} title={formConfig.mode === 'add' ? `Add New ${String(formConfig.sectionKey).charAt(0).toUpperCase() + String(formConfig.sectionKey).slice(1)}` : `Edit ${String(formConfig.sectionKey).charAt(0).toUpperCase() + String(formConfig.sectionKey).slice(1)}`} className="max-w-2xl">
        {formConfig.sectionKey && (
          <BmcItemForm
            key={`${formConfig.sectionKey}-${formConfig.item?.id || 'new'}`}
            sectionKey={formConfig.sectionKey}
            item={formConfig.item}
            bmcData={canvasData}
            onSave={handleSaveItem}
            onCancel={handleCloseForm}
          />
        )}
      </Modal>
    </ManagerEditorLayout>
  )
}

export default StrategyPage;