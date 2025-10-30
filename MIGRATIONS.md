# Database Migrations

## Schema Version History

### Version 2: Multi-Deck Support (Current)

**Applied:** Automatically on first app load after update

**Changes:**
- Added `decks` table with deck metadata and configuration
- Added `deck_id` column to `words` table
- Created default deck "Default Deck" with slug "default"
- Assigned all existing words to default deck

**Schema:**
```sql
CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  profile TEXT NOT NULL CHECK(profile IN ('simple', 'full')),
  created_at INTEGER NOT NULL,
  config_json TEXT NOT NULL
);

ALTER TABLE words ADD COLUMN deck_id TEXT REFERENCES decks(id) ON DELETE CASCADE;
```

**Migration Process:**
1. Check current schema version from `schema_version` table
2. If version < 2, execute migration 2
3. Create default deck with current app settings
4. Update all words to have `deck_id = 'default'`
5. Update schema_version to 2

**Data Preservation:**
- All existing words are preserved
- All SM-2 scheduling data (intervals, ease, lapses) is preserved
- All review history is preserved
- Current app settings are copied to default deck config

**Rollback:**
> ⚠️ **Warning:** Rolling back from v2 to v1 will cause data loss if you created multiple decks.

To rollback (NOT RECOMMENDED):
1. Export all decks individually as JSON
2. Delete the database file
3. Reinstall the old version
4. Import words from exported JSON

**Idempotent:** Migration can be run multiple times safely. It uses `INSERT OR IGNORE` and checks for existing default deck.

---

### Version 1: Initial Schema

**Changes:**
- Created `words` table with full vocabulary schema
- Created `scheduling` table for SM-2 spaced repetition data
- Created `reviews` table for review history
- Created `settings` table for app configuration
- Created `schema_version` table for migration tracking

**Schema:** See `packages/data/src/schema.ts` Migration 1

---

## Migration Safety

### Before Updating
1. **Export your data:** Use the Export function to save all decks as JSON
2. **Backup database file:**
   - Web: Export via browser DevTools → Application → IndexedDB → runedeck
   - Desktop: Copy `runedeck.db` from app data directory

### After Updating
1. Check that all words appear in default deck
2. Verify due/new counts match pre-update totals
3. Test study session to confirm SM-2 scheduling works

### Troubleshooting

**"No deck selected" error:**
- Migration didn't complete. Clear app data and re-launch.
- Default deck exists with ID "default"

**Word counts don't match:**
- Check that `deck_id` column was added: `SELECT deck_id FROM words LIMIT 1`
- Verify default deck: `SELECT * FROM decks WHERE slug = 'default'`

**Can't study cards:**
- Ensure deck selection is persisted in localStorage
- Check browser console for SQL errors

### Future Migrations

Future schema changes will follow the same pattern:
1. Add migration to `MIGRATIONS` array in `schema.ts`
2. Increment `SCHEMA_VERSION`
3. Update this document
4. Test with existing database
5. Verify rollback procedure

### Migration Support

For issues with migrations:
1. Check browser console / app logs for SQL errors
2. Export data immediately if migration fails
3. Report issue with schema version and error message
4. Do NOT manually edit database - use export/import flow

---

## Developer Notes

**Testing Migrations:**
```bash
# Create test DB with v1 schema
npm run test:migration:v1

# Apply v2 migration
npm run test:migration:v2

# Verify word counts match
npm run test:migration:verify
```

**Schema Version Check:**
```sql
SELECT version FROM schema_version ORDER BY version DESC LIMIT 1;
```

**Deck Config JSON Structure:**
```json
{
  "newPerDay": 10,
  "dueLimit": 20,
  "leechThreshold": 8,
  "studyOrientation": "word-to-def",
  "learningReveal": "minimal"
}
```
