'use strict';

const toolDefinitions = [
  {
    name: 'store_expert_query',
    description: 'Query the YourDesignStore.in knowledge base. Answers customer questions about products (t-shirts, hoodies, caps, tote bags, jackets, mugs), pricing, printing options (screen print, vinyl, embroidery, DTG), policies, delivery, returns, business hours, and FAQs. Reads from stored knowledge files organized by category.',
    input_schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The customer question or topic to look up',
        },
        category: {
          type: 'string',
          description: 'Optional category to narrow the search',
          enum: ['products', 'pricing', 'policies', 'delivery', 'faq', 'hours', 'general'],
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'store_expert_update',
    description: 'Update the YourDesignStore.in knowledge base. Saves product information, pricing, policies, delivery details, FAQs, or business hours. Use descriptive keys like kb_products_tshirts, kb_policy_returns, kb_delivery_info, kb_hours, kb_faq_sizing, kb_pricing_bulk.',
    input_schema: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          description: 'Knowledge base key (e.g., kb_products_tshirts, kb_policy_returns, kb_pricing_bulk)',
        },
        content: {
          type: 'string',
          description: 'The knowledge content to save as markdown',
        },
      },
      required: ['key', 'content'],
    },
  },
];

const WRITE_TOOLS = new Set(['store_expert_update']);

function isWriteTool(toolName) {
  return WRITE_TOOLS.has(toolName);
}

module.exports = { toolDefinitions, isWriteTool };
