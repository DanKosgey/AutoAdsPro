/**
 * Message Queue Service
 * Handles persistent queuing of messages with retry logic
 * Ensures zero message loss during rate limits
 */

import { db } from '../database';
import { messageQueue, contacts } from '../database/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { geminiService } from './ai/gemini';
import { ownerService } from './ownerService';
import { keyManager } from './keyManager';

type QueuePriority = 'owner' | 'normal';
type QueueStatus = 'pending' | 'processing' | 'failed' | 'completed';

export class MessageQueueService {
    private MAX_RETRIES = 3;
    private isProcessing = false;

    /**
     * Add messages to the queue
     */
    async enqueue(contactPhone: string, messages: string[], priority: QueuePriority = 'normal'): Promise<void> {
        // Check if there's already a pending batch for this contact
        const existing = await db.select()
            .from(messageQueue)
            .where(and(
                eq(messageQueue.jid, contactPhone),
                or(
                    eq(messageQueue.status, 'pending'),
                    eq(messageQueue.status, 'processing')
                )
            ))
            .then(rows => rows[0]);

        if (existing) {
            // Merge with existing batch
            const existingMessages = existing.messageData as any as string[];
            const mergedMessages = [...existingMessages, ...messages];

            await db.update(messageQueue)
                .set({
                    messageData: mergedMessages as any,
                })
                .where(eq(messageQueue.id, existing.id));

            console.log(`📦 Merged ${messages.length} messages into existing batch for ${contactPhone}. Total: ${mergedMessages.length}`);
        } else {
            // Create new queue entry
            const priorityNum = priority === 'owner' ? 0 : 2; // 0=CRITICAL for owner

            await db.insert(messageQueue).values({
                jid: contactPhone,
                messageData: messages as any,
                priority: priorityNum,
                status: 'pending',
                retryCount: 0,
                createdAt: new Date(),
            });

            console.log(`📥 Queued ${messages.length} messages for ${contactPhone} (Priority: ${priority})`);
        }
    }

    /**
     * Process the queue - called by background worker
     */
    async processQueue(): Promise<void> {
        if (this.isProcessing) {
            return; // Already processing
        }

        // Check if any keys are available
        if (!keyManager.hasAvailableKey()) {
            // console.log('⏸️ No API keys available. Skipping queue processing.');
            return;
        }

        this.isProcessing = true;

        try {
            // Get next pending message (prioritize owner messages)
            const pending = await db.select()
                .from(messageQueue)
                .where(eq(messageQueue.status, 'pending'))
                .orderBy(messageQueue.priority, messageQueue.createdAt)
                .limit(1)
                .then(rows => rows[0]);

            if (!pending) {
                return; // Queue is empty
            }

            // Mark as processing
            await db.update(messageQueue)
                .set({ status: 'processing' as any })
                .where(eq(messageQueue.id, pending.id));

            console.log(`🔄 Processing queued message for ${pending.jid}...`);

            // Try to process
            try {
                const messages = pending.messageData as any as string[];
                const fullText = messages.join('\n');
                const isOwner = ownerService.isOwner(pending.jid);

                // Get contact info
                const contact = await db.select()
                    .from(contacts)
                    .where(eq(contacts.phone, pending.jid))
                    .then(rows => rows[0]);

                if (!contact) {
                    throw new Error('Contact not found');
                }

                // Generate AI reply
                const userRoleContext = isOwner ? 'Owner' : `Contact: ${contact.name || 'Unknown'}`;

                const geminiResponse = await geminiService.generateReply(
                    [`User: ${fullText}`],
                    userRoleContext,
                    isOwner
                );

                if (geminiResponse.type === 'text' && geminiResponse.content) {
                    // TODO: Send the response via WhatsApp
                    // This will be integrated with WhatsAppClient
                    console.log(`✅ Generated reply for ${pending.jid}: "${geminiResponse.content.substring(0, 50)}..."`);
                }

                // Mark as completed
                await db.update(messageQueue)
                    .set({ status: 'completed', processedAt: new Date() })
                    .where(eq(messageQueue.id, pending.id));

                console.log(`✅ Successfully processed message for ${pending.jid}`);

            } catch (error: any) {
                // Handle errors
                if (error.code === 429 || error.message === 'ALL_KEYS_EXHAUSTED') {
                    // Rate limit hit - revert to pending
                    await db.update(messageQueue)
                        .set({ status: 'pending' })
                        .where(eq(messageQueue.id, pending.id));

                    console.log(`⏸️ Rate limit hit while processing ${pending.jid}. Will retry later.`);
                } else {
                    // Other error - increment retry count
                    const newRetryCount = (pending.retryCount || 0) + 1;

                    if (newRetryCount >= this.MAX_RETRIES) {
                        // Max retries reached - mark as failed
                        await db.update(messageQueue)
                            .set({
                                status: 'failed',
                                errorMessage: error.message,
                            })
                            .where(eq(messageQueue.id, pending.id));

                        console.error(`❌ Failed to process ${pending.jid} after ${this.MAX_RETRIES} retries: ${error.message}`);
                    } else {
                        // Retry
                        await db.update(messageQueue)
                            .set({
                                status: 'pending',
                                retryCount: newRetryCount,
                                errorMessage: error.message,
                            })
                            .where(eq(messageQueue.id, pending.id));

                        console.log(`⚠️ Error processing ${pending.jid}. Retry ${newRetryCount}/${this.MAX_RETRIES}`);
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
        const stats = await db.select({
            status: messageQueue.status,
            count: sql<number>`count(*)`,
        })
            .from(messageQueue)
            .groupBy(messageQueue.status);

        const result = { pending: 0, processing: 0, failed: 0 };

        for (const stat of stats) {
            if (stat.status === 'pending') result.pending = Number(stat.count);
            if (stat.status === 'processing') result.processing = Number(stat.count);
            if (stat.status === 'failed') result.failed = Number(stat.count);
        }

        return result;
    }

    /**
     * Clear completed messages older than 24 hours
     */
    async cleanup(): Promise<void> {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        await db.delete(messageQueue)
            .where(and(
                eq(messageQueue.status, 'completed'),
                sql`${messageQueue.processedAt} < ${oneDayAgo}`
            ));
    }
}

export const messageQueueService = new MessageQueueService();
