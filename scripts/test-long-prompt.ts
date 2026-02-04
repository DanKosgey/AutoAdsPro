
import dotenv from 'dotenv';
dotenv.config();

import { googleImageGenerationService } from '../src/services/googleImageGeneration';
import fs from 'fs';

async function testLongPrompt() {
    console.log('🧪 Testing Leonardo AI Long Prompt Truncation...');

    try {
        // Create a prompt longer than 1500 characters
        const basePrompt = "A futuristic Nairobi city skyline with flying matatus, cyberpunk style. ";
        const longPrompt = basePrompt.repeat(30);
        console.log(`📏 Original prompt length: ${longPrompt.length} characters`);

        const startTime = Date.now();
        const imagePath = await googleImageGenerationService.generateImage(longPrompt);
        const duration = (Date.now() - startTime) / 1000;

        console.log(`✅ Image generated in ${duration}s`);
        console.log(`📁 Saved to: ${imagePath}`);

        if (fs.existsSync(imagePath)) {
            console.log('✅ File exists on disk.');
        }

    } catch (error: any) {
        console.error('❌ Test Failed:', error.message);
    }
}

testLongPrompt();
