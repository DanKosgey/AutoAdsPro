/**
 * Test Autonomous Group Broadcasting
 * Sends a real ad about the agent testing its autonomous posting feature
 */

import { WhatsAppClient } from '../src/core/whatsapp';
import { marketingService } from '../src/services/marketing/marketingService';
import { db } from '../src/database';
import { businessProfile, marketingCampaigns } from '../src/database/schema';

async function testGroupBroadcasting() {
    console.log('🧪 Testing Autonomous Group Broadcasting...\n');

    // 1. Ensure business profile exists (for the agent itself)
    console.log('--- 1. Setting up Business Profile ---');
    let profile = await db.query.businessProfile.findFirst();
    if (!profile) {
        console.log('Creating business profile for the agent...');
        await db.insert(businessProfile).values({
            productInfo: 'AI-Powered Autonomous Marketing Agent',
            targetAudience: 'Business owners who want automated WhatsApp marketing',
            uniqueSellingPoint: 'Fully autonomous ad posting with AI-generated content and images',
            brandVoice: 'professional'
        });
        profile = await db.query.businessProfile.findFirst();
    }
    console.log('✅ Profile ready:', profile?.productInfo);

    // 2. Create test campaign with custom times
    console.log('\n--- 2. Creating Test Campaign ---');
    const [campaign] = await db.insert(marketingCampaigns).values({
        name: 'Autonomous Broadcasting Test',
        status: 'active',
        startDate: new Date(),
        morningTime: '07:00',
        afternoonTime: '13:00',
        eveningTime: '19:00'
    }).returning();

    console.log(`✅ Campaign created: ${campaign.name} (ID: ${campaign.id})`);
    console.log(`   Posting times: Morning ${campaign.morningTime}, Afternoon ${campaign.afternoonTime}, Evening ${campaign.eveningTime}`);

    // 3. Initialize WhatsApp client
    console.log('\n--- 3. Initializing WhatsApp Client ---');
    const client = new WhatsAppClient();
    await client.initialize();

    // Wait for connection
    console.log('⏳ Waiting for WhatsApp connection...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds

    // 4. Check groups
    console.log('\n--- 4. Detecting Groups ---');
    const groups = await client.getAllGroups();

    if (groups.length === 0) {
        console.log('❌ No groups found! Please add the bot to at least one WhatsApp group first.');
        process.exit(1);
    }

    console.log(`✅ Found ${groups.length} groups to broadcast to`);

    // 5. Execute marketing slot (send ad)
    console.log('\n--- 5. Broadcasting Test Ad ---');
    console.log('📢 Sending autonomous marketing agent test ad to all groups...');

    await marketingService.executeMarketingSlot(client, 'ad_morning');

    console.log('\n✅ Test completed! Check your WhatsApp groups for the ad.');
    console.log('   The ad should include:');
    console.log('   - AI-generated image about the marketing agent');
    console.log('   - Professional marketing copy');
    console.log('   - Sent to all groups with 2-second delays');

    // Cleanup
    await client.shutdown();
    process.exit(0);
}

testGroupBroadcasting().catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
});
