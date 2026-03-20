/**
 * Notion API Service — from The-Design-Lab---TPL-X-YDS
 * Search, read pages, query databases, list databases
 * NOTE: Our Command Centre already has server/services/notion.js — use this as comparison
 */

import type { NotionPage, NotionTableData } from '../types';

const NOTION_API_URL = '/notion/v1';

const getBlockText = (block: any): string => {
  if (block.type && block[block.type]?.rich_text) {
    return block[block.type].rich_text.map((t: any) => t.plain_text).join('');
  }
  return '';
};

const parseNotionPropertyValue = (property: any): string | null => {
  if (!property) return null;
  switch (property.type) {
    case 'title':
      return property.title[0]?.plain_text || null;
    case 'rich_text':
      return property.rich_text[0]?.plain_text || null;
    case 'number':
      return property.number?.toString() || null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select.map((s: any) => s.name).join(', ') || null;
    case 'status':
      return property.status?.name || null;
    case 'date':
      return property.date?.start ? new Date(property.date.start).toLocaleDateString() : null;
    case 'checkbox':
      return property.checkbox ? 'Yes' : 'No';
    case 'url':
      return property.url || null;
    case 'email':
      return property.email || null;
    case 'phone_number':
      return property.phone_number || null;
    case 'created_time':
      return new Date(property.created_time).toLocaleString();
    case 'last_edited_time':
      return new Date(property.last_edited_time).toLocaleString();
    case 'relation':
      return `[Relation: ${property.relation.length} item(s)]`;
    case 'files':
      return `[Files: ${property.files.length} item(s)]`;
    case 'formula':
      return `[Formula: ${property.formula[property.formula.type]}]`;
    default:
      return `[Unsupported: ${property.type}]`;
  }
};

const handleNotionError = async (response: Response, defaultMessage: string): Promise<Error> => {
  const contentType = response.headers.get('content-type');
  let errorMessage;
  if (contentType && contentType.includes('application/json')) {
    const errorData = await response.json();
    errorMessage = errorData.message || defaultMessage;
  } else {
    const errorText = await response.text();
    console.error("Non-JSON response from Notion API:", errorText.substring(0, 500));
    errorMessage = `${defaultMessage}. Received a non-JSON response.`;
  }
  return new Error(errorMessage);
};

export const searchNotionPages = async (query: string): Promise<NotionPage[]> => {
  const accessToken = process.env.NOTION_API_KEY;
  if (!accessToken || accessToken === 'YOUR_NOTION_API_KEY_HERE') {
    throw new Error('Notion API key is not configured.');
  }

  const response = await fetch(`${NOTION_API_URL}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw await handleNotionError(response, 'Failed to search Notion pages.');
  }

  const data = await response.json();
  return data.results
    .filter((item: any) => item.object === 'page' || item.object === 'database')
    .map((item: any) => ({
      id: item.id,
      object: item.object,
      title: item.title?.[0]?.plain_text || item.properties?.title?.title[0]?.plain_text || 'Untitled',
      url: item.url,
      icon: item.icon,
    }));
};

export const readNotionPageContent = async (pageId: string): Promise<string> => {
  const accessToken = process.env.NOTION_API_KEY;
  if (!accessToken || accessToken === 'YOUR_NOTION_API_KEY_HERE') {
    throw new Error('Notion API key is not configured.');
  }

  const response = await fetch(`${NOTION_API_URL}/blocks/${pageId}/children`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
    },
  });

  if (!response.ok) {
    throw await handleNotionError(response, 'Failed to read Notion page content.');
  }

  const data = await response.json();
  const content = data.results.map(getBlockText).join('\n');
  return content || '(This page appears to be empty or contains unsupported content types.)';
};

export const queryNotionDatabase = async (databaseId: string): Promise<NotionTableData> => {
  const accessToken = process.env.NOTION_API_KEY;
  if (!accessToken || accessToken === 'YOUR_NOTION_API_KEY_HERE') {
    throw new Error('Notion API key is not configured.');
  }

  const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw await handleNotionError(response, 'Failed to query Notion database.');
  }

  const data = await response.json();
  if (!data.results || data.results.length === 0) {
    const dbInfoResponse = await fetch(`${NOTION_API_URL}/databases/${databaseId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28',
      },
    });
    if (!dbInfoResponse.ok) {
      throw await handleNotionError(dbInfoResponse, 'Failed to fetch database schema.');
    }
    const dbInfo = await dbInfoResponse.json();
    const headers = Object.keys(dbInfo.properties || {});
    return { headers, rows: [] };
  }

  const firstResultProperties = data.results[0].properties;
  const headers = Object.keys(firstResultProperties);

  const rows = data.results.map((row: any) => {
    return headers.map(header => {
      const property = row.properties[header];
      return parseNotionPropertyValue(property);
    });
  });

  return { headers, rows };
};

export const getNotionDatabases = async (): Promise<NotionPage[]> => {
  const accessToken = process.env.NOTION_API_KEY;
  if (!accessToken || accessToken === 'YOUR_NOTION_API_KEY_HERE') {
    throw new Error('Notion API key is not configured.');
  }

  const response = await fetch(`${NOTION_API_URL}/search`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      filter: {
        property: 'object',
        value: 'database'
      }
    }),
  });

  if (!response.ok) {
    throw await handleNotionError(response, 'Failed to fetch Notion databases.');
  }

  const data = await response.json();
  return data.results
    .filter((item: any) => item.object === 'database')
    .map((item: any) => ({
      id: item.id,
      object: item.object,
      title: item.title?.[0]?.plain_text || 'Untitled Database',
      url: item.url,
      icon: item.icon,
    }));
};
