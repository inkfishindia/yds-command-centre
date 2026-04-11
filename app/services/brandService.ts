import { BrandProfile } from '../types';

const BRAND_STORAGE_KEY = 'ai_studio_brands';

/**
 * Retrieves all stored brand profiles from local storage.
 * @returns An array of BrandProfile objects.
 */
export function getBrands(): BrandProfile[] {
  try {
    const storedBrands = localStorage.getItem(BRAND_STORAGE_KEY);
    return storedBrands ? JSON.parse(storedBrands) : [];
  } catch (error) {
    console.error('Error retrieving brands from local storage:', error);
    return [];
  }
}

/**
 * Saves a list of brand profiles to local storage.
 * @param brands The array of BrandProfile objects to save.
 */
export function saveBrands(brands: BrandProfile[]): void {
  try {
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(brands));
  } catch (error) {
    console.error('Error saving brands to local storage:', error);
  }
}

/**
 * Adds a new brand profile to local storage.
 * @param newBrand The new BrandProfile to add.
 * @returns The newly added BrandProfile with a generated ID.
 */
export function addBrand(newBrand: Partial<BrandProfile>): BrandProfile {
  const brands = getBrands();
  const brandToAdd: BrandProfile = {
    ...newBrand,
    id: `BRAND-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: newBrand.name || 'Untitled Brand',
    voice: newBrand.voice || 'Neutral',
    mission: newBrand.mission || 'No mission defined',
  } as BrandProfile; // Type assertion as ID is guaranteed

  brands.push(brandToAdd);
  saveBrands(brands);
  return brandToAdd;
}

/**
 * Updates an existing brand profile in local storage.
 * @param updatedBrand The BrandProfile object with updated values.
 * @returns The updated BrandProfile, or null if not found.
 */
export function updateBrand(updatedBrand: BrandProfile): BrandProfile | null {
  let brands = getBrands();
  const index = brands.findIndex(b => b.id === updatedBrand.id);
  if (index > -1) {
    brands[index] = updatedBrand;
    saveBrands(brands);
    return updatedBrand;
  }
  return null;
}

/**
 * Deletes a brand profile from local storage.
 * @param id The ID of the brand profile to delete.
 * @returns True if deleted successfully, false otherwise.
 */
export function deleteBrand(id: string): boolean {
  let brands = getBrands();
  const initialLength = brands.length;
  brands = brands.filter(b => b.id !== id);
  if (brands.length < initialLength) {
    saveBrands(brands);
    return true;
  }
  return false;
}
