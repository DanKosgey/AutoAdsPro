
import { MessageBuffer } from '../src/services/messageBuffer';
import { ownerService } from '../src/services/ownerService';

// Mock owner check
ownerService.isOwner = (jid: string) => jid === 'owner@s.whatsapp.net';

console.log('🧪 Starting Message Buffer Simulation...');

const processedBatches: { jid: string, count: number, time: number }[] = [];

// Mock callback
const mockProcessBatch = async (jid: string, messages: string[]) => {
    console.log(`✅ [${Date.now() - startTime}ms] Processed batch for ${jid}: ${messages.length} messages`);
    console.log(`   Messages: ${JSON.stringify(messages)}`);
    processedBatches.push({ jid, count: messages.length, time: Date.now() });
};

const buffer = new MessageBuffer(mockProcessBatch);

// Override constants for testing speed (60s -> 6s, 5s -> 0.5s)
// We use 'any' to access private properties for testing
(buffer as any).BATCH_WINDOW_MS = 6000;
(buffer as any).OWNER_WINDOW_MS = 500;

const startTime = Date.now();

// Scenario 1: Standard User Sliding Window
console.log(`\n--- Scenario 1: User A Sliding Window (Expect ~12s total) ---`);
setTimeout(() => {
    console.log(`[${Date.now() - startTime}ms] User A sends "Message 1"`);
    buffer.add('userA@s.whatsapp.net', 'Message 1');
}, 0);

setTimeout(() => {
    console.log(`[${Date.now() - startTime}ms] User A sends "Message 2" (Should reset timer)`);
    buffer.add('userA@s.whatsapp.net', 'Message 2');
}, 3000); // 3s later (timer was at 50%)

// Expectation: Batch processes at 3000 + 6000 = 9000ms

// Scenario 2: Independent Users
console.log(`\n--- Scenario 2: User B & C (Independent Timers) ---`);
setTimeout(() => {
    console.log(`[${Date.now() - startTime}ms] User B sends "Hi"`);
    buffer.add('userB@s.whatsapp.net', 'Hi');
}, 1000);

setTimeout(() => {
    console.log(`[${Date.now() - startTime}ms] User C sends "Hello"`);
    buffer.add('userC@s.whatsapp.net', 'Hello');
}, 1000);

// Expectation: Both process at ~7000ms (1000 + 6000)

// Scenario 3: Owner Fast Track
console.log(`\n--- Scenario 3: Owner Fast Track ---`);
setTimeout(() => {
    console.log(`[${Date.now() - startTime}ms] Owner sends "Command"`);
    buffer.add('owner@s.whatsapp.net', 'Command');
}, 2000);

// Expectation: Owner processes at 2500ms (2000 + 500)

// Monitor
setInterval(() => {
    if (Date.now() - startTime > 10000) {
        console.log('\n🏁 Simulation Complete');
        process.exit(0);
    }
}, 1000);
