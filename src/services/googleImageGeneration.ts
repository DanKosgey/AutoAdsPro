import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

export class GoogleImageGenerationService {
    private static instance: GoogleImageGenerationService;

    private constructor() {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }
    }

    public static getInstance(): GoogleImageGenerationService {
        if (!GoogleImageGenerationService.instance) {
            GoogleImageGenerationService.instance = new GoogleImageGenerationService();
        }
        return GoogleImageGenerationService.instance;
    }

    public async generateImage(prompt: string): Promise<string> {
        try {
            console.log(`🎨 Generating image with Pollinations.ai...`);

            // Pollinations.ai free API
            const encodedPrompt = encodeURIComponent(prompt);
            const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true`;

            // Download the image
            const response = await axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 second timeout
            });

            const buffer = Buffer.from(response.data);
            const fileName = `img_${uuidv4()}.jpg`;
            const filePath = path.join(process.cwd(), 'temp', fileName);

            fs.writeFileSync(filePath, buffer);
            console.log(`✅ Image saved to ${filePath}`);

            return filePath;

        } catch (error: any) {
            console.error('❌ Image Generation Error:', error.message);

            // Fallback to text-only
            throw new Error('QUOTA_EXCEEDED');
        }
    }
}

export const googleImageGenerationService = GoogleImageGenerationService.getInstance();