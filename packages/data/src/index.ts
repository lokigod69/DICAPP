export * from './IDataStore';
export * from './SqliteStore';
export * from './WasmSqliteStore';
export * from './CloudStore';
export * from './schema';

/**
 * Create appropriate data store based on environment
 * - Tauri desktop: SqliteStore
 * - Web/PWA: WasmSqliteStore
 */
export async function createDataStore() {
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ != null;

  if (isTauri) {
    const { SqliteStore } = await import('./SqliteStore');
    const store = new SqliteStore();
    await store.init();
    return store;
  } else {
    const { WasmSqliteStore } = await import('./WasmSqliteStore');
    const store = new WasmSqliteStore();
    await store.init();
    return store;
  }
}
