import { db } from '../../database';
import { facts } from '../../database/schema';
import { eq, sql, desc, and, lt } from 'drizzle-orm';
import { geminiService } from '../ai/gemini';

export class FactService {
    private static instance: FactService;

    private constructor() { }

    public static getInstance(): FactService {
        if (!FactService.instance) {
            FactService.instance = new FactService();
        }
        return FactService.instance;
    }

    /**
     * Get a fact suitable for the current time of day
     * @param timeOfDay 'morning' | 'afternoon' | 'evening'
     */
    public async getSmartFact(timeOfDay: 'morning' | 'afternoon' | 'evening'): Promise<string | null> {
        // Simple logic for now: 
        // Morning -> Tier 1 (Product Adjacent) or Tier 2 (Audience)
        // Afternoon -> Tier 2 (Audience) or Tier 3 (Universal)
        // Evening -> Tier 3 (Universal)

        let preferredTier: 'tier1' | 'tier2' | 'tier3' = 'tier3'; // Default to universal

        if (timeOfDay === 'morning') preferredTier = 'tier1';
        else if (timeOfDay === 'afternoon') preferredTier = 'tier2';
        else if (timeOfDay === 'evening') preferredTier = 'tier3';

        // Try to get an unused fact of the preferred tier
        const fact = await db.query.facts.findFirst({
            where: and(
                eq(facts.tier, preferredTier),
                // Prefer facts used less than 1 time (unused), or least used
                // For simplicity, let's just pick one ordered by usedCount asc, random()
            ),
            orderBy: [desc(facts.createdAt)], // Just get latest for now, or we can random
        });

        // If we found one, return it (and ideally increment usage, but we'll do that when posting)
        if (fact) return fact.content;

        // Fallback: Generate one on the fly if DB is empty?
        return await this.generateFact(preferredTier);
    }

    /**
     * Generate a new fact using AI
     */
    public async generateFact(tier: 'tier1' | 'tier2' | 'tier3'): Promise<string> {
        const prompt = `Generate a single interesting "Random Fact" for a marketing campaign.
        Tier: ${tier}
        - Tier 1: Product-Adjacent (related to business/industry)
        - Tier 2: Audience Interest (lifestyle/productivity)
        - Tier 3: Universal Fascinating (science/history/nature)
        
        Format: Just the fact text, maybe with an emoji. keep it concise.`;

        const response = await geminiService.generateText(prompt);
        return response || "Did you know? The world is full of amazing things!";
    }

    /**
     * Add a fact to the library
     */
    public async addFact(content: string, category: string, tier: 'tier1' | 'tier2' | 'tier3') {
        await db.insert(facts).values({
            content,
            category,
            tier,
            usedCount: 0
        });
    }

    /**
     * Mark a fact as used (increment counter)
     * Note: In a real app we'd query by ID, but for now we might just pass content string match or rely on the caller
     */
    public async incrementUsage(content: string) {
        // Implementation omitted for brevity, usually update where content = content
    }
}

export const factService = FactService.getInstance();
