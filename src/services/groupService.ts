import { db } from '../database';
import { groups, groupMembers, adEngagements } from '../database/schema';
import { eq, sql } from 'drizzle-orm';
import { WhatsAppClient } from '../core/whatsapp'; // Type only if possible, or dependency injection

export class GroupService {
    private static instance: GroupService;

    private constructor() { }

    public static getInstance(): GroupService {
        if (!GroupService.instance) {
            GroupService.instance = new GroupService();
        }
        return GroupService.instance;
    }

    /**
     * Syncs a single group's metadata and participants to the DB
     */
    public async syncGroup(jid: string, metadata: any) {
        if (!metadata) return;

        console.log(`🔄 Syncing Group: ${metadata.subject} (${jid})`);

        // 1. Upsert Group Info
        const admins = metadata.participants.filter((p: any) => p.admin === 'admin' || p.admin === 'superadmin');

        await db.insert(groups).values({
            jid: jid,
            subject: metadata.subject,
            description: metadata.desc,
            creationTime: new Date(metadata.creation * 1000),
            ownerJid: metadata.owner,
            totalMembers: metadata.participants.length,
            adminsCount: admins.length,
            isAnnounce: metadata.announce || false,
            isRestricted: metadata.restrict || false,
            updatedAt: new Date()
        }).onConflictDoUpdate({
            target: groups.jid,
            set: {
                subject: metadata.subject,
                description: metadata.desc,
                totalMembers: metadata.participants.length,
                adminsCount: admins.length,
                isAnnounce: metadata.announce || false,
                isRestricted: metadata.restrict || false,
                updatedAt: new Date()
            }
        });

        // 2. Upsert Members (Batch is better, but looping individually for simplicity first)
        // Ideally, we'd delete members who left, but for now let's just upsert current ones

        // Prepare bulk insert data
        const membersData = metadata.participants.map((p: any) => ({
            groupJid: jid,
            phone: p.id.split('@')[0] + (p.id.includes('@') ? '@' + p.id.split('@')[1] : ''), // Normalize JID
            role: p.admin || 'participant',
            isAdmin: !!p.admin,
            updatedAt: new Date()
        }));

        // Chunking if group is huge
        const chunkSize = 100;
        for (let i = 0; i < membersData.length; i += chunkSize) {
            const chunk = membersData.slice(i, i + chunkSize);

            // We use a query builder approach or raw sql for "upsert on conflict (groupJid, phone)"
            // Drizzle doesn't support composite key conflict resolution easily in one go for bulk insert without special handling
            // So we'll iterate for now or assume most don't change often.
            // Actually, let's delete all for this group and re-insert? No, tracking history/lastSeen is good.

            // Let's just do individual upserts for robustness or use raw SQL if perf is needed
            for (const member of chunk) {
                // Normalize JID
                const phone = member.phone.replace(/:[0-9]+@/, '@');

                // Hacky check to see if exists
                // For MVP, just simple find/update or insert
                const existing = await db.query.groupMembers.findFirst({
                    where: (gm, { and, eq }) => and(eq(gm.groupJid, jid), eq(gm.phone, phone))
                });

                if (existing) {
                    if (existing.role !== member.role) {
                        await db.update(groupMembers)
                            .set({ role: member.role, isAdmin: member.isAdmin, updatedAt: new Date() })
                            .where(eq(groupMembers.id, existing.id));
                    }
                } else {
                    await db.insert(groupMembers).values({
                        groupJid: jid,
                        phone: phone,
                        role: member.role,
                        isAdmin: member.isAdmin,
                        joinedAt: new Date()
                    });
                }
            }
        }
        console.log(`✅ Synced ${membersData.length} members for ${metadata.subject}`);
    }

    /**
     * Get statistics for the dashboard
     */
    public async getGroupStats() {
        console.log('🔍 GroupService: Retrieving stats...');
        // Total Groups
        const totalGroups = await db.select({ count: sql<number>`count(*)` })
            .from(groups)
            .then(res => res[0]?.count || 0);

        console.log(`📊 Found ${totalGroups} total groups in DB`);

        // Top 5 Largest Groups
        const largestGroups = await db.select()
            .from(groups)
            .orderBy(sql`${groups.totalMembers} DESC`)
            .limit(5);

        console.log(`🏆 Retrieved ${largestGroups.length} largest groups`);

        // Admin Density (Average admins per group)
        const avgAdmins = await db.select({
            avg: sql<number>`avg(${groups.adminsCount})`
        }).from(groups).then(res => Math.round(Number(res[0]?.avg || 0) * 10) / 10);

        return {
            totalGroups,
            largestGroups,
            avgAdmins
        };
    }
    /**
     * Get detailed analytics for a specific group
     */
    public async getGroupDetails(jid: string) {
        // 1. Group Metadata
        const groupInfo = await db.query.groups.findFirst({
            where: eq(groups.jid, jid)
        });

        if (!groupInfo) return null;

        // 2. Members List (First 50 for now)
        const members = await db.query.groupMembers.findMany({
            where: eq(groupMembers.groupJid, jid),
            limit: 50,
            orderBy: (gm, { desc }) => [desc(gm.isAdmin), desc(gm.updatedAt)]
        });

        // 3. Engagement Stats for this group
        // Note: We need adEngagements to have a groupJid column which it does
        const engagementStats = await db.select({
            type: adEngagements.type,
            count: sql<number>`count(*)`
        })
            .from(adEngagements)
            .where(eq(adEngagements.groupJid, jid))
            .groupBy(adEngagements.type);

        const statsMap = engagementStats.reduce((acc, curr) => {
            acc[curr.type] = Number(curr.count);
            return acc;
        }, {} as Record<string, number>);

        return {
            info: groupInfo,
            members,
            stats: {
                delivered: statsMap['delivered'] || 0,
                read: statsMap['read'] || 0,
                replies: statsMap['reply'] || 0,
                readRate: statsMap['delivered'] ? Math.round((statsMap['read'] || 0) / statsMap['delivered'] * 100) : 0
            }
        };
    }
}

export const groupService = GroupService.getInstance();
