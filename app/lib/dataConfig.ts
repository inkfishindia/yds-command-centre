import { DataConfig } from '../types'

const CONFIG_KEY = 'google_sheets_data_config'

/**
 * Saves the data configuration to localStorage.
 * @param config The DataConfig object to save.
 */
export function saveConfig(config: DataConfig) {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config))
  } catch (error) {
    console.error('Failed to save data configuration to localStorage:', error)
  }
}

/**
 * Loads the data configuration from localStorage.
 * @returns The DataConfig object if found, otherwise null.
 */
export function loadConfig(): DataConfig | null {
  try {
    const storedConfig = localStorage.getItem(CONFIG_KEY)
    return storedConfig ? JSON.parse(storedConfig) : null
  } catch (error) {
    console.error('Failed to load data configuration from localStorage:', error)
    return null
  }
}