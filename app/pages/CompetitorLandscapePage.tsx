
import React, { useState, useMemo } from 'react';
import { ManagerEditorLayout, Card, Button, EmptyState, Tag, Drawer, Tabs, Input, Select, MarkdownOutput, Table, StatusPill } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { useCompetitorLandscape } from '../contexts/CompetitorLandscapeContext';
import { CompetitorLandscapeItem } from '../types';

const getTierColor = (tier: string): 'green' | 'blue' | 'gray' => {
  const t = tier?.toLowerCase() || '';
  if (t.includes('1') || t.includes('flagship')) return 'green';
  if (t.includes('2') || t.includes('enterprise')) return 'blue';
  return 'gray';
};

const CompetitorLandscapePage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const { 
    competitors, analysis, positioning, capabilities, notes, uxProduct,
    loading, loadCompetitors 
  } = useCompetitorLandscape();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState('All');
  const [selectedCompetitor, setSelectedCompetitor] = useState<CompetitorLandscapeItem | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const tiers = useMemo(() => ['All', ...Array.from(new Set(competitors.map(c => c.tier).filter(Boolean)))], [competitors]);

  const filteredCompetitors = useMemo(() => {
    return competitors.filter(c => {
      const matchesSearch = c.brand?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = selectedTier === 'All' || c.tier === selectedTier;
      return matchesSearch && matchesTier;
    });
  }, [competitors, searchTerm, selectedTier]);

  const competitorDossier = useMemo(() => {
    if (!selectedCompetitor) return null;
    const brand = selectedCompetitor.brand?.toLowerCase();
    return {
      analysis: analysis.find(a => a.competitor?.toLowerCase() === brand),
      positioning: positioning.find(p => p.brand?.toLowerCase() === brand),
      capability: capabilities.find(c => c.brand?.toLowerCase() === brand),
      ux: uxProduct.find(u => u.brand?.toLowerCase() === brand),
      notes: notes.filter(n => n.brand?.toLowerCase() === brand)
    };
  }, [selectedCompetitor, analysis, positioning, capabilities, notes, uxProduct]);

  const toolbar = (
    <div className="flex flex-wrap gap-2">
      <Input placeholder="Search brands..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-48 !py-1" />
      <Select options={tiers.map(t => ({ value: t, label: t }))} value={selectedTier} onChange={setSelectedTier} className="w-32" />
      <Button onClick={() => loadCompetitors(true)} disabled={loading} variant="secondary" size="sm">Sync 🔄</Button>
    </div>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Competitor Intelligence">
        <EmptyState title="Secure Research Portal" description="Authentication required to access market mapping." action={<Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>Authorize 🚀</Button>} />
      </ManagerEditorLayout>
    );
  }

  return (
    <ManagerEditorLayout title="Competitor Intelligence" toolbar={toolbar}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredCompetitors.map((item, idx) => (
          <div key={idx} onClick={() => { setSelectedCompetitor(item); setActiveTab('overview'); }} className="bg-[var(--color-bg-surface)] rounded-xl border border-[var(--color-border-primary)] p-5 hover:border-[var(--color-brand-primary)] transition-all cursor-pointer group shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-lg bg-[var(--color-bg-stage)] flex items-center justify-center text-xl overflow-hidden">
                {item.logo ? <img src={item.logo} className="w-full h-full object-contain" alt="" /> : '🏢'}
              </div>
              <Tag color={getTierColor(item.tier)}>{item.tier}</Tag>
            </div>
            <h3 className="text-xl font-bold text-[var(--color-text-primary)]">{item.brand}</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{item.category}</p>
            <div className="mt-4 pt-4 border-t border-[var(--color-border-primary)]/50 text-xs font-bold text-[var(--color-brand-primary)]">VIEW DOSSIER →</div>
          </div>
        ))}
      </div>

      <Drawer open={!!selectedCompetitor} onClose={() => setSelectedCompetitor(null)} width="700px" title={selectedCompetitor?.brand || 'Intelligence Dossier'}>
        {selectedCompetitor && (
          <div className="flex flex-col h-full">
            <div className="mb-6">
              <Tabs 
                mainSectionId="competitor_landscape" 
                activeTab={activeTab} 
                onTabClick={setActiveTab}
                items={[
                  { id: 'overview', label: 'Overview' },
                  { id: 'positioning', label: 'Positioning' },
                  { id: 'capabilities', label: 'Capabilities' },
                  { id: 'ux', label: 'UX & Product' },
                  { id: 'notes', label: 'Team Notes' }
                ]}
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <Card title="Core Reference">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="font-bold text-[var(--color-text-secondary)] uppercase text-[10px]">Tier</p><Tag color={getTierColor(selectedCompetitor.tier)}>{selectedCompetitor.tier}</Tag></div>
                      <div><p className="font-bold text-[var(--color-text-secondary)] uppercase text-[10px]">Category</p><p className="font-bold">{selectedCompetitor.category}</p></div>
                    </div>
                  </Card>
                  <section className="bg-[var(--color-bg-stage)] p-4 rounded-lg">
                    <h4 className="text-sm font-bold uppercase mb-2">Core Strengths</h4>
                    <p className="text-sm">{selectedCompetitor.coreStrengths || 'Not mapped.'}</p>
                  </section>
                </div>
              )}

              {activeTab === 'positioning' && competitorDossier?.positioning && (
                <div className="space-y-6">
                  <div className="p-4 bg-[var(--color-note-yellow-bg)] text-[var(--color-note-yellow-text)] rounded-lg border border-[var(--color-note-yellow-text)]/20 italic">
                    {competitorDossier.positioning.positioningStatement}
                  </div>
                  <Table headers={['Attribute', 'Detail']}>
                    <tr><td className="font-bold">Owns</td><td>{competitorDossier.positioning.owns}</td></tr>
                    <tr><td className="font-bold">Tries to Own</td><td>{competitorDossier.positioning.triesToOwn}</td></tr>
                    <tr><td className="font-bold">Primary Audience</td><td>{competitorDossier.positioning.primaryAudience}</td></tr>
                    <tr><td className="font-bold">Tone</td><td>{competitorDossier.positioning.tone}</td></tr>
                  </Table>
                </div>
              )}

              {activeTab === 'capabilities' && competitorDossier?.capability && (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Brand Power', value: competitorDossier.capability.brandPower },
                    { label: 'Customizer UX', value: competitorDossier.capability.customizerUX },
                    { label: 'Catalog Depth', value: competitorDossier.capability.catalogDepth },
                    { label: 'Speed', value: competitorDossier.capability.speed },
                    { label: 'Sustainability', value: competitorDossier.capability.sustainability },
                    { label: 'Tech Maturity', value: competitorDossier.capability.techMaturity }
                  ].map((cap, i) => (
                    <div key={i} className="p-3 border border-[var(--color-border-primary)] rounded-lg">
                      <p className="text-[10px] font-bold uppercase text-[var(--color-text-secondary)]">{cap.label}</p>
                      <p className="font-bold text-[var(--color-brand-primary)]">{cap.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'ux' && competitorDossier?.ux && (
                <div className="space-y-4">
                  {[
                    { label: 'Homepage', value: competitorDossier.ux.homepageUX },
                    { label: 'Editor/Customizer', value: competitorDossier.ux.customizerUX },
                    { label: 'Onboarding', value: competitorDossier.ux.onboardingFlow },
                    { label: 'Checkout', value: competitorDossier.ux.checkoutExperience }
                  ].map((u, i) => (
                    <div key={i} className="p-4 border-l-4 border-[var(--color-brand-primary)] bg-[var(--color-bg-stage)]">
                      <h5 className="font-bold text-xs uppercase mb-1">{u.label}</h5>
                      <p className="text-sm">{u.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="space-y-4">
                  {competitorDossier?.notes.length ? competitorDossier.notes.map((n, i) => (
                    <div key={i} className="p-3 bg-white border border-[var(--color-border-primary)] rounded shadow-sm">
                      <div className="flex justify-between text-[10px] font-bold text-[var(--color-text-secondary)] mb-2 uppercase">
                        <span>{n.date} • {n.addedBy}</span>
                        <Tag color="blue">{n.tag}</Tag>
                      </div>
                      <p className="text-sm">{n.note}</p>
                    </div>
                  )) : <EmptyState title="No Team Notes" description="Start logging observations for this brand." />}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </ManagerEditorLayout>
  );
};

export default CompetitorLandscapePage;
