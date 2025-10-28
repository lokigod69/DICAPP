# RuneDeck - Architecture Overview

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    RuneDeck Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐      ┌──────────────────────┐   │
│  │   Desktop (Tauri)    │      │    Web (PWA)         │   │
│  │  • Windows/Mac/Linux │      │  • Browser-based     │   │
│  │  • Native binary     │      │  • Offline capable   │   │
│  │  • SQLite via Rust   │      │  • sql.js (WASM)     │   │
│  └──────────┬───────────┘      └──────────┬───────────┘   │
│             │                              │               │
│             └──────────┬───────────────────┘               │
│                        │                                   │
│              ┌─────────▼──────────┐                        │
│              │   SvelteKit UI     │                        │
│              │  • Screens         │                        │
│              │  • Components      │                        │
│              │  • Stores          │                        │
│              └─────────┬──────────┘                        │
│                        │                                   │
│              ┌─────────▼──────────┐                        │
│              │   Data Package     │                        │
│              │  • IDataStore      │                        │
│              │  • SqliteStore     │                        │
│              │  • WasmSqliteStore │                        │
│              └─────────┬──────────┘                        │
│                        │                                   │
│              ┌─────────▼──────────┐                        │
│              │   Core Package     │                        │
│              │  • Models          │                        │
│              │  • SM-2 Scheduler  │                        │
│              │  • Queue Builder   │                        │
│              │  • CSV Parser      │                        │
│              └────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Package Dependency Graph

```
apps/desktop  ────────┐
                      │
                      ├──> packages/ui ──────┐
                      │                       │
                      ├──> packages/data ────┤
                      │                       │
                      └──> packages/core <───┘

Legend:
─────> depends on
```

## Data Flow

### Study Session Flow

```
1. User clicks "Start Review"
   │
   ├──> buildQueue(dataStore, config)
   │    │
   │    ├──> getDue(limit) ────> SQL: SELECT due cards
   │    ├──> getNew(limit) ────> SQL: SELECT new cards
   │    └──> getLeeches(threshold) ──> SQL: SELECT leeches
   │
   ├──> StudySession(cards)
   │    │
   │    └──> current() ────> Returns first card
   │
2. User presses '3' (Good)
   │
   ├──> gradeCard(scheduling, 3)
   │    │
   │    ├──> Calculate new interval (SM-2)
   │    ├──> Adjust ease factor
   │    ├──> Set new due_ts
   │    └──> Return updated SchedulingData
   │
   ├──> dataStore.upsertScheduling(newScheduling)
   │    │
   │    └──> SQL: INSERT/UPDATE scheduling table
   │
   ├──> dataStore.addReview(review)
   │    │
   │    └──> SQL: INSERT INTO reviews
   │
   └──> session.next()
        │
        └──> Move to next card
```

### CSV Import Flow

```
1. User uploads CSV file
   │
   ├──> readFile() ────> Get text content
   │
   ├──> previewCsv(content, 20)
   │    │
   │    ├──> Papa.parse() with preview limit
   │    └──> Return preview rows + total count
   │
2. User clicks "Import Words"
   │
   ├──> parseCsv(content)
   │    │
   │    ├──> Papa.parse() full file
   │    ├──> Validate each row with Zod
   │    ├──> Create Word objects
   │    ├──> Collect errors
   │    └──> Return {words, errors, valid, invalid}
   │
   └──> dataStore.batchImportWords(words)
        │
        ├──> For each word:
        │    ├──> createWord(word) ──> SQL: INSERT INTO words
        │    └──> upsertScheduling(scheduling) ──> SQL: INSERT INTO scheduling
        │
        └──> Success!
```

## Storage Architecture

### Desktop (Tauri + SQLite)

```
┌──────────────────────────────────┐
│      Tauri Application           │
│                                  │
│  ┌────────────────────────────┐ │
│  │   SvelteKit Frontend       │ │
│  │   (HTML/CSS/JS)            │ │
│  └───────────┬────────────────┘ │
│              │                   │
│              │ @tauri-apps/api   │
│              │                   │
│  ┌───────────▼────────────────┐ │
│  │   Rust Backend             │ │
│  │   • tauri-plugin-sql       │ │
│  └───────────┬────────────────┘ │
│              │                   │
└──────────────┼───────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │   SQLite Database    │
    │   runedeck.db        │
    │                      │
    │   • words            │
    │   • scheduling       │
    │   • reviews          │
    │   • settings         │
    └──────────────────────┘
```

### Web (sql.js + IndexedDB)

```
┌──────────────────────────────────────────┐
│      Browser Environment                 │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │   SvelteKit Frontend              │ │
│  └────────────┬───────────────────────┘ │
│               │                          │
│               │ Import sql.js            │
│               │                          │
│  ┌────────────▼───────────────────────┐ │
│  │   sql.js (WASM SQLite)            │ │
│  │   • In-memory database             │ │
│  │   • Same SQL as desktop            │ │
│  └────────────┬───────────────────────┘ │
│               │                          │
│               │ export() / restore()     │
│               │                          │
│  ┌────────────▼───────────────────────┐ │
│  │   IndexedDB                        │ │
│  │   • Binary DB blob                 │ │
│  │   • Persistent storage             │ │
│  └────────────────────────────────────┘ │
│                                          │
└──────────────────────────────────────────┘
```

## Database Schema (ERD)

```
┌──────────────────────┐
│       words          │
├──────────────────────┤
│ id (PK)              │──┐
│ headword             │  │
│ pos                  │  │
│ ipa                  │  │
│ definition           │  │
│ example              │  │
│ gloss_de             │  │
│ etymology            │  │
│ mnemonic             │  │
│ tags (JSON)          │  │
│ freq                 │  │
│ created_at           │  │
│ updated_at           │  │
└──────────────────────┘  │
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         │                │                │
┌────────▼──────────┐ ┌───▼──────────┐ ┌──▼─────────┐
│   scheduling      │ │   reviews    │ │  settings  │
├───────────────────┤ ├──────────────┤ ├────────────┤
│ word_id (PK, FK)  │ │ id (PK)      │ │ key (PK)   │
│ due_ts            │ │ word_id (FK) │ │ value      │
│ interval          │ │ ts           │ └────────────┘
│ ease              │ │ grade        │
│ lapses            │ │ elapsed_ms   │
│ is_new            │ └──────────────┘
└───────────────────┘

Relationships:
• words 1──N scheduling (1 word → 1 scheduling row)
• words 1──N reviews (1 word → many review records)
• settings: key-value store (no FK)
```

## Component Hierarchy

```
+layout.svelte (theme context)
│
├── +page.svelte (Home)
│   ├── Stats cards
│   └── Action buttons
│
├── study/+page.svelte (Study)
│   ├── Progress bar
│   ├── Card.svelte
│   │   ├── Header (headword, POS, IPA)
│   │   ├── Body (definition, example, etymology, mnemonic)
│   │   └── Footer (tags, rarity gem)
│   ├── Reveal button (retention mode)
│   └── GradeButtons.svelte
│       ├── Again (1)
│       ├── Hard (2)
│       ├── Good (3)
│       └── Easy (4)
│
├── complete/+page.svelte (Session Complete)
│   └── Celebration + Return button
│
├── import/+page.svelte (Import)
│   ├── File upload
│   ├── Preview table
│   ├── Error list
│   └── Import button
│
├── clinic/+page.svelte (Clinic)
│   ├── Leech list (sidebar)
│   └── Mnemonic editor (main)
│
└── settings/+page.svelte (Settings)
    ├── Theme toggle
    ├── Study limits (sliders)
    ├── Export buttons
    └── About section
```

## State Management (Svelte Stores)

```
┌─────────────────────────────────┐
│        Svelte Stores            │
├─────────────────────────────────┤
│                                 │
│  themeStore                     │
│  • 'dark' | 'light'             │
│  • localStorage persistence     │
│  • toggle()                     │
│                                 │
│  settingsStore                  │
│  • newPerDay                    │
│  • dueLimit                     │
│  • leechThreshold               │
│  • localStorage persistence     │
│                                 │
│  studyStore                     │
│  • session: StudySession        │
│  • currentCard: WordWithSched   │
│  • revealed: boolean            │
│  • progress: {current, total}   │
│  • startSession(cards)          │
│  • reveal()                     │
│  • nextCard()                   │
│  • reset()                      │
│                                 │
│  dataStore (singleton)          │
│  • SqliteStore instance         │
│  • All DB methods via IDataStore│
│                                 │
└─────────────────────────────────┘
```

## SM-2 Algorithm Flow

```
Input: SchedulingData + Grade (1-4)

┌──────────────┐
│  Grade = 1?  │  YES  ──> Reset interval to 1 day
│  (Again)     │           Increment lapses
└──────┬───────┘           Decrease ease by 0.2
       │ NO                (minimum 1.3)
       │
┌──────▼───────┐
│  is_new = 1? │  YES  ──> First review:
│  (New card)  │           • Hard/Good: 1 day
└──────┬───────┘           • Easy: 2 days
       │ NO                Set ease = 2.5
       │                   Mark as not new
┌──────▼───────┐
│  Mature card │
│  (Review)    │
└──────┬───────┘
       │
       ├──> Adjust ease:
       │    ease += 0.1 - (4-grade) * (0.08 + (4-grade)*0.02)
       │    ease = max(1.3, ease)
       │
       └──> Calculate interval:
            • Grade 4 (Easy): interval * ease * 1.3
            • Other: interval * ease
            • Minimum 1 day
            • Round to nearest day

Output: Updated SchedulingData with new interval, ease, due_ts
```

## Mode Detection Logic

```
Input: SchedulingData + leechThreshold (default 8)

┌─────────────────┐
│ lapses >= 8?    │  YES  ──> CLINIC MODE
└────────┬────────┘
         │ NO
         │
┌────────▼────────┐
│ is_new = 1?     │  YES  ──> LEARNING MODE
└────────┬────────┘
         │ NO
         │
┌────────▼────────┐
│ interval < 7?   │  YES  ──> LEARNING MODE
└────────┬────────┘
         │ NO
         │
         └──────────────> RETENTION MODE
```

## Keyboard Event Flow

```
User presses key
      │
      ▼
window.keydown event
      │
      ├──> Check: input/textarea focused?  YES ──> Ignore (allow typing)
      │                                     NO
      │                                     │
      └─────────────────────────────────────┘
                │
                ▼
         ┌──────────────┐
         │ Match key?   │
         └──────┬───────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
  'r'         '1-4'       'esc'
    │           │           │
    │           │           │
Reveal()   handleGrade()  goHome()
```

## Build Pipeline

### Desktop (Tauri)

```
1. Development:
   vite dev ──> SvelteKit dev server (HMR)
                     │
                     └──> Tauri window loads localhost:5173

2. Production:
   vite build ──> SvelteKit SSG (static HTML/JS/CSS)
                     │
                     └──> Cargo build (Rust binary)
                              │
                              └──> Bundle (MSI/DMG/DEB/AppImage)
```

### Web (PWA)

```
1. Development:
   vite dev ──> SvelteKit dev server
                     │
                     └──> Browser with WasmSqliteStore

2. Production:
   vite build ──> SvelteKit static adapter
                     │
                     ├──> HTML/JS/CSS in dist/
                     ├──> Service worker (PWA)
                     └──> Manifest.json
                              │
                              └──> Deploy to Vercel/Netlify
```

## Performance Considerations

### Critical Path Optimizations

1. **Database Queries**
   - Indexed columns: `due_ts`, `lapses`, `headword`
   - Batch operations for import
   - Limit result sets (20 due, 10 new)

2. **UI Rendering**
   - Svelte's compiler optimizations
   - Lazy route loading (SvelteKit code-splitting)
   - CSS variables for instant theme switch

3. **State Updates**
   - Writable stores with minimal subscribers
   - No global state libraries (less overhead)
   - Direct DOM updates via Svelte

4. **Data Storage**
   - Desktop: Native SQLite (fast)
   - Web: sql.js in-memory + periodic persist
   - No network calls (offline-first)

### Memory Profile

- **Small Deck (100 words)**: ~5 MB total
- **Medium Deck (1000 words)**: ~20 MB total
- **Large Deck (10000 words)**: ~100 MB total

Most memory from:
- Word definitions/examples (text data)
- Review history (grows over time)
- sql.js WASM binary (web only, ~2 MB)

## Security Model

### Desktop (Tauri)

- Sandboxed WebView
- Rust backend controls file system access
- SQL injection prevented by parameterized queries
- No eval() or dynamic code execution

### Web (PWA)

- Content Security Policy (CSP)
- Same-origin policy
- IndexedDB encrypted at OS level
- No external API calls (zero attack surface)

## Testing Strategy

### Unit Tests (Vitest)

- `packages/core/scheduler/sm2.test.ts`: SM-2 algorithm
- Future: CSV parser, queue builder, model validators

### Integration Tests (Planned)

- SqliteStore CRUD operations
- WasmSqliteStore persistence
- CSV import end-to-end

### E2E Tests (Planned)

- Playwright: Import → Study → Export workflow
- Desktop and web variants

## Deployment Targets

### Desktop

- **Windows**: MSI installer, NSIS installer
- **macOS**: DMG, .app bundle
- **Linux**: DEB, AppImage, RPM (via cargo-bundle)

### Web

- **Vercel**: Static export, auto-deploy from git
- **Netlify**: Same as Vercel
- **GitHub Pages**: Manual deploy of dist/
- **Self-hosted**: Nginx serving static files

## Future Architecture Extensions

### FSRS Integration

```
packages/core/scheduler/
  ├── sm2.ts (current)
  └── fsrs.ts (new)
      ├── Import ts-fsrs
      ├── Wrap in same interface as SM-2
      └── Add config toggle in Settings
```

### Cloud Sync

```
New package: packages/sync/
  ├── E2EEService (encrypt before upload)
  ├── ConflictResolver (CRDT-based merge)
  └── SyncAdapter (WebSocket or REST)

Backend: Supabase or custom Node.js + PostgreSQL
```

### Mobile Apps

```
New apps: apps/mobile/
  ├── Capacitor (web → mobile, code reuse)
  │   ├── iOS (App Store)
  │   └── Android (Play Store)
  └── React Native (alternative, less code reuse)
      ├── Share packages/core via npm
      └── Custom UI for native feel
```

---

## Key Architectural Decisions

1. **Monorepo**: Easy code sharing, single version source of truth
2. **SvelteKit**: Smaller than React, faster builds, great DX
3. **SQL Everywhere**: Desktop SQLite === Web sql.js (portability)
4. **Offline-First**: No APIs, no costs, works on planes
5. **Keyboard-First**: Power users love it, accessibility win
6. **Theme Tokens**: Easy to customize, dark/light support
7. **Type Safety**: Zod validation + TypeScript = fewer runtime errors
8. **No Global State**: Svelte stores are enough for this app
9. **Progressive Enhancement**: Works without JS (mostly), PWA when ready
10. **User-Owned Data**: Export anytime, no lock-in

---

This architecture supports the MVP perfectly and scales to future phases (FSRS, sync, mobile) without major refactors.
