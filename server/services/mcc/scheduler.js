'use strict';
/**
 * MCC Scheduler - Move drafts to scheduled status
 * 
 * Handles date validation and conflict checking.
 * All status changes go through approval gate.
 */

const drafter = require('./drafter');

/**
 * Schedule a draft for future publishing
 * @param {string} postId - Notion page ID
 * @param {string} scheduledFor - ISO date string
 * @returns {Promise<Object>} Updated post
 */
async function schedulePost(postId, scheduledFor) {
  // Validate date
  const scheduleDate = new Date(scheduledFor);
  const now = new Date();
  
  if (scheduleDate <= now) {
    throw new Error('Scheduled time must be in the future');
  }
  
  // Check if date is reasonable (not more than 1 year out)
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  if (scheduleDate > oneYearFromNow) {
    throw new Error('Cannot schedule more than 1 year in advance');
  }
  
  // Update scheduled date in Notion
  const notion = require('../notion');
  await notion.updatePageProperties(postId, {
    'Scheduled For': { date: { start: scheduledFor, end: null } },
  });
  
  // Update status to scheduled
  await drafter.updateStatus(postId, 'scheduled');
  
  return {
    id: postId,
    status: 'scheduled',
    scheduledFor: scheduledFor,
  };
}

/**
 * Unschedule a post (move back to draft)
 * @param {string} postId - Notion page ID
 * @returns {Promise<Object>} Updated post
 */
async function unschedulePost(postId) {
  // Clear scheduled date
  const notion = require('../notion');
  await notion.updatePageProperties(postId, {
    'Scheduled For': { date: null },
  });
  
  // Move back to draft
  await drafter.updateStatus(postId, 'draft');
  
  return {
    id: postId,
    status: 'draft',
    scheduledFor: null,
  };
}

/**
 * Check for scheduling conflicts
 * @param {string} scheduledFor - ISO date string
 * @param {string} [excludePostId] - Post ID to exclude from check
 * @returns {Promise<Array>} Array of conflicting posts
 */
async function checkConflicts(scheduledFor, excludePostId = null) {
  const readModel = require('./read-model');
  const posts = await readModel.listPosts({ status: 'scheduled', limit: 50 });
  
  const scheduleTime = new Date(scheduledFor).getTime();
  const conflictWindow = 15 * 60 * 1000; // 15 minutes
  
  const conflicts = posts.filter(post => {
    if (excludePostId && post.id === excludePostId) return false;
    if (!post.scheduledFor) return false;
    
    const postTime = new Date(post.scheduledFor).getTime();
    return Math.abs(postTime - scheduleTime) < conflictWindow;
  });
  
  return conflicts;
}

/**
 * Reschedule a post to a new time
 * @param {string} postId - Notion page ID
 * @param {string} newScheduledFor - New ISO date string
 * @returns {Promise<Object>} Updated post
 */
async function reschedulePost(postId, newScheduledFor) {
  // Validate new date
  const scheduleDate = new Date(newScheduledFor);
  const now = new Date();
  
  if (scheduleDate <= now) {
    throw new Error('Scheduled time must be in the future');
  }
  
  // Check for conflicts
  const conflicts = await checkConflicts(newScheduledFor, postId);
  if (conflicts.length > 0) {
    throw new Error(`Scheduling conflict with ${conflicts.length} other post(s)`);
  }
  
  // Update the scheduled time
  const notion = require('../notion');
  await notion.updatePageProperties(postId, {
    'Scheduled For': { date: { start: newScheduledFor, end: null } },
  });
  
  return {
    id: postId,
    status: 'scheduled',
    scheduledFor: newScheduledFor,
  };
}

module.exports = {
  schedulePost,
  unschedulePost,
  checkConflicts,
  reschedulePost,
};