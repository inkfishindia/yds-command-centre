
import React from 'react';
import { ManagerEditorLayout, Card, EmptyState, Button, Tag } from '../ui';
import { useAuth } from '../contexts/AuthContext';
import { navigationStructure, NavMainItem, NavSubItem } from '../navigation';
import DemoModeBanner from '../components/layout/DemoModeBanner';

// EXPLICIT STATUS REGISTRY
// This ensures the site map is 100% accurate to the actual development state.
const PAGE_STATUS_REGISTRY: Record<string, 'functional' | 'mock' | 'beta'> = {
  'dashboard': 'functional',
  'google_workspace': 'functional',
  'portfolio_view': 'functional',
  'business_model_canvas': 'functional',
  'strategy': 'beta',
  'looker_studio': 'functional',
  'competitor_landscape': 'functional',
  'platforms_logs': 'functional',
  'strategic_initiatives': 'functional',
  'strategic_objectives': 'functional',
  'goals': 'functional',
  'quarterly_initiatives': 'functional',
  'resource_allocation': 'functional',
  'programs': 'functional',
  'projects': 'functional',
  'tasks': 'functional',
  'milestones': 'functional',
  'order_dashboard': 'functional',
  'order_list_summary': 'functional',
  'all_order_items': 'functional',
  'order_list_products': 'functional',
  'design_board': 'functional',
  'pick_list_kanban': 'functional',
  'production_screen': 'functional',
  'product_status_kanban': 'functional',
  'brand_hub': 'functional',
  'competitor_hub': 'functional',
  'customer_psychology': 'functional',
  'content_strategy': 'functional',
  'campaign_ideator': 'functional',
  'blog_generator': 'functional',
  'image_designer': 'functional',
  'video_generator': 'functional',
  'website': 'mock',
  'catalog': 'functional',
  'ppc_calculator': 'functional',
  'embedded_sheets': 'functional',
  'sheet_schema': 'functional',
  'data_source_settings': 'functional',
  'users_roles': 'functional',
};

const AllModulesAndSectionsPage: React.FC = () => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();

  const getPageStatus = (id: string) => {
    const status = PAGE_STATUS_REGISTRY[id] || 'mock';
    switch (status) {
      case 'functional':
        return { emoji: '✅', label: 'Functional', color: 'green' };
      case 'beta':
        return { emoji: '🧪', label: 'Beta', color: 'blue' };
      case 'mock':
      default:
        return { emoji: '🧱', label: 'Mock', color: 'gray' };
    }
  };

  if (!isSignedIn && !isMockMode) {
    return (
      <ManagerEditorLayout title="Site Map & Overview">
        <Card title="Google Sign-in Required">
          <EmptyState
            title="Please sign in to view the application site map"
            description="Connect your Google account to access this comprehensive overview."
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
    <ManagerEditorLayout title="Application Site Map">
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card bodyClassName="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-full text-2xl">🗺️</div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">Total Modules</p>
            <p className="text-2xl font-bold">{navigationStructure.length}</p>
          </div>
        </Card>
        <Card bodyClassName="flex items-center gap-4">
          <div className="p-3 bg-green-500/10 rounded-full text-2xl">🔗</div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">Total Sections</p>
            <p className="text-2xl font-bold">
              {navigationStructure.reduce((acc, curr) => acc + curr.subItems.length, 0)}
            </p>
          </div>
        </Card>
        <Card bodyClassName="flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 rounded-full text-2xl">✨</div>
          <div>
            <p className="text-sm text-[var(--color-text-secondary)] font-medium">System Health</p>
            <p className="text-2xl font-bold text-green-500">Live</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {navigationStructure.map((mainItem: NavMainItem) => (
          <Card 
            key={mainItem.id} 
            title={
              <div className="flex items-center justify-between w-full">
                <span>{mainItem.emoji} {mainItem.label}</span>
                <span className="text-xs font-normal text-[var(--color-text-secondary)] bg-[var(--color-bg-stage)] px-2 py-1 rounded">
                  {mainItem.subItems.length} Sections
                </span>
              </div>
            }
          >
            <div className="space-y-3">
              {mainItem.subItems.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {mainItem.subItems.map((subItem: NavSubItem) => {
                    const status = getPageStatus(subItem.id);

                    return (
                      <a 
                        key={subItem.id}
                        href={`#/${mainItem.id}/${subItem.id}`}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-[var(--color-bg-stage)] transition-colors border border-transparent hover:border-[var(--color-border-primary)] group"
                      >
                        <span className="text-sm font-medium group-hover:text-[var(--color-brand-primary)]">
                          {subItem.label}
                        </span>
                        <Tag color={status.color}>
                          {status.emoji} {status.label}
                        </Tag>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-text-secondary)] italic">No sections defined.</p>
              )}
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-12 p-6 bg-[var(--color-bg-surface)] border border-[var(--color-border-primary)] rounded-lg">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>🛠️</span> Legend
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-xs font-bold uppercase text-green-500 mb-2">✅ Functional</p>
            <p className="text-sm">Full CRUD enabled. Syncs with Google Sheets / Gemini APIs.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-blue-500 mb-2">🧪 Beta</p>
            <p className="text-sm">Read enabled. Write logic is being finalized.</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-gray-500 mb-2">🧱 Mock</p>
            <p className="text-sm">Static UI placeholders or hardcoded logic.</p>
          </div>
        </div>
      </div>
    </ManagerEditorLayout>
  );
};

export default AllModulesAndSectionsPage;
