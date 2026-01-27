/**
 * Background Worker
 * Processes message and report queues in the background
 * Runs independently to ensure messages are eventually processed
 */

import { messageQueueService } from './messageQueueService';
import { reportQueueService } from './reportQueueService';

export class BackgroundWorker {
    private messageQueueInterval: NodeJS.Timeout | null = null;
    private reportQueueInterval: NodeJS.Timeout | null = null;
    private cleanupInterval: NodeJS.Timeout | null = null;
    private isRunning = false;

    /**
     * Start background queue processing
     */
    start(): void {
        if (this.isRunning) {
            console.log('⚠️ BackgroundWorker already running');
            return;
        }

        this.isRunning = true;
        console.log('🔄 Starting BackgroundWorker...');

        // Process message queue every 10 seconds
        this.messageQueueInterval = setInterval(async () => {
            try {
                await messageQueueService.processQueue();
            } catch (error) {
                console.error('Error processing message queue:', error);
            }
        }, 10000);

        // Process report queue every 30 seconds (lower priority)
        this.reportQueueInterval = setInterval(async () => {
            try {
                await reportQueueService.processReports();
            } catch (error) {
                console.error('Error processing report queue:', error);
            }
        }, 30000);

        // Cleanup old completed items every hour
        this.cleanupInterval = setInterval(async () => {
            try {
                await messageQueueService.cleanup();
                await reportQueueService.cleanup();
                console.log('🧹 Cleaned up old queue items');
            } catch (error) {
                console.error('Error during cleanup:', error);
            }
        }, 60 * 60 * 1000); // 1 hour

        console.log('✅ BackgroundWorker started');
        console.log('   - Message queue: every 10s');
        console.log('   - Report queue: every 30s');
        console.log('   - Cleanup: every 1h');
    }

    /**
     * Stop background processing
     */
    stop(): void {
        if (!this.isRunning) {
            return;
        }

        console.log('🛑 Stopping BackgroundWorker...');

        if (this.messageQueueInterval) {
            clearInterval(this.messageQueueInterval);
            this.messageQueueInterval = null;
        }

        if (this.reportQueueInterval) {
            clearInterval(this.reportQueueInterval);
            this.reportQueueInterval = null;
        }

        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        this.isRunning = false;
        console.log('✅ BackgroundWorker stopped');
    }

    /**
     * Get queue statistics
     */
    async getStats(): Promise<{
        messages: { pending: number; processing: number; failed: number };
        reports: { pending: number; processing: number; failed: number };
    }> {
        const [messages, reports] = await Promise.all([
            messageQueueService.getStats(),
            reportQueueService.getStats(),
        ]);

        return { messages, reports };
    }
}

export const backgroundWorker = new BackgroundWorker();
