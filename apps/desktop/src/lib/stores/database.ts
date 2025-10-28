import { createDataStore, type IDataStore } from '@runedeck/data';

/**
 * Global data store instance (initialized in browser only)
 */
let storeInstance: IDataStore | null = null;

/**
 * Get or create the data store
 * Must be called from browser context (onMount, etc.)
 */
export async function getDataStore(): Promise<IDataStore> {
  if (!storeInstance) {
    storeInstance = await createDataStore();
  }
  return storeInstance;
}
