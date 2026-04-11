
import { getEnv } from './env';
import { getToken, requestAllGoogleApiTokens } from './googleAuth';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

export interface IDataClient {
  fetchSheetValues(sheetId: string, range: string, options?: { bypassCache?: boolean }): Promise<{ values?: string[][] }>;
  updateSheetValues(sheetId: string, range: string, values: string[][]): Promise<void>;
  appendSheetValues(sheetId: string, range: string, values: string[][]): Promise<void>;
  batchUpdate(sheetId: string, updates: { range: string; values: string[][] }[]): Promise<void>;
  listDriveFiles(maxResults?: number): Promise<any[]>;
  saveDriveFile(fileName: string, mimeType: string, content: string): Promise<void>;
  listGmailMessages(maxResults?: number): Promise<any[]>;
  listCalendarEvents(maxResults?: number): Promise<any[]>;
  createCalendarEvent(event: { summary: string; start: { dateTime: string }; end: { dateTime: string }; location?: string }): Promise<any>;
  searchGmailMessages(query: string, maxResults?: number): Promise<any[]>;
  searchDriveFiles(query: string, maxResults?: number): Promise<any[]>;
  getDriveFileContent(fileId: string): Promise<string>;
  clearCache(): void;
}

const CACHE_PREFIX = 'yds_sheet_cache_';
const DEFAULT_TTL = 2 * 60 * 1000; 

class BrowserDataClient implements IDataClient {
  private inFlightRequests = new Map<string, Promise<any>>();
  private memoryCache = new Map<string, CacheEntry<any>>();

  private getCacheKey(sheetId: string, range: string): string {
    return `${CACHE_PREFIX}${sheetId}_${range}`;
  }

  private setCache(key: string, data: any) {
    const entry: CacheEntry<any> = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + DEFAULT_TTL
    };
    this.memoryCache.set(key, entry);
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
      console.warn('Cache persistence failed');
    }
  }

  private getFromCache(key: string): any | null {
    const memEntry = this.memoryCache.get(key);
    if (memEntry && memEntry.expiry > Date.now()) return memEntry.data;
    const localStr = localStorage.getItem(key);
    if (localStr) {
      try {
        const localEntry: CacheEntry<any> = JSON.parse(localStr);
        if (localEntry.expiry > Date.now()) {
          this.memoryCache.set(key, localEntry);
          return localEntry.data;
        }
        localStorage.removeItem(key);
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
    return null;
  }

  clearCache(): void {
    this.memoryCache.clear();
    this.inFlightRequests.clear();
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) localStorage.removeItem(key);
    });
  }

  private async fetchWithRetry(url: string, options: RequestInit = {}, retryCount = 1): Promise<Response> {
    try {
      const token = getToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401 && retryCount > 0) {
        console.warn("Token expired. Attempting silent refresh...");
        await requestAllGoogleApiTokens({ prompt: 'none' });
        return this.fetchWithRetry(url, options, retryCount - 1);
      }
      return res;
    } catch (e: any) {
      if (e.message === 'AUTH_EXPIRED' && retryCount > 0) {
        console.warn("Token expired locally. Attempting silent refresh...");
        await requestAllGoogleApiTokens({ prompt: 'none' });
        return this.fetchWithRetry(url, options, retryCount - 1);
      }
      throw e;
    }
  }

  async fetchSheetValues(sheetId: string, range: string, options?: { bypassCache?: boolean }): Promise<{ values?: string[][] }> {
    const cacheKey = this.getCacheKey(sheetId, range);
    if (!options?.bypassCache) {
      const cachedData = this.getFromCache(cacheKey);
      if (cachedData) return cachedData;
    }

    if (this.inFlightRequests.has(cacheKey)) return this.inFlightRequests.get(cacheKey)!;

    const fetchPromise = (async () => {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?majorDimension=ROWS`;
        const res = await this.fetchWithRetry(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        this.setCache(cacheKey, data);
        return data;
      } finally {
        this.inFlightRequests.delete(cacheKey);
      }
    })();

    this.inFlightRequests.set(cacheKey, fetchPromise);
    return fetchPromise;
  }

  async updateSheetValues(sheetId: string, range: string, values: string[][]): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
    const res = await this.fetchWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    });
    if (!res.ok) throw new Error(`Update failed: ${res.status}`);
    this.clearLocalCacheForSheet(sheetId);
  }

  async batchUpdate(sheetId: string, updates: { range: string; values: string[][] }[]): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`;
    const body = {
      valueInputOption: 'USER_ENTERED',
      data: updates.map(u => ({ range: u.range, values: u.values, majorDimension: 'ROWS' }))
    };
    const res = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Batch update failed: ${res.status}`);
    this.clearLocalCacheForSheet(sheetId);
  }

  async appendSheetValues(sheetId: string, range: string, values: string[][]): Promise<void> {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
    const res = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    });
    if (!res.ok) throw new Error(`Append failed: ${res.status}`);
    this.clearLocalCacheForSheet(sheetId);
  }

  private clearLocalCacheForSheet(sheetId: string) {
    this.memoryCache.forEach((_, key) => {
      if (key.includes(sheetId)) this.memoryCache.delete(key);
    });
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(CACHE_PREFIX) && key.includes(sheetId)) localStorage.removeItem(key);
    });
  }
  
  async listDriveFiles(maxResults: number = 10): Promise<any[]> {
    const queryParams = new URLSearchParams({ pageSize: String(maxResults), fields: 'files(id, name, mimeType, webViewLink, iconLink, modifiedTime)', orderBy: 'modifiedTime desc' });
    const res = await this.fetchWithRetry(`https://www.googleapis.com/drive/v3/files?${queryParams.toString()}`);
    const data = await res.json();
    return data.files || [];
  }

  async saveDriveFile(fileName: string, mimeType: string, content: string): Promise<void> {
      const metadata = { name: fileName, mimeType: mimeType };
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([content], { type: mimeType }));
      const res = await this.fetchWithRetry('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  }

  async listGmailMessages(maxResults: number = 10): Promise<any[]> {
      const listRes = await this.fetchWithRetry(`https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`);
      const listData = await listRes.json();
      const messageIds = listData.messages?.map((m: any) => m.id) || [];
      if (messageIds.length === 0) return [];
      const messagePromises = messageIds.map((id: string) => 
        this.fetchWithRetry(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`)
          .then(res => res.ok ? res.json() : null)
      );
      return (await Promise.all(messagePromises)).filter(msg => msg !== null);
  }

  async listCalendarEvents(maxResults: number = 15): Promise<any[]> {
      const queryParams = new URLSearchParams({ maxResults: String(maxResults), orderBy: 'startTime', singleEvents: 'true', timeMin: new Date().toISOString() });
      const res = await this.fetchWithRetry(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${queryParams.toString()}`);
      const data = await res.json();
      return data.items || [];
  }

  async createCalendarEvent(event: any): Promise<any> {
    const res = await this.fetchWithRetry(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(event) 
    });
    return res.json();
  }

  async searchGmailMessages(query: string, maxResults: number = 5): Promise<any[]> {
      const listRes = await this.fetchWithRetry(`https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`);
      const listData = await listRes.json();
      const messageIds = listData.messages?.map((m: any) => m.id) || [];
      const messagePromises = messageIds.map((id: string) => 
        this.fetchWithRetry(`https://www.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`)
          .then(res => res.ok ? res.json() : null)
      );
      return (await Promise.all(messagePromises)).filter(msg => msg !== null);
  }

  async searchDriveFiles(query: string, maxResults: number = 5): Promise<any[]> {
      const res = await this.fetchWithRetry(`https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&fields=files(id, name, mimeType, webViewLink, iconLink, modifiedTime)&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      return data.files || [];
  }

  async getDriveFileContent(fileId: string): Promise<string> {
      const res = await this.fetchWithRetry(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
      return res.text();
  }
}

export const dataClient = new BrowserDataClient();
