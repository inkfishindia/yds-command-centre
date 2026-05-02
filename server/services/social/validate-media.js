'use strict';
/**
 * Media Validation - Pure Function
 * Validates media against platform-specific constraints.
 * Does NOT check URL accessibility - just validates metadata.
 * 
 * @param {string} platform - 'instagram' or 'linkedin'
 * @param {Object} mediaMeta - Media metadata
 * @param {string} [mediaMeta.url] - Media URL
 * @param {string} [mediaMeta.type] - 'image' or 'video'
 * @param {number} [mediaMeta.width] - Image/video width
 * @param {number} [mediaMeta.height] - Image/video height
 * @param {number} [mediaMeta.durationSeconds] - Video duration
 * @param {number} [mediaMeta.sizeMB] - File size in MB
 * @param {string} [mediaMeta.format] - File extension (jpg, png, mp4, etc.)
 * @param {Object} options - Validation options
 * @param {string} [options.caption] - Post caption for length validation
 * @returns {{ ok: boolean, errors: string[] }}
 */
const constraints = require('./media-constraints.json');

function validateMedia(platform, mediaMeta, options = {}) {
  const errors = [];
  const platformConstraints = constraints[platform];
  
  if (!platformConstraints) {
    return { ok: false, errors: [`Unknown platform: ${platform}`] };
  }
  
  // Validate caption length if provided
  if (options.caption) {
    const captionConstraints = platformConstraints.caption;
    if (options.caption.length > captionConstraints.maxLength) {
      errors.push(`Caption exceeds ${captionConstraints.maxLength} characters (got ${options.caption.length})`);
    }
    if (options.caption.length < captionConstraints.minLength) {
      errors.push(`Caption must be at least ${captionConstraints.minLength} characters`);
    }
  }
  
  // Validate hashtags count
  if (options.caption) {
    const hashtagMatches = options.caption.match(/#\w+/g) || [];
    const hashtagLimit = platformConstraints.hashtags.maxCount;
    if (hashtagMatches.length > hashtagLimit) {
      errors.push(`Too many hashtags: ${hashtagMatches.length} (max ${hashtagLimit})`);
    }
  }
  
  // If no media provided, just return caption validation result
  if (!mediaMeta || !mediaMeta.url) {
    return { ok: errors.length === 0, errors };
  }
  
  const type = mediaMeta.type || 'image';
  const mediaConstraints = platformConstraints.media[type];
  
  if (!mediaConstraints) {
    errors.push(`Unsupported media type for ${platform}: ${type}`);
    return { ok: false, errors };
  }
  
  // Validate format
  if (mediaMeta.format) {
    const format = mediaMeta.format.toLowerCase().replace('.', '');
    if (!mediaConstraints.formats.includes(format)) {
      errors.push(`Unsupported format: ${format}. Allowed: ${mediaConstraints.formats.join(', ')}`);
    }
  }
  
  // Validate file size
  if (mediaMeta.sizeMB !== undefined) {
    if (mediaMeta.sizeMB > mediaConstraints.maxFileSizeMB) {
      errors.push(`File too large: ${mediaMeta.sizeMB}MB (max ${mediaConstraints.maxFileSizeMB}MB for ${type})`);
    }
  }
  
  // Validate video duration
  if (type === 'video' && mediaMeta.durationSeconds !== undefined) {
    if (mediaMeta.durationSeconds > mediaConstraints.maxDurationSeconds) {
      errors.push(`Video too long: ${mediaMeta.durationSeconds}s (max ${mediaConstraints.maxDurationSeconds}s)`);
    }
  }
  
  // Validate aspect ratio for images/videos with dimensions
  if (mediaMeta.width && mediaMeta.height) {
    const aspectRatio = mediaMeta.width / mediaMeta.height;
    const minRatio = mediaConstraints.minAspectRatio;
    const maxRatio = mediaConstraints.maxAspectRatio;
    
    if (aspectRatio < minRatio || aspectRatio > maxRatio) {
      errors.push(`Invalid aspect ratio: ${aspectRatio.toFixed(2)} (allowed: ${minRatio}-${maxRatio})`);
    }
  }
  
  return { ok: errors.length === 0, errors };
}

/**
 * Validate multiple media items
 * @param {string} platform 
 * @param {Array} mediaItems 
 * @param {Object} options 
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateMediaBatch(platform, mediaItems = [], options = {}) {
  const allErrors = [];
  
  // First validate caption
  const captionResult = validateMedia(platform, null, options);
  if (!captionResult.ok) {
    allErrors.push(...captionResult.errors);
  }
  
  // Then validate each media item
  const platformConstraints = constraints[platform];
  if (!platformConstraints) {
    return { ok: false, errors: [`Unknown platform: ${platform}`] };
  }
  
  const maxCount = platformConstraints.media.image.maxCount || platformConstraints.media.video.maxCount;
  if (mediaItems.length > maxCount) {
    allErrors.push(`Too many media items: ${mediaItems.length} (max ${maxCount})`);
  }
  
  for (let i = 0; i < mediaItems.length; i++) {
    const result = validateMedia(platform, mediaItems[i], options);
    if (!result.ok) {
      result.errors.forEach(e => allErrors.push(`Media ${i + 1}: ${e}`));
    }
  }
  
  return { ok: allErrors.length === 0, errors: allErrors };
}

module.exports = { validateMedia, validateMediaBatch };