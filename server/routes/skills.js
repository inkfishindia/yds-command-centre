const express = require('express');
const router = express.Router();
const { listSkills } = require('../services/prompts');

const SKILL_META = {
  brief: {
    label: 'Brief',
    description: 'Create a team brief, meeting prep, or mission brief',
    icon: 'B',
    defaultMessage: 'Create a brief',
  },
  decide: {
    label: 'Decide',
    description: 'Document a decision with rationale, alternatives, and risks',
    icon: 'D',
    defaultMessage: 'Document a decision',
  },
  dump: {
    label: 'Dump',
    description: 'Process unstructured input — classify, route, and confirm',
    icon: 'P',
    defaultMessage: 'Process this input',
  },
  health: {
    label: 'Health',
    description: 'Run a focus area health check across all 13 areas',
    icon: 'H',
    defaultMessage: 'Run a focus area health check',
  },
  review: {
    label: 'Review',
    description: 'Prepare the weekly review for Monday sync with Arun',
    icon: 'R',
    defaultMessage: 'Prepare the weekly review',
  },
  route: {
    label: 'Route',
    description: 'Route a question or task to the right person, system, or expert',
    icon: 'T',
    defaultMessage: 'Route this to the right place',
  },
};

/**
 * GET /api/skills
 * List available skills with metadata.
 */
router.get('/', (req, res) => {
  const available = listSkills();
  const skills = available.map(name => ({
    name,
    ...SKILL_META[name] || { label: name, description: '', icon: name[0].toUpperCase(), defaultMessage: `Run /${name}` },
  }));
  res.json({ skills });
});

module.exports = router;
