/**
 * Manual migration runner - directly execute SQL migrations
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = neon(databaseUrl);

  try {
    console.log('🔗 Testing connection...');
    await client('SELECT 1');
    console.log('✅ Connected\n');

    const migrationFolder = path.join(process.cwd(), 'drizzle');
    const sqlFiles = fs.readdirSync(migrationFolder)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of sqlFiles) {
      const filePath = path.join(migrationFolder, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      console.log(`📄 Reading ${file}...`);
      console.log(`   File size: ${content.length} bytes`);
      
      // Split by --> and execute each block
      const blocks = content.split('-->').filter(b => b.trim().length > 0);
      console.log(`   Split into ${blocks.length} blocks\n`);

      let totalExecuted = 0;
      let totalSkipped = 0;

      for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        const stmts = block
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 10);

        for (const stmt of stmts) {
          try {
            await client(stmt);
            totalExecuted++;
            console.log(`✅ Statement ${totalExecuted}`);
          } catch (error: any) {
            totalSkipped++;
            if (error.code === '42P01' || error.message?.includes('does not exist')) {
              console.log(`⏭️  Skipped (missing relation): ${error.code}`);
            } else if (error.code === '42P07' || error.message?.includes('already')) {
              console.log(`⏭️  Skipped (already exists): ${error.code}`);
            } else {
              console.error(`❌ Error ${error.code}: ${error.message?.substring(0, 100)}`);
            }
          }
        }
      }

      console.log(`\n📊 ${file}: ${totalExecuted} executed, ${totalSkipped} skipped\n`);
    }

    console.log('✅ Migration complete!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

runMigration();
