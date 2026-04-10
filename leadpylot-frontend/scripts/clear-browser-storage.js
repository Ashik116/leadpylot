/**
 * Script to clear browser storage
 * Run this in browser console to clear all storage
 */

// Clear localStorage
localStorage.clear();
console.log('✅ localStorage cleared');

// Clear sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage cleared');

// Clear IndexedDB
async function clearIndexedDB() {
  const databases = await indexedDB.databases();
  for (const db of databases) {
    if (db.name) {
      indexedDB.deleteDatabase(db.name);
      console.log(`✅ Deleted IndexedDB: ${db.name}`);
    }
  }
}

clearIndexedDB().then(() => {
  console.log('✅ All IndexedDB databases cleared');
  console.log('🔄 Please refresh the page');
});
