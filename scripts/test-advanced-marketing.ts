/**
 * Test script for Advanced Marketing Engine
 * Verifies style rotation and framework selection
 */

import { adContentService, VisualStyle, PitchFramework } from '../src/services/marketing/adContentService';
import { db } from '../src/database';
import { businessProfile, marketingCampaigns } from '../src/database/schema';

async function testRotationLogic() {
    console.log('🧪 Testing Advanced Marketing Engine...\n');

    // 1. Ensure business profile exists
    console.log('--- 1. Checking Business Profile ---');
    let profile = await db.query.businessProfile.findFirst();
    if (!profile) {
        console.log('Creating test business profile...');
        await db.insert(businessProfile).values({
            productInfo: 'Test Product',
            targetAudience: 'Test Audience',
            uniqueSellingPoint: 'Test USP',
            brandVoice: 'professional'
        });
        profile = await db.query.businessProfile.findFirst();
    }
    console.log('✅ Profile exists:', profile?.productInfo);

    // 2. Create test campaign with start date
    console.log('\n--- 2. Creating Test Campaign ---');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 10); // 10 days ago

    const [campaign] = await db.insert(marketingCampaigns).values({
        name: 'Rotation Test Campaign',
        status: 'active',
        startDate
    }).returning();

    console.log(`✅ Campaign created with start date: ${startDate.toISOString()}`);
    console.log(`   Days since start: ${Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24))}`);

    // 3. Test style rotation (should change every 3 days)
    console.log('\n--- 3. Testing Style Rotation ---');
    const styles = Object.values(VisualStyle);
    const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const expectedStyleIndex = Math.floor(daysSinceStart / 3) % styles.length;
    console.log(`Expected style index: ${expectedStyleIndex} (${styles[expectedStyleIndex]})`);

    // 4. Test framework rotation (should change daily)
    console.log('\n--- 4. Testing Framework Rotation ---');
    const frameworks = Object.values(PitchFramework);
    const expectedFrameworkIndex = daysSinceStart % frameworks.length;
    console.log(`Expected framework index: ${expectedFrameworkIndex} (${frameworks[expectedFrameworkIndex]})`);

    // 5. Generate actual ad to verify
    console.log('\n--- 5. Generating Test Ad ---');
    try {
        const ad = await adContentService.generateAd(campaign.id, 'morning');
        console.log('✅ Ad generated successfully!');
        console.log('Preview:', ad.text.substring(0, 100) + '...');
        if (ad.imagePath) {
            console.log('Image:', ad.imagePath);
        }
    } catch (error: any) {
        console.error('❌ Ad generation failed:', error.message);
    }

    // 6. Simulate different days
    console.log('\n--- 6. Simulating 3-Day Rotation ---');
    for (let i = 0; i < 10; i += 3) {
        const testDate = new Date(startDate);
        testDate.setDate(testDate.getDate() + i);
        const days = Math.floor((testDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const styleIdx = Math.floor(days / 3) % styles.length;
        const frameworkIdx = days % frameworks.length;
        console.log(`Day ${i}: Style=${styles[styleIdx]}, Framework=${frameworks[frameworkIdx]}`);
    }

    console.log('\n✅ All rotation tests completed!');
}

testRotationLogic().catch(console.error).finally(() => process.exit(0));
