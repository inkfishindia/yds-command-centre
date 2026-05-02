'use strict';

/**
 * validators.js — Shared validation constants for the marketing-ops route package.
 *
 * Public exports: VALID_IG_PILLARS, VALID_HOOK_PATTERNS, VALID_PUBLISHED_SLOTS,
 *   VALID_CONTENT_SERIES, VALID_REPURPOSE_OPPORTUNITIES, VALID_SEASONAL_TAGS,
 *   VALID_CTAS, VALID_STATUSES, VALID_CONTENT_TYPES, VALID_CHANNELS,
 *   VALID_CONTENT_PILLARS, VALID_OWNERS
 *
 * DO NOT put route handlers, service calls, or Express logic here.
 * This file is pure data — consumed by content.js and campaigns.js.
 */

// IG-specific fields (NOTION-SETUP.md §3.1)
const VALID_IG_PILLARS = ['Permission', 'Napkin', 'In-the-Wild', 'Craft', 'Educational'];
const VALID_HOOK_PATTERNS = ['Permission', 'Reframe', 'Anti-claim', 'Tribe-name', 'Question'];
const VALID_PUBLISHED_SLOTS = [
  'Mon 1PM', 'Mon 8:30PM', 'Tue 1PM', 'Tue 8:30PM',
  'Wed 1PM', 'Wed 8:30PM', 'Fri 1PM', 'Fri 8:30PM',
  'Sat 11AM', 'Sat 8:30PM', 'Sun 8:30PM',
];

// Phase B MCC fields
const VALID_CONTENT_SERIES = [
  'Quality Monday',
  'Tutorial Tuesday',
  'Wisdom Wednesday',
  'Throwback Thursday',
  'Feature Friday',
  'Case Study Spotlight',
  'Behind the Brand',
  'Customer Stories',
];

const VALID_REPURPOSE_OPPORTUNITIES = [
  'Email Newsletter',
  'Blog Article',
  'Video Content',
  'Carousel Post',
  'Story Highlights',
  'Case Study',
  'Ad Creative',
  'Presentation Slide',
];

const VALID_SEASONAL_TAGS = [
  'New Year',
  "Valentine's Day",
  'Holi',
  'Summer Season',
  'Monsoon',
  'Diwali',
  'Christmas',
  'Corporate FY End',
  'Back to School',
  'Wedding Season',
];

const VALID_CTAS = [
  'Visit Website',
  'Request Quote',
  'Download Catalog',
  'Book Consultation',
  'Contact Sales',
  'Follow Account',
  'Share Content',
  'Watch Video',
  'Read More',
  'Shop Now',
];

// Shared content/campaign fields
const VALID_STATUSES = ['Idea', 'Briefed', 'Drafted', 'In Design', 'Brand Review', 'Approved', 'Scheduled', 'Published'];
const VALID_CONTENT_TYPES = ['Feed Post', 'Carousel', 'Reel', 'Story', 'Email', 'WhatsApp', 'Blog'];
const VALID_CHANNELS = ['Email', 'LinkedIn', 'Twitter', 'Instagram', 'Website'];
const VALID_CONTENT_PILLARS = ['Education', 'Social Proof', 'Product', 'Behind the Scenes', 'Community', 'Promotional'];
const VALID_OWNERS = ['Corey', 'Dickie', 'Jessica', 'Pixel', 'Studio', 'Harry', 'Bimal'];

module.exports = {
  VALID_IG_PILLARS,
  VALID_HOOK_PATTERNS,
  VALID_PUBLISHED_SLOTS,
  VALID_CONTENT_SERIES,
  VALID_REPURPOSE_OPPORTUNITIES,
  VALID_SEASONAL_TAGS,
  VALID_CTAS,
  VALID_STATUSES,
  VALID_CONTENT_TYPES,
  VALID_CHANNELS,
  VALID_CONTENT_PILLARS,
  VALID_OWNERS,
};
