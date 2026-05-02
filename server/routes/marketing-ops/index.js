'use strict';

/**
 * index.js — Orchestrator for the marketing-ops route package.
 *
 * Mounts all marketing-ops route handlers onto a single Express router so that
 * router.stack contains directly-registered routes (required by tests that
 * inspect router.stack for route presence and handler access).
 *
 * Public exports: the Express router (consumed by the shim at ../marketing-ops.js)
 *
 * DO NOT add business logic here. Route registration only.
 * DO NOT use sub-router nesting (router.use('/path', subRouter)) — tests
 *   require direct route registration so l.route is truthy on every layer.
 *
 * Mount order matters for greedy Express matching:
 *   /content/calendar  BEFORE  /content
 *   /tasks/summary     BEFORE  /tasks
 *   /campaigns/:id/commitments  BEFORE  /campaigns/:id (PATCH)
 */

const express = require('express');
const router = express.Router();

const { getSummary, getMetrics } = require('./metrics');
const { getCampaigns, patchCampaign, getCampaignCommitments } = require('./campaigns');
const { getContentCalendar, getContent, postContent, patchContent } = require('./content');
const { getSequences } = require('./sequences');
const { getSessions } = require('./sessions');
const { getTasks, getTasksSummary } = require('./tasks');

// ── Root ──────────────────────────────────────────────────────────────────────
router.get('/', getSummary);

// ── Campaigns ─────────────────────────────────────────────────────────────────
router.get('/campaigns', getCampaigns);
router.get('/campaigns/:id/commitments', getCampaignCommitments); // specific before :id PATCH
router.patch('/campaigns/:id', patchCampaign);

// ── Content ───────────────────────────────────────────────────────────────────
router.get('/content/calendar', getContentCalendar); // specific before /content
router.get('/content', getContent);
router.post('/content', postContent);
router.patch('/content/:id', patchContent);

// ── Sequences ─────────────────────────────────────────────────────────────────
router.get('/sequences', getSequences);

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions', getSessions);

// ── Tasks ─────────────────────────────────────────────────────────────────────
router.get('/tasks/summary', getTasksSummary); // specific before /tasks
router.get('/tasks', getTasks);

// ── Metrics ───────────────────────────────────────────────────────────────────
router.get('/metrics', getMetrics);

module.exports = router;
