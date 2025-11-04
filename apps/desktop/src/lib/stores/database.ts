import { CloudStore, type IDataStore } from '@runedeck/data';
import { supabase } from '$lib/supabaseClient';

/**
 * Global data store instance (initialized in browser only)
 * Now using CloudStore for cloud-backed storage
 */
let storeInstance: IDataStore | null = null;

/**
 * Get or create the data store
 * Must be called from browser context (onMount, etc.)
 *
 * Cloud-only: All data stored in Supabase with RLS
 */
export async function getDataStore(): Promise<IDataStore> {
  if (!storeInstance) {
    storeInstance = new CloudStore(supabase);
    await storeInstance.init();
  }
  return storeInstance;
}
