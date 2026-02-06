import * as fs from 'fs';
import * as path from 'path';

// Read the SQL migration file
const sqlPath = path.join(__dirname, '../drizzle/0000_marvelous_nuke.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

console.log('📄 SQL file size:', sqlContent.length, 'bytes');
console.log('📄 SQL file lines:', sqlContent.split('\n').length);

// Show first 500 chars
console.log('\n🔍 First 500 chars of SQL file:');
console.log(sqlContent.substring(0, 500));
console.log('\n...\n');

// Show parts around first --> marker
const firstMarker = sqlContent.indexOf('-->');
if (firstMarker !== -1) {
  console.log(`📍 First --> marker at position ${firstMarker}`);
  console.log('Context (200 chars before and after):');
  console.log(sqlContent.substring(Math.max(0, firstMarker - 200), firstMarker + 250));
}

// Split by --> and count
const parts = sqlContent.split('-->');
console.log(`\n✅ Split by --> gives ${parts.length} parts`);

// Show each part summary
parts.forEach((part, idx) => {
  const trimmed = part.trim();
  const lines = trimmed.split('\n').length;
  const preview = trimmed.substring(0, 60).replace(/\n/g, ' ');
  console.log(`\nPart ${idx}: ${lines} lines, ${trimmed.length} chars`);
  console.log(`  Preview: ${preview}...`);
  
  // Check for CREATE TABLE
  if (trimmed.includes('CREATE TABLE')) {
    const tableMatch = trimmed.match(/CREATE TABLE (\w+)/);
    console.log(`  📊 Contains: ${tableMatch ? tableMatch[1] : 'unknown table'}`);
  }
});

// Check for specific tables
console.log('\n\n📊 Tables in migration:');
const tableRegex = /CREATE TABLE (\w+)/g;
let tableMatch;
const tables = [];
while ((tableMatch = tableRegex.exec(sqlContent)) !== null) {
  tables.push(tableMatch[1]);
}
console.log('Found tables:', tables);
