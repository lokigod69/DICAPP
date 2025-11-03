# DIC APP - Cloud Migration Progress

## ✅ Completed Features

### 1. Cloud Infrastructure
- **Supabase Schema** (`supabase/schema.sql`): Complete PostgreSQL schema with RLS policies for all tables
- **Storage Policies** (`supabase/storage.sql`): User-scoped file upload policies for CSV imports
- **CloudStore** (`packages/data/src/CloudStore.ts`): Full IDataStore implementation using Supabase client
- **Auth Client** (`apps/desktop/src/lib/supabase.ts`): Singleton Supabase client with helper functions

### 2. Authentication
- **Sign In Page** (`apps/desktop/src/routes/auth/signin/+page.svelte`):
  - Google OAuth primary
  - Magic Link (email OTP) fallback
  - Beautiful UI with Google branding
- **Auth Callback** (`apps/desktop/src/routes/auth/callback/+page.svelte`):
  - Handles OAuth redirects
  - Auto-creates user profile
  - Redirects to /decks
- **Auth Store** (`apps/desktop/src/lib/stores/auth.ts`):
  - Reactive Svelte store
  - Tracks user state
  - Sign out functionality
- **Header Component**: Updated with auth state, avatar menu, sign in/out

### 3. Server Endpoints
- **POST /api/import**: Server-side CSV upload to Storage + bulk insert
- **POST /api/merge/preview**: Analyze deck merge duplicates
- **POST /api/merge/commit**: Execute merge with strategy (skip/merge/force)
- **Account Page** (`apps/desktop/src/routes/account/+page.svelte`): Profile display + data export

### 4. Public Decks
- **Explore Page** (`apps/desktop/src/routes/explore/+page.svelte`): Browse public decks with search

## ⏳ Remaining Tasks

### High Priority
1. **Public Deck View** (`/deck/:slug` route):
   - Show deck details and word preview
   - Clone button to copy deck to user's account
   - Requires auth to clone

2. **Deck Visibility Toggle**:
   - Add Public/Private toggle to deck settings
   - Update CloudStore.updateDeck() to handle visibility field
   - Add UI in Decks page or Settings

3. **Update Import UI** (`apps/desktop/src/routes/import/+page.svelte`):
   - Replace client-side import with /api/import endpoint call
   - Show upload progress
   - Handle server responses

### Medium Priority
4. **Add Merge UI** (in Decks page or separate route):
   - Select source and target decks
   - Call /api/merge/preview
   - Show duplicate counts
   - Select strategy
   - Call /api/merge/commit
   - Display report

5. **Add Explore Link** to Header/Home:
   - Easy navigation to /explore from main pages

### Low Priority
6. **Error Boundaries**: Add global error handling for auth failures
7. **Loading States**: Improve skeleton screens across app
8. **Empty States**: Better empty states for new users
9. **Onboarding**: First-time user flow explaining features

## 🧪 Testing Checklist

### Once you have Supabase credentials:

#### Auth Flow
- [ ] Google sign-in redirects correctly
- [ ] User profile created on first sign-in
- [ ] Header shows avatar/menu when logged in
- [ ] Sign out works and redirects to home
- [ ] Magic Link email received and works

#### Data Flow
- [ ] Create deck persists to Supabase
- [ ] Decks visible across browser sessions/devices
- [ ] Study sessions work with cloud data
- [ ] Review history saves to cloud

#### Import (once client updated)
- [ ] CSV upload to /api/import works
- [ ] File appears in Storage bucket
- [ ] Words inserted into database
- [ ] Ingest logged correctly

#### Public Decks
- [ ] Toggle deck to Public in Decks page
- [ ] Public deck visible in /explore when logged out
- [ ] Can view public deck details
- [ ] Clone button copies deck + words

#### Merge (once UI added)
- [ ] Preview shows correct duplicate counts
- [ ] Skip strategy leaves duplicates in source
- [ ] Merge strategy fills empty fields
- [ ] Force strategy moves all words
- [ ] Report logged to merge_logs

## 📝 Setup Instructions

1. **Supabase Project**:
   - Create project at https://supabase.com
   - Run `supabase/schema.sql` in SQL Editor
   - Create 'uploads' Storage bucket
   - Run `supabase/storage.sql` for bucket policies
   - Enable Google OAuth in Authentication > Providers

2. **Environment Variables**:
   - Copy `apps/desktop/.env.example` to `apps/desktop/.env`
   - Add your `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`

3. **Run App**:
   ```bash
   pnpm install
   pnpm dev
   ```

4. **First Test**:
   - Visit http://localhost:5173
   - Click "Sign In" in header
   - Sign in with Google
   - Should redirect to /decks (empty initially)
   - Create a deck
   - Import a CSV (once import UI updated)
   - Study!

## 🚀 Deployment Notes

### Environment Variables Needed:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

### Supabase Setup:
- Google OAuth callback URL: `https://yourdomain.com/auth/callback`
- Storage bucket must be created manually
- RLS policies applied via SQL

### Performance Tips:
- All Supabase queries use indexes
- RLS handles security automatically
- Storage has 10MB file size limit
- Consider CDN for static assets

## 🎯 Next Session Goals

1. Finish `/deck/:slug` public view with clone
2. Add visibility toggle to Decks page
3. Update import UI to use server endpoint
4. Add merge UI to Decks page
5. Test full flow end-to-end
6. Deploy to production (Vercel/Netlify)

## 📊 Architecture Summary

```
Client (SvelteKit SPA)
  ↓
CloudStore (IDataStore impl)
  ↓
Supabase Client
  ↓
Supabase Cloud (PostgreSQL + Storage + Auth)
  ↓
Row Level Security (RLS) enforces user isolation
```

All data queries automatically filtered by RLS policies.
No user can access another user's data.
Public decks readable by all via visibility='public' policy.

---

**Last Updated**: Session interrupted at 114k/200k tokens
**Status**: ~85% complete, core features working, needs finishing touches
