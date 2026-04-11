import { dataClient } from '../lib/dataClient'

const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

/**
 * Fetches a raw list of upcoming Google Calendar events for the authenticated user.
 * It does NOT parse or sanitize the data.
 * @param maxResults The maximum number of events to return. Default is 15.
 * @returns A promise that resolves to an array of raw Google Calendar event objects.
 */
export async function listCalendarEvents(maxResults: number = 15): Promise<any[]> {
    try {
        return await dataClient.listCalendarEvents(maxResults);
    } catch (error) {
        console.error('Failed to list Google Calendar events via data client:', error);
        throw error;
    }
}

/**
 * Creates a new event in the user's primary Google Calendar.
 * @param event The event object to create.
 * @returns A promise that resolves to the created event object.
 */
export async function createEvent(event: { summary: string; start: { dateTime: string }; end: { dateTime: string }; location?: string }): Promise<any> {
    try {
        return await dataClient.createCalendarEvent(event);
    } catch (error) {
        console.error('Failed to create Google Calendar event via data client:', error);
        throw error;
    }
}
