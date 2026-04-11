
import React from 'react';
import { 
  ManagerEditorLayout, 
  Card,
  Button
} from '../ui';
import { mockWarehouses } from '../lib/mockData';

const WarehousesPage: React.FC = () => {
  return (
    <ManagerEditorLayout title="Warehouses">
      <div className="grid grid-cols-1 gap-8">
        {mockWarehouses.map(wh => (
          <Card key={wh.id} title={`${wh.name} (${wh.location})`}>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wh.zones.map(zone => (
                  <div key={zone.name} className="border border-[var(--color-border-primary)] rounded-lg p-4 bg-[var(--color-bg-stage)]/30">
                    <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex justify-between items-center">
                      {zone.name}
                      <span className="text-[10px] bg-[var(--color-brand-primary)] text-white px-2 py-0.5 rounded-full">
                        {zone.bins.length} Bins
                      </span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {zone.bins.map(bin => (
                        <div 
                          key={bin} 
                          className="aspect-square flex items-center justify-center border border-[var(--color-border-primary)] rounded bg-[var(--color-bg-surface)] text-[10px] font-bold hover:border-[var(--color-brand-primary)] cursor-pointer transition-colors"
                          onClick={() => alert(`Viewing Bin ${bin}`)}
                        >
                          {bin}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  className="border-2 border-dashed border-[var(--color-border-primary)] rounded-lg p-4 flex flex-col items-center justify-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-brand-primary)] hover:border-[var(--color-brand-primary)] transition-all"
                  onClick={() => alert('Add Zone')}
                >
                  <span className="text-2xl">+</span>
                  <span className="text-[10px] font-black uppercase tracking-widest">Add Zone</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </ManagerEditorLayout>
  );
};

export default WarehousesPage;
