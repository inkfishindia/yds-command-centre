import React, { useState, useCallback } from 'react'
import { Button, StatusPill, Modal, EmptyState, ManagerEditorLayout } from '../ui'
import { useAuth } from '../contexts/AuthContext'
import { useBmc } from '../hooks/useBmc'
import {
  BusinessModelCanvasData, Cost,
  RevenueStream,
  CustomerSegment, CustomerSegmentStatus,
  Partner, PartnerStatus,
  KeyActivity, CustomerRelationship, KeyResource,
  ValueProposition,
  Strategy,
} from '../types'
import Markdown from 'react-markdown'
import BmcItemForm from '../components/forms/BmcItemForm'
import DemoModeBanner from '../components/layout/DemoModeBanner'
import BmcCard from '../components/bmc/BmcCard'
import BmcNote from '../components/bmc/BmcNote'
import BmcItemDetailDrawer from '../components/bmc/BmcItemDetailDrawer'

const bmcQuestions = {
  coreStrategy: "What is our overarching vision, mission, and brand positioning? What is our unique promise and how do we differentiate ourselves from competitors?",
  keyPartners: "Who are our key partners and suppliers? Which key resources are we acquiring from them? Which key activities do they perform?",
  keyActivities: "What key activities do our value propositions require? What are the most important activities for our distribution channels, customer relationships, and revenue streams?",
  keyResources: "What key resources do our value propositions require? What about our distribution channels, customer relationships, and revenue streams?",
  valuePropositions: "What value do we deliver? Which customer problems are we solving? What bundles of products/services are we offering to each segment?",
  customerRelations: "What type of relationship does each customer segment expect us to establish and maintain with them? How are they integrated with the rest of our business model? How costly are they?",
  channels: "Through which channels do our customer segments want to be reached? How are we reaching them now? How are our channels integrated? Which ones work best and are most cost-efficient?",
  customerSegments: "For whom are we creating value? Who are our most important customers? What are their archetypes?",
  costStructure: "What are the most important costs inherent in our business model? Which key resources and key activities are most expensive?",
  revenueStreams: "For what value are our customers willing to pay? How do they currently pay? How would they prefer to pay? How much does each revenue stream contribute to overall revenues?",
}

const BusinessModelCanvasPage: React.FC = () => {
  const { isSignedIn, signIn, isMockMode, isAuthActionInProgress } = useAuth()
  const {
    bmcData,
    loading,
    error,
    loadBmcData,
    isAnalyzingAI,
    aiAnalysisResult,
    analyzeCanvas,
    clearAnalysis,
    addBmcItem,
    updateBmcItem,
    hasAttemptedInitialLoad,
  } = useBmc()

  const [showAIAnalysisModal, setShowAIAnalysisModal] = useState(false)
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean
    sectionKey: keyof BusinessModelCanvasData | null
    item: any | null
  }>({ isOpen: false, sectionKey: null, item: null })
  const [drawerItem, setDrawerItem] = useState<{ sectionKey: keyof BusinessModelCanvasData, item: any } | null>(null)

  const handleOpenModal = (sectionKey: keyof BusinessModelCanvasData, item: any | null = null) => {
    if (!isSignedIn && !isMockMode) {
      signIn()
      return
    }
    setModalConfig({ isOpen: true, sectionKey, item })
  }

  const handleCloseModal = () => setModalConfig({ isOpen: false, sectionKey: null, item: null })

  const handleNoteClick = (sectionKey: keyof BusinessModelCanvasData, item: any) => {
    setDrawerItem({ sectionKey, item })
  }

  const handleEditRequest = (sectionKey: keyof BusinessModelCanvasData, item: any) => {
    setDrawerItem(null)
    handleOpenModal(sectionKey, item)
  }

  const handleSaveItem = async (itemData: any) => {
    if (!modalConfig.sectionKey) return

    try {
      if (modalConfig.item) {
        const itemToSave = modalConfig.sectionKey === 'strategy' ? { ...itemData, id: 'STRATEGY-GLOBAL' } : { ...modalConfig.item, ...itemData };
        await updateBmcItem(modalConfig.sectionKey, itemToSave)
      } else {
        const itemToSave = modalConfig.sectionKey === 'strategy' ? { ...itemData, id: 'STRATEGY-GLOBAL' } : itemData;
        await addBmcItem(modalConfig.sectionKey, itemToSave)
      }
      handleCloseModal()
    } catch (e) {
      console.error("Save operation failed:", e)
    }
  }

  const handleAnalyzeWithAI = useCallback(async () => {
    if (!isSignedIn && !isMockMode) {
      signIn()
      return
    }
    const result = await analyzeCanvas()
    if (result) setShowAIAnalysisModal(true)
  }, [analyzeCanvas, isSignedIn, signIn, isMockMode])

  const handleCloseAnalysisModal = () => {
    setShowAIAnalysisModal(false)
    clearAnalysis()
  }

  const getCustomerSegmentStatusPill = (status: CustomerSegmentStatus) => (
    status === CustomerSegmentStatus.ACTIVE || status === CustomerSegmentStatus.VALIDATED ? 'Active' : status === CustomerSegmentStatus.AT_RISK ? 'Blocked' : 'Not Started'
  )

  const canvasData = bmcData;

  const toolbar = (isSignedIn || isMockMode) ? (
    <div className="flex items-center space-x-2">
      <Button onClick={() => loadBmcData()} disabled={loading || isAuthActionInProgress} variant="secondary">
        {loading ? 'Refreshing...' : 'Refresh 🔄'}
      </Button>
      <Button variant="primary" onClick={handleAnalyzeWithAI} disabled={isAnalyzingAI || !canvasData}>
        {isAnalyzingAI ? 'Analyzing...' : <><span role="img" aria-label="sparkles" className="mr-2 text-xl leading-none">✨</span> Analyze with AI</>}
      </Button>
    </div>
  ) : null

  if (loading && !bmcData) {
    return <ManagerEditorLayout title="Business Model Canvas"><div className="text-center py-10">Loading Canvas Data...</div></ManagerEditorLayout>
  }

  if (error) {
    return (
      <ManagerEditorLayout title="Business Model Canvas">
        <EmptyState title="Failed to load canvas data" description={error} action={<Button onClick={() => loadBmcData()}>Retry</Button>} />
      </ManagerEditorLayout>
    )
  }

  if (!canvasData && hasAttemptedInitialLoad) {
    return (
      <ManagerEditorLayout title="Business Model Canvas">
        <EmptyState title="No data" description="Could not load Business Model Canvas data. This might be due to a missing Sheet ID or lack of data in the source." action={<Button onClick={() => loadBmcData()} disabled={loading}>Load from Sheet 📄</Button>} />
      </ManagerEditorLayout>
    )
  }

  if (!canvasData) {
    return (
      <ManagerEditorLayout title="Business Model Canvas">
        <EmptyState title="Awaiting Data" description="Sign in to load your Business Model Canvas." action={!isSignedIn ? <Button onClick={signIn}>Sign In</Button> : null} />
      </ManagerEditorLayout>
    )
  }

  return (
    <ManagerEditorLayout title="Business Model Canvas" toolbar={toolbar}>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">Visualize, analyze, and edit the core components of your business model.</p>

      <div className="mb-6">
        <BmcCard 
          title="🌟 Core Strategy" 
          tooltipText={bmcQuestions.coreStrategy} 
          headerAction={!(isSignedIn || isMockMode) || !bmcData?.strategy ? null : <Button size="sm" variant="secondary" onClick={() => handleOpenModal('strategy', canvasData?.strategy || null)}><span role="img" aria-label="edit" className="leading-none">✏️</span></Button>} 
          bodyClassName="space-y-2"
        >
          {canvasData?.strategy ? (
            <div className="p-3 rounded-lg bg-[var(--color-note-yellow-bg)] text-[var(--color-note-yellow-text)] shadow-sm">
              <p className="font-bold text-lg mb-1">{canvasData.strategy.vision || 'No Vision Set'}</p>
              <p className="text-sm italic mb-2">"{canvasData.strategy.mission || 'No Mission Set'}"</p>
              {canvasData.strategy.brandPosition && <p className="text-xs">Brand: <span className="font-semibold">{canvasData.strategy.brandPosition}</span></p>}
              {canvasData.strategy.differentiatedValue && <p className="text-xs">Value: <span className="font-semibold">{canvasData.strategy.differentiatedValue}</span></p>}
            </div>
          ) : (
            <EmptyState title="No Core Strategy Defined" description="Add your company's vision, mission, and brand positioning." action={!(isSignedIn || isMockMode) ? null : <Button size="sm" variant="primary" onClick={() => handleOpenModal('strategy', null)}>Define Strategy</Button>} />
          )}
        </BmcCard>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-2">
          <BmcCard title="🤝 Key Partners" tooltipText={bmcQuestions.keyPartners} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('keyPartners', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.keyPartners.map((partner: Partner) => (
              <BmcNote key={partner.id} color="yellow" onClick={() => handleNoteClick('keyPartners', partner)}>
                <div className="flex justify-between items-start">
                  <div className="pr-2">
                    <p className="font-semibold">{partner.name}</p>
                    {partner.role && <p className="text-xs opacity-80">{partner.role}</p>}
                  </div>
                  {partner.status && <StatusPill status={partner.status === PartnerStatus.ACTIVE ? 'Active' : 'Blocked'} />}
                </div>
              </BmcNote>
            ))}
          </BmcCard>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <BmcCard title="🔑 Key Activities" tooltipText={bmcQuestions.keyActivities} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('keyActivities', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.keyActivities.map((activity: KeyActivity) => (
              <BmcNote key={activity.id} color="olive" onClick={() => handleNoteClick('keyActivities', activity)}>
                <p className="font-semibold">{activity.name}</p>
                {activity.category && <p className="text-xs opacity-80">{activity.category}</p>}
              </BmcNote>
            ))}
          </BmcCard>
          <BmcCard title="📦 Key Resources" tooltipText={bmcQuestions.keyResources} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('keyResources', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.keyResources.map((resource: KeyResource) => (
              <BmcNote key={resource.id} color="green" onClick={() => handleNoteClick('keyResources', resource)}>
                <p className="font-semibold">{resource.name}</p>
                {resource.type && <p className="text-xs opacity-80">{resource.type}</p>}
              </BmcNote>
            ))}
          </BmcCard>
        </div>

        <div className="lg:col-span-2">
          <BmcCard title="🎁 Value Propositions" tooltipText={bmcQuestions.valuePropositions} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('valuePropositions', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.valuePropositions.map((vp: ValueProposition) => (
              <BmcNote key={vp.id} color="green" onClick={() => handleNoteClick('valuePropositions', vp)}>
                <p className="font-semibold leading-snug">{vp.description}</p>
                {vp.category && <p className="text-xs opacity-80 mt-1">{vp.category}</p>}
              </BmcNote>
            ))}
          </BmcCard>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <BmcCard title="❤️ Customer Relationships" tooltipText={bmcQuestions.customerRelations} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('customerRelations', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.customerRelations.map((cr: CustomerRelationship) => (
              <BmcNote key={cr.id} color="purple" onClick={() => handleNoteClick('customerRelations', cr)}>
                <p className="font-semibold">{cr.type}</p>
                {cr.acquisitionStrategy && <p className="text-xs opacity-80">{cr.acquisitionStrategy}</p>}
              </BmcNote>
            ))}
          </BmcCard>
          <BmcCard title="🚚 Channels" tooltipText={bmcQuestions.channels} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('channels', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.channels.map(channel => (
              <BmcNote key={channel.id} color="pink" onClick={() => handleNoteClick('channels', channel)}>
                <p className="font-semibold">{channel.name}</p>
                {channel.motionType && <p className="text-xs opacity-80">{channel.motionType}</p>}
              </BmcNote>
            ))}
          </BmcCard>
        </div>

        <div className="lg:col-span-2">
          <BmcCard title="🎯 Customer Segments" tooltipText={bmcQuestions.customerSegments} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('customerSegments', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.customerSegments.map((segment: CustomerSegment) => (
              <BmcNote key={segment.id} color="orange" onClick={() => handleNoteClick('customerSegments', segment)}>
                <div className="flex justify-between items-start">
                  <p className="font-semibold pr-2">{segment.name}</p>
                  <StatusPill status={getCustomerSegmentStatusPill(segment.status)} />
                </div>
              </BmcNote>
            ))}
          </BmcCard>
        </div>

        <div className="lg:col-span-5">
          <BmcCard title="💸 Cost Structure" tooltipText={bmcQuestions.costStructure} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('costStructure', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.costStructure.map((cost: Cost) => (
              <BmcNote key={cost.id} color="teal" onClick={() => handleNoteClick('costStructure', cost)}>
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{cost.costName || cost.category}</p>
                    {cost.monthlyAmount != null && <p className="text-xs opacity-80">Monthly: ₹{cost.monthlyAmount.toLocaleString()}</p>}
                  </div>
                  <span className="text-xs font-semibold uppercase px-2 py-1 rounded-full bg-black/10">{cost.type}</span>
                </div>
              </BmcNote>
            ))}
          </BmcCard>
        </div>

        <div className="lg:col-span-5">
          <BmcCard title="💰 Revenue Streams" tooltipText={bmcQuestions.revenueStreams} headerAction={<Button size="sm" variant="secondary" onClick={() => handleOpenModal('revenueStreams', null)}><span role="img" aria-label="plus" className="leading-none">➕</span></Button>} bodyClassName="space-y-2">
            {canvasData.revenueStreams.map((stream: RevenueStream) => (
              <BmcNote key={stream.id} color="pink" onClick={() => handleNoteClick('revenueStreams', stream)}>
                <p className="font-semibold">{stream.streamName || stream.id}</p>
                {stream.nineMonthRevenue != null && <p className="text-xs opacity-80">9-Month Rev: ₹{stream.nineMonthRevenue.toLocaleString()}</p>}
              </BmcNote>
            ))}
          </BmcCard>
        </div>
      </div>

      <BmcItemDetailDrawer
        isOpen={!!drawerItem}
        onClose={() => setDrawerItem(null)}
        data={drawerItem}
        onEdit={handleEditRequest}
      />

      <Modal open={modalConfig.isOpen} onClose={handleCloseModal} title={modalConfig.item ? 'Edit Item' : 'Add New Item'}>
        {modalConfig.sectionKey && (
          <BmcItemForm
            key={`${modalConfig.sectionKey}-${modalConfig.item?.id || 'new'}`}
            sectionKey={modalConfig.sectionKey}
            item={modalConfig.item}
            bmcData={canvasData}
            onSave={handleSaveItem}
            onCancel={handleCloseModal}
          />
        )}
      </Modal>

       <Modal open={showAIAnalysisModal} onClose={handleCloseAnalysisModal} title="AI Analysis of Business Model Canvas" className="max-w-3xl">
        {aiAnalysisResult ? (
          <div className="prose dark:prose-invert max-w-none">
            <Markdown>{aiAnalysisResult}</Markdown>
          </div>
        ) : (
          <div className="text-center py-10">Loading analysis...</div>
        )}
      </Modal>
    </ManagerEditorLayout>
  )
}

export default BusinessModelCanvasPage;