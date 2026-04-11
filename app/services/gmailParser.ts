import { GmailMessage, GmailMessagePart } from '../types' // Updated import path

function decodeBase64Url(base64Url: string): string {
  if (!base64Url) return ''
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
  // FIX: Complete base64 padding
  const paddedBase64 = base64.length % 4 === 0 ? base64 : base64 + '==='.slice((base64.length + 3) % 4);
  try {
    return decodeURIComponent(atob(paddedBase64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    }).join(''))
  } catch (e) {
    console.error("Failed to decode base64url:", e);
    return '';
  }
}

function getMessagePartBody(part: GmailMessagePart): string | null {
  if (part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  if (part.parts) {
    for (const subPart of part.parts) {
      const body = getMessagePartBody(subPart);
      if (body) return body;
    }
  }
  return null;
}

/**
 * Parses an array of raw Gmail message objects into an array of structured GmailMessage objects.
 * @param rawMessages An array of raw message objects from the Gmail API.
 * @returns An array of processed and sanitized GmailMessage objects.
 */
export function parseGmailMessages(rawMessages: any[]): GmailMessage[] {
  if (!Array.isArray(rawMessages)) {
    console.warn("parseGmailMessages expected an array but received:", rawMessages);
    return [];
  }

  return rawMessages.map((msg: any) => {
    const headers = msg.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name)?.value || 'N/A';

    return {
      id: msg.id,
      threadId: msg.threadId,
      snippet: msg.snippet,
      payload: msg.payload, // Keep raw payload for full details if needed
      sender: getHeader('from'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      body: getMessagePartBody(msg.payload), // Extract body content
    };
  });
}