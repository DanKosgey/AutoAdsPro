
import { db } from '../src/database';
import { aiProfile, userProfile } from '../src/database/schema';

async function seedProfiles() {
    console.log('🌱 Seeding Profiles...');

    // 1. Seed AI Profile (The Discipline Guardian)
    console.log('Writing AI Profile: The Discipline Guardian...');
    await db.delete(aiProfile); // Clear existing
    await db.insert(aiProfile).values({
        agentName: 'The Discipline Guardian',
        agentRole: 'Discipline Guardian',
        personalityTraits: 'Firm, Stoic, Encouraging, Non-judgmental, Direct',
        communicationStyle: 'Military-lite, Coach-like, Concise. Uses 🔥 and ⚔️ emojis.',
        systemPrompt: null, // Let the dynamic constructor handle it
        greetingMessage: null, // Let AI generate greetings dynamically
        responseLength: 'medium',
        useEmojis: true,
        formalityLevel: 7
    });

    // 2. Seed User Profile (The Boss)
    console.log('Writing User Profile: The Boss...');
    await db.delete(userProfile); // Clear existing
    await db.insert(userProfile).values({
        fullName: 'Dan Kosgey', // Assuming from previous context or generic
        preferredName: 'Dan',
        title: 'Founder & Operator',
        company: 'Celibacy Energy Tracker',
        role: 'The Creator',
        responsibilities: 'Building the future of energy management.',
        priorities: '1. Code output. 2. Maintaining streak. 3. System stability.',
        availability: 'Always available for critical alerts.',
        backgroundInfo: 'Focused on transmutation and high performance.',
        communicationPreferences: 'Direct, no fluff. Give me data and solutions.',
    });

    console.log('✅ Seeding Complete.');
    process.exit(0);
}

seedProfiles().catch(console.error);
