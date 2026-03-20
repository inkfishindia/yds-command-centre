/**
 * Google Sheets CRUD Service — from The-Design-Lab---TPL-X-YDS
 * Full read/write/update/delete for Google Sheets API
 * PORT TO: server/services/sheets.js (convert to CommonJS + server-side auth)
 */

import { getCache, setCache } from './cachingService';
import { SPREADSHEET_CONFIG, SHEET_REGISTRY, SheetKey } from './configService';
import { getMockData } from './mockDataService';
import { SheetRow } from '../types';

const CSV_CACHE_TTL_MINUTES = 5;
const SHEETS_API_BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';

export const fetchSheetData = async (sheetKey: SheetKey, token: string | null): Promise<any[]> => {
  const cacheKey = `sheet_data_${sheetKey}`;
  const cachedData = getCache<any[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const sheetInfo = SHEET_REGISTRY[sheetKey];
  if (!sheetInfo) {
    throw new Error(`Sheet with key "${sheetKey}" not found in registry.`);
  }

  if (!token) {
    console.warn(`Not authenticated. Using mock data for sheet: ${sheetKey}`);
    const mockData = getMockData(sheetKey);
    setCache(cacheKey, mockData, CSV_CACHE_TTL_MINUTES);
    return mockData;
  }

  const spreadsheetId = SPREADSHEET_CONFIG[sheetInfo.spreadsheetKey];
  const range = sheetInfo.sheetName.includes(' ') ? `'${sheetInfo.sheetName}'` : sheetInfo.sheetName;
  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Authentication failed. Please sign in again.');
    if (response.status === 403) throw new Error(`Permission denied for sheet "${sheetKey}". Ensure API access is enabled.`);
    throw new Error(`Failed to fetch sheet ${sheetKey}. Status: ${response.status}`);
  }

  const result = await response.json();
  const [headers, ...rows] = result.values;

  const data = rows.map((row: any[], index: number) => {
    const rowObject: any = { rowIndex: index + 1 };
    headers.forEach((header: string, i: number) => {
      if (header) {
        rowObject[header] = row[i] || null;
      }
    });
    return rowObject;
  });

  setCache(cacheKey, data, CSV_CACHE_TTL_MINUTES);
  return data;
};

const getSheetHeaders = async (sheetKey: SheetKey, token: string): Promise<string[]> => {
  const cacheKey = `sheet_headers_${sheetKey}`;
  const cachedHeaders = getCache<string[]>(cacheKey);
  if (cachedHeaders) return cachedHeaders;

  const sheetInfo = SHEET_REGISTRY[sheetKey];
  if (!sheetInfo) throw new Error(`Sheet with key "${sheetKey}" not found in registry.`);

  const spreadsheetId = SPREADSHEET_CONFIG[sheetInfo.spreadsheetKey];
  const sheetName = sheetInfo.sheetName.includes(' ') ? `'${sheetInfo.sheetName}'` : sheetInfo.sheetName;
  const range = `${sheetName}!1:1`;
  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}/values/${range}`;

  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Failed to fetch headers for ${sheetKey}.`);

  const data = await response.json();
  const headers: string[] = data.values[0];
  setCache(cacheKey, headers, 60);
  return headers;
};

const mapObjectToRowArray = (rowData: SheetRow, headers: string[]): any[] => {
  return headers.map(header => rowData[header] ?? '');
};

export const appendRow = async (sheetKey: SheetKey, rowData: Omit<SheetRow, 'rowIndex'>, token: string) => {
  const sheetInfo = SHEET_REGISTRY[sheetKey];
  const spreadsheetId = SPREADSHEET_CONFIG[sheetInfo.spreadsheetKey];
  const headers = await getSheetHeaders(sheetKey, token);
  const rowAsArray = mapObjectToRowArray(rowData as SheetRow, headers);

  const range = sheetInfo.sheetName.includes(' ') ? `'${sheetInfo.sheetName}'` : sheetInfo.sheetName;
  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowAsArray] }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message || `Failed to append row to ${sheetKey}.`);
  }
  return await response.json();
};

export const updateRow = async (sheetKey: SheetKey, rowIndex: number, rowData: SheetRow, token: string) => {
  const sheetInfo = SHEET_REGISTRY[sheetKey];
  const spreadsheetId = SPREADSHEET_CONFIG[sheetInfo.spreadsheetKey];
  const headers = await getSheetHeaders(sheetKey, token);
  const rowAsArray = mapObjectToRowArray(rowData, headers);

  const sheetRowNumber = rowIndex + 1;
  const sheetName = sheetInfo.sheetName.includes(' ') ? `'${sheetInfo.sheetName}'` : sheetInfo.sheetName;
  const range = `${sheetName}!A${sheetRowNumber}`;

  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [rowAsArray] }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message || `Failed to update row in ${sheetKey}.`);
  }
  return await response.json();
};

export const deleteRow = async (sheetKey: SheetKey, rowIndex: number, token: string) => {
  const sheetInfo = SHEET_REGISTRY[sheetKey];
  const spreadsheetId = SPREADSHEET_CONFIG[sheetInfo.spreadsheetKey];

  const request = {
    requests: [{
      deleteDimension: {
        range: {
          sheetId: parseInt(sheetInfo.gid, 10),
          dimension: 'ROWS',
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
      },
    }],
  };

  const url = `${SHEETS_API_BASE_URL}/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error.message || `Failed to delete row from ${sheetKey}.`);
  }
  return await response.json();
};
