
import { GoogleGenerativeAI } from '@google/generative-ai';
import { keyManager } from '../src/services/keyManager';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    try {
        const apiKey = keyManager.getNextKey();
        const genAI = new GoogleGenerativeAI(apiKey);
        console.log(`Checking models with key: ${apiKey.substring(0, 10)}...`);

        const modelResponse = await genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }).apiKey; // Helper to just init
        // Actually, to list models we need the model manager equivalent or just try to generate and see specific error message.
        // The SDK doesn't always have a direct 'listModels' method exposed easily in the high-level class used this way, 
        // but let's try a standard generation with a simple prompt to a known model to verify the key works at all,
        // and then try to hit the list endpoint using a raw fetch if needed.

        // Actually, let's just use raw fetch to list models to be sure.
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            console.log("✅ Available Models:");
            const modelNames = data.models.map((m: any) => m.name).filter((n: string) => n.includes('imagen') || n.includes('gemini'));
            console.log(modelNames.join('\n'));
        } else {
            console.error("❌ Could not list models:", JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

listModels();
