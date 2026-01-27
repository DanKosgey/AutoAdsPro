/**
 * Report Queue Service
 * Handles async generation of conversation reports
 * Runs independently from message queue with lower priority
 */

import { db } from '../database';
import { reportQueue, conversations, contacts, messageLogs } from '../database/schema';
import { eq, and, desc } from 'drizzle-orm';
import { geminiService } from './ai/gemini';
import { keyManager } from './keyManager';
import { notificationService } from './notificationService';

type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export class ReportQueueService {
    private MAX_RETRIES = 3;
    private isProcessing = false;

    /**
     * Add a conversation report to the queue
     */
    async enqueue(contactPhone: string, conversationId: number, contactName?: string, lastMessageTime?: Date): Promise<void> {
        await db.insert(reportQueue).values({
            contactPhone,
            contactName: contactName || 'Unknown',
            conversationId,
            status: 'pending',
            lastMessageTime: lastMessageTime || new Date(),
            retryCount: 0,
            createdAt: new Date(),
        });

        console.log(`📋 Queued conversation report for ${contactName || contactPhone}`);
    }

    /**
     * Process the report queue - called by background worker
     */
    async processReports(): Promise<void> {
        if (this.isProcessing) {
            return;
        }

        // Check if any keys are available
        if (!keyManager.hasAvailableKey()) {
            return;
        }

        this.isProcessing = true;

        try {
            // Get next pending report
            const pending = await db.select()
                .from(reportQueue)
                .where(eq(reportQueue.status, 'pending'))
                .orderBy(reportQueue.createdAt)
                .limit(1)
                .then(rows => rows[0]);

            if (!pending) {
                return; // Queue is empty
            }

            // Mark as processing
            await db.update(reportQueue)
                .set({ status: 'processing', lastAttempt: new Date() })
                .where(eq(reportQueue.id, pending.id));

            console.log(`📊 Generating report for ${pending.contactName}...`);

            try {
                // Get conversation history
                const historyLogs = await db.select()
                    .from(messageLogs)
                    .where(eq(messageLogs.contactPhone, pending.contactPhone))
                    .orderBy(desc(messageLogs.createdAt))
                    .limit(50);

                const history = historyLogs.reverse().map(m =>
                    `${m.role === 'agent' ? 'Me' : 'Them'}: ${m.content}`
                );

                // Generate report with metadata
                const report = await geminiService.generateReport(
                    history,
                    pending.contactName || 'Unknown',
                    {
                        lastMessageTime: pending.lastMessageTime || undefined,
                    }
                );

                // Send report to owner
                await notificationService.notifyOwner(report);

                // Update conversation with summary
                if (pending.conversationId) {
                    await db.update(conversations)
                        .set({ summary: report })
                        .where(eq(conversations.id, pending.conversationId));
                }

                // Mark as completed
                await db.update(reportQueue)
                    .set({ status: 'completed', updatedAt: new Date() })
                    .where(eq(reportQueue.id, pending.id));

                console.log(`✅ Successfully generated report for ${pending.contactName}`);

            } catch (error: any) {
                // Handle errors
                if (error.code === 429 || error.message === 'ALL_KEYS_EXHAUSTED') {
                    // Rate limit hit - revert to pending
                    await db.update(reportQueue)
                        .set({ status: 'pending' })
                        .where(eq(reportQueue.id, pending.id));

                    console.log(`⏸️ Rate limit hit while generating report for ${pending.contactName}. Will retry later.`);
                } else {
                    // Other error - increment retry count
                    const newRetryCount = (pending.retryCount || 0) + 1;

                    if (newRetryCount >= this.MAX_RETRIES) {
                        // Max retries reached - mark as failed
                        await db.update(reportQueue)
                            .set({
                                status: 'failed',
                                error: error.message,
                            })
                            .where(eq(reportQueue.id, pending.id));

                        console.error(`❌ Failed to generate report for ${pending.contactName} after ${this.MAX_RETRIES} retries: ${error.message}`);

                        // Send error notification to owner
                        await notificationService.notifyOwner(
                            `⚠️ Error generating report for ${pending.contactName}. Check logs.`
                        );
                    } else {
                        // Retry
                        await db.update(reportQueue)
                            .set({
                                status: 'pending',
                                retryCount: newRetryCount,
                                error: error.message,
                            })
                            .where(eq(reportQueue.id, pending.id));

                        console.log(`⚠️ Error generating report for ${pending.contactName}. Retry ${newRetryCount}/${this.MAX_RETRIES}`);
                    }
                }
            }

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<{ pending: number; processing: number; failed: number }> {
        const all = await db.select().from(reportQueue);

        const result = { pending: 0, processing: 0, failed: 0 };

        for (const report of all) {
            if (report.status === 'pending') result.pending++;
            if (report.status === 'processing') result.processing++;
            if (report.status === 'failed') result.failed++;
        }

        return result;
    }

    /**
     * Clear completed reports older than 7 days
     */
    async cleanup(): Promise<void> {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        await db.delete(reportQueue)
            .where(and(
                eq(reportQueue.status, 'completed'),
                // sql`${reportQueue.updatedAt} < ${sevenDaysAgo}`
            ));
    }
}

export const reportQueueService = new ReportQueueService();
