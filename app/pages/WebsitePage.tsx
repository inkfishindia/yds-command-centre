import React, { useState } from 'react';
import { WorkspaceLayout, Card, Button, EmptyState, Table } from '../ui'; // Updated import for WorkspaceLayout
import { useAuth } from '../contexts/AuthContext';
import DemoModeBanner from '../components/layout/DemoModeBanner';
import { WebsitePageProps } from '../types'; // Import the new WebsitePageProps

interface TeamMemberCardProps {
  name: string;
  role: string;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ name, role }) => (
  <Card className="!p-4 bg-[var(--color-bg-stage)] hover:bg-opacity-80 transition-colors cursor-pointer">
    <h4 className="font-bold text-md text-[var(--color-text-primary)]">{name}</h4>
    <p className="text-sm text-[var(--color-text-secondary)]">{role}</p>
  </Card>
);

interface TeamColumnProps {
  title: string;
  emoji: string;
  members: Array<{ name: string; role: string }>;
}

const TeamColumn: React.FC<TeamColumnProps> = ({ title, emoji, members }) => (
  <Card title={<span className="font-semibold text-[var(--color-text-primary)]">{emoji} {title}</span>} className="flex flex-col h-full">
    <div className="flex-1 overflow-y-auto space-y-4 p-4">
      {members.length > 0 ? (
        members.map((member, index) => (
          <TeamMemberCard key={index} name={member.name} role={member.role} />
        ))
      ) : (
        <EmptyState title="No Members" description={`No members in "${title}" team.`} />
      )}
    </div>
  </Card>
);

const DESIGN_TOOL_SHORTCUTS = [
  {
    name: 'Canva',
    logo: 'https://public.canva.site/logo/media/dfb96cc174513093cd6ed61489ccb750.svg',
    url: 'https://www.canva.com/',
  },
  {
    name: 'Kittl',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Kittl_Logo.svg/1200px-Kittl_Logo.svg.png',
    url: 'https://www.kittl.com/',
  },
  {
    name: 'Veo 3',
    logo: 'https://cdn-b.saashub.com/images/app/service_logos/292/t4ykfd4iiqxu/large.png?1747831216',
    url: 'https://veo.co/',
  },
  {
    name: 'Nano Banana',
    logo: 'https://thepsdguy.com/wp-content/uploads/2025/08/Nano-Banana-Logo-PNG-AI-Banana-Text-logo-transparent-png-1024x1024.png',
    url: 'https://nanobanana.com/',
  },
];

// FIX: Define an interface for team comparison data for type safety
interface TeamComparisonDataItem {
  aspect: string;
  productPlatform: string;
  marketingWebsite: string;
}

const WebsitePage: React.FC<WebsitePageProps> = ({ title }) => {
  const { isSignedIn, signIn, isAuthActionInProgress, isMockMode } = useAuth();
  const [loading, setLoading] = useState(false); // Simulate loading state

  const productPlatformUnitMembers = [
    { name: 'Product Manager', role: 'Team Lead' },
    { name: 'Product Designer', role: 'Tool UX' },
    { name: 'Frontend Engineers', role: 'Build Tool' },
    { name: 'UX Writer', role: 'In-tool Copy' },
  ];

  const marketingWebsiteUnitMembers = [
    { name: 'Growth Lead', role: 'Team Lead' },
    { name: 'Content/Community Manager', role: 'Key Role #1' },
    { name: 'Performance Marketer', role: 'Paid Ads' },
    { name: 'Freelance Copywriter', role: 'Marketing Copy' },
  ];

  // FIX: Applied the new interface for teamComparisonData
  const teamComparisonData: TeamComparisonDataItem[] = [
    { aspect: 'Core Mission', productPlatform: 'Make the tool work so users succeed', marketingWebsite: 'Bring more users to the tool' },
    { aspect: 'Success Metric', productPlatform: 'Conversion rate (0.24% → 1%)', marketingWebsite: 'Traffic growth, CAC, signups' },
    { aspect: 'Team Lead', productPlatform: 'Product Manager', marketingWebsite: 'Growth Lead' },
    { aspect: 'Key Role #1', productPlatform: 'Product Designer (tool UX)', marketingWebsite: 'Content/Community Manager' },
    { aspect: 'Key Role #2', productPlatform: 'Frontend Engineers (build tool)', marketingWebsite: 'Performance Marketer (paid ads)' },
    { aspect: 'Key Role #3', productPlatform: 'UX Writer (in-tool copy)', marketingWebsite: 'Freelance Copywriter (marketing copy)' },
    { aspect: 'Budget', productPlatform: '₹420K/month', marketingWebsite: '₹180-300K/month + ad spend' },
    { aspect: 'When to Build', productPlatform: 'NOW (Month 1)', marketingWebsite: 'LATER (Month 5+)' },
    { aspect: 'Prerequisite', productPlatform: 'None - this IS the prerequisite', marketingWebsite: 'Product conversion must be fixed first' },
    { aspect: 'Works On', productPlatform: 'Design tool, templates, mockups, user flows', marketingWebsite: 'Landing pages, ads, social media, content' },
    { aspect: 'DOES NOT Work On', productPlatform: 'Marketing, ads, traffic', marketingWebsite: 'Product features, tool UX' },
    { aspect: 'ROI Timeline', productPlatform: '2-3 months', marketingWebsite: '3-6 months (after product is fixed)' },
  ];

  const handleRefresh = () => {
    setLoading(true);
    // Simulate a data refresh
    setTimeout(() => {
      setLoading(false);
      // In a real app, you would refetch data here.
    }, 1000);
  };

  const toolbar = (
    <Button onClick={handleRefresh} disabled={loading} variant="secondary">
      {loading ? 'Refreshing...' : 'Refresh 🔄'}
    </Button>
  );

  const leftPaneContent = (
    <Card title="🛠️" className="h-full">
      <div className="space-y-4 p-2">
        {DESIGN_TOOL_SHORTCUTS.map((tool, index) => (
          <a
            key={index}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center p-3 rounded-md transition-colors cursor-pointer"
            title={tool.name}
            aria-label={`Open ${tool.name}`}
          >
            <img src={tool.logo} alt={`${tool.name} logo`} className="w-8 h-8 object-contain" />
          </a>
        ))}
      </div>
    </Card>
  );

  const rightPaneContent = (
    <>
      {isMockMode && <DemoModeBanner onSignIn={signIn} />}
      <p className="mb-8 text-[var(--color-text-secondary)]">
        Visualize your website and marketing team structures and responsibilities.
      </p>

      {loading ? (
        <div className="text-center py-10 text-[var(--color-text-secondary)]">Loading team data...</div>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TeamColumn title="Product Platform Unit" emoji="💻" members={productPlatformUnitMembers} />
            <TeamColumn title="Marketing Website Unit" emoji="📣" members={marketingWebsiteUnitMembers} />
          </div>

          <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Team Comparison</h2>
          <Card>
            <Table headers={['Aspect', 'Product Platform Unit', 'Marketing Website Unit']}>
              {teamComparisonData.map((row, index) => (
                <tr key={index} className="hover:bg-[var(--color-bg-stage)]/80">
                  <td className="px-4 py-3 font-semibold text-sm text-[var(--color-text-primary)]">{row.aspect}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{row.productPlatform}</td>
                  <td className="px-4 py-3 text-sm text-[var(--color-text-secondary)]">{row.marketingWebsite}</td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      )}
    </>
  );

  if (!isSignedIn && !isMockMode) {
    return (
      <Card title="Google Sign-in Required" className="h-full flex flex-col">
        <EmptyState
          title={`Please sign in to view ${title} team data`}
          description={`Connect your Google account to access this feature.`}
          action={
            <Button variant="accent" onClick={signIn} disabled={isAuthActionInProgress}>
              {isAuthActionInProgress ? 'Loading...' : 'Sign in with Google 🚀'}
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <WorkspaceLayout
      title={title}
      toolbar={toolbar}
      leftPane={leftPaneContent}
      rightPane={rightPaneContent}
      className="gap-6" // Adds gap between left and right panes
      leftPaneWidthClass="lg:col-span-2" // Left pane takes 2/12th width on large screens
      rightPaneWidthClass="lg:col-span-10" // Right pane takes 10/12th width on large screens
    />
  );
};

export default WebsitePage;