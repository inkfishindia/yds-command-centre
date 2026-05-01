'use strict';
// reads/marketing-ops.js
// Purpose: All marketing operations read queries — campaigns, content calendar, sequences, sessions log,
//   campaign commitments, and the aggregated marketing ops summary.
// Public exports: getCampaigns, getContentCalendar, getContentCalendarByMonth, getUnscheduledContent,
//   resolveCampaignNames, getSequences, getSessionsLog, getMarketingOpsSummary, getCampaignCommitments
// DO NOT add: write operations (writes/marketing-ops.js), commitment or tech domain reads.
// Cross-domain: getCampaignCommitments calls getAllCommitments from reads/commitments.js.

const { getClient } = require('../client');
const { deduplicatedFetch } = require('../cache');
const { withRetry } = require('../retry');
const { simplify } = require('../simplify');
const { DB } = require('../databases');
const { getPageRaw } = require('../pages');

/**
 * Resolve campaign relation IDs to campaign names for an array of content items.
 * Fetches each unique campaign page once in parallel, then maps names back.
 * @param {Array} items - content items with optional Campaign property (array of IDs)
 * @returns {Promise<Array>} items with campaignName added
 */
async function resolveCampaignNames(items) {
  // Collect unique campaign IDs
  const uniqueIds = [...new Set(
    items.flatMap(item => (Array.isArray(item.Campaign) ? item.Campaign : []))
  )];

  // Fetch all unique campaign pages in parallel
  const pages = await Promise.all(uniqueIds.map(async (id) => {
    try {
      const page = await getPageRaw(id);
      const props = page ? simplify(page.properties) : null;
      return { id, name: props ? (props.Name || props.Title || 'Untitled') : null };
    } catch {
      return { id, name: null };
    }
  }));

  // Build lookup map
  const nameById = {};
  for (const { id, name } of pages) {
    nameById[id] = name;
  }

  // Map items with resolved campaignName
  return items.map(item => {
    const campaignIds = Array.isArray(item.Campaign) ? item.Campaign : [];
    const campaignName = campaignIds.length > 0 ? (nameById[campaignIds[0]] || null) : null;
    return { ...item, campaignName };
  });
}

/**
 * Fetch all marketing campaigns with resolved relations.
 */
async function getCampaigns() {
  return deduplicatedFetch('mktops_campaigns', async () => {
    const notion = getClient();
    const campaigns = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.CAMPAIGNS,
        page_size: 100,
        start_cursor: cursor,
      }));
      campaigns.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Resolve Owner, Focus Area, and Audience relations to names
    const resolved = await Promise.all(campaigns.map(async (campaign) => {
      const ownerIds = Array.isArray(campaign.Owner) ? campaign.Owner : [];
      const focusAreaIds = Array.isArray(campaign['Focus Area']) ? campaign['Focus Area'] : [];
      const audienceIds = Array.isArray(campaign.Audience) ? campaign.Audience : [];

      const allIds = [...new Set([...ownerIds, ...focusAreaIds, ...audienceIds])].slice(0, 30);
      const pageMap = {};
      await Promise.all(allIds.map(async (id) => {
        try {
          const page = await getPageRaw(id);
          if (page) {
            pageMap[id.replace(/-/g, '')] = page.properties.Name || page.properties.Title || page.properties.name || 'Untitled';
          }
        } catch { /* skip unresolvable */ }
      }));

      const ownerNames = ownerIds.map(id => pageMap[id.replace(/-/g, '')] || id.slice(0, 8));
      const focusAreaNames = focusAreaIds.map(id => pageMap[id.replace(/-/g, '')] || id.slice(0, 8));
      const audienceNames = audienceIds.map(id => pageMap[id.replace(/-/g, '')] || id.slice(0, 8));

      return { ...campaign, ownerNames, focusAreaNames, audienceNames };
    }));

    return resolved;
  }).catch(err => {
    console.error('Failed to fetch campaigns:', err.message);
    return [];
  });
}

/**
 * Fetch content calendar with resolved Campaign relation.
 */
async function getContentCalendar() {
  return deduplicatedFetch('mktops_content', async () => {
    const notion = getClient();
    const content = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.CONTENT_CALENDAR,
        page_size: 100,
        start_cursor: cursor,
      }));
      content.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return resolveCampaignNames(content);
  }).catch(err => {
    console.error('Failed to fetch content calendar:', err.message);
    return [];
  });
}

/**
 * Fetch content calendar filtered to a specific month range.
 * startDate and endDate are YYYY-MM-DD strings.
 */
async function getContentCalendarByMonth(startDate, endDate) {
  const month = startDate.slice(0, 7); // 'YYYY-MM'
  const cacheKey = `mktops_content_calendar_${month}`;
  return deduplicatedFetch(cacheKey, async () => {
    const notion = getClient();
    const content = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.CONTENT_CALENDAR,
        filter: {
          and: [
            { property: 'Publish Date', date: { on_or_after: startDate } },
            { property: 'Publish Date', date: { on_or_before: endDate } },
          ],
        },
        sorts: [{ property: 'Publish Date', direction: 'ascending' }],
        page_size: 100,
        start_cursor: cursor,
      }));
      content.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return resolveCampaignNames(content);
  }).catch(err => {
    console.error('Failed to fetch content calendar by month:', err.message);
    return [];
  });
}

/**
 * Fetch content calendar items that have no Publish Date set.
 */
async function getUnscheduledContent() {
  return deduplicatedFetch('mktops_content_unscheduled', async () => {
    const notion = getClient();
    const content = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.CONTENT_CALENDAR,
        filter: { property: 'Publish Date', date: { is_empty: true } },
        page_size: 100,
        start_cursor: cursor,
      }));
      content.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return resolveCampaignNames(content);
  }).catch(err => {
    console.error('Failed to fetch unscheduled content:', err.message);
    return [];
  });
}

/**
 * Fetch email/messaging sequences.
 * Open Rate, Click Rate, Unsub Rate come through simplify() as numbers.
 */
async function getSequences() {
  return deduplicatedFetch('mktops_sequences', async () => {
    const notion = getClient();
    const sequences = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.SEQUENCES,
        page_size: 100,
        start_cursor: cursor,
      }));
      sequences.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    return sequences;
  }).catch(err => {
    console.error('Failed to fetch sequences:', err.message);
    return [];
  });
}

/**
 * Fetch sessions log for the last N days with resolved Participants relation.
 */
async function getSessionsLog(days = 30) {
  return deduplicatedFetch('mktops_sessions_' + days, async () => {
    const notion = getClient();
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().split('T')[0];

    const sessions = [];
    let cursor;
    do {
      const response = await withRetry(() => notion.databases.query({
        database_id: DB.SESSIONS_LOG,
        filter: {
          property: 'Date',
          date: { on_or_after: sinceStr },
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 100,
        start_cursor: cursor,
      }));
      sessions.push(...response.results.map(page => ({
        id: page.id,
        url: page.url,
        ...simplify(page.properties),
      })));
      cursor = response.has_more ? response.next_cursor : null;
    } while (cursor);

    // Resolve Participants relation to participantNames
    const resolved = await Promise.all(sessions.map(async (session) => {
      const participantIds = Array.isArray(session.Participants) ? session.Participants : [];
      if (participantIds.length === 0) return { ...session, participantNames: [] };

      const names = await Promise.all(participantIds.slice(0, 10).map(async (id) => {
        try {
          const page = await getPageRaw(id);
          return page
            ? (page.properties.Name || page.properties.Title || page.properties.name || 'Untitled')
            : id.slice(0, 8);
        } catch {
          return id.slice(0, 8);
        }
      }));

      return { ...session, participantNames: names };
    }));

    return resolved;
  }).catch(err => {
    console.error('Failed to fetch sessions log:', err.message);
    return [];
  });
}

/**
 * Fetch commitments linked to a specific campaign via the Campaign relation.
 * Cross-domain: calls getAllCommitments from reads/commitments.js.
 */
async function getCampaignCommitments(campaignId) {
  // Lazy require to honour live require.cache state at invocation time
  const { getAllCommitments } = require('./commitments');
  const cacheKey = 'mktops_campaign_commitments_' + campaignId;
  return deduplicatedFetch(cacheKey, async () => {
    const allCommitments = await getAllCommitments();

    const linked = allCommitments.filter(c => {
      const campaignIds = Array.isArray(c.Campaign) ? c.Campaign : [];
      return campaignIds.includes(campaignId);
    });

    // Enrich with overdue status
    const now = new Date();
    return linked.map(c => {
      const dueDate = c['Due Date'];
      const dueStr = dueDate && typeof dueDate === 'object' ? dueDate.start : dueDate;
      const isOverdue = dueStr && new Date(dueStr) < now && c.Status !== 'Done' && c.Status !== 'Cancelled';
      return { ...c, isOverdue, dueStr };
    });
  }).catch(err => {
    console.error('Failed to get campaign commitments:', err.message);
    return [];
  });
}

/**
 * Aggregated Marketing Ops summary with stats.
 */
async function getMarketingOpsSummary() {
  return deduplicatedFetch('mktops_summary', async () => {
    const [campaigns, content, sequences, sessions] = await Promise.all([
      getCampaigns(),
      getContentCalendar(),
      getSequences(),
      getSessionsLog(7),
    ]);

    const activeCampaigns = campaigns.filter(c => c.Stage !== 'Complete').length;
    const contentInPipeline = content.filter(c => c.Status !== 'Published').length;
    const liveSequences = sequences.filter(s => s.Status === 'Live' || s.Status === 'Active').length;
    const sessionsThisWeek = sessions.length;
    const blockedCampaigns = campaigns.filter(c => c.Status === 'Blocked' || c.Status === 'Needs Dan');
    const needsReviewContent = content.filter(c => c.Status === 'Brand Review');
    const unhealthySequences = sequences.filter(s =>
      (typeof s['Open Rate'] === 'number' && s['Open Rate'] < 15) ||
      (typeof s['Unsub Rate'] === 'number' && s['Unsub Rate'] > 2)
    );

    return {
      campaigns,
      content,
      sequences,
      sessions,
      stats: {
        activeCampaigns,
        contentInPipeline,
        liveSequences,
        sessionsThisWeek,
        blockedCampaigns,
        needsReviewContent,
        unhealthySequences,
      },
    };
  }).catch(err => {
    console.error('Failed to fetch marketing ops summary:', err.message);
    return { campaigns: [], content: [], sequences: [], sessions: [], stats: {} };
  });
}

module.exports = {
  getCampaigns,
  getContentCalendar,
  getContentCalendarByMonth,
  getUnscheduledContent,
  resolveCampaignNames,
  getSequences,
  getSessionsLog,
  getMarketingOpsSummary,
  getCampaignCommitments,
};
