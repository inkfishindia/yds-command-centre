import { GoogleDriveFile } from '../types'

/**
 * Parses an array of raw Google Drive file objects into an array of structured GoogleDriveFile objects.
 * @param rawFiles An array of raw file objects from the Drive API.
 * @returns An array of processed and sanitized GoogleDriveFile objects.
 */
export function parseDriveFiles(rawFiles: any[]): GoogleDriveFile[] {
  if (!Array.isArray(rawFiles)) {
    console.warn("parseDriveFiles expected an array but received:", rawFiles)
    return []
  }

  return rawFiles.map((file: any) => ({
    id: file.id,
    name: (file.name || 'Untitled').trim(),
    mimeType: file.mimeType || 'application/octet-stream',
    webViewLink: file.webViewLink,
    iconLink: file.iconLink,
    modifiedTime: file.modifiedTime, // Keeping as string, can be parsed to Date in UI if needed
  }))
}
