'use strict';

const toolDefinitions = [
  {
    name: 'customer_psychology_generator',
    description: 'Generate a deep customer psychology profile for a market segment. Analyzes motivations, fears, desires, objections, decision triggers, behavioral patterns, and messaging angles. Use when Dan asks about audience understanding, customer insights, or wants to refine messaging for a segment.',
    input_schema: {
      type: 'object',
      properties: {
        segment: {
          type: 'string',
          description: 'The customer segment to analyze (e.g., "corporate gifting buyers", "college students", "startup founders")',
        },
        context: {
          type: 'string',
          description: 'Optional additional context about the segment or specific angle to explore',
        },
      },
      required: ['segment'],
    },
  },
  {
    name: 'competitor_analysis',
    description: 'Analyze a competitor in the custom merchandise / design / print-on-demand space. Returns positioning, strengths, weaknesses, pricing comparison, opportunity gaps, and recommended counter-positioning. Use when Dan asks about competitors or market positioning.',
    input_schema: {
      type: 'object',
      properties: {
        competitor: {
          type: 'string',
          description: 'Competitor name or website URL to analyze',
        },
        focus: {
          type: 'string',
          description: 'Optional specific focus area: "pricing", "product-range", "marketing", "technology", "customer-experience", or "overall"',
        },
      },
      required: ['competitor'],
    },
  },
  {
    name: 'content_strategy_generator',
    description: 'Generate a content strategy for a topic, audience, or campaign goal. Returns content pillars, format recommendations, distribution channels, posting cadence, and a sample 2-week content calendar. Use when Dan asks about content planning, social media strategy, or blog topics.',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'The topic or theme for the content strategy',
        },
        audience: {
          type: 'string',
          description: 'Target audience description',
        },
        goal: {
          type: 'string',
          description: 'Campaign or content goal (e.g., "increase B2B leads", "brand awareness", "drive repeat purchases")',
        },
        channels: {
          type: 'string',
          description: 'Optional preferred channels (e.g., "Instagram, LinkedIn, email")',
        },
      },
      required: ['topic'],
    },
  },
  {
    name: 'campaign_ideator',
    description: 'Generate creative campaign ideas for a product, promotion, or business goal. Returns 3-5 campaign concepts each with name, hook, messaging, channels, timeline, estimated budget range, and expected outcomes. Use when Dan asks for campaign ideas, promotions, or launch strategies.',
    input_schema: {
      type: 'object',
      properties: {
        product: {
          type: 'string',
          description: 'Product or service to create campaign for',
        },
        goal: {
          type: 'string',
          description: 'Campaign objective (e.g., "launch new hoodie line", "increase repeat orders by 20%", "Q2 revenue push")',
        },
        budget: {
          type: 'string',
          description: 'Optional budget range (e.g., "₹50K-₹1L", "low-budget", "₹5L+")',
        },
        constraints: {
          type: 'string',
          description: 'Optional constraints or requirements',
        },
      },
      required: ['product'],
    },
  },
];

// None of these tools require approval — they are read-only analysis tools
function isWriteTool() {
  return false;
}

module.exports = { toolDefinitions, isWriteTool };
