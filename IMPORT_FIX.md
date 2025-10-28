# Import Fix Applied

## Problem
TypeScript source imports were using `.js` extensions, causing module resolution failures when Vite tried to load the source files directly (without a build step).

## Files Fixed

### Core Package (`packages/core/src/`)
- ✅ `index.ts` - Removed `.js` from all exports
- ✅ `models/index.ts` - Removed `.js` from exports
- ✅ `models/utils.ts` - Removed `.js` from import
- ✅ `scheduler/index.ts` - Removed `.js` from export
- ✅ `scheduler/sm2.ts` - Removed `.js` from import
- ✅ `queue/index.ts` - Removed `.js` from export
- ✅ `queue/builder.ts` - Removed `.js` from imports
- ✅ `csv/index.ts` - Removed `.js` from export
- ✅ `csv/parser.ts` - Removed `.js` from imports

### Data Package (`packages/data/src/`)
- ✅ `index.ts` - Removed `.js` from all exports
- ✅ `SqliteStore.ts` - Removed `.js` from imports
- ✅ `WasmSqliteStore.ts` - Removed `.js` from imports

## Vite Configuration
Added path aliases in `apps/desktop/vite.config.ts`:

```typescript
resolve: {
  alias: {
    '@runedeck/core': path.resolve(__dirname, '../../packages/core/src'),
    '@runedeck/data': path.resolve(__dirname, '../../packages/data/src'),
    '@runedeck/ui': path.resolve(__dirname, '../../packages/ui/src')
  }
}
```

## Next Steps

1. **Install dependencies** (if not done):
   ```bash
   pnpm install
   ```

2. **Run SvelteKit sync** (generates types):
   ```bash
   cd apps/desktop
   pnpm exec svelte-kit sync
   ```

3. **Clear Vite cache**:
   ```bash
   # PowerShell
   Remove-Item -Recurse -Force apps\desktop\node_modules\.vite -ErrorAction SilentlyContinue

   # Or cmd
   rmdir /s /q apps\desktop\node_modules\.vite 2>nul
   ```

4. **Start dev server**:
   ```bash
   pnpm run dev:desktop
   ```

## What Changed

**Before:**
```typescript
export * from './IDataStore.js';  // ❌ Fails - no .js file exists
```

**After:**
```typescript
export * from './IDataStore';     // ✅ Works - Vite resolves .ts
```

## Why This Works

- Vite's TypeScript loader resolves extensionless imports to `.ts` files
- Path aliases point directly to source folders
- No build step needed for development
- SvelteKit compiles everything at runtime

## Verification

After starting the dev server, you should see:
- No "Cannot find module" errors
- Home page loads at http://localhost:5173
- Import CSV screen accessible
- Sample deck imports successfully

If you still see errors, check:
1. All imports in `packages/` are extensionless
2. Vite aliases are correct (use `__dirname` not `process.cwd()`)
3. SvelteKit sync has run (creates `.svelte-kit/tsconfig.json`)
