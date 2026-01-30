
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { keyManager } from '../src/services/keyManager';

async function listModels() {
    const key = keyManager.getNextKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        console.log('🔍 Listing models...');
        const response = await axios.get(url);

        console.log('📜 Available Models:');
        response.data.models.forEach((m: any) => {
            console.log(`- ${m.name} (${m.displayName}) - Supported methods: ${m.supportedGenerationMethods}`);
        });

    } catch (error: any) {
        console.error('❌ Error listing models:', error.response?.data || error.message);
    }
}

listModels();
