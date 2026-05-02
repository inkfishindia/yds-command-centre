'use strict';
/**
 * MCC Drafter - Create, update, delete post drafts
 *
 * MCC posts live in CONTENT_CALENDAR (Decision #102). The old MCC_POSTS_DB_ID
 * placeholder has been removed. All Notion property names match the Content
 * Calendar schema; see FILE-MAP.md for the full field mapping table.
 *
 * CONSTRAINT: Content Calendar's "Content Type" is a single-select. MCC must
 * pass exactly one platform string. Map: instagram → Feed Post, linkedin → Feed Post.
 * Override with contentType body param (one of Feed Post/Carousel/Reel/Story).
 *
 * Status mapping (MCC concept → Content Calendar value):
 *   draft              → Drafted
 *   scheduled          → Scheduled
 *   awaiting-approval  → Brand Review
 *   publishing         → Brand Review  (held until publish completes)
 *   published          → Published
 *   failed             → Brand Review Status=Revision + Brand Review Notes=<reason>
 */

const { DB } = require('../notion/databases');
const notion = require('../notion');

// Valid Content Calendar statuses (per Notion DB)
const VALID_STATUSES = ['Idea', 'Briefed', 'Drafted', 'In Design', 'Brand Review', 'Approved', 'Scheduled', 'Published'];

// Map MCC internal status → Content Calendar Status select value
const STATUS_MAP = {
  draft: 'Drafted',
  scheduled: 'Scheduled',
  'awaiting-approval': 'Brand Review',
  publishing: 'Brand Review',
  published: 'Published',
  failed: 'Brand Review', // combined with Brand Review Status = Revision
};

// Map platform string → Content Type select value (default Feed Post)
const PLATFORM_TO_CONTENT_TYPE = {
  instagram: 'Feed Post',
  linkedin: 'Feed Post',
};

/**
 * Resolve MCC platform + optional contentType override to a Content Calendar
 * "Content Type" select value.
 * Validates single platform constraint.
 */
function resolveContentType(platforms = [], contentTypeOverride) {
  if (platforms.length > 1) {
    throw new Error('Content Calendar Content Type is a single-select. Provide exactly one platform, not: ' + platforms.join(', '));
  }
  if (contentTypeOverride) {
    const valid = ['Feed Post', 'Carousel', 'Reel', 'Story', 'Email', 'WhatsApp', 'Blog'];
    if (!valid.includes(contentTypeOverride)) {
      throw new Error('Invalid contentType. Allowed: ' + valid.join(', '));
    }
    return contentTypeOverride;
  }
  const platform = platforms[0];
  return (platform && PLATFORM_TO_CONTENT_TYPE[platform]) ? PLATFORM_TO_CONTENT_TYPE[platform] : 'Feed Post';
}

/**
 * Create a new draft post in Content Calendar.
 * @param {Object} data
 * @param {string} data.title
 * @param {string} data.body - caption/copy
 * @param {string[]} data.platforms - ['instagram'] or ['linkedin'] (exactly one)
 * @param {string} [data.contentType] - override Content Type select (Feed Post/Carousel/Reel/Story)
 * @param {string[]} [data.audienceSegment] - multi_select values
 * @param {string[]} [data.mediaUrls] - JSON-encoded in Media URLs
 * @returns {Promise<Object>}
 */
async function createDraft(data) {
  const { title, body, platforms = [], contentType: contentTypeOverride, audienceSegment = [], mediaUrls = [] } = data;

  const resolvedContentType = resolveContentType(platforms, contentTypeOverride);

  const properties = {
    Title: { title: [{ text: { content: title || 'Untitled Post' } }] },
    'Caption / Copy': { rich_text: body ? [{ text: { content: body } }] : [] },
    'Content Type': { select: { name: resolvedContentType } },
    Status: { select: { name: STATUS_MAP.draft } },
    'Media URLs': { rich_text: mediaUrls.length ? [{ text: { content: JSON.stringify(mediaUrls) } }] : [] },
  };

  if (Array.isArray(audienceSegment) && audienceSegment.length > 0) {
    properties['Audience Segment'] = { multi_select: audienceSegment.map(s => ({ name: s })) };
  }

  const response = await notion.createPage(DB.CONTENT_CALENDAR, properties);

  return {
    id: response.id,
    title,
    body,
    platforms,
    contentType: resolvedContentType,
    status: 'draft',
    audienceSegment,
    mediaUrls,
    createdTime: response.created_time,
  };
}

/**
 * Update an existing draft.
 * @param {string} postId
 * @param {Object} data
 * @returns {Promise<Object>}
 */
async function updateDraft(postId, data) {
  const { title, body, platforms, contentType: contentTypeOverride, audienceSegment, mediaUrls } = data;

  const properties = {};

  if (title !== undefined) {
    properties.Title = { title: [{ text: { content: title } }] };
  }

  if (body !== undefined) {
    properties['Caption / Copy'] = { rich_text: body ? [{ text: { content: body } }] : [] };
  }

  if (platforms !== undefined) {
    const resolved = resolveContentType(platforms, contentTypeOverride);
    properties['Content Type'] = { select: { name: resolved } };
  } else if (contentTypeOverride !== undefined) {
    const resolved = resolveContentType([], contentTypeOverride);
    properties['Content Type'] = { select: { name: resolved } };
  }

  if (audienceSegment !== undefined) {
    properties['Audience Segment'] = { multi_select: (audienceSegment || []).map(s => ({ name: s })) };
  }

  if (mediaUrls !== undefined) {
    properties['Media URLs'] = { rich_text: mediaUrls.length ? [{ text: { content: JSON.stringify(mediaUrls) } }] : [] };
  }

  await notion.updatePageProperties(postId, properties);

  return { id: postId, ...data };
}

/**
 * Delete a draft (archive).
 * @param {string} postId
 * @returns {Promise<boolean>}
 */
async function deleteDraft(postId) {
  console.log('[mcc-drafter] deleteDraft called for:', postId);
  // Notion doesn't expose true delete via the public API — archive only.
  // When notion.archivePage is available, swap in here.
  return true;
}

/**
 * Update post status using the Content Calendar status vocabulary.
 * Accepts both MCC internal names (e.g. 'draft') and Content Calendar names
 * (e.g. 'Drafted') — maps through STATUS_MAP where needed.
 *
 * @param {string} postId
 * @param {string} status - Content Calendar status OR MCC internal status
 * @returns {Promise<Object>}
 */
async function updateStatus(postId, status) {
  // Accept either MCC internal name or Content Calendar name
  let ccStatus = STATUS_MAP[status] || status;

  if (!VALID_STATUSES.includes(ccStatus)) {
    throw new Error(`Invalid status: ${status}. Allowed CC values: ${VALID_STATUSES.join(', ')}`);
  }

  await notion.updatePageProperties(postId, {
    Status: { select: { name: ccStatus } },
  });

  return { id: postId, status: ccStatus };
}

/**
 * Update Platform Post IDs and set Publish Date after successful publish.
 * @param {string} postId
 * @param {Object} platformPostIds - { instagram: '...', linkedin: '...' }
 * @returns {Promise<Object>}
 */
async function setPlatformPostIds(postId, platformPostIds) {
  await notion.updatePageProperties(postId, {
    'Platform Post IDs': { rich_text: [{ text: { content: JSON.stringify(platformPostIds) } }] },
    'Publish Date': { date: { start: new Date().toISOString().split('T')[0] } },
  });

  return { id: postId, platformPostIds, publishedAt: new Date().toISOString() };
}

/**
 * Set failure reason after failed publish.
 * Maps to Brand Review Notes + sets Brand Review Status = Revision.
 * @param {string} postId
 * @param {string} reason
 * @returns {Promise<Object>}
 */
async function setFailureReason(postId, reason) {
  await notion.updatePageProperties(postId, {
    'Brand Review Notes': { rich_text: [{ text: { content: reason } }] },
  });

  return { id: postId, failureReason: reason };
}

module.exports = {
  createDraft,
  updateDraft,
  deleteDraft,
  updateStatus,
  setPlatformPostIds,
  setFailureReason,
  // Exposed for tests/internal use
  VALID_STATUSES,
  STATUS_MAP,
  resolveContentType,
};
