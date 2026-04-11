
import { getEnv } from './env'
import { AccessTokenRequest } from '../types';

const AUTH_STORAGE_KEY = 'yds_google_auth_v1';

interface StoredAuth {
  access_token: string;
  expires_at: number;
  scopes: string;
}

export const GOOGLE_SHEETS_FULL_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
export const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'
export const GOOGLE_DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
export const GOOGLE_CALENDAR_EVENTS_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

export const ALL_GOOGLE_API_SCOPES = [
  'openid',
  'email',
  'profile',
  GOOGLE_SHEETS_FULL_SCOPE,
  GMAIL_READONLY_SCOPE,
  GOOGLE_DRIVE_READONLY_SCOPE,
  GOOGLE_CALENDAR_EVENTS_SCOPE,
]

function getStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Requests an access token from Google Identity Services.
 * Uses localStorage to persist tokens across refreshes and tabs.
 */
export function requestToken(
  scopes: string | string[] = GOOGLE_SHEETS_FULL_SCOPE, 
  options: { prompt?: 'consent' | 'none' } = {}
): Promise<string> {
  const GOOGLE_CLIENT_ID = getEnv('GOOGLE_CLIENT_ID')
  const requestedScopesArray = Array.isArray(scopes) ? scopes : [scopes]
  const requestedScopesString = requestedScopesArray.sort().join(' ')

  const stored = getStoredAuth();

  // Return cached token if valid (buffer of 1 minute) and scopes match
  if (
    stored && 
    Date.now() < (stored.expires_at - 60000) && 
    stored.scopes === requestedScopesString && 
    options.prompt !== 'consent'
  ) {
    return Promise.resolve(stored.access_token)
  }

  if (!window.google?.accounts?.oauth2) {
    return Promise.reject(new Error('Auth client not initialized.'))
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: requestedScopesString,
      callback: (resp: any) => {
        if (resp && resp.access_token) {
          const authData: StoredAuth = {
            access_token: resp.access_token,
            expires_at: Date.now() + parseInt(resp.expires_in, 10) * 1000,
            scopes: requestedScopesString
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
          // Dispatch event manually for current window listeners
          window.dispatchEvent(new StorageEvent('storage', { 
            key: AUTH_STORAGE_KEY, 
            newValue: JSON.stringify(authData) 
          }));
          resolve(resp.access_token);
        } else {
          const errorMsg = resp.error_description || resp.error || 'Authentication failed.';
          reject(new Error(errorMsg));
        }
      },
      error_callback: (error: any) => reject(new Error(error.message || 'Client error.'))
    })

    tokenClient.requestAccessToken({
      prompt: options.prompt
    });
  });
}

/**
 * Returns the valid token or throws AUTH_EXPIRED.
 * Checks for fresh token in localStorage to handle multi-tab updates.
 */
export function getToken(): string {
  const stored = getStoredAuth();
  if (!stored || Date.now() >= (stored.expires_at - 5000)) {
    throw new Error('AUTH_EXPIRED')
  }
  return stored.access_token
}

let refreshPromise: Promise<string> | null = null;

export function requestAllGoogleApiTokens(
  options: { prompt?: 'consent' | 'none' } = {}, 
  extraScopes?: string | string[]
): Promise<string> {
  // If a request is already in progress, return the existing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  const scopesToRequest = [...new Set([
    ...ALL_GOOGLE_API_SCOPES, 
    ...(Array.isArray(extraScopes) ? extraScopes : (extraScopes ? [extraScopes] : []))
  ])];

  refreshPromise = requestToken(scopesToRequest, options).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export function revokeToken(): Promise<void> {
  return new Promise((resolve) => {
    const stored = getStoredAuth();
    if (!stored) {
      resolve();
      return;
    }
    
    const tokenToRevoke = stored.access_token;
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: AUTH_STORAGE_KEY, newValue: null }));

    const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${tokenToRevoke}`
    fetch(revokeUrl, { method: 'POST', mode: 'no-cors' }).finally(() => resolve());
  })
}
