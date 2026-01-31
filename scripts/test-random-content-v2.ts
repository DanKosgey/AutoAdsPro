
import { randomContentService } from '../src/services/marketing/randomContentService';

async function testRandomContent() {
    console.log('Testing Random Content Generation...\n');

    for (let i = 0; i < 5; i++) {
        const result = await randomContentService.generateRandomContent();
        console.log(`--- Test ${i + 1} ---`);
        console.log(`Type: ${result.type}`);
        console.log(`Topic: ${result.topic}`);
        console.log(`Raw Content: ${result.content}`);
        console.log(`Formatted:\n${randomContentService.formatForWhatsApp(result)}`);
        console.log('\n');
    }
}

testRandomContent().catch(console.error);
