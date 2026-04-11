import { GoogleCalendarEvent } from '../types'

function formatEventTime(event: any): string | null {
  if (!event.start) return 'All day'

  const startDateStr = event.start.dateTime || event.start.date
  const endDateStr = event.end.dateTime || event.end.date
  if (!startDateStr) return 'All day'

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }

  // Check if it's an all-day event
  if (event.start.date) {
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(startDate) + ' (All day)'
  }

  // Check if start and end are on the same day
  if (startDate.toDateString() === endDate.toDateString()) {
    return new Intl.DateTimeFormat('en-US', options).format(startDate)
  }

  // Multi-day event, show start time
  return `Starts: ${new Intl.DateTimeFormat('en-US', options).format(startDate)}`
}


/**
 * Parses an array of raw Google Calendar event objects into an array of structured GoogleCalendarEvent objects.
 * @param rawEvents An array of raw event objects from the Calendar API.
 * @returns An array of processed and sanitized GoogleCalendarEvent objects.
 */
export function parseCalendarEvents(rawEvents: any[]): GoogleCalendarEvent[] {
  if (!Array.isArray(rawEvents)) {
    console.warn("parseCalendarEvents expected an array but received:", rawEvents)
    return []
  }

  return rawEvents.map((event: any) => ({
    id: event.id,
    summary: event.summary || 'No Title',
    htmlLink: event.htmlLink,
    start: formatEventTime(event),
    end: event.end?.dateTime || event.end?.date || null,
    isAllDay: !!event.start.date,
    location: event.location,
  }))
}
