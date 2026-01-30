import { db } from '../../database';
import { businessProfile, marketingCampaigns, scheduledPosts } from '../../database/schema';
import { eq, desc } from 'drizzle-orm';


export class MarketingService {
    private static instance: MarketingService;
    // Simple in-memory state for onboarding. 
    // In production, this should be in the DB (conversations table) or Redis.
    private onboardingSessions: Map<string, { step: number, data: any }> = new Map();

    private constructor() { }

    public static getInstance(): MarketingService {
        if (!MarketingService.instance) {
            MarketingService.instance = new MarketingService();
        }
        return MarketingService.instance;
    }

    /**
     * Start the onboarding interview for a user
     */
    public async startOnboarding(contactId: string): Promise<string> {
        this.onboardingSessions.set(contactId, { step: 1, data: {} });
        return "👋 Welcome to AutoAdsPro! I'm your new AI Marketing Manager.\n\nLet's get your business profile set up so I can start creating ads.\n\nFirst question: **What specifically do you sell?** (Products/Services)";
    }

    /**
     * Handle user response during onboarding
     */
    public async handleOnboardingResponse(contactId: string, message: string): Promise<string | null> {
        const session = this.onboardingSessions.get(contactId);
        if (!session) return null; // Not in onboarding

        switch (session.step) {
            case 1:
                session.data.productInfo = message;
                session.step++;
                this.onboardingSessions.set(contactId, session);
                return "Got it. Next: **Who is your ideal target audience?** (e.g., Young professionals, Stay-at-home moms, Tech enthusiasts)";

            case 2:
                session.data.targetAudience = message;
                session.step++;
                this.onboardingSessions.set(contactId, session);
                return "Understood. Last key question: **What is your Unique Selling Point (USP)?** Why should people buy from YOU instead of competitors?";

            case 3:
                session.data.uniqueSellingPoint = message;
                // Finish Onboarding
                await this.saveBusinessProfile(session.data);
                this.onboardingSessions.delete(contactId);
                return "🎉 Awesome! Your business profile is saved.\n\nI will now start analyzing your brand and creating your first campaign schedule.\n\nYou can say 'create campaign' to verify.";

            default:
                return null;
        }
    }

    private async saveBusinessProfile(data: any) {
        // Upsert logic (simplified: delete all and insert new, since we assume single tenant for now)
        // In multi-user, we'd check ID. Here simply assume one profile.
        const existing = await db.query.businessProfile.findFirst();
        if (existing) {
            await db.update(businessProfile)
                .set({
                    productInfo: data.productInfo,
                    targetAudience: data.targetAudience,
                    uniqueSellingPoint: data.uniqueSellingPoint,
                    updatedAt: new Date()
                })
                .where(eq(businessProfile.id, existing.id));
        } else {
            await db.insert(businessProfile).values({
                productInfo: data.productInfo,
                targetAudience: data.targetAudience,
                uniqueSellingPoint: data.uniqueSellingPoint,
                brandVoice: 'professional' // Default
            });
        }
    }

    /**
     * Check if a valid profile exists
     */
    public async hasProfile(): Promise<boolean> {
        const profile = await db.query.businessProfile.findFirst();
        return !!profile;
    }

    /**
     * Create a basic weekly campaign
     */
    public async createCampaign(
        name: string = "AutoAds Weekly",
        morningTime: string = "07:00",
        afternoonTime: string = "13:00",
        eveningTime: string = "19:00"
    ): Promise<string> {
        if (!await this.hasProfile()) return "❌ Please complete the onboarding first (`setup marketing`)."

        // Create Campaign Entry
        const [campaign] = await db.insert(marketingCampaigns).values({
            name,
            status: 'active',
            startDate: new Date(),
            morningTime,
            afternoonTime,
            eveningTime
        }).returning();

        return `✅ Campaign '${name}' created! ID: ${campaign.id}. Use 'view schedule' to see upcoming posts.`;
    }

    /**
     * Execute a specific marketing slot (Ad or Fact)
     * Called by Scheduler
     */
    public async executeMarketingSlot(client: any, slotType: 'ad_morning' | 'ad_afternoon' | 'ad_evening' | 'fact_morning' | 'fact_afternoon' | 'fact_evening') {
        console.log(`🚀 Executing Marketing Slot: ${slotType}`);

        // 1. Check for Active Campaign
        const campaign = await db.query.marketingCampaigns.findFirst({
            where: eq(marketingCampaigns.status, 'active')
        });

        if (!campaign) {
            console.log("⚠️ No active marketing campaign found. Skipping slot.");
            return;
        }

        // 2. Execute based on slot type
        try {
            if (slotType.startsWith('ad')) {
                await this.handleAdSlot(client, campaign, slotType);
            } else {
                await this.handleFactSlot(client, slotType);
            }
        } catch (e) {
            console.error(`❌ Failed to execute marketing slot ${slotType}:`, e);
        }
    }

    private async getBroadcastGroups(client: any): Promise<string[]> {
        // Fetch all WhatsApp groups the bot is a member of
        return await client.getAllGroups();
    }

    private async handleAdSlot(client: any, campaign: any, slot: string) {
        const { adContentService } = await import('./adContentService');

        // Determine style based on slot
        let style = 'balanced';
        if (slot.includes('morning')) style = 'energetic, morning, fresh start';
        else if (slot.includes('afternoon')) style = 'practical, solution-focused';
        else if (slot.includes('evening')) style = 'relaxed, aspirational, cozy';

        const ad = await adContentService.generateAd(campaign.id, style);

        // Get all groups to broadcast to
        const groups = await this.getBroadcastGroups(client);

        if (groups.length === 0) {
            console.log('⚠️ No groups found to broadcast to');
            return;
        }

        console.log(`📢 Broadcasting ad to ${groups.length} groups...`);

        // Send to each group with delay
        for (const groupJid of groups) {
            try {
                if (ad.imagePath) {
                    const fs = require('fs');
                    const buffer = fs.readFileSync(ad.imagePath);
                    await client.sendImage(groupJid, buffer, ad.text);
                } else {
                    await client.sendText(groupJid, ad.text);
                }
                console.log(`✅ Sent to group: ${groupJid}`);

                // 2-second delay between groups to avoid spam detection
                if (groups.indexOf(groupJid) < groups.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ Failed to send to group ${groupJid}:`, error);
            }
        }

        // Cleanup image after all sends
        if (ad.imagePath) {
            const fs = require('fs');
            try {
                fs.unlinkSync(ad.imagePath);
            } catch (e) {
                console.error('Failed to cleanup image:', e);
            }
        }
    }

    private async handleFactSlot(client: any, slot: string) {
        const { factService } = await import('./factService');

        let timeOfDay: 'morning' | 'afternoon' | 'evening' = 'morning';
        if (slot.includes('afternoon')) timeOfDay = 'afternoon';
        else if (slot.includes('evening')) timeOfDay = 'evening';

        const fact = await factService.getSmartFact(timeOfDay);
        if (!fact) return;

        const message = `🎲 *Random Fact*\n\n${fact}`;

        // Get all groups to broadcast to
        const groups = await this.getBroadcastGroups(client);

        if (groups.length === 0) {
            console.log('⚠️ No groups found to broadcast fact to');
            return;
        }

        console.log(`📢 Broadcasting fact to ${groups.length} groups...`);

        // Send to each group with delay
        for (const groupJid of groups) {
            try {
                await client.sendText(groupJid, message);
                console.log(`✅ Sent fact to group: ${groupJid}`);

                // 2-second delay between groups
                if (groups.indexOf(groupJid) < groups.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            } catch (error) {
                console.error(`❌ Failed to send fact to group ${groupJid}:`, error);
            }
        }
    }
}

export const marketingService = MarketingService.getInstance();
