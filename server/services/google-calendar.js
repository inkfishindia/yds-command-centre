'use strict';

const config = require('../config');

let calendarClient = null;

function isConfigured() {
  return !!(config.GOOGLE_SERVICE_ACCOUNT_KEY && config.GOOGLE_CALENDAR_ID);
}

function authOptions(scopes) {
  const key = config.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;
  if (key.trimStart().startsWith('{')) {
    return { credentials: JSON.parse(key), scopes };
  }
  return { keyFile: key, scopes };
}

function getClient() {
  if (!isConfigured()) return null;
  if (calendarClient) return calendarClient;

  try {
    const { google } = require('googleapis');
    const opts = authOptions(['https://www.googleapis.com/auth/calendar.readonly']);
    if (!opts) return null;
    const auth = new google.auth.GoogleAuth(opts);
    calendarClient = google.calendar({ version: 'v3', auth });
    return calendarClient;
  } catch (err) {
    console.error('Calendar client init failed:', err.message);
    return null;
  }
}

async function getTodaysEvents() {
  const client = getClient();
  if (!client) {
    return { available: false, reason: 'not_configured', items: [] };
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  try {
    const response = await client.events.list({
      calendarId: config.GOOGLE_CALENDAR_ID,
      singleEvents: true,
      orderBy: 'startTime',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      maxResults: 20,
    });

    const items = (response.data.items || []).map((event) => ({
      id: event.id,
      title: event.summary || 'Untitled event',
      start: event.start?.dateTime || event.start?.date || '',
      end: event.end?.dateTime || event.end?.date || '',
      location: event.location || '',
      status: event.status || '',
      htmlLink: event.htmlLink || '',
    }));

    return { available: true, items };
  } catch (err) {
    console.warn('[calendar] getTodaysEvents API error:', err.message);
    return { available: false, reason: 'api_error', error: err.message, items: [] };
  }
}

module.exports = {
  getTodaysEvents,
};
