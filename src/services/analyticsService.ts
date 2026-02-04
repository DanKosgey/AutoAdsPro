import { db } from '../database';
import { adEngagements, marketingCampaigns, contacts, messageLogs } from '../database/schema';
import { eq, sql, and, desc } from 'drizzle-orm';

export class AnalyticsService {
    private static instance: AnalyticsService;

    private constructor() { }

    public static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    /**
     * Track an engagement event
     */
    public async trackEngagement(
        type: 'delivered' | 'read' | 'reply',
        messageId: string,
        campaignId: number | null,
        userPhone: string,
        groupJid: string | null = null,
        context: any = {}
    ) {
        try {
            // Deduplication for 'read' events (only count first read per user/msg)
            if (type === 'read') {
                const existing = await db.query.adEngagements.findFirst({
                    where: (ae, { and, eq }) => and(
                        eq(ae.messageId, messageId),
                        eq(ae.userPhone, userPhone),
                        eq(ae.type, 'read')
                    )
                });
                if (existing) return; // Already tracked
            }

            await db.insert(adEngagements).values({
                type,
                messageId,
                campaignId,
                userPhone,
                groupJid,
                context,
                createdAt: new Date()
            });

            console.log(`📊 Tracked '${type}' from ${userPhone} (Msg: ${messageId})`);
        } catch (error) {
            console.error('Failed to track engagement:', error);
        }
    }

    /**
     * Get Aggregated Dashboard Data
     */
    public async getDashboardStats() {
        // Engagement Overview
        const engagementStats = await db.select({
            type: adEngagements.type,
            count: sql<number>`count(*)`
        })
            .from(adEngagements)
            .groupBy(adEngagements.type);

        const statsMap = engagementStats.reduce((acc, curr) => {
            acc[curr.type] = Number(curr.count);
            return acc;
        }, {} as Record<string, number>);

        // Campaign Performance
        const campaignPerformance = await db.select({
            id: marketingCampaigns.id,
            name: marketingCampaigns.name,
            reads: sql<number>`count(case when ${adEngagements.type} = 'read' then 1 end)`,
            replies: sql<number>`count(case when ${adEngagements.type} = 'reply' then 1 end)`
        })
            .from(marketingCampaigns)
            .leftJoin(adEngagements, eq(marketingCampaigns.id, adEngagements.campaignId))
            .groupBy(marketingCampaigns.id, marketingCampaigns.name)
            .orderBy(desc(sql`count(case when ${adEngagements.type} = 'read' then 1 end)`))
            .limit(5);

        // Chat & DM Metrics (New)
        // 1. Total Active DM Conversations (non-group)
        // We'll approximate this by counting unique contacts in message_logs who are not groups
        // Assuming contacts table has correct verified contacts
        const totalUniqueContacts = await db.select({ count: sql<number>`count(*)` })
            .from(contacts) // contacts usually implies DMs
            .then(res => res[0]?.count || 0);

        // 2. Average Chat Length (Messages per contact)
        // This is heavy, so we might want to optimize or limit later. 
        // For now, avg count of message logs per contact
        /* 
           This query might be slow on huge datasets. 
           Alternative: Count total messages / total contacts.
        */
        const totalMessages = await db.select({ count: sql<number>`count(*)` })
            .from(messageLogs)
            .then(res => res[0]?.count || 0);

        const avgChatLength = totalUniqueContacts > 0 ? Math.round(Number(totalMessages) / Number(totalUniqueContacts)) : 0;

        return {
            overview: {
                delivered: statsMap['delivered'] || 0,
                read: statsMap['read'] || 0,
                replies: statsMap['reply'] || 0,
                readRate: statsMap['delivered'] ? Math.round((statsMap['read'] || 0) / statsMap['delivered'] * 100) : 0,
                activeChats: totalUniqueContacts,
                avgChatLength: avgChatLength
            },
            topCampaigns: campaignPerformance
        };
    }
}

export const analyticsService = AnalyticsService.getInstance();
