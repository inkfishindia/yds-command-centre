
import React, { useState, useMemo, useRef, useCallback } from 'react'
import { Card, Button, EmptyState, ManagerEditorLayout, Modal, Input, Select, Tag, Textarea, StatusPill, Drawer, Table } from '../ui'
import { useAuth } from '../contexts/AuthContext'
import { useGmail } from '../contexts/GmailContext'
import { useDrive } from '../contexts/DriveContext'
import { useGoogleCalendar } from '../contexts/GoogleCalendarContext'
import { usePortfolio } from '../contexts/PortfolioContext'
import { GmailMessage, GoogleDriveFile, GoogleCalendarEvent } from '../types'
import MarkdownOutput from '../ui/organisms/MarkdownOutput'

const GoogleWorkspacePage: React.FC = () => {
    const { isSignedIn, signIn, isAuthActionInProgress } = useAuth()
    const { tasks } = usePortfolio()
    const gmail = useGmail()
    const drive = useDrive()
    const calendar = useGoogleCalendar()

    // Global Filter States
    const [timeRange, setTimeRange] = useState<'today' | 'week'>('today')
    const [contextFilter, setContextFilter] = useState<'all' | 'sales' | 'ops' | 'strategy'>('all')
    const [originFilter, setOriginFilter] = useState<'all' | 'internal' | 'external'>('all')
    
    // Mail Specific Filters
    const [mailStatusFilter, setMailStatusFilter] = useState<'all' | 'unread' | 'read'>('all')
    const [mailPriorityFilter, setMailPriorityFilter] = useState<'all' | 'priority' | 'normal'>('all')

    // UI State
    const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null)
    const [selectedFolder, setSelectedFolder] = useState<string | null>(null)
    const [isPushModalOpen, setIsPushModalOpen] = useState(false)

    const loading = gmail.loading || drive.loading || calendar.loading

    // Helper: Determine if email is internal
    const isInternal = (email: string) => email.toLowerCase().includes('yourdesignstore.in')

    // Helper: Determine if email is unread based on Gmail labels
    const isUnread = (msg: GmailMessage) => {
        // payload.labelIds is where Gmail stores status
        return msg.payload?.labelIds?.includes('UNREAD');
    }

    // Filtered Gmail Logic
    const filteredGmail = useMemo(() => {
        let list = gmail.emails
        
        // Origin Filter
        if (originFilter === 'internal') list = list.filter(m => isInternal(m.sender))
        if (originFilter === 'external') list = list.filter(m => !isInternal(m.sender))
        
        // Status Filter (Unread/Read)
        if (mailStatusFilter === 'unread') list = list.filter(m => isUnread(m))
        if (mailStatusFilter === 'read') list = list.filter(m => !isUnread(m))

        // Context Filter
        if (contextFilter !== 'all') {
            const keywords = { 
                sales: /order|payment|invoice|lead|quote|customer/i, 
                ops: /shipping|production|stock|hub|inventory|fulfillment/i, 
                strategy: /vision|quarter|roadmap|invest|board|growth/i 
            }
            list = list.filter(m => keywords[contextFilter as keyof typeof keywords].test(m.subject + m.snippet))
        }

        // Priority Filter
        if (mailPriorityFilter === 'priority') {
            list = list.filter(m => m.snippet.match(/urgent|asap|important|action required/i) || !isInternal(m.sender))
        }

        return list
    }, [gmail.emails, originFilter, contextFilter, mailStatusFilter, mailPriorityFilter])

    const filteredEvents = useMemo(() => {
        const now = new Date()
        const end = new Date()
        if (timeRange === 'today') end.setHours(23, 59, 59)
        else end.setDate(now.getDate() + 7)

        return calendar.events.filter(e => {
            const date = e.start ? new Date(e.start) : null
            if (!date) return true
            return date >= now && date <= end
        })
    }, [calendar.events, timeRange])

    // DRIVE INTELLIGENCE (SHEETS-FIRST)
    const driveFolders = useMemo(() => {
        return [
            { id: 'f1', name: 'Sales Assets', owner: 'Danish', activity: '2h ago', changed: 3, alert: true },
            { id: 'f2', name: 'Production Logs', owner: 'Surath', activity: '5h ago', changed: 12, alert: false },
            { id: 'f3', name: 'Strategy 2026', owner: 'Vivek', activity: '1d ago', changed: 1, alert: false },
        ]
    }, [])

    const prioritizedFiles = useMemo(() => {
        return drive.files.filter(f => {
            const isSheet = f.mimeType.includes('spreadsheet')
            const isDoc = f.mimeType.includes('document')
            return isSheet || isDoc
        })
    }, [drive.files])

    const getMailFlags = (msg: GmailMessage) => {
        const flags = []
        if (!isInternal(msg.sender)) flags.push({ label: 'EXTERNAL', color: 'blue' })
        if (msg.snippet.match(/urgent|asap|important/i)) flags.push({ label: 'URGENT', color: 'red' })
        if (isUnread(msg)) flags.push({ label: 'UNREAD', color: 'yellow' })
        return flags
    }

    const handlePushToTask = (source: any) => {
        setIsPushModalOpen(true)
    }

    if (!isSignedIn) {
        return (
            <ManagerEditorLayout title="Workspace Command">
                <Card title="Ecosystem Lock">
                    <EmptyState
                        title="Authorize Google Workspace"
                        description="Access your Gmail triage, Calendar timeline, and Drive priorities."
                        action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Connect Account 🚀</Button>}
                    />
                </Card>
            </ManagerEditorLayout>
        )
    }

    return (
        <ManagerEditorLayout title="Workspace Command" toolbar={
            <div className="flex gap-2 flex-wrap justify-end">
                <Select 
                    options={[{value:'all', label:'All Messages'}, {value:'unread', label:'Unread Only'}, {value:'read', label:'Read Only'}]} 
                    value={mailStatusFilter} 
                    onChange={v => setMailStatusFilter(v as any)} 
                    className="w-36"
                />
                <Select 
                    options={[{value:'all', label:'Any Priority'}, {value:'priority', label:'Action Needed'}]} 
                    value={mailPriorityFilter} 
                    onChange={v => setMailPriorityFilter(v as any)} 
                    className="w-36"
                />
                <div className="w-px h-8 bg-[var(--color-border-primary)] mx-1 hidden sm:block"></div>
                <Select 
                    options={[{value:'all', label:'All Contexts'}, {value:'sales', label:'Sales'}, {value:'ops', label:'Ops'}, {value:'strategy', label:'Strategy'}]} 
                    value={contextFilter} 
                    onChange={v => setContextFilter(v as any)} 
                    className="w-32"
                />
                <Button onClick={() => gmail.loadEmails(true)} disabled={loading} variant="secondary">🔄</Button>
            </div>
        }>
            
            {/* TOP SIGNAL STRIP */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                <button 
                    onClick={() => setMailStatusFilter('unread')}
                    className="bg-[var(--color-bg-surface)] p-4 rounded-xl border-b-4 border-yellow-500 shadow-sm text-left group hover:scale-[1.02] transition-all"
                >
                    <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">Unread Inbox</p>
                    <p className="text-3xl font-black text-yellow-500">{gmail.emails.filter(isUnread).length}</p>
                    <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Items needing focus</p>
                </button>
                <button className="bg-[var(--color-bg-surface)] p-4 rounded-xl border-b-4 border-blue-500 shadow-sm text-left group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">Meetings</p>
                    <p className="text-3xl font-black text-blue-500">{filteredEvents.length}</p>
                    <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Next 24 hours</p>
                </button>
                <button 
                    onClick={() => setOriginFilter(originFilter === 'external' ? 'all' : 'external')}
                    className={`bg-[var(--color-bg-surface)] p-4 rounded-xl border-b-4 border-red-500 shadow-sm text-left group hover:scale-[1.02] transition-all ${originFilter === 'external' ? 'ring-2 ring-red-500' : ''}`}
                >
                    <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">External Reach</p>
                    <p className="text-3xl font-black text-red-500">{gmail.emails.filter(m => !isInternal(m.sender)).length}</p>
                    <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Client communications</p>
                </button>
                <button className="bg-[var(--color-bg-surface)] p-4 rounded-xl border-b-4 border-green-500 shadow-sm text-left group hover:scale-[1.02] transition-all">
                    <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase tracking-widest">Active Sheets</p>
                    <p className="text-3xl font-black text-green-500">{prioritizedFiles.filter(f => f.mimeType.includes('spreadsheet')).length}</p>
                    <p className="text-xs mt-1 text-[var(--color-text-secondary)]">Operational databases</p>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* MAIL TRIAGE */}
                <Card 
                    title={
                        <div className="flex justify-between items-center w-full">
                            <span>📥 Mail Intelligence</span>
                            <span className="text-[10px] bg-[var(--color-bg-stage)] px-2 py-0.5 rounded text-[var(--color-text-secondary)]">
                                {filteredGmail.length} / {gmail.emails.length} Visible
                            </span>
                        </div>
                    } 
                    bodyClassName="p-0 max-h-[600px] overflow-y-auto"
                >
                    <div className="divide-y divide-[var(--color-border-primary)]">
                        {filteredGmail.map(msg => {
                            const unread = isUnread(msg);
                            return (
                                <div 
                                    key={msg.id} 
                                    onClick={() => setSelectedEmail(msg)}
                                    className={`p-4 hover:bg-[var(--color-bg-stage)] cursor-pointer group transition-colors flex gap-4 ${unread ? 'bg-blue-50/10 border-l-4 border-l-yellow-500' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${unread ? 'bg-[var(--color-brand-primary)] text-white' : 'bg-[var(--color-bg-stage)] text-[var(--color-brand-primary)]'}`}>
                                        {msg.sender[0].toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <p className={`text-xs truncate max-w-[180px] ${unread ? 'font-black text-[var(--color-text-primary)]' : 'font-medium text-[var(--color-text-secondary)]'}`}>
                                                {msg.sender}
                                            </p>
                                            <div className="flex gap-1">
                                                {getMailFlags(msg).map((f, i) => <Tag key={i} color={f.color as any}>{f.label}</Tag>)}
                                            </div>
                                        </div>
                                        <p className={`text-sm truncate ${unread ? 'font-black text-[var(--color-text-primary)]' : 'font-medium text-[var(--color-text-secondary)]'}`}>
                                            {msg.subject}
                                        </p>
                                        <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1 mt-0.5">{msg.snippet}</p>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredGmail.length === 0 && (
                            <div className="p-12 text-center">
                                <p className="text-sm text-[var(--color-text-secondary)]">No messages match current filters.</p>
                                <Button variant="secondary" size="sm" className="mt-2" onClick={handleClearAllFilters}>Reset Filters</Button>
                            </div>
                        )}
                    </div>
                </Card>

                {/* CALENDAR CONTEXT */}
                <Card title="📅 Decision Timeline" bodyClassName="p-0">
                    <div className="divide-y divide-[var(--color-border-primary)]">
                        {filteredEvents.map(event => (
                            <div key={event.id} className="p-4 flex gap-4 hover:bg-[var(--color-bg-stage)] transition-colors">
                                <div className="w-12 text-center">
                                    <p className="text-[10px] font-black text-[var(--color-text-secondary)] uppercase">
                                        {event.start?.split(' ')[0]}
                                    </p>
                                    <p className="text-sm font-black">
                                        {event.start?.split(' ')[1]}
                                    </p>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="text-sm font-bold">{event.summary}</h4>
                                        <StatusPill status={event.summary.includes('External') ? 'Blocked' : 'Active'}>
                                            {event.summary.includes('Sync') ? 'STRATEGIC' : 'OPERATIONAL'}
                                        </StatusPill>
                                    </div>
                                    <div className="mt-2 flex gap-3">
                                        <button className="text-[10px] font-bold text-[var(--color-brand-primary)] hover:underline">View Agenda</button>
                                        {event.summary.includes('Sync') && <span className="text-[10px] font-bold text-red-500 animate-pulse">⚠️ PREP NEEDED</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredEvents.length === 0 && <EmptyState title="No Meetings" description="Focus time detected." />}
                    </div>
                </Card>
            </div>

            {/* DRIVE WORKBENCH */}
            <div className="space-y-6">
                <h2 className="text-xl font-black text-[var(--color-text-primary)] flex items-center gap-2">
                    <span>📂</span> Drive Workbench
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {driveFolders.map(folder => (
                        <button 
                            key={folder.id} 
                            onClick={() => setSelectedFolder(folder.id)}
                            className={`p-4 rounded-xl border-2 text-left transition-all ${selectedFolder === folder.id ? 'border-[var(--color-brand-primary)] bg-[var(--color-bg-surface)]' : 'border-transparent bg-[var(--color-bg-surface)] hover:border-[var(--color-border-primary)]'}`}
                            style={{ boxShadow: 'var(--shadow-elevation)' }}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-2xl">📁</span>
                                {folder.alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
                            </div>
                            <h3 className="font-bold text-sm truncate">{folder.name}</h3>
                            <p className="text-[10px] text-[var(--color-text-secondary)] font-medium mt-1">
                                {folder.changed} files changed last 7d
                            </p>
                        </button>
                    ))}
                </div>

                <Card title="⚡ Recent Files" bodyClassName="p-0 overflow-hidden">
                    <Table headers={['Signal', 'File Name', 'Structure', 'Last Edit', 'Action']}>
                        {prioritizedFiles.slice(0, 8).map(file => {
                            const isSheet = file.mimeType.includes('spreadsheet')
                            return (
                                <tr key={file.id} className="hover:bg-[var(--color-bg-stage)] group">
                                    <td className="px-4 py-3"><Tag color={isSheet ? "green" : "blue"}>{isSheet ? "DATABASE" : "ASSET"}</Tag></td>
                                    <td className="px-4 py-3 font-bold text-sm">{file.name}</td>
                                    <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)] font-mono">{isSheet ? 'Sheets' : 'Doc'}</td>
                                    <td className="px-4 py-3 text-xs">{new Date(file.modifiedTime!).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-right">
                                        <a href={file.webViewLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--color-brand-primary)] hover:underline">OPEN</a>
                                    </td>
                                </tr>
                            )
                        })}
                    </Table>
                </Card>
            </div>

            {/* EXPAND-IN-PLACE EMAIL DRAWER */}
            <Drawer 
                open={!!selectedEmail} 
                onClose={() => setSelectedEmail(null)} 
                width="600px" 
                title="Message Intelligence"
            >
                {selectedEmail && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black">{selectedEmail.subject}</h3>
                                <p className="text-sm font-bold text-[var(--color-brand-primary)]">{selectedEmail.sender}</p>
                            </div>
                            <Tag color={isInternal(selectedEmail.sender) ? 'gray' : 'blue'}>
                                {isInternal(selectedEmail.sender) ? 'INTERNAL' : 'EXTERNAL'}
                            </Tag>
                        </div>
                        
                        <div className="bg-[var(--color-bg-stage)] p-4 rounded-lg border border-[var(--color-border-primary)] min-h-[200px]">
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {selectedEmail.body || selectedEmail.snippet}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Card title="Context Signals">
                                <ul className="text-xs space-y-2 font-bold text-[var(--color-text-secondary)]">
                                    <li className="flex items-center gap-2"><span>🏷️</span> Status: {isUnread(selectedEmail) ? 'Awaiting Review' : 'Read'}</li>
                                    <li className="flex items-center gap-2"><span>📂</span> Potential Workspace Link detected</li>
                                </ul>
                            </Card>
                            <Card title="Quick Actions">
                                <div className="grid grid-cols-1 gap-2">
                                    <Button size="sm" variant="primary" onClick={() => handlePushToTask(selectedEmail)}>🚀 Push to Task</Button>
                                    <Button size="sm" variant="secondary" onClick={() => window.open(`https://mail.google.com/mail/u/0/#inbox/${selectedEmail.id}`, '_blank')}>View in Gmail 🔗</Button>
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </Drawer>

            {/* PUSH MODAL */}
            <Modal open={isPushModalOpen} onClose={() => setIsPushModalOpen(false)} title="Integration Mapper">
                <div className="space-y-4">
                    <p className="text-sm font-bold">Convert source into project task:</p>
                    <Select label="Project ID" options={[{value: 'p1', label: 'E-commerce Redesign'}]} onChange={() => {}} />
                    <Input label="Task Title" value={selectedEmail?.subject || ''} onChange={() => {}} />
                    <Textarea label="Execution Notes" rows={4} placeholder="Map specific email instructions here..." />
                    <Button className="w-full" variant="primary" onClick={() => setIsPushModalOpen(false)}>Commit to Sheets 💾</Button>
                </div>
            </Modal>
        </ManagerEditorLayout>
    )

    function handleClearAllFilters() {
        setMailStatusFilter('all');
        setMailPriorityFilter('all');
        setContextFilter('all');
        setOriginFilter('all');
    }
}

export default GoogleWorkspacePage
