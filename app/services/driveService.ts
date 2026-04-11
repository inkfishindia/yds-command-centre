import { dataClient } from '../lib/dataClient'

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files'

/**
 * Fetches a raw list of Google Drive files for the authenticated user.
 * It does NOT parse or sanitize the data.
 * @param maxResults The maximum number of files to return. Default is 10.
 * @returns A promise that resolves to an array of raw Google Drive file objects.
 */
export async function listDriveFiles(maxResults: number = 10): Promise<any[]> {
  try {
    return await dataClient.listDriveFiles(maxResults);
  } catch (error) {
    console.error('Failed to list Google Drive files via data client:', error);
    throw error;
  }
}

/**
 * Saves a file to Google Drive.
 * @param fileName The name of the file to save.
 * @param mimeType The MIME type of the file.
 * @param content The content of the file as a string.
 * @returns A promise that resolves when the file is saved.
 */
export async function saveFileToDrive(fileName: string, mimeType: string, content: string): Promise<void> {
  try {
    await dataClient.saveDriveFile(fileName, mimeType, content);
  } catch (error) {
    console.error('Failed to save file to Google Drive via data client:', error);
    throw error;
  }
}

/**
 * Searches for files in Google Drive matching a query.
 * @param query The search query.
 * @param maxResults The maximum number of files to return.
 * @returns A promise that resolves to an array of raw Google Drive file objects.
 */
export async function searchDriveFiles(query: string, maxResults: number = 5): Promise<any[]> {
  try {
    return await dataClient.searchDriveFiles(query, maxResults);
  } catch (error) {
    console.error('Failed to search Google Drive files via data client:', error);
    throw error;
  }
}

/**
 * Retrieves the content of a text-based file from Google Drive.
 * @param fileId The ID of the file to read.
 * @returns A promise that resolves to the text content of the file.
 */
export async function getDriveFileContent(fileId: string): Promise<string> {
  try {
    return await dataClient.getDriveFileContent(fileId);
  } catch (error) {
    console.error('Failed to get Google Drive file content via data client:', error);
    throw error;
  }
}
