
import fs from 'fs';
import path from 'path';

interface EphemeralAd {
    id: string;
    jid: string;
    messageKey: any;
    sentAt: number;
    ttlMinutes: number; // Time to live in minutes
}

class EphemeralAdsService {
    private storagePath = path.join(process.cwd(), 'ephemeral_ads.json');
    private ads: EphemeralAd[] = [];
    private cleanupInterval: NodeJS.Timeout | null = null;
    private client: any = null; // WhatsApp client reference

    constructor() {
        this.loadAds();
        // Run cleanup check every 5 minutes
        this.cleanupInterval = setInterval(() => this.runCleanup(), 5 * 60 * 1000);
    }

    public setClient(client: any) {
        this.client = client;
    }

    private loadAds() {
        try {
            if (fs.existsSync(this.storagePath)) {
                const data = fs.readFileSync(this.storagePath, 'utf-8');
                this.ads = JSON.parse(data);
            }
        } catch (e) {
            console.error('Failed to load ephemeral ads:', e);
            this.ads = [];
        }
    }

    private saveAds() {
        try {
            fs.writeFileSync(this.storagePath, JSON.stringify(this.ads, null, 2));
        } catch (e) {
            console.error('Failed to save ephemeral ads:', e);
        }
    }

    /**
     * Track an ad for auto-deletion
     * @param jid Group JID
     * @param messageKey The key object from the sent message
     * @param ttlMinutes How long to keep it (default 120 mins = 2 hours)
     */
    public trackAd(jid: string, messageKey: any, ttlMinutes: number = 120) {
        if (!messageKey) return;

        this.ads.push({
            id: Math.random().toString(36).substring(7),
            jid,
            messageKey,
            sentAt: Date.now(),
            ttlMinutes
        });
        this.saveAds();
        console.log(`🕒 Tracking ad in ${jid} for cleanup in ${ttlMinutes} mins`);
    }

    /**
     * Check for expired ads and delete them
     */
    public async runCleanup() {
        if (!this.client) {
            console.log('⚠️ Cleanup skipped: Client not set');
            return;
        }

        const now = Date.now();
        const remainingAds: EphemeralAd[] = [];
        let deletedCount = 0;

        console.log(`🧹 Running Ephemeral Ads Cleanup. Tracking ${this.ads.length} ads.`);

        for (const ad of this.ads) {
            const expiryTime = ad.sentAt + (ad.ttlMinutes * 60 * 1000);

            if (now >= expiryTime) {
                // Time to delete!
                try {
                    console.log(`🗑️ Deleting expired ad from ${ad.jid} (Age: ${Math.round((now - ad.sentAt) / 60000)} mins)`);
                    await this.client.deleteMessage(ad.jid, ad.messageKey);
                    deletedCount++;
                } catch (e) {
                    console.error(`❌ Failed to delete ad in ${ad.jid}:`, e);
                    // Keep it to try again? No, assume failed or already gone to avoid loops.
                }
            } else {
                remainingAds.push(ad);
            }
        }

        if (this.ads.length !== remainingAds.length) {
            this.ads = remainingAds;
            this.saveAds();
            console.log(`✅ Cleanup complete. Deleted ${deletedCount} ads. Remaining: ${this.ads.length}`);
        }
    }
}

export const ephemeralAdsService = new EphemeralAdsService();
