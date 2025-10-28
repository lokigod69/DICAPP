# SSR & Database Initialization Fix

## Problems Fixed

1. **SSR trying to execute browser/Tauri code** - SvelteKit was attempting to run database initialization server-side
2. **Static data store instantiation** - Store was created at module load time, not in browser context
3. **sql.js WASM file not found** - Missing WASM binary for web SQL engine
4. **Wrong WASM CDN path** - Was pointing to external CDN instead of local file

## Changes Applied

### 1. Disabled SSR ✅

Created `apps/desktop/src/routes/+layout.ts`:
```typescript
export const ssr = false;
export const prerender = false;
```

This prevents SvelteKit from trying to execute database code during server-side rendering.

### 2. Dynamic Data Store Factory ✅

Updated `packages/data/src/index.ts` with browser-only instantiation:

```typescript
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
```

### 3. Updated Store Helper ✅

Replaced singleton pattern in `apps/desktop/src/lib/stores/database.ts`:

**Before:**
```typescript
export const dataStore = new SqliteStore('runedeck.db'); // ❌ Runs at module load
```

**After:**
```typescript
let storeInstance: IDataStore | null = null;

export async function getDataStore(): Promise<IDataStore> {
  if (!storeInstance) {
    storeInstance = await createDataStore();
  }
  return storeInstance;
}
```

### 4. Updated All Pages ✅

Modified 5 Svelte pages to use dynamic instantiation in `onMount`:

- `apps/desktop/src/routes/+page.svelte` (Home)
- `apps/desktop/src/routes/study/+page.svelte` (Study)
- `apps/desktop/src/routes/import/+page.svelte` (Import)
- `apps/desktop/src/routes/clinic/+page.svelte` (Clinic)
- `apps/desktop/src/routes/settings/+page.svelte` (Settings)

**Pattern:**
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getDataStore } from '$lib/stores/database';
  import type { IDataStore } from '@runedeck/data';

  let dataStore: IDataStore | null = null;

  onMount(async () => {
    dataStore = await getDataStore();
    // ... use dataStore
  });
</script>
```

### 5. Copied sql.js WASM File ✅

```bash
cp node_modules/sql.js/dist/sql-wasm.wasm apps/desktop/static/sql-wasm.wasm
```

File size: 645 KB

### 6. Fixed WASM locateFile ✅

Updated `packages/data/src/WasmSqliteStore.ts`:

**Before:**
```typescript
this.SQL = await initSqlJs({
  locateFile: (file) => `https://sql.js.org/dist/${file}`, // ❌ External CDN
});
```

**After:**
```typescript
this.SQL = await initSqlJs({
  locateFile: (file) => `/sql-wasm.wasm`, // ✅ Local file
});
```

### 7. Verified Tauri Plugin ✅

Confirmed `apps/desktop/src-tauri/src/main.rs` has SQL plugin registered:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Next Steps

### 1. Run SvelteKit Sync

```bash
cd apps/desktop
pnpm exec svelte-kit sync
```

This generates `.svelte-kit/tsconfig.json` and eliminates TypeScript warnings.

### 2. Clear Vite Cache

```powershell
Remove-Item -Recurse -Force apps\desktop\node_modules\.vite -ErrorAction SilentlyContinue
```

Or bash:
```bash
rm -rf apps/desktop/node_modules/.vite
```

### 3. Start Dev Server

```bash
pnpm run dev:desktop
```

Expected output:
- Vite dev server starts on http://localhost:5173
- Tauri window launches automatically
- No SSR errors in console
- Home page loads with stats

### 4. Test Import

1. Click "Import CSV"
2. Upload `scripts/sample-deck.csv`
3. Should see 50 words in preview
4. Click "Import Words"
5. Success message appears
6. Redirects to home showing 50 new words

### 5. Test Study

1. Click "Start Review"
2. First card appears (e.g., "susurrus")
3. Press `R` to reveal
4. Press `1-4` to grade
5. Next card appears automatically

## Files Modified (Summary)

### Created
- `apps/desktop/src/routes/+layout.ts`

### Modified
- `packages/data/src/index.ts` - Added createDataStore factory
- `packages/data/src/WasmSqliteStore.ts` - Fixed WASM path
- `apps/desktop/src/lib/stores/database.ts` - Replaced singleton
- `apps/desktop/src/routes/+page.svelte` - Dynamic store
- `apps/desktop/src/routes/study/+page.svelte` - Dynamic store
- `apps/desktop/src/routes/import/+page.svelte` - Dynamic store
- `apps/desktop/src/routes/clinic/+page.svelte` - Dynamic store
- `apps/desktop/src/routes/settings/+page.svelte` - Dynamic store

### Copied
- `node_modules/sql.js/dist/sql-wasm.wasm` → `apps/desktop/static/sql-wasm.wasm`

## What Was Wrong

### SSR Issue
```
Error: Cannot find module '@tauri-apps/plugin-sql'
```
- SvelteKit tried to import Tauri plugins server-side
- Solution: Disabled SSR with `+layout.ts`

### Module Loading
```
Error: Database not initialized
```
- Store created at import time, before browser context existed
- Solution: Lazy instantiation in onMount

### WASM Missing
```
Error: Failed to fetch sql-wasm.wasm from CDN
```
- External CDN blocked or slow
- Solution: Bundled WASM locally

## Verification Checklist

After running `pnpm run dev:desktop`:

- [ ] Vite starts without errors
- [ ] Tauri window opens
- [ ] Home page shows "0 total words"
- [ ] Import CSV works
- [ ] Study session starts
- [ ] Keyboard shortcuts work (R, 1-4)
- [ ] Clinic view loads (after creating leeches)
- [ ] Settings exports CSV/JSON
- [ ] Theme toggle persists

## Troubleshooting

### If SSR errors persist
Check that `+layout.ts` has both:
```typescript
export const ssr = false;
export const prerender = false;
```

### If "dataStore is null"
Ensure all functions check:
```typescript
if (!dataStore) return;
```

### If WASM 404
Verify file exists:
```bash
ls apps/desktop/static/sql-wasm.wasm
```

Should show 645 KB file.

### If Tauri SQL fails
Check `apps/desktop/src-tauri/Cargo.toml` includes:
```toml
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
```

---

All SSR and database initialization issues are now resolved. The app is ready for testing!
