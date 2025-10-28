# RuneDeck Setup Guide

## Prerequisites

### Required Software

1. **Node.js 18+**
   ```bash
   node --version  # Should be v18.0.0 or higher
   ```

2. **pnpm 8+**
   ```bash
   npm install -g pnpm
   pnpm --version  # Should be 8.0.0 or higher
   ```

3. **Rust** (for Tauri desktop builds)
   - Windows: Download from [rustup.rs](https://rustup.rs/)
   - After install: `rustc --version`

4. **Tauri Prerequisites**
   - Windows: Microsoft Visual Studio C++ Build Tools
   - macOS: Xcode Command Line Tools
   - Linux: See [Tauri docs](https://tauri.app/v2/guides/prerequisites/)

## Quick Start

### 1. Install Dependencies

```bash
cd d:\CODING\DICAPP
pnpm install
```

This will:
- Install all workspace dependencies
- Link workspace packages together
- Set up Tauri Rust dependencies

### 2. Run Desktop App in Development

```bash
pnpm run dev:desktop
```

This will:
- Start Vite dev server on http://localhost:5173
- Launch Tauri window with hot reload
- Create SQLite database automatically

### 3. Import Sample Vocabulary

1. In the app, click **Import CSV**
2. Upload `scripts/sample-deck.csv`
3. Review the 50 imported words
4. Return home and click **Start Review**

## Build Desktop App

### Development Build

```bash
pnpm run dev:desktop
```

### Production Build

```bash
pnpm run build:desktop
```

Output locations:
- **Windows**: `apps/desktop/src-tauri/target/release/bundle/msi/RuneDeck_1.0.0_x64_en-US.msi`
- **macOS**: `apps/desktop/src-tauri/target/release/bundle/dmg/RuneDeck_1.0.0_x64.dmg`
- **Linux**: `apps/desktop/src-tauri/target/release/bundle/deb/runedeck_1.0.0_amd64.deb`

## Testing

### Run Unit Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test --watch
```

## Troubleshooting

### Issue: "tauri command not found"

Install Tauri CLI:
```bash
pnpm add -D @tauri-apps/cli -w
```

### Issue: Rust build errors on Windows

1. Install Visual Studio Build Tools with C++ workload
2. Restart terminal
3. Try `rustc --version` to verify

### Issue: "Cannot find module '@tauri-apps/plugin-sql'"

```bash
cd apps/desktop
pnpm install
```

### Issue: Hot reload not working

1. Stop dev server (Ctrl+C)
2. Delete `.svelte-kit` folder
3. Run `pnpm run dev:desktop` again

### Issue: Database locked errors

Close all app instances and delete `runedeck.db` to start fresh.

## Development Workflow

### Adding New Words

1. Edit `scripts/sample-deck.csv`
2. Import via UI
3. Or programmatically via `dataStore.batchImportWords()`

### Modifying Theme

Edit CSS variables in `apps/desktop/src/app.css`:
```css
:root {
  --accent-1: #bfa76a;  /* Primary gold */
  --accent-2: #6ea2ff;  /* Secondary blue */
  /* ... */
}
```

### Database Schema Changes

1. Add new migration to `packages/data/src/schema.ts`
2. Increment `SCHEMA_VERSION`
3. Restart app to apply migration

### Adding New Routes

Create new folder in `apps/desktop/src/routes/`:
```
routes/
  my-feature/
    +page.svelte
```

SvelteKit will auto-detect the route at `/my-feature`.

## Next Steps

1. **Try the App**: Import sample deck and review cards
2. **Customize**: Edit theme, adjust settings
3. **Build**: Create production installer
4. **Export**: Backup your data via Settings → Export

## Known Limitations (MVP)

- No FSRS algorithm yet (SM-2 only)
- No .apkg import (Anki files)
- No audio/TTS
- No cloud sync
- No mobile apps
- PWA build not yet configured

These are planned for future phases.

## Getting Help

- Check [README.md](README.md) for feature documentation
- Review code comments in `packages/` for API details
- File issues for bugs or feature requests

---

Ready to memorize some rare vocabulary? Start with:

```bash
pnpm install
pnpm run dev:desktop
```

Happy studying!
