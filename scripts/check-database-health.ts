/**
 * Database Health Check Script
 * Run this to diagnose database issues
 */

import { db } from '../src/database';
import { contacts, messageLogs, conversations, messageQueue, reportQueue } from '../src/database/schema';
import { sql } from 'drizzle-orm';

async function checkDatabaseHealth() {
    console.log('🔍 Running Database Health Check...\n');

    try {
        // 1. Check connection
        console.log('1️⃣ Testing database connection...');
        await db.execute(sql`SELECT 1`);
        console.log('   ✅ Database connection successful\n');

        // 2. Check tables exist
        console.log('2️⃣ Checking tables...');
        const tables = [
            { name: 'contacts', schema: contacts },
            { name: 'message_logs', schema: messageLogs },
            { name: 'conversations', schema: conversations },
            { name: 'message_queue', schema: messageQueue },
            { name: 'report_queue', schema: reportQueue },
        ];

        for (const table of tables) {
            try {
                const result = await db.select().from(table.schema).limit(1);
                console.log(`   ✅ ${table.name}: exists (${result.length} sample rows)`);
            } catch (error: any) {
                console.log(`   ❌ ${table.name}: ERROR - ${error.message}`);
            }
        }
        console.log();

        // 3. Check data counts
        console.log('3️⃣ Checking data counts...');

        try {
            const contactCount = await db.select({ count: sql<number>`count(*)` }).from(contacts);
            console.log(`   📊 Contacts: ${contactCount[0].count}`);
        } catch (error: any) {
            console.log(`   ❌ Contacts count error: ${error.message}`);
        }

        try {
            const messageCount = await db.select({ count: sql<number>`count(*)` }).from(messageLogs);
            console.log(`   📊 Messages: ${messageCount[0].count}`);
        } catch (error: any) {
            console.log(`   ❌ Messages count error: ${error.message}`);
        }

        try {
            const conversationCount = await db.select({ count: sql<number>`count(*)` }).from(conversations);
            console.log(`   📊 Conversations: ${conversationCount[0].count}`);
        } catch (error: any) {
            console.log(`   ❌ Conversations count error: ${error.message}`);
        }

        try {
            const queueCount = await db.select({ count: sql<number>`count(*)` }).from(messageQueue);
            console.log(`   📊 Message Queue: ${queueCount[0].count}`);
        } catch (error: any) {
            console.log(`   ❌ Message Queue count error: ${error.message}`);
        }

        try {
            const reportQueueCount = await db.select({ count: sql<number>`count(*)` }).from(reportQueue);
            console.log(`   📊 Report Queue: ${reportQueueCount[0].count}`);
        } catch (error: any) {
            console.log(`   ❌ Report Queue count error: ${error.message}`);
        }
        console.log();

        // 4. Test owner tools queries
        console.log('4️⃣ Testing owner tool queries...');

        try {
            const recentContacts = await db.select()
                .from(contacts)
                .orderBy(sql`${contacts.lastSeenAt} DESC NULLS LAST`)
                .limit(5);
            console.log(`   ✅ Recent contacts query: ${recentContacts.length} results`);
        } catch (error: any) {
            console.log(`   ❌ Recent contacts query error: ${error.message}`);
        }

        try {
            const recentMessages = await db.select()
                .from(messageLogs)
                .orderBy(sql`${messageLogs.createdAt} DESC`)
                .limit(5);
            console.log(`   ✅ Recent messages query: ${recentMessages.length} results`);
        } catch (error: any) {
            console.log(`   ❌ Recent messages query error: ${error.message}`);
        }

        console.log('\n✅ Database health check complete!');

    } catch (error: any) {
        console.error('\n❌ Fatal database error:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

checkDatabaseHealth();
