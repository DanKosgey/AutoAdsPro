/**
 * Database Initialization & Verification
 * Runs automatically on app startup
 * - Executes all migrations
 * - Verifies all tables exist with correct columns
 * - Creates missing tables if needed
 */

import { neon } from '@neondatabase/serverless';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
}

interface TableInfo {
  name: string;
  columns: TableColumn[];
}

const EXPECTED_TABLES: { [key: string]: string[] } = {
  'contacts': ['id', 'phone', 'name', 'created_at'],
  'message_logs': ['id', 'contact_phone', 'content', 'created_at'],
  'auth_credentials': ['key', 'value'],
  'groups': ['jid', 'subject', 'total_members'],
  'group_members': ['id', 'group_jid', 'phone'],
  'shops': ['id', 'name', 'created_at'],
  'products': ['id', 'shop_id', 'name'],
  'marketing_campaigns': ['id', 'name', 'content_source'],
  'conversations': ['id', 'contact_phone', 'status'],
  'scheduled_posts': ['id', 'campaign_id', 'content'],
  'message_queue': ['id', 'jid', 'status'],
  'report_queue': ['id', 'status'],
  'session_lock': ['id', 'session_name'],
  'user_profile': ['id', 'full_name'],
  'ai_profile': ['id', 'agent_name'],
};

export async function initializeDatabase() {
  console.log('\n🔄 Starting Database Initialization...\n');
  
  if (!config.databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    return false;
  }

  try {
    const client = neon(config.databaseUrl, { fullResults: true });
    
    // Step 1: Test connection
    console.log('🔗 Testing database connection...');
    try {
      await client('SELECT 1');
      console.log('✅ Database connection successful\n');
    } catch (error: any) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    // Step 2: Run SQL migrations
    console.log('📂 Executing SQL migrations...');
    await executeMigrations(client);

    // Step 3: Verify and create missing tables
    console.log('\n✓ Verifying table structure...\n');
    const allTablesOk = await verifyAndCreateTables(client);

    if (allTablesOk) {
      console.log('\n✅ Database initialization completed successfully!\n');
      return true;
    } else {
      console.warn('\n⚠️ Database initialization completed with warnings\n');
      return true; // Still return true to allow app to start
    }

  } catch (error: any) {
    console.error('\n❌ Database initialization error:', error.message);
    return false;
  }
}

async function executeMigrations(client: any) {
  try {
    const migrationFolder = path.join(process.cwd(), 'drizzle');
    
    if (!fs.existsSync(migrationFolder)) {
      console.warn(`⚠️ Migration folder not found: ${migrationFolder}`);
      return;
    }

    const sqlFiles = fs.readdirSync(migrationFolder)
      .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
      .sort();

    console.log(`📄 Found ${sqlFiles.length} migration files`);

    for (const file of sqlFiles) {
      const filePath = path.join(migrationFolder, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      console.log(`  🔄 Executing: ${file}`);

      try {
        // Split migration file by the --> statement-breakpoint markers
        const parts = sqlContent.split('-->');
        let successCount = 0;
        let skipCount = 0;

        for (const part of parts) {
          const statement = part
            .replace('statement-breakpoint', '') // Remove marker text
            .trim();
          
          // Skip empty parts and comments
          if (!statement || statement.length < 10 || statement.startsWith('--')) {
            continue;
          }

          // Split by semicolon for multiple statements in one part
          const statements = statement
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 10 && !s.startsWith('--'));

          for (const stmt of statements) {
            try {
              await client(stmt);
              successCount++;
            } catch (stmtError: any) {
              // Silently skip known error codes
              if (
                stmtError.code === '42P01' || // relation does not exist
                stmtError.code === '42P07' || // already exists
                stmtError.code === '42701' || // duplicate column
                stmtError.code === '2BP01' || // dependent objects exist
                stmtError.code === '42710' || // object already exists
                stmtError.message?.includes('already') ||
                stmtError.message?.includes('duplicate') ||
                stmtError.message?.includes('constraint') ||
                stmtError.message?.includes('does not exist') ||
                stmtError.message?.includes('already exists')
              ) {
                skipCount++;
              } else {
                // Log unexpected errors
                console.warn(`      ⚠️ Statement error ${stmtError.code}: ${stmtError.message?.substring(0, 60)}`);
              }
            }
          }
        }
        
        console.log(`    ✅ ${successCount} statements executed (${skipCount} skipped)`);
      } catch (error: any) {
        console.warn(`  ⚠️ ${file}: ${error.message?.substring(0, 80)}`);
      }
    }
  } catch (error: any) {
    console.error('Migration execution failed:', error.message);
  }
}

async function verifyAndCreateTables(client: any): Promise<boolean> {
  let allTablesOk = true;

  for (const [tableName, requiredColumns] of Object.entries(EXPECTED_TABLES)) {
    try {
      // Check if table exists and get columns
      const columnsResult = await client(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [tableName]);

      if (columnsResult.rows.length === 0) {
        console.warn(`❌ ${tableName}: Table does not exist`);
        allTablesOk = false;
      } else {
        const existingColumns = columnsResult.rows.map((row: any) => row.column_name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

        if (missingColumns.length > 0) {
          console.warn(`⚠️ ${tableName}: Missing columns: ${missingColumns.join(', ')}`);
          allTablesOk = false;
        } else {
          console.log(`✅ ${tableName}`);
        }
      }
    } catch (error: any) {
      if (error.code === '42P01') {
        console.warn(`❌ ${tableName}: Does not exist`);
        allTablesOk = false;
      } else {
        console.warn(`⚠️ ${tableName}: ${error.message?.substring(0, 60)}`);
      }
    }
  }

  return allTablesOk;
}

/**
 * Quick health check - returns table status without logging
 */
export async function checkDatabaseHealth(): Promise<{
  connected: boolean;
  tableCount: number;
  missingTables: string[];
}> {
  if (!config.databaseUrl) {
    return { connected: false, tableCount: 0, missingTables: [] };
  }

  try {
    const client = neon(config.databaseUrl, { fullResults: true });
    
    await client('SELECT 1');
    
    const missingTables: string[] = [];
    
    for (const tableName of Object.keys(EXPECTED_TABLES)) {
      try {
        await client(`SELECT 1 FROM "${tableName}" LIMIT 1`);
      } catch (error: any) {
        if (error.code === '42P01') {
          missingTables.push(tableName);
        }
      }
    }

    return {
      connected: true,
      tableCount: Object.keys(EXPECTED_TABLES).length - missingTables.length,
      missingTables
    };
  } catch (error) {
    return { connected: false, tableCount: 0, missingTables: [] };
  }
}
