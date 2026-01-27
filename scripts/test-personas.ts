
import { geminiService } from '../src/services/ai/gemini';
import { db } from '../src/database';
import { aiProfile, userProfile } from '../src/database/schema';

async function testPersonas() {
    console.log('🧪 Testing AI Personas...');

    // 1. Fetch Profiles
    const ai = await db.select().from(aiProfile).then(rows => rows[0]);
    const user = await db.select().from(userProfile).then(rows => rows[0]);

    if (!ai || !user) {
        console.error('❌ Profiles not found. Run seed script first.');
        process.exit(1);
    }

    console.log('Profile loaded. Greeting:', ai.greetingMessage); // Should be null

    // 2. Test Owner Persona
    console.log('\n--- Testing OWNER Persona ---');
    console.log('User: "Status check."');
    const ownerReply = await geminiService.generateReply(
        ['User: Status check.'],
        'Owner Context',
        true, // isOwner = true
        ai as any,
        user as any
    );
    console.log('AI (Owner):', ownerReply.content);

    // 3. Test Representative Persona
    console.log('\n--- Testing REPRESENTATIVE Persona ---');
    console.log('User: "Hi, is Dan available?"');
    const repReply = await geminiService.generateReply(
        ['User: Hi, is Dan available?'],
        'Stranger Context',
        false, // isOwner = false
        ai as any,
        user as any
    );
    console.log('AI (Rep):', repReply.content);

    console.log('\n✅ Test Complete');
    process.exit(0);
}

testPersonas().catch(console.error);
