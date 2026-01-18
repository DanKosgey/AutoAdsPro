/**
 * Clear Session Lock Script
 * Use this to manually release session locks when needed
 */

import { db } from '../src/database';
import { sessionLock } from '../src/database/schema';

async function clearLock() {
    try {
        console.log('🔓 Clearing session locks...');

        await db.delete(sessionLock);
        console.log('✅ Session locks cleared');

        console.log('\n💡 You can now start a new instance');
        console.log('   Run: npm run dev\n');

        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error clearing locks:', error.message);
        process.exit(1);
    }
}

clearLock();
