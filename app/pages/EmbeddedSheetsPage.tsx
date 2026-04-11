import React, { useState, useMemo } from 'react'
import { ManagerEditorLayout, Card, Button, EmptyState, Modal } from '../ui' // Changed Page, Card, Button, EmptyState, Modal
import { useAuth } from '../contexts/AuthContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { BMC_SHEET_CONFIGS } from '../hooks/useBmc'
import { usePPCContext } from '../contexts/PPCContext'; // NEW: Import PPC Context
import { useOrder } from '../contexts/OrderContext'; // NEW: Import Order Context

interface DataSourceInfo {
  name: string
  emoji: string
  sheetId: string | null
}

const itemTypeToEmoji: { [key: string]: string } = {
  program: '🎯',
  project: '🚧',
  task: '📝',
  milestone: '🏁',
  strategicInitiative: '⭐',
  strategicObjective: '🎯',
  goal: '🥅',
  quarterlyInitiative: '🗓️',
  resourceAllocationBudget: '💸',
  keyPartners: '🤝',
  keyActivities: '🔑',
  valuePropositions: '🎁',
  customerRelations: '❤️',
  customerSegments: '🎯',
  keyResources: '📦',
  channels: '🚚',
  revenueStreams: '💰',
  costStructure: '💸',
  businessUnits: '🏢',
  flywheels: '⚙️',
  platforms: '🌐',
  team: '👥',
  hubs: '🏠',
  metrics: '📈',
  gapsActions: '🔍',
  strategy: '🧭',
  ppcManifest: '💵', // NEW: for PPC
  order: '📦', // NEW: for Order Management
  orderSummary: '📋', // NEW: for Order Summary
}


const EmbeddedSheetsPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth()
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  
  const {
    programSheetId,
    projectSheetId,
    taskSheetId,
    milestoneSheetId,
    strategicInitiativeSheetId,
    strategicObjectiveSheetId,
    goalSheetId,
    // FIX: Corrected variable name from 'quarter' to 'quarterlyInitiativeSheetId'
    quarterlyInitiativeSheetId, 
    resourceAllocationBudgetSheetId
  } = usePortfolio();

  const { ppcSheetId } = usePPCContext(); // NEW: Get PPC Sheet ID
  const { orderSheetId } = useOrder(); // NEW: Get Order Sheet ID

  const dataSources = useMemo(() => {
    const portfolioSources: DataSourceInfo[] = [
      { name: 'Programs', emoji: itemTypeToEmoji.program, sheetId: programSheetId },
      { name: 'Projects', emoji: itemTypeToEmoji.project, sheetId: projectSheetId },
      { name: 'Tasks', emoji: itemTypeToEmoji.task, sheetId: taskSheetId },
      { name: 'Milestones', emoji: itemTypeToEmoji.milestone, sheetId: milestoneSheetId },
      { name: 'Strategic Initiatives', emoji: itemTypeToEmoji.strategicInitiative, sheetId: strategicInitiativeSheetId },
      { name: 'Strategic Objectives', emoji: itemTypeToEmoji.strategicObjective, sheetId: strategicObjectiveSheetId },
      { name: 'Goals', emoji: itemTypeToEmoji.goal, sheetId: goalSheetId },
      // FIX: Changed 'quarter' to 'quarterlyInitiativeSheetId'
      { name: 'Quarterly Initiatives', emoji: itemTypeToEmoji.quarterlyInitiative, sheetId: quarterlyInitiativeSheetId }, 
      { name: 'Resource Allocation Budget', emoji: itemTypeToEmoji.resourceAllocationBudget, sheetId: resourceAllocationBudgetSheetId },
    ];

    const bmcSources: DataSourceInfo[] = [];
    const seenBmcSheetIds = new Set<string>();

    for (const config of BMC_SHEET_CONFIGS) {
        if (config.spreadsheetId && !seenBmcSheetIds.has(config.spreadsheetId)) {
            const representativeName = String(config.sectionKey).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            bmcSources.push({
                name: `BMC: ${representativeName}`,
                emoji: itemTypeToEmoji[String(config.sectionKey)] || '📄',
                sheetId: config.spreadsheetId
            });
            seenBmcSheetIds.add(config.spreadsheetId);
        }
    }
    
    // NEW: Add PPC sheet if configured
    if (ppcSheetId) {
        bmcSources.push({
            name: 'PPC Calculator',
            emoji: itemTypeToEmoji.ppcManifest,
            sheetId: ppcSheetId,
        });
    }

    // NEW: Add Order Management sheet if configured
    if (orderSheetId) {
      bmcSources.push({
          name: 'Order Management (Details)', // Specific name for the detailed sheet
          emoji: itemTypeToEmoji.order,
          sheetId: orderSheetId,
      });
      bmcSources.push({
        name: 'Order Management (Summary)', // Specific name for the summary sheet
        emoji: itemTypeToEmoji.orderSummary,
        sheetId: orderSheetId, // Assuming both are in the same spreadsheet
      });
    }

    return [...portfolioSources, ...bmcSources].filter(source => source.sheetId);
  }, [
    programSheetId, projectSheetId, taskSheetId, milestoneSheetId,
    strategicInitiativeSheetId, strategicObjectiveSheetId, goalSheetId,
    quarterlyInitiativeSheetId,
    resourceAllocationBudgetSheetId,
    ppcSheetId, // NEW: Add ppcSheetId dependency
    orderSheetId, // NEW: Add orderSheetId dependency
  ]);

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Embedded Sheets">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to view your embedded sheets"
            description="Connect your Google account to access configured Google Sheets."
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

  return (
    <ManagerEditorLayout title="Embedded Sheets">
      <p className="mb-8 text-[var(--color-text-secondary)]">
        View configured Google Sheets embedded directly into the application.
      </p>

      {dataSources.length === 0 ? (
        <EmptyState title="No Sheets Configured" description="Configure your Google Sheet IDs in Data Source Settings to view them here." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map(source => (
            <Card
              key={source.sheetId}
              title={
                <div className="flex items-center">
                  <span className="text-xl mr-2">{source.emoji}</span>
                  {source.name}
                </div>
              }
            >
              <div className="flex flex-col space-y-3">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Sheet ID: <code className="text-[var(--color-text-primary)]">{source.sheetId}</code>
                </p>
                <Button
                  onClick={() => setEmbedUrl(`https://docs.google.com/spreadsheets/d/${source.sheetId}/edit?usp=sharing`)}
                  variant="secondary"
                >
                  Embed Sheet 📄
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {embedUrl && (
        <Modal open={!!embedUrl} onClose={() => setEmbedUrl(null)} title="Embedded Google Sheet" className="max-w-6xl h-[90vh] flex flex-col">
          <iframe
            src={embedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Embedded Google Sheet"
            className="flex-1"
          ></iframe>
          <div className="p-4 border-t border-[var(--color-border-primary)] flex justify-end">
            <Button variant="secondary" onClick={() => setEmbedUrl(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </ManagerEditorLayout>
  )
}

export default EmbeddedSheetsPage;