/**
 * Marketing Suite View — from The-Design-Lab---TPL-X-YDS
 * Architecture reference: 4-quadrant layout with research, strategy, creation, analytics
 * PORT TO: Alpine.js marketing view in public/index.html
 */

import React, { useState } from 'react';
import type { GoogleUser, TokenResponse } from '../types';

import { CustomerPsychologyGenerator } from './marketing/CustomerPsychologyGenerator';
import { CompetitorListeningBlock } from './marketing/CompetitorListeningBlock';
import { ContentStrategyGenerator } from './marketing/ContentStrategyGenerator';
import { BlogGenerator } from './marketing/BlogGenerator';
import { CampaignIdeator } from './marketing/CampaignIdeator';
import { ImageDesigner } from './marketing/ImageDesigner';
import { VideoGenerator } from './marketing/VideoGenerator';
import { LookerStudioHub } from './LookerStudioHub';

import { WidgetCard } from './ui/WidgetCard';
import { SparklesIcon } from './icons/SparklesIcon';
import { CompetitorIcon } from './icons/CompetitorIcon';
import { MarketingIcon } from './icons/MarketingIcon';
import { LookerStudioIcon } from './icons/LookerStudioIcon';
import { StrategyIcon } from './icons/StrategyIcon';
import { VerticalSplitter, HorizontalSplitter } from './ui/Splitter';

interface MarketingViewProps {
  isAuthenticated: boolean;
  token: TokenResponse | null;
  user: GoogleUser | null;
}

/**
 * Marketing Suite Layout:
 * ┌─────────────────────┬─────────────────────┐
 * │ Customer & Competitor│ Strategy & Ideation  │
 * │ Research             │                      │
 * │ - Psychology Gen     │ - Content Strategy   │
 * │ - Competitor Listen  │ - Campaign Ideator   │
 * ├─────────────────────┼─────────────────────┤
 * │ Content Creation     │ Analytics            │
 * │ - Blog Generator     │ - Looker Studio Hub  │
 * │ - Image Designer     │                      │
 * │ - Video Generator    │                      │
 * └─────────────────────┴─────────────────────┘
 */
export const MarketingView: React.FC<MarketingViewProps> = ({
  isAuthenticated,
  token,
  user
}) => {
  const [customerPsychologyOutput, setCustomerPsychologyOutput] = useState('');

  const researchWidget = (
    <WidgetCard
      title="Customer & Competitor Research"
      icon={<CompetitorIcon className="w-6 h-6" />}
    >
      <div className="p-4 overflow-y-auto h-full">
        <HorizontalSplitter storageKey="marketing-research-h-splitter">
          <CustomerPsychologyGenerator
            onGenerationComplete={setCustomerPsychologyOutput}
          />
          <CompetitorListeningBlock />
        </HorizontalSplitter>
      </div>
    </WidgetCard>
  );

  const strategyWidget = (
    <WidgetCard
      title="Strategy & Ideation"
      icon={<StrategyIcon className="w-6 h-6" />}
    >
      <div className="p-4 overflow-y-auto h-full">
        <HorizontalSplitter storageKey="marketing-strategy-h-splitter">
          <ContentStrategyGenerator
            initialAudience={customerPsychologyOutput}
          />
          <CampaignIdeator />
        </HorizontalSplitter>
      </div>
    </WidgetCard>
  );

  const creationWidget = (
    <WidgetCard
      title="Content Creation"
      icon={<SparklesIcon className="w-6 h-6" />}
    >
      <div className="p-4 overflow-y-auto h-full">
        <HorizontalSplitter storageKey="marketing-creation-h-splitter">
          <BlogGenerator />
          <VerticalSplitter storageKey="marketing-visual-v-splitter">
            <ImageDesigner />
            <VideoGenerator />
          </VerticalSplitter>
        </HorizontalSplitter>
      </div>
    </WidgetCard>
  );

  const analyticsWidget = (
    <WidgetCard
      title="Analytics"
      icon={<LookerStudioIcon className="w-6 h-6" />}
    >
      <div className="p-4 overflow-y-auto h-full">
        <LookerStudioHub isAuthenticated={isAuthenticated} />
      </div>
    </WidgetCard>
  );

  const topRow = (
    <VerticalSplitter storageKey="marketing-top-v-splitter">
      {researchWidget}
      {strategyWidget}
    </VerticalSplitter>
  );

  const bottomRow = (
    <VerticalSplitter storageKey="marketing-bottom-v-splitter">
      {creationWidget}
      {analyticsWidget}
    </VerticalSplitter>
  );

  return (
    <div className="h-full w-full flex flex-col bg-cream text-midnight-navy">
      <div className="flex-shrink-0 text-center pt-6 px-6">
        <h1 className="text-3xl font-display font-bold text-midnight-navy">
          Marketing Suite
        </h1>
        <p className="mt-2 text-lg text-midnight-navy/70">
          Your central command for market analysis, content creation, and strategic planning.
        </p>
      </div>
      <main className="flex-grow p-6 overflow-hidden">
        <HorizontalSplitter storageKey="marketing-main-h-splitter">
          {topRow}
          {bottomRow}
        </HorizontalSplitter>
      </main>
    </div>
  );
};
