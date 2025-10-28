# RuneDeck Deployment Guide

## What's Now Available

### ✅ Two Study Modes

**1. Recall Mode (Default - "Minimal")**
- Shows **only** the prompt (definition OR word)
- Forces active recall
- Press R to reveal answer + all details
- Perfect for testing yourself

**2. Study Mode ("Rich")**
- Shows full card details immediately for new cards
- Good for first exposure to rare/complex words
- Still requires recall for retention cards

### ✅ Two Orientations

**1. Word → Definition (Default)**
- Front: Headword + IPA
- Back: Definition + example + etymology + mnemonic

**2. Definition → Word**
- Front: Definition
- Back: Headword + all details

Mix and match in Settings!

---

## Deploy to Vercel (One-Time Setup)

### Prerequisites

```bash
# Make sure pnpm is installed
npm install -g pnpm

# Install Vercel CLI globally
npm install -g vercel
```

### Step 1: Build the App

```bash
cd d:\CODING\DICAPP

# Build static PWA
pnpm -C apps/desktop build
```

Output will be in `apps/desktop/build/`

### Step 2: Deploy to Vercel

```bash
cd apps/desktop

# First time: vercel will ask questions
vercel --prod

# Questions:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? runedeck (or your choice)
# - Directory? ./ (current directory)
# - Override settings? Yes
# - Output directory? build
```

You'll get a URL like: `https://runedeck-xxx.vercel.app`

### Step 3: Add Custom Domain (Optional)

#### In Vercel Dashboard:
1. Go to Project → Settings → Domains
2. Click "Add Domain"
3. Enter your domain (e.g., `cards.yourdomain.com`)

#### In DNS Provider:
Add these records:

**For apex domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For subdomain (app.yourdomain.com):**
```
Type: CNAME
Name: app
Value: cname.vercel-dns.com
```

Wait 5-10 minutes for DNS propagation. Vercel auto-provisions SSL.

---

## How the Study Modes Work

### Minimal (Recall-First) - Default

```
WORD → DEF Mode:
┌────────────────────┐
│   SUSURRUS         │  ← You see this
│   /suˈsʌr.əs/      │
└────────────────────┘
         ↓ Press R
┌────────────────────┐
│   DEFINITION       │
│   soft murmuring   │  ← Revealed
│   (+ example, etc) │
└────────────────────┘

DEF → WORD Mode:
┌────────────────────┐
│   DEFINITION       │
│   soft murmuring   │  ← You see this
└────────────────────┘
         ↓ Press R
┌────────────────────┐
│   SUSURRUS         │  ← Revealed
│   + IPA, example   │
└────────────────────┘
```

### Rich (Study-First)

For **new cards** only, shows everything immediately:
```
┌────────────────────┐
│   SUSURRUS         │
│   soft murmuring   │  ← All visible
│   example, mnemonic│
└────────────────────┘
```

Mature cards still require recall.

---

## Usage Flow

### First Time Using the App

1. **Import Vocabulary**
   - Home → Import CSV
   - Upload `scripts/sample-deck.csv` (50 words)
   - Wait for import

2. **Choose Your Mode** (Settings)
   - **Recall-first?** → Minimal + Word→Def (default)
   - **Study-first?** → Rich + Def→Word
   - Toggle anytime

3. **Start Reviewing**
   - Home → Start Review
   - R to reveal
   - 1-4 to grade
   - Repeat

### Recommended Settings

**For Active Recall (Best for retention):**
- Orientation: Word → Definition
- Learning Reveal: Minimal

**For New/Rare Words (Gentler learning):**
- Orientation: Definition → Word
- Learning Reveal: Rich

**For Testing Reverse Recognition:**
- Orientation: Definition → Word
- Learning Reveal: Minimal

---

## Vercel Deployment Details

### What Gets Deployed

- **Build output:** `apps/desktop/build/`
- **Static files:** HTML, JS, CSS, WASM
- **Database:** IndexedDB (client-side, local to browser)
- **No server:** Fully client-side PWA

### File Structure

```
build/
├── index.html          # SPA entry point
├── _app/               # SvelteKit assets
│   ├── immutable/      # Versioned JS/CSS
│   └── version.json
├── sql-wasm.wasm       # SQLite WASM (645KB)
└── favicon.png
```

### Performance

- **First load:** ~1.5 MB (includes WASM)
- **Cached:** < 50 KB (only data changes)
- **Offline:** Fully functional after first load
- **No API costs:** Everything runs in browser

### Vercel Configuration

File: `apps/desktop/vercel.json` (optional, auto-detected)

```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "build",
  "framework": "sveltekit",
  "installCommand": "pnpm install"
}
```

---

## Updating the Deployment

After making code changes:

```bash
# Rebuild
pnpm -C apps/desktop build

# Redeploy
cd apps/desktop
vercel --prod
```

Vercel automatically:
- Runs the build
- Deploys to production
- Updates your domain
- Provisions SSL

---

## Troubleshooting

### Build fails with "adapter not found"

```bash
pnpm -C apps/desktop add -D @sveltejs/adapter-static
```

### WASM file 404

Check `apps/desktop/static/sql-wasm.wasm` exists (645 KB).
If missing:

```bash
cp node_modules/sql.js/dist/sql-wasm.wasm apps/desktop/static/
```

### Settings not persisting

Check browser localStorage is enabled. Settings stored as:
- `theme`: "dark" | "light"
- `settings`: JSON with study mode options

### Deploy works but app doesn't load

1. Check browser console for errors
2. Verify WASM file loaded (Network tab)
3. Ensure SSR is disabled (`+layout.ts` has `export const ssr = false`)

---

## Cost Breakdown

### Vercel Free Tier

- **Bandwidth:** 100 GB/month
- **Builds:** 6,000 minutes/month
- **Domains:** Unlimited custom domains
- **SSL:** Free automatic HTTPS

**RuneDeck usage:**
- ~1.5 MB per user first load
- ~67 users = 100 MB
- **You can serve ~67,000 first-time users per month free**

After caching, repeat visits cost < 50 KB.

### Upgrade ($20/month)

- 1 TB bandwidth
- 24,000 build minutes
- Analytics included

---

## Next Steps

1. **Build:** `pnpm -C apps/desktop build`
2. **Deploy:** `cd apps/desktop && vercel --prod`
3. **Test:** Open the Vercel URL
4. **Import:** Upload sample CSV
5. **Study:** Try both Minimal and Rich modes
6. **(Optional) Add custom domain**

The app is now:
- ✅ Online
- ✅ Offline-capable
- ✅ SSL secured
- ✅ Zero server costs
- ✅ Proper recall mode

---

## Recap: The Two Problems, Solved

### 1. "It shows everything" → FIXED

**Before:** Learning cards always showed full details (can't recall).

**Now:**
- **Minimal mode (default):** Hides answer until R pressed
- **Rich mode:** Shows details on new cards only
- **Setting:** Toggle in Settings → Study Mode

### 2. "Put it online" → FIXED

**One command:**
```bash
vercel --prod
```

**Result:**
- Live at `https://yourapp.vercel.app`
- Works offline after first load
- Auto-updates on git push (if linked)
- Free SSL, free hosting

---

**You're live. Go study.**
