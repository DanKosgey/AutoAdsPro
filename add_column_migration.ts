
import { db } from './src/database';
import { sql } from 'drizzle-orm';

async function migrate() {
    try {
        console.log('🔄 Adding bot_joined_at column to groups table...');
        await db.execute(sql`
            ALTER TABLE groups 
            ADD COLUMN IF NOT EXISTS bot_joined_at TIMESTAMP DEFAULT NOW();
        `);
        console.log('✅ Migration complete');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
