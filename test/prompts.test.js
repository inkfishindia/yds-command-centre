'use strict';

const { afterEach, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CONFIG_PATH = path.join(__dirname, '../server/config.js');
const PROMPTS_PATH = path.join(__dirname, '../server/services/prompts.js');

function stubConfig(skillsDir) {
  require.cache[CONFIG_PATH] = {
    id: CONFIG_PATH,
    filename: CONFIG_PATH,
    loaded: true,
    exports: {
      SKILLS_DIR: skillsDir,
      CLAUDE_MD: '',
      COLIN_MD: '',
      NOTION_HUB: '',
    },
    parent: null,
    children: [],
    paths: [],
  };
}

describe('Prompts Service', () => {
  afterEach(() => {
    delete require.cache[CONFIG_PATH];
    delete require.cache[PROMPTS_PATH];
  });

  it('returns an empty list when the skills directory is missing', () => {
    stubConfig(path.join(os.tmpdir(), `missing-skills-${Date.now()}`));
    const { listSkills } = require(PROMPTS_PATH);

    assert.deepEqual(listSkills(), []);
  });

  it('lists only skill directories that contain prompt.md', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-fixture-'));
    const briefDir = path.join(root, 'brief');
    const routeDir = path.join(root, 'route');
    fs.mkdirSync(briefDir, { recursive: true });
    fs.mkdirSync(routeDir, { recursive: true });
    fs.writeFileSync(path.join(briefDir, 'prompt.md'), '# brief');
    fs.writeFileSync(path.join(routeDir, 'README.md'), '# route');

    stubConfig(root);
    const { listSkills } = require(PROMPTS_PATH);

    assert.deepEqual(listSkills(), ['brief']);
  });
});
