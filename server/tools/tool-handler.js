const fs = require('fs');
const path = require('path');
const notionTools = require('./notion-tools');
const fileTools = require('./file-tools');
const storeTools = require('./store-tools');
const marketingTools = require('./marketing-tools');
const notionService = require('../services/notion');

/**
 * Get all tool definitions for the Claude API
 */
function getAllToolDefinitions() {
  return [
    ...notionTools.toolDefinitions,
    ...fileTools.toolDefinitions,
    ...storeTools.toolDefinitions,
    ...marketingTools.toolDefinitions,
  ];
}

/**
 * Check if a tool call requires user approval
 */
function requiresApproval(toolName) {
  return notionTools.isWriteTool(toolName) || fileTools.isWriteTool(toolName) || storeTools.isWriteTool(toolName) || marketingTools.isWriteTool(toolName);
}

/**
 * Execute a tool call and return the result
 */
async function executeTool(toolName, toolInput) {
  switch (toolName) {
    // --- Notion tools ---
    case 'notion_query_database':
      return await executeNotionQuery(toolInput);
    case 'notion_get_page':
      return await executeNotionGetPage(toolInput);
    case 'notion_create_page':
      return await executeNotionCreatePage(toolInput);
    case 'notion_update_page':
      return await executeNotionUpdatePage(toolInput);

    // --- File tools ---
    case 'read_file':
      return executeReadFile(toolInput);
    case 'write_file':
      return executeWriteFile(toolInput);
    case 'list_files':
      return executeListFiles(toolInput);

    // --- Store expert tools ---
    case 'store_expert_query':
      return await executeStoreQuery(toolInput);
    case 'store_expert_update':
      return await executeStoreUpdate(toolInput);

    // --- Marketing tools ---
    case 'customer_psychology_generator':
      return executeMarketingTool('customer_psychology_generator', toolInput);
    case 'competitor_analysis':
      return executeMarketingTool('competitor_analysis', toolInput);
    case 'content_strategy_generator':
      return executeMarketingTool('content_strategy_generator', toolInput);
    case 'campaign_ideator':
      return executeMarketingTool('campaign_ideator', toolInput);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// --- Notion implementations ---

async function executeNotionQuery({ database_id, filter, sorts, page_size }) {
  try {
    // Route through service for caching, dedup, and retry
    const result = await notionService.queryDatabase(database_id, {
      filter,
      sorts,
      pageSize: page_size || 50,
    });
    return { results: result.results, has_more: result.hasMore };
  } catch (err) {
    return { error: `Notion query failed: ${err.message}` };
  }
}

async function executeNotionGetPage({ page_id }) {
  try {
    // Route through service for caching and retry
    const page = await notionService.getPage(page_id);
    if (!page) return { error: 'Page not found' };
    return {
      id: page.id,
      url: page.url,
      properties: page.properties,
    };
  } catch (err) {
    return { error: `Notion get page failed: ${err.message}` };
  }
}

async function executeNotionCreatePage({ database_id, properties }) {
  try {
    const notion = notionService.getClient();
    const notionProps = buildNotionProperties(properties);
    const page = await notion.pages.create({
      parent: { database_id },
      properties: notionProps,
    });
    // Invalidate relevant caches after write
    notionService.invalidateCommitmentCaches();
    return {
      id: page.id,
      url: page.url,
      message: 'Page created successfully',
    };
  } catch (err) {
    return { error: `Notion create failed: ${err.message}` };
  }
}

async function executeNotionUpdatePage({ page_id, properties }) {
  try {
    const notion = notionService.getClient();
    const notionProps = buildNotionProperties(properties);
    const page = await notion.pages.update({
      page_id,
      properties: notionProps,
    });
    // Invalidate relevant caches after write
    notionService.invalidateCommitmentCaches();
    return {
      id: page.id,
      url: page.url,
      message: 'Page updated successfully',
    };
  } catch (err) {
    return { error: `Notion update failed: ${err.message}` };
  }
}

/**
 * Convert simplified property values back to Notion API format.
 * Handles the common patterns used in notion-hub.md.
 */
function buildNotionProperties(simpleProps) {
  const notionProps = {};
  for (const [key, value] of Object.entries(simpleProps)) {
    // Handle date format from notion-hub.md: "date:Field:start" and "date:Field:is_datetime"
    if (key.startsWith('date:')) {
      const parts = key.split(':');
      const fieldName = parts[1];
      const subField = parts[2]; // "start" or "is_datetime"
      if (!notionProps[fieldName]) {
        notionProps[fieldName] = { date: {} };
      }
      if (subField === 'start') {
        notionProps[fieldName].date.start = value;
      }
      // is_datetime is informational, Notion infers from format
      continue;
    }

    // Detect relation format: JSON array string of URLs
    if (typeof value === 'string' && value.startsWith('["https://www.notion.so/')) {
      try {
        const urls = JSON.parse(value);
        notionProps[key] = {
          relation: urls.map(url => ({ id: url.replace('https://www.notion.so/', '') })),
        };
      } catch {
        notionProps[key] = { rich_text: [{ text: { content: value } }] };
      }
      continue;
    }

    // Common property types by convention
    if (key === 'Name') {
      notionProps[key] = { title: [{ text: { content: value } }] };
    } else if (['Status', 'Priority', 'Type', 'Source', 'Owner'].includes(key)) {
      notionProps[key] = { select: { name: value } };
    } else {
      // Default to rich_text
      notionProps[key] = { rich_text: [{ text: { content: String(value) } }] };
    }
  }
  return notionProps;
}

// --- File implementations ---

function executeReadFile({ file_path }) {
  const resolved = fileTools.resolveWorkspacePath(file_path);
  if (!resolved) return { error: 'Path outside workspace boundary' };

  try {
    const content = fs.readFileSync(resolved, 'utf-8');
    return { content, path: file_path };
  } catch (err) {
    return { error: `File read failed: ${err.message}` };
  }
}

function executeWriteFile({ file_path, content }) {
  const resolved = fileTools.resolveWorkspacePath(file_path);
  if (!resolved) return { error: 'Path outside workspace boundary' };

  // Ensure parent directory exists
  const dir = path.dirname(resolved);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  try {
    fs.writeFileSync(resolved, content, 'utf-8');
    return { message: `File saved: ${file_path}`, path: file_path };
  } catch (err) {
    return { error: `File write failed: ${err.message}` };
  }
}

function executeListFiles({ directory }) {
  const resolved = fileTools.resolveWorkspacePath(directory);
  if (!resolved) return { error: 'Path outside workspace boundary' };

  try {
    if (!fs.existsSync(resolved)) {
      return { files: [], message: 'Directory does not exist' };
    }
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() && !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(directory, e.name),
      }))
      .sort((a, b) => b.name.localeCompare(a.name)); // Newest first (date-prefixed names)
    return { files };
  } catch (err) {
    return { error: `Directory listing failed: ${err.message}` };
  }
}

// --- Store expert implementations ---

async function executeStoreQuery({ query, category }) {
  const config = require('../config');
  const kbDir = path.join(config.COLIN_WORKSPACE, 'knowledge', 'store');

  if (!fs.existsSync(kbDir)) {
    return {
      result: 'No store knowledge base found yet. The owner can add knowledge using the store_expert_update tool.',
      files: [],
    };
  }

  const files = fs.readdirSync(kbDir).filter(f => f.endsWith('.md'));

  // If category specified, filter by prefix
  let relevantFiles = files;
  if (category) {
    const prefixMap = {
      products: 'kb_products_',
      pricing: 'kb_pricing_',
      policies: 'kb_policy_',
      delivery: 'kb_delivery_',
      faq: 'kb_faq_',
      hours: 'kb_hours',
      general: 'kb_',
    };
    const prefix = prefixMap[category] || 'kb_';
    relevantFiles = files.filter(f => f.startsWith(prefix));
  }

  if (relevantFiles.length === 0) {
    return {
      result: `No knowledge found${category ? ` for category "${category}"` : ''}. The store owner can add knowledge using store_expert_update.`,
      files: [],
    };
  }

  // Read all relevant files and concatenate
  const knowledge = relevantFiles.map(f => {
    const content = fs.readFileSync(path.join(kbDir, f), 'utf-8');
    const key = f.replace('.md', '');
    return `## ${key}\n${content}`;
  }).join('\n\n---\n\n');

  return {
    result: `Found ${relevantFiles.length} knowledge file(s). Use this information to answer the query: "${query}"\n\n${knowledge}`,
    files: relevantFiles,
  };
}

async function executeStoreUpdate({ key, content }) {
  const config = require('../config');

  // Validate key format
  if (!key.startsWith('kb_')) {
    return { error: 'Key must start with "kb_" (e.g., kb_products_tshirts, kb_policy_returns)' };
  }
  if (key.includes('..') || key.includes('/') || key.includes('\\') || key.includes('\0')) {
    return { error: 'Invalid key — must not contain path separators or null bytes' };
  }

  const kbDir = path.join(config.COLIN_WORKSPACE, 'knowledge', 'store');

  // Create directory if needed
  fs.mkdirSync(kbDir, { recursive: true });

  const filePath = path.join(kbDir, `${key}.md`);
  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    success: true,
    message: `Knowledge saved to ${key}.md`,
    path: filePath,
  };
}

// --- Marketing tool implementations ---

function executeMarketingTool(toolName, input) {
  // These tools work by returning structured context that enhances Claude's response.
  // No external API calls — Claude uses its own knowledge with structured prompting.
  const prompts = {
    customer_psychology_generator: {
      instruction: `Generate a comprehensive customer psychology profile for the segment: "${input.segment}".${input.context ? ` Additional context: ${input.context}` : ''}

Structure your analysis as:
1. **Core Motivations** — What drives this segment? What are their aspirations?
2. **Key Fears & Objections** — What holds them back from purchasing? What concerns do they have?
3. **Decision Triggers** — What specific factors tip them toward buying?
4. **Behavioral Patterns** — How do they research, compare, and decide?
5. **Messaging Angles** — 3-5 specific messaging hooks that would resonate
6. **Content Themes** — Topics and formats this segment engages with
7. **Psychological Job-to-be-Done** — The deeper emotional need being fulfilled

Apply this specifically to YourDesignStore.in's custom merchandise & apparel context (custom t-shirts, hoodies, caps, corporate gifting, screen print, vinyl, embroidery, DTG).`,
    },
    competitor_analysis: {
      instruction: `Analyze the competitor: "${input.competitor}" in the custom merchandise / print-on-demand space.${input.focus ? ` Focus specifically on: ${input.focus}` : ''}

Structure your analysis as:
1. **Positioning** — How do they position themselves? What's their value proposition?
2. **Strengths** — What do they do well? Where do they have advantages?
3. **Weaknesses** — Where are they vulnerable? What do customers complain about?
4. **Pricing Strategy** — How does their pricing compare to YDS?
5. **Product Range** — What do they offer that YDS doesn't, and vice versa?
6. **Marketing Approach** — How do they acquire and retain customers?
7. **Opportunity Gaps** — Where can YDS differentiate or win?
8. **Recommended Counter-Positioning** — Specific actions YDS should take

Compare against YourDesignStore.in (custom merch, Bangalore-based, screen print/vinyl/embroidery/DTG, B2B + D2C).`,
    },
    content_strategy_generator: {
      instruction: `Generate a content strategy for: "${input.topic}"${input.audience ? ` targeting: ${input.audience}` : ''}${input.goal ? ` with goal: ${input.goal}` : ''}${input.channels ? ` on channels: ${input.channels}` : ''}

Structure your strategy as:
1. **Content Pillars** — 3-5 core themes to build content around
2. **Format Mix** — Recommended content formats with rationale (reels, carousels, blogs, emails, etc.)
3. **Channel Strategy** — Where to publish and why, with posting frequency
4. **2-Week Sample Calendar** — Day-by-day content plan with specific post ideas
5. **Engagement Hooks** — Specific CTAs, questions, and interaction prompts
6. **Measurement** — KPIs to track, benchmarks to target
7. **Content Repurposing** — How to maximize each piece across channels

Apply to YourDesignStore.in's context (custom merchandise, B2B corporate gifting, D2C custom apparel, Bangalore market).`,
    },
    campaign_ideator: {
      instruction: `Generate 3-5 creative campaign ideas for: "${input.product}"${input.goal ? ` with goal: ${input.goal}` : ''}${input.budget ? ` within budget: ${input.budget}` : ''}${input.constraints ? ` with constraints: ${input.constraints}` : ''}

For each campaign concept, provide:
1. **Campaign Name** — Catchy, memorable name
2. **The Hook** — Core creative concept in one sentence
3. **Key Messaging** — 2-3 headline options and core value proposition
4. **Target Audience** — Specific segment this campaign speaks to
5. **Channels** — Where to run it (social, email, WhatsApp, offline, etc.)
6. **Timeline** — Suggested duration and key milestones
7. **Budget Estimate** — Rough budget range in INR
8. **Expected Outcomes** — Realistic KPI targets
9. **Quick Win** — One thing Dan can do THIS WEEK to test the concept

Apply to YourDesignStore.in's context. Think Bangalore market, custom merch, corporate gifting, D2C custom apparel.`,
    },
  };

  const prompt = prompts[toolName];
  if (!prompt) {
    return { error: `Unknown marketing tool: ${toolName}` };
  }

  return { result: prompt.instruction };
}

module.exports = { getAllToolDefinitions, requiresApproval, executeTool };
