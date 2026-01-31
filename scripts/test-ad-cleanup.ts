
import { EphemeralAdsService } from '../src/services/marketing/ephemeralAdsService';
import fs from 'fs';
import path from 'path';

// Mock Client
class MockWhatsAppClient {
    public deletedMessages: { jid: string, key: any }[] = [];

    async deleteMessage(jid: string, key: any) {
        console.log(`[MockClient] Deleting message in ${jid} with key ${JSON.stringify(key)}`);
        this.deletedMessages.push({ jid, key });
        return Promise.resolve();
    }
}

async function runTest() {
    console.log("🧪 Testing Ephemeral Ads Cleanup Logic...");

    const TEST_FILE = path.join(process.cwd(), 'test_ephemeral_ads.json');

    // Cleanup previous test runs
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);

    // 1. Initialize Service with Test File
    const service = new EphemeralAdsService(TEST_FILE);
    const mockClient = new MockWhatsAppClient();
    service.setClient(mockClient);

    // 2. Mock 'trackAd'
    const testJid = '123456789@s.whatsapp.net';
    const testKey = { id: 'TEST_MSG_ID_1', fromMe: true };
    const ttlMinutes = 0.05; // 3 seconds

    console.log(`\n--- 1. Tracking Ad (TTL: ${ttlMinutes * 60} seconds) ---`);
    service.trackAd(testJid, testKey, ttlMinutes);

    // Verify it saved to file
    if (fs.existsSync(TEST_FILE)) {
        console.log("✅ Ad saved to persistence file.");
    } else {
        console.error("❌ Failed to save ad to persistence file.");
        process.exit(1);
    }

    // 3. Wait for Cleanup
    console.log("\n--- 2. Waiting for Cleanup Cycle ---");
    console.log("   (Waiting 4 seconds for expiry...)");

    await new Promise(resolve => setTimeout(resolve, 4000));

    // Force run cleanup (simulating interval)
    await service.runCleanup();

    // 4. Verify Deletion
    console.log("\n--- 3. Verifying Deletion ---");
    if (mockClient.deletedMessages.length === 1) {
        const deleted = mockClient.deletedMessages[0];
        if (deleted.jid === testJid && deleted.key.id === testKey.id) {
            console.log("✅ SUCCESS: Client.deleteMessage was called correctly.");
        } else {
            console.error("❌ Mismatch in deleted message details:", deleted);
        }
    } else {
        console.error(`❌ Expected 1 deleted message, got ${mockClient.deletedMessages.length}`);
    }

    // Cleanup Test File
    if (fs.existsSync(TEST_FILE)) fs.unlinkSync(TEST_FILE);
    console.log("\nTest Completed.");
    process.exit(0);
}

runTest().catch(console.error);
