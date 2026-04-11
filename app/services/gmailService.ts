import { dataClient } from '../lib/dataClient'
import { GmailMessage } from '../types'

const GMAIL_API_BASE = 'https://www.googleapis.com/gmail/v1/users/me'

/**
 * Fetches raw message data for recent Gmail messages for the authenticated user.
 * It does NOT parse or sanitize the data.
 * @param maxResults The maximum number of messages to return. Default is 10.
 * @returns A promise that resolves to an array of raw Gmail message objects.
 */
export async function listGmailMessages(maxResults: number = 10): Promise<any[]> {
  try {
    return await dataClient.listGmailMessages(maxResults);
  } catch (error) {
    console.error('Failed to list Gmail messages via data client:', error);
    throw error;
  }
}

/**
 * Searches for Gmail messages matching a query for the authenticated user.
 * @param query The search query (e.g., "from:elonmusk").
 * @param maxResults The maximum number of messages to return.
 * @returns A promise that resolves to an array of raw Gmail message objects.
 */
export async function searchGmailMessages(query: string, maxResults: number = 5): Promise<any[]> {
  try {
    return await dataClient.searchGmailMessages(query, maxResults);
  } catch (error) {
    console.error('Failed to search Gmail messages via data client:', error);
    throw error;
  }
}
