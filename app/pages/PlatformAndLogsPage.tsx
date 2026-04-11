import React, { useState, useMemo, useCallback } from 'react';
import { Card, Button, EmptyState, Modal, Tag, MarkdownOutput, ManagerEditorLayout } from '../ui'; // Changed Page, Card, Button, EmptyState, Modal, Tag, MarkdownOutput
import { PlatformInfo, ClaudeProject } from '../types';

// Hardcoded data for Platforms
const PLATFORMS: PlatformInfo[] = [
  {
    id: 'PLATFORM-YDS-WEBSITE',
    name: 'YDS Website',
    url: 'https://www.yourdesignstore.in/',
    logoUrl: 'https://www.yourdesignstore.in/assets/v2/img/logo_yds.svg',
    emoji: '🌐',
    description: 'Our primary D2C e-commerce storefront.',
  },
  {
    id: 'PLATFORM-ADMIN-PANEL',
    name: 'Admin Panel (OMS/CMS)',
    url: 'https://admin.yourdesignstore.in/admin/admin/orders',
    logoUrl: 'https://www.outdoinc.com/img/cart.png',
    emoji: '⚙️',
    description: 'Order Management and Content Management System for internal operations.',
  },
  {
    id: 'PLATFORM-PARTNER-DASHBOARD',
    name: 'Partner Dashboard',
    url: 'https://partner.yourdesignstore.in/admin/dashboard',
    emoji: '🤝',
    description: 'Portal for our partners to manage their designs, orders, and earnings.',
  },
];

// Hardcoded data for Claude AI Projects
const CLAUDE_PROJECTS: ClaudeProject[] = [
  {
    id: 'CLA-01',
    name: 'Data mapping project framework',
    shareLink: 'https://claude.ai/project/019a0719-3ef9-7599-8f12-35d603858561',
    contentBrief: 'Contains a chat titled “Data mapping project framework” with an executive discovery brief describing a 9‑step framework for linking tasks to business impact. It includes design for delegation, risk registers and flowcharts summarising data‑mapping strategy.',
    category: 'Strategy & Planning',
    tags: ['data mapping', 'framework', 'risk registers', 'flowcharts', 'strategy'],
  },
  {
    id: 'CLA-02',
    name: 'YDC – partner channel',
    shareLink: 'https://claude.ai/project/0199ef8e-b991-7178-8526-c4a8d93b6108', // Using a different URL for demo differentiation
    contentBrief: 'Focuses on creating a partner‑channel strategy for YourDesignStore (YDS). A panel (Execution Committee) defines principles such as partner‑first and revenue transparency, lists the roles of the panel members, and outlines strategic goals.',
    category: 'Strategy & Planning',
    tags: ['partner channel', 'strategy', 'revenue transparency', 'execution committee'],
  },
  {
    id: 'CLA-03',
    name: 'YDC – B2B Self serve',
    shareLink: 'https://claude.ai/project/0199ef41-02e1-7450-9702-565bfc5f9f8b',
    contentBrief: 'Contains conversations “Conversation setup verification” and “B2B self‑serve life strategy workshop.” The project explores how to set up a self‑serve B2B channel and includes discussion guidelines for workshops.',
    category: 'Strategy & Planning',
    tags: ['B2B', 'self-serve', 'strategy workshop', 'channel setup'],
  },
  {
    id: 'CLA-04',
    name: 'YDC – Self serve',
    shareLink: 'https://claude.ai/project/0199ed77-b725-7582-ad24-0fea694c4676',
    contentBrief: 'Focuses on a D2C self‑serve strategy. It includes a chat called “D2C lifecycle business strategy workshop” which discusses lifecycle marketing and self‑serve operations.',
    category: 'Strategy & Planning',
    tags: ['D2C', 'self-serve', 'lifecycle marketing', 'strategy workshop'],
  },
  {
    id: 'CLA-05',
    name: 'Catch-all Project',
    shareLink: 'https://claude.ai/project/0199e916-d0a4-7628-9f13-dfa8b2858851',
    contentBrief: 'A “catch‑all” project that holds multiple conversations: a digital platform launch strategy, a Google Sheets project‑tracking template, a business hub program architecture, Shopify partner integration tasks, and more.',
    category: 'Product & Tech',
    tags: ['digital platform', 'launch strategy', 'google sheets', 'shopify', 'integration', 'architecture'],
  },
  {
    id: 'CLA-06',
    name: 'YDC – advisory panel',
    shareLink: 'https://claude.ai/project/0199e86d-0024-758f-bb8f-b2bfeb7d9c56',
    contentBrief: 'Houses numerous strategy conversations: coupon code generation, leadership team strategy, company brief analysis, strategic metrics and goal tracking, advisory dashboard design, B2B self‑service panel, design store candidate selection, AI‑powered customer‑journey mapping, and more.',
    category: 'Strategy & Planning',
    tags: ['advisory', 'strategy', 'metrics', 'dashboard design', 'customer journey mapping'],
  },
  {
    id: 'CLA-07',
    name: 'YD – CReative office',
    shareLink: 'https://claude.ai/project/0199e218-9f55-7475-8346-0256543f5f42',
    contentBrief: 'A creative‑team project with tasks such as Diwali social‑media vs shoe‑design concepts, product‑page rebuild strategy, D2C apparel lookbook production, product‑photography guide, and a system prompt design. It centralizes creative office activities.',
    category: 'Marketing & Creative',
    tags: ['creative', 'social media', 'product photography', 'design concepts'],
  },
  {
    id: 'CLA-08',
    name: 'YD – art director',
    shareLink: 'https://claude.ai/project/0199e215-c287-74b6-8ab9-a7e1d6dccf35',
    contentBrief: 'An empty project reserved for the art director; currently no conversations.',
    category: 'Uncategorized',
    tags: ['art director', 'empty'],
  },
  {
    id: 'CLA-09',
    name: 'YDC – experience',
    shareLink: 'https://claude.ai/project/0199de02-5ef3-757a-8445-70894c8b6108',
    contentBrief: 'Contains conversations about design and branding experiences: a Walsh–Sutherland design workshop, consumer psychology & branding insights, a project overview with Jessica Walsh, spatial analysis & visualization, and a marketing HQ space design concept.',
    category: 'Marketing & Creative',
    tags: ['design', 'branding', 'consumer psychology', 'marketing space design'],
  },
  {
    id: 'CLA-10',
    name: 'YD – Creative (D2C)',
    shareLink: 'https://claude.ai/project/0199d74e-0731-70b0-bbfd-5727f2a10e98', // Same link as CLA-10, differentiating by content for demo
    contentBrief: 'Focuses on D2C creative initiatives. Topics include a creative catalogue design, AI image analysis for apparel, ideation for lookbooks and product pages, etc. It also includes visual standards and photography guides (noted as files).',
    category: 'Marketing & Creative',
    tags: ['D2C creative', 'catalogue design', 'AI image analysis', 'lookbooks', 'photography guides'],
  },
  {
    id: 'CLA-11',
    name: 'YD Creative Director',
    shareLink: 'https://claude.ai/project/0199d74e-0731-70b0-bbfd-5727f2a10e98', // Same link as CLA-10, differentiating by content for demo
    contentBrief: 'A strategic design‑leadership project. Contains conversations such as brand voice strategy framework, brand design updates, collaboration with Design Yatra conference, and strategic brand building. It lists mood‑board files and guidelines (appears to share the slug with the D2C creative project but has separate chats).',
    category: 'Marketing & Creative',
    tags: ['design leadership', 'brand voice', 'brand building', 'strategic design'],
  },
  {
    id: 'CLA-12',
    name: 'YDS – run',
    shareLink: 'https://claude.ai/project/019987f4-5ec2-74ec-be2b-cdc897eb859c',
    contentBrief: 'Addresses operational scaling and leadership topics: partner infrastructure scaling, scaling creator infrastructure with tech titans, Jeff Bezos leadership system design, operational architecture blueprint, strategic brand panel framework, customer‑segment strategy spreadsheet, and startup strategy from Bezos’ perspective.',
    category: 'Operations & CX',
    tags: ['operational scaling', 'leadership', 'infrastructure', 'customer segments', 'startup strategy'],
  },
  {
    id: 'CLA-13',
    name: 'YDS GA specialist',
    shareLink: 'https://claude.ai/project/0199a517-0325-775c-82c6-50e64c497be0',
    contentBrief: 'Contains two performance‑marketing chats: one on creating a Google Ads performance dashboard and another on Google Looker Studio dashboard links.',
    category: 'Marketing & Creative',
    tags: ['performance marketing', 'Google Ads', 'Looker Studio', 'dashboard'],
  },
  {
    id: 'CLA-14',
    name: 'YDC brand',
    shareLink: 'https://claude.ai/project/0199a3c6-0543-775e-a875-3c7524ff1f91',
    contentBrief: 'Provides a brand‑governance board for YDS. Conversations discuss a database schema for project management, a design‑platform business‑model overview and a bootstrapped design‑store project. The instructions panel lists moderators and board‑member philosophies (collated from leading brand strategists).',
    category: 'Strategy & Planning',
    tags: ['brand governance', 'database schema', 'project management', 'business model'],
  },
  {
    id: 'CLA-15',
    name: 'YD lab',
    shareLink: 'https://claude.ai/project/0199a5d8-32b4-75de-9ef7-c8edd71a1675',
    contentBrief: 'A lab for strategy and architecture exploration. Topics include canva–Printful merger potential, operating‑system architectures blueprint, strategic business foundations, AI‑powered agency workflow tools, sales & marketing app development, flywheel ecosystem design, and more. Multiple blueprint documents are attached.',
    category: 'Strategy & Planning',
    tags: ['strategy', 'architecture', 'AI tools', 'sales & marketing app', 'flywheel design'],
  },
  {
    id: 'CLA-16',
    name: 'YD Comp',
    shareLink: 'https://claude.ai/project/01997c70-7a93-7479-84f2-15c1220b2a36',
    contentBrief: 'Focuses on competitive‑intelligence strategy. Contains one conversation about building a competitive‑intelligence platform.',
    category: 'Strategy & Planning',
    tags: ['competitive intelligence', 'strategy', 'platform building'],
  },
  {
    id: 'CLA-17',
    name: 'Customer success',
    shareLink: 'https://claude.ai/project/01997a66-d9a5-704c-b67a-ad3235415679',
    contentBrief: 'A project on customer‑success strategies for a D2C customization platform. It includes a chat on designing a customer‑success program and houses documents covering customer‑success process standards and pro.gram guidelines.',
    category: 'Operations & CX',
    tags: ['customer success', 'D2C', 'customization platform', 'program design'],
  },
  {
    id: 'CLA-18',
    name: 'Database manifest mapping guide (x)', // Merged content for similar ID
    shareLink: 'https://claude.ai/project/0199a188-a7e5-747c-92eb-646b6dc721c0',
    contentBrief: 'Contains a single chat titled “Database manifest mapping guide.” It’s essentially a small project for documenting database‑manifest mappings. (Also part of "YDS – consulyt" strategic advisory, encompassing strategic brand development, business design ecosystems, digital manufacturing platform design, professional brand-book development, and more. Includes a comprehensive strategic workshop framework, company profile, business model canvas, strategic business plan, customer-experience map and brand playbook.)',
    category: 'Product & Tech',
    tags: ['database mapping', 'manifest', 'strategic advisory', 'brand development', 'business model canvas'],
  },
  {
    id: 'CLA-19',
    name: 'YDS‑COS',
    shareLink: 'https://claude.ai/project/0199b7a3-2e80-7020-8790-b93b4cfade70',
    contentBrief: 'Oriented around task and project management. Chats include comprehensive briefing requests, project‑task updates, project‑structure analysis, personal task‑management lists, product‑list compilation strategies, tech‑team meeting notes, interactive React mind‑map design, React app user‑access management, enterprise‑management platform design and branding/marketing project setup. One “xls” file (anchor document) is category: Product & Tech attached.',
    category: 'Product & Tech',
    tags: ['task management', 'project management', 'React app', 'ERP integration', 'branding', 'marketing'],
  },
  {
    id: 'CLA-20',
    name: 'YDC Performance',
    shareLink: 'https://claude.ai/project/01995621-74cd-75fc-a0c8-4f794a793b57',
    contentBrief: 'A performance‑marketing project focusing on analytics and growth via Google Ads. Contains chats on designing a Google Ads dashboard and defining an order line‑item reporting format.',
    category: 'Marketing & Creative',
    tags: ['performance marketing', 'analytics', 'Google Ads', 'dashboard', 'reporting'],
  },
  {
    id: 'CLA-21',
    name: 'B2B CONTENT ENGINE & COPY PANEL',
    shareLink: 'https://claude.ai/project/01997028-04c1-74f2-ac89-a5725baa5893',
    contentBrief: 'Handles B2B content and copy. Chats include an Instagram reel description strategy, a review of new restaurants in Bangalore, designing an AI‑powered automation tool, and transforming blog content into an interactive system. It serves as a content‑engine and copy‑panel hub.',
    category: 'Marketing & Creative',
    tags: ['B2B content', 'copywriting', 'Instagram reels', 'AI automation', 'blog transformation'],
  },
  {
    id: 'CLA-22',
    name: 'WEBSITE COPY & UX PANEL',
    shareLink: 'https://claude.ai/project/01996f9d-8d85-773b-82b4-6254dc8303ab',
    contentBrief: 'Focuses on website copywriting and UX research. Conversations include building a customer‑success team infrastructure, optimizing a creative workshop strategy, optimizing customer‑journey experiences and creating a design‑store UX research framework. Two guideline documents are attached.',
    category: 'Marketing & Creative',
    tags: ['website copy', 'UX research', 'customer journey', 'creative workshop', 'design store'],
  },
  {
    id: 'CLA-23',
    name: 'YD test1',
    shareLink: 'https://claude.ai/project/01996ca8-a4c7-75e4-b140-89d03f00e54c',
    contentBrief: 'A sandbox project containing various strategy and content experiments: a design‑store strategic scaling framework, creative‑director brand strategy, content strategy for three verticals, prompt‑engineering optimization, knowledge‑base verification, business architecture analysis, brand voice storytelling, hybrid copywriting strategy, and more. Files include a strategic brand brief and an “implementation guide.',
    category: 'Strategy & Planning',
    tags: ['sandbox', 'strategy', 'content strategy', 'prompt engineering', 'brand voice'],
  },
  {
    id: 'CLA-24',
    name: 'YDC PANNELS',
    shareLink: 'https://claude.ai/project/0199ccd4-1a0c-7592-8efb-20139be44ab1',
    contentBrief: 'Brainstorming hub containing chats on prompt engineering, AI design experience store strategy, Google Sheets database ecosystem, customer insights framework, Google Apps Script for YDS workbook and market foundation workshops.',
    category: 'Product & Tech',
    tags: ['prompt engineering', 'AI design', 'Google Sheets', 'database', 'customer insights'],
  },
  {
    id: 'CLA-25',
    name: 'YD = setup',
    shareLink: 'https://claude.ai/project/01996add-4471-7203-9c7d-8fbf6b0345ec',
    contentBrief: 'Setup materials including chats about simplifying business design strategy, personal brand tone, and strategic business development; attachments like a Business‑Model Canvas, business analysis and a 2025‑27 strategic plan.',
    category: 'Strategy & Planning',
    tags: ['business design', 'strategy', 'personal brand', 'business model canvas'],
  },
  {
    id: 'CLA-26',
    name: 'YDS board',
    shareLink: 'https://claude.ai/project/0199630f-0da4-772a-b771-8465b4710539',
    contentBrief: 'Board of Directors framework defining YDS mission (blend Canva‑like design with Shopify‑like commerce), leverages insights from Melanie Perkins, Rory Sutherland and other experts; outlines decision criteria (Canva test) and phase‑wise strategic priorities.',
    category: 'Strategy & Planning',
    tags: ['board of directors', 'mission', 'shopify', 'strategy', 'decision criteria'],
  },
  {
    id: 'CLA-27',
    name: 'YD – content',
    shareLink: 'https://claude.ai/project/01982852-24ee-7541-a8f2-d2fe3578fdc3',
    contentBrief: 'Chats on D2C content strategy, design‑customisation platform and brand marketing; instructions from a Chief Content Strategist emphasising behavioural copywriting, cultural intelligence, educational content architecture and platform voice development.',
    category: 'Marketing & Creative',
    tags: ['D2C content', 'content strategy', 'brand marketing', 'copywriting', 'platform voice'],
  },
  {
    id: 'CLA-28',
    name: 'YDS tech',
    shareLink: 'https://claude.ai/project/0199571a-631c-756b-a47f-379830f1060b',
    contentBrief: 'Technical project hub covering e‑commerce product sync, custom API design, workflow optimisation and ticket management; led by a Senior Development Specialist focusing on full‑stack architecture, ERP integration and DevOps processes.',
    category: 'Product & Tech',
    tags: ['e-commerce', 'API design', 'workflow optimization', 'ERP integration', 'DevOps'],
  },
  {
    id: 'CLA-29',
    name: 'YD CEO',
    shareLink: 'https://claude.ai/project/01982662-10fe-70d2-aabb-39410f2d06cd',
    contentBrief: 'Multiple chats for CEO tasks: live design‑lab event planning, growth‑roadmaps, Notion database documentation, knowledge‑base building and brand architecture; instructions reflect the founder’s vision combining customer‑obsessed, marketplace‑orchestrated and design‑democratised principles; includes numerous strategic documents.',
    category: 'Operations & CX',
    tags: ['CEO tasks', 'event planning', 'growth roadmaps', 'brand architecture', 'strategic documents'],
  },
  {
    id: 'CLA-30',
    name: 'YDC – Content strategist',
    shareLink: 'https://claude.ai/project/01989f05-aa1b-75ea-97bd-2c11ed0e2ed7',
    contentBrief: 'Instructions for a senior content strategist blending research‑driven storytelling (David Ogilvy) with platform‑growth insights (Reid Hoffman); focuses on emerging markets, network effects and conversion‑driven storytelling; no chats yet.',
    category: 'Marketing & Creative',
    tags: ['content strategist', 'storytelling', 'platform growth', 'emerging markets'],
  },
  {
    id: 'CLA-31',
    name: 'YDC – Chief Marketing Officer',
    shareLink: 'https://claude.ai/project/01989e87-9ea9-7362-b2ea-b034af8c4fda',
    contentBrief: '“YourDesignStore.in D2C Strategy” chat; CMO role definition covers quarterly & annual planning, premium positioning, channel strategy & ₹94 L/month budget allocation, team capability building, martech adoption and performance/ROI optimization.',
    category: 'Marketing & Creative',
    tags: ['CMO', 'D2C strategy', 'marketing planning', 'channel strategy', 'ROI optimization'],
  },
  {
    id: 'CLA-32',
    name: 'YDC – Marketing Operations Director',
    shareLink: 'https://claude.ai/project/01989e86-2dad-7265-8430-68d0e3b2d16f',
    contentBrief: 'Role description for a marketing‑ops director reporting to Dan; responsibilities include campaign & budget management, dashboard & content‑calendar oversight, team management, weekly KPIs and sprint planning; currently no chats.',
    category: 'Marketing & Creative',
    tags: ['marketing operations', 'campaign management', 'budget management', 'content calendar', 'KPIs'],
  },
  {
    id: 'CLA-33',
    name: 'YDS google Ads',
    shareLink: 'https://claude.ai/project/01989a9f-43e4-76bd-835e-545daa4d2d27',
    contentBrief: 'Contains chats on SEO keyword research, a Google Ads management spreadsheet and a corporate performance report; instructions draw from Neil Patel, Gary Vaynerchuk, Perry Marshall and others to deliver data‑driven growth and funnel psychology; includes a “Knowledgebase” file.',
    category: 'Marketing & Creative',
    tags: ['Google Ads', 'SEO', 'keyword research', 'performance report', 'funnel psychology'],
  },
  {
    id: 'CLA-34',
    name: 'YD CMO – d2c',
    shareLink: 'https://claude.ai/project/0197ca46-1ac6-7119-86ba-f735607db945',
    contentBrief: 'Extensive marketing management project with chats on AI‑powered team management, D2C strategy, capability building, partnership strategies, campaign restructuring, banner conversion, campaign portfolio and content calendar; led by a seasoned CMO blending Ogilvy‑style storytelling with growth‑hacking frameworks; includes schema and operations‑guide files.',
    category: 'Marketing & Creative',
    tags: ['CMO', 'D2C strategy', 'AI team management', 'partnership strategies', 'campaign management'],
  },
  {
    id: 'CLA-35',
    name: 'YD – catalyst',
    shareLink: 'https://claude.ai/project/0197e958-0fd0-75b3-931a-2637b2d758be',
    contentBrief: 'Focused on scaling and automation: chats on project team alignment, ecommerce automation, organisational structure, financial scaling benchmarks, business scaling frameworks, partnership access and database updates; led by a ruthlessly efficient D2C scaling architect using blitzscaling and working‑backwards principles; includes strategic revision and market‑intelligence files.',
    category: 'Operations & CX',
    tags: ['scaling', 'automation', 'ecommerce', 'organizational structure', 'financial scaling', 'database updates'],
  },
  {
    id: 'CLA-36',
    name: 'YD – marketing',
    shareLink: 'https://claude.ai/project/01981bac-9d7e-7026-8d63-fb93f961d7',
    contentBrief: 'Contains chats such as AI marketing tools & strategy, responsive email templates, AI image generator launch campaigns and website research; the instruction panel outlines a CMO profile with agency (Ogilvy/Grey) background, D2C & e‑commerce specialization, apparel/print‑on‑demand expertise, data‑driven and customer‑centric methods, and provides a market‑intelligence brief.',
    category: 'Marketing & Creative',
    tags: ['AI marketing', 'email templates', 'image generator', 'website research', 'D2C'],
  },
  {
    id: 'CLA-37',
    name: 'YD‑tech',
    shareLink: 'https://claude.ai/project/0197cbc3-0d0b-774e-abc4-7ef88633a985',
    contentBrief: 'Technical project focusing on Gemini image‑generation prompts and a tech‑team project canvas; led by a senior technical project manager experienced in POD platforms (Printify/Printful) and agile development; responsibilities span request analysis, phased project planning, sprint management, reporting and risk mitigation; includes “Business Overview” and Gemini prompt‑guide files.',
    category: 'Product & Tech',
    tags: ['Gemini', 'image generation', 'tech team', 'project canvas', 'agile development', 'POD platforms'],
  },
  {
    id: 'CLA-38',
    name: 'YD',
    shareLink: 'https://claude.ai/project/0197c986-8ec2-7052-aa49-b1f03df9b162',
    contentBrief: 'General operational hub acting as the founder’s personal‑assistant workspace; hosts numerous chats (AI sales partner project management, AI generator launch setup, Notion API schema design, strategic planning tasks, merger integration frameworks, meeting notes, checklists, etc.) and supports transforming high‑level ideas into structured tasks; instructions frame the role as providing executive support and managing schedules, tasks and documentation.',
    category: 'Operations & CX',
    tags: ['operational hub', 'AI sales partner', 'Notion API', 'strategic planning', 'executive support'],
  },
  {
    id: 'CLA-39',
    name: 'IG Panel',
    shareLink: 'https://claude.ai/project/019a47bf-b183-7170-9be9-7b3a735729c7',
    contentBrief: 'Focuses on developing Instagram strategies and content calendars for marketing campaigns.',
    category: 'Marketing & Creative',
    tags: ['instagram', 'strategy', 'content calendar', 'marketing'],
  },
];

type KanbanColumn = 'Strategy & Planning' | 'Product & Tech' | 'Marketing & Creative' | 'Operations & CX' | 'Uncategorized';

const KANBAN_COLUMNS: KanbanColumn[] = [
  'Strategy & Planning',
  'Product & Tech',
  'Marketing & Creative',
  'Operations & CX',
  'Uncategorized',
];

const getTagColor = (tag: string): 'green' | 'blue' | 'gray' => {
  if (tag.includes('strategy') || tag.includes('planning') || tag.includes('vision')) return 'green';
  if (tag.includes('product') || tag.includes('tech') || tag.includes('API') || tag.includes('development')) return 'blue';
  if (tag.includes('marketing') || tag.includes('brand') || tag.includes('creative') || tag.includes('UX') || tag.includes('instagram')) return 'blue'; // Added instagram
  if (tag.includes('operations') || tag.includes('customer') || tag.includes('fulfillment')) return 'green';
  return 'gray';
};

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ClaudeProject | null;
}

const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({ isOpen, onClose, project }) => {
  if (!project) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title={project.name} className="max-w-3xl h-[80vh] flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Content Brief</h3>
          <MarkdownOutput content={project.contentBrief} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Share Link</h3>
          <a href={project.shareLink} target="_blank" rel="noopener noreferrer" className="text-[var(--color-brand-primary)] hover:underline">
            {project.shareLink}
          </a>
        </div>
        <div>
          <h3 className="text-lg font-bold text-[var(--color-brand-primary)] mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag, index) => (
              <Tag key={index} color={getTagColor(tag)}>
                {tag}
              </Tag>
            ))}
          </div>
        </div>
      </div>
      <div className="p-4 border-t border-[var(--color-border-primary)] flex justify-end">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

const PlatformAndLogsPage: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<ClaudeProject | null>(null);
  const [isProjectDetailModalOpen, setIsProjectDetailModalOpen] = useState(false);

  const handleOpenProjectDetail = (project: ClaudeProject) => {
    setSelectedProject(project);
    setIsProjectDetailModalOpen(true);
  };

  const handleCloseProjectDetail = () => {
    setIsProjectDetailModalOpen(false);
    setSelectedProject(null);
  };

  const getColumnEmoji = (column: KanbanColumn) => {
    switch (column) {
      case 'Strategy & Planning': return '🧭';
      case 'Product & Tech': return '💻';
      case 'Marketing & Creative': return '🎨';
      case 'Operations & CX': return '🛠️';
      case 'Uncategorized': return '❓';
      default: return '';
    }
  };

  return (
    <ManagerEditorLayout title="Platform & Logs Overview">
      <p className="mb-8 text-[var(--color-text-secondary)]">
        A centralized view of your key platforms and AI-powered project logs from Claude.
      </p>

      {/* Platforms Panel */}
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Deployed Platforms</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {PLATFORMS.map((platform) => (
          <Card key={platform.id} className="h-full">
            <div className="p-4 group"> {/* Removed the outer <a> tag and added padding to this div */}
              <div className="flex items-center mb-3">
                {platform.logoUrl ? (
                  <img src={platform.logoUrl} alt={`${platform.name} logo`} className="w-8 h-8 mr-3 object-contain" />
                ) : (
                  <span className="text-3xl mr-3">{platform.emoji}</span>
                )}
                <h3 className="flex-1 text-lg font-bold text-[var(--color-text-primary)] transition-colors">
                  <a 
                    href={platform.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="hover:text-[var(--color-brand-primary)]"
                    aria-label={`Go to ${platform.name} website`}
                  >
                    {platform.name}
                  </a>
                </h3>
                <span className="ml-auto text-xl text-[var(--color-text-secondary)]">🔗</span>
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {platform.description}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {/* Kanban Board for Claude Projects */}
      <h2 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Claude AI Project Logs</h2>
      <div className="flex flex-col flex-1"> {/* This ensures it takes available vertical space */}
        <div className="flex overflow-x-auto pb-4 -mx-4 px-4 custom-scrollbar flex-1"> {/* flex-1 for vertical growth */}
          {KANBAN_COLUMNS.map((column) => (
            <div key={column} className="flex-none w-[16rem] max-h-full mr-6">
              <Card title={<h3 className="font-semibold text-[var(--color-text-primary)]">{getColumnEmoji(column)} {column}</h3>} className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-4 p-4">
                  {CLAUDE_PROJECTS.filter(project => project.category === column).length > 0 ? (
                    CLAUDE_PROJECTS.filter(project => project.category === column).map((project) => (
                      <div
                        key={project.id}
                        className="p-3 rounded-md bg-[var(--color-bg-stage)] hover:bg-opacity-80 transition-colors cursor-pointer group"
                        style={{ boxShadow: 'var(--shadow-elevation)' }}
                        onClick={() => handleOpenProjectDetail(project)}
                        tabIndex={0}
                        role="button"
                        aria-label={`View project details for ${project.name}`}
                        title={project.contentBrief.length > 150 ? project.contentBrief.substring(0, 150) + '...' : project.contentBrief} // Tooltip for brief snippet
                      >
                        <h4 className="font-bold text-sm text-[var(--color-text-primary)] mb-2 group-hover:text-[var(--color-brand-primary)] transition-colors">{project.name}</h4>
                        <div className="flex flex-wrap gap-1">
                          {project.tags.map((tag, idx) => (
                            <Tag key={idx} color={getTagColor(tag)}>{tag}</Tag>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState title="No Projects" description={`No projects in "${column}" category.`} />
                  )}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </div>

      <ProjectDetailModal isOpen={isProjectDetailModalOpen} onClose={handleCloseProjectDetail} project={selectedProject} />

      {/* Reporting System Bar */}
      <div className="mt-8 p-4 bg-[var(--color-bg-surface)] border-t border-[var(--color-border-primary)] flex items-center justify-center space-x-8 text-[var(--color-text-secondary)] text-sm shadow-inner shrink-0">
        <span className="flex items-center">
          <span className="text-xl mr-2" role="img" aria-label="Google Analytics">📊</span> Google Analytics
        </span>
        <span className="flex items-center">
          <span className="text-xl mr-2" role="img" aria-label="Hotjar">🔥</span> Hotjar
        </span>
      </div>
    </ManagerEditorLayout>
  );
};

export default PlatformAndLogsPage;