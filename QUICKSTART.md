# RuneDeck - Quick Start

Get from zero to studying vocabulary in under 5 minutes.

## One-Command Setup (If Prerequisites Installed)

```bash
cd d:\CODING\DICAPP
pnpm install && pnpm run dev:desktop
```

Then in the app:
1. Click **Import CSV**
2. Upload `scripts/sample-deck.csv`
3. Click **Start Review**
4. Use keyboard: **R** to reveal, **1-4** to grade

---

## Step-by-Step (First Time)

### 1. Check Prerequisites (2 min)

```bash
# Node.js 18+
node --version

# pnpm 8+ (install if needed)
npm install -g pnpm
pnpm --version

# Rust (install if needed: https://rustup.rs/)
rustc --version
```

### 2. Install Dependencies (3 min)

```bash
cd d:\CODING\DICAPP
pnpm install
```

This installs:
- All Node packages (SvelteKit, Tauri, Tailwind, etc.)
- Rust dependencies (Tauri runtime, SQL plugin)
- Workspace links between packages

### 3. Launch Desktop App (1 min)

```bash
pnpm run dev:desktop
```

Wait for:
- Vite dev server: `http://localhost:5173`
- Tauri window to open automatically
- Hot reload enabled

### 4. Import Sample Vocabulary (1 min)

In the app window:
1. Click **Import CSV** button
2. Browse to `d:\CODING\DICAPP\scripts\sample-deck.csv`
3. Review 50 words in preview table
4. Click **Import Words**
5. Wait for success message (~2 seconds)

### 5. Start Studying! (∞)

1. Click **Return Home** or use back arrow
2. Check stats: 50 new, 0 learning, 0 retention
3. Click **Start Review**
4. See your first card (e.g., "susurrus")
5. Read definition, etymology, mnemonic
6. Press **3** (Good) or click button
7. Next card appears automatically
8. Repeat for 10 new cards (default limit)
9. Session complete!

---

## Keyboard Reference Card

```
┌─────────────────────────────────┐
│ RuneDeck Keyboard Shortcuts    │
├─────────────────────────────────┤
│ R       Reveal card (retention) │
│ 1       Grade: Again (forgot)   │
│ 2       Grade: Hard (difficult) │
│ 3       Grade: Good (correct)   │
│ 4       Grade: Easy (perfect)   │
│ Esc     Exit to home            │
└─────────────────────────────────┘
```

---

## Troubleshooting Quick Fixes

### "Command not found: pnpm"
```bash
npm install -g pnpm
```

### "Rust compiler not found"
Download installer: https://rustup.rs/

### "tauri-plugin-sql error"
```bash
cd apps/desktop
pnpm install --force
```

### App won't launch
```bash
# Delete build cache
rm -rf apps/desktop/.svelte-kit
rm -rf apps/desktop/build

# Reinstall
pnpm install
pnpm run dev:desktop
```

### Database locked
Close all app windows, then:
```bash
# Find and delete database
# Windows: %APPDATA%/com.runedeck.app/runedeck.db
# macOS: ~/Library/Application Support/com.runedeck.app/runedeck.db
# Linux: ~/.config/com.runedeck.app/runedeck.db
```

---

## What to Try Next

### Explore Settings
- Toggle dark/light theme (sun/moon button)
- Adjust new cards per day (1-50)
- Change leech threshold (3-20)

### Test Clinic Mode
1. Grade a card with **1** (Again) multiple times
2. When lapses reach 8, it becomes a leech
3. Home screen shows Clinic button with count
4. Click Clinic to edit mnemonics

### Export Your Data
- Settings → Export as CSV (reimport later)
- Settings → Export as JSON (includes review history)

### Build Production App
```bash
pnpm run build:desktop
```
Find installer in `apps/desktop/src-tauri/target/release/bundle/`

---

## Daily Workflow

**Morning Routine** (5 min):
1. Launch RuneDeck
2. Review due cards (showed on home screen)
3. Learn new cards (10 per day default)
4. Check leeches in Clinic if any

**Evening Routine** (2 min):
1. Review any remaining due cards
2. Adjust settings if needed
3. Export data as backup

---

## Learning Tips

### Effective Mnemonics
- Use vivid imagery
- Connect to existing knowledge
- Make it personal or funny
- Sound-alikes work great (e.g., "susurrus" → snakes hiss)

### Grading Honestly
- **Again (1)**: Completely forgot
- **Hard (2)**: Struggled to recall
- **Good (3)**: Recalled with effort
- **Easy (4)**: Instant recall

Don't be too easy on yourself - honest grading = better retention!

### Dealing with Leeches
- Review etymology for deeper understanding
- Create better mnemonics in Clinic
- Study example sentences
- Consider German gloss for pattern recognition

---

## Sample Vocabulary Highlights

The included deck features:

**Mythic Rarity** (freq < 2.0):
- incunabula - early printed books
- noctilucent - glowing at night
- fulgent - brilliantly shining

**Rare** (freq < 2.5):
- peregrinate - to wander
- fulgurate - flash like lightning
- eldritch - eerily sinister

**Uncommon** (freq < 3.0):
- susurrus - soft murmuring sound
- cerulean - deep blue
- gossamer - delicate, filmy

Perfect for writers, poets, and word lovers!

---

## Ready?

```bash
cd d:\CODING\DICAPP
pnpm install
pnpm run dev:desktop
```

Happy studying! 🎴✨

---

## Getting Help

- Technical issues: See [SETUP.md](SETUP.md)
- Features: See [README.md](README.md)
- Status: See [STATUS.md](STATUS.md)
