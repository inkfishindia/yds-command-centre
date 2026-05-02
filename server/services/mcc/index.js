'use strict';
/**
 * MCC Service - Public Exports
 * 
 * Marketing Content Center domain service.
 * Provides CRUD, scheduling, and publishing for social posts.
 */

const readModel = require('./read-model');
const drafter = require('./drafter');
const scheduler = require('./scheduler');
const publisher = require('./publisher');

module.exports = {
  // Read model
  listPosts: readModel.listPosts,
  getPost: readModel.getPost,
  getPostsByStatus: readModel.getPostsByStatus,
  getDuePosts: readModel.getDuePosts,
  getStatusCounts: readModel.getStatusCounts,
  
  // Draft operations
  createDraft: drafter.createDraft,
  updateDraft: drafter.updateDraft,
  deleteDraft: drafter.deleteDraft,
  updateStatus: drafter.updateStatus,
  
  // Scheduling
  schedulePost: scheduler.schedulePost,
  unschedulePost: scheduler.unschedulePost,
  checkConflicts: scheduler.checkConflicts,
  reschedulePost: scheduler.reschedulePost,
  
  // Publishing
  requestPublishApproval: publisher.requestPublishApproval,
  publish: publisher.publish,
  publishNow: publisher.publishNow,
  runSchedulerTick: publisher.runSchedulerTick,
  getToken: publisher.getToken,
  storeToken: publisher.storeToken,
};