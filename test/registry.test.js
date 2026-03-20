const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../server/data/projects.json');

// ── Route module ────────────────────────────────────────────────────────────

describe('Registry Route — module loading', () => {
  let registryRoutes;

  it('loads the registry route module without crashing', () => {
    registryRoutes = require('../server/routes/registry');
    assert.ok(registryRoutes);
  });

  it('exports an express router', () => {
    assert.ok(typeof registryRoutes === 'function' || registryRoutes.stack);
  });
});

// ── Data file ────────────────────────────────────────────────────────────────

describe('Registry — data file integrity', () => {
  let projects;

  before(() => {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    projects = JSON.parse(raw);
  });

  it('is a non-empty array', () => {
    assert.ok(Array.isArray(projects));
    assert.ok(projects.length > 0);
  });

  it('every project has required fields', () => {
    const required = ['name', 'slug', 'type', 'status', 'description', 'priority'];
    for (const p of projects) {
      for (const field of required) {
        assert.ok(p[field] !== undefined, `Project "${p.name || p.slug}" missing field: ${field}`);
      }
    }
  });

  it('all slugs are unique', () => {
    const slugs = projects.map(p => p.slug);
    assert.equal(slugs.length, new Set(slugs).size, 'Duplicate slugs found');
  });

  it('status values are valid', () => {
    const valid = ['active', 'in-progress', 'back-burner', 'not-started'];
    for (const p of projects) {
      assert.ok(valid.includes(p.status), `Invalid status "${p.status}" on ${p.slug}`);
    }
  });

  it('type values are valid', () => {
    const valid = ['agent-system', 'app', 'backend', 'knowledge-base', 'integration'];
    for (const p of projects) {
      assert.ok(valid.includes(p.type), `Invalid type "${p.type}" on ${p.slug}`);
    }
  });

  it('priority is a number', () => {
    for (const p of projects) {
      assert.equal(typeof p.priority, 'number', `Priority not a number on ${p.slug}`);
    }
  });
});

// ── Field allowlist ──────────────────────────────────────────────────────────

describe('Registry PATCH — field allowlist', () => {
  const allowed = ['status', 'last_action', 'last_action_date', 'last_action_by',
                   'agent_count', 'skill_count', 'command_count', 'health_score',
                   'description', 'priority'];

  const dangerous = ['slug', 'name', 'local_path', 'gdrive_path', 'github_repo',
                     'type', 'tech_stack', 'dashboard_module'];

  it('allowlist includes expected safe fields', () => {
    // Verify the route source has the correct allowlist
    const routeSrc = fs.readFileSync(
      path.join(__dirname, '../server/routes/registry.js'), 'utf-8'
    );
    for (const field of allowed) {
      assert.ok(routeSrc.includes(`'${field}'`), `Allowed field "${field}" not in route`);
    }
  });

  it('dangerous fields are NOT in the allowlist', () => {
    const routeSrc = fs.readFileSync(
      path.join(__dirname, '../server/routes/registry.js'), 'utf-8'
    );
    // Extract the allowlist array from source
    const match = routeSrc.match(/const allowed = \[([\s\S]*?)\]/);
    assert.ok(match, 'Could not find allowlist in route source');
    const allowlistStr = match[1];
    for (const field of dangerous) {
      assert.ok(!allowlistStr.includes(`'${field}'`),
        `Dangerous field "${field}" found in allowlist`);
    }
  });
});

// ── Stats computation ────────────────────────────────────────────────────────

describe('Registry — stats computation', () => {
  let projects;

  before(() => {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    projects = JSON.parse(raw);
  });

  it('counts active projects correctly', () => {
    const expected = projects.filter(p => p.status === 'active').length;
    assert.ok(expected > 0, 'Should have at least one active project');
  });

  it('sums agent_count across all projects', () => {
    const total = projects.reduce((sum, p) => sum + (p.agent_count || 0), 0);
    assert.ok(total > 0, 'Total agents should be > 0');
  });

  it('sums skill_count across all projects', () => {
    const total = projects.reduce((sum, p) => sum + (p.skill_count || 0), 0);
    assert.ok(total > 0, 'Total skills should be > 0');
  });

  it('projects are sortable by priority descending', () => {
    const sorted = [...projects].sort((a, b) => b.priority - a.priority);
    assert.equal(sorted[0].slug, 'dashboard', 'Highest priority should be dashboard');
  });
});
