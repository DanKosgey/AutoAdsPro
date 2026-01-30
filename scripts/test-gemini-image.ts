
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { keyManager } from '../src/services/keyManager';

async function testGeminiImage() {
    const key = keyManager.getNextKey();
    const model = 'gemini-2.5-flash-image';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

    console.log(`🧪 Testing ${model} using generateContent...`);

    const requestBody = {
        contents: [{
            parts: [{ text: "Generate an image of a futuristic Nairobi city skyline." }]
        }]
    };

    try {
        const response = await axios.post(url, requestBody);
        console.log('✅ Response Status:', response.status);
        console.log('📦 Response Data:', JSON.stringify(response.data, null, 2));

    } catch (error: any) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
}

testGeminiImage();
