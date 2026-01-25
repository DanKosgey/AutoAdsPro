import { db } from '../database';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add AI Profile and User Profile tables
 * Run this script to create the new tables in Neon database
 */

async function migrate() {
    console.log('🔄 Running migration: Add AI Profile and User Profile tables...');

    try {
        // Create ai_profile table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS ai_profile (
                id SERIAL PRIMARY KEY,
                agent_name VARCHAR(100) DEFAULT 'Representative',
                agent_role TEXT DEFAULT 'Personal Assistant',
                personality_traits TEXT DEFAULT 'Professional, helpful, and efficient',
                communication_style TEXT DEFAULT 'Friendly yet professional',
                system_prompt TEXT,
                greeting_message TEXT,
                response_length VARCHAR(20) DEFAULT 'medium',
                use_emojis BOOLEAN DEFAULT true,
                formality_level INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Created ai_profile table');

        // Create user_profile table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS user_profile (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100),
                preferred_name VARCHAR(50),
                title VARCHAR(100),
                company VARCHAR(200),
                email VARCHAR(255),
                phone VARCHAR(50),
                location VARCHAR(200),
                timezone VARCHAR(50),
                industry VARCHAR(100),
                role TEXT,
                responsibilities TEXT,
                working_hours TEXT,
                availability TEXT,
                priorities TEXT,
                background_info TEXT,
                communication_preferences TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Created user_profile table');

        console.log('🎉 Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
