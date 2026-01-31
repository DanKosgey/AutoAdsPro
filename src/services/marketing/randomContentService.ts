import { geminiService } from '../ai/gemini';

type ContentType = 'quote' | 'joke' | 'prediction' | 'fact' | 'riddle' | 'wisdom' | 'hack' | 'luxury_insight';

// 20+ Topics focusing on Money, Luxury, Success, and "Cool" stuff
const TOPICS = [
    'Old Money Aesthetic', 'Crypto Whales', 'Supercars', 'Minimalist Architecture',
    'Biohacking', 'High-Frequency Trading', 'Swiss Watches', 'Private Jets',
    'Artificial Intelligence', 'Space Travel', 'Meditation for CEOs', 'Stoicism',
    'Compound Interest', 'Deep Work', 'Neuromarketing', 'Psychology of Power',
    'Exotic Travel Destinations', 'Fine Art Collecting', 'Whiskey & Cigars',
    'Digital Nomad Lifestyle', 'Legacy Building', 'Smart Home Tech', 'Bespoke Tailoring',
    'Yachting', 'Michelin Star Dining', 'Angel Investing', 'Quant Finance', 'Global Macro Economics'
] as const;

type Topic = typeof TOPICS[number];

interface RandomContent {
    type: ContentType;
    content: string;
    topic?: string;
}

class RandomContentService {
    private static instance: RandomContentService;
    private lastContentType: ContentType | null = null;
    private lastTopic: Topic | null = null;

    private constructor() { }

    public static getInstance(): RandomContentService {
        if (!RandomContentService.instance) {
            RandomContentService.instance = new RandomContentService();
        }
        return RandomContentService.instance;
    }

    /**
     * Get a random content type, ensuring variety (no repeats)
     */
    private getRandomContentType(): ContentType {
        const types: ContentType[] = ['quote', 'joke', 'prediction', 'fact', 'riddle', 'wisdom', 'hack', 'luxury_insight'];

        // Filter out the last type to ensure variety
        const availableTypes = this.lastContentType
            ? types.filter(t => t !== this.lastContentType)
            : types;

        const selected = availableTypes[Math.floor(Math.random() * availableTypes.length)];
        this.lastContentType = selected;
        return selected;
    }

    /**
     * Get a random topic, ensuring variety
     */
    private getRandomTopic(): Topic {
        const availableTopics = this.lastTopic
            ? TOPICS.filter(t => t !== this.lastTopic)
            : TOPICS;

        const selected = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        this.lastTopic = selected;
        return selected;
    }

    /**
     * Get time-aware context for AI generation
     */
    private getTimeContext(): string {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) {
            return 'morning (hustle mode, fresh coffee, ambition)';
        } else if (hour >= 12 && hour < 17) {
            return 'afternoon (execution, closing deals, focus)';
        } else if (hour >= 17 && hour < 21) {
            return 'evening (networking, leisure, luxury dining)';
        } else {
            return 'late night (scheming, vision, deep thought)';
        }
    }

    /**
     * Generate random content using AI
     */
    public async generateRandomContent(): Promise<RandomContent> {
        const type = this.getRandomContentType();
        const topic = this.getRandomTopic();
        const timeContext = this.getTimeContext();

        const baseInstruction = `You are a sophisticated, successful, and slightly witty AI assistant for a high-net-worth individual. 
        Topic: ${topic}
        Time Context: ${timeContext}
        Tone: Cool, confident, brief, and engaging. Avoid cliché "hustle culture" cringe.
        Output: ONLY the content text.`;

        const prompts: Record<ContentType, string> = {
            quote: `${baseInstruction}
                    Generate a powerful, obscure, or highly relevant quote about ${topic}.
                    It should feel like insider knowledge or timeless wisdom.
                    Max 20 words.`,

            joke: `${baseInstruction}
                   Generate a sophisticated, dry-humor joke or witty observation about ${topic}.
                   Something a CEO might chuckle at.
                   Max 20 words.`,

            prediction: `${baseInstruction}
                        Make a bold, fun, or slightly futuristic prediction about ${topic}.
                        Start with "🔮 Prediction:".
                        Max 20 words.`,

            fact: `${baseInstruction}
                   Share a mind-blowing, little-known fact about ${topic}.
                   Start with "💡 Fact:".
                   Max 20 words.`,

            riddle: `${baseInstruction}
                    Create a clever, short riddle about ${topic}.
                    Format: "Riddle: [Question] (Answer: [One word])"`,

            wisdom: `${baseInstruction}
                    Share a nugget of strategic advice or wisdom regarding ${topic}.
                    Start with "💭 Insight:".
                    Max 20 words.`,

            hack: `${baseInstruction}
                   Share a "Life Hack" or "Pro Tip" related to ${topic} for gaining an edge.
                   Start with "⚡ Hack:".
                   Max 20 words.`,

            luxury_insight: `${baseInstruction}
                             Share a specific detail or appreciation about high-end ${topic}.
                             Start with "💎 Luxury spec:".
                             Max 20 words.`
        };

        try {
            const content = await geminiService.generateText(prompts[type]);
            return {
                type,
                content: content.trim(),
                topic
            };
        } catch (error) {
            console.error('Failed to generate random content:', error);
            // Fallback content
            return {
                type: 'quote',
                content: '💫 "The best investment you can make is in yourself."',
                topic: 'Success'
            };
        }
    }

    /**
     * Format content for WhatsApp with emoji and styling
     */
    public formatForWhatsApp(randomContent: RandomContent): string {
        const typeEmojis: Record<ContentType, string> = {
            quote: '✨',
            joke: '😄',
            prediction: '🔮',
            fact: '🧠',
            riddle: '🤔',
            wisdom: '🌟',
            hack: '⚡',
            luxury_insight: '💎'
        };

        const emoji = typeEmojis[randomContent.type];
        const typeLabel = randomContent.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const topicLabel = randomContent.topic ? ` | ${randomContent.topic}` : '';

        return `${emoji} *${typeLabel}${topicLabel}*\n\n${randomContent.content}`;
    }
}

export const randomContentService = RandomContentService.getInstance();
