
import cron, { ScheduledTask } from 'node-cron';
import { eq } from 'drizzle-orm';
import { WhatsAppClient } from '../core/whatsapp';
import { ownerService } from './ownerService';
import { getDailySummary } from './ai/ownerTools';
import { db } from '../database';
import { userProfile } from '../database/schema';

export class SchedulerService {
    private client: WhatsAppClient | undefined;
    private tasks: ScheduledTask[] = [];

    init(client: WhatsAppClient) {
        this.client = client;
        this.start();
    }

    async start() {
        // Stop existing tasks to prevent duplicates
        this.stop();

        console.log('⏰ Starting Scheduler Service...');

        // Fetch owner's timezone
        let timezone = 'UTC'; // Default fallback
        try {
            const ownerPhone = ownerService.getOwnerPhone();
            if (ownerPhone) {
                // Try to find profile by phone
                const profiles = await db.select().from(userProfile).where(eq(userProfile.phone, ownerPhone)).limit(1);
                if (profiles.length > 0 && profiles[0].timezone) {
                    timezone = profiles[0].timezone;
                    console.log(`🌍 Scheduler using owner's timezone: ${timezone}`);
                } else {
                    // Fallback: try to find ANY profile with a timezone (assuming single user mode)
                    const anyProfile = await db.select().from(userProfile).limit(1);
                    if (anyProfile.length > 0 && anyProfile[0].timezone) {
                        timezone = anyProfile[0].timezone;
                        console.log(`🌍 Scheduler using generic profile timezone: ${timezone}`);
                    } else {
                        console.log('⚠️ No timezone found in user profile, defaulting to system time/UTC.');
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error fetching timezone:', error);
        }

        const cronOptions = {
            scheduled: true,
            timezone: timezone
        };

        // AutoAdsPro Schedule (6 Slots)

        // 1. Morning Ad (7:00 AM)
        this.scheduleSlot('0 7 * * *', 'ad_morning', timezone);

        // 2. Morning Fact (10:00 AM)
        this.scheduleSlot('0 10 * * *', 'fact_morning', timezone);

        // 3. Afternoon Ad (1:00 PM)
        this.scheduleSlot('0 13 * * *', 'ad_afternoon', timezone);

        // 4. Afternoon Fact (4:00 PM)
        this.scheduleSlot('0 16 * * *', 'fact_afternoon', timezone);

        // 5. Evening Ad (7:00 PM)
        this.scheduleSlot('0 19 * * *', 'ad_evening', timezone);

        // 6. Evening Fact (9:00 PM)
        this.scheduleSlot('0 21 * * *', 'fact_evening', timezone);

        console.log(`✅ Scheduler initialized with AutoAdsPro 6-slot rhythm in ${timezone}`);
    }

    private scheduleSlot(cronExpression: string, slotType: 'ad_morning' | 'ad_afternoon' | 'ad_evening' | 'fact_morning' | 'fact_afternoon' | 'fact_evening', timezone: string) {
        const task = cron.schedule(cronExpression, async () => {
            console.log(`⏰ Triggering scheduled slot: ${slotType}`);
            try {
                // Dynamically import to avoid circular dependency issues during init
                const { marketingService } = await import('./marketing/marketingService');
                if (this.client) {
                    await marketingService.executeMarketingSlot(this.client, slotType);
                }
            } catch (error) {
                console.error(`❌ Error executing slot ${slotType}:`, error);
            }
        }, { scheduled: true, timezone } as any);
        this.tasks.push(task);
    }

    stop() {
        if (this.tasks.length > 0) {
            console.log(`🛑 Stopping ${this.tasks.length} active scheduler tasks...`);
            this.tasks.forEach(task => task.stop());
            this.tasks = [];
        }
    }
}

export const schedulerService = new SchedulerService();
