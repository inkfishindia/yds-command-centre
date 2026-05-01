'use strict';
// client.js — Lazy Notion SDK initialisation.
// Public exports: getClient()
// DO NOT add: cache logic, retry logic, any Notion API calls.
// Module-private notionClient variable — singleton, created on first getClient() call.
// No external deps other than config and @notionhq/client.

const config = require('../../config');

let notionClient = null;

function getClient() {
  if (!notionClient) {
    const { Client } = require('@notionhq/client');
    notionClient = new Client({ auth: config.NOTION_TOKEN });
  }
  return notionClient;
}

module.exports = { getClient };
