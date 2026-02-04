# Supabase Migration Guide

## Quick Switch: Neon → Supabase (Same Migration System!)

Your current migration setup works perfectly with Supabase. Here are two approaches:

---

## ✅ Option 1: Zero Code Changes (Just Update .env)

**Steps:**
1. Get Supabase connection string from: Project Settings → Database → Connection String
2. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
   ```
3. Restart app - migrations run automatically!

**Pros:**
- No code changes needed
- Works immediately
- Same migration files

**Cons:**
- Uses Neon's HTTP client (not optimized for Supabase)

---

## 🚀 Option 2: Use Supabase Native Client (Recommended)

### 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 2. Update `src/database/index.ts`
```typescript
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from '../config/env';
import * as schema from './schema';

if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is not defined');
}

// Use postgres.js for Drizzle (works great with Supabase)
const client = postgres(config.databaseUrl);
export const db = drizzle(client, { schema });

// Optional: Supabase client for Storage/Auth/Realtime
export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

export async function testConnection(): Promise<boolean> {
    try {
        const start = Date.now();
        await client`SELECT 1`;
        const duration = Date.now() - start;
        console.log(`✅ Database connection healthy (${duration}ms)`);
        return true;
    } catch (error) {
        console.error('❌ Database health check failed:', error);
        return false;
    }
}
```

### 3. Update `src/database/migrate.ts`
```typescript
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';
import path from 'path';

export async function runMigrations() {
    console.log('📦 Running database migrations...');
    try {
        const migrationFolder = path.join(process.cwd(), 'drizzle');
        console.log(`📂 Using migration folder: ${migrationFolder}`);
        
        await migrate(db, { migrationsFolder: migrationFolder });
        console.log('✅ Migrations completed successfully');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        if ((error as any).code === '42P07' || (error as any).code === '42701') {
            console.log('⚠️ Migration notice: Already exists. Skipping...');
        }
    }
}
```

### 4. Update `.env`
```env
# Supabase Database (for Drizzle/migrations)
DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres

# Supabase Client (for Storage/Auth/Realtime - optional)
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 5. Install postgres.js
```bash
npm install postgres
```

---

## 📊 Comparison

| Feature | Neon | Supabase |
|---------|------|----------|
| **Database** | PostgreSQL | PostgreSQL |
| **Migrations** | ✅ Works | ✅ Works (same files!) |
| **Drizzle ORM** | ✅ Supported | ✅ Supported |
| **Storage Buckets** | ❌ No | ✅ Yes (S3-compatible) |
| **Auth** | ❌ No | ✅ Built-in |
| **Realtime** | ❌ No | ✅ Built-in |
| **Free Tier** | 0.5GB | 500MB DB + 1GB Storage |
| **Branching** | ✅ Yes | ❌ No |

---

## 🎯 Recommendation

**For your AutoAdsPro project:**
- If you only need a database → **Neon** (better branching, simpler)
- If you need database + file storage + auth → **Supabase** (all-in-one)

**Migration Strategy:**
1. Start with **Option 1** (just change DATABASE_URL) to test
2. If you need Storage/Auth, upgrade to **Option 2**

---

## 🔄 Your Existing Migrations Work on Both!

Your current migration files in `/drizzle` folder will work on:
- ✅ Neon
- ✅ Supabase  
- ✅ Railway PostgreSQL
- ✅ Any PostgreSQL database

**No changes needed to migration files!**

---

## 🚀 Quick Test

```bash
# 1. Update .env with Supabase URL
# 2. Run your app
npm run dev

# Migrations run automatically on startup (line 21-22 in src/index.ts)
# You'll see: "📦 Running database migrations..."
```

That's it! Same migration system, different database provider.
