# Storage Error Fix Guide

## Problem
You're experiencing database persistence errors:
- "No space left on device (os error 28)"
- "Failed to compact database"
- "Another write batch or compaction is already active"

## Root Cause
Your disk is **99% full** (only 3.1GB free out of 228GB). This causes:
1. Browser storage (IndexedDB/localStorage) to fail
2. Next.js cache to fail
3. Database compaction to fail

## Immediate Solutions

### 1. ✅ Already Done: Cleared Next.js Cache
- Removed `.next` directory (freed ~5.5GB)
- Restart your dev server: `npm run dev`

### 2. Clear Browser Storage

**Option A: Use Browser DevTools**
1. Open Chrome DevTools (F12)
2. Go to **Application** tab
3. Click **Clear storage** in the left sidebar
4. Check all boxes and click **Clear site data**
5. Refresh the page

**Option B: Use Browser Console**
Run this in your browser console:
```javascript
// Clear localStorage
localStorage.clear();

// Clear sessionStorage  
sessionStorage.clear();

// Clear IndexedDB
indexedDB.databases().then(dbs => {
  dbs.forEach(db => indexedDB.deleteDatabase(db.name));
});

// Refresh page
location.reload();
```

### 3. Free Up More Disk Space

**Check what's using space:**
```bash
# Check disk usage
df -h

# Find large directories
du -sh ~/* | sort -hr | head -20

# Common culprits:
# - ~/Library/Caches (browser caches)
# - ~/Downloads
# - ~/.npm (npm cache)
# - Docker images/containers
```

**Quick cleanup commands:**
```bash
# Clear npm cache
npm cache clean --force

# Clear browser caches (Chrome)
rm -rf ~/Library/Caches/Google/Chrome

# Clear Docker (if using)
docker system prune -a

# Clear system logs
sudo rm -rf /private/var/log/*
```

### 4. Prevent Future Issues

The codebase now includes:
- ✅ Error handling in `storageUtils.ts`
- ✅ Safe storage wrappers that handle quota errors
- ✅ Automatic cleanup when storage is full

## Long-term Solutions

1. **Monitor Disk Space**: Set up alerts when disk usage > 90%
2. **Regular Cleanup**: Schedule periodic cleanup of:
   - Next.js `.next` cache
   - Browser caches
   - npm cache
   - Docker images
3. **Storage Limits**: Consider implementing storage size limits in the app

## Testing

After clearing storage and freeing space:
1. Restart dev server
2. Clear browser storage (see above)
3. Refresh the page
4. The app should work normally

If errors persist:
- Check disk space: `df -h`
- Check browser console for specific errors
- Try incognito/private browsing mode
