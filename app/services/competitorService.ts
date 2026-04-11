import { Competitor } from '../types';
import { saveFileToDrive } from './driveService'; // Assuming a driveService exists for saving files
import { searchCompetitorSocialMedia } from './aiGenerativeService'; // New AI service

const COMPETITOR_STORAGE_KEY = 'ai_studio_competitors';

/**
 * Retrieves all stored competitors from local storage.
 * @returns An array of Competitor objects.
 */
export function getCompetitors(): Competitor[] {
  try {
    const storedCompetitors = localStorage.getItem(COMPETITOR_STORAGE_KEY);
    return storedCompetitors ? JSON.parse(storedCompetitors) : [];
  } catch (error) {
    console.error('Error retrieving competitors from local storage:', error);
    return [];
  }
}

/**
 * Saves a list of competitors to local storage.
 * @param competitors The array of Competitor objects to save.
 */
export function saveCompetitors(competitors: Competitor[]): void {
  try {
    localStorage.setItem(COMPETITOR_STORAGE_KEY, JSON.stringify(competitors));
  } catch (error) {
    console.error('Error saving competitors to local storage:', error);
  }
}

/**
 * Adds a new competitor profile to local storage.
 * @param newCompetitor The new Competitor to add.
 * @returns The newly added Competitor with a generated ID.
 */
export function addCompetitor(newCompetitor: Partial<Competitor>): Competitor {
  const competitors = getCompetitors();
  const competitorToAdd: Competitor = {
    ...newCompetitor,
    id: `COMP-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: newCompetitor.name || 'Untitled Competitor',
  } as Competitor;

  competitors.push(competitorToAdd);
  saveCompetitors(competitors);
  return competitorToAdd;
}

/**
 * Updates an existing competitor profile in local storage.
 * @param updatedCompetitor The Competitor object with updated values.
 * @returns The updated Competitor, or null if not found.
 */
export function updateCompetitor(updatedCompetitor: Competitor): Competitor | null {
  let competitors = getCompetitors();
  const index = competitors.findIndex(c => c.id === updatedCompetitor.id);
  if (index > -1) {
    competitors[index] = updatedCompetitor;
    saveCompetitors(competitors);
    return updatedCompetitor;
  }
  return null;
}

/**
 * Deletes a competitor profile from local storage.
 * @param id The ID of the competitor profile to delete.
 * @returns True if deleted successfully, false otherwise.
 */
export function deleteCompetitor(id: string): boolean {
  let competitors = getCompetitors();
  const initialLength = competitors.length;
  competitors = competitors.filter(c => c.id !== id);
  if (competitors.length < initialLength) {
    saveCompetitors(competitors);
    return true;
  }
  return false;
}

/**
 * Searches for recent social media activity for a given competitor using the AI generative service.
 * @param competitorName The name of the competitor to search for.
 * @returns A promise that resolves to the AI's summary of social media activity.
 */
export async function performSocialMediaSearch(competitorName: string): Promise<string> {
  // This function acts as a wrapper, calling the actual AI service
  return await searchCompetitorSocialMedia(competitorName);
}

/**
 * Saves competitor data and social media search results to Google Drive.
 * @param competitor The Competitor object.
 * @param socialSearchResult The social media search result string.
 * @returns A promise that resolves when the file is saved.
 */
export async function saveCompetitorDataToDrive(competitor: Competitor, socialSearchResult: string): Promise<void> {
    const fileContent = `
    Competitor Name: ${competitor.name}
    Website: ${competitor.website || 'N/A'}
    Twitter: ${competitor.twitter || 'N/A'}
    LinkedIn: ${competitor.linkedin || 'N/A'}
    Notes: ${competitor.notes || 'N/A'}

    --- Social Media Listening Result ---
    ${socialSearchResult}
    `;

    const fileName = `Competitor_Analysis_${competitor.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    const mimeType = 'text/plain';

    // Assuming saveFileToDrive takes content as a string and handles Base64 encoding internally if needed.
    await saveFileToDrive(fileName, mimeType, fileContent);
}

// Helper to base64 encode string data (if driveService expects base64)
// This is typically handled by the driveService itself when saving text content.
// If driveService expects base64, uncomment and use this:
// function stringToBase64(str: string): string {
//     return btoa(unescape(encodeURIComponent(str)));
// }
