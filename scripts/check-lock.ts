/**
 * Check Session Lock Status
 * Shows which instance currently holds the lock
 */

import { db } from '../src/database';
import { sessionLock } from '../src/database/schema';

async function checkLock() {
    try {
        console.log('🔍 Checking session lock status...\n');

        const locks = await db.select().from(sessionLock);

        if (locks.length === 0) {
            console.log('✅ No active session locks');
            console.log('💡 You can start a new instance with: npm run dev\n');
            process.exit(0);
            return;
        }

        console.log(`🔒 Found ${locks.length} active lock(s):\n`);

        const now = new Date();

        locks.forEach((lock, index) => {
            const expiresAt = lock.expiresAt ? new Date(lock.expiresAt) : new Date();
            const lockedAt = lock.lockedAt ? new Date(lock.lockedAt) : new Date();
            const timeUntilExpiry = Math.round((expiresAt.getTime() - now.getTime()) / 1000);
            const lockAge = Math.round((now.getTime() - lockedAt.getTime()) / 1000);

            console.log(`Lock #${index + 1}:`);
            console.log(`   Session Name: ${lock.sessionName}`);
            console.log(`   Instance ID: ${lock.instanceId}`);
            console.log(`   Locked At: ${lockedAt.toLocaleString()}`);
            console.log(`   Lock Age: ${lockAge} seconds (${Math.round(lockAge / 60)} minutes)`);
            console.log(`   Expires At: ${expiresAt.toLocaleString()}`);

            if (timeUntilExpiry > 0) {
                console.log(`   Time Until Expiry: ${timeUntilExpiry} seconds (${Math.round(timeUntilExpiry / 60)} minutes)`);
                console.log(`   Status: 🟢 ACTIVE (will be refreshed before expiry)`);
            } else {
                console.log(`   Status: 🔴 EXPIRED (can be cleared)`);
            }
            console.log('');
        });

        console.log('═══════════════════════════════════════════════════════════════\n');

        if (locks.some(lock => new Date(lock.expiresAt) < now)) {
            console.log('💡 Some locks are expired. Clear them with: npm run clear-lock\n');
        } else {
            console.log('💡 All locks are active. To run locally:');
            console.log('   1. Stop the production instance on Render, OR');
            console.log('   2. Run: npm run clear-lock (will disconnect production)\n');
        }

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error checking locks:', error.message);
        process.exit(1);
    }
}

checkLock();
