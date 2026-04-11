
import React, { useState, useMemo, useEffect } from 'react'
import { Button, Modal, Input, Table, Tag } from '../index'
import { usePortfolio } from '../../contexts/PortfolioContext'
import { useOrder } from '../../contexts/OrderContext'
import { useCompetitorLandscape } from '../../contexts/CompetitorLandscapeContext'
import { useToast } from '../../contexts/ToastContext'
import { useBmc } from '../../hooks/useBmc'
import { fetchValues } from '../../lib/sheets'

interface ManagerEditorLayoutProps {
  title: string
  toolbar?: React.ReactNode
  children: React.ReactNode
}

const ManagerEditorLayout: React.FC<ManagerEditorLayoutProps> = ({ title, toolbar, children }) => {
  const [isNoteOpen, setIsNoteOpen] = useState(false);
  const [discoveredHeaders, setDiscoveredHeaders] = useState<string[]>([]);
  const [isFetchingHeaders, setIsFetchingHeaders] = useState(false);
  const { addToast } = useToast();
  
  const portfolio = usePortfolio();
  const order = useOrder();
  const landscape = useCompetitorLandscape();
  const bmc = useBmc();

  const currentConfig = useMemo(() => {
    const t = title.toLowerCase();
    
    if (t.includes('business model canvas') || t.includes('strategy board')) {
      return { 
        label: 'Business Architecture (BMC)', 
        id: localStorage.getItem('bmc_google_sheet_id') || '1HXIoXZLDzXtB7aOy23AapoHhP8xgLxm_K8VcQ2KPvsY', 
        sheetName: 'VISION / MISSION / VALUES',
        setter: (id: string) => localStorage.setItem('bmc_google_sheet_id', id),
        mappedValues: ['Vision (10-year)', 'Mission (3-year)', 'Positioning (Unfair advantage)']
      };
    }

    if (t.includes('competitor landscape')) return { 
      label: 'Competitor Landscape', 
      id: landscape.sheetId, 
      sheetName: 'Competitors',
      setter: landscape.setSheetId,
      mappedValues: ['Brand', 'Tier', 'Core Strengths', 'Category', 'Website']
    };
    
    if (t.includes('order')) return { 
      label: 'Order Management', 
      id: order.orderSheetId, 
      sheetName: 'all orders',
      setter: order.setOrderSheetId,
      mappedValues: ['Order #', 'Customer', 'Product', 'Status', 'Total Amount with tax']
    };

    if (t.includes('program')) return { 
      label: 'Programs', 
      id: portfolio.programSheetId, 
      sheetName: 'PROGRAMS',
      setter: portfolio.setProgramSheetId,
      mappedValues: ['program_id', 'program_name', 'status', 'owner_person_id']
    };

    return null;
  }, [title, portfolio.programSheetId, portfolio.setProgramSheetId, order.orderSheetId, order.setOrderSheetId, landscape.sheetId, landscape.setSheetId]);

  const [tempId, setTempId] = useState('');

  const fetchRawHeaders = async (id: string, sheetName: string) => {
    if (!id) return;
    setIsFetchingHeaders(true);
    try {
      const response = await fetchValues(id, `'${sheetName}'!1:1`);
      if (response.values && response.values[0]) {
        setDiscoveredHeaders(response.values[0]);
      }
    } catch (e) {
      console.warn("Could not fetch headers for introspection:", e);
      setDiscoveredHeaders([]);
    } finally {
      setIsFetchingHeaders(false);
    }
  };

  const handleOpen = () => {
    if (currentConfig) {
      setTempId(currentConfig.id || '');
      setIsNoteOpen(true);
      if (currentConfig.id) {
        fetchRawHeaders(currentConfig.id, currentConfig.sheetName);
      }
    }
  };

  const handleSave = () => {
    if (currentConfig && currentConfig.setter) {
      currentConfig.setter(tempId);
      setIsNoteOpen(false);
      addToast('Data Source updated. Syncing...', 'success');
      // Trigger a re-render or reload
      setTimeout(() => window.location.reload(), 500);
    }
  };

  const getColLetter = (index: number) => String.fromCharCode(65 + index);

  return (
    <div className="h-full flex flex-col">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">{title}</h1>
          {currentConfig && (
            <button 
              onClick={handleOpen}
              className="p-1 hover:bg-[var(--color-bg-surface)] rounded text-xs border border-transparent hover:border-[var(--color-border-primary)] transition-all grayscale opacity-50 hover:grayscale-0 hover:opacity-100"
              title="Inspect Database Schema"
            >
              ⚙️
            </button>
          )}
        </div>
        {toolbar && <div className="flex flex-wrap items-center gap-2 shrink-0 sm:ml-4 mt-4 sm:mt-0">{toolbar}</div>}
      </header>
      <div className="flex-1">
        {children}
      </div>

      <Modal 
        open={isNoteOpen} 
        onClose={() => setIsNoteOpen(false)} 
        title={`Schema Inspector: ${currentConfig?.label}`}
        className="max-w-3xl"
      >
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-bold text-[var(--color-text-secondary)] uppercase tracking-wider mb-2">Connected Database ID</h3>
            <Input 
              label="Spreadsheet ID" 
              value={tempId} 
              onChange={e => setTempId(e.target.value)}
              placeholder="Paste ID from URL..."
            />
          </section>

          <section className="bg-[var(--color-bg-stage)] p-4 rounded-md border border-[var(--color-border-primary)]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Spreadsheet Column Audit 🔍</h3>
              <Tag color={discoveredHeaders.length > 0 ? 'green' : 'gray'}>
                {isFetchingHeaders ? '⌛ Fetching...' : discoveredHeaders.length > 0 ? '🟢 Connected' : '🔴 Disconnected'}
              </Tag>
            </div>

            {discoveredHeaders.length > 0 ? (
              <div className="max-h-64 overflow-y-auto border rounded bg-[var(--color-bg-surface)]">
                <Table headers={['Col', 'Header Name', 'App Usage']}>
                  {discoveredHeaders.map((header, idx) => {
                    const isMapped = currentConfig?.mappedValues.includes(header);
                    return (
                      <tr key={idx} className="text-xs border-b border-[var(--color-border-primary)] last:border-0">
                        <td className="px-3 py-2 font-mono font-bold text-blue-500 bg-[var(--color-bg-stage)]/50 w-12 text-center">
                          {getColLetter(idx)}
                        </td>
                        <td className="px-3 py-2 font-mono text-[var(--color-text-primary)]">
                          {header || <span className="opacity-30 italic">(Empty Column)</span>}
                        </td>
                        <td className="px-3 py-2">
                          {isMapped ? (
                            <span className="text-[10px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded uppercase">🔗 Active</span>
                          ) : (
                            <span className="text-[10px] text-[var(--color-text-secondary)] italic">Shadow Column</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-[var(--color-text-secondary)] italic border-2 border-dashed border-[var(--color-border-primary)] rounded">
                {isFetchingHeaders ? 'Reading spreadsheet structure...' : 'Enter a valid ID and verify permissions to discover sheet headers.'}
              </div>
            )}
          </section>

          <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border-primary)]">
            <a 
              href={`https://docs.google.com/spreadsheets/d/${tempId}/edit`} 
              target="_blank" 
              rel="noreferrer" 
              className="text-xs text-blue-500 hover:underline"
            >
              Open Full Spreadsheet 🔗
            </a>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsNoteOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleSave}>Apply & Sync 🚀</Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default ManagerEditorLayout
