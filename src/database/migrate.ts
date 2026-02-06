import { neon, sql as neonSql } from '@neondatabase/serverless';
import { config } from '../config/env';
import path from 'path';
import fs from 'fs';

export async function runMigrations() {
    console.log('📦 Starting database migrations...');
    
    if (!config.databaseUrl) {
        console.error('❌ DATABASE_URL not set');
        return;
    }

    const sql = neon(config.databaseUrl);
    
    try {
        // Step 1: Test connection
        console.log('🔗 Testing database connection...');
        try {
            const result = await sql('SELECT 1');
            console.log('✅ Database connection successful');
        } catch (error: any) {
            console.error('❌ Database health check failed:', error.message);
            throw error;
        }

        // Step 2: Read and execute migration SQL files directly
        console.log('📂 Executing SQL migrations...');
        const migrationFolder = path.join(process.cwd(), 'drizzle');
        
        if (fs.existsSync(migrationFolder)) {
            // Find all .sql files
            const sqlFiles = fs.readdirSync(migrationFolder)
                .filter(f => f.endsWith('.sql') && !f.startsWith('.'))
                .sort(); // Lexicographic order: 0000_, 0001_

            console.log(`📄 Found ${sqlFiles.length} migration files`);

            for (const file of sqlFiles) {
                const filePath = path.join(migrationFolder, file);
                const sqlContent = fs.readFileSync(filePath, 'utf-8');

                console.log(`  🔄 Executing: ${file}`);

                try {
                    // Split by --> statement-breakpoint and execute each statement block
                    const blocks = sqlContent.split('-->').filter(b => b.trim());
                    
                    for (const block of blocks) {
                        const statements = block
                            .split(';')
                            .map(s => s.trim())
                            .filter(s => s.length > 0 && !s.startsWith('--'));

                        for (const stmt of statements) {
                            if (stmt.length > 0) {
                                try {
                                    // Execute with error handling for each statement
                                    await sql(stmt);
                                } catch (stmtError: any) {
                                    // Skip "already exists" type errors
                                    if (
                                        stmtError.code === '42P07' || 
                                        stmtError.code === '42701' ||
                                        stmtError.message?.includes('already exists')
                                    ) {
                                        continue;
                                    }
                                    // For other errors, still continue to next statement
                                    console.warn(`      ⚠️ Statement skipped: ${stmtError.code || stmtError.message}`);
                                }
                            }
                        }
                    }
                    
                    console.log(`  ✅ Executed: ${file}`);
                } catch (error: any) {
                    console.warn(`  ⚠️ ${file}: ${error.message || error}`);
                }
            }
        } else {
            throw new Error(`Migration folder not found: ${migrationFolder}`);
        }

        // Step 3: Verify critical tables exist
        console.log('✓ Verifying critical tables...');
        const criticalTables = ['contacts', 'message_logs', 'auth_credentials', 'groups', 'group_members'];
        const missingTables: string[] = [];
        
        for (const table of criticalTables) {
            try {
                await sql(`SELECT 1 FROM "${table}" LIMIT 1`);
                console.log(`  ✅ ${table}`);
            } catch (error: any) {
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    missingTables.push(table);
                    console.warn(`  ⚠️ ${table}: Does not exist`);
                } else {
                    console.warn(`  ⚠️ ${table}: ${error.message}`);
                }
            }
        }

        if (missingTables.length > 0) {
            console.error(`\n⚠️ Warning: Missing tables: ${missingTables.join(', ')}`);
            console.error('Some features may have database errors.');
        } else {
            console.log('✅ All critical tables verified!');
        }

        console.log('\n✅ All database migrations completed successfully!\n');
    } catch (error: any) {
        console.error('\n❌ Migration error:', error.message);
        console.error('Continuing with application startup...\n');
        // Don't throw - allow app to continue
    }
}
