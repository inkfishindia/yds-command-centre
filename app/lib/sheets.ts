import { dataClient } from './dataClient'

/**
 * Fetches values from a specified Google Sheet and range.
 * This is a wrapper around the active data client.
 * @param sheetId The ID of the Google Sheet.
 * @param range The A1 notation of the range to retrieve values from.
 * @param options Configuration for fetching, like bypassing cache.
 * @returns A promise that resolves to an object containing the sheet values (as a 2D array of strings).
 */
export async function fetchValues(sheetId: string, range: string, options?: { bypassCache?: boolean }): Promise<{ values?: string[][] }> {
  try {
    return await dataClient.fetchSheetValues(sheetId, range, options);
  } catch (error) {
    console.error('Error fetching sheet values via data client:', error)
    throw error
  }
}

/**
 * Fetches headers from a specified row in a Google Sheet.
 * @param sheetId The ID of the Google Sheet.
 * @param range The A1 notation of the range (e.g., "Sheet1!A:Z"). The sheet name part is required.
 * @param headerRow The 1-based index of the row containing headers.
 * @returns A promise that resolves to an array of header strings.
 */
export async function fetchHeaders(sheetId: string, range: string, headerRow: number): Promise<string[]> {
  try {
    const sheetNameMatch = range.match(/^([^!]+)!/)
    const sheetName = sheetNameMatch ? sheetNameMatch[1] : ''
    const hdrRange = sheetName ? `${sheetName}!${headerRow}:${headerRow}` : `${headerRow}:${headerRow}`

    const jsonResponse = await fetchValues(sheetId, hdrRange)
    return (jsonResponse.values?.[0] ?? []).map(h => (h || '').trim())
  } catch (error) {
    console.error('Error fetching sheet headers:', error)
    throw error
  }
}

/**
 * Updates a range of values in a Google Sheet.
 * This is a wrapper around the active data client.
 * @param sheetId The ID of the Google Sheet.
 * @param range The A1 notation of the range to update.
 * @param values The 2D array of values to write.
 * @returns A promise that resolves on successful update.
 */
export async function updateValues(sheetId: string, range: string, values: string[][]): Promise<void> {
  try {
    await dataClient.updateSheetValues(sheetId, range, values);
  } catch (error) {
    console.error('Error updating sheet values via data client:', error)
    throw error
  }
}

/**
 * Appends values to a Google Sheet.
 * This is a wrapper around the active data client.
 * @param sheetId The ID of the Google Sheet.
 * @param range The A1 notation of the range to append values to (e.g., 'Sheet1!A1').
 * @param values The 2D array of values to append.
 * @returns A promise that resolves on successful append.
 */
export async function appendValues(sheetId: string, range: string, values: string[][]): Promise<void> {
  try {
    await dataClient.appendSheetValues(sheetId, range, values);
  } catch (error) {
    console.error('Error appending sheet values via data client:', error)
    throw error
  }
}