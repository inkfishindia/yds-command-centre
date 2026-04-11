
import React, { useState, useEffect } from 'react'
import { Card, Button, EmptyState, Input, ManagerEditorLayout } from '../ui'
import { useAuth } from '../contexts/AuthContext'
import { getEnv } from '../lib/env'

interface DataSourceInfo {
  name: string
  emoji: string
  localStorageKey: string
  envVarKey: string
  pageLocation: string
  currentId: string | null
  defaultId: string | null
}

const DATA_SOURCE_CONFIGS: Omit<DataSourceInfo, 'currentId' | 'defaultId'>[] = [
  {
    name: 'Business Model Canvas',
    emoji: '📈',
    localStorageKey: 'bmc_google_sheet_id',
    envVarKey: 'BMC_GOOGLE_SHEET_ID',
    pageLocation: "Command Center > Business Model Canvas",
  },
  {
    name: 'Programs',
    emoji: '🎯',
    localStorageKey: 'programs_google_sheet_id',
    envVarKey: 'PROGRAMS_GOOGLE_SHEET_ID',
    pageLocation: "Portfolio Mgmt > Programs",
  },
  {
    name: 'Projects',
    emoji: '🚧',
    localStorageKey: 'projects_google_sheet_id',
    envVarKey: 'PROJECTS_GOOGLE_SHEET_ID',
    pageLocation: "Portfolio Mgmt > Projects",
  },
  {
    name: 'Tasks',
    emoji: '📝',
    localStorageKey: 'tasks_google_sheet_id',
    envVarKey: 'TASKS_GOOGLE_SHEET_ID',
    pageLocation: "Portfolio Mgmt > Tasks",
  },
  {
    name: 'Order Management',
    emoji: '📦',
    localStorageKey: 'order_management_sheet_id',
    envVarKey: 'ORDER_MANAGEMENT_SHEET_ID',
    pageLocation: "Order Management > Summary",
  },
  {
    name: 'Competitor Landscape',
    emoji: '🗺️',
    localStorageKey: 'competitor_landscape_sheet_id',
    envVarKey: 'COMPETITOR_LANDSCAPE_SHEET_ID',
    pageLocation: "Command Center > Competitor Landscape",
  }
]


const DataSourceSettingsPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress } = useAuth()
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isSignedIn) {
      setLoading(true)
      const loadedSources = DATA_SOURCE_CONFIGS.map(config => {
        const currentId = localStorage.getItem(config.localStorageKey)
        let defaultId = null
        try {
          defaultId = getEnv(config.envVarKey)
        } catch (e) {
          console.warn(`Default environment variable ${config.envVarKey} not set.`)
        }
        return {
          ...config,
          currentId: currentId || defaultId,
          defaultId,
        }
      })
      setDataSources(loadedSources)
      setLoading(false)
    } else {
      setDataSources([])
      setLoading(false)
    }
  }, [isSignedIn])

  if (!isSignedIn) {
    return (
      <ManagerEditorLayout title="Data Source Settings">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to view data source settings"
            description="Connect your Google account to see which Google Sheets are currently configured for your application."
            action={
              <Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>
                {isAuthActionInProgress ? 'Loading...' : 'Sign in with Google 🚀'}
              </Button>
            }
          />
        </Card>
      </ManagerEditorLayout>
    )
  }

  return (
    <ManagerEditorLayout title="Data Source Settings">
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Technical overview of the Google Sheet "Database" layer. Use individual page settings (⚙️) to modify IDs.
      </p>

      {loading ? (
        <Card>
          <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading settings...</div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dataSources.map(source => (
            <Card key={source.name} title={`${source.emoji} ${source.name}`}>
              <div className="space-y-4 text-sm">
                <div>
                  <label className="block font-medium text-[var(--color-text-secondary)] mb-1">
                    Active Sheet ID
                  </label>
                  <div className="p-2 bg-[var(--color-bg-stage)] rounded-md break-all font-mono text-xs">
                    {source.currentId || 'Not Set'}
                  </div>
                </div>
                
                {source.currentId && (
                  <a 
                    href={`https://docs.google.com/spreadsheets/d/${source.currentId}/edit`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs text-blue-500 hover:underline block font-bold"
                  >
                    Open "Database" Sheet 🔗
                  </a>
                )}

                <div className="pt-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border-primary)]">
                  UI Location:<br />
                  <span className="font-semibold text-[var(--color-text-primary)]">{source.pageLocation}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </ManagerEditorLayout>
  )
}

export default DataSourceSettingsPage;
