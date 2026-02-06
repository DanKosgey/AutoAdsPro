import * as fs from 'fs';
import * as path from 'path';

const sqlPath = path.join(__dirname, '../drizzle/0002_add_content_source.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

console.log('📄 Raw file size:', sqlContent.length);
console.log('📄 Raw content:');
console.log(JSON.stringify(sqlContent));

const parts = sqlContent.split('-->');
console.log(`\n✅ Split by --> gives ${parts.length} parts`);

parts.forEach((part, idx) => {
  const statement = part
    .replace('statement-breakpoint', '')
    .trim();
    
  console.log(`\nPart ${idx}:`);
  console.log(`  Length: ${statement.length}`);
  console.log(`  Starts with --: ${statement.startsWith('--')}`);
  console.log(`  Content: ${JSON.stringify(statement.substring(0, 100))}`);

  if (!statement || statement.length < 10 || statement.startsWith('--')) {
    console.log(`  -> SKIPPED (empty or comment)`);
    return;
  }

  const statements = statement
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  console.log(`  Statements after split by semicolon: ${statements.length}`);
  statements.forEach((s, i) => {
    console.log(`    [${i}] (${s.length} chars): ${s.substring(0, 60)}...`);
  });
});
