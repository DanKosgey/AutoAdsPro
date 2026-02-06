/**
 * Migration Script: Create groups and group_members tables
 * Run this to ensure the analytics tables exist for group metadata caching
 */

import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

async function createGroupsTables() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set in .env');
    process.exit(1);
  }

  const sql = neon(databaseUrl);

  try {
    console.log('🔄 Creating groups and group_members tables...');

    // Create groups table
    await sql`
      CREATE TABLE IF NOT EXISTS "groups" (
        "jid" varchar(100) PRIMARY KEY NOT NULL,
        "subject" text,
        "description" text,
        "creation_time" timestamp,
        "owner_jid" varchar(50),
        "total_members" integer DEFAULT 0,
        "admins_count" integer DEFAULT 0,
        "is_announce" boolean DEFAULT false,
        "is_restricted" boolean DEFAULT false,
        "metadata" jsonb,
        "bot_joined_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✅ groups table created successfully');

    // Create group_members table
    await sql`
      CREATE TABLE IF NOT EXISTS "group_members" (
        "id" serial PRIMARY KEY NOT NULL,
        "group_jid" varchar(100) NOT NULL,
        "phone" varchar(50) NOT NULL,
        "role" varchar(20) DEFAULT 'participant',
        "is_admin" boolean DEFAULT false,
        "joined_at" timestamp,
        "last_seen" timestamp,
        "updated_at" timestamp DEFAULT now()
      )
    `;
    console.log('✅ group_members table created successfully');

    // Add foreign key constraint
    await sql`
      DO $$ BEGIN
        ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_jid_groups_jid_fk" 
          FOREIGN KEY ("group_jid") REFERENCES "groups"("jid") ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `;
    console.log('✅ Foreign key constraint added');

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS "group_member_pair_idx" ON "group_members" ("group_jid","phone")
    `;
    console.log('✅ group_member_pair_idx index created');

    await sql`
      CREATE INDEX IF NOT EXISTS "member_role_idx" ON "group_members" ("role")
    `;
    console.log('✅ member_role_idx index created');

    console.log('✅ 🎉 All groups tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createGroupsTables();
