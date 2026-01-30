
import dotenv from 'dotenv';
dotenv.config();

import { googleImageGenerationService } from '../src/services/googleImageGeneration';
import fs from 'fs';

async function testGoogleImageGen() {
    console.log('🧪 Testing Google Image Generation...');

    /*
    // Check API Key
    if (!process.env.GEMINI_API_KEY) {
        console.error('❌ GEMINI_API_KEY is not set in .env');
        process.exit(1);
    }
    */

    try {
        const prompt = "A futuristic Nairobi city skyline with flying matatus, cyberpunk style";
        console.log(`🎨 Generating image for: "${prompt}"`);

        const startTime = Date.now();
        const imagePath = await googleImageGenerationService.generateImage(prompt);
        const duration = (Date.now() - startTime) / 1000;

        console.log(`✅ Image generated in ${duration}s`);
        console.log(`📁 Saved to: ${imagePath}`);

        // Verify file exists
        if (fs.existsSync(imagePath)) {
            console.log('✅ File exists on disk.');
            const stats = fs.statSync(imagePath);
            console.log(`📏 File size: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.error('❌ File does not exist!');
        }

    } catch (error: any) {
        console.error('❌ Test Failed:', error.message);
        if (error.response) {
            console.error('Server response:', error.response.data);
        }
    }
}

testGoogleImageGen();
