import * as fs from 'fs';
import * as path from 'path';

// Read the SQL migration file
const sqlPath = path.join(__dirname, '../drizzle/0000_marvelous_nuke.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// Split migration file by the --> statement-breakpoint markers
const parts = sqlContent.split('-->');
let totalStatements = 0;

console.log(`\n${'='.repeat(80)}\n`);
console.log(`Processing ${parts.length} parts from migration file\n`);

for (let idx = 0; idx < parts.length; idx++) {
  const part = parts[idx];
  const statement = part.trim();
  
  // Skip empty parts and comments
  if (!statement || statement.startsWith('statement-breakpoint')) {
    console.log(`Part ${idx}: SKIPPED (empty or starts with statement-breakpoint)`);
    continue;
  }

  // Remove the "statement-breakpoint" text if present  
  const cleanStatement = statement
    .replace('statement-breakpoint', '')
    .trim();

  // Split by semicolon for multiple statements in one block
  const statements = cleanStatement
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 10 && !s.startsWith('--'));

  console.log(`Part ${idx}: ${statements.length} statement(s) after splitting by semicolon`);
  
  for (let i = 0; i < statements.length && i < 2; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 80).replace(/\n/g, ' ');
    console.log(`  [${i}] ${preview}...`);
    if (stmt.includes('CREATE TABLE')) {
      const match = stmt.match(/CREATE TABLE[^"]+"(\w+)"/);
      if (match) console.log(`       → Table: ${match[1]}`);
    }
  }

  totalStatements += statements.length;
}

console.log(`\n${'='.repeat(80)}`);
console.log(`Total executable statements: ${totalStatements}`);
