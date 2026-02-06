import { neon } from '@neondatabase/serverless';
import { config } from '../src/config/env';

async function verifyDatabase() {
  if (!config.databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return;
  }

  const client = neon(config.databaseUrl, { fullResults: true });

  console.log('\n🔍 Checking Marketing Campaigns table structure...\n');
  
  try {
    const result = await client(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'marketing_campaigns'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in marketing_campaigns:');
    result.rows?.forEach((row: any) => {
      console.log(`  ✓ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
  } catch (error: any) {
    console.error('❌ Error querying marketing_campaigns:', error.message);
  }

  console.log('\n✅ Done');
  process.exit(0);
}

verifyDatabase();
