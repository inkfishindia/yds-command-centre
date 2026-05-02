'use strict';
// marketing-ig.js — Routes for IG playbook read API. Phase B (2026-05-02).
// Mount point: /api/marketing-ops/ig (registered in server.js)
// Kept as a separate file — marketing-ops.js is at 312 lines (over 250 soft cap).
// Read-only this phase. No approval gate, no SSE.

const express = require('express');
const router = express.Router();
const igService = require('../services/marketing-ig-service');

// Validation constants — exact strings from NOTION-SETUP.md §4 + §3.1
const VALID_VERDICTS = ['Approved', 'Revision', 'Killed'];
const VALID_HOOK_STATUSES = ['Active', 'Testing', 'Retired'];
const VALID_TEMPLATE_STATUSES = ['Active', 'WIP', 'Retired'];
const VALID_TEMPLATE_TYPES = ['Carousel', 'Reel', 'Single', 'Story'];
const VALID_IG_PILLARS = ['Permission', 'Napkin', 'In-the-Wild', 'Craft', 'Educational'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_ID_RE = /^[a-f0-9]{32}$|^[a-f0-9-]{36}$/;

// ─── IG Performance ───────────────────────────────────────────────────────────

// GET /api/marketing-ops/ig/performance?weekStart=&weekEnd=&adCandidate=&graduatedToAds=
router.get('/performance', async (req, res) => {
  const { weekStart, weekEnd, adCandidate, graduatedToAds } = req.query;

  if (weekStart && !DATE_RE.test(weekStart)) {
    return res.status(400).json({ error: 'weekStart must be YYYY-MM-DD' });
  }
  if (weekEnd && !DATE_RE.test(weekEnd)) {
    return res.status(400).json({ error: 'weekEnd must be YYYY-MM-DD' });
  }
  if (adCandidate !== undefined && !['true', 'false'].includes(adCandidate)) {
    return res.status(400).json({ error: 'adCandidate must be true or false' });
  }
  if (graduatedToAds !== undefined && !['true', 'false'].includes(graduatedToAds)) {
    return res.status(400).json({ error: 'graduatedToAds must be true or false' });
  }

  try {
    const result = await igService.getIgPerformance({
      weekStart: weekStart || undefined,
      weekEnd: weekEnd || undefined,
      adCandidate: adCandidate !== undefined ? adCandidate === 'true' : undefined,
      graduatedToAds: graduatedToAds !== undefined ? graduatedToAds === 'true' : undefined,
    });
    res.json(result);
  } catch (err) {
    console.error('IG Performance error:', err);
    res.status(500).json({ error: 'Failed to load IG Performance data' });
  }
});

// GET /api/marketing-ops/ig/performance/this-week — convenience: current ISO week
router.get('/performance/this-week', async (req, res) => {
  try {
    res.json(await igService.getIgPerformanceThisWeek());
  } catch (err) {
    console.error('IG Performance this-week error:', err);
    res.status(500).json({ error: 'Failed to load this week\'s IG Performance data' });
  }
});

// GET /api/marketing-ops/ig/performance/ad-candidates — adCandidate=true && graduatedToAds=false
router.get('/performance/ad-candidates', async (req, res) => {
  try {
    res.json(await igService.getIgAdCandidates());
  } catch (err) {
    console.error('IG ad candidates error:', err);
    res.status(500).json({ error: 'Failed to load IG ad candidates' });
  }
});

// ─── Hook Pattern Log ─────────────────────────────────────────────────────────

// GET /api/marketing-ops/ig/hooks?status=Active
router.get('/hooks', async (req, res) => {
  const { status } = req.query;
  if (status && !VALID_HOOK_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_HOOK_STATUSES.join(', ')}` });
  }
  try {
    res.json(await igService.getHookPatternLog({ status }));
  } catch (err) {
    console.error('Hook Pattern Log error:', err);
    res.status(500).json({ error: 'Failed to load Hook Pattern Log' });
  }
});

// ─── Template Library ─────────────────────────────────────────────────────────

// GET /api/marketing-ops/ig/templates?status=Active&pillar=Permission&templateType=Carousel
router.get('/templates', async (req, res) => {
  const { status, pillar, templateType } = req.query;

  if (status && !VALID_TEMPLATE_STATUSES.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Allowed: ${VALID_TEMPLATE_STATUSES.join(', ')}` });
  }
  if (templateType && !VALID_TEMPLATE_TYPES.includes(templateType)) {
    return res.status(400).json({ error: `Invalid templateType. Allowed: ${VALID_TEMPLATE_TYPES.join(', ')}` });
  }
  if (pillar && !VALID_IG_PILLARS.includes(pillar)) {
    return res.status(400).json({ error: `Invalid pillar. Allowed: ${VALID_IG_PILLARS.join(', ')}` });
  }

  try {
    res.json(await igService.getTemplateLibrary({ status, templateType, pillar }));
  } catch (err) {
    console.error('Template Library error:', err);
    res.status(500).json({ error: 'Failed to load Template Library' });
  }
});

// ─── Approvals Log ────────────────────────────────────────────────────────────

// GET /api/marketing-ops/ig/approvals?verdict=&revisionRound=&contentCalendarId=
router.get('/approvals', async (req, res) => {
  const { verdict, revisionRound, contentCalendarId } = req.query;

  if (verdict && !VALID_VERDICTS.includes(verdict)) {
    return res.status(400).json({ error: `Invalid verdict. Allowed: ${VALID_VERDICTS.join(', ')}` });
  }
  if (revisionRound !== undefined) {
    const rr = Number(revisionRound);
    if (!Number.isInteger(rr) || rr < 1) {
      return res.status(400).json({ error: 'revisionRound must be a positive integer' });
    }
  }
  if (contentCalendarId && !PAGE_ID_RE.test(contentCalendarId)) {
    return res.status(400).json({ error: 'Invalid contentCalendarId format' });
  }

  try {
    res.json(await igService.getApprovalsLog({
      verdict: verdict || undefined,
      revisionRound: revisionRound !== undefined ? Number(revisionRound) : undefined,
      contentCalendarId: contentCalendarId || undefined,
    }));
  } catch (err) {
    console.error('Approvals Log error:', err);
    res.status(500).json({ error: 'Failed to load Approvals Log' });
  }
});

// GET /api/marketing-ops/ig/approvals/kill-rule-triggers — Revision at round 2
router.get('/approvals/kill-rule-triggers', async (req, res) => {
  try {
    res.json(await igService.getKillRuleTriggers());
  } catch (err) {
    console.error('Kill rule triggers error:', err);
    res.status(500).json({ error: 'Failed to load kill rule triggers' });
  }
});

// ─── Weekly Ops Log ───────────────────────────────────────────────────────────

// GET /api/marketing-ops/ig/weekly-ops?limit=4
router.get('/weekly-ops', async (req, res) => {
  const limit = req.query.limit !== undefined ? Number(req.query.limit) : 4;
  if (!Number.isInteger(limit) || limit < 1 || limit > 52) {
    return res.status(400).json({ error: 'limit must be an integer between 1 and 52' });
  }
  try {
    res.json(await igService.getWeeklyOpsLog({ limit }));
  } catch (err) {
    console.error('Weekly Ops Log error:', err);
    res.status(500).json({ error: 'Failed to load Weekly Ops Log' });
  }
});

// GET /api/marketing-ops/ig/weekly-ops/latest — most recent row
router.get('/weekly-ops/latest', async (req, res) => {
  try {
    res.json(await igService.getLatestWeeklyOps());
  } catch (err) {
    console.error('Weekly Ops Log latest error:', err);
    res.status(500).json({ error: 'Failed to load latest Weekly Ops entry' });
  }
});

module.exports = router;
